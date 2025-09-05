// src/providers/SignupProvider.tsx
import React, { createContext, useContext } from 'react';
import { SignupContextType } from '@/types/signup';
import { useSignup } from '@/hooks/useSignup';

const SignupContext = createContext<SignupContextType | undefined>(undefined);

export const SignupProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const signup = useSignup();

  return (
    <SignupContext.Provider value={signup}>
      {children}
    </SignupContext.Provider>
  );
};

export const useSignupContext = () => {
  const context = useContext(SignupContext);
  if (!context) {
    throw new Error('useSignupContext must be used within a SignupProvider');
  }
  return context;
};