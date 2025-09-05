// src/hooks/useSignup.ts
import { useState, useCallback } from 'react';
import { SignupState } from '@/types/signup';
import { signUp, confirmSignUp, resendSignUpCode } from 'aws-amplify/auth';
import { AuthError } from '@aws-amplify/auth';

const initialState: SignupState = {
    step: 'SIGNUP',
    isLoading: false,
    error: null,
    message: null,
    email: null
};

export const useSignup = () => {
    const [state, setState] = useState<SignupState>(initialState);

    const updateState = useCallback((updates: Partial<SignupState>) => {
        setState(prev => ({ ...prev, ...updates }));
    }, []);

    const handleSignUp = async (email: string, password: string) => {
        try {
            updateState({ isLoading: true, error: null });

            console.log('Real API: Attempting signup for', email);
            
            // Check if we're in development environment for UI flow (not API calls)
            const isDev = process.env.NODE_ENV === 'development' || 
                         process.env.NEXT_PUBLIC_ENV === 'development' ||
                         window.location.hostname === 'localhost';
            
            // Always use real AWS Cognito API - no more mocking
            await signUp({
                username: email,
                password,
                options: {
                    userAttributes: {
                        email
                    }
                }
            });

            if (isDev) {
                // In dev environment, skip email verification step and redirect to login
                updateState({
                    isLoading: false,
                    step: 'SIGNUP',
                    email,
                    message: 'Account created successfully! Redirecting to login... (Dev mode: Email verification not required)'
                });
                
                // Auto-redirect to login page after a short delay
                setTimeout(() => {
                    window.location.href = '/auth/login';
                }, 3000);
            } else {
                // In production, require email verification
                updateState({
                    isLoading: false,
                    step: 'VERIFICATION',
                    email,
                    message: 'Please check your email for the verification code'
                });
            }
        } catch (error) {
            if (error instanceof AuthError) {
                if (error.name === 'UsernameExistsException') {
                    // Handle unconfirmed user case
                    console.log('User already exists, checking if confirmed...');
                    await handleUnconfirmedUser(email);
                    return; // Exit early since handleUnconfirmedUser manages the flow
                } else {
                    updateState({
                        error: error.message,
                        isLoading: false
                    });
                }
            } else {
                updateState({
                    error: 'An unexpected error occurred',
                    isLoading: false
                });
            }
            throw error;
        }
    };

    const handleVerifyEmail = async (email: string, code: string) => {
        try {
            updateState({ isLoading: true, error: null });

            await confirmSignUp({ username: email, confirmationCode: code });

            updateState({
                isLoading: false,
                message: 'Email verified successfully! You can now sign in.'
            });
        } catch (error) {
            updateState({
                error: error instanceof Error ? error.message : 'Verification failed',
                isLoading: false
            });
            throw error;
        }
    };

    const handleResendCode = async (email: string) => {
        try {
            updateState({ isLoading: true, error: null });

            await resendSignUpCode({
                username: email
            });

            updateState({
                isLoading: false,
                message: 'A new verification code has been sent to your email'
            });
        } catch (error) {
            updateState({
                error: error instanceof Error ? error.message : 'Failed to resend code',
                isLoading: false
            });
            throw error;
        }
    };

    const clearError = useCallback(() => {
        updateState({ error: null });
    }, [updateState]);

    const setStep = useCallback((step: SignupState['step']) => {
        updateState({ step });
    }, [updateState]);

    const handleUnconfirmedUser = async (email: string) => {
        try {
            updateState({ isLoading: true, error: null });

            // Check if we're in development environment
            const isDev = process.env.NODE_ENV === 'development' || 
                         process.env.NEXT_PUBLIC_ENV === 'development' ||
                         window.location.hostname === 'localhost';

            if (isDev) {
                // In dev, inform user and provide options
                console.log('Dev mode: User exists but unconfirmed');
                updateState({
                    isLoading: false,
                    step: 'SIGNUP',
                    email,
                    message: `Account created but needs confirmation. 
                    
                    DEV OPTIONS:
                    1. Ask admin to confirm your account in AWS Cognito
                    2. Use AdminCreateUser API with confirmed status
                    3. Set up Lambda trigger for auto-confirmation
                    
                    See COGNITO_DEV_SETUP.md for details. Redirecting to login...`
                });
                
                // Auto-redirect to login after delay
                setTimeout(() => {
                    window.location.href = '/auth/login';
                }, 8000);
            } else {
                // In production, resend confirmation code
                await resendSignUpCode({ username: email });
                updateState({
                    isLoading: false,
                    step: 'VERIFICATION',
                    email,
                    message: 'Account exists but not verified. A new verification code has been sent to your email.'
                });
            }
        } catch (error) {
            console.error('Error handling unconfirmed user:', error);
            updateState({
                error: 'Failed to handle unconfirmed user. Please contact support.',
                isLoading: false
            });
        }
    };

    return {
        ...state,
        signUp: handleSignUp,
        verifyEmail: handleVerifyEmail,
        resendCode: handleResendCode,
        handleUnconfirmedUser,
        clearError,
        setStep
    };
};