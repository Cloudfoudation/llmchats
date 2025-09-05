// src/components/chat/ChatLayout.tsx
'use client'
import { withAuth } from '@/hocs/withAuth';
import { ManageApiKeys } from '@/components/apikeys'

export default withAuth(Layout);

export function Layout() {
	return (
		<ManageApiKeys />
	);
}