// src/hoc/withUnauth.tsx

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/providers/AuthProvider';
import LoadingScreen from '@/components/LoadingScreen';

export function withUnauth<P extends object>(
  WrappedComponent: React.ComponentType<P>
) {
  return function WithUnauthComponent(props: P) {
    const { isAuthenticated, isLoading } = useAuthContext();
    const router = useRouter();

    useEffect(() => {
      if (!isLoading && isAuthenticated) {
        router.replace('/');
      }
    }, [isAuthenticated, router]);

    if (isLoading) {
      return <LoadingScreen />;
    }

    if (isAuthenticated) {
      return null;
    }

    return <WrappedComponent {...props} />;
  };
}