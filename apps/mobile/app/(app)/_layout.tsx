import { Redirect, Stack } from 'expo-router';
import { useAuth } from '../../src/features/auth/AuthContext';
import { useTheme } from '../../src/theme';

// Stack around the bottom tabs: every detail or secondary screen pushes on top of them.
export default function AppLayout() {
  const { status } = useAuth();
  const theme = useTheme();

  if (status === 'signed-out') return <Redirect href="/login" />;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.surface },
        headerTintColor: theme.text,
        contentStyle: { backgroundColor: theme.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}
