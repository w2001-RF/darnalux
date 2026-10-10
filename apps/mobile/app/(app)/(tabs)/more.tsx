import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { personFullName, visibleNavSections } from '@darnalux/core';
import { Screen } from '../../../src/components/Screen';
import { Card, ListRow, SectionTitle } from '../../../src/components/ui';
import { useAuth } from '../../../src/features/auth/AuthContext';
import { MOBILE_ROUTES } from '../../../src/navigation';
import { spacing, useTheme } from '../../../src/theme';

// Tabs already cover these modules; everything else is reached from here.
const IN_TABS = new Set(['dashboard', 'reservations', 'tasks', 'leads']);

export default function MoreScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const theme = useTheme();
  const sections = visibleNavSections(user)
    .map((s) => ({ ...s, items: s.items.filter((i) => !IN_TABS.has(i.id)) }))
    .filter((s) => s.items.length > 0);
  const name = personFullName(user?.profile?.firstName, user?.profile?.lastName) || user?.email || '';

  return (
    <Screen contentStyle={styles.content}>
      <Card onPress={() => router.push('/profile')}>
        <Text style={[styles.name, { color: theme.text }]}>{name}</Text>
        <Text style={{ color: theme.muted }}>{user?.email}</Text>
        <Text style={{ color: theme.primary, fontWeight: '600' }}>Mon profil</Text>
      </Card>

      {sections.map((section) => (
        <View key={section.title} style={styles.section}>
          <SectionTitle title={section.title} />
          {section.items.map((item) => {
            const route = MOBILE_ROUTES[item.id];
            return route ? (
              <ListRow key={item.id} title={item.label} onPress={() => router.push(route)} />
            ) : (
              <ListRow key={item.id} title={item.label} subtitle="Disponible sur la version web" />
            );
          })}
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.sm },
  name: { fontSize: 18, fontWeight: '700' },
  section: { gap: spacing.sm },
});
