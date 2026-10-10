import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { CHECKIN_STATUS_LABELS, CHECKIN_STATUS_TONES, PERMISSIONS, hasPermission } from '@darnalux/core';
import type { CheckinStatus } from '@darnalux/core';
import { listCheckinsByStatus, reviewCheckin } from '@darnalux/data/checkins';
import type { CheckinQueueRow } from '@darnalux/data/checkins';
import { toUserMessage } from '@darnalux/data/errors';
import { AsyncList, Badge, Banner, Button, Card, Chips, Field } from '../../src/components/ui';
import { useAuth } from '../../src/features/auth/AuthContext';
import { Guard } from '../../src/features/auth/Guard';
import { formatDate, formatDateTime } from '../../src/lib/format';
import { useAsync } from '../../src/lib/useAsync';
import { spacing, useTheme } from '../../src/theme';

type Filter = 'TO_REVIEW' | 'PENDING' | 'DONE';

const FILTERS: readonly { id: Filter; label: string }[] = [
  { id: 'TO_REVIEW', label: 'À valider' },
  { id: 'PENDING', label: 'En attente du voyageur' },
  { id: 'DONE', label: 'Traités' },
];

const STATUSES: Record<Filter, CheckinStatus[]> = {
  TO_REVIEW: ['SUBMITTED'],
  PENDING: ['PENDING', 'IN_PROGRESS', 'REJECTED'],
  DONE: ['VERIFIED'],
};

export default function CheckinsScreen() {
  return (
    <Guard anyOf={[PERMISSIONS.CHECKINS_VIEW]}>
      <CheckinsList />
    </Guard>
  );
}

function CheckinsList() {
  const { user } = useAuth();
  const canReview = hasPermission(user, PERMISSIONS.CHECKINS_MANAGE);
  const [filter, setFilter] = useState<Filter>('TO_REVIEW');
  const state = useAsync(() => listCheckinsByStatus(STATUSES[filter]), [filter]);

  return (
    <>
      <Stack.Screen options={{ title: 'Check-in / Check-out' }} />
      <AsyncList
        insetBottom
        state={state}
        data={state.data ?? []}
        keyExtractor={(c) => c.id}
        emptyTitle="Aucun check-in"
        emptyText="Rien à afficher pour ce filtre."
        header={<Chips options={FILTERS} value={filter} onChange={setFilter} />}
        renderItem={({ item }) => <CheckinCard checkin={item} canReview={canReview && item.status === 'SUBMITTED'} onChanged={state.reload} />}
      />
    </>
  );
}

function CheckinCard({ checkin: c, canReview, onChanged }: { checkin: CheckinQueueRow; canReview: boolean; onChanged: () => void }) {
  const router = useRouter();
  const theme = useTheme();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function review(status: 'VERIFIED' | 'REJECTED') {
    if (status === 'REJECTED' && !reason.trim()) {
      setError('Indiquez le motif du refus : il sera communiqué au voyageur.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await reviewCheckin(c.id, status, reason);
      onChanged();
    } catch (e) {
      setError(toUserMessage(e));
    } finally {
      setBusy(false);
    }
  }

  function confirmValidate() {
    Alert.alert('Valider le check-in', 'Confirmer que les pièces du voyageur sont conformes ?', [
      { text: 'Retour', style: 'cancel' },
      { text: 'Valider', onPress: () => void review('VERIFIED') },
    ]);
  }

  return (
    <Card onPress={c.reservations ? () => router.push(`/reservations/${c.reservation_id}`) : undefined}>
      <View style={styles.top}>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
          {c.guest_full_name ?? 'Voyageur à renseigner'}
        </Text>
        <Badge tone={CHECKIN_STATUS_TONES[c.status]} label={CHECKIN_STATUS_LABELS[c.status]} />
      </View>
      <Text style={{ color: theme.muted }}>
        {c.reservations?.properties?.name ?? '—'} · {c.reservations?.reference ?? ''}
      </Text>
      <Text style={[styles.meta, { color: theme.muted }]}>
        {c.reservations ? `${formatDate(c.reservations.check_in)} → ${formatDate(c.reservations.check_out)}` : ''}
        {c.submitted_at ? ` · envoyé le ${formatDateTime(c.submitted_at)}` : ''}
      </Text>
      {c.review_notes ? <Text style={{ color: theme.muted }}>Note : {c.review_notes}</Text> : null}

      {canReview ? (
        <View style={styles.actions}>
          {error ? <Banner message={error} /> : null}
          {rejecting ? (
            <>
              <Field label="Motif du refus" value={reason} onChangeText={setReason} multiline />
              <Button label="Confirmer le refus" variant="danger" loading={busy} onPress={() => void review('REJECTED')} />
              <Button label="Annuler" variant="ghost" onPress={() => setRejecting(false)} />
            </>
          ) : (
            <>
              <Button label="Valider" loading={busy} onPress={confirmValidate} />
              <Button label="Refuser…" variant="danger" onPress={() => setRejecting(true)} />
            </>
          )}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  title: { fontSize: 16, fontWeight: '600', flexShrink: 1 },
  meta: { fontSize: 12 },
  actions: { gap: spacing.sm, marginTop: spacing.sm },
});
