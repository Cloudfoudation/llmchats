// src/components/event-composer/index.tsx
'use client'
import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useAuthContext } from '@/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { useEventContext } from '@/providers/EventContext';
import { EventModal } from './EventModal';
import { EventStatus } from '@/types/event';
import { useTranslations } from 'next-intl';

const statusLabels: Record<EventStatus, { label: string, color: string }> = {
  'started': { label: 'Started', color: 'bg-blue-100 text-blue-800' },
  'announcement_ready': { label: 'Announcement Ready', color: 'bg-teal-100 text-teal-800' },
  'generating_images': { label: 'Generating Images', color: 'bg-indigo-100 text-indigo-800' },
  'images_ready': { label: 'Images Ready', color: 'bg-cyan-100 text-cyan-800' },
  'generating_prompts': { label: 'Generating Prompts', color: 'bg-indigo-100 text-indigo-800' },
  'prompts_generated': { label: 'Prompts Ready', color: 'bg-purple-100 text-purple-800' },
  'generating_videos': { label: 'Generating Videos', color: 'bg-amber-100 text-amber-800' },
  'completed': { label: 'Completed', color: 'bg-green-100 text-green-800' },
  'error': { label: 'Error', color: 'bg-red-100 text-red-800' },
};

export function EventPage() {
  const t = useTranslations('common');
  const tEvents = useTranslations('events');
  const { logout, userAttributes } = useAuthContext();
  const router = useRouter();
  const {
    // Access all the context values here
    tasksData,
    selectedTask,
    tasksWithPendingAnnouncement,
    isModalOpen,
    isLoading,
    isLoadingMore,
    isRefreshing,
    isAutoPolling,
    activeTaskPoll,
    hasMore,
    filters,
    sortOrder,


    // Actions
    startEvent,
    handleTaskClick,
    setIsModalOpen,
    clearSelectedTask,
    fetchTasks,
    loadMoreTasks,
    setFilters,
    setSortOrder,
    toggleAutoPolling
  } = useEventContext();

  // Local component state 
  const [eventName, setEventName] = useState<string>('');
  const [dateTime, setDateTime] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [tone, setTone] = useState<string>('Lively');
  const [localFilterQuery, setLocalFilterQuery] = useState<string>('');

  // Sync local filter query with context filters
  useEffect(() => {
    setLocalFilterQuery(filters.query || '');
  }, [filters.query]);

  const handleStartEvent = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!eventName.trim()) return;

    try {
      const response = await startEvent({
        event_name: eventName,
        date_time: dateTime,
        location: location,
        tone: tone
      });

      // Reset form
      setEventName('');
      setDateTime('');
      setLocation('');

      // Refresh the task list
      await fetchTasks();

      // Get the task ID and click on it to open the modal
      const taskId = response.task_id;
      await handleTaskClick(taskId);
    } catch (error) {
      console.error('Failed to start event composition:', error);
    }
  };

  const handleBack = () => {
    router.push('/');
  };

  const applyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    // Apply query filter from local state
    setFilters({ query: localFilterQuery });
    fetchTasks();
  };

  // Filter tasks based on query and date range (client-side filtering)
  const filteredTasks = tasksData.filter(task => {
    // Filter by query
    const queryFilter = localFilterQuery.toLowerCase();
    const matchesQuery = queryFilter === '' ||
      (task.event_name?.toLowerCase().includes(queryFilter));

    // Filter by date range (client-side only)
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
        <title>Event Composer</title>
        <meta name="description" content="Create event announcements and videos" />
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
              <span>{t('previous')}</span>
            </button>

            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 text-center md:text-left">
              {tEvents('title')}
            </h1>

            <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-4">
              {/* Auto Polling Toggle */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Auto Polling</span>
                <label className="inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isAutoPolling}
                    onChange={toggleAutoPolling}
                    className="sr-only peer"
                  />
                  <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

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
        {/* Event Composer Form */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-xl font-semibold mb-4">Create Event Announcement</h2>
          <form onSubmit={handleStartEvent}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="eventName" className="block text-sm font-medium text-gray-700 mb-1">
                  Event Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="eventName"
                  type="text"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  placeholder="Enter event name, e.g., 'Company Summer Party'"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label htmlFor="dateTime" className="block text-sm font-medium text-gray-700 mb-1">
                  Date & Time (optional)
                </label>
                <input
                  id="dateTime"
                  type="text"
                  value={dateTime}
                  onChange={(e) => setDateTime(e.target.value)}
                  placeholder="E.g., August 15, 2024 at 6:00 PM"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                  Location (optional)
                </label>
                <input
                  id="location"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="E.g., Central Park, Main Pavilion"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="tone" className="block text-sm font-medium text-gray-700 mb-1">
                  Tone
                </label>
                <select
                  id="tone"
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Lively">Lively</option>
                  <option value="Formal">Formal</option>
                  <option value="Casual">Casual</option>
                  <option value="Exciting">Exciting</option>
                  <option value="Sophisticated">Sophisticated</option>
                </select>
              </div>

              <div className="col-span-1 md:col-span-2 pt-2">
                <button
                  type="submit"
                  disabled={isLoading || !eventName.trim()}
                  className="w-full md:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300 transition-colors flex items-center justify-center"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Starting...
                    </>
                  ) : (
                    tEvents('createEvent')
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Event Tasks */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">{tEvents('title')}</h2>
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
                  onChange={(e) => setFilters({ status: e.target.value as EventStatus | 'all' })}
                  className="p-2 rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                >
                  <option value="all">All</option>
                  <option value="started">Started</option>
                  <option value="announcement_ready">Announcement Ready</option>
                  <option value="generating_images">Generating Images</option>
                  <option value="images_ready">Images Ready</option>
                  <option value="prompts_generated">Prompts Ready</option>
                  <option value="generating_videos">Generating Videos</option>
                  <option value="completed">Completed</option>
                  <option value="error">Error</option>
                </select>
              </div>

              <div className="w-full md:w-auto flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Date Range:</label>
                <select
                  value={filters.dateRange}
                  onChange={(e) => setFilters({ dateRange: e.target.value })}
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
                  value={localFilterQuery}
                  onChange={(e) => setLocalFilterQuery(e.target.value)}
                  placeholder="Search by event name..."
                  className="p-2 rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
              </div>

              {/* Sort controls - simplify to only allow sorting by order */}
              <div className="w-full md:w-auto flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Sort Order:</label>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                  className="p-2 rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                >
                  <option value="desc">Newest First</option>
                  <option value="asc">Oldest First</option>
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
                        Event
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Progress
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredTasks.length > 0 ? (
                      filteredTasks.map((task, index) => (
                        <tr key={task.task_id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div>
                              {new Date(task.created_at * 1000).toLocaleDateString()}
                            </div>
                            <div className="text-xs text-gray-400">
                              {new Date(task.created_at * 1000).toLocaleTimeString()}
                            </div>
                            {task.updated_at && task.updated_at !== task.created_at && (
                              <div className="text-xs text-gray-400 mt-1">
                                Updated: {new Date(task.updated_at * 1000).toLocaleString()}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            <div className="font-medium truncate max-w-xs md:max-w-md" title={task.event_name || 'No name'}>
                              {task.event_name || 'No name'}
                            </div>
                            {task.date_time && (
                              <div className="text-xs text-gray-500 mt-1 truncate max-w-xs md:max-w-md" title={task.date_time}>
                                {task.date_time}
                              </div>
                            )}
                            {task.location && (
                              <div className="text-xs text-gray-500 truncate max-w-xs md:max-w-md" title={task.location}>
                                {task.location}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-normal">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 inline-flex items-center text-xs leading-5 font-semibold rounded-full 
                                ${statusLabels[task.status as EventStatus]?.color || 'bg-gray-100 text-gray-800'}`}>
                                {statusLabels[task.status as EventStatus]?.label || task.status}
                              </span>

                              {/* Add this condition to show pending announcement badge */}
                              {(tasksWithPendingAnnouncement.has(task.task_id) && task.status === 'started') && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                  Announcement Ready
                                </span>
                              )}

                              {/* Badge for announcement_ready tasks */}
                              {task.status === 'announcement_ready' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                  Review Needed
                                </span>
                              )}

                              {/* Badge for images_ready tasks */}
                              {task.status === 'images_ready' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-100 text-cyan-800">
                                  Images Ready
                                </span>
                              )}

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
                              className={`hover:underline ${task.status === 'announcement_ready' || task.status === 'images_ready'
                                ? 'text-teal-600 hover:text-teal-800 font-medium'
                                : 'text-blue-600 hover:text-blue-800'
                                }`}
                            >
                              {task.status === 'announcement_ready' ? 'Review Announcement' :
                                task.status === 'images_ready' ? 'Review Images' :
                                  'View Details'}
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                          {isRefreshing ? 'Loading events...' : 'No events found'}
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
          <EventModal
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              clearSelectedTask();
            }}
          />
        )}
      </main>
    </div>
  );
}