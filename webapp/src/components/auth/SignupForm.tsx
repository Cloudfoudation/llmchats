// src/components/signup/SignupForm.tsx
'use client'
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useSignupContext } from '@/providers/SignupProvider';
import { signupSchema } from '@/types/signup';
import { z } from 'zod';
import Link from 'next/link';

type SignupError = {
	code: string;
	message: string;
	name: string;
};

export const SignupForm = () => {
	const t = useTranslations('auth');
	const tCommon = useTranslations('common');

	const { signUp, isLoading, error, message } = useSignupContext();
	const [formData, setFormData] = useState({
		email: '',
		password: '',
		confirmPassword: ''
	});
	const [formErrors, setFormErrors] = useState<Record<string, string[]>>({});
	const [touched, setTouched] = useState<Record<string, boolean>>({});
	const [signupError, setSignupError] = useState<string | null>(null);

	const validateForm = () => {
		try {
			const schema = z.object({
				email: signupSchema.email,
				password: signupSchema.password,
				confirmPassword: signupSchema.confirmPassword
			}).refine((data) => data.password === data.confirmPassword, {
				message: t('passwordsDontMatch'),
				path: ["confirmPassword"],
			});
			schema.parse(formData);
			setFormErrors({});
			return true;
		} catch (error) {
			if (error instanceof z.ZodError) {
				const errors: Record<string, string[]> = {};
				error.errors.forEach((err) => {
					const path = err.path[0] as string;
					if (!errors[path]) {
						errors[path] = [];
					}
					errors[path].push(err.message);
				});
				setFormErrors(errors);
			}
			return false;
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!validateForm()) return;

		try {
			setSignupError(null); // Clear any previous errors
			await signUp(formData.email, formData.password);
		} catch (error) {
			const err = error as SignupError;
			switch (err.name) {
				case 'UsernameExistsException':
					setSignupError(t('accountExists'));
					break;
				case 'InvalidPasswordException':
					setSignupError(t('passwordRequirements'));
					break;
				case 'InvalidParameterException':
					setSignupError(t('invalidParameter'));
					break;
				default:
					setSignupError(t('signupError'));
			}
		}
	};

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target;
		setFormData(prev => ({
			...prev,
			[name]: value
		}));
	};

	const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
		const { name } = e.target;
		setTouched(prev => ({
			...prev,
			[name]: true
		}));
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
			<div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md w-full max-w-md">
				<h2 className="text-2xl font-bold mb-6 text-center text-gray-900 dark:text-white">
					{t('signupTitle')}
				</h2>

				{/* Show success message (for dev environment) */}
				{message && (
					<div className="mb-4 p-3 bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-800 text-green-700 dark:text-green-300 rounded">
						{message}
					</div>
				)}

				{/* Show either the context error or the signup error */}
				{(error || signupError) && (
					<div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 rounded">
						{error || signupError}
					</div>
				)}

				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('email')}</label>
						<input
							type="email"
							name="email"
							value={formData.email}
							onChange={handleInputChange}
							onBlur={handleBlur}
							className="mt-1 p-2 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
							required
						/>
						{touched.email && formErrors.email && (
							<div className="mt-1 text-sm text-red-500 dark:text-red-400">
								{formErrors.email.map((error, index) => (
									<div key={index}>{error}</div>
								))}
							</div>
						)}
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('password')}</label>
						<input
							type="password"
							name="password"
							value={formData.password}
							onChange={handleInputChange}
							onBlur={handleBlur}
							className="mt-1 p-2 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
							required
						/>
						{touched.password && formErrors.password && (
							<div className="mt-1 text-sm text-red-500 dark:text-red-400">
								{formErrors.password.map((error, index) => (
									<div key={index}>{error}</div>
								))}
							</div>
						)}
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('confirmPassword')}</label>
						<input
							type="password"
							name="confirmPassword"
							value={formData.confirmPassword}
							onChange={handleInputChange}
							onBlur={handleBlur}
							className="mt-1 p-2 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
							required
						/>
						{touched.confirmPassword && formErrors.confirmPassword && (
							<div className="mt-1 text-sm text-red-500 dark:text-red-400">
								{formErrors.confirmPassword.map((error, index) => (
									<div key={index}>{error}</div>
								))}
							</div>
						)}
					</div>

					<button
						type="submit"
						disabled={isLoading}
						className="w-full bg-indigo-600 dark:bg-indigo-500 text-white py-2 px-4 rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
					>
						{isLoading ? t('signingUp') : t('signup')}
					</button>
				</form>

				<div className="mt-4 text-center">
					<Link
						href="/auth/login"
						className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300"
					>
						{t('alreadyHaveAccount')} {t('login')}
					</Link>
				</div>
			</div>
		</div>
	);
};