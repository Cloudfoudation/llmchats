// In EventContext.tsx, I'll modify the isRecentlyUpdated function and related logic

// src/providers/EventContext.tsx
'use client'
import {
    createContext,
    useContext,
    ReactNode,
    useState,
    useRef,
    useCallback,
    useEffect
} from 'react';
import { useAuthContext } from '@/providers/AuthProvider';
import { eventService } from '@/services/event';
import {
    StartEventRequest,
    EventResponse,
    EventStatusResponse,
    VideoPromptResponse,
    EventTasksListResponse,
    EventTask,
    UpdateSystemPromptsRequest,
    UpdateSystemPromptsResponse,
    ChatResponse,
    EventStatus,
    AcceptAnnouncementResponse,
    RefreshUrlsResponse,
    ImageFeedbackResponse,
    PreviewImagesResponse,
    AcceptImagesResponse,
    TaskListParams
} from '@/types/event';

// Define the context type
type EventContextType = {
    // Data states
    tasksData: EventTask[];
    selectedTask: EventStatusResponse | null;
    tasksWithPendingAnnouncement: Set<string>;
    totalTasks: number;
    hasMore: boolean;
    nextToken: string | null;

    // UI states
    isModalOpen: boolean;
    isLoading: boolean;
    isLoadingMore: boolean;
    isRefreshing: boolean;
    isAutoPolling: boolean;
    activeTaskPoll: string | null;
    error: string | null;

    // Pagination and filtering
    currentLimit: number;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
    filters: {
        status: EventStatus | 'all';
        dateRange: string;
        query: string;
    };

    // Actions - Task management
    startEvent: (data: StartEventRequest) => Promise<EventResponse>;
    handleTaskClick: (taskId: string) => Promise<void>;
    refreshStatus: () => Promise<EventStatusResponse | null>;
    setIsModalOpen: (isOpen: boolean) => void;
    clearSelectedTask: () => void;

    // Actions - Event operations
    sendChatMessage: (taskId: string, message: string) => Promise<ChatResponse>;
    acceptAnnouncement: (taskId: string) => Promise<AcceptAnnouncementResponse>;
    getPreviewImages: (taskId: string) => Promise<PreviewImagesResponse>;
    provideImageFeedback: (
        taskId: string,
        selectedImages: number[],
        feedback?: string,
        regenerate?: boolean
    ) => Promise<ImageFeedbackResponse>;
    acceptImages: (taskId: string) => Promise<AcceptImagesResponse>;
    generateVideoPrompts: (taskId: string) => Promise<VideoPromptResponse>;
    generateVideos: (taskId: string) => Promise<EventResponse>;
    updateSystemPrompts: (taskId: string, data: UpdateSystemPromptsRequest) => Promise<UpdateSystemPromptsResponse>;
    refreshUrls: (taskId: string) => Promise<RefreshUrlsResponse>;

    // Actions - Task list management
    fetchTasks: () => Promise<void>;
    loadMoreTasks: () => Promise<void>;
    setFilters: (filters: Partial<EventContextType['filters']>) => void;
    setSortBy: (sortBy: string) => void;
    setSortOrder: (sortOrder: 'asc' | 'desc') => void;
    toggleAutoPolling: () => void;
    clearError: () => void;
};

// Polling configuration
const POLLING_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const POLLING_INTERVAL = 5000; // 5 seconds
const TASK_MONITORING_CUTOFF = 2 * 60 * 60; // 2 hours in seconds

// Create the context
const EventContext = createContext<EventContextType | undefined>(undefined);

// Helper functions
const needsPolling = (status: EventStatus): boolean => {
    return ['started', 'generating_images', 'generating_prompts', 'generating_videos'].includes(status);
};

const isRecentEnough = (timestamp: number): boolean => {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    return now.getTime() - date.getTime() < POLLING_TIMEOUT;
};

