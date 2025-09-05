// src/components/research/index.tsx
'use client'
import { useState, useEffect, useRef, useCallback } from 'react';
import Head from 'next/head';
import { useAuthContext } from '@/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { useResearch } from '@/hooks/useResearch';
import {
  ResearchTask,
  ResearchStatus,
  ResearchOutline,
  ResearchStatusResponse,
  ResearchOutlineResponse
} from '@/types/research';
import { ArticleModal } from './ArticleModal';

interface Filters {
  status: ResearchStatus | 'all';
  dateRange: string;
  query: string;
}

// Increased polling timeout to match Python version (30 minutes)
const POLLING_TIMEOUT = 30 * 60 * 1000;
const POLLING_INTERVAL = 5000; // 5 seconds, same as Python version

// Helper function to determine if a task needs polling
const needsPolling = (status: ResearchStatus): boolean => {
  return [
    'started',
    'generating',
    'regenerating',
    'regenerating_outline',
    'prompts_updated'
  ].includes(status);
};

// Helper function to check if task was created recently enough to poll
const isRecentEnough = (timestamp: number): boolean => {
  const date = new Date(timestamp * 1000);
  const now = new Date();
  return now.getTime() - date.getTime() < POLLING_TIMEOUT;
};

const statusLabels: Record<ResearchStatus, { label: string, color: string }> = {
  'started': { label: 'Started', color: 'bg-blue-100 text-blue-800' },
  'outline_ready': { label: 'Outline Ready', color: 'bg-purple-100 text-purple-800' },
  'feedback_needed': { label: 'Feedback Needed', color: 'bg-yellow-100 text-yellow-800' },
  'generating': { label: 'Generating', color: 'bg-amber-100 text-amber-800' },
  'completed': { label: 'Completed', color: 'bg-green-100 text-green-800' },
  'rejected': { label: 'Rejected', color: 'bg-red-100 text-red-800' },
  'error': { label: 'Error', color: 'bg-red-100 text-red-800' },
  'regenerating': { label: 'Regenerating', color: 'bg-amber-100 text-amber-800' },
  'regenerating_outline': { label: 'Regenerating Outline', color: 'bg-purple-100 text-purple-800' },
  'prompts_updated': { label: 'Prompts Updated', color: 'bg-blue-100 text-blue-800' }
};

