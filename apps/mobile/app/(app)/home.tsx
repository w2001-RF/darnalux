import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ReactNode } from 'react';
import { PERMISSIONS } from '@darnalux/core';
import { Can } from '../../src/features/auth/Can';
import { useAuth } from '../../src/features/auth/AuthContext';
import { spacing, useTheme } from '../../src/theme';

function Card({ title, body }: { title: string; body: string }): ReactNode {
  const theme = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text style={[styles.cardTitle, { color: theme.text }]}>{title}</Text>
      <Text style={{ color: theme.muted }}>{body}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const { user } = useAuth();
  const theme = useTheme();
  const name = user?.profile?.firstName ?? user?.email ?? '';

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
      <Text style={[styles.greeting, { color: theme.text }]}>Bonjour {name}</Text>

      <View style={styles.roles}>
        {user?.roles.map((role) => (
          <Text key={role} style={[styles.chip, { borderColor: theme.primary, color: theme.primary }]}>
            {role}
          </Text>
        ))}
      </View>

      <Can anyOf={[PERMISSIONS.DASHBOARD_VIEW]}>
        <Card title="Tableau de bord" body="Indicateurs d'exploitation, bientôt disponibles." />
      </Can>
      <Can anyOf={[PERMISSIONS.USERS_VIEW]}>
        <Card title="Utilisateurs" body="Gestion des comptes, disponible dans une prochaine phase." />
      </Can>
      <Can anyOf={[PERMISSIONS.ROLES_VIEW]}>
        <Card title="Rôles et permissions" body="Consultation des rôles, disponible dans une prochaine phase." />
      </Can>
      <Can anyOf={[PERMISSIONS.PROFILE_VIEW]}>
        <Card title="Mon profil" body="Consultez vos informations depuis l'onglet Profil." />
      </Can>

      <Text style={[styles.note, { color: theme.muted }]}>
        Fondation Phase 1 : authentification et rôles. Les modules métier arrivent dans les phases suivantes.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md },
  greeting: { fontSize: 24, fontWeight: '700' },
  roles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, fontSize: 12, fontWeight: '600' },
  card: { borderWidth: 1, borderRadius: 12, padding: spacing.md, gap: spacing.xs },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  note: { fontSize: 12, marginTop: spacing.md },
});
