// src/components/MessageList/MessageContent.tsx
import React, { useMemo } from 'react';
import { Message } from '@/types/chat';
import { CategoryType } from '@/types/models';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { useState } from 'react';
import { IconChevronLeft, IconChevronDown } from '@tabler/icons-react';
import { IconCopy, IconCheck, IconFileText, IconFileWord, IconFile, IconFileTypography, IconLoader2, IconDownload } from '@tabler/icons-react';
import { useDownload } from '@/hooks/useDownload';
import type { Components } from 'react-markdown';
import { DocumentAttachmentMetadata } from '@/types/chat';
import { IconX, IconCode, IconExternalLink } from '@tabler/icons-react';

interface MessageContentProps {
    message: Message;
    onImageClick: (images: string[], startIndex: number) => void;
}

interface CodeBlockProps {
    node?: any;
    inline?: boolean;
    className?: string;
    children?: React.ReactNode;
}

// File list interfaces for knowledge base file operations
interface FileListItem {
    key: string;
    fileName: string;
    fileSize: number;
    lastModified: string;
    fileType?: string;
    isOriginal?: boolean;
    hasProcessedVersion?: boolean;
    processedFile?: {
        key: string;
        fileName: string;
        fileSize: number;
        lastModified: string;
        fileType: string;
    };
}

interface FileDownloadProps {
    file: FileListItem;
    onDownload: (fileKey: string, fileType: 'original' | 'processed', fileName: string) => void;
}

const CodeBlock: React.FC<CodeBlockProps> = ({
    inline,
    className,
    children,
    ...props
}) => {
    const match = /language-(\w+)/.exec(className || '');
    const language = match ? match[1] : '';

    if (!inline && match) {
        return (
            <div className="relative group">
                {/* @ts-ignore */}
                <SyntaxHighlighter
                    style={vscDarkPlus}
                    language={language}
                    PreTag="div"
                    customStyle={{
                        zIndex: 1,
                        background: 'var(--code-bg, #1e1e1e)'
                    }}
                    {...props}
                >
                    {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
                <CopyButton content={String(children)} />
            </div>
        );
    }

    return (
        <code className={`${className} bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm`} {...props}>
            {children}
        </code>
    );
};

const CopyButton: React.FC<{ content: string }> = ({ content }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(content);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy code:', err);
        }
    };

    return (
        <button
            onClick={handleCopy}
            className="absolute top-2 right-2 p-3 sm:p-2 rounded 
                     bg-gray-700 dark:bg-gray-600 text-white 
                     opacity-0 group-hover:opacity-100 transition-opacity 
                     touch-action-manipulation hover:bg-gray-600 dark:hover:bg-gray-500"
        >
            {copied ? 'Copied!' : 'Copy'}
        </button>
    );
};

const VideoContent: React.FC<{ content: string }> = ({ content }) => {
    try {
        const videoData = JSON.parse(content);
        if (videoData.type !== 'video') return null;

        if (videoData.status === 'processing') {
            return (
                <div className="p-4 bg-gray-100 rounded-lg">
                    <p>Video generation in progress...</p>
                    <p className="text-sm text-gray-500">Job ID: {videoData.jobId}</p>
                </div>
            );
        }

        return (
            <video
                controls
                className="w-full max-w-2xl rounded-lg shadow-lg"
                src={content}
            >
                Your browser does not support the video tag.
            </video>
        );
    } catch (e) {
        console.error('Error parsing video data:', e);
        return null;
    }
};

const ImageContent: React.FC<{
    imageData?: string[];
    content: string;
    onImageClick: (images: string[], startIndex: number) => void;
}> = ({ imageData, content, onImageClick }) => {
    const images = imageData || [content];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {images.map((imageUrl, index) => (
                <img
                    key={index}
                    src={imageUrl}
                    alt={`Generated ${index + 1}`}
                    className="max-w-full rounded-lg shadow-lg cursor-pointer"
                    onClick={() => onImageClick(images, index)}
                />
            ))}
        </div>
    );
};

// Helper function to get appropriate icon for file type
const getFileIcon = (fileType: string) => {
    switch (fileType.toLowerCase()) {
        case 'pdf':
            return <IconFileWord size={24} className="text-red-500 dark:text-red-400" />;
        case 'docx':
        case 'doc':
            return <IconFileTypography size={24} className="text-blue-500 dark:text-blue-400" />;
        case 'txt':
        case 'md':
        case 'markdown':
            return <IconFile size={24} className="text-gray-500 dark:text-gray-400" />;
        case 'json':
            return <IconFileText size={24} className="text-orange-500 dark:text-orange-400" />;
        case 'jpg':
        case 'jpeg':
        case 'png':
        case 'gif':
        case 'bmp':
        case 'tiff':
        case 'webp':
            return <IconFileText size={24} className="text-green-500 dark:text-green-400" />;
        default:
            return <IconFileText size={24} className="text-gray-500 dark:text-gray-400" />;
    }
};

