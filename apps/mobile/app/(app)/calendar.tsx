import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import {
  MONTH_LABELS,
  PERMISSIONS,
  RESERVATION_STATUS_LABELS,
  RESERVATION_STATUS_TONES,
  WEEKDAY_LABELS,
  addDays,
  buildMonthGrid,
  isBlockingReservationStatus,
  personFullName,
  shiftMonth,
  stayDayRole,
  toLocalISODate,
} from '@darnalux/core';
import { listReservationsBetween } from '@darnalux/data/reservations';
import { Screen } from '../../src/components/Screen';
import { Banner, Button, Empty, ListRow, SectionTitle } from '../../src/components/ui';
import { Guard } from '../../src/features/auth/Guard';
import { formatShortDay } from '../../src/lib/format';
import { useAsync } from '../../src/lib/useAsync';
import { spacing, useTheme } from '../../src/theme';

const ROLE_LABELS = { CHECK_IN: 'Arrivée', CHECK_OUT: 'Départ' } as const;

export default function CalendarScreen() {
  return (
    <Guard anyOf={[PERMISSIONS.RESERVATIONS_VIEW, PERMISSIONS.OWNER_PORTAL]}>
      <Calendar />
    </Guard>
  );
}

function Calendar() {
  const router = useRouter();
  const theme = useTheme();
  const today = toLocalISODate(new Date());
  const [cursor, setCursor] = useState(() => ({ year: Number(today.slice(0, 4)), monthIndex: Number(today.slice(5, 7)) - 1 }));
  const [selected, setSelected] = useState(today);

  const weeks = useMemo(() => buildMonthGrid(cursor.year, cursor.monthIndex), [cursor]);
  const gridStart = weeks[0][0].date;
  const gridEnd = weeks[weeks.length - 1][6].date;
  const reservations = useAsync(() => listReservationsBetween(gridStart, addDays(gridEnd, 1)), [gridStart, gridEnd]);
  const stays = useMemo(() => (reservations.data ?? []).filter((r) => isBlockingReservationStatus(r.status)), [reservations.data]);

  function countOn(day: string): number {
    return stays.filter((r) => stayDayRole({ checkIn: r.check_in, checkOut: r.check_out }, day) !== null).length;
  }

  const dayStays = stays
    .map((r) => ({ r, role: stayDayRole({ checkIn: r.check_in, checkOut: r.check_out }, selected) }))
    .filter((e) => e.role !== null);

  return (
    <Screen insetBottom contentStyle={styles.content} onRefresh={reservations.reload} refreshing={reservations.loading}>
      <Stack.Screen options={{ title: 'Calendrier' }} />
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
      <Button
        label="Aujourd'hui"
        variant="ghost"
        onPress={() => {
          setCursor({ year: Number(today.slice(0, 4)), monthIndex: Number(today.slice(5, 7)) - 1 });
          setSelected(today);
        }}
      />

      {reservations.error ? <Banner message={reservations.error} /> : null}

      <View style={styles.weekRow}>
        {WEEKDAY_LABELS.map((d) => (
          <Text key={d} style={[styles.weekday, { color: theme.muted }]}>
            {d}
          </Text>
        ))}
      </View>
      {weeks.map((week) => (
        <View key={week[0].date} style={styles.weekRow}>
          {week.map((day) => {
            const count = countOn(day.date);
            const isSelected = day.date === selected;
            return (
              <Pressable
                key={day.date}
                accessibilityRole="button"
                accessibilityLabel={`${day.date}, ${count} séjour(s)`}
                onPress={() => setSelected(day.date)}
                style={[
                  styles.cell,
                  { borderColor: isSelected ? theme.primary : theme.border, backgroundColor: isSelected ? theme.surface : 'transparent', opacity: day.inMonth ? 1 : 0.4 },
                ]}
              >
                <Text style={{ color: day.date === today ? theme.primary : theme.text, fontWeight: day.date === today ? '700' : '500' }}>{Number(day.date.slice(8, 10))}</Text>
                {count > 0 ? (
                  <View style={[styles.dot, { backgroundColor: theme.primary }]}>
                    <Text style={[styles.dotText, { color: theme.onPrimary }]}>{count}</Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ))}

      <SectionTitle title={formatShortDay(selected)} />
      {dayStays.length === 0 && !reservations.loading ? <Empty title="Aucun séjour ce jour" /> : null}
      {dayStays.map(({ r, role }) => (
        <ListRow
          key={r.id}
          title={r.properties?.name ?? r.reference}
          subtitle={r.guests ? personFullName(r.guests.first_name, r.guests.last_name) : r.reference}
          meta={role === 'CHECK_IN' || role === 'CHECK_OUT' ? ROLE_LABELS[role] : 'Séjour en cours'}
          badge={{ label: RESERVATION_STATUS_LABELS[r.status], tone: RESERVATION_STATUS_TONES[r.status] }}
          onPress={() => router.push(`/reservations/${r.id}`)}
        />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.sm },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  arrow: { fontSize: 34, paddingHorizontal: spacing.md },
  month: { fontSize: 20, fontWeight: '700' },
  weekRow: { flexDirection: 'row', gap: 4 },
  weekday: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '600' },
  cell: { flex: 1, aspectRatio: 1, borderWidth: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center', gap: 2 },
  dot: { minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  dotText: { fontSize: 11, fontWeight: '700' },
});
