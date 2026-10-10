import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { PERMISSIONS, hasAnyPermission } from '@darnalux/core';
import { useAuth } from '../../../src/features/auth/AuthContext';
import { useTheme } from '../../../src/theme';

// Dependency-free tab glyphs (no icon package is installed).
function glyph(symbol: string) {
  return function TabGlyph({ color }: { color: string }) {
    return <Text style={{ color, fontSize: 20, lineHeight: 24 }}>{symbol}</Text>;
  };
}

export default function TabsLayout() {
  const { user } = useAuth();
  const theme = useTheme();
  const can = (permissions: string[]) => hasAnyPermission(user, permissions);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.muted,
        tabBarStyle: { backgroundColor: theme.surface, borderTopColor: theme.border },
        headerStyle: { backgroundColor: theme.surface },
        headerTintColor: theme.text,
      }}
    >
      <Tabs.Screen name="dashboard" options={{ title: 'Accueil', tabBarIcon: glyph('⌂') }} />
      <Tabs.Screen
        name="reservations"
        options={{ title: 'Réservations', tabBarIcon: glyph('▤'), href: can([PERMISSIONS.RESERVATIONS_VIEW]) ? undefined : null }}
      />
      <Tabs.Screen
        name="tasks"
        options={{ title: 'Tâches', tabBarIcon: glyph('✓'), href: can([PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_EXECUTE]) ? undefined : null }}
      />
      <Tabs.Screen
        name="leads"
        options={{ title: 'Demandes', tabBarIcon: glyph('✉'), href: can([PERMISSIONS.MARKETING_VIEW]) ? undefined : null }}
      />
      <Tabs.Screen name="more" options={{ title: 'Plus', tabBarIcon: glyph('☰') }} />
    </Tabs>
  );
}
