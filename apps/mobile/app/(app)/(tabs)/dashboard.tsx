import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  PERMISSIONS,
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_TONES,
  addDays,
  compareTasks,
  computePeriodPerformance,
  formatPercent,
  hasPermission,
  isBlockingReservationStatus,
  isTaskOverdue,
  personFullName,
  startOfMonth,
  startOfNextMonth,
  toLocalISODate,
} from '@darnalux/core';
import { loadDashboardCounts } from '@darnalux/data/dashboard';
import { listReservationsBetween, listReservationsForPeriod } from '@darnalux/data/reservations';
import { listExpenses } from '@darnalux/data/finance';
import { listTasks } from '@darnalux/data/tasks';
import { Screen } from '../../../src/components/Screen';
import { Banner, Empty, ListRow, SectionTitle, StatTile } from '../../../src/components/ui';
import { useAuth } from '../../../src/features/auth/AuthContext';
import { formatDateTime, formatMad, formatShortDay } from '../../../src/lib/format';
import { useAsync } from '../../../src/lib/useAsync';
import { spacing, useTheme } from '../../../src/theme';

export default function DashboardScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const theme = useTheme();
  const now = new Date();
  const today = toLocalISODate(now);
  const monthStart = startOfMonth(now.getFullYear(), now.getMonth());
  const monthEnd = startOfNextMonth(now.getFullYear(), now.getMonth());
  const can = (p: string) => hasPermission(user, p);

  const counts = useAsync(() => loadDashboardCounts(today, `${monthStart}T00:00:00`), [today, monthStart]);
  const month = useAsync(async () => {
    if (!can(PERMISSIONS.FINANCE_VIEW) && !can(PERMISSIONS.RESERVATIONS_VIEW)) return null;
    const [reservations, expenses] = await Promise.all([
      listReservationsForPeriod(monthStart, monthEnd),
      can(PERMISSIONS.FINANCE_VIEW) ? listExpenses(monthStart, monthEnd) : Promise.resolve([]),
    ]);
    return { reservations, expenses };
  }, [monthStart, monthEnd]);
  const upcoming = useAsync(
    () => (can(PERMISSIONS.RESERVATIONS_VIEW) ? listReservationsBetween(addDays(today, 0), addDays(today, 8)) : Promise.resolve([])),
    [today],
  );
  const tasks = useAsync(
    () => (can(PERMISSIONS.TASKS_VIEW) || can(PERMISSIONS.TASKS_EXECUTE) ? listTasks({ openOnly: true, limit: 50 }) : Promise.resolve([])),
    [],
  );

  const perf = useMemo(() => {
    if (!month.data || counts.data?.activeProperties == null) return null;
    return computePeriodPerformance({
      periodStart: monthStart,
      periodEnd: monthEnd,
      propertyCount: counts.data.activeProperties,
      reservations: month.data.reservations.map((r) => ({
        propertyId: r.property_id,
        checkIn: r.check_in,
        checkOut: r.check_out,
        status: r.status,
        grossAmount: Number(r.gross_amount),
        commissionRate: Number(r.commission_rate),
        platformFees: Number(r.platform_fees),
      })),
      expenses: month.data.expenses.map((e) => ({
        propertyId: e.property_id,
        amount: Number(e.amount),
        incurredOn: e.incurred_on,
        chargedToOwner: e.charged_to_owner,
      })),
    });
  }, [month.data, counts.data, monthStart, monthEnd]);

  const nextArrivals = (upcoming.data ?? [])
    .filter((r) => isBlockingReservationStatus(r.status) && r.check_in >= today && r.check_in <= addDays(today, 7))
    .sort((a, b) => a.check_in.localeCompare(b.check_in))
    .slice(0, 6);
  const priorityTasks = [...(tasks.data ?? [])]
    .sort((a, b) => compareTasks({ ...a, dueAt: a.due_at }, { ...b, dueAt: b.due_at }))
    .filter((t) => t.priority === 'URGENT' || t.priority === 'HIGH' || isTaskOverdue({ ...t, dueAt: t.due_at }, now))
    .slice(0, 5);
  const c = counts.data;
  const name = user?.profile?.firstName ?? user?.email ?? '';
  const refreshing = counts.loading || month.loading || upcoming.loading || tasks.loading;

  function reloadAll() {
    counts.reload();
    month.reload();
    upcoming.reload();
    tasks.reload();
  }

  return (
    <Screen onRefresh={reloadAll} refreshing={refreshing} contentStyle={styles.content}>
      <Text style={[styles.greeting, { color: theme.text }]}>Bonjour {name}</Text>
      <View style={styles.roles}>
        {user?.roles.map((role) => (
          <Text key={role} style={[styles.chip, { borderColor: theme.primary, color: theme.primary }]}>
            {role}
          </Text>
        ))}
      </View>

      {counts.error ? <Banner message={counts.error} /> : null}

      {c ? (
        <View style={styles.tiles}>
          {can(PERMISSIONS.PROPERTIES_VIEW) && c.activeProperties !== null ? (
            <StatTile label="Biens actifs" value={c.activeProperties} note={`${c.properties ?? 0} au total`} />
          ) : null}
          {can(PERMISSIONS.RESERVATIONS_VIEW) && c.openReservations !== null ? (
            <StatTile label="Réservations en cours / à venir" value={c.openReservations} />
          ) : null}
          {can(PERMISSIONS.RESERVATIONS_VIEW) && c.checkInsToday !== null ? <StatTile label="Check-ins du jour" value={c.checkInsToday} /> : null}
          {can(PERMISSIONS.RESERVATIONS_VIEW) && c.checkOutsToday !== null ? <StatTile label="Check-outs du jour" value={c.checkOutsToday} /> : null}
          {(can(PERMISSIONS.TASKS_VIEW) || can(PERMISSIONS.TASKS_EXECUTE)) && c.openTasks !== null ? (
            <StatTile
              label={can(PERMISSIONS.TASKS_VIEW) ? 'Tâches en attente' : 'Mes tâches en attente'}
              value={c.openTasks}
              note={c.urgentTasks ? `${c.urgentTasks} urgente(s)` : 'Aucune urgence'}
              tone={c.urgentTasks ? 'danger' : undefined}
            />
          ) : null}
          {can(PERMISSIONS.CHECKINS_VIEW) && c.pendingVerifications !== null ? (
            <StatTile label="Vérifications à valider" value={c.pendingVerifications} tone={c.pendingVerifications ? 'danger' : undefined} />
          ) : null}
          {perf && can(PERMISSIONS.RESERVATIONS_VIEW) ? (
            <StatTile label="Occupation du mois" value={formatPercent(perf.occupancyRate)} note={`${perf.nightsBooked} nuits réservées`} />
          ) : null}
          {perf && can(PERMISSIONS.FINANCE_VIEW) ? (
            <StatTile label="Revenus du mois" value={formatMad(perf.revenue)} note={`Commissions ${formatMad(perf.commissions)}`} />
          ) : null}
          {can(PERMISSIONS.CHECKINS_VIEW) && c.incidents !== null ? (
            <StatTile label="Incidents (mois)" value={c.incidents} tone={c.incidents ? 'danger' : undefined} />
          ) : null}
        </View>
      ) : null}

      {can(PERMISSIONS.RESERVATIONS_VIEW) ? (
        <View style={styles.block}>
          <SectionTitle title="Prochains check-ins (7 jours)" action={{ label: 'Voir tout', onPress: () => router.push('/reservations') }} />
          {!upcoming.loading && nextArrivals.length === 0 ? <Empty title="Aucune arrivée prévue" /> : null}
          {nextArrivals.map((r) => (
            <ListRow
              key={r.id}
              title={r.properties?.name ?? r.reference}
              subtitle={r.guests ? personFullName(r.guests.first_name, r.guests.last_name) : r.reference}
              right={formatShortDay(r.check_in)}
              onPress={() => router.push(`/reservations/${r.id}`)}
            />
          ))}
        </View>
      ) : null}

      {can(PERMISSIONS.TASKS_VIEW) || can(PERMISSIONS.TASKS_EXECUTE) ? (
        <View style={styles.block}>
          <SectionTitle title="Tâches prioritaires" action={{ label: 'Voir tout', onPress: () => router.push('/tasks') }} />
          {!tasks.loading && priorityTasks.length === 0 ? <Empty title="Rien d'urgent" /> : null}
          {priorityTasks.map((t) => (
            <ListRow
              key={t.id}
              title={t.title}
              subtitle={`${t.properties?.name ?? ''} · ${formatDateTime(t.due_at)}`}
              badge={{ label: TASK_PRIORITY_LABELS[t.priority], tone: TASK_PRIORITY_TONES[t.priority] }}
              onPress={() => router.push(`/tasks/${t.id}`)}
            />
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md },
  greeting: { fontSize: 24, fontWeight: '700' },
  roles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, fontSize: 12, fontWeight: '600' },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  block: { gap: spacing.sm },
});