// Helper function to format file size
const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " bytes";
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    else return (bytes / 1048576).toFixed(1) + " MB";
};

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
};

// Knowledge Base File Download Component
const FileDownloadSection: React.FC<FileDownloadProps> = ({ file, onDownload }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 mb-4 
                        bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                            {getFileIcon(file.fileType || 'file')}
                        </div>
                    </div>
                    <div>
                        <h4 className="font-medium text-gray-900 dark:text-gray-100">
                            {file.fileName}
                        </h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {formatFileSize(file.fileSize)} • {formatDate(file.lastModified)}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {file.hasProcessedVersion && (
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                            title={isExpanded ? "Hide processed version" : "Show processed version"}
                        >
                            {isExpanded ? (
                                <IconChevronDown size={16} className="text-gray-500 dark:text-gray-400" />
                            ) : (
                                <IconChevronLeft size={16} className="text-gray-500 dark:text-gray-400" />
                            )}
                        </button>
                    )}

                    <button
                        onClick={() => onDownload(file.key, 'original', file.fileName)}
                        className="flex items-center gap-1 px-3 py-1 bg-blue-500 dark:bg-blue-600 
                                 text-white rounded hover:bg-blue-600 dark:hover:bg-blue-700 
                                 transition-colors text-sm"
                    >
                        <IconDownload size={14} />
                        Download Original
                    </button>
                </div>
            </div>

            {/* Processed file section */}
            {file.hasProcessedVersion && isExpanded && file.processedFile && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600 animate-slideDown">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex-shrink-0">
                                <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                                    <IconFileText size={20} className="text-green-600 dark:text-green-400" />
                                </div>
                            </div>
                            <div>
                                <h5 className="font-medium text-gray-900 dark:text-gray-100">
                                    AI-Processed Version
                                </h5>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {formatFileSize(file.processedFile.fileSize)} • {formatDate(file.processedFile.lastModified)}
                                </p>
                                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                    ✓ Enhanced with AI processing (OCR, text extraction, summaries)
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={() => onDownload(file.processedFile!.key, 'processed', file.processedFile!.fileName)}
                            className="flex items-center gap-1 px-3 py-1 bg-green-500 dark:bg-green-600 
                                     text-white rounded hover:bg-green-600 dark:hover:bg-green-700 
                                     transition-colors text-sm"
                        >
                            <IconDownload size={14} />
                            Download Processed
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const FileListContent: React.FC<{
    files: FileListItem[];
    onDownload: (fileKey: string, fileType: 'original' | 'processed', fileName: string) => void;
}> = ({ files, onDownload }) => {
    if (!files || files.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No files found in this knowledge base.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Found {files.length} file{files.length !== 1 ? 's' : ''}
                {files.some(f => f.hasProcessedVersion) && (
                    <span className="ml-2 text-green-600 dark:text-green-400">
                        • Some files have AI-enhanced versions available
                    </span>
                )}
            </div>

            {files.map((file, index) => (
                <FileDownloadSection
                    key={file.key}
                    file={file}
                    onDownload={onDownload}
                />
            ))}
        </div>
    );
};

// Add this to handle file list content in messages
const renderFileListContent = (content: string, onDownload: (fileKey: string, fileType: 'original' | 'processed', fileName: string) => void) => {
    try {
        const data = JSON.parse(content);
        if (data.type === 'file-list' && data.files) {
            return (
                <FileListContent
                    files={data.files}
                    onDownload={onDownload}
                />
            );
        }
    } catch (e) {
        // Not JSON or not a file list, continue with regular rendering
    }
    return null;
};

const DocumentAttachments: React.FC<{
    documentAttachments?: DocumentAttachmentMetadata[];
}> = ({ documentAttachments }) => {
    if (!documentAttachments?.length) return null;

    return (
        <div className="mb-4 mt-2">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Uploaded Documents:</p>
            <div className="flex flex-wrap gap-2">
                {documentAttachments.map((doc) => (
                    <div
                        key={doc.id}
                        className="flex items-center bg-gray-50 dark:bg-gray-700 
                                 border border-gray-200 dark:border-gray-600 rounded-md p-2 pr-3"
                    >
                        <div className="mr-2">
                            {getFileIcon(doc.type)}
                        </div>
                        <div>
                            <div className="text-sm font-medium truncate max-w-xs text-gray-900 dark:text-gray-100"
                                title={doc.name}>
                                {doc.name}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                {formatFileSize(doc.size)}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const AttachmentGrid: React.FC<{
    attachments: Message['attachments'];
    onImageClick: MessageContentProps['onImageClick'];
}> = ({ attachments, onImageClick }) => {
    if (!attachments?.length) return null;

    // Filter only image attachments
    const imageAttachments = attachments.filter(attachment => attachment.type === 'image');

    if (!imageAttachments.length) return null;

    return (
        <div className="mb-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {imageAttachments.map((attachment, index) => (
                <div
                    key={index}
                    className="relative aspect-square overflow-hidden rounded-lg cursor-pointer"
                    onClick={() => onImageClick(
                        imageAttachments.map(a => a.data),
                        index
                    )}
                >
                    <img
                        src={attachment.data}
                        alt={`Uploaded ${index + 1}`}
                        className="w-full h-full object-cover"
                    />
                </div>
            ))}
        </div>
    );
};

interface ResponseMetadata {
    citations?: {
        content: string;
        location?: {
            s3Location?: { uri: string };
            webLocation?: { url: string };
            customDocumentLocation?: { id: string };
        };
    }[];
    guardrailAction?: any;
    documentAttachments?: DocumentAttachmentMetadata[];
}

const generateRandomId = () => `msg-${Math.random().toString(36).substr(2, 9)}`;

const MetadataContent: React.FC<{
    metadata: Message['metadata'];
    containerId: string;
}> = ({ metadata, containerId }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const { downloadFile, downloadStates, getImagePreview, isImageFile } = useDownload();
    const [loadingPreviews, setLoadingPreviews] = useState<Record<string, boolean>>({});
    const previewsInitialized = React.useRef(false);

    if (!metadata) return null;

    const responseMetadata = metadata as ResponseMetadata;
    if (!responseMetadata.citations?.length) return null;

    const handleDownload = async (s3Location: string, filename: string) => {
        try {
            await downloadFile(s3Location, filename);
        } catch (error) {
            console.error('Download failed:', error);
        }
    };

    // Helper function to extract filename from S3 URI
    const getFilenameFromUri = (uri: string) => {
        const parts = uri.split('/');
        return parts[parts.length - 1];
    };

    // Updated helper to get original file location from processed files
    const getOriginalFileLocation = (s3Uri: string, filename: string): string => {
        // Handle new naming convention: filename.ext.processed.json
        if (filename.endsWith('.processed.json')) {
            // Remove .processed.json to get original filename
            // e.g., "document.pdf.processed.json" -> "document.pdf"
            const originalFilename = filename.replace('.processed.json', '');
            // Replace the processed filename with the original filename in the S3 URI
            return s3Uri.replace(filename, originalFilename);
        }

        return s3Uri;
    };

    // Check if a file is processed
    const isProcessedFile = (filename: string): boolean => {
        return filename.endsWith('.processed.json');
    };

    // Updated function to get original filename from processed filename
    const getOriginalFilename = (filename: string): string => {
        if (filename.endsWith('.processed.json')) {
            // e.g., "document.pdf.processed.json" -> "document.pdf"
            return filename.replace('.processed.json', '');
        }
        return filename;
    };

    // Load image previews when citations are expanded
    const handleToggleExpand = async () => {
        const newExpandedState = !isExpanded;
        setIsExpanded(newExpandedState);

        // Only load previews if expanding and not already initialized
        if (newExpandedState && !previewsInitialized.current && responseMetadata.citations) {
            previewsInitialized.current = true;

            // Find all image citations that need previews
            const imagePreviews = responseMetadata.citations
                .filter(citation => {
                    const s3Uri = citation.location?.s3Location?.uri;
                    if (!s3Uri) return false;

                    const filename = getFilenameFromUri(s3Uri);
                    const originalFilename = getOriginalFilename(filename);
                    // Check if it's a direct image or a processed version of an image
                    return isImageFile(filename) || isImageFile(originalFilename);
                })
                .map(citation => {
                    const s3Uri = citation.location!.s3Location!.uri;
                    const filename = getFilenameFromUri(s3Uri);
                    return {
                        s3Uri,
                        filename,
                        originalLocation: getOriginalFileLocation(s3Uri, filename)
                    };
                });

            // Set all locations to loading state
            const loadingState: Record<string, boolean> = {};
            imagePreviews.forEach(item => {
                loadingState[item.originalLocation] = true;
            });
            setLoadingPreviews(loadingState);

            // Load all image previews concurrently
            await Promise.allSettled(
                imagePreviews.map(async item => {
                    try {
                        await getImagePreview(item.originalLocation);
                    } catch (error) {
                        console.error(`Failed to load preview for ${item.filename}:`, error);
                    } finally {
                        setLoadingPreviews(prev => ({
                            ...prev,
                            [item.originalLocation]: false
                        }));
                    }
                })
            );
        }
    };

    return (
        <div className="mt-4 text-sm border-t border-gray-200 dark:border-gray-700 pt-4">
            <button
                data-citations-toggle={containerId}
                onClick={handleToggleExpand}
                className="flex items-center justify-between w-full py-2 px-4 
                         bg-gray-50 dark:bg-gray-800 rounded-lg 
                         hover:bg-gray-100 dark:hover:bg-gray-700
                         transition-colors duration-200"
            >
                <span className="font-semibold text-gray-700 dark:text-gray-300">
                    Sources ({responseMetadata.citations.length})
                </span>
                {isExpanded ? (
                    <IconChevronLeft className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                ) : (
                    <IconChevronDown className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                )}
            </button>

            <div
                className={`citations mt-4 space-y-4 ${isExpanded ? 'block' : 'hidden'}`}
                data-citations-container={containerId}
            >
                {responseMetadata.citations.map((citation, index) => {
                    const s3Uri = citation.location?.s3Location?.uri;
                    const filename = s3Uri ? getFilenameFromUri(s3Uri) : '';
                    const isProcessed = isProcessedFile(filename);
                    const originalFilename = getOriginalFilename(filename);
                    const originalLocation = s3Uri ? getOriginalFileLocation(s3Uri, filename) : '';
                    const isImage = isImageFile(filename) || isImageFile(originalFilename);

                    const hasImagePreview = isImage && downloadStates[originalLocation]?.previewUrl;
                    const isLoadingPreview = loadingPreviews[originalLocation];

                    return (
                        <div
                            key={index}
                            className="citation mb-4 ml-4 p-3 bg-gray-50 dark:bg-gray-800 
                                     rounded-lg border border-gray-200 dark:border-gray-700
                                     hover:border-gray-300 dark:hover:border-gray-600
                                     transition-colors duration-200"
                            id={`citation-${containerId}-${index + 1}`}
                        >
                            <div className="mb-2">
                                <p className="text-gray-600 dark:text-gray-300">
                                    [{index + 1}] {citation.content}
                                </p>
                            </div>

                            {/* Image preview section with dark mode */}
                            {isImage && (
                                <div className="mt-3 mb-3">
                                    {isLoadingPreview ? (
                                        <div className="flex justify-center items-center h-40 
                                                      bg-gray-100 dark:bg-gray-700 rounded">
                                            <IconLoader2 className="animate-spin h-6 w-6 text-gray-400" />
                                            <span className="ml-2 text-gray-500 dark:text-gray-400">
                                                Loading image preview...
                                            </span>
                                        </div>
                                    ) : hasImagePreview ? (
                                        <div className="flex justify-center">
                                            <img
                                                src={downloadStates[originalLocation]?.previewUrl}
                                                alt={`Preview of ${filename}`}
                                                className="max-h-60 object-contain rounded"
                                            />
                                        </div>
                                    ) : (
                                        <div className="flex justify-center items-center h-24 
                                                      bg-gray-100 dark:bg-gray-700 rounded">
                                            <span className="text-gray-500 dark:text-gray-400">
                                                Image preview unavailable
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {citation.location && (
                                <div className="flex justify-between items-start text-xs text-gray-500 dark:text-gray-400">
                                    <div>
                                        {citation.location.s3Location && (
                                            <div className="flex flex-col gap-1">
                                                <p className="font-medium text-gray-700 dark:text-gray-300">
                                                    File: {isProcessed ? `${originalFilename} (AI-processed)` : filename}
                                                </p>
                                                {isProcessed && (
                                                    <p className="text-xs text-green-600 dark:text-green-400">
                                                        ✓ Enhanced with AI processing
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                        {citation.location.webLocation && (
                                            <p className="flex items-center space-x-1">
                                                <span>Source:</span>
                                                <a
                                                    href={citation.location.webLocation.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-500 dark:text-blue-400 
                                                             hover:text-blue-600 dark:hover:text-blue-300 truncate"
                                                >
                                                    {citation.location.webLocation.url}
                                                </a>
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex flex-col space-y-2">
                                        {/* Download buttons with dark mode */}
                                        {isProcessed && citation.location.s3Location && (
                                            <button
                                                onClick={() => {
                                                    console.log('Downloading original:', originalLocation, originalFilename);
                                                    handleDownload(originalLocation, originalFilename);
                                                }}
                                                disabled={downloadStates[originalLocation]?.isDownloading}
                                                className="inline-flex items-center gap-1 px-3 py-1 
                                                         text-sm text-green-600 dark:text-green-400 
                                                         hover:text-green-800 dark:hover:text-green-300
                                                         disabled:opacity-50 bg-white dark:bg-gray-700 rounded-md 
                                                         shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 
                                                         border border-green-200 dark:border-green-600"
                                            >
                                                {downloadStates[originalLocation]?.isDownloading
                                                    ? 'Downloading...'
                                                    : (
                                                        <>
                                                            <IconDownload className="h-4 w-4" />
                                                            Download Original
                                                        </>
                                                    )}
                                            </button>
                                        )}

                                        {citation.location.s3Location && (
                                            <button
                                                onClick={() => {
                                                    console.log('Downloading processed:', s3Uri, filename);
                                                    handleDownload(s3Uri!, filename);
                                                }}
                                                disabled={downloadStates[s3Uri!]?.isDownloading}
                                                className="inline-flex items-center gap-1 px-3 py-1 
                                                         text-sm text-blue-600 dark:text-blue-400 
                                                         hover:text-blue-800 dark:hover:text-blue-300
                                                         disabled:opacity-50 bg-white dark:bg-gray-700 rounded-md 
                                                         shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 
                                                         border border-blue-200 dark:border-blue-600"
                                            >
                                                {downloadStates[s3Uri!]?.isDownloading
                                                    ? 'Downloading...'
                                                    : (
                                                        <>
                                                            <IconDownload className="h-4 w-4" />
                                                            Download {isProcessed ? 'AI-Processed' : 'File'}
                                                        </>
                                                    )}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// Add these styles to your global CSS or Tailwind config
const styles = `
@keyframes slideDown {
    from {
        opacity: 0;
        transform: translateY(-10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.animate-slideDown {
    animation: slideDown 0.2s ease-out;
}
`;

// Improved helper function to detect proper HTML content
const isProperHtmlDocument = (content: string): boolean => {
    const normalizedContent = content.trim();

    // Look for proper HTML document structure
    return (
        normalizedContent.includes('<!DOCTYPE html>') ||
        normalizedContent.includes('<!doctype html>') ||
        // Match opening and closing HTML tags as a complete document
        // Modified to work without 's' flag by using [\s\S] instead of dot
        /^<html[\s>][\s\S]*<\/html>$/i.test(normalizedContent) ||
        // Check for content that seems like a complete HTML document
        (normalizedContent.startsWith('<html') &&
            normalizedContent.includes('</html>') &&
            normalizedContent.includes('<head') &&
            normalizedContent.includes('<body'))
    );
};

const extractHtmlFromCodeBlock = (content: string): { isHtmlCodeBlock: boolean, htmlContent: string } => {
    // Check for ```html ... ``` pattern
    const htmlCodeBlockRegex = /```html\s+([\s\S]*?)```/;
    const match = content.match(htmlCodeBlockRegex);

    if (match && match[1]) {
        return {
            isHtmlCodeBlock: true,
            htmlContent: match[1].trim()
        };
    }

    return {
        isHtmlCodeBlock: false,
        htmlContent: ""
    };
};

// Modify the extractHtmlContent function
const extractHtmlContent = (content: string): string => {
    // First check if it's a code block
    const { isHtmlCodeBlock, htmlContent } = extractHtmlFromCodeBlock(content);
    if (isHtmlCodeBlock) {
        return htmlContent;
    }

    // If not a code block, proceed with existing logic for HTML documents
    if (isProperHtmlDocument(content)) {
        return content;
    }

    // Try to extract just the HTML portion if there's mixed content
    const htmlTagMatch = content.match(/<html[\s>][\s\S]*<\/html>/i);
    if (htmlTagMatch) {
        return htmlTagMatch[0];
    }

    // If we can't find a complete HTML document, but there's a DOCTYPE declaration,
    // try to grab everything from DOCTYPE to the end
    const doctypeMatch = content.match(/(<!DOCTYPE html>|<!doctype html>)[\s\S]*/i);
    if (doctypeMatch) {
        return doctypeMatch[0];
    }

    // Otherwise, wrap the content in basic HTML structure to make it displayable
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>HTML Preview</title>
</head>
<body>
  ${content}
</body>
</html>`;
};

const ContentWithInlineCitations: React.FC<{
    content: string;
    citations?: ResponseMetadata['citations'];
    containerId: string;
}> = ({ content, citations, containerId }) => {
    // Check if content is HTML (starts with <!DOCTYPE html>)
    if (isProperHtmlDocument(content)) {
        return null; // HTML content will be handled by the parent component
    }

    const scrollToCitation = (citationNumber: number) => {
        const expandButton = document.querySelector(
            `[data-citations-toggle="${containerId}"]`
        ) as HTMLButtonElement;

        const citationsContainer = document.querySelector(
            `[data-citations-container="${containerId}"]`
        ) as HTMLElement;

        if (citationsContainer && !citationsContainer.offsetHeight) {
            expandButton?.click();
        }

        setTimeout(() => {
            const element = document.getElementById(`citation-${containerId}-${citationNumber}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                element.classList.add('highlight-citation');
                setTimeout(() => {
                    element.classList.remove('highlight-citation');
                }, 2000);
            }
        }, 100);
    };

    const citationHighlightStyles = `
        @keyframes highlightFade {
            0% { background-color: rgba(59, 130, 246, 0.2); }
            100% { background-color: transparent; }
        }
        
        .highlight-citation {
            animation: highlightFade 2s ease-out;
        }
    `;

    const processThinkTags = (text: string) => {
        // First process think tags for the entire content
        const parts = text.split(/(<think>[\s\S]*?(?:<\/think>|$))/);
        return parts.map((part, index) => {
            const thinkMatch = part.match(/<think>([\s\S]*?)(?:<\/think>|$)/);
            if (thinkMatch) {
                const thinkContent = thinkMatch[1];
                const isComplete = part.includes('</think>');

                return (
                    <div key={index} className={`
                        my-2 p-3 
                        bg-yellow-50 dark:bg-yellow-900/20 
                        border-l-4 
                        ${isComplete ? 'border-yellow-400 dark:border-yellow-600' : 'border-yellow-200 dark:border-yellow-800'}
                        rounded
                    `}>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-yellow-600 dark:text-yellow-400">
                                Thinking Process {!isComplete && '(thinking...)'}
                            </span>
                        </div>
                        <div className="text-gray-700 dark:text-gray-300">
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                rehypePlugins={[rehypeRaw, rehypeSanitize]}
                                components={components}
                            >
                                {thinkContent}
                            </ReactMarkdown>
                        </div>
                    </div>
                );
            }
            return part;
        });
    };

    const components: Components = {
        code: CodeBlock,
        p: ({ children }: { children: React.ReactNode }) => {
            if (typeof children === 'string') {
                // Process citations after think tags
                const parts = children.split(/(\[\d+\])/);
                return (
                    <p className="mb-4">
                        {parts.map((part, index) => {
                            const citationMatch = part.match(/\[(\d+)\]/);
                            if (citationMatch) {
                                // Handle citations
                                const citationNumber = parseInt(citationMatch[1]);
                                const citation = citations?.[citationNumber - 1];
                                return (
                                    <button
                                        key={index}
                                        onClick={() => scrollToCitation(citationNumber)}
                                        className="inline-flex items-center text-blue-500 hover:text-blue-700
                                            cursor-pointer sup transition-colors duration-200"
                                        title={citation?.content}
                                    >
                                        {part}
                                    </button>
                                );
                            }
                            return <span key={index}>{part}</span>;
                        })}
                    </p>
                );
            }
            return <p className="mb-4">{children}</p>;
        },
        h1: ({ children }: { children: React.ReactNode }) => (
            <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">{children}</h1>
        ),
        h2: ({ children }: { children: React.ReactNode }) => (
            <h2 className="text-xl font-bold mb-3 text-gray-900 dark:text-gray-100">{children}</h2>
        ),
        h3: ({ children }: { children: React.ReactNode }) => (
            <h3 className="text-lg font-bold mb-2 text-gray-900 dark:text-gray-100">{children}</h3>
        ),
        ul: ({ children }: { children: React.ReactNode }) => (
            <ul className="list-disc ml-6 mb-4 text-gray-900 dark:text-gray-100">{children}</ul>
        ),
        ol: ({ children }: { children: React.ReactNode }) => (
            <ol className="list-decimal ml-6 mb-4 text-gray-900 dark:text-gray-100">{children}</ol>
        ),
        li: ({ children }: { children: React.ReactNode }) => (
            <li className="mb-1 text-gray-900 dark:text-gray-100">{children}</li>
        ),
        table: ({ children }: { children: React.ReactNode }) => (
            <div className="overflow-x-auto">
                <table className="min-w-full table-auto border-collapse mb-4 
                               border border-gray-300 dark:border-gray-600">
                    {children}
                </table>
            </div>
        ),
        th: ({ children }: { children: React.ReactNode }) => (
            <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 
                         bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                {children}
            </th>
        ),
        td: ({ children }: { children: React.ReactNode }) => (
            <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 
                         text-gray-900 dark:text-gray-100">{children}</td>
        ),
    } as Components;

    const processedContent = processThinkTags(content);

    return (
        <>
            <style>{citationHighlightStyles}</style>
            <div>
                {Array.isArray(processedContent) ? (
                    processedContent.map((part, index) => {
                        if (React.isValidElement(part)) {
                            return part;
                        }
                        // Explicitly check if part is a string before passing to ReactMarkdown
                        if (typeof part === 'string') {
                            return (
                                <ReactMarkdown
                                    key={index}
                                    remarkPlugins={[remarkGfm]}
                                    rehypePlugins={[rehypeRaw, rehypeSanitize]}
                                    components={components}
                                >
                                    {part}
                                </ReactMarkdown>
                            );
                        }
                        return null; // Handle any other cases
                    })
                ) : (
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeRaw, rehypeSanitize]}
                        components={components}
                    >
                        {content}
                    </ReactMarkdown>
                )}
            </div>
        </>
    );
};

// Update the MessageContent component with proper dark mode support
export const MessageContent: React.FC<MessageContentProps> = ({
    message,
    onImageClick
}) => {
    const containerId = useMemo(() => generateRandomId(), []);
    const [isCopied, setIsCopied] = useState(false);
    const [showRawHtml, setShowRawHtml] = useState(false);

    // Check if content is HTML document or HTML code block
    const { isHtmlCodeBlock, htmlContent: codeBlockHtml } = extractHtmlFromCodeBlock(message.content);
    const isHtmlDocument = isProperHtmlDocument(message.content);
    const shouldRenderHtml = isHtmlDocument || isHtmlCodeBlock;

    // Extract proper HTML content when needed
    const htmlContent = useMemo(() => {
        return extractHtmlContent(message.content);
    }, [message.content]);

    const handleCopyMessage = async () => {
        try {
            await navigator.clipboard.writeText(message.content);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy message:', err);
        }
    };

    const handleFileDownload = async (fileKey: string, fileType: 'original' | 'processed', fileName: string) => {
        try {
            // This would typically call your API to get a download URL
            // For now, we'll just log the download request
            console.log(`Downloading ${fileType} file:`, { fileKey, fileName });

            // You would implement the actual download logic here
            // Example: 
            // const response = await fetch(`/api/knowledge-bases/${kbId}/files/download?key=${fileKey}&type=${fileType}`);
            // const data = await response.json();
            // window.open(data.downloadUrl, '_blank');
        } catch (error) {
            console.error('Error downloading file:', error);
        }
    };

    // Handle video content
    if (message.type === CategoryType.Video) {
        return <VideoContent content={message.content} />;
    }

    // Handle image content
    if (message.type === 'image' && message.role === 'assistant') {
        return (
            <ImageContent
                imageData={message.imageData}
                content={message.content}
                onImageClick={onImageClick}
            />
        );
    }

    // Check if this is a file list message
    const fileListContent = renderFileListContent(message.content, handleFileDownload);
    if (fileListContent) {
        return fileListContent;
    }

    return (
        <div className="relative group">
            <div className="absolute -top-4 -right-4 z-50">
                <button
                    onClick={handleCopyMessage}
                    className="absolute top-2 right-2 p-1.5 rounded-md
                             opacity-0 group-hover:opacity-100 transition-opacity 
                             hover:bg-gray-200/50 dark:hover:bg-gray-700/50 
                             text-gray-500 dark:text-gray-400 
                             hover:text-gray-700 dark:hover:text-gray-300
                             z-50"
                    title="Copy message"
                >
                    {isCopied ? (
                        <IconCheck size={22} stroke={2} className="text-green-500 dark:text-green-400" />
                    ) : (
                        <IconCopy size={22} stroke={2} />
                    )}
                </button>
            </div>

            {/* Document Attachments - Show for user messages */}
            {message.role === 'user' && message.metadata?.documentAttachments && (
                <DocumentAttachments documentAttachments={message.metadata.documentAttachments} />
            )}

            {/* Image Attachments */}
            <AttachmentGrid
                attachments={message.attachments}
                onImageClick={onImageClick}
            />

            <div className="prose max-w-none dark:prose-invert">
                {message.role === 'assistant' ? (
                    <>
                        {shouldRenderHtml ? (
                            <div className="mb-4">
                                <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded-t-lg border border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center gap-2">
                                        <IconCode className="text-blue-500" size={20} />
                                        <span className="font-medium">
                                            {isHtmlCodeBlock ? "HTML Preview" : "HTML Content"}
                                        </span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setShowRawHtml(!showRawHtml)}
                                            className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded transition-colors"
                                        >
                                            {showRawHtml ? "Show Rendered" : "Show Raw HTML"}
                                        </button>
                                        <button
                                            onClick={() => {
                                                const blob = new Blob([htmlContent], { type: 'text/html' });
                                                const url = URL.createObjectURL(blob);
                                                window.open(url, '_blank');
                                            }}
                                            className="px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
                                            title="Open in new tab"
                                        >
                                            <IconExternalLink size={18} />
                                        </button>
                                    </div>
                                </div>

                                {showRawHtml ? (
                                    <div className="border border-t-0 border-gray-200 dark:border-gray-700 rounded-b-lg p-4 bg-gray-50 dark:bg-gray-800 overflow-auto max-h-96">
                                        <pre className="text-sm whitespace-pre-wrap break-words">
                                            <code>{isHtmlCodeBlock ? codeBlockHtml : htmlContent}</code>
                                        </pre>
                                    </div>
                                ) : (
                                    <div className="border border-t-0 border-gray-200 dark:border-gray-700 rounded-b-lg overflow-hidden" style={{ height: '500px' }}>
                                        <iframe
                                            srcDoc={htmlContent}
                                            className="w-full h-full"
                                            title="HTML Content"
                                            sandbox="allow-same-origin allow-scripts"
                                        />
                                    </div>
                                )}
                            </div>
                        ) : (
                            <ContentWithInlineCitations
                                content={message.content}
                                citations={message.metadata?.citations}
                                containerId={containerId}
                            />
                        )}
                        <MetadataContent
                            metadata={message.metadata}
                            containerId={containerId}
                        />
                    </>
                ) : shouldRenderHtml ? (
                    <div className="mb-4">
                        <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded-t-lg border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-2">
                                <IconCode className="text-blue-500" size={20} />
                                <span className="font-medium">
                                    {isHtmlCodeBlock ? "HTML Preview" : "HTML Content"}
                                </span>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowRawHtml(!showRawHtml)}
                                    className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded transition-colors"
                                >
                                    {showRawHtml ? "Show Rendered" : "Show Raw HTML"}
                                </button>
                                <button
                                    onClick={() => {
                                        const blob = new Blob([htmlContent], { type: 'text/html' });
                                        const url = URL.createObjectURL(blob);
                                        window.open(url, '_blank');
                                    }}
                                    className="px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
                                    title="Open in new tab"
                                >
                                    <IconExternalLink size={18} />
                                </button>
                            </div>
                        </div>

                        {showRawHtml ? (
                            <div className="border border-t-0 border-gray-200 dark:border-gray-700 rounded-b-lg p-4 bg-gray-50 dark:bg-gray-800 overflow-auto max-h-96">
                                <pre className="text-sm whitespace-pre-wrap break-words">
                                    <code>{isHtmlCodeBlock ? codeBlockHtml : htmlContent}</code>
                                </pre>
                            </div>
                        ) : (
                            <div className="border border-t-0 border-gray-200 dark:border-gray-700 rounded-b-lg overflow-hidden" style={{ height: '500px' }}>
                                <iframe
                                    srcDoc={htmlContent}
                                    className="w-full h-full"
                                    title="HTML Content"
                                    sandbox="allow-same-origin allow-scripts"
                                />
                            </div>
                        )}
                    </div>
                ) : (
                    <p>{message.content}</p>
                )}
            </div>
        </div>
    );
};