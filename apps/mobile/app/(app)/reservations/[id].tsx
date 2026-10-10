import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import {
  BOOKING_CHANNEL_LABELS,
  CHECKIN_STATUS_LABELS,
  CHECKIN_STATUS_TONES,
  PERMISSIONS,
  RESERVATION_STATUS_LABELS,
  RESERVATION_STATUS_TONES,
  computeReservationFinance,
  hasPermission,
  isPortalUser,
  nextReservationStatuses,
  nightsBetween,
  personFullName,
} from '@darnalux/core';
import type { ReservationStatus } from '@darnalux/core';
import { toUserMessage } from '@darnalux/data/errors';
import { listReservationExpenses } from '@darnalux/data/finance';
import { getReservation, setReservationStatus } from '@darnalux/data/reservations';
import { Screen } from '../../../src/components/Screen';
import { Badge, Banner, Button, Facts, Loading, SectionTitle } from '../../../src/components/ui';
import { useAuth } from '../../../src/features/auth/AuthContext';
import { Guard } from '../../../src/features/auth/Guard';
import { formatDate, formatMad } from '../../../src/lib/format';
import { useAsync } from '../../../src/lib/useAsync';
import { spacing, useTheme } from '../../../src/theme';

const TRANSITION_LABELS: Partial<Record<ReservationStatus, string>> = {
  CONFIRMED: 'Confirmer',
  CHECK_IN: 'Check-in effectué',
  IN_PROGRESS: 'Séjour en cours',
  CHECK_OUT: 'Check-out effectué',
  COMPLETED: 'Clôturer',
  CANCELLED: 'Annuler',
  NO_SHOW: 'No-show',
};

export default function ReservationDetailScreen() {
  return (
    <Guard anyOf={[PERMISSIONS.RESERVATIONS_VIEW, PERMISSIONS.OWNER_PORTAL]}>
      <ReservationDetail />
    </Guard>
  );
}

function ReservationDetail() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const theme = useTheme();
  const portal = isPortalUser(user);
  const canManage = hasPermission(user, PERMISSIONS.RESERVATIONS_MANAGE);
  const reservation = useAsync(() => getReservation(id, portal), [id, portal]);
  const expenses = useAsync(() => listReservationExpenses(id).catch(() => []), [id]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (reservation.loading && !reservation.data) return <Loading />;
  if (reservation.error || !reservation.data) {
    return (
      <Screen insetBottom>
        <Banner message={reservation.error ?? 'Réservation introuvable.'} />
      </Screen>
    );
  }
  const r = reservation.data;

  const expensesTotal = (expenses.data ?? []).filter((e) => e.charged_to_owner).reduce((sum, e) => sum + Number(e.amount), 0);
  const finance = computeReservationFinance({
    grossAmount: Number(r.gross_amount),
    commissionRate: Number(r.commission_rate),
    platformFees: Number(r.platform_fees),
    expenses: expensesTotal,
  });

  async function apply(status: ReservationStatus) {
    setBusy(true);
    setError(null);
    try {
      await setReservationStatus(r.id, status);
      reservation.reload();
    } catch (e) {
      setError(toUserMessage(e));
    } finally {
      setBusy(false);
    }
  }

  function changeStatus(status: ReservationStatus) {
    if (status === 'CANCELLED' || status === 'NO_SHOW') {
      Alert.alert('Confirmer', `Passer la réservation en « ${RESERVATION_STATUS_LABELS[status]} » ?`, [
        { text: 'Retour', style: 'cancel' },
        { text: 'Confirmer', style: 'destructive', onPress: () => void apply(status) },
      ]);
      return;
    }
    void apply(status);
  }

  return (
    <Screen insetBottom contentStyle={styles.content} onRefresh={reservation.reload} refreshing={reservation.loading}>
      <Stack.Screen options={{ title: `Réservation ${r.reference}` }} />
      <View style={styles.badges}>
        <Badge tone={RESERVATION_STATUS_TONES[r.status]} label={RESERVATION_STATUS_LABELS[r.status]} />
        {r.guests?.is_blacklisted ? <Badge tone="danger" label="Liste noire" /> : null}
        {r.checkins ? <Badge tone={CHECKIN_STATUS_TONES[r.checkins.status]} label={`Check-in : ${CHECKIN_STATUS_LABELS[r.checkins.status]}`} /> : null}
      </View>

      {error ? <Banner message={error} /> : null}

      {canManage && nextReservationStatuses(r.status).length > 0 ? (
        <View style={styles.actions}>
          {nextReservationStatuses(r.status).map((status) => (
            <Button
              key={status}
              label={TRANSITION_LABELS[status] ?? RESERVATION_STATUS_LABELS[status]}
              variant={status === 'CANCELLED' || status === 'NO_SHOW' ? 'danger' : 'primary'}
              disabled={busy}
              onPress={() => changeStatus(status)}
            />
          ))}
        </View>
      ) : null}

      <SectionTitle title="Séjour" />
      <Facts
        items={[
          { label: 'Bien', value: r.properties?.name ?? '—' },
          { label: 'Arrivée', value: formatDate(r.check_in) },
          { label: 'Départ', value: formatDate(r.check_out) },
          { label: 'Nuits', value: String(nightsBetween(r.check_in, r.check_out)) },
          { label: 'Voyageurs', value: String(r.guests_count) },
          { label: 'Source', value: BOOKING_CHANNEL_LABELS[r.source] },
          { label: 'Référence externe', value: r.external_reference ?? '—' },
          ...(portal ? [] : [{ label: 'Code serrure', value: r.smart_lock_code ?? '—' }]),
        ]}
      />
      {r.notes ? <Text style={{ color: theme.muted }}>{r.notes}</Text> : null}

      {!portal ? (
        <>
          <SectionTitle title="Voyageur" />
          {r.guests ? (
            <Button label={personFullName(r.guests.first_name, r.guests.last_name)} variant="ghost" onPress={() => router.push(`/guests/${r.guests?.id}`)} />
          ) : (
            <Text style={{ color: theme.muted }}>Aucun voyageur associé. La fiche sera créée à la validation du check-in en ligne.</Text>
          )}
        </>
      ) : null}

      <SectionTitle title="Finances" />
      <Facts
        items={[
          { label: 'Revenu brut', value: formatMad(finance.gross) },
          { label: `− Commission DarnaLux (${Number(r.commission_rate)} %)`, value: formatMad(finance.commission) },
          { label: '− Frais de plateforme', value: formatMad(finance.platformFees) },
          { label: '− Dépenses imputées', value: formatMad(finance.expenses) },
          { label: '= Net propriétaire', value: formatMad(finance.ownerNet) },
        ]}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.sm },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  actions: { gap: spacing.sm },
});
