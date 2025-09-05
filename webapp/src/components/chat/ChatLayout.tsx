// src/components/chat/ChatLayout.tsx
'use client'
import { useConversationContext } from '@/providers/ConversationProvider';
import { HeaderActions } from '@/components/chat/HeaderActions';
import { Sidebar } from '@/components/chat/ConversationSidebar';
import { useState, useEffect } from 'react';
import { useSettingsContext } from '@/providers/SettingsProvider';
import { Chat } from '@/components/chat/Chat';
import { withAuth } from '@/hocs/withAuth';
import { useModal } from '@/providers/ModalProvider';
import { IconMessageCircle, IconFileText, IconMenu2, IconPlus } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';

export default withAuth(ChatLayout);

export function ChatLayout() {
	const t = useTranslations('chat');
	const tNav = useTranslations('navigation');
	const {
		activeConversation,
		createNewConversation,
		createNewEditorConversation
	} = useConversationContext();

	const { settings, toggleSidebar } = useSettingsContext();
	const { openAgentManager } = useModal();
	const [currentTitle, setCurrentTitle] = useState<string>('AWS Bedrock Chat');

	useEffect(() => {
		setCurrentTitle(activeConversation?.title || 'AWS Bedrock Chat');
	}, [activeConversation?.title]);

	const isEditorView = activeConversation?.type === 'editor';

	return (
		<div className="flex h-screen relative bg-white dark:bg-gray-900">
			{/* Mobile Overlay */}
			{settings.isSidebarVisible && (
				<div
					className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
					onClick={toggleSidebar}
				/>
			)}

			{/* Sidebar */}
			<div
				className={`
                    fixed lg:static
                    inset-y-0 left-0
                    transform transition-transform duration-300 ease-in-out
                    ${settings.isSidebarVisible ? 'translate-x-0' : '-translate-x-full'}
                    lg:translate-x-0
                    w-80 lg:w-80
                    z-30
                `}
			>
				<Sidebar
					isSidebarVisible={settings.isSidebarVisible}
					toggleSidebar={toggleSidebar}
					setShowAgentManager={openAgentManager}
				/>
			</div>

			{/* Main Content */}
			<div className="flex-1 flex flex-col w-full lg:w-[calc(100%-16rem)] pt-1 pb-1">
				<header className="sticky top-0 bg-white dark:bg-gray-900 z-10 border-b border-gray-200 dark:border-gray-700">
					<div className="h-full p-2 flex items-center justify-between max-w-screen-xl mx-auto">
						<div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
							{/* Mobile Toggle Button */}
							<button
								onClick={toggleSidebar}
								className="inline-flex items-center justify-center gap-1 rounded py-1 px-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 lg:hidden transition-colors"
								aria-label={t('toggleSidebar')}
							>
								<IconMenu2 className="h-4 w-4" />
							</button>

							{/* Mobile New Content Buttons */}
							<div className="flex gap-2 lg:hidden">
								<button
									onClick={createNewConversation}
									className="inline-flex items-center justify-center gap-1 rounded py-1 px-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
									aria-label={t('newConversation')}
								>
									<IconMessageCircle className="h-4 w-4" />
								</button>
								<button
									onClick={createNewEditorConversation}
									className="inline-flex items-center justify-center gap-1 rounded py-1 px-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
									aria-label={t('newDocument')}
								>
									<IconFileText className="h-4 w-4" />
								</button>
							</div>

							{/* Title with Type Icon */}
							<div className="flex items-center min-w-0 gap-2">
								{isEditorView ? (
									<IconFileText className="h-5 w-5 text-gray-600 dark:text-gray-300" />
								) : (
									<IconMessageCircle className="h-5 w-5 text-gray-600 dark:text-gray-300" />
								)}
								<h2 className="text-base font-bold text-gray-600 dark:text-gray-300 truncate">
									{currentTitle}
								</h2>
							</div>
						</div>

						{/* Header Actions */}
						<HeaderActions />
					</div>
				</header>

				<main className="flex-1 overflow-auto bg-white dark:bg-gray-900">
					<Chat />
				</main>

			</div>
		</div>
	);
}