// Helper function to check if a task has been updated recently (within TASK_MONITORING_CUTOFF)
const isRecentlyUpdated = (timestamp: number): boolean => {
    const now = Math.floor(Date.now() / 1000); // Current time in seconds
    return now - timestamp < TASK_MONITORING_CUTOFF;
};

export function EventProvider({ children }: { children: ReactNode }) {
    // User authentication 
    const { user } = useAuthContext();

    // Basic states
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<EventStatusResponse | null>(null);

    // Task list states
    const [tasksData, setTasksData] = useState<EventTask[]>([]);
    const [totalTasks, setTotalTasks] = useState<number>(0);
    const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
    const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
    const [currentLimit, setCurrentLimit] = useState<number>(10);
    const [nextToken, setNextToken] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState<boolean>(false);
    const [activeTaskPoll, setActiveTaskPoll] = useState<string | null>(null);
    const [isAutoPolling, setIsAutoPolling] = useState<boolean>(true);
    const [tasksWithPendingAnnouncement, setTasksWithPendingAnnouncement] = useState<Set<string>>(new Set());

    // Filtering and sorting
    const [filters, setFiltersState] = useState<EventContextType['filters']>({
        status: 'all',
        dateRange: 'all',
        query: '',
    });
    const [sortBy, setSortByState] = useState<string>('created_at');
    const [sortOrder, setSortOrderState] = useState<'asc' | 'desc'>('desc');

    // Refs
    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const mounted = useRef(true);

    // Task polling queue
    const pollingQueueRef = useRef<string[]>([]);
    const isPollingRef = useRef<boolean>(false);

    // Cleanup on unmount
    useEffect(() => {
        mounted.current = true;

        // Initial load of tasks
        fetchTasks();

        return () => {
            mounted.current = false;
            cleanupPolling();
        };
    }, []);

    useEffect(() => {
        refreshStatus();
    }, [tasksData])

    // Refresh when sort parameters change
    useEffect(() => {
        setNextToken(null);
        fetchTasks();
    }, [sortBy, sortOrder, filters.status]);

    // Process polling queue sequentially
    useEffect(() => {
        const processNextTaskInQueue = async () => {
            if (isPollingRef.current || !isAutoPolling || pollingQueueRef.current.length === 0) {
                return;
            }

            isPollingRef.current = true;
            const taskId = pollingQueueRef.current[0];

            try {
                await pollTask(taskId);
            } catch (error) {
                console.error(`Error polling task ${taskId}:`, error);
            } finally {
                // Remove the task from the queue and set polling to false
                pollingQueueRef.current.shift();
                isPollingRef.current = false;

                // If there are more tasks in queue, process the next one
                if (pollingQueueRef.current.length > 0) {
                    processNextTaskInQueue();
                }
            }
        };

        // Start processing if the queue has items and we're not already polling
        if (pollingQueueRef.current.length > 0 && !isPollingRef.current && isAutoPolling) {
            processNextTaskInQueue();
        }
    }, [isAutoPolling, pollingQueueRef.current.length]);

    // Cleanup polling resources
    const cleanupPolling = useCallback(() => {
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
        }
        if (pollingTimeoutRef.current) {
            clearTimeout(pollingTimeoutRef.current);
            pollingTimeoutRef.current = null;
        }
        setActiveTaskPoll(null);
        pollingQueueRef.current = [];
        isPollingRef.current = false;
    }, []);

    // API operations
    const startEvent = useCallback(async (data: StartEventRequest): Promise<EventResponse> => {
        setIsLoading(true);
        setError(null);

        try {
            eventService.setUser(user);
            const response = await eventService.startEvent(data);
            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
            setError(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    const getEventStatus = useCallback(async (taskId: string): Promise<EventStatusResponse> => {
        setError(null);

        try {
            eventService.setUser(user);
            const response = await eventService.getEventStatus(taskId);
            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
            setError(errorMessage);
            throw err;
        }
    }, [user]);

    const sendChatMessage = useCallback(async (taskId: string, message: string): Promise<ChatResponse> => {
        setIsLoading(true);
        setError(null);

        try {
            eventService.setUser(user);
            const response = await eventService.sendChatMessage(taskId, message);
            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
            setError(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    const listEventTasks = useCallback(async (params: TaskListParams = {}): Promise<EventTasksListResponse> => {
        setError(null);

        try {
            eventService.setUser(user);
            const response = await eventService.listEventTasks(params);

            // Ensure all fields are properly parsed
            const sanitizedTasks = response.tasks.map(task => ({
                ...task,
                progress: typeof task.progress === 'string' ? parseFloat(task.progress) :
                    (task.progress ?? 0),
                created_at: typeof task.created_at === 'string' ? parseInt(task.created_at) :
                    (task.created_at ?? Math.floor(Date.now() / 1000)),
                updated_at: typeof task.updated_at === 'number' ? task.updated_at :
                    (task.updated_at ?? Math.floor(Date.now() / 1000))
            }));

            return {
                ...response,
                tasks: sanitizedTasks
            };
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
            setError(errorMessage);
            return {
                tasks: [],
                count: 0
            };
        }
    }, [user]);


    // Add a task to the polling queue
    const addTaskToPollingQueue = useCallback((taskId: string) => {
        // Only add if not already in the queue and not actively being polled
        if (!pollingQueueRef.current.includes(taskId) && activeTaskPoll !== taskId) {
            console.log(`Adding task ${taskId} to polling queue`);
            pollingQueueRef.current.push(taskId);
        } else {
            console.log(`Task ${taskId} is already in polling queue or being actively polled`);
        }
    }, [activeTaskPoll]);

    // Handlers and high-level operations
    const fetchTasks = useCallback(async () => {
        if (isRefreshing) return;

        setIsRefreshing(true);
        try {
            // Create params object
            const params: TaskListParams = {
                limit: currentLimit,
                sort_order: sortOrder
            };

            // Add status filter if not "all"
            if (filters.status !== 'all') {
                params.status = filters.status;
            }

            const response = await listEventTasks(params);

            // Process tasks to ensure all fields are properly formatted
            const processedTasks = response.tasks.map(task => ({
                ...task,
                progress: typeof task.progress === 'number' ? task.progress : 0,
                created_at: typeof task.created_at === 'number' ? task.created_at :
                    Math.floor(Date.now() / 1000),
                updated_at: typeof task.updated_at === 'number' ? task.updated_at :
                    (task.updated_at ?? task.created_at ?? Math.floor(Date.now() / 1000)),
                needs_review: task.status === 'announcement_ready'
            }));

            // Set tasks data
            setTasksData(processedTasks);
            setTotalTasks(response.count);
            setNextToken(response.next_token || null);
            setHasMore(!!response.next_token);

            // Update the pending announcements set with tasks that need review
            setTasksWithPendingAnnouncement(new Set(
                processedTasks
                    .filter(task => task.status === 'announcement_ready')
                    .map(task => task.task_id)
            ));

            // Check each task for announcement status
            const pendingAnnouncementTasks = new Set<string>();
            for (const task of processedTasks) {
                if (task.status === 'started') {
                    try {
                        const taskStatus = await getEventStatus(task.task_id);
                        if (taskStatus.announcement) {
                            pendingAnnouncementTasks.add(task.task_id);

                            // Update the task in the tasks data with the pending flag
                            setTasksData(prev => prev.map(t =>
                                t.task_id === task.task_id
                                    ? { ...t, has_pending_announcement: true }
                                    : t
                            ));
                        }
                    } catch (error) {
                        console.error(`Error checking announcement status for task ${task.task_id}:`, error);
                    }
                }
            }

            // Update the pending announcements set
            setTasksWithPendingAnnouncement(pendingAnnouncementTasks);

            // Find tasks that need polling
            if (isAutoPolling) {
                const tasksToPool = processedTasks
                    .filter(task => {
                        // Only poll tasks that:
                        // 1. Are in a status that needs polling
                        // 2. Were created recently enough
                        // 3. Have been updated within the cutoff period (2 hours)
                        const updatedAt = task.updated_at || task.created_at;
                        return (
                            needsPolling(task.status as EventStatus) &&
                            isRecentEnough(task.created_at) &&
                            isRecentlyUpdated(updatedAt)
                        );
                    })
                    .map(task => task.task_id);

                // Add each task to the polling queue
                tasksToPool.forEach(taskId => {
                    addTaskToPollingQueue(taskId);
                });
            }
        } catch (error) {
            console.error('Failed to fetch tasks:', error);
        } finally {
            setIsRefreshing(false);
        }
    }, [
        filters.status,
        currentLimit,
        sortOrder,
        isRefreshing,
        isAutoPolling,
        listEventTasks,
        getEventStatus,
        addTaskToPollingQueue
    ]);


    // Poll a single task until completion or timeout
    const pollTask = useCallback(async (taskId: string) => {
        if (!mounted.current || !taskId || !isAutoPolling) return;

        console.log(`Polling task: ${taskId}`);
        setActiveTaskPoll(taskId);

        let shouldContinuePolling = true;
        const startTime = Date.now();
        let lastUpdatedAt = 0;

        while (shouldContinuePolling && mounted.current && isAutoPolling) {
            // Check if we've exceeded the polling timeout
            if (Date.now() - startTime > POLLING_TIMEOUT) {
                console.log(`Polling timeout reached for task: ${taskId}`);
                shouldContinuePolling = false;
                break;
            }

            try {
                // Get status for the specific task
                const status = await getEventStatus(taskId);

                if (!mounted.current) return;

                // Get the current time in seconds
                const currentTime = Math.floor(Date.now() / 1000);

                // Store the last updated time or use current time if not available
                lastUpdatedAt = status.updated_at || currentTime;

                // Check if the task hasn't been updated for the cutoff period
                if (!isRecentlyUpdated(lastUpdatedAt)) {
                    console.log(`Task ${taskId} hasn't been updated for over ${TASK_MONITORING_CUTOFF / 3600} hours, stopping polling`);
                    shouldContinuePolling = false;
                    break;
                }

                // Update the task in the task list with latest status
                setTasksData(prev => prev.map(task =>
                    task.task_id === taskId
                        ? {
                            ...task,
                            status: status.status,
                            progress: status.progress,
                            current_step: status.current_step,
                            error: status.error,
                            video_urls: status.video_urls,
                            preview_image_urls: status.preview_image_urls,
                            current_announcement: status.announcement,
                            updated_at: status.updated_at || currentTime
                        }
                        : task
                ));

                // Update pending announcements based on status
                if (status.announcement && status.status === 'started') {
                    setTasksWithPendingAnnouncement(prev => {
                        const updated = new Set(prev);
                        updated.add(taskId);
                        return updated;
                    });
                } else if (status.status === 'announcement_ready') {
                    setTasksWithPendingAnnouncement(prev => {
                        const updated = new Set(prev);
                        updated.add(taskId);
                        return updated;
                    });
                } else if (status.status !== 'started') {
                    // If status is not 'started', remove from pending announcements
                    setTasksWithPendingAnnouncement(prev => {
                        if (!prev.has(taskId)) return prev;
                        const updated = new Set(prev);
                        updated.delete(taskId);
                        return updated;
                    });
                }

                // If the task is complete or encountered an error, stop polling
                if (!needsPolling(status.status)) {
                    console.log(`Task ${taskId} no longer needs polling (status: ${status.status})`);
                    shouldContinuePolling = false;

                    break;
                }

                // Wait for the polling interval before continuing
                await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL));
            } catch (error) {
                console.error(`Polling failed for task ${taskId}:`, error);
                shouldContinuePolling = false;
                break;
            }
        }

        // If this was the active task being polled, clear the active task
        if (taskId === activeTaskPoll) {
            setActiveTaskPoll(null);
        }

        return;
    }, [getEventStatus, isAutoPolling, fetchTasks]);

    // Start polling a task (adds to queue)
    const startPolling = useCallback((taskId: string) => {
        if (!mounted.current || !taskId || !isAutoPolling) return;

        if (activeTaskPoll === taskId) {
            console.log(`Task ${taskId} is already being actively polled`);
            return;
        }

        // Check if task is in queue
        if (pollingQueueRef.current.includes(taskId)) {
            console.log(`Task ${taskId} is already in polling queue`);
            return;
        }

        // Add the task to the polling queue
        console.log(`Starting polling for task ${taskId}`);
        addTaskToPollingQueue(taskId);
    }, [isAutoPolling, addTaskToPollingQueue, activeTaskPoll]);


    const acceptAnnouncement = useCallback(async (taskId: string): Promise<AcceptAnnouncementResponse> => {
        setIsLoading(true);
        setError(null);

        try {
            eventService.setUser(user);
            const response = await eventService.acceptAnnouncement(taskId);

            startPolling(taskId);
            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
            setError(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    const getPreviewImages = useCallback(async (taskId: string): Promise<PreviewImagesResponse> => {
        setIsLoading(true);
        setError(null);

        try {
            eventService.setUser(user);
            const response = await eventService.getPreviewImages(taskId);
            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
            setError(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    const provideImageFeedback = useCallback(async (
        taskId: string,
        selectedImages: number[],
        feedback?: string,
        regenerate: boolean = true
    ): Promise<ImageFeedbackResponse> => {
        setIsLoading(true);
        setError(null);

        try {
            eventService.setUser(user);
            const response = await eventService.provideImageFeedback(
                taskId,
                selectedImages,
                feedback,
                regenerate
            );

            // If regenerating, start polling since the status has changed
            if (regenerate && response.regenerating) {
                startPolling(taskId);
            }

            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
            setError(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [user, startPolling]);

    const acceptImages = useCallback(async (taskId: string): Promise<AcceptImagesResponse> => {
        setIsLoading(true);
        setError(null);

        try {
            eventService.setUser(user);
            const response = await eventService.acceptImages(taskId);

            // Start polling since we've moved to the next stage
            startPolling(taskId);

            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
            setError(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [user, startPolling]);

    const generateVideoPrompts = useCallback(async (taskId: string): Promise<VideoPromptResponse> => {
        setIsLoading(true);
        setError(null);

        try {
            eventService.setUser(user);
            const response = await eventService.generateVideoPrompts(taskId);

            startPolling(taskId);
            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
            setError(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    const generateVideos = useCallback(async (taskId: string): Promise<EventResponse> => {
        setIsLoading(true);
        setError(null);

        try {
            eventService.setUser(user);
            const response = await eventService.generateVideos(taskId);

            startPolling(taskId);

            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
            setError(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [user, startPolling]);

    // Add the refreshUrls method
    const refreshUrls = useCallback(async (taskId: string): Promise<RefreshUrlsResponse> => {
        setIsLoading(true);
        setError(null);

        try {
            eventService.setUser(user);
            const response = await eventService.refreshUrls(taskId);

            // Update the selected task with the new URLs if it's the current task
            if (selectedTask && selectedTask.task_id === taskId) {
                setSelectedTask(prev => {
                    if (!prev) return prev;
                    return {
                        ...prev,
                        video_urls: response.refreshed_urls
                    };
                });
            }

            // Also update the task in the tasks list
            setTasksData(prev => prev.map(task =>
                task.task_id === taskId
                    ? { ...task, video_urls: response.refreshed_urls }
                    : task
            ));

            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
            setError(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [user, selectedTask]);

    const updateSystemPrompts = useCallback(async (
        taskId: string,
        data: UpdateSystemPromptsRequest
    ): Promise<UpdateSystemPromptsResponse> => {
        setIsLoading(true);
        setError(null);

        try {
            eventService.setUser(user);
            const response = await eventService.updateSystemPrompts(taskId, data);

            // Update the selected task with the new system prompts
            if (selectedTask && selectedTask.task_id === taskId) {
                setSelectedTask(prev => {
                    if (!prev) return prev;
                    return {
                        ...prev,
                        announcement_system_prompt: data.announcement_prompt || prev.announcement_system_prompt,
                        image_system_prompt: data.image_prompt || prev.image_system_prompt,
                        video_system_prompt: data.video_prompt || prev.video_system_prompt,
                    };
                });
            }

            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
            setError(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [user, selectedTask]);

    const loadMoreTasks = useCallback(async () => {
        if (isLoadingMore || !hasMore || !nextToken) return;

        setIsLoadingMore(true);
        try {
            // Create params object for getting next page
            const params: TaskListParams = {
                limit: currentLimit,
                last_evaluated_key: nextToken,
                sort_order: sortOrder
            };

            // Add status filter if not "all"
            if (filters.status !== 'all') {
                params.status = filters.status;
            }

            const response = await listEventTasks(params);

            // Process tasks
            const processedTasks = response.tasks.map(task => ({
                ...task,
                progress: typeof task.progress === 'number' ? task.progress : 0,
                created_at: typeof task.created_at === 'number' ? task.created_at :
                    Math.floor(Date.now() / 1000),
                updated_at: typeof task.updated_at === 'number' ? task.updated_at :
                    (task.updated_at ?? task.created_at ?? Math.floor(Date.now() / 1000)),
                has_pending_announcement: false
            }));

            // Append to existing tasks
            setTasksData(prev => [...prev, ...processedTasks]);
            setNextToken(response.next_token || null);
            setHasMore(!!response.next_token);

            // ... rest of existing code for checking tasks
        } catch (error) {
            console.error('Failed to load more tasks:', error);
        } finally {
            setIsLoadingMore(false);
        }
    }, [
        currentLimit,
        nextToken,
        filters.status,
        hasMore,
        isLoadingMore,
        sortOrder,
        listEventTasks,
        getEventStatus
    ]);

    const handleTaskClick = useCallback(async (taskId: string) => {
        try {
            const taskStatus = await getEventStatus(taskId);
            setSelectedTask(taskStatus);
            setIsModalOpen(true);

            // If task needs polling, start it only if not already being polled
            const updatedAt = taskStatus.updated_at || taskStatus.created_at;
            if (needsPolling(taskStatus.status) &&
                isRecentEnough(taskStatus.created_at) &&
                isRecentlyUpdated(updatedAt) &&
                activeTaskPoll !== taskId &&
                !pollingQueueRef.current.includes(taskId)) {
                startPolling(taskId);
            }

            // Handle announcement status
            if (taskStatus.announcement && taskStatus.status === 'started') {
                setTasksWithPendingAnnouncement(prev => {
                    const updated = new Set(prev);
                    updated.add(taskId);
                    return updated;
                });
            }
        } catch (error) {
            console.error('Error fetching task details:', error);
        }
    }, [getEventStatus, startPolling, activeTaskPoll]);

    const refreshStatus = useCallback(async (): Promise<EventStatusResponse | null> => {
        if (selectedTask) {
            try {
                const status = await getEventStatus(selectedTask.task_id);

                // When manually refreshing from the modal, update the selected task
                if (isModalOpen) {
                    setSelectedTask({
                        ...status,
                        announcement_system_prompt: status.announcement_system_prompt || selectedTask.announcement_system_prompt,
                        image_system_prompt: status.image_system_prompt || selectedTask.image_system_prompt,
                        video_system_prompt: status.video_system_prompt || selectedTask.video_system_prompt,
                    });
                }

                // If status changed and now needs polling, start polling only if it's been updated recently
                if (status.status !== selectedTask.status) {
                    const updatedAt = status.updated_at || status.created_at;
                    if (needsPolling(status.status) &&
                        isRecentEnough(status.created_at) &&
                        isRecentlyUpdated(updatedAt)) {
                        startPolling(status.task_id);
                    } else if (!needsPolling(status.status) && activeTaskPoll === status.task_id) {
                        // If it was polling but no longer needs to, stop polling
                        // This task might be active in the queue, but it will be skipped in pollTask
                    }
                }

                // Update pending announcement status
                if (status.announcement && status.status === 'started') {
                    setTasksWithPendingAnnouncement(prev => {
                        const updated = new Set(prev);
                        updated.add(status.task_id);
                        return updated;
                    });
                } else {
                    setTasksWithPendingAnnouncement(prev => {
                        if (!prev.has(status.task_id)) return prev;
                        const updated = new Set(prev);
                        updated.delete(status.task_id);
                        return updated;
                    });
                }

                return status;
            } catch (error) {
                console.error('Error refreshing task status:', error);
                return null;
            }
        }
        return null;
    }, [selectedTask, isModalOpen, getEventStatus, startPolling, activeTaskPoll]);

    const clearSelectedTask = useCallback(() => {
        setSelectedTask(null);
    }, []);

    const setFilters = useCallback((newFilters: Partial<EventContextType['filters']>) => {
        // Reset pagination when filters change
        if (newFilters.status !== undefined && newFilters.status !== filters.status) {
            setNextToken(null);
        }
        setFiltersState(prev => ({ ...prev, ...newFilters }));
    }, [filters.status]);

    const setSortBy = useCallback((newSortBy: string) => {
        setSortByState(newSortBy);
    }, []);

    const setSortOrder = useCallback((newSortOrder: 'asc' | 'desc') => {
        // Reset pagination when sort order changes
        setNextToken(null);
        setSortOrderState(newSortOrder);
    }, []);

    const toggleAutoPolling = useCallback(() => {
        setIsAutoPolling(prev => !prev);
        // If turning off auto polling, cleanup any active polls
        if (isAutoPolling) {
            cleanupPolling();
        } else if (!isAutoPolling) {
            // If turning on auto polling and we have tasks, consider starting polling for one
            fetchTasks();
        }
    }, [isAutoPolling, cleanupPolling, fetchTasks]);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    const contextValue = {
        // Data states
        tasksData,
        selectedTask,
        tasksWithPendingAnnouncement,
        totalTasks,
        hasMore,
        nextToken,

        // UI states
        isModalOpen,
        isLoading,
        isLoadingMore,
        isRefreshing,
        isAutoPolling,
        activeTaskPoll,
        error,

        // Pagination and filtering
        currentLimit,
        sortBy,
        sortOrder,
        filters,

        // Actions - Task management
        startEvent,
        handleTaskClick,
        refreshStatus,
        setIsModalOpen,
        clearSelectedTask,

        // Actions - Event operations
        sendChatMessage,
        acceptAnnouncement,
        getPreviewImages,
        provideImageFeedback,
        acceptImages,
        generateVideoPrompts,
        generateVideos,
        updateSystemPrompts,
        refreshUrls,

        // Actions - Task list management
        fetchTasks,
        loadMoreTasks,
        setFilters,
        setSortBy,
        setSortOrder,
        toggleAutoPolling,
        clearError
    };

    return (
        <EventContext.Provider value={contextValue}>
            {children}
        </EventContext.Provider>
    );
}

// Custom hook to use the context
export const useEventContext = () => {
    const context = useContext(EventContext);
    if (context === undefined) {
        throw new Error('useEventContext must be used within an EventProvider');
    }
    return context;
};