export function ResearchPage() {
  const { logout, userAttributes } = useAuthContext();
  const router = useRouter();
  const {
    startResearch,
    getResearchStatus,
    getResearchOutline,
    provideFeedback,
    listResearchTasks,
    downloadArticle,
    refreshURLs,
    isLoading: hookLoading,
    error: hookError,
    clearError
  } = useResearch();

  const [topic, setTopic] = useState<string>('');
  const [writingGuidelines, setWritingGuidelines] = useState<string>(
    'Focus on practical applications and recent advancements.'
  );
  const [generateImages, setGenerateImages] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<ResearchStatusResponse | null>(null);
  const [tasksData, setTasksData] = useState<ResearchTask[]>([]);
  const [totalTasks, setTotalTasks] = useState<number>(0);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [filters, setFilters] = useState<Filters>({
    status: 'all',
    dateRange: 'all',
    query: '',
  });
  const [currentLimit, setCurrentLimit] = useState<number>(10);
  const [currentOffset, setCurrentOffset] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [outlineData, setOutlineData] = useState<ResearchOutlineResponse | null>(null);
  const [activeTaskPoll, setActiveTaskPoll] = useState<string | null>(null);
  const [articleContent, setArticleContent] = useState<string | null>(null);
  const [isLoadingArticle, setIsLoadingArticle] = useState<boolean>(false);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mounted = useRef(true);
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [activeTab, setActiveTab] = useState<'article' | 'outline' | 'prompts'>('article');

  // More robust function to start polling a task
  const startPolling = useCallback((taskId: string) => {
    if (!mounted.current || !taskId) return;

    // Clear existing poll if any
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    // Clear existing timeout if any
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }

    setActiveTaskPoll(taskId);
    console.log(`Starting polling for task: ${taskId}`);

    // Create a polling timeout to eventually stop polling
    pollingTimeoutRef.current = setTimeout(() => {
      console.log(`Polling timeout reached for task: ${taskId}`);
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      setActiveTaskPoll(null);
    }, POLLING_TIMEOUT);

    const poll = async () => {
      if (!mounted.current) {
        cleanupPolling();
        return;
      }

      try {
        // Get status for the specific task
        const status = await getResearchStatus(taskId);

        if (!mounted.current) return;

        // Update task in the list
        setTasksData(prev => prev.map(task =>
          task.task_id === taskId
            ? {
              ...task,
              status: status.status,
              progress: status.progress,
              current_step: status.current_step,
              error: status.error,
              article_url: status.article_url,
              image_url: status.image_url
            }
            : task
        ));

        // If the task is complete or encountered an error, stop polling
        if (!needsPolling(status.status)) {
          console.log(`Task ${taskId} no longer needs polling (status: ${status.status})`);
          cleanupPolling();

          // If we were viewing this task, update the selected task
          if (selectedTask && selectedTask.task_id === taskId) {
            setSelectedTask(status);

            // If status is completed, try to retrieve article content
            if (status.status === 'completed') {
              retrieveArticleContent(status);
            }
          }

          // Refresh the task list
          fetchTasks();
        }
      } catch (error) {
        console.error('Polling failed:', error);
        cleanupPolling();
      }
    };

    // Start polling
    pollIntervalRef.current = setInterval(poll, POLLING_INTERVAL);
    poll(); // Initial poll
  }, [selectedTask, getResearchStatus]);

  // Helper function to cleanup polling resources
  const cleanupPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }
    setActiveTaskPoll(null);
  };

  // Function to attempt to retrieve article content with fallbacks
  const retrieveArticleContent = async (task: ResearchStatusResponse) => {
    if (!task) return;

    setIsLoadingArticle(true);
    try {
      // First check if the task status already includes the article content
      if (task.article && task.article.trim().length > 0) {
        console.log('Article content found in task status');
        setArticleContent(task.article);
        setIsLoadingArticle(false);
        return;
      }

      // If there's an article URL, try to fetch it
      if (task.article_url) {
        console.log(`Attempting to download article from URL: ${task.article_url}`);
        try {
          const content = await downloadArticle(task.article_url);
          if (content && content.trim().length > 0) {
            console.log('Successfully retrieved article from URL');
            setArticleContent(content);
            setIsLoadingArticle(false);
            return;
          }
        } catch (e) {
          console.error('Error downloading article:', e);
        }
      }

      // If we still don't have content, make one more attempt to get updated status
      console.log('Making final attempt to get article content from status');
      const updatedStatus = await getResearchStatus(task.task_id);
      if (updatedStatus.article && updatedStatus.article.trim().length > 0) {
        console.log('Article content found in updated task status');
        setArticleContent(updatedStatus.article);
        setIsLoadingArticle(false);
        return;
      }

      // If we still don't have content, show an error
      console.error('Could not retrieve article content');
      setArticleContent(null);
    } catch (error) {
      console.error('Error retrieving article content:', error);
      setArticleContent(null);
    } finally {
      setIsLoadingArticle(false);
    }
  };

  const fetchTasks = async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    try {
      const status = filters.status !== 'all' ? filters.status : undefined;
      const response = await listResearchTasks(
        currentLimit,
        currentOffset,
        status,
        sortBy,
        sortOrder
      );

      // Process tasks to ensure all fields are properly formatted
      const processedTasks = response.tasks.map(task => ({
        ...task,
        progress: typeof task.progress === 'number' ? task.progress : 0,
        created_at: typeof task.created_at === 'number' ? task.created_at :
          Math.floor(Date.now() / 1000)
      }));

      setTasksData(processedTasks);
      setTotalTasks(response.total);
      setHasMore(response.tasks.length < response.total);

      // Find tasks that need polling
      const tasksToPool = processedTasks
        .filter(task =>
          needsPolling(task.status as ResearchStatus) &&
          isRecentEnough(task.created_at)
        )
        .map(task => task.task_id);

      if (tasksToPool.length > 0 && !activeTaskPoll) {
        // Start polling the most recent task that needs polling
        startPolling(tasksToPool[0]);
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const loadMoreTasks = async () => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    try {
      const newOffset = currentOffset + currentLimit;
      setCurrentOffset(newOffset);

      const status = filters.status !== 'all' ? filters.status : undefined;
      const response = await listResearchTasks(
        currentLimit,
        newOffset,
        status,
        sortBy,
        sortOrder
      );

      // Process tasks to ensure all fields are properly formatted
      const processedTasks = response.tasks.map(task => ({
        ...task,
        progress: typeof task.progress === 'number' ? task.progress : 0,
        created_at: typeof task.created_at === 'number' ? task.created_at :
          Math.floor(Date.now() / 1000)
      }));

      setTasksData(prev => [...prev, ...processedTasks]);
      setHasMore(newOffset + response.tasks.length < response.total);
    } catch (error) {
      console.error('Failed to load more tasks:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleStartResearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!topic.trim()) return;

    try {
      const response = await startResearch({
        topic: topic,
        writing_guidelines: writingGuidelines,
        generate_images: generateImages
      });

      console.log(`Research started with task ID: ${response.task_id}`);

      // Reset form
      setTopic('');

      // Refresh tasks and start polling the new task
      await fetchTasks();
      startPolling(response.task_id);

    } catch (error) {
      console.error('Failed to start research:', error);
    }
  };

  const handleTaskClick = async (taskId: string) => {
    try {
      setArticleContent(null);
      setOutlineData(null);
      setIsLoadingArticle(true);

      const taskStatus = await getResearchStatus(taskId);
      setSelectedTask(taskStatus);

      // If we have an outline ready or beyond, fetch it
      if (['outline_ready', 'feedback_needed', 'generating', 'completed'].includes(taskStatus.status)) {
        try {
          console.log(`Fetching outline for task: ${taskId}`);
          const outline = await getResearchOutline(taskId);
          setOutlineData(outline);
        } catch (error) {
          console.error('Error fetching outline:', error);
        }
      }

      // If the task is completed, try to retrieve the article
      if (taskStatus.status === 'completed') {
        await retrieveArticleContent(taskStatus);
      } else {
        setIsLoadingArticle(false);
      }

      setIsModalOpen(true);

      // If task needs polling, start it
      if (needsPolling(taskStatus.status) && isRecentEnough(taskStatus.created_at)) {
        startPolling(taskId);
      }
    } catch (error) {
      console.error('Error fetching task details:', error);
      setIsLoadingArticle(false);
    }
  };

  const handleProvideFeedback = async (accept: boolean, feedbackText?: string) => {
    if (!selectedTask) return;

    try {
      console.log(`Providing feedback for task ${selectedTask.task_id}: ${accept ? 'accept' : 'reject'} ${feedbackText ? 'with feedback' : ''}`);

      // Show loading state
      setIsLoadingArticle(true);

      const feedbackData = {
        accept_outline: accept,
        feedback_text: feedbackText || undefined,
        task_id: selectedTask.task_id
      };

      const response = await provideFeedback(selectedTask.task_id, feedbackData);
      console.log("Feedback response:", response);

      // Update selected task status based on response
      const updatedStatus = await getResearchStatus(selectedTask.task_id);
      setSelectedTask(updatedStatus);

      // For accepted outline, we should automatically switch to the article tab
      if (accept && updatedStatus.status === 'generating') {
        setActiveTab('article');  // This will now work correctly
        // Start polling for generation progress
        startPolling(selectedTask.task_id);
      }

      // Reset loading state
      setIsLoadingArticle(false);

      // Refresh task list
      fetchTasks();
    } catch (error: any) {
      console.error('Error providing feedback:', error);

      // Special handling for the "not ready" error
      if (error.message && error.message.includes('not ready for feedback')) {
        // Show a friendly error to the user
        alert("This outline is not ready for feedback yet. Please wait and try again shortly.");
      } else {
        // Show a generic error
        alert(`Error submitting feedback: ${error.message || 'Unknown error'}`);
      }

      setIsLoadingArticle(false);
    }
  };

  const handleBack = () => {
    cleanupPolling();
    router.push('/');
  };

  const applyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentOffset(0); // Reset to first page
    fetchTasks();
  };

  const onRefreshStatus = async (): Promise<ResearchStatusResponse | null> => {
    if (selectedTask) {
      try {
        const status = await getResearchStatus(selectedTask.task_id);
        setSelectedTask(status);
        if (status.status === 'completed') {
          retrieveArticleContent(status);
        }
        return status;
      } catch (error) {
        console.error('Error refreshing task status:', error);
        return null;
      }
    }
    return null;
  };

  useEffect(() => {
    // Reset to first page when sort parameters change
    setCurrentOffset(0);
    fetchTasks();
  }, [sortBy, sortOrder]);

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
      cleanupPolling();
    };
  }, []);

  // Show hook errors if any
  useEffect(() => {
    if (hookError) {
      console.error('Research hook error:', hookError);
      // You could show a toast or notification here
    }
  }, [hookError]);

  const filteredTasks = tasksData.filter(task => {
    // Filter by query
    const queryFilter = filters.query.toLowerCase();
    const matchesQuery = queryFilter === '' ||
      (task.topic?.toLowerCase().includes(queryFilter)) ||
      (task.title?.toLowerCase().includes(queryFilter));

    // Filter by date range
    const taskDate = new Date(task.created_at * 1000);
    const now = new Date();
    let matchesDate = true;

    switch (filters.dateRange) {
      case 'today':
        matchesDate = taskDate.toDateString() === now.toDateString();
        break;
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        matchesDate = taskDate >= weekAgo;
        break;
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        matchesDate = taskDate >= monthAgo;
        break;
    }

    return matchesQuery && matchesDate;
  });

  return (
    <div className="min-h-screen bg-gray-100">
      <Head>
        <title>AI Research Assistant</title>
        <meta name="description" content="Generate in-depth research articles with AI" />
      </Head>

      {/* Header */}
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
            <button
              onClick={handleBack}
              className="w-full md:w-auto bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Back</span>
            </button>

            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 text-center md:text-left">
              AI Research Assistant
            </h1>

            <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-4">
              {userAttributes && (
                <>
                  <div className="flex items-center space-x-3">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-700 text-center md:text-left">
                        {/* User info */}
                      </span>
                    </div>
                    <button
                      onClick={logout}
                      className="w-full md:w-auto bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Logout
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-8 py-4 md:py-8">
        {/* Research Form */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-xl font-semibold mb-4">Generate Research Article</h2>
          <form onSubmit={handleStartResearch}>
            <div className="space-y-4">
              <div>
                <label htmlFor="topic" className="block text-sm font-medium text-gray-700 mb-1">
                  Research Topic
                </label>
                <input
                  id="topic"
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Enter a research topic, e.g., 'The future of quantum computing'"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label htmlFor="guidelines" className="block text-sm font-medium text-gray-700 mb-1">
                  Writing Guidelines (optional)
                </label>
                <textarea
                  id="guidelines"
                  value={writingGuidelines}
                  onChange={(e) => setWritingGuidelines(e.target.value)}
                  placeholder="Add specific instructions for the article..."
                  rows={3}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex items-center">
                <input
                  id="generateImages"
                  type="checkbox"
                  checked={generateImages}
                  onChange={(e) => setGenerateImages(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="generateImages" className="ml-2 block text-sm text-gray-700">
                  Generate header image
                </label>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={hookLoading || !topic.trim()}
                  className="w-full md:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300 transition-colors flex items-center justify-center"
                >
                  {hookLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Starting Research...
                    </>
                  ) : (
                    'Start Research'
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Research Tasks */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Research Tasks</h2>
            <button
              onClick={fetchTasks}
              disabled={isRefreshing}
              className="flex items-center gap-2 bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-700 disabled:bg-gray-300 transition-colors"
            >
              {isRefreshing ? (
                <>
                  <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Refreshing...
                </>
              ) : (
                <>
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </>
              )}
            </button>
          </div>

          {/* Filters */}
          <form onSubmit={applyFilters} className="mb-6">
            <div className="flex flex-col md:flex-row flex-wrap gap-4">
              <div className="w-full md:w-auto flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Status:</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as ResearchStatus | 'all' }))}
                  className="p-2 rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                >
                  <option value="all">All</option>
                  <option value="started">Started</option>
                  <option value="outline_ready">Outline Ready</option>
                  <option value="feedback_needed">Feedback Needed</option>
                  <option value="generating">Generating</option>
                  <option value="completed">Completed</option>
                  <option value="rejected">Rejected</option>
                  <option value="error">Error</option>
                  <option value="regenerating">Regenerating</option>
                  <option value="regenerating_outline">Regenerating Outline</option>
                  <option value="prompts_updated">Prompts Updated</option>
                </select>
              </div>

              <div className="w-full md:w-auto flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Date Range:</label>
                <select
                  value={filters.dateRange}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                  className="p-2 rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">Last Week</option>
                  <option value="month">Last Month</option>
                </select>
              </div>

              <div className="w-full md:w-auto flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Search:</label>
                <input
                  type="text"
                  value={filters.query}
                  onChange={(e) => setFilters(prev => ({ ...prev, query: e.target.value }))}
                  placeholder="Search by topic..."
                  className="p-2 rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
              </div>

              {/* Sort controls */}
              <div className="w-full md:w-auto flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Sort By:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="p-2 rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                >
                  <option value="created_at">Date</option>
                  <option value="topic">Topic</option>
                  <option value="status">Status</option>
                  <option value="progress">Progress</option>
                </select>

                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                  className="p-2 rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                >
                  <option value="desc">Descending</option>
                  <option value="asc">Ascending</option>
                </select>
              </div>

              <div className="w-full md:w-auto">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </form>

          {/* Tasks Table */}
          <div className="overflow-x-auto bg-white rounded-lg">
            <div className="min-w-full inline-block align-middle">
              <div className="overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Topic
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Progress
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredTasks.length > 0 ? (
                      filteredTasks.map((task, index) => (
                        <tr key={task.task_id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(task.created_at * 1000).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            <div className="font-medium truncate max-w-xs md:max-w-md" title={task.title || task.topic || 'No topic'}>
                              {task.title || task.topic || 'No topic'}
                            </div>
                            {task.title && (
                              <div className="text-xs text-gray-500 mt-1 truncate max-w-xs md:max-w-md" title={task.topic}>
                                {task.topic}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-normal">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 inline-flex items-center text-xs leading-5 font-semibold rounded-full 
                                ${statusLabels[task.status as ResearchStatus]?.color || 'bg-gray-100 text-gray-800'}`}>
                                {statusLabels[task.status as ResearchStatus]?.label || task.status}
                              </span>
                              {activeTaskPoll === task.task_id && (
                                <svg className="animate-spin h-4 w-4 text-blue-500" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                              )}
                            </div>
                            {task.error && (
                              <div className="text-xs text-red-600 mt-1 break-words overflow-hidden" style={{ maxWidth: "200px", maxHeight: "40px", display: "-webkit-box", WebkitLineClamp: "2", WebkitBoxOrient: "vertical" }}>
                                {task.error}
                                {task.error.length > 50 && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      alert(task.error);
                                    }}
                                    className="ml-1 text-blue-600 hover:text-blue-800 hover:underline focus:outline-none"
                                  >
                                    (view all)
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                              <div
                                className="bg-blue-600 h-2.5 rounded-full"
                                style={{ width: `${Math.round(task.progress * 100)}%` }}
                              ></div>
                            </div>
                            <span className="text-xs text-gray-500 mt-1">
                              {Math.round(task.progress * 100)}%
                              {task.current_step && ` - ${task.current_step}`}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button
                              onClick={() => handleTaskClick(task.task_id)}
                              className="text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                          {isRefreshing ? 'Loading tasks...' : 'No research tasks found'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Load More Button */}
          {hasMore && (
            <div className="mt-4 text-center">
              <button
                onClick={loadMoreTasks}
                disabled={isLoadingMore}
                className="bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-700 disabled:bg-gray-300"
              >
                {isLoadingMore ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </div>

        {/* Task Details Modal */}
        {selectedTask && (
          <ArticleModal
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setSelectedTask(null);
              setOutlineData(null);
              setArticleContent(null);
            }}
            task={selectedTask}
            outline={outlineData}
            onAcceptOutline={(feedbackText) => {
              console.log("Accepting outline", selectedTask.task_id, feedbackText);
              handleProvideFeedback(true, feedbackText);
            }}
            onRejectOutline={(feedbackText) => {
              console.log("Rejecting outline", selectedTask.task_id, feedbackText);
              handleProvideFeedback(false, feedbackText);
            }}
            articleContent={articleContent}
            isLoadingArticle={isLoadingArticle}
            onRefreshStatus={onRefreshStatus}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
        )}
      </main>
    </div>
  );
}