// src/components/ImageViewer.tsx
import React from 'react';
import { IconX, IconChevronLeft, IconChevronRight } from '@tabler/icons-react';

interface ImageViewerProps {
    images: string[];
    currentIndex: number;
    onClose: () => void;
    onNext: () => void;
    onPrevious: () => void;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({
    images,
    currentIndex,
    onClose,
    onNext,
    onPrevious
}) => {
    if (!images.length) return null;

    return (
        <div
            className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center"
            onClick={onClose}
        >
            <div
                className="relative max-w-full max-h-full p-4"
                onClick={e => e.stopPropagation()}
            >
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 bg-black bg-opacity-50 
                        rounded-full text-white hover:bg-opacity-75 transition-colors"
                >
                    <IconX size={24} />
                </button>

                {/* Navigation buttons */}
                {images.length > 1 && (
                    <>
                        {currentIndex > 0 && (
                            <button
                                onClick={onPrevious}
                                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 
                                    bg-black bg-opacity-50 rounded-full text-white 
                                    hover:bg-opacity-75 transition-colors"
                            >
                                <IconChevronLeft size={24} />
                            </button>
                        )}
                        {currentIndex < images.length - 1 && (
                            <button
                                onClick={onNext}
                                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 
                                    bg-black bg-opacity-50 rounded-full text-white 
                                    hover:bg-opacity-75 transition-colors"
                            >
                                <IconChevronRight size={24} />
                            </button>
                        )}
                    </>
                )}

                {/* Image */}
                <img
                    src={images[currentIndex]}
                    alt={`Image ${currentIndex + 1}`}
                    className="max-w-full max-h-[90vh] object-contain rounded-lg"
                />

                {/* Image counter */}
                {images.length > 1 && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 
                        bg-black bg-opacity-50 text-white px-3 py-1 rounded-full">
                        {currentIndex + 1} / {images.length}
                    </div>
                )}
            </div>
        </div>
    );
};