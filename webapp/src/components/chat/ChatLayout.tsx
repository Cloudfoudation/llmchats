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
	const [currentTitle, setCurrentTitle] = useState<string>('LEGAIA');

	useEffect(() => {
		setCurrentTitle(activeConversation?.title || 'LEGAIA');
	}, [activeConversation?.title]);

	const isEditorView = activeConversation?.type === 'editor';

	return (
		<div className="flex h-screen bg-gray-50 dark:bg-gray-950">
			{/* Mobile Overlay */}
			{settings.isSidebarVisible && (
				<div
					className="fixed inset-0 bg-black/20 backdrop-blur-sm z-20 lg:hidden"
					onClick={toggleSidebar}
				/>
			)}

			{/* Sidebar */}
			<div
				className={`
                    fixed lg:static
                    inset-y-0 left-0
                    transform transition-all duration-300 ease-in-out
                    ${settings.isSidebarVisible ? 'translate-x-0' : '-translate-x-full'}
                    lg:translate-x-0
                    w-72 lg:w-72
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
			<div className="flex-1 flex flex-col min-w-0">
				{/* Header */}
				<header className="sticky top-0 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl z-10 border-b border-gray-200/50 dark:border-gray-800/50">
					<div className="flex items-center justify-between px-4 py-3 max-w-4xl mx-auto w-full">
						<div className="flex items-center gap-3">
							{/* Mobile Toggle */}
							<button
								onClick={toggleSidebar}
								className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
								aria-label={t('toggleSidebar')}
							>
								<IconMenu2 className="h-5 w-5 text-gray-600 dark:text-gray-400" />
							</button>

							{/* Logo/Title */}
							<div className="flex items-center gap-2">
								<div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
									<span className="text-white font-bold text-sm">L</span>
								</div>
								<h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100 hidden sm:block">
									LEGAIA
								</h1>
							</div>
						</div>

						{/* Header Actions */}
						<HeaderActions />
					</div>
				</header>

				{/* Main Chat Area */}
				<main className="flex-1 overflow-hidden">
					<Chat />
				</main>
			</div>
		</div>
	);
}