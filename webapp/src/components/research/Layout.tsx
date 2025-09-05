// src/components/chat/ChatLayout.tsx
'use client'
import { withAuth } from '@/hocs/withAuth';
import { ResearchPage } from '@/components/research'

export default withAuth(Layout);

export function Layout() {
	return (
		<ResearchPage />
	);
}