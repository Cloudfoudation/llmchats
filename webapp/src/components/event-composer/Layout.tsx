// src/components/chat/ChatLayout.tsx
'use client'
import { withAuth } from '@/hocs/withAuth';
import { EventPage } from '@/components/event-composer/index'
import { EventProvider } from '@/providers/EventContext';

export default withAuth(Layout);

export function Layout() {
	return (
		<EventProvider>
			<EventPage />
		</EventProvider>
	);
}