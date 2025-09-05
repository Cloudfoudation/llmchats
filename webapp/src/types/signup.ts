// src/types/signup.ts
import { z } from 'zod';

export const signupSchema = {
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: z.string()
};

export type SignupState = {
  step: 'SIGNUP' | 'VERIFICATION';
  isLoading: boolean;
  error: string | null;
  message: string | null;
  email: string | null;
};

export interface SignupContextType extends SignupState {
  signUp: (email: string, password: string) => Promise<void>;
  verifyEmail: (email: string, code: string) => Promise<void>;
  resendCode: (email: string) => Promise<void>;
  handleUnconfirmedUser: (email: string) => Promise<void>;
  clearError: () => void;
  setStep: (step: SignupState['step']) => void;
}