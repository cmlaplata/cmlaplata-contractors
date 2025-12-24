import { Stack } from 'expo-router';
import { AuthProvider } from '../src/context/AuthContext';
import { AuthGuard } from '../src/components/AuthGuard';

export default function RootLayout() {
  return (
    <AuthProvider>
      <AuthGuard>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </AuthGuard>
    </AuthProvider>
  );
}

