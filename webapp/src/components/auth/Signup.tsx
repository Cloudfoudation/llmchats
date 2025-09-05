// src/components/signup/Signup.tsx
import { useSignupContext } from '@/providers/SignupProvider';
import { SignupForm } from './SignupForm';
import { VerificationForm } from './VerificationForm';

export const Signup = () => {
  const { step, error, message } = useSignupContext();

  return (
    step === 'SIGNUP' ? <SignupForm /> : <VerificationForm />
  );
};