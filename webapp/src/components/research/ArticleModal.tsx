import { useRef, useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, RefreshCw, Download, ExternalLink, ThumbsUp, ThumbsDown, FileText, Printer, Settings, Check, Sparkles } from 'lucide-react';
import { ResearchStatusResponse, ResearchOutlineResponse, ResearchStatus, PromptConfig } from '@/types/research';
import { MessageContent } from '@/components/chat/MessageList/MessageContent';
import { cn } from '@/lib/utils';
import { useResearch } from '@/hooks/useResearch';
import ReactDOMServer from 'react-dom/server';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { UserPromptsResponse } from '@/types/research'

interface ArticleModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: ResearchStatusResponse;
  outline: ResearchOutlineResponse | null;
  articleContent: string | null;
  isLoadingArticle: boolean;
  onAcceptOutline: (feedbackText?: string) => void;
  onRejectOutline: (feedbackText?: string) => void;
  onRefreshStatus: () => void;
  setActiveTab?: (tab: 'article' | 'outline' | 'prompts') => void;
  activeTab: 'article' | 'outline' | 'prompts';
}

const defaultPromptConfig: PromptConfig = {
  report_structure: "The article should be organized as follows:\n1. Introduction - Introduce the topic and its significance\n2. Background - Provide necessary context and history\n3. Main Concepts - Explain core ideas and principles\n4. Current State - Discuss current developments and applications\n5. Future Implications - Explore potential future developments\n6. Conclusion - Summarize key points and final thoughts",
  outline_generator_system_prompt: "You are an expert research assistant. Your task is to create a well-structured outline for an in-depth article on a given topic. Focus on creating a logical flow of sections that will help the reader understand the topic comprehensively.",
  section_writer_instructions: "You are an expert content writer creating a section of a detailed article. Write a comprehensive and engaging section on {section_title} that covers {section_topic}. Use the following information as a reference: {context}",
  section_grader_instructions: "You are a quality control expert reviewing article content. Evaluate the following section on {section_topic} and determine if it is comprehensive, accurate, and well-written.",
  query_writer_instructions: "You are a research expert. Generate {number_of_queries} highly specific and effective search queries to gather comprehensive information about {section_topic}.",
  initial_research_system_prompt: "You are a research expert tasked with creating search queries for a comprehensive article on {topic}. The article will follow this organization: {article_organization}",
  final_section_writer_instructions: "You are an expert content writer creating the concluding section of a detailed article. Write a comprehensive and engaging conclusion for a section titled {section_title}."
};

