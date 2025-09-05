// src/components/auth/login.tsx
'use client'
import { FcGoogle } from 'react-icons/fc';
import { useAuthContext } from '@/providers/AuthProvider';
import { useState } from 'react';
import { withUnauth } from '@/hocs/withUnauth';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

export default withUnauth(Login);

export function Login() {
	const t = useTranslations('auth');
	const tCommon = useTranslations('common');
	const { isAuthenticated, isLoginLoading, signInWithGoogle, signInWithCredentials, logout } = useAuthContext();
	const [formData, setFormData] = useState({
		email: '',
		password: ''
	});
	const [touched, setTouched] = useState<Record<string, boolean>>({});
	const [error, setError] = useState<string>(''); // Add error state

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target;
		setFormData(prev => ({
			...prev,
			[name]: value
		}));
		// Clear error when user starts typing
		setError('');
	};

	const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
		const { name } = e.target;
		setTouched(prev => ({
			...prev,
			[name]: true
		}));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			await signInWithCredentials(formData.email, formData.password);
		} catch (error) {
			// Show error message
			if (error instanceof Error) {
				setError(error.message);
			} else {
				setError(t('invalidCredentials'));
			}
			console.error('Authentication error:', error);
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
			<div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md w-full max-w-md">
				<h2 className="text-2xl font-bold mb-6 text-center text-gray-900 dark:text-white">
					{t('login')}
				</h2>

				{!isAuthenticated && (
					<>
						<form onSubmit={handleSubmit} className="space-y-4">
							{/* Show error message if exists */}
							{error && (
								<div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
									{error}
								</div>
							)}

							<div>
								<label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('email')}</label>
								<input
									type="email"
									name="email"
									value={formData.email}
									onChange={handleInputChange}
									onBlur={handleBlur}
									className="mt-1 p-2 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:focus:ring-indigo-400"
									required
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('password')}</label>
								<input
									type="password"
									name="password"
									value={formData.password}
									onChange={handleInputChange}
									onBlur={handleBlur}
									className="mt-1 p-2 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:focus:ring-indigo-400"
									required
								/>
							</div>

							<div className="flex justify-end">
                                <Link
                                    href="/auth/forgot-password"
                                    className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300"
                                >
                                    {t('forgotPassword')}
                                </Link>
                            </div>

							<button
								type="submit"
								disabled={isLoginLoading}
								className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{isLoginLoading ? tCommon('loading') : t('login')}
							</button>
						</form>

						<div className="mt-4 text-center">
							<Link
								href="/auth/signup"
								className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300"
							>
								{t('dontHaveAccount')} {t('signup')}
							</Link>
						</div>

						<div className="mt-6 relative">
							<div className="absolute inset-0 flex items-center">
								<div className="w-full border-t border-gray-300 dark:border-gray-600" />
							</div>
							<div className="relative flex justify-center text-sm">
								<span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">{tCommon('or')} continue with</span>
							</div>
						</div>

						<button
							onClick={signInWithGoogle}
							disabled={isLoginLoading}
							className="w-full mt-6 flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
						>
							<FcGoogle className="text-xl" />
							<span>{t('loginWithGoogle')}</span>
						</button>
					</>
				)}

				{isAuthenticated && (
					<button
						onClick={logout}
						className="w-full mt-4 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
					>
						{t('logout')}
					</button>
				)}
			</div>
		</div>
	);
}