import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../src/features/auth/AuthContext';
import { spacing, useTheme } from '../../src/theme';

function Row({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.row, { borderBottomColor: theme.border }]}>
      <Text style={{ color: theme.muted }}>{label}</Text>
      <Text style={{ color: theme.text, fontWeight: '500' }}>{value}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const theme = useTheme();
  const profile = user?.profile;
  const fullName = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ');

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Row label="Nom" value={fullName || '—'} />
      <Row label="Email" value={user?.email ?? '—'} />
      <Row label="Téléphone" value={profile?.phone ?? '—'} />
      <Row label="Rôles" value={user?.roles.join(', ') || '—'} />

      <Pressable
        accessibilityRole="button"
        onPress={signOut}
        style={[styles.button, { borderColor: theme.danger }]}
      >
        <Text style={{ color: theme.danger, fontWeight: '600' }}>Se déconnecter</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, gap: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1 },
  button: { marginTop: spacing.lg, borderWidth: 1, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
});
