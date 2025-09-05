import { useTranslations } from 'next-intl';

export default function LoadingScreen() {
    const t = useTranslations('common');
    
    return (
        <div className="flex h-screen animate-pulse bg-background">
            {/* Sidebar Skeleton */}
            <div className="w-64 bg-gray-100 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-4">
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    ))}
                </div>
            </div>

            {/* Main Content Skeleton */}
            <div className="flex-1 flex flex-col">
                {/* Header Skeleton */}
                <div className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 flex items-center justify-between">
                    <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>

                {/* Content Skeleton */}
                <div className="flex-1 p-4 space-y-4 bg-background">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex gap-4">
                            <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                            <div className="flex-1">
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                            </div>
                        </div>
                    ))}
                </div>
                
                {/* Loading text */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                        <p className="text-gray-600 dark:text-gray-400">{t('loading')}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}