import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import {
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_CATEGORY_TONES,
  MONTH_LABELS,
  PERMISSIONS,
  computePeriodPerformance,
  formatPercent,
  performanceByProperty,
  shiftMonth,
  startOfMonth,
  startOfNextMonth,
} from '@darnalux/core';
import { listExpenses } from '@darnalux/data/finance';
import { listPropertyOptions } from '@darnalux/data/properties';
import { listReservationsForPeriod } from '@darnalux/data/reservations';
import { Screen } from '../../src/components/Screen';
import { Badge, Banner, Card, Empty, Facts, Loading, SectionTitle, StatTile } from '../../src/components/ui';
import { Guard } from '../../src/features/auth/Guard';
import { formatDate, formatMad } from '../../src/lib/format';
import { useAsync } from '../../src/lib/useAsync';
import { spacing, useTheme } from '../../src/theme';

export default function FinanceScreen() {
  return (
    <Guard anyOf={[PERMISSIONS.FINANCE_VIEW, PERMISSIONS.OWNER_PORTAL]}>
      <Finance />
    </Guard>
  );
}

function Finance() {
  const theme = useTheme();
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), monthIndex: now.getMonth() });
  const from = startOfMonth(cursor.year, cursor.monthIndex);
  const to = startOfNextMonth(cursor.year, cursor.monthIndex);

  const data = useAsync(async () => {
    const [properties, reservations, expenses] = await Promise.all([listPropertyOptions(), listReservationsForPeriod(from, to), listExpenses(from, to)]);
    return { properties, reservations, expenses };
  }, [from, to]);

  const result = useMemo(() => {
    if (!data.data) return null;
    const active = data.data.properties.filter((p) => p.status === 'ACTIVE');
    const reservations = data.data.reservations.map((r) => ({
      propertyId: r.property_id,
      checkIn: r.check_in,
      checkOut: r.check_out,
      status: r.status,
      grossAmount: Number(r.gross_amount),
      commissionRate: Number(r.commission_rate),
      platformFees: Number(r.platform_fees),
    }));
    const expenses = data.data.expenses.map((e) => ({ propertyId: e.property_id, amount: Number(e.amount), incurredOn: e.incurred_on, chargedToOwner: e.charged_to_owner }));
    const total = computePeriodPerformance({ periodStart: from, periodEnd: to, propertyCount: active.length, reservations, expenses });
    const perProperty = performanceByProperty(
      active.map((p) => p.id),
      { periodStart: from, periodEnd: to, reservations, expenses },
    );
    return { total, perProperty, active };
  }, [data.data, from, to]);

  return (
    <Screen insetBottom contentStyle={styles.content} onRefresh={data.reload} refreshing={data.loading}>
      <Stack.Screen options={{ title: 'Revenus & finances' }} />
      <View style={styles.nav}>
        <Pressable accessibilityRole="button" accessibilityLabel="Mois précédent" hitSlop={10} onPress={() => setCursor((c) => shiftMonth(c.year, c.monthIndex, -1))}>
          <Text style={[styles.arrow, { color: theme.primary }]}>‹</Text>
        </Pressable>
        <Text style={[styles.month, { color: theme.text }]}>
          {MONTH_LABELS[cursor.monthIndex]} {cursor.year}
        </Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Mois suivant" hitSlop={10} onPress={() => setCursor((c) => shiftMonth(c.year, c.monthIndex, 1))}>
          <Text style={[styles.arrow, { color: theme.primary }]}>›</Text>
        </Pressable>
      </View>

      {data.error ? <Banner message={data.error} /> : null}
      {data.loading && !data.data ? <Loading /> : null}

      {result ? (
        <>
          <View style={styles.tiles}>
            <StatTile label="Revenus" value={formatMad(result.total.revenue)} />
            <StatTile label="Net propriétaires" value={formatMad(result.total.ownerNet)} />
            <StatTile label="Commissions" value={formatMad(result.total.commissions)} />
            <StatTile label="Occupation" value={formatPercent(result.total.occupancyRate)} note={`${result.total.nightsBooked} / ${result.total.nightsAvailable} nuits`} />
          </View>
          <Facts
            items={[
              { label: 'Réservations', value: String(result.total.reservations) },
              { label: 'Annulations', value: String(result.total.cancellations) },
              { label: 'Frais de plateforme', value: formatMad(result.total.platformFees) },
              { label: 'Dépenses imputées', value: formatMad(result.total.expenses) },
              { label: 'Prix moyen par nuit (ADR)', value: result.total.adr === null ? '—' : formatMad(result.total.adr) },
              { label: 'RevPAR', value: result.total.revpar === null ? '—' : formatMad(result.total.revpar) },
            ]}
          />

          <SectionTitle title="Par bien" />
          {result.active.length === 0 ? <Empty title="Aucun bien actif" /> : null}
          {result.active.map((p) => {
            const perf = result.perProperty.get(p.id);
            if (!perf) return null;
            return (
              <Card key={p.id}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>{p.name}</Text>
                <Text style={{ color: theme.muted }}>
                  {formatMad(perf.revenue)} · net {formatMad(perf.ownerNet)} · occupation {formatPercent(perf.occupancyRate, 0)}
                </Text>
              </Card>
            );
          })}

          <SectionTitle title="Dépenses du mois" />
          {(data.data?.expenses ?? []).length === 0 ? <Empty title="Aucune dépense" /> : null}
          {(data.data?.expenses ?? []).map((e) => (
            <Card key={e.id}>
              <View style={styles.top}>
                <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>
                  {e.description || EXPENSE_CATEGORY_LABELS[e.category]}
                </Text>
                <Text style={{ color: theme.text, fontWeight: '600' }}>{formatMad(Number(e.amount))}</Text>
              </View>
              <View style={styles.top}>
                <Text style={{ color: theme.muted }}>
                  {e.properties?.name ?? ''} · {formatDate(e.incurred_on)}
                </Text>
                <Badge tone={EXPENSE_CATEGORY_TONES[e.category]} label={EXPENSE_CATEGORY_LABELS[e.category]} />
              </View>
            </Card>
          ))}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.sm },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  arrow: { fontSize: 34, paddingHorizontal: spacing.md },
  month: { fontSize: 20, fontWeight: '700' },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  cardTitle: { fontSize: 16, fontWeight: '600', flexShrink: 1 },
});
