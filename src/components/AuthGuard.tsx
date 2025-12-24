import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from '../context/AuthContext';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading, user } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      // Redirigir según tipo de usuario
      if (user?.userType === 'Admin' || user?.userType === 'Manager') {
        router.replace('/(tabs)/dashboard');
      } else if (user?.userType === 'Seller') {
        router.replace('/(tabs)/dashboard');
      } else {
        router.replace('/(tabs)/dashboard');
      }
    }
  }, [isAuthenticated, loading, segments, user]);

  return <>{children}</>;
}

