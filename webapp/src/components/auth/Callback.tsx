// Callback.tsx
'use client'
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from 'aws-amplify/auth';
import { configureAmplify } from '@/utils/amplify-config';

interface CallbackState {
	error: string | null;
	isLoading: boolean;
}

export function Callback() {
	const router = useRouter();
	const [state, setState] = useState<CallbackState>({
		error: null,
		isLoading: true
	});

	useEffect(() => {
		configureAmplify();
	}, []);

	useEffect(() => {
		const handleCallback = async () => {
			try {
				const user = await getCurrentUser();
				console.log('Authentication successful:', user);
				
				router.replace('/', );
			} catch (error) {
				console.error('Authentication error:', error);
				setState({
					error: 'Authentication failed. Please try again.',
					isLoading: false
				});
				setTimeout(() => router.replace('/'), 3000);
			}
		};

		handleCallback();
	}, []);

	if (state.error) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="bg-red-50 p-4 rounded-md">
					<p className="text-red-700">{state.error}</p>
					<p className="text-sm text-red-600">Redirecting to login page...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen flex items-center justify-center">
			<div className="text-center">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto" />
				<p className="mt-4 text-gray-600">Completing authentication...</p>
			</div>
		</div>
	);
}