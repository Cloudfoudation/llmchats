// src/components/auth/ForgotPassword.tsx
'use client'
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuthContext } from '@/providers/AuthProvider';
import { withUnauth } from '@/hocs/withUnauth';
import Link from 'next/link';
import { z } from 'zod';
import { authSchema } from '@/types/auth';

export default withUnauth(ForgotPassword);

const emailSchema = z.object({
  email: authSchema.email,
});

const resetSchema = (t: any) => z.object({
  email: authSchema.email,
  code: z.string().min(1, t('verificationCodeRequired')),
  password: authSchema.password,
  confirmPassword: z.string().min(1, t('confirmPasswordRequired')),
}).refine((data) => data.password === data.confirmPassword, {
  message: t('passwordMismatch'),
  path: ["confirmPassword"],
});

export function ForgotPassword() {
  const t = useTranslations('auth');
  const tCommon = useTranslations('common');
  const { forgotPassword, forgotPasswordSubmit, isForgotPasswordLoading, forgotPasswordSent } = useAuthContext();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string>('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<string>('');

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setValidationErrors({});
    setSuccess('');

    try {
      // Validate email
      emailSchema.parse({ email });

      await forgotPassword(email);
      setSuccess(t('verificationCodeSent'));
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path) {
            errors[err.path[0]] = err.message;
          }
        });
        setValidationErrors(errors);
      } else if (error instanceof Error) {
        setError(error.message);
      } else {
        setError(t('genericError'));
      }
      console.error('Forgot password error:', error);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setValidationErrors({});
    setSuccess('');

    try {
      // Validate form
      resetSchema(t).parse({ email, code, password, confirmPassword });

      await forgotPasswordSubmit(email, code, password);
      setSuccess(t('passwordResetSuccess'));
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path) {
            errors[err.path[0]] = err.message;
          }
        });
        setValidationErrors(errors);
      } else if (error instanceof Error) {
        setError(error.message);
      } else {
        setError(t('genericError'));
      }
      console.error('Reset password error:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-900 dark:text-white">{t('resetYourPassword')}</h2>

        {success && (
          <div className="p-3 mb-4 text-sm text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded">
            {success}
          </div>
        )}

        {error && (
          <div className="p-3 mb-4 text-sm text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded">
            {error}
          </div>
        )}

        {!forgotPasswordSent ? (
          <form onSubmit={handleRequestCode} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('email')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 p-2 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                required
              />
              {validationErrors.email && (
                <p className="mt-1 text-sm text-red-500 dark:text-red-400">{validationErrors.email}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isForgotPasswordLoading}
              className="w-full bg-indigo-600 dark:bg-indigo-500 text-white py-2 px-4 rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isForgotPasswordLoading ? t('sending') : t('sendVerificationCode')}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('email')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 p-2 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                required
                readOnly
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('verificationCode')}</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="mt-1 p-2 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                required
              />
              {validationErrors.code && (
                <p className="mt-1 text-sm text-red-500 dark:text-red-400">{validationErrors.code}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('newPassword')}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 p-2 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                required
              />
              {validationErrors.password && (
                <p className="mt-1 text-sm text-red-500 dark:text-red-400">{validationErrors.password}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('confirmNewPassword')}</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 p-2 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                required
              />
              {validationErrors.confirmPassword && (
                <p className="mt-1 text-sm text-red-500 dark:text-red-400">{validationErrors.confirmPassword}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isForgotPasswordLoading}
              className="w-full bg-indigo-600 dark:bg-indigo-500 text-white py-2 px-4 rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isForgotPasswordLoading ? t('resetting') : t('resetPasswordButton')}
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <Link href="/auth/login" className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300">
            {t('backToLogin')}
          </Link>
        </div>
      </div>
    </div>
  );
}