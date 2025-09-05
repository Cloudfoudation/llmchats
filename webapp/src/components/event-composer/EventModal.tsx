import { useRef, useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, RefreshCw, MessageSquare, Send, Video, Wand2, Pencil, FileVideo, ThumbsUp, ThumbsDown, History, Image, CheckCircle2 } from 'lucide-react';
import { EventStatus, PreviewImage } from '@/types/event';
import { useEventContext } from '@/providers/EventContext';
import { MessageContent } from '@/components/chat/MessageList/MessageContent';
import { Message, RoleType, MessageType } from '@/types/chat';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Status labels remain unchanged...
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

export function EventModal({ isOpen, onClose }: EventModalProps) {
  // All state declarations remain the same...
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [activeTab, setActiveTab] = useState<'announcement' | 'images' | 'video' | 'history'>('announcement');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingPrompts, setIsLoadingPrompts] = useState<boolean>(false);
  const [isLoadingVideos, setIsLoadingVideos] = useState<boolean>(false);
  const [isAcceptingAnnouncement, setIsAcceptingAnnouncement] = useState<boolean>(false);
  const [isProvidingImageFeedback, setIsProvidingImageFeedback] = useState<boolean>(false);
  const [systemPromptEditor, setSystemPromptEditor] = useState<boolean>(false);
  const [announcementPrompt, setAnnouncementPrompt] = useState<string>('');
  const [imagePrompt, setImagePrompt] = useState<string>('');
  const [videoPrompt, setVideoPrompt] = useState<string>('');
  const [feedbackText, setFeedbackText] = useState<string>('');
  const [imageFeedback, setImageFeedback] = useState<string>('');
  const [selectedImages, setSelectedImages] = useState<Set<number>>(new Set());
  const announcementContainerRef = useRef<HTMLDivElement>(null);
  const [refreshingImages, setRefreshingImages] = useState<boolean>(false);
  const [isAcceptingImages, setIsAcceptingImages] = useState<boolean>(false);
  const [videoKey, setVideoKey] = useState<number>(0);

  // Get everything we need from the context
  const {
    selectedTask,
    refreshStatus,
    sendChatMessage,
    acceptAnnouncement,
    provideImageFeedback,
    getPreviewImages,
    generateVideos,
    updateSystemPrompts,
    acceptImages
  } = useEventContext();

  // Ensure we have the selected task
  if (!selectedTask) {
    return null;
  }

  // Initialize system prompts when selectedTask changes
  useEffect(() => {
    if (selectedTask) {
      setAnnouncementPrompt(selectedTask.announcement_system_prompt || '');
      setImagePrompt(selectedTask.image_system_prompt || '');
      setVideoPrompt(selectedTask.video_system_prompt || '');
    }
  }, [selectedTask]);

  // Check different status conditions to determine what to show
  const showFeedbackControls = selectedTask.status === 'started' && selectedTask.announcement;
  const showAnnouncementReview = selectedTask.status === 'announcement_ready';
  const showGeneratingImages = selectedTask.status === 'generating_images';
  const showImageReview = (selectedTask.preview_image_urls && selectedTask.preview_image_urls.length > 0) ||
    selectedTask.status === 'images_ready';
  const showVideos = selectedTask.video_prompts && selectedTask.video_prompts.length > 0;
  const isGeneratingVideos = selectedTask.status === 'generating_videos';
  const isGeneratingPrompts = selectedTask.status === 'generating_prompts';
  const isError = selectedTask.status === 'error';
  const isVideoGenerationError = isError && selectedTask.video_prompts && selectedTask.video_prompts.length > 0;

  // Initialize system prompts - useEffect doesn't need changes
  useEffect(() => {
    if (selectedTask) {
      setAnnouncementPrompt(selectedTask.announcement_system_prompt || '');
      setImagePrompt(selectedTask.image_system_prompt || '');
      setVideoPrompt(selectedTask.video_system_prompt || '');
    }
  }, [selectedTask]);

  // Tab switching effect doesn't need changes
  useEffect(() => {
    // Same tab switching logic as before...
    if (selectedTask.status === 'prompts_generated') {
      setActiveTab('video');
    } else if (isGeneratingVideos || isGeneratingPrompts) {
      setActiveTab('video');
    } else if (showGeneratingImages || showImageReview) {
      setActiveTab('images');
    } else if (showVideos && !isVideoGenerationError) {
      setActiveTab('video');
    } else {
      setActiveTab('announcement');
    }
  }, [
    selectedTask.status,
    showGeneratingImages,
    showImageReview,
    showVideos,
    isGeneratingVideos,
    isGeneratingPrompts,
    isVideoGenerationError
  ]);

  // REFACTORED: Update system prompts using Promise chaining
  const handleUpdateSystemPrompts = () => {
    setIsLoading(true);

    updateSystemPrompts(selectedTask.task_id, {
      announcement_prompt: announcementPrompt,
      image_prompt: imagePrompt,
      video_prompt: videoPrompt
    })
      .then(() => {
        return refreshStatus();
      })
      .then(() => {
        setSystemPromptEditor(false);
      })
      .catch((error) => {
        console.error('Error updating system prompts:', error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  // REFACTORED: Accept announcement using Promise chaining
  const handleAcceptAnnouncement = () => {
    setIsLoadingPrompts(true);
    setIsAcceptingAnnouncement(true);

    const sendFeedbackPromise = feedbackText.trim()
      ? sendChatMessage(selectedTask.task_id, `I'm happy with this announcement! Additional notes: ${feedbackText.trim()}`)
      : Promise.resolve();

    sendFeedbackPromise
      .then(() => {
        return acceptAnnouncement(selectedTask.task_id);
      })
      .then(() => {
        return refreshStatus();
      })
      .then((updatedStatus) => {
        if (updatedStatus && updatedStatus.status === 'generating_images') {
          setActiveTab('images');
        }
        setFeedbackText('');
      })
      .catch((error) => {
        console.error('Error accepting announcement:', error);
      })
      .finally(() => {
        setIsLoadingPrompts(false);
        setIsAcceptingAnnouncement(false);
      });
  };

  // REFACTORED: Revise announcement using Promise chaining
  const handleReviseAnnouncement = () => {
    setIsLoading(true);

    let message = "I'd like to revise the announcement.";
    if (feedbackText.trim()) {
      message += ` Here's my feedback: ${feedbackText.trim()}`;
    } else {
      message += " Could you try a different approach?";
    }

    sendChatMessage(selectedTask.task_id, message)
      .then(() => {
        return refreshStatus();
      })
      .then(() => {
        setFeedbackText('');
      })
      .catch((error) => {
        console.error('Error rejecting announcement:', error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  // Image selection doesn't need changes
  const handleImageSelect = (index: number) => {
    setSelectedImages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  // REFACTORED: Provide image feedback using Promise chaining
  const handleProvideImageFeedback = () => {
    setIsProvidingImageFeedback(true);

    const selectedIndices = Array.from(selectedImages);

    provideImageFeedback(selectedTask.task_id, selectedIndices, imageFeedback, true)
      .then(() => {
        return refreshStatus();
      })
      .then(() => {
        setImageFeedback('');
        setSelectedImages(new Set());
      })
      .catch((error) => {
        console.error('Error providing image feedback:', error);
      })
      .finally(() => {
        setIsProvidingImageFeedback(false);
      });
  };

  // REFACTORED: Accept images using Promise chaining
  const handleAcceptImages = () => {
    setIsAcceptingImages(true);

    acceptImages(selectedTask.task_id)
      .then(() => {
        return refreshStatus();
      })
      .then((updatedStatus) => {
        if (updatedStatus && updatedStatus.status === 'generating_prompts') {
          setActiveTab('video');
        }
      })
      .catch((error) => {
        console.error('Error accepting images:', error);
      })
      .finally(() => {
        setIsAcceptingImages(false);
      });
  };

  // REFACTORED: Refresh images using Promise chaining
  const handleRefreshImages = () => {
    setRefreshingImages(true);

    getPreviewImages(selectedTask.task_id)
      .then(() => {
        return refreshStatus();
      })
      .catch((error) => {
        console.error('Error refreshing images:', error);
      })
      .finally(() => {
        setRefreshingImages(false);
      });
  };

  // REFACTORED: Generate videos using Promise chaining
  const handleGenerateVideos = () => {
    setIsLoadingVideos(true);

    generateVideos(selectedTask.task_id)
      .then(() => {
        return refreshStatus();
      })
      .then((updatedStatus) => {
        if (updatedStatus && updatedStatus.status === 'generating_videos') {
          setActiveTab('video');
        }
        return null;
      })
      .catch((error) => {
        console.error('Error generating videos:', error);
      })
      .finally(() => {
        setIsLoadingVideos(false);
      });
  };

  // REFACTORED: Manual refresh using Promise chaining
  const handleManualRefresh = () => {
    refreshStatus()
      .then(() => {
        setVideoKey(prev => prev + 1);
      })
      .catch((error) => {
        console.error('Error refreshing status:', error);
      });
  };

  // Message preparation remains the same
  const announcementMessage = selectedTask.announcement ? {
    id: 'announcement',
    role: 'assistant' as RoleType,
    content: selectedTask.announcement,
    createdAt: new Date().toISOString(),
    type: 'text' as MessageType
  } : null;

  const conversationHistory = selectedTask.conversation_history?.map((msg, index) => ({
    id: `msg-${index}`,
    role: msg.role as RoleType,
    content: msg.content,
    createdAt: new Date().toISOString(),
    type: 'text' as MessageType
  }));

  const hasHistory = conversationHistory && conversationHistory.length > 0;

  // The JSX render portion remains largely unchanged
  return (
    // The entire JSX structure remains the same as before
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/25 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />

        <Dialog.Content
          className="fixed left-[50%] top-[50%] max-h-[85vh] w-[90vw] max-w-5xl translate-x-[-50%] translate-y-[-50%] overflow-hidden rounded-lg bg-white shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] flex flex-col"
        >
          <div className="flex justify-between items-center border-b p-4">
            <Dialog.Title className="text-lg font-medium text-gray-900">
              <div>
                {selectedTask.event_name || 'Event'}
                <div className="text-sm text-gray-500">
                  {selectedTask.task_id}
                  <span className="ml-2 text-xs">
                    {selectedTask.created_at ? new Date(
                      typeof selectedTask.created_at === 'number' ? selectedTask.created_at * 1000 : selectedTask.created_at
                    ).toLocaleString() : 'No date available'}
                  </span>
                </div>
              </div>
            </Dialog.Title>

            <div className="flex items-center gap-2">
              {/* System prompt editor button */}
              <button
                onClick={() => setSystemPromptEditor(!systemPromptEditor)}
                className={`inline-flex items-center justify-center rounded-md ${systemPromptEditor
                  ? 'bg-blue-600 text-white px-3 py-1.5'
                  : 'bg-blue-100 text-blue-800 hover:bg-blue-200 px-3 py-1.5'
                  } transition-colors`}
                aria-label="Edit System Prompts"
                title="Edit System Prompts"
              >
                <Pencil className="h-4 w-4 mr-1" />
                <span className="text-sm font-medium">Edit Prompts</span>
              </button>

              {/* Refresh button */}
              <button
                onClick={handleManualRefresh}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
                aria-label="Refresh"
                title="Refresh status"
              >
                <RefreshCw className="h-4 w-4" />
              </button>

              <Dialog.Close asChild>
                <button
                  ref={closeButtonRef}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </Dialog.Close>
            </div>
          </div>

          {/* Status indicator */}
          <div className="px-4 py-2 flex items-center border-b">
            <span className="mr-2 text-sm text-gray-500">Status:</span>
            <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full 
              ${statusLabels[selectedTask.status as EventStatus]?.color || 'bg-gray-100 text-gray-800'}`}
            >
              {statusLabels[selectedTask.status as EventStatus]?.label || selectedTask.status}
            </span>

            {/* Show current step if available */}
            {selectedTask.current_step && (
              <span className="ml-2 text-xs text-gray-500">
                {selectedTask.current_step}
              </span>
            )}

            {/* Show progress if available */}
            {selectedTask.progress !== undefined && (
              <div className="ml-3 flex items-center space-x-1">
                <div className="w-20 bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-blue-600 h-1.5 rounded-full"
                    style={{ width: `${Math.round(selectedTask.progress * 100)}%` }}
                  ></div>
                </div>
                <span className="text-xs text-gray-500">
                  {Math.round(selectedTask.progress * 100)}%
                </span>
              </div>
            )}
          </div>

          {/* System Prompt Editor */}
          {systemPromptEditor && (
            <div className="p-4 border-b">
              <h3 className="text-md font-semibold text-gray-900 mb-2">System Prompts</h3>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Announcement Generator Prompt
                </label>
                <textarea
                  value={announcementPrompt}
                  onChange={(e) => setAnnouncementPrompt(e.target.value)}
                  rows={5}
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm font-mono"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Image Generator Prompt
                </label>
                <textarea
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  rows={5}
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm font-mono"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Video Generator Prompt
                </label>
                <textarea
                  value={videoPrompt}
                  onChange={(e) => setVideoPrompt(e.target.value)}
                  rows={5}
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm font-mono"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setSystemPromptEditor(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateSystemPrompts}
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 flex items-center gap-1"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Updating...
                    </>
                  ) : (
                    'Save Prompts'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('announcement')}
              className={`px-4 py-2 font-medium text-sm ${activeTab === 'announcement' ?
                'text-blue-600 border-b-2 border-blue-600' :
                'text-gray-500 hover:text-gray-700'}`}
            >
              <div className="flex items-center gap-1">
                <MessageSquare className="h-4 w-4" />
                Announcement
              </div>
            </button>
            <button
              onClick={() => setActiveTab('images')}
              className={`px-4 py-2 font-medium text-sm ${activeTab === 'images' ?
                'text-blue-600 border-b-2 border-blue-600' :
                'text-gray-500 hover:text-gray-700'}`}
            >
              <div className="flex items-center gap-1">
                <Image className="h-4 w-4" />
                Images
              </div>
            </button>
            <button
              onClick={() => setActiveTab('video')}
              className={`px-4 py-2 font-medium text-sm ${activeTab === 'video' ?
                'text-blue-600 border-b-2 border-blue-600' :
                'text-gray-500 hover:text-gray-700'}`}
            >
              <div className="flex items-center gap-1">
                <Video className="h-4 w-4" />
                Videos
              </div>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 font-medium text-sm ${activeTab === 'history' ?
                'text-blue-600 border-b-2 border-blue-600' :
                'text-gray-500 hover:text-gray-700'}`}
            >
              <div className="flex items-center gap-1">
                <History className="h-4 w-4" />
                History
              </div>
            </button>
          </div>

          {/* Main content area */}
          <div className="flex-grow overflow-y-auto p-4">
            {/* Announcement Tab */}
            {activeTab === 'announcement' && (
              <div>
                {/* Show error message if present */}
                {isError && !isVideoGenerationError && (
                  <div className="rounded-md bg-red-50 p-4 mb-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800">An error occurred</h3>
                        <div className="mt-2 text-sm text-red-700">
                          <p>{selectedTask.error || "Unknown error generating announcement"}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Show waiting for initial message */}
                {selectedTask.status === 'started' && !selectedTask.announcement && (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mb-4"></div>
                    <p className="text-gray-700 mb-2">Creating announcement draft...</p>
                    <p className="text-sm text-gray-500">This may take a moment</p>
                  </div>
                )}

                {/* Show announcement draft for feedback */}
                {showFeedbackControls && (
                  <div className="space-y-6" ref={announcementContainerRef}>
                    <div className="border rounded-lg p-4 bg-blue-50">
                      <h4 className="text-md font-semibold mb-2 text-blue-900">Event Announcement Draft</h4>
                      <div className="bg-white rounded-md p-4 shadow-sm">
                        {announcementMessage && (
                          <MessageContent message={announcementMessage} onImageClick={() => { }} />
                        )}
                      </div>

                      {/* Event details summary */}
                      {(selectedTask.date_time || selectedTask.location) && (
                        <div className="mt-4 bg-white rounded-md p-3 shadow-sm">
                          <h5 className="text-sm font-medium text-gray-700 mb-1">Event Details</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                            {selectedTask.date_time && (
                              <div className="text-gray-700">
                                <span className="font-medium">Date/Time:</span> {selectedTask.date_time}
                              </div>
                            )}
                            {selectedTask.location && (
                              <div className="text-gray-700">
                                <span className="font-medium">Location:</span> {selectedTask.location}
                              </div>
                            )}
                            {selectedTask.tone && (
                              <div className="text-gray-700">
                                <span className="font-medium">Tone:</span> {selectedTask.tone}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Feedback controls */}
                      <div className="mt-4 space-y-4">
                        {/* Feedback textfield and action buttons */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Feedback (optional)
                          </label>
                          <textarea
                            value={feedbackText}
                            onChange={(e) => setFeedbackText(e.target.value)}
                            placeholder="Add any specific feedback or revision requests..."
                            rows={3}
                            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={isLoading || isLoadingPrompts}
                          />
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <button
                            onClick={handleAcceptAnnouncement}
                            disabled={isLoading || isLoadingPrompts || isAcceptingAnnouncement}
                            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
                          >
                            {isAcceptingAnnouncement ? (
                              <>
                                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                <span>Accepting...</span>
                              </>
                            ) : (
                              <>
                                <ThumbsUp className="h-4 w-4" />
                                Accept Announcement
                              </>
                            )}
                          </button>

                          <button
                            onClick={handleReviseAnnouncement}
                            disabled={isLoading || isLoadingPrompts || isAcceptingAnnouncement}
                            className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors flex items-center justify-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
                          >
                            <>
                              <RefreshCw className="h-4 w-4" />
                              Request Revisions
                            </>
                          </button>
                        </div>

                        {/* Explanation of actions */}
                        <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded-md">
                          <p className="font-medium">What happens next?</p>
                          <ul className="list-disc ml-4 mt-1">
                            <li>Accept: Approve this announcement draft</li>
                            <li>Revisions: Request changes to the announcement</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {showAnnouncementReview && (
                  <div className="space-y-6" ref={announcementContainerRef}>
                    <div className="border rounded-lg p-4 bg-teal-50">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="text-md font-semibold text-teal-900">Announcement Ready for Review</h4>
                        <span className="px-2 py-1 bg-teal-100 text-teal-800 text-xs font-medium rounded-full">
                          Needs Approval
                        </span>
                      </div>

                      <div className="bg-white rounded-md p-4 shadow-sm">
                        {announcementMessage && (
                          <MessageContent message={announcementMessage} onImageClick={() => { }} />
                        )}
                      </div>

                      {/* Feedback controls */}
                      <div className="mt-4 space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Feedback (optional)
                          </label>
                          <textarea
                            value={feedbackText}
                            onChange={(e) => setFeedbackText(e.target.value)}
                            placeholder="Add any specific feedback or revision requests..."
                            rows={3}
                            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={isLoading || isLoadingPrompts}
                          />
                        </div>
                        {/* Feedback textfield and action buttons */}
                        <div className="flex flex-col sm:flex-row gap-3">
                          <button
                            onClick={handleAcceptAnnouncement}
                            disabled={isLoading || isLoadingPrompts || isAcceptingAnnouncement}
                            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
                          >
                            {isAcceptingAnnouncement ? (
                              <>
                                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                <span>Accepting...</span>
                              </>
                            ) : (
                              <>
                                <ThumbsUp className="h-4 w-4" />
                                Accept Announcement
                              </>
                            )}
                          </button>

                          <button
                            onClick={handleReviseAnnouncement}
                            disabled={isLoading || isLoadingPrompts || isAcceptingAnnouncement}
                            className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors flex items-center justify-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
                          >
                            <>
                              <RefreshCw className="h-4 w-4" />
                              Request Revisions
                            </>
                          </button>
                        </div>

                        {/* Explanation of actions */}
                        <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded-md">
                          <p className="font-medium">What happens next?</p>
                          <ul className="list-disc ml-4 mt-1">
                            <li>Accept: Approve this announcement draft</li>
                            <li>Revisions: Request changes to the announcement</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Show completed announcement when later in workflow */}
                {(selectedTask.status === 'generating_images' ||
                  selectedTask.status === 'images_ready' ||
                  selectedTask.status === 'prompts_generated' ||
                  selectedTask.status === 'generating_videos' ||
                  selectedTask.status === 'completed' ||
                  selectedTask.status === 'generating_prompts') && (
                    <div className="space-y-6" ref={announcementContainerRef}>
                      <div className="border rounded-lg p-4">
                        <h4 className="text-md font-semibold mb-2 text-gray-900">Finalized Announcement</h4>
                        <div className="bg-gray-50 rounded-md p-4">
                          {announcementMessage && (
                            <MessageContent message={announcementMessage} onImageClick={() => { }} />
                          )}
                        </div>

                        {/* Event details summary */}
                        {(selectedTask.date_time || selectedTask.location) && (
                          <div className="mt-4 bg-white rounded-md p-3 border">
                            <h5 className="text-sm font-medium text-gray-700 mb-1">Event Details</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                              {selectedTask.date_time && (
                                <div className="text-gray-700">
                                  <span className="font-medium">Date/Time:</span> {selectedTask.date_time}
                                </div>
                              )}
                              {selectedTask.location && (
                                <div className="text-gray-700">
                                  <span className="font-medium">Location:</span> {selectedTask.location}
                                </div>
                              )}
                              {selectedTask.tone && (
                                <div className="text-gray-700">
                                  <span className="font-medium">Tone:</span> {selectedTask.tone}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Image tab navigation button */}
                      {showGeneratingImages && (
                        <div className="flex justify-center">
                          <button
                            onClick={() => setActiveTab('images')}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                          >
                            View Image Generation Progress
                          </button>
                        </div>
                      )}

                      {/* Video tab navigation button */}
                      {selectedTask.status === 'prompts_generated' && (
                        <div className="flex justify-center">
                          <button
                            onClick={() => setActiveTab('video')}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                          >
                            View Video Concepts
                          </button>
                        </div>
                      )}
                    </div>
                  )}
              </div>
            )}

            {/* Images Tab */}
            {activeTab === 'images' && (
              <div>
                {/* Show generating images state */}
                {showGeneratingImages && (
                  <div className="flex flex-col items-center justify-center py-10">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mb-4"></div>
                    <p className="text-gray-700 mb-2">Generating preview images...</p>
                    <p className="text-sm text-gray-500">This may take a moment</p>

                    {/* Progress indicator */}
                    {selectedTask.progress !== undefined && (
                      <div className="mt-4 w-64">
                        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1">
                          <div
                            className="bg-blue-600 h-2.5 rounded-full"
                            style={{ width: `${Math.round(selectedTask.progress * 100)}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-500 text-center">
                          {Math.round(selectedTask.progress * 100)}% - {selectedTask.current_step || 'Processing'}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Show images for review */}
                {showImageReview && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-medium text-gray-900">Preview Images</h3>

                      <button
                        onClick={handleRefreshImages}
                        disabled={refreshingImages}
                        className="flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-md text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                      >
                        {refreshingImages ? (
                          <>
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            <span>Refreshing...</span>
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-4 w-4" />
                            <span>Refresh</span>
                          </>
                        )}
                      </button>
                    </div>

                    <p className="text-sm text-gray-600">
                      Select which images you like for inspiring the video generation. You can select multiple options.
                    </p>

                    {/* Image grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {selectedTask.preview_image_urls?.map((image, idx) => (
                        <div
                          key={idx}
                          className={`border rounded-lg overflow-hidden relative cursor-pointer ${selectedImages.has(idx) ? 'ring-2 ring-blue-500' : ''
                            }`}
                          onClick={() => handleImageSelect(idx)}
                        >
                          <img
                            src={image.url}
                            alt={`Preview ${idx + 1}`}
                            className="w-full h-48 object-cover"
                          />

                          {/* Show feedback badge if applicable */}
                          {image.feedback_based === "true" && (
                            <div className="absolute top-2 left-2">
                              <div className="bg-purple-500 text-white text-xs rounded-full px-2 py-1">
                                Regenerated
                              </div>
                            </div>
                          )}

                          {/* Selection indicator */}
                          {selectedImages.has(idx) && (
                            <div className="absolute top-2 right-2">
                              <div className="bg-blue-500 text-white rounded-full p-1">
                                <CheckCircle2 className="h-5 w-5" />
                              </div>
                            </div>
                          )}

                          <div className="p-3">
                            <h5 className="font-medium">{image.style || `Image ${idx + 1}`}</h5>
                            {image.description && (
                              <p className="text-sm text-gray-600 mt-1 line-clamp-3" title={image.description}>
                                {image.description}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Feedback form - ONLY show when status is images_ready */}
                    {selectedTask.status === 'images_ready' && (
                      <div className="mt-6 border rounded-lg p-4 bg-blue-50">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="text-md font-semibold text-blue-900">Images Ready for Review</h4>
                          <span className="px-2 py-1 bg-cyan-100 text-cyan-800 text-xs font-medium rounded-full">
                            Needs Approval
                          </span>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Feedback on Images (optional)
                          </label>
                          <textarea
                            value={imageFeedback}
                            onChange={(e) => setImageFeedback(e.target.value)}
                            placeholder="Add any specific feedback about the images you like or suggest changes..."
                            rows={3}
                            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        <div className="mt-4 flex flex-wrap gap-3">
                          <button
                            onClick={handleProvideImageFeedback}
                            disabled={imageFeedback.trim() === '' && selectedImages.size === 0 || isProvidingImageFeedback}
                            className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
                          >
                            {isProvidingImageFeedback ? (
                              <>
                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Submitting...
                              </>
                            ) : (
                              <>
                                <RefreshCw className="h-4 w-4" />
                                Regenerate Images
                              </>
                            )}
                          </button>

                          <button
                            onClick={handleAcceptImages}
                            disabled={isAcceptingImages}
                            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
                          >
                            {isAcceptingImages ? (
                              <>
                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Accepting...
                              </>
                            ) : (
                              <>
                                <ThumbsUp className="h-4 w-4" />
                                Accept & Continue
                              </>
                            )}
                          </button>
                        </div>

                        {selectedImages.size === 0 && imageFeedback && (
                          <div className="mt-2 text-sm text-amber-600">
                            Please select at least one image if you want to regenerate images with your feedback.
                          </div>
                        )}

                        {/* Explanation of actions */}
                        <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded-md mt-3">
                          <p className="font-medium">What happens next?</p>
                          <ul className="list-disc ml-4 mt-1">
                            <li>Regenerate: Select images and provide feedback to get new versions (requires selection)</li>
                            <li>Accept & Continue: Proceed to video generation with current images</li>
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* No images yet state */}
                {!showGeneratingImages && !showImageReview && (
                  <div className="text-center py-8">
                    <div className="bg-gray-100 rounded-lg p-8 max-w-md mx-auto">
                      <Image className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Preview Images Yet</h3>
                      <p className="text-gray-600 mb-4">
                        First, approve your announcement to generate preview images for your event.
                      </p>
                      <button
                        onClick={() => setActiveTab('announcement')}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                      >
                        Switch to Announcement
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Video Tab */}
            {activeTab === 'video' && (
              <div>
                {/* Add this condition to show a loading state during prompt generation */}
                {selectedTask.status === 'generating_prompts' && (
                  <div className="flex flex-col items-center justify-center py-10">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mb-4"></div>
                    <p className="text-gray-700 mb-2">Generating video concepts...</p>
                    <p className="text-sm text-gray-500">This may take a moment</p>

                    {/* Progress indicator */}
                    {selectedTask.progress !== undefined && (
                      <div className="mt-4 w-64">
                        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1">
                          <div
                            className="bg-blue-600 h-2.5 rounded-full"
                            style={{ width: `${Math.round(selectedTask.progress * 100)}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-500 text-center">
                          {Math.round(selectedTask.progress * 100)}% - {selectedTask.current_step || 'Processing'}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Show video generation error if in that state */}
                {isVideoGenerationError && (
                  <div className="rounded-md bg-red-50 p-4 mb-6">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800">Error generating videos</h3>
                        <div className="mt-2 text-sm text-red-700">
                          <p>{selectedTask.error || "Unknown error generating videos"}</p>
                        </div>
                        <div className="mt-2">
                          <button
                            onClick={() => setActiveTab('announcement')}
                            className="text-sm text-blue-600 hover:text-blue-800"
                          >
                            View announcement
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Video prompt display */}
                {selectedTask.video_prompts && selectedTask.video_prompts.length > 0 ? (
                  <div className="space-y-6">
                    <h3 className="text-lg font-medium text-gray-900">Video Concepts</h3>

                    {/* Video prompt cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {selectedTask.video_prompts.map((prompt, index) => (
                        <div key={index} className="border rounded-lg p-4 bg-gray-50">
                          <h4 className="font-medium text-gray-900">Concept {index + 1}</h4>

                          <div className="mt-2 space-y-2 text-sm">
                            <div>
                              <span className="font-medium">Symbol:</span> {prompt.visual_symbol}
                            </div>
                            <div>
                              <span className="font-medium">Movement:</span> {prompt.movement}
                            </div>
                            <div>
                              <span className="font-medium">Style:</span> {prompt.style}
                            </div>
                            <div>
                              <span className="font-medium">Meaning:</span> {prompt.meaning}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Generate videos button (only show when prompts exist but no videos yet) */}
                    {selectedTask.status === 'prompts_generated' && (
                      <div className="mt-4 flex justify-center">
                        <button
                          onClick={handleGenerateVideos}
                          disabled={isLoadingVideos}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-green-300 flex items-center gap-1"
                        >
                          {isLoadingVideos ? (
                            <>
                              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                              Generating Videos...
                            </>
                          ) : (
                            <>
                              <FileVideo className="h-4 w-4" />
                              Generate Videos
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {/* Videos display (when available) */}
                    {selectedTask.video_urls && selectedTask.video_urls.length > 0 && (
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Generated Videos</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {selectedTask.video_urls.map((url, index) => (
                            <div key={`video-${index}-${videoKey}`} className="border rounded-lg overflow-hidden">
                              <video
                                controls
                                className="w-full h-auto"
                                poster="/video-poster.png"
                                key={`video-player-${index}-${videoKey}`}
                              >
                                <source src={`${url}${url.includes('?') ? '&' : '?'}t=${videoKey}`} type="video/mp4" />
                                Your browser does not support the video tag.
                              </video>
                              <div className="p-3">
                                <h5 className="font-medium">Video {index + 1}</h5>
                                <div className="mt-2 flex justify-between">
                                  <a
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline text-sm"
                                  >
                                    Open in New Tab
                                  </a>
                                  <a
                                    href={url}
                                    download={`video-${index + 1}.mp4`}
                                    className="text-blue-600 hover:underline text-sm"
                                  >
                                    Download
                                  </a>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : selectedTask.status === 'generating_videos' ? (
                  <div className="flex flex-col items-center justify-center py-10">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mb-4"></div>
                    <p className="text-gray-700 mb-2">Generating videos...</p>
                    <p className="text-sm text-gray-500">This may take a few minutes</p>

                    {/* Progress bar */}
                    {selectedTask.progress !== undefined && (
                      <div className="mt-4 w-64">
                        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1">
                          <div
                            className="bg-blue-600 h-2.5 rounded-full"
                            style={{ width: `${Math.round(selectedTask.progress * 100)}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-500 text-center">
                          {Math.round(selectedTask.progress * 100)}% - {selectedTask.current_step || 'Processing'}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="bg-gray-100 rounded-lg p-8 max-w-md mx-auto">
                      <Video className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Video Prompts Yet</h3>
                      <p className="text-gray-600 mb-4">
                        First, refine and approve your announcement, then review preview images to generate video concepts.
                      </p>
                      <button
                        onClick={() => {
                          if (showImageReview) {
                            setActiveTab('images');
                          } else {
                            setActiveTab('announcement');
                          }
                        }}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                      >
                        {showImageReview ? 'Review Images' : 'Switch to Announcement'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Conversation History</h3>

                {hasHistory ? (
                  <div className="border rounded-lg p-4">
                    <div className="space-y-6">
                      {conversationHistory.map((msg, index) => (
                        <div
                          key={`msg-${index}`}
                          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] px-4 py-2 rounded-lg ${msg.role === 'user'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-900'
                              }`}
                          >
                            <div className="text-xs mb-1 opacity-75">
                              {msg.role === 'user' ? 'You' : 'Assistant'}
                            </div>
                            <MessageContent message={msg} onImageClick={() => { }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="bg-gray-100 rounded-lg p-8 max-w-md mx-auto">
                      <History className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Conversation History</h3>
                      <p className="text-gray-600">
                        When you interact with the assistant, your conversation will appear here.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t p-4 flex justify-end">
            <Dialog.Close asChild>
              <button
                type="button"
                className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
              >
                Close
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}