export function ArticleModal({
  isOpen,
  onClose,
  task,
  outline,
  articleContent,
  isLoadingArticle,
  onAcceptOutline,
  onRejectOutline,
  onRefreshStatus,
  activeTab,
  setActiveTab
}: ArticleModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [localActiveTab, setLocalActiveTab] = useState<'article' | 'outline' | 'prompts'>('article');
  const [feedbackText, setFeedbackText] = useState<string>('');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isPdfLoading, setIsPdfLoading] = useState<boolean>(false);
  const [pdfFormat, setPdfFormat] = useState<'pdf' | 'html'>('pdf');
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const { getResearchPdf, refreshURLs, getUserPrompts, updatePrompts } = useResearch();
  const articleContainerRef = useRef<HTMLDivElement>(null);
  const [isEditingPrompts, setIsEditingPrompts] = useState<boolean>(false);
  const [promptConfig, setPromptConfig] = useState<PromptConfig>({ ...defaultPromptConfig });
  const [originalPromptConfig, setOriginalPromptConfig] = useState<PromptConfig>({ ...defaultPromptConfig });
  const [activePromptTab, setActivePromptTab] = useState<string>('report_structure');
  const [isTestingPrompt, setIsTestingPrompt] = useState<boolean>(false);
  const [testOutput, setTestOutput] = useState<string>('');
  const [isSavingPrompts, setIsSavingPrompts] = useState<boolean>(false);
  const [testInput, setTestInput] = useState<string>('');

  // Use setActiveTab from props if provided, otherwise use local state
  const handleTabChange = (tab: 'article' | 'outline' | 'prompts') => {
    if (setActiveTab) {
      setActiveTab(tab);
    } else {
      setLocalActiveTab(tab);
    }
  };

  // Use activeTab from props if provided, otherwise use local state
  const currentActiveTab = setActiveTab ? activeTab : localActiveTab;

  // Logic to determine what content to display based on task status
  const showOutlineFeedbackControls = ['outline_ready', 'feedback_needed'].includes(task.status);
  const showGeneratingIndicator = task.status === 'generating';
  const showCompletedArticle = task.status === 'completed';
  const showErrorMessage = task.status === 'error';
  const showRejectedMessage = task.status === 'rejected';
  const showRegeneratingOutlineIndicator = task.status === 'regenerating_outline';
  const showRegeneratingIndicator = task.status === 'regenerating';
  const showPromptsUpdatedIndicator = task.status === 'prompts_updated';
  const needsOutlineRegeneration = (status: ResearchStatus): boolean => {
    return ['prompts_updated'].includes(status);
  };
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(false);
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

  // Define prompt types with readable labels and descriptions
  const promptTypes = [
    {
      id: 'report_structure',
      label: 'Article Structure',
      description: 'Define the overall structure and organization of the article'
    },
    {
      id: 'outline_generator_system_prompt',
      label: 'Outline Generator',
      description: 'System prompt for generating the article outline'
    },
    {
      id: 'section_writer_instructions',
      label: 'Section Writer',
      description: 'Instructions for writing article sections'
    },
    {
      id: 'section_grader_instructions',
      label: 'Section Grader',
      description: 'Instructions for grading section quality and suggesting improvements'
    },
    {
      id: 'query_writer_instructions',
      label: 'Query Writer',
      description: 'Instructions for generating search queries for research'
    },
    {
      id: 'initial_research_system_prompt',
      label: 'Initial Research',
      description: 'System prompt for initial topic research'
    },
    {
      id: 'final_section_writer_instructions',
      label: 'Final Section Writer',
      description: 'Instructions for writing concluding sections'
    }
  ];

  const PromptsUpdatedAlert = ({
    onRegenerate
  }: {
    onRegenerate: () => void
  }) => {
    return (
      <div className="rounded-md bg-indigo-50 p-4 mb-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <Settings className="h-5 w-5 text-indigo-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-indigo-800">
              Prompts Updated - Action Required
            </h3>
            <div className="mt-2 text-sm text-indigo-700">
              <p>
                The prompts have been updated. The outline needs to be regenerated
                with the new instructions.
              </p>
              <div className="mt-3">
                <button
                  onClick={onRegenerate}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent 
                           text-xs font-medium rounded-md text-indigo-700 bg-indigo-100 
                           hover:bg-indigo-200 focus:outline-none focus:ring-2 
                           focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Regenerate Outline
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // If we're in outline_ready or feedback_needed stage, show outline tab by default
  useEffect(() => {
    if (showOutlineFeedbackControls) {
      handleTabChange('outline');
    } else {
      handleTabChange('article');
    }
  }, [showOutlineFeedbackControls]);

  const loadTaskPrompts = async () => {
    if (!task.task_id) return;

    setIsLoadingPrompts(true);
    try {
      const response = await getUserPrompts(task.task_id);

      if (response.prompts) {
        setPromptConfig({
          ...defaultPromptConfig,
          ...response.prompts
        });
        setOriginalPromptConfig({
          ...defaultPromptConfig,
          ...response.prompts
        });

        // If there's a last_updated timestamp, you can use it
        if (response.prompts.last_updated) {
          // Optional: You could store this or show it in the UI
          console.log(`Prompts last updated: ${new Date(response.prompts.last_updated * 1000).toLocaleString()}`);
        }
      }
    } catch (error) {
      console.error("Failed to load task prompts:", error);
      setPromptConfig(defaultPromptConfig);
      setOriginalPromptConfig(defaultPromptConfig);
    } finally {
      setIsLoadingPrompts(false);
    }
  };

  // Load existing prompts if available
  useEffect(() => {
    if (isOpen && currentActiveTab === 'prompts') {
      loadTaskPrompts();
    }

    // Cleanup function
    return () => {
      // Reset states when modal closes
      if (!isOpen) {
        setPromptConfig({ ...defaultPromptConfig });
        setOriginalPromptConfig({ ...defaultPromptConfig });
      }
    };
  }, [isOpen, currentActiveTab, task.task_id]);

  // Auto-scroll to top when article content changes
  useEffect(() => {
    if (isOpen && articleContent) {
      if (articleContainerRef.current) {
        setTimeout(() => {
          if (articleContainerRef.current) {
            articleContainerRef.current.scrollTop = 0;
          }
        }, 100);
      }
    }
  }, [isOpen, articleContent]);

  useEffect(() => {
    if (task.prompt_config) {
      // Initialize with both default and task-specific prompts
      setPromptConfig(prev => ({
        ...defaultPromptConfig,
        ...task.prompt_config,
        ...prev  // Keep any unsaved changes
      }));
    }
  }, [task.prompt_config]);

  useEffect(() => {
    if (task.pdf_url) {
      setPdfUrl(task.pdf_url);

      // Determine format based on URL or explicit format info
      if (task.pdf_url.toLowerCase().endsWith('.html')) {
        setPdfFormat('html');
      } else {
        setPdfFormat('pdf');
      }
    } else {
      setPdfUrl(null);
    }
  }, [task.pdf_url]);

  const handleRefreshStatus = async () => {
    try {
      await refreshURLs(task.task_id);
      await onRefreshStatus();
    } catch (error) {
      console.error("Error refreshing status:", error);
    }
  };

  const handleSavePrompts = async () => {
    if (!task.task_id) return;

    setIsSavingPrompts(true);

    try {
      // Filter out any prompt fields that haven't changed
      const changedPrompts: PromptConfig = {};
      let hasChanges = false;

      Object.keys(promptConfig).forEach(key => {
        const typedKey = key as keyof PromptConfig;
        if (promptConfig[typedKey] !== originalPromptConfig[typedKey]) {
          changedPrompts[typedKey] = promptConfig[typedKey];
          hasChanges = true;
        }
      });

      // Only update if there are changes
      if (hasChanges) {
        const response = await updatePrompts(task.task_id, {
          prompt_config: changedPrompts
        });

        // Update original prompt config to reflect saved state
        setOriginalPromptConfig(prev => ({
          ...prev,
          ...changedPrompts
        }));

        // Exit editing mode
        setIsEditingPrompts(false);

        // Refresh the task status to show updated prompts
        await onRefreshStatus();

        // If we're not in a completed state, show a message about regeneration
        if (task.status !== 'completed') {
          handleTabChange('article');
        }
      } else {
        // If no changes, just exit editing mode
        setIsEditingPrompts(false);
      }
    } catch (error) {
      console.error("Error saving prompts:", error);
    } finally {
      setIsSavingPrompts(false);
    }
  };

  const handlePromptChange = (promptType: keyof PromptConfig, value: string) => {
    setPromptConfig(prevConfig => ({
      ...prevConfig,
      [promptType]: value
    }));
  };

  const handleGetPdf = async () => {
    if (task.pdf_url) {
      // If we already have the PDF URL, just open it
      window.open(task.pdf_url, '_blank');
      return;
    }

    if (!task.task_id || task.status !== 'completed') {
      return;
    }

    setIsPdfLoading(true);

    try {
      const result = await getResearchPdf(task.task_id);
      setPdfUrl(result.pdf_url);
      setPdfFormat(result.format);

      // Open the PDF in a new tab
      window.open(result.pdf_url, '_blank');
    } catch (error) {
      console.error('Error getting PDF:', error);
    } finally {
      setIsPdfLoading(false);
    }
  };

  const handlePrint = () => {
    if (!articleContent) return;

    setIsPrinting(true);

    // Create a new window for printing
    const printWindow = window.open('', '_blank');

    if (!printWindow) {
      alert("Please allow pop-ups to print the article");
      setIsPrinting(false);
      return;
    }

    const title = outline?.title || task.outline?.title || 'Research Article';

    // Render markdown content to HTML
    const markdownHtml = ReactDOMServer.renderToString(
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        className="markdown-body"
      >
        {articleContent}
      </ReactMarkdown>
    );

    // Build the content to print
    let printContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>${title}</title>
        <style>
          /* GitHub-like markdown styling */
          .markdown-body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
            font-size: 16px;
            line-height: 1.6;
            word-wrap: break-word;
            padding: 20px 0;
            max-width: 800px;
            margin: 0 auto;
          }
          .markdown-body h1, .markdown-body h2, .markdown-body h3,
          .markdown-body h4, .markdown-body h5, .markdown-body h6 {
            margin-top: 24px;
            margin-bottom: 16px;
            font-weight: 600;
            line-height: 1.25;
          }
          .markdown-body h1 { font-size: 2em; margin-top: 0; }
          .markdown-body h2 { font-size: 1.5em; }
          .markdown-body h3 { font-size: 1.25em; }
          .markdown-body h4 { font-size: 1em; }
          .markdown-body h5 { font-size: 0.875em; }
          .markdown-body h6 { font-size: 0.85em; }
          
          .markdown-body p, .markdown-body blockquote, .markdown-body ul,
          .markdown-body ol, .markdown-body dl, .markdown-body table,
          .markdown-body pre {
            margin-top: 0;
            margin-bottom: 16px;
          }
          
          .markdown-body code {
            font-family: SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace;
            font-size: 85%;
            padding: 0.2em 0.4em;
            margin: 0;
            background-color: rgba(27, 31, 35, 0.05);
            border-radius: 3px;
          }
          
          .markdown-body pre {
            word-wrap: normal;
            padding: 16px;
            overflow: auto;
            font-size: 85%;
            line-height: 1.45;
            background-color: #f6f8fa;
            border-radius: 3px;
          }
          
          .markdown-body pre code {
            background-color: transparent;
            padding: 0;
          }
          
          .markdown-body blockquote {
            padding: 0 1em;
            color: #6a737d;
            border-left: 0.25em solid #dfe2e5;
          }
          
          .markdown-body ul, .markdown-body ol {
            padding-left: 2em;
          }
          
          .markdown-body table {
            border-collapse: collapse;
            width: 100%;
            overflow: auto;
          }
          
          .markdown-body table th, .markdown-body table td {
            padding: 6px 13px;
            border: 1px solid #dfe2e5;
          }
          
          .markdown-body table tr {
            background-color: #fff;
            border-top: 1px solid #c6cbd1;
          }
          
          .markdown-body table tr:nth-child(2n) {
            background-color: #f6f8fa;
          }
          
          .markdown-body img {
            max-width: 100%;
            box-sizing: border-box;
            background-color: #fff;
          }
          
          .article-header {
            text-align: center;
            margin-bottom: 24px;
          }
          
          .article-metadata {
            color: #6a737d;
            font-size: 14px;
            margin-bottom: 16px;
          }
          
          .header-image {
            max-width: 100%;
            max-height: 400px;
            display: block;
            margin: 0 auto 24px;
            border-radius: 4px;
          }
          
          @media print {
            body {
              font-size: 12pt;
              color: #000;
              background: #fff;
            }
            a { text-decoration: none; color: #000; }
            .markdown-body pre, .markdown-body code {
              font-size: 11pt;
              background-color: #f8f8f8 !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .markdown-body blockquote {
              border-left-color: #ccc !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .markdown-body table th, .markdown-body table td {
              border-color: #ddd !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
        </style>
      </head>
      <body>
        <div class="article-header">
          <h1>${title}</h1>
          <div class="article-metadata">
            Generated: ${new Date().toLocaleString()}
          </div>
        </div>
    `;

    // Add header image if available
    if (task.image_url) {
      printContent += `<img src="${task.image_url}" alt="Article header image" class="header-image">`;
    }

    // Add article content with markdown rendering
    printContent += markdownHtml;

    printContent += `
      </body>
      </html>
    `;

    // Write to the new window and trigger print
    printWindow.document.open();
    printWindow.document.write(printContent);
    printWindow.document.close();

    // Wait for images to load before printing
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        setIsPrinting(false);
        // Don't close the window immediately to allow the print dialog to appear
        // printWindow.close();
      }, 500);
    };
  };

  // Create a message object for MessageContent component
  const articleMessage = articleContent ? {
    id: 'article-content',
    role: 'assistant',
    content: articleContent,
    createdAt: new Date().toISOString(),
    type: 'text'
  } : null;

  // Placeholder for image gallery handling
  const handleImageClick = (images: string[], startIndex: number) => {
    // This would typically open a lightbox or image gallery
    console.log('Image clicked:', { images, startIndex });
  };

  // Format a prompt ID into readable label
  const formatPromptLabel = (id: string): string => {
    return id.split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Render the prompt editor section
  const renderPromptEditor = () => {
    return (
      <div className="mt-4">
        {/* Show status message when prompts have been updated */}
        {task.status === 'prompts_updated' && (
          <div className="mb-4 rounded-md bg-yellow-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <Settings className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Prompts Updated - Pending Regeneration
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>
                    These prompts have been saved but haven't been applied yet.
                    The outline needs to be regenerated to use the new instructions.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Customize AI Prompts</h3>

          {!isEditingPrompts ? (
            <button
              onClick={() => setIsEditingPrompts(true)}
              className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-1"
            >
              <Settings className="h-4 w-4" />
              Edit Prompts
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setPromptConfig({ ...originalPromptConfig });
                  setIsEditingPrompts(false);
                }}
                className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 flex items-center gap-1"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>

              <button
                onClick={handleSavePrompts}
                disabled={isSavingPrompts}
                className={`px-3 py-1 ${isSavingPrompts ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'} text-white rounded-md flex items-center gap-1`}
              >
                {isSavingPrompts ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        <div className="bg-gray-50 p-4 rounded-md mb-4">
          <p className="text-sm text-gray-700">
            Customize the AI prompts used for different parts of the research and article generation process.
            This allows you to control how the AI approaches your specific topic.
          </p>

          {task.status === 'completed' && (
            <p className="text-sm text-yellow-600 mt-2">
              <strong>Note:</strong> This task is already completed. Prompt changes will only affect regeneration or new tasks.
            </p>
          )}
        </div>

        {/* Custom tabs for different prompt types */}
        <div className="border-b border-gray-200 mb-4 overflow-x-auto whitespace-nowrap">
          <div className="flex">
            {promptTypes.map(prompt => (
              <button
                key={prompt.id}
                onClick={() => setActivePromptTab(prompt.id)}
                className={`px-3 py-2 font-medium text-sm border-b-2 ${activePromptTab === prompt.id ?
                  'border-blue-500 text-blue-600' :
                  'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                {prompt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Prompt type content - show only the active one */}
        {promptTypes.map(prompt => (
          <div
            key={prompt.id}
            className={activePromptTab === prompt.id ? 'block' : 'hidden'}
          >
            <div className="mb-2">
              <div className="flex justify-between items-center">
                <h4 className="text-md font-medium text-gray-800">{prompt.label}</h4>
                <span className="text-xs text-gray-500">{isEditingPrompts ? 'Editing' : 'View only'}</span>
              </div>
              <p className="text-xs text-gray-500 mb-2">{prompt.description}</p>
            </div>

            <div className="relative">
              <textarea
                value={promptConfig[prompt.id as keyof PromptConfig] ?? ''} // Add null coalescing
                onChange={(e) => {
                  const newValue = e.target.value;
                  setPromptConfig(prev => ({
                    ...prev,
                    [prompt.id]: newValue
                  }));
                }}
                disabled={!isEditingPrompts}
                rows={prompt.id === 'report_structure' ? 8 : 10}
                className={`w-full p-3 border rounded-md font-mono text-sm ${isEditingPrompts
                  ? 'bg-white border-blue-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                  : 'bg-gray-50 text-gray-700'
                  }`}
                placeholder={
                  prompt.id === 'report_structure'
                    ? "1. Section Name - Section purpose\n2. Section Name - Section purpose\n..."
                    : `Enter ${prompt.label.toLowerCase()} prompt here...`
                }
              />
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/25 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />

        <Dialog.Content
          className="fixed left-[50%] top-[50%] max-h-[85vh] w-[90vw] max-w-4xl translate-x-[-50%] translate-y-[-50%] overflow-y-auto rounded-lg bg-white p-6 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]"
        >
          <div className="flex justify-between items-center border-b pb-2">
            <Dialog.Title className="text-lg font-medium text-gray-900">
              <div>
                {outline?.title || task.outline?.title || 'Research Task'}
                <div className="text-sm text-gray-500">
                  {task.task_id}
                  <span className="ml-2 text-xs">
                    {task.created_at ? new Date(
                      typeof task.created_at === 'number' ? task.created_at * 1000 : task.created_at
                    ).toLocaleString() : 'No date available'}
                  </span>
                </div>
              </div>
            </Dialog.Title>

            <div className="flex items-center gap-2">
              {/* Refresh button */}
              <button
                onClick={handleRefreshStatus}
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
          <div className="mt-2 flex items-center">
            <span className="mr-2 text-sm text-gray-500">Status:</span>
            <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full 
              ${statusLabels[task.status as ResearchStatus]?.color || 'bg-gray-100 text-gray-800'}`}
            >
              {statusLabels[task.status as ResearchStatus]?.label || task.status}
            </span>

            {/* Show current step if available */}
            {task.current_step && (
              <span className="ml-2 text-xs text-gray-500">
                {task.current_step}
              </span>
            )}

            {/* Show progress if available */}
            {task.progress !== undefined && (
              <div className="ml-3 flex items-center space-x-1">
                <div className="w-20 bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-blue-600 h-1.5 rounded-full"
                    style={{ width: `${Math.round(task.progress * 100)}%` }}
                  ></div>
                </div>
                <span className="text-xs text-gray-500">
                  {Math.round(task.progress * 100)}%
                </span>
              </div>
            )}
          </div>

          {/* Tabs for article/outline/prompts */}
          <div className="flex border-b mt-4 overflow-x-auto">
            <button
              onClick={() => handleTabChange('article')}
              className={`px-4 py-2 font-medium text-sm whitespace-nowrap ${currentActiveTab === 'article' ?
                'text-blue-600 border-b-2 border-blue-600' :
                'text-gray-500 hover:text-gray-700'}`}
            >
              Article
            </button>
            <button
              onClick={() => handleTabChange('outline')}
              className={`px-4 py-2 font-medium text-sm whitespace-nowrap ${currentActiveTab === 'outline' ?
                'text-blue-600 border-b-2 border-blue-600' :
                'text-gray-500 hover:text-gray-700'}`}
            >
              Outline
            </button>
            <button
              onClick={() => handleTabChange('prompts')}
              className={`px-4 py-2 font-medium text-sm whitespace-nowrap flex items-center ${currentActiveTab === 'prompts' ?
                'text-blue-600 border-b-2 border-blue-600' :
                'text-gray-500 hover:text-gray-700'}`}
            >
              <Settings className="h-3 w-3 mr-1" />
              Prompts
            </button>
          </div>

          {/* Main content area */}
          <div className="mt-4">
            {/* Show error message if present */}
            {showErrorMessage && (
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
                      <p>{task.error || "Unknown error generating article"}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Show rejected message */}
            {showRejectedMessage && (
              <div className="rounded-md bg-red-50 p-4 mb-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <ThumbsDown className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Outline Rejected</h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>The proposed outline was rejected. You may start a new research task.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Show prompts updated message */}
            {showPromptsUpdatedIndicator && (
              <div className="rounded-md bg-blue-50 p-4 mb-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <Settings className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">Prompts Updated</h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <p>Prompts have been updated. The system will use these new instructions when generating the article.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {/* Show prompts updated message with regeneration option */}
            {needsOutlineRegeneration(task.status) && (
              <PromptsUpdatedAlert
                onRegenerate={() => {
                  // Call the accept feedback handler with no feedback to regenerate
                  onRejectOutline();
                }}
              />
            )}

            {/* Show outline content if selected */}
            {currentActiveTab === 'outline' && (outline || task.outline) && (
              <div>
                <h4 className="text-md font-semibold mb-2">Article Outline</h4>
                <div className="border rounded-md p-4 bg-gray-50 mb-4">
                  <h3 className="font-semibold text-lg mb-2">
                    {outline?.title || task.outline?.title || "Untitled Research"}
                  </h3>
                  <ol className="list-decimal ml-5 space-y-1">
                    {(outline?.sections || task.outline?.sections || []).map((section, index) => (
                      <li key={index} className="text-gray-700">
                        {section.name}
                        {section.summary && (
                          <div className="ml-2 text-sm text-gray-500 mt-1">
                            {section.summary}
                          </div>
                        )}
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Feedback controls for outline - Make sure this is visible when status is outline_ready */}
                {showOutlineFeedbackControls && (
                  <div className="mt-4 space-y-4">
                    {/* Optional feedback textarea */}
                    <div>
                      <label htmlFor="feedback" className="block text-sm font-medium text-gray-700 mb-1">
                        Feedback (optional)
                      </label>
                      <textarea
                        id="feedback"
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                        placeholder="Add any specific feedback or revision requests..."
                        rows={3}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    {/* Action buttons with clearer labels */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={() => {
                          // Disable button clicks during loading
                          if (isLoadingArticle) return;
                          onAcceptOutline(feedbackText);
                        }}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        disabled={isLoadingArticle}
                      >
                        {isLoadingArticle ? (
                          <>
                            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Processing...</span>
                          </>
                        ) : (
                          <>
                            <ThumbsUp className="h-4 w-4" />
                            Accept Outline & Generate Article
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => {
                          // Disable button clicks during loading
                          if (isLoadingArticle) return;
                          onRejectOutline(feedbackText);
                        }}
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        disabled={isLoadingArticle}
                      >
                        {isLoadingArticle ? (
                          <>
                            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Processing...</span>
                          </>
                        ) : (
                          <>
                            <ThumbsDown className="h-4 w-4" />
                            Reject Outline
                          </>
                        )}
                      </button>
                    </div>

                    {/* Explanation of actions */}
                    <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded-md">
                      <p className="font-medium">What happens next?</p>
                      <ul className="list-disc ml-4 mt-1">
                        <li>Accept: The system will generate a full article based on this outline</li>
                        <li>Reject: The outline will be discarded and marked as rejected</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Show article content if selected */}
            {currentActiveTab === 'article' && (
              <div>
                {/* Show generating indicator */}
                {showGeneratingIndicator && (
                  <div className="flex flex-col items-center justify-center py-10">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mb-4"></div>
                    <p className="text-gray-700 mb-2">Generating article...</p>
                    <div className="w-64 bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-blue-600 h-2.5 rounded-full"
                        style={{ width: `${Math.round((task.progress || 0) * 100)}%` }}
                      ></div>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      {Math.round((task.progress || 0) * 100)}% - {task.current_step || 'Processing'}
                    </p>
                  </div>
                )}

                {/* Show loading indicator when fetching article */}
                {!showGeneratingIndicator && isLoadingArticle && (
                  <div className="flex flex-col items-center justify-center py-10">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mb-4"></div>
                    <p className="text-gray-700">Loading article content...</p>
                  </div>
                )}

                {/* Show completed article - Put image and content in the same scrollable container */}
                {showCompletedArticle && !isLoadingArticle && (
                  <div
                    className="overflow-y-auto max-h-[60vh] border rounded-md p-4 bg-white"
                    ref={articleContainerRef}
                  >
                    {/* Header image if available */}
                    {task.image_url && (
                      <div className="mb-4">
                        <img
                          src={task.image_url}
                          alt="Article header"
                          className="w-full h-auto max-h-80 object-cover rounded-lg"
                        />
                      </div>
                    )}

                    {/* Article content using MessageContent component */}
                    {articleContent ? (
                      <div id="article-content">
                        {articleMessage && (
                          <MessageContent
                            // @ts-ignore
                            message={articleMessage}
                            onImageClick={handleImageClick}
                          />
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-4">
                        <p className="text-gray-600 mb-4">Article content not available in preview</p>
                        {task.article_url && (
                          <a
                            href={task.article_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 flex items-center gap-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                          >
                            <ExternalLink className="h-4 w-4" />
                            View Full Article
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Show regenerating outline indicator */}
                {(showRegeneratingOutlineIndicator || showRegeneratingIndicator) && !isLoadingArticle && (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mb-4"></div>
                    <p className="text-gray-700 mb-2">
                      {showRegeneratingOutlineIndicator ? 'Regenerating outline...' : 'Regenerating content...'}
                    </p>
                    <div className="w-64 bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-blue-600 h-2.5 rounded-full"
                        style={{ width: `${Math.round((task.progress || 0) * 100)}%` }}
                      ></div>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      {Math.round((task.progress || 0) * 100)}% - {task.current_step || 'Processing'}
                    </p>
                    <p className="text-gray-500 text-sm mt-4 max-w-md">
                      {showRegeneratingOutlineIndicator ?
                        'Creating a new outline based on your feedback. This might take a moment...' :
                        'Regenerating the content with new approach. Please wait...'}
                    </p>
                  </div>
                )}

                {/* Show prompts updated waiting message */}
                {task.status === 'prompts_updated' && !isLoadingArticle && (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <Settings className="h-12 w-12 text-indigo-400 mb-3 animate-pulse" />
                    <p className="text-gray-700 font-medium">Prompts Have Been Updated</p>
                    <p className="text-gray-500 text-sm mt-2 max-w-md">
                      The AI prompts have been modified. The outline needs to be regenerated
                      with the new instructions before proceeding.
                    </p>
                    <button
                      onClick={() => onRejectOutline()}
                      className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md 
                   hover:bg-indigo-700 transition-colors flex items-center gap-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Regenerate Outline
                    </button>
                  </div>
                )}

                {/* Show waiting for outline feedback message when outline is ready but article tab is shown */}
                {(task.status === 'outline_ready' || task.status === 'feedback_needed') && !isLoadingArticle && currentActiveTab === 'article' && (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <svg className="h-12 w-12 text-yellow-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p className="text-gray-700 font-medium">Outline ready for review</p>
                    <p className="text-gray-500 text-sm mt-2">
                      Please switch to the <strong>Outline</strong> tab to review and provide feedback
                    </p>
                    <button
                      onClick={() => handleTabChange('outline')}
                      className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      Review Outline
                    </button>
                  </div>
                )}

                {/* Show waiting for outline message */}
                {task.status === 'started' && !isLoadingArticle && currentActiveTab === 'article' && (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <svg className="h-12 w-12 text-blue-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <p className="text-gray-700 font-medium">Researching your topic...</p>
                    <p className="text-gray-500 text-sm mt-2">
                      The system is researching your topic and developing an outline
                    </p>
                    <div className="mt-4 flex items-center justify-center">
                      <div className="animate-pulse flex space-x-1">
                        <div className="h-2 w-2 bg-blue-400 rounded-full"></div>
                        <div className="h-2 w-2 bg-blue-400 rounded-full"></div>
                        <div className="h-2 w-2 bg-blue-400 rounded-full"></div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Show rejected message in article tab too */}
                {task.status === 'rejected' && !isLoadingArticle && currentActiveTab === 'article' && (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <ThumbsDown className="h-12 w-12 text-red-400 mb-3" />
                    <p className="text-gray-700 font-medium">Outline was rejected</p>
                    <p className="text-gray-500 text-sm mt-2">
                      The outline for this task has been rejected. No article will be generated.
                    </p>
                    <p className="text-gray-500 text-sm mt-2">
                      You can start a new research task with refined topic and guidelines.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Show prompt editor if selected */}
            {currentActiveTab === 'prompts' && (
              <div>
                {isLoadingPrompts ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                    <span className="ml-3 text-gray-600">Loading prompts...</span>
                  </div>
                ) : (
                  renderPromptEditor()
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-6 flex justify-end items-center gap-3">
            {/* Print button - show when completed */}
            {showCompletedArticle && articleContent && (
              <button
                onClick={handlePrint}
                disabled={isPrinting}
                className={`inline-flex items-center gap-1 justify-center rounded-md ${isPrinting ? 'bg-gray-400' : 'bg-teal-600 hover:bg-teal-700'
                  } px-4 py-2 text-sm font-medium text-white focus:outline-none`}
              >
                {isPrinting ? (
                  <>
                    <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Printing...
                  </>
                ) : (
                  <>
                    <Printer className="h-4 w-4" />
                    Print Article
                  </>
                )}
              </button>
            )}

            {/* PDF download button - show when completed */}
            {showCompletedArticle && (
              <button
                onClick={handleGetPdf}
                disabled={isPdfLoading}
                className={`inline-flex items-center gap-1 justify-center rounded-md ${isPdfLoading ? 'bg-gray-400' : 'bg-purple-600 hover:bg-purple-700'
                  } px-4 py-2 text-sm font-medium text-white focus:outline-none`}
              >
                {isPdfLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading PDF...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4" />
                    {pdfUrl ? `Open ${pdfFormat?.toUpperCase() || 'PDF'}` : 'Download PDF'}
                  </>
                )}
              </button>
            )}

            {/* Article URL download button */}
            {showCompletedArticle && task.article_url && (
              <a
                href={task.article_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none"
                download
              >
                <Download className="h-4 w-4" />
                Download Markdown
              </a>
            )}

            {/* Image URL download button */}
            {showCompletedArticle && task.image_url && (
              <a
                href={task.image_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 justify-center rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 focus:outline-none"
                download
              >
                <Download className="h-4 w-4" />
                Download Image
              </a>
            )}

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