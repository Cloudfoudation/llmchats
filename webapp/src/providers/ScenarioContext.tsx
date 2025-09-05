// src/providers/ScenarioContext.tsx
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
import { scenarioService } from '@/services/scenario';
import {
    ProjectRequest,
    ProjectResponse,
    ProjectStatusResponse,
    ProjectSummary,
    StructureResponse,
    ContentResponse,
    ImageResponse,
    VideoResponse,
    VideoGenerationResponse,
    RequirementsModel,
    StructureFeedbackModel,
    ContentFeedbackModel,
    ImageFeedbackModel,
    VideoSettingsModel,
    ExportSettingsModel,
    ExportResponse,
    RepurposeResponse,
    ScenarioStatus
} from '@/types/scenario';

// Define the context type
type ScenarioContextType = {
    // Data states
    projectsData: ProjectSummary[];
    selectedProject: ProjectStatusResponse | null;
    totalProjects: number;
    hasMore: boolean;

    // UI states
    isModalOpen: boolean;
    isLoading: boolean;
    isLoadingMore: boolean;
    isRefreshing: boolean;
    isAutoPolling: boolean;
    activeProjectPoll: string | null;
    error: string | null;

    // Pagination and filtering
    currentLimit: number;
    pagination_token: string | null;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
    filters: {
        status: ScenarioStatus | 'all';
        scenarioType: string | 'all';
    };

    // Actions - Project management
    createProject: (data: ProjectRequest) => Promise<ProjectResponse>;
    handleProjectClick: (projectId: string) => Promise<void>;
    refreshStatus: () => Promise<ProjectStatusResponse | null>;
    setIsModalOpen: (isOpen: boolean) => void;
    clearSelectedProject: () => void;

    // Actions - Scenario operations
    saveRequirements: (projectId: string, requirements: RequirementsModel) => Promise<ProjectResponse>;
    getStructure: (projectId: string) => Promise<StructureResponse>;
    submitStructureFeedback: (projectId: string, feedback: StructureFeedbackModel) => Promise<ProjectResponse>;
    approveStructure: (projectId: string) => Promise<ProjectResponse>;
    getContent: (projectId: string) => Promise<ContentResponse>;
    submitContentFeedback: (projectId: string, feedback: ContentFeedbackModel) => Promise<ProjectResponse>;
    approveContent: (projectId: string) => Promise<ProjectResponse>;
    getImages: (projectId: string) => Promise<ImageResponse>;
    submitImageFeedback: (projectId: string, feedback: ImageFeedbackModel, selectedImages: number[]) => Promise<ProjectResponse>;
    approveImages: (projectId: string) => Promise<ProjectResponse>;
    getVideo: (projectId: string) => Promise<VideoResponse>;
    generateVideo: (projectId: string, settings: VideoSettingsModel) => Promise<VideoGenerationResponse>;
    repurposeContent: (projectId: string, platform: string) => Promise<RepurposeResponse>;
    exportVideo: (projectId: string, exportSettings: ExportSettingsModel) => Promise<ExportResponse>;

    // Actions - Project list management
    fetchProjects: () => Promise<void>;
    loadMoreProjects: () => Promise<void>;
    setFilters: (filters: Partial<ScenarioContextType['filters']>) => void;
    setSortBy: (sortBy: string) => void;
    setSortOrder: (sortOrder: 'asc' | 'desc') => void;
    toggleAutoPolling: () => void;
    clearError: () => void;
};

// Polling configuration
const POLLING_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const POLLING_INTERVAL = 5000; // 5 seconds
const PROJECT_MONITORING_CUTOFF = 2 * 60 * 60; // 2 hours in seconds

// Create the context
const ScenarioContext = createContext<ScenarioContextType | undefined>(undefined);

// Helper functions
const needsPolling = (status: ScenarioStatus): boolean => {
    return [
        'started',
        'generating_content',
        'generating_images',
        'generating_video_prompts',
        'generating_videos'
    ].includes(status);
};

