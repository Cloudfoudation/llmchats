// src/components/signup/VerificationForm.tsx
import { useState, useEffect } from 'react';
import { useSignupContext } from '@/providers/SignupProvider';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

type VerificationError = {
	code: string;
	message: string;
	name: string;
};

export const VerificationForm = () => {
	const t = useTranslations('auth');
	const { verifyEmail, resendCode, isLoading, error, email } = useSignupContext();
	const [code, setCode] = useState('');
	const [resendCooldown, setResendCooldown] = useState(0);
	const [verificationError, setVerificationError] = useState<string | null>(null);
	const router = useRouter();

	useEffect(() => {
		if (resendCooldown > 0) {
			const timer = setTimeout(() => {
				setResendCooldown(prev => prev - 1);
			}, 1000);
			return () => clearTimeout(timer);
		}
	}, [resendCooldown]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!email) return;

		try {
			setVerificationError(null); // Clear previous errors
			await verifyEmail(email, code);
			// If verification is successful, redirect to login
			router.push('/auth/login');
		} catch (error) {
			const err = error as VerificationError;
			switch (err.name) {
				case 'NotAuthorizedException':
					if (err.message.includes('CONFIRMED')) {
						setVerificationError(t('alreadyVerified'));
						// Optionally redirect to login after a delay
						setTimeout(() => {
							router.push('/auth/login');
						}, 3000);
					} else {
						setVerificationError(t('verificationFailed'));
					}
					break;
				case 'CodeMismatchException':
					setVerificationError(t('invalidCode'));
					break;
				case 'ExpiredCodeException':
					setVerificationError(t('expiredCode'));
					break;
				default:
					setVerificationError(t('verificationError'));
			}
			console.error('Verification error:', error);
		}
	};

	const handleResend = async () => {
		if (resendCooldown > 0 || !email) return;

		try {
			setVerificationError(null);
			await resendCode(email);
			setResendCooldown(60);
		} catch (error) {
			const err = error as VerificationError;
			if (err.name === 'NotAuthorizedException' && err.message.includes('CONFIRMED')) {
				setVerificationError(t('alreadyVerified'));
				setTimeout(() => {
					router.push('/auth/login');
				}, 3000);
			} else {
				setVerificationError(t('resendError'));
			}
			console.error('Resend error:', error);
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
			<div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md w-full max-w-md">
				<h2 className="text-2xl font-bold mb-6 text-center text-gray-900 dark:text-white">
					{t('verifyEmailTitle')}
				</h2>

				{/* Show either context error or verification error */}
				{(error || verificationError) && (
					<div className={`mb-4 p-3 border rounded ${verificationError?.includes(t('alreadyVerified'))
						? 'bg-green-100 dark:bg-green-900/30 border-green-400 dark:border-green-800 text-green-700 dark:text-green-300'
						: 'bg-red-100 dark:bg-red-900/30 border-red-400 dark:border-red-800 text-red-700 dark:text-red-400'
						}`}>
						{error || verificationError}
					</div>
				)}

				<div className="mb-4 text-center text-gray-600 dark:text-gray-400">
					{t('verificationSentTo')}
					<div className="font-medium text-gray-900 dark:text-white">{email}</div>
				</div>

				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
							{t('verificationCodeLabel')}
						</label>
						<input
							type="text"
							value={code}
							onChange={(e) => setCode(e.target.value)}
							className="mt-1 p-2 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
							placeholder={t('enterVerificationCode')}
							required
						/>
					</div>

					<button
						type="submit"
						disabled={isLoading}
						className="w-full bg-indigo-600 dark:bg-indigo-500 text-white py-2 px-4 rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
					>
						{isLoading ? t('verifying') : t('verifyEmail')}
					</button>
				</form>

				<div className="mt-4 text-center">
					<button
						onClick={handleResend}
						disabled={resendCooldown > 0 || isLoading}
						className={`text-sm ${resendCooldown > 0 || isLoading
							? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
							: 'text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300'
							}`}
					>
						{resendCooldown > 0
							? t('resendCodeTimer', { seconds: resendCooldown })
							: t('resendCode')}
					</button>
				</div>

				<div className="mt-4 text-sm text-gray-600 dark:text-gray-400 text-center">
					{t('checkSpamFolder')}
				</div>
			</div>
		</div>
	);
};