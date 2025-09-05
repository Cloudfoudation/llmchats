// src/hooks/useDownload.ts
import { useState } from 'react';
import { s3Download } from '@/services/download/S3Download';

interface DownloadState {
    isDownloading: boolean;
    error: Error | null;
    previewUrl?: string;
}

export const useDownload = () => {
    const [downloadStates, setDownloadStates] = useState<Record<string, DownloadState>>({});

    // Function to get image preview
    const getImagePreview = async (s3Location: string): Promise<string | null> => {
        try {
            setDownloadStates(prev => ({
                ...prev,
                [s3Location]: { ...prev[s3Location], isDownloading: true, error: null }
            }));

            // Ensure s3Location uses users/ path format if needed
            const normalizedLocation = s3Location.startsWith('groups/')
                ? s3Location.replace(/^groups\/[^\/]+\//, 'users/')
                : s3Location;

            const blob = await s3Download.downloadFile(normalizedLocation);
            const url = URL.createObjectURL(blob);

            setDownloadStates(prev => ({
                ...prev,
                [s3Location]: { isDownloading: false, error: null, previewUrl: url }
            }));

            return url;
        } catch (error) {
            setDownloadStates(prev => ({
                ...prev,
                [s3Location]: {
                    isDownloading: false,
                    error: error instanceof Error ? error : new Error('Preview failed')
                }
            }));
            return null;
        }
    };

    // Check if a file is an image based on its extension
    const isImageFile = (filename: string): boolean => {
        const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
        const ext = filename.split('.').pop()?.toLowerCase();
        return ext ? imageExtensions.includes(ext) : false;
    };

    const downloadFile = async (s3Location: string, filename: string) => {
        setDownloadStates(prev => ({
            ...prev,
            [s3Location]: { isDownloading: true, error: null }
        }));

        try {
            // Ensure s3Location uses users/ path format if needed
            const normalizedLocation = s3Location.startsWith('groups/')
                ? s3Location.replace(/^groups\/[^\/]+\//, 'users/')
                : s3Location;

            const blob = await s3Download.downloadFile(normalizedLocation);

            // Create download link
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();

            // Cleanup
            window.URL.revokeObjectURL(url);
            a.remove();

            setDownloadStates(prev => ({
                ...prev,
                [s3Location]: { isDownloading: false, error: null }
            }));
        } catch (error) {
            setDownloadStates(prev => ({
                ...prev,
                [s3Location]: {
                    isDownloading: false,
                    error: error instanceof Error ? error : new Error('Download failed')
                }
            }));
            throw error;
        }
    };

    return {
        downloadFile,
        downloadStates,
        getImagePreview,
        isImageFile
    };
};