const isRecentEnough = (timestamp: number): boolean => {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    return now.getTime() - date.getTime() < POLLING_TIMEOUT;
};

// Helper function to check if a project has been updated recently (within PROJECT_MONITORING_CUTOFF)
const isRecentlyUpdated = (timestamp: number): boolean => {
    const now = Math.floor(Date.now() / 1000); // Current time in seconds
    return now - timestamp < PROJECT_MONITORING_CUTOFF;
};

export function ScenarioProvider({ children }: { children: ReactNode }) {
    // User authentication 
    const { user } = useAuthContext();

    // Basic states
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedProject, setSelectedProject] = useState<ProjectStatusResponse | null>(null);

    // Project list states
    const [projectsData, setProjectsData] = useState<ProjectSummary[]>([]);
    const [totalProjects, setTotalProjects] = useState<number>(0);
    const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
    const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
    const [currentLimit, setCurrentLimit] = useState<number>(20);
    const [pagination_token, setPaginationToken] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState<boolean>(false);
    const [activeProjectPoll, setActiveProjectPoll] = useState<string | null>(null);
    const [isAutoPolling, setIsAutoPolling] = useState<boolean>(true);

    // Filtering and sorting
    const [filters, setFiltersState] = useState<ScenarioContextType['filters']>({
        status: 'all',
        scenarioType: 'all',
    });
    const [sortBy, setSortByState] = useState<string>('created_at');
    const [sortOrder, setSortOrderState] = useState<'asc' | 'desc'>('desc');

    // Refs
    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const mounted = useRef(true);

    // Project polling queue
    const pollingQueueRef = useRef<string[]>([]);
    const isPollingRef = useRef<boolean>(false);

    // Cleanup on unmount
    useEffect(() => {
        mounted.current = true;

        // Initial load of projects
        fetchProjects();

        return () => {
            mounted.current = false;
            cleanupPolling();
        };
    }, []);

    // Refresh when project changes
    useEffect(() => {
        refreshStatus();
    }, [projectsData]);

    // Process polling queue sequentially
    useEffect(() => {
        const processNextProjectInQueue = async () => {
            if (isPollingRef.current || !isAutoPolling || pollingQueueRef.current.length === 0) {
                return;
            }

            isPollingRef.current = true;
            const projectId = pollingQueueRef.current[0];

            try {
                await pollProject(projectId);
            } catch (error) {
                console.error(`Error polling project ${projectId}:`, error);
            } finally {
                // Remove the project from the queue and set polling to false
                pollingQueueRef.current.shift();
                isPollingRef.current = false;

                // If there are more projects in queue, process the next one
                if (pollingQueueRef.current.length > 0) {
                    processNextProjectInQueue();
                }
            }
        };

        // Start processing if the queue has items and we're not already polling
        if (pollingQueueRef.current.length > 0 && !isPollingRef.current && isAutoPolling) {
            processNextProjectInQueue();
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
        setActiveProjectPoll(null);
        pollingQueueRef.current = [];
        isPollingRef.current = false;
    }, []);

    // Add a project to the polling queue
    const addProjectToPollingQueue = useCallback((projectId: string) => {
        // Only add if not already in the queue and not actively being polled
        if (!pollingQueueRef.current.includes(projectId) && activeProjectPoll !== projectId) {
            console.log(`Adding project ${projectId} to polling queue`);
            pollingQueueRef.current.push(projectId);
        } else {
            console.log(`Project ${projectId} is already in polling queue or being actively polled`);
        }
    }, [activeProjectPoll]);

    // Main fetch projects function
    const fetchProjects = useCallback(async () => {
        if (isRefreshing) return;

        setIsRefreshing(true);
        try {
            scenarioService.setUser(user);
            const response = await scenarioService.listProjects(currentLimit);

            // Process projects to ensure all fields are properly formatted
            const processedProjects = response.projects.map(project => ({
                ...project,
                progress: typeof project.progress === 'number' ? project.progress : 0,
                created_at: typeof project.created_at === 'number' ? project.created_at :
                    Math.floor(Date.now() / 1000),
                updated_at: typeof project.updated_at === 'number' ? project.updated_at :
                    (project.updated_at ?? project.created_at ?? Math.floor(Date.now() / 1000))
            }));

            // Set projects data
            setProjectsData(processedProjects);
            setTotalProjects(processedProjects.length);
            setHasMore(!!response.pagination_token);
            setPaginationToken(response.pagination_token || null);

            // Find projects that need polling
            if (isAutoPolling) {
                const projectsToPool = processedProjects
                    .filter(project => {
                        // Only poll projects that:
                        // 1. Are in a status that needs polling
                        // 2. Were created recently enough
                        // 3. Have been updated within the cutoff period (2 hours)
                        const updatedAt = project.updated_at || project.created_at;
                        return (
                            needsPolling(project.status) &&
                            isRecentEnough(project.created_at) &&
                            isRecentlyUpdated(updatedAt)
                        );
                    })
                    .map(project => project.task_id);

                // Add each project to the polling queue
                projectsToPool.forEach(projectId => {
                    addProjectToPollingQueue(projectId);
                });
            }
        } catch (error) {
            console.error('Failed to fetch projects:', error);
        } finally {
            setIsRefreshing(false);
        }
    }, [
        currentLimit,
        isRefreshing,
        isAutoPolling,
        user,
        addProjectToPollingQueue
    ]);


    // API operations
    const createProject = useCallback(async (data: ProjectRequest): Promise<ProjectResponse> => {
        setIsLoading(true);
        setError(null);

        try {
            scenarioService.setUser(user);
            const response = await scenarioService.createProject(data);

            // Refresh project list after creating a new project
            fetchProjects();

            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
            setError(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [user, fetchProjects]);

    const getProjectStatus = useCallback(async (projectId: string): Promise<ProjectStatusResponse> => {
        setError(null);

        try {
            scenarioService.setUser(user);
            const response = await scenarioService.getProjectStatus(projectId);
            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
            setError(errorMessage);
            throw err;
        }
    }, [user]);

    // Poll a single project until completion or timeout
    const pollProject = useCallback(async (projectId: string) => {
        if (!mounted.current || !projectId || !isAutoPolling) return;

        console.log(`Polling project: ${projectId}`);
        setActiveProjectPoll(projectId);

        let shouldContinuePolling = true;
        const startTime = Date.now();
        let lastUpdatedAt = 0;

        while (shouldContinuePolling && mounted.current && isAutoPolling) {
            // Check if we've exceeded the polling timeout
            if (Date.now() - startTime > POLLING_TIMEOUT) {
                console.log(`Polling timeout reached for project: ${projectId}`);
                shouldContinuePolling = false;
                break;
            }

            try {
                // Get status for the specific project
                const status = await getProjectStatus(projectId);

                if (!mounted.current) return;

                // Get the current time in seconds
                const currentTime = Math.floor(Date.now() / 1000);

                // Store the last updated time or use current time if not available
                lastUpdatedAt = status.updated_at || currentTime;

                // Check if the project hasn't been updated for the cutoff period
                if (!isRecentlyUpdated(lastUpdatedAt)) {
                    console.log(`Project ${projectId} hasn't been updated for over ${PROJECT_MONITORING_CUTOFF / 3600} hours, stopping polling`);
                    shouldContinuePolling = false;
                    break;
                }

                // Update the project in the project list with latest status
                setProjectsData(prev => prev.map(project =>
                    project.task_id === projectId
                        ? {
                            ...project,
                            status: status.status,
                            progress: status.progress,
                            current_step: status.current_step,
                            error: status.error,
                            updated_at: status.updated_at || currentTime
                        }
                        : project
                ));

                // If the project is complete or encountered an error, stop polling
                if (!needsPolling(status.status)) {
                    console.log(`Project ${projectId} no longer needs polling (status: ${status.status})`);
                    shouldContinuePolling = false;
                    break;
                }

                // Wait for the polling interval before continuing
                await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL));
            } catch (error) {
                console.error(`Polling failed for project ${projectId}:`, error);
                shouldContinuePolling = false;
                break;
            }
        }

        // If this was the active project being polled, clear the active project
        if (projectId === activeProjectPoll) {
            setActiveProjectPoll(null);
        }

        return;
    }, [getProjectStatus, isAutoPolling]);

    // Start polling a project (adds to queue)
    const startPolling = useCallback((projectId: string) => {
        if (!mounted.current || !projectId || !isAutoPolling) return;

        if (activeProjectPoll === projectId) {
            console.log(`Project ${projectId} is already being actively polled`);
            return;
        }

        // Check if project is in queue
        if (pollingQueueRef.current.includes(projectId)) {
            console.log(`Project ${projectId} is already in polling queue`);
            return;
        }

        // Add the project to the polling queue
        console.log(`Starting polling for project ${projectId}`);
        addProjectToPollingQueue(projectId);
    }, [isAutoPolling, addProjectToPollingQueue, activeProjectPoll]);

    const handleProjectClick = useCallback(async (projectId: string) => {
        try {
            const projectStatus = await getProjectStatus(projectId);
            setSelectedProject(projectStatus);
            setIsModalOpen(true);

            // If project needs polling, start it only if not already being polled
            const updatedAt = projectStatus.updated_at || projectStatus.created_at;
            if (needsPolling(projectStatus.status) &&
                isRecentEnough(projectStatus.created_at) &&
                isRecentlyUpdated(updatedAt) &&
                activeProjectPoll !== projectId &&
                !pollingQueueRef.current.includes(projectId)) {
                startPolling(projectId);
            }
        } catch (error) {
            console.error('Error fetching project details:', error);
        }
    }, [getProjectStatus, startPolling, activeProjectPoll]);

    const refreshStatus = useCallback(async (): Promise<ProjectStatusResponse | null> => {
        if (selectedProject) {
            try {
                const status = await getProjectStatus(selectedProject.task_id);

                // When manually refreshing from the modal, update the selected project
                if (isModalOpen) {
                    setSelectedProject(status);
                }

                // If status changed and now needs polling, start polling only if it's been updated recently
                if (status.status !== selectedProject.status) {
                    const updatedAt = status.updated_at || status.created_at;
                    if (needsPolling(status.status) &&
                        isRecentEnough(status.created_at) &&
                        isRecentlyUpdated(updatedAt)) {
                        startPolling(status.task_id);
                    }
                }

                return status;
            } catch (error) {
                console.error('Error refreshing project status:', error);
                return null;
            }
        }
        return null;
    }, [selectedProject, isModalOpen, getProjectStatus, startPolling, activeProjectPoll]);

    const loadMoreProjects = useCallback(async () => {
        if (isLoadingMore || !hasMore || !pagination_token) return;

        setIsLoadingMore(true);
        try {
            scenarioService.setUser(user);
            const response = await scenarioService.listProjects(
                currentLimit,
                pagination_token
            );

            // Process projects to ensure all fields are properly formatted
            const processedProjects = response.projects.map(project => ({
                ...project,
                progress: typeof project.progress === 'number' ? project.progress : 0,
                created_at: typeof project.created_at === 'number' ? project.created_at :
                    Math.floor(Date.now() / 1000),
                updated_at: typeof project.updated_at === 'number' ? project.updated_at :
                    (project.updated_at ?? project.created_at ?? Math.floor(Date.now() / 1000))
            }));

            setProjectsData(prev => [...prev, ...processedProjects]);
            setHasMore(!!response.pagination_token);
            setPaginationToken(response.pagination_token || null);
            setTotalProjects(prev => prev + processedProjects.length);

            // Check for projects that need polling
            if (isAutoPolling) {
                const projectsToPool = processedProjects
                    .filter(project => {
                        const updatedAt = project.updated_at || project.created_at;
                        return (
                            needsPolling(project.status) &&
                            isRecentEnough(project.created_at) &&
                            isRecentlyUpdated(updatedAt)
                        );
                    })
                    .map(project => project.task_id);

                projectsToPool.forEach(projectId => {
                    addProjectToPollingQueue(projectId);
                });
            }
        } catch (error) {
            console.error('Failed to load more projects:', error);
        } finally {
            setIsLoadingMore(false);
        }
    }, [
        currentLimit,
        pagination_token,
        hasMore,
        isLoadingMore,
        isAutoPolling,
        user,
        addProjectToPollingQueue
    ]);

    // Implement all scenario service methods as context functions
    const saveRequirements = useCallback(async (projectId: string, requirements: RequirementsModel): Promise<ProjectResponse> => {
        setIsLoading(true);
        setError(null);

        try {
            scenarioService.setUser(user);
            const response = await scenarioService.saveRequirements(projectId, requirements);

            // Start polling for structure generation
            startPolling(projectId);

            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
            setError(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [user, startPolling]);

    const getStructure = useCallback(async (projectId: string): Promise<StructureResponse> => {
        setError(null);

        try {
            scenarioService.setUser(user);
            const response = await scenarioService.getStructure(projectId);
            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
            setError(errorMessage);
            throw err;
        }
    }, [user]);

    const submitStructureFeedback = useCallback(async (projectId: string, feedback: StructureFeedbackModel): Promise<ProjectResponse> => {
        setIsLoading(true);
        setError(null);

        try {
            scenarioService.setUser(user);
            const response = await scenarioService.submitStructureFeedback(projectId, feedback);

            // Start polling for structure regeneration
            startPolling(projectId);

            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
            setError(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [user, startPolling]);

    const approveStructure = useCallback(async (projectId: string): Promise<ProjectResponse> => {
        setIsLoading(true);
        setError(null);

        try {
            scenarioService.setUser(user);
            const response = await scenarioService.approveStructure(projectId);

            // Start polling for content generation
            startPolling(projectId);

            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
            setError(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [user, startPolling]);

    const getContent = useCallback(async (projectId: string): Promise<ContentResponse> => {
        setError(null);

        try {
            scenarioService.setUser(user);
            const response = await scenarioService.getContent(projectId);
            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
            setError(errorMessage);
            throw err;
        }
    }, [user]);

    const submitContentFeedback = useCallback(async (projectId: string, feedback: ContentFeedbackModel): Promise<ProjectResponse> => {
        setIsLoading(true);
        setError(null);

        try {
            scenarioService.setUser(user);
            const response = await scenarioService.submitContentFeedback(projectId, feedback);
            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
            setError(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    const approveContent = useCallback(async (projectId: string): Promise<ProjectResponse> => {
        setIsLoading(true);
        setError(null);

        try {
            scenarioService.setUser(user);
            const response = await scenarioService.approveContent(projectId);

            // Start polling for image generation
            startPolling(projectId);

            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
            setError(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [user, startPolling]);

    const getImages = useCallback(async (projectId: string): Promise<ImageResponse> => {
        setError(null);

        try {
            scenarioService.setUser(user);
            const response = await scenarioService.getImages(projectId);
            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
            setError(errorMessage);
            throw err;
        }
    }, [user]);

    const submitImageFeedback = useCallback(async (projectId: string, feedback: ImageFeedbackModel, selectedImages: number[]): Promise<ProjectResponse> => {
        setIsLoading(true);
        setError(null);

        try {
            scenarioService.setUser(user);
            const response = await scenarioService.submitImageFeedback(projectId, feedback, selectedImages);
            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
            setError(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    const approveImages = useCallback(async (projectId: string): Promise<ProjectResponse> => {
        setIsLoading(true);
        setError(null);

        try {
            scenarioService.setUser(user);
            const response = await scenarioService.approveImages(projectId);

            // Start polling for video prompt generation
            startPolling(projectId);

            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
            setError(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [user, startPolling]);

    const getVideo = useCallback(async (projectId: string): Promise<VideoResponse> => {
        setError(null);

        try {
            scenarioService.setUser(user);
            const response = await scenarioService.getVideo(projectId);
            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
            setError(errorMessage);
            throw err;
        }
    }, [user]);

    const generateVideo = useCallback(async (projectId: string, settings: VideoSettingsModel): Promise<VideoGenerationResponse> => {
        setIsLoading(true);
        setError(null);

        try {
            scenarioService.setUser(user);
            const response = await scenarioService.generateVideo(projectId, settings);

            // Start polling for video generation
            startPolling(projectId);

            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
            setError(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [user, startPolling]);

    const repurposeContent = useCallback(async (projectId: string, platform: string): Promise<RepurposeResponse> => {
        setIsLoading(true);
        setError(null);

        try {
            scenarioService.setUser(user);
            const response = await scenarioService.repurposeContent(projectId, platform);
            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
            setError(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    const exportVideo = useCallback(async (projectId: string, exportSettings: ExportSettingsModel): Promise<ExportResponse> => {
        setIsLoading(true);
        setError(null);

        try {
            scenarioService.setUser(user);
            const response = await scenarioService.exportVideo(projectId, exportSettings);
            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
            setError(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    const clearSelectedProject = useCallback(() => {
        setSelectedProject(null);
    }, []);

    const setFilters = useCallback((newFilters: Partial<ScenarioContextType['filters']>) => {
        setFiltersState(prev => ({ ...prev, ...newFilters }));
        // Reset pagination when filters change
        setPaginationToken(null);
        // Fetch projects with new filters
        fetchProjects();
    }, [fetchProjects]);

    const setSortBy = useCallback((newSortBy: string) => {
        setSortByState(newSortBy);
        // Reset pagination when sort changes
        setPaginationToken(null);
    }, []);

    const setSortOrder = useCallback((newSortOrder: 'asc' | 'desc') => {
        setSortOrderState(newSortOrder);
        // Reset pagination when sort changes
        setPaginationToken(null);
    }, []);

    const toggleAutoPolling = useCallback(() => {
        setIsAutoPolling(prev => !prev);
        // If turning off auto polling, cleanup any active polls
        if (isAutoPolling) {
            cleanupPolling();
        } else if (!isAutoPolling) {
            // If turning on auto polling and we have projects, consider starting polling for one
            fetchProjects();
        }
    }, [isAutoPolling, cleanupPolling, fetchProjects]);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    const contextValue = {
        // Data states
        projectsData,
        selectedProject,
        totalProjects,
        hasMore,

        // UI states
        isModalOpen,
        isLoading,
        isLoadingMore,
        isRefreshing,
        isAutoPolling,
        activeProjectPoll,
        error,

        // Pagination and filtering
        currentLimit,
        pagination_token,
        sortBy,
        sortOrder,
        filters,

        // Actions - Project management
        createProject,
        handleProjectClick,
        refreshStatus,
        setIsModalOpen,
        clearSelectedProject,

        // Actions - Scenario operations
        saveRequirements,
        getStructure,
        submitStructureFeedback,
        approveStructure,
        getContent,
        submitContentFeedback,
        approveContent,
        getImages,
        submitImageFeedback,
        approveImages,
        getVideo,
        generateVideo,
        repurposeContent,
        exportVideo,

        // Actions - Project list management
        fetchProjects,
        loadMoreProjects,
        setFilters,
        setSortBy,
        setSortOrder,
        toggleAutoPolling,
        clearError
    };

    return (
        <ScenarioContext.Provider value={contextValue}>
            {children}
        </ScenarioContext.Provider>
    );
}

// Custom hook to use the context
export const useScenarioContext = () => {
    const context = useContext(ScenarioContext);
    if (context === undefined) {
        throw new Error('useScenarioContext must be used within a ScenarioProvider');
    }
    return context;
};