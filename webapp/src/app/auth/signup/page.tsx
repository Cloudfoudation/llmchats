// src/app/signup/page.tsx
'use client'
import { SignupProvider } from '@/providers/SignupProvider';
import { Signup } from '@/components/auth/Signup';

export default function SignupPage() {
  return (
    <SignupProvider>
      <Signup />
    </SignupProvider>
  );
}