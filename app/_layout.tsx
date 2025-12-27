import { Stack } from 'expo-router';
import { AuthProvider } from '../src/context/AuthContext';
import { AuthGuard } from '../src/components/AuthGuard';
import { DebugLogProvider } from '../src/context/DebugLogContext';

export default function RootLayout() {
  // El manejo de deep links se hace en:
  // - [...unmatched].tsx para rutas no reconocidas (como cmlaplata://leads/123)
  // - AuthGuard.tsx para deep links pendientes después del login
  // NO duplicar listeners aquí para evitar race conditions

  return (
    <DebugLogProvider>
      <AuthProvider>
        <AuthGuard>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
          </Stack>
        </AuthGuard>
      </AuthProvider>
    </DebugLogProvider>
  );
}

