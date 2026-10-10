import { StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import {
  GUEST_VERIFICATION_LABELS,
  GUEST_VERIFICATION_TONES,
  IDENTITY_DOCUMENT_LABELS,
  PERMISSIONS,
  RESERVATION_STATUS_LABELS,
  RESERVATION_STATUS_TONES,
  personFullName,
} from '@darnalux/core';
import { getGuest } from '@darnalux/data/guests';
import { listReservations } from '@darnalux/data/reservations';
import { Screen } from '../../../src/components/Screen';
import { Badge, Banner, Button, Facts, ListRow, Loading, SectionTitle } from '../../../src/components/ui';
import { Guard } from '../../../src/features/auth/Guard';
import { formatDate, formatDateTime } from '../../../src/lib/format';
import { callPhone, openMail, openWhatsapp } from '../../../src/lib/links';
import { useAsync } from '../../../src/lib/useAsync';
import { spacing, useTheme } from '../../../src/theme';

export default function GuestDetailScreen() {
  return (
    <Guard anyOf={[PERMISSIONS.GUESTS_VIEW]}>
      <GuestDetail />
    </Guard>
  );
}

function GuestDetail() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const guest = useAsync(() => getGuest(id), [id]);
  const stays = useAsync(() => listReservations({ guestId: id, limit: 20 }).catch(() => []), [id]);

  if (guest.loading && !guest.data) return <Loading />;
  if (guest.error || !guest.data) {
    return (
      <Screen insetBottom>
        <Banner message={guest.error ?? 'Voyageur introuvable.'} />
      </Screen>
    );
  }
  const g = guest.data;
  const name = personFullName(g.first_name, g.last_name);

  return (
    <Screen insetBottom contentStyle={styles.content} onRefresh={guest.reload} refreshing={guest.loading}>
      <Stack.Screen options={{ title: name }} />
      <View style={styles.badges}>
        <Badge tone={GUEST_VERIFICATION_TONES[g.verification_status]} label={GUEST_VERIFICATION_LABELS[g.verification_status]} />
        {g.is_blacklisted ? <Badge tone="danger" label="Liste noire" /> : null}
      </View>

      {g.is_blacklisted ? (
        <Banner message={`Voyageur sur liste noire${g.blacklist_reason ? ` : ${g.blacklist_reason}` : ''}${g.blacklisted_at ? ` (depuis le ${formatDateTime(g.blacklisted_at)})` : ''}.`} />
      ) : null}

      <Facts
        items={[
          { label: 'E-mail', value: g.email ?? '—' },
          { label: 'Téléphone', value: g.phone ?? '—' },
          { label: 'Nationalité', value: g.nationality ?? '—' },
          { label: 'Pièce d’identité', value: g.document_type ? `${IDENTITY_DOCUMENT_LABELS[g.document_type]} · ${g.document_number ?? '—'}` : '—' },
        ]}
      />

      {g.phone ? <Button label="Appeler" variant="ghost" onPress={() => void callPhone(g.phone ?? '')} /> : null}
      {g.phone ? <Button label="WhatsApp" variant="ghost" onPress={() => void openWhatsapp(g.phone, `Bonjour ${g.first_name},`)} /> : null}
      {g.email ? <Button label="Écrire un e-mail" variant="ghost" onPress={() => void openMail(g.email ?? '')} /> : null}

      {g.internal_notes ? (
        <>
          <SectionTitle title="Notes internes" />
          <Text style={{ color: theme.muted, lineHeight: 21 }}>{g.internal_notes}</Text>
        </>
      ) : null}

      <SectionTitle title="Séjours" />
      {(stays.data ?? []).length === 0 && !stays.loading ? <Text style={{ color: theme.muted }}>Aucun séjour enregistré.</Text> : null}
      {(stays.data ?? []).map((r) => (
        <ListRow
          key={r.id}
          title={r.properties?.name ?? r.reference}
          subtitle={`${formatDate(r.check_in)} → ${formatDate(r.check_out)}`}
          badge={{ label: RESERVATION_STATUS_LABELS[r.status], tone: RESERVATION_STATUS_TONES[r.status] }}
          onPress={() => router.push(`/reservations/${r.id}`)}
        />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.sm },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
