import { Redirect, Tabs } from 'expo-router';
import { useAuth } from '../../src/features/auth/AuthContext';
import { useTheme } from '../../src/theme';

export default function AppLayout() {
  const { status } = useAuth();
  const theme = useTheme();

  if (status === 'signed-out') return <Redirect href="/login" />;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.primary,
        tabBarStyle: { backgroundColor: theme.surface, borderTopColor: theme.border },
        headerStyle: { backgroundColor: theme.surface },
        headerTintColor: theme.text,
      }}
    >
      <Tabs.Screen name="home" options={{ title: 'Accueil' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profil' }} />
    </Tabs>
  );
}
