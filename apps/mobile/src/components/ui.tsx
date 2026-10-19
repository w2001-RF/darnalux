import type { ReactNode } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { ListRenderItem } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Tone } from '@darnalux/core';
import { MAX_CONTENT_WIDTH } from './Screen';
import type { AsyncState } from '../lib/useAsync';
import { spacing, toneColor, useTheme } from '../theme';

export function Badge({ tone = 'neutral', label }: { tone?: Tone; label: string }) {
  const theme = useTheme();
  const color = toneColor(theme, tone);
  return (
    <View style={[styles.badge, { borderColor: color }]}>
      <Text style={[styles.badgeText, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export function Card({ children, onPress }: { children: ReactNode; onPress?: () => void }) {
  const theme = useTheme();
  const style = [styles.card, { backgroundColor: theme.surface, borderColor: theme.border }];
  if (!onPress) return <View style={style}>{children}</View>;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [...style, pressed && styles.pressed]}>
      {children}
    </Pressable>
  );
}

/** Tappable list row: title and subtitle on the left, status badge or value on the right. */
export function ListRow({
  title,
  subtitle,
  meta,
  badge,
  right,
  onPress,
}: {
  title: string;
  subtitle?: string;
  meta?: string;
  badge?: { label: string; tone: Tone };
  right?: string;
  onPress?: () => void;
}) {
  const theme = useTheme();
  return (
    <Card onPress={onPress}>
      <View style={styles.rowTop}>
        <Text style={[styles.rowTitle, { color: theme.text }]} numberOfLines={1}>
          {title}
        </Text>
        {badge ? <Badge tone={badge.tone} label={badge.label} /> : right ? <Text style={{ color: theme.muted }}>{right}</Text> : null}
      </View>
      {subtitle ? (
        <Text style={{ color: theme.muted }} numberOfLines={2}>
          {subtitle}
        </Text>
      ) : null}
      {meta ? (
        <Text style={[styles.meta, { color: theme.muted }]} numberOfLines={1}>
          {meta}
        </Text>
      ) : null}
    </Card>
  );
}

export function StatTile({ label, value, note, tone }: { label: string; value: string | number; note?: string; tone?: Tone }) {
  const theme = useTheme();
  return (
    <View style={[styles.stat, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text style={[styles.statLabel, { color: theme.muted }]} numberOfLines={2}>
        {label}
      </Text>
      <Text style={[styles.statValue, { color: tone ? toneColor(theme, tone) : theme.text }]}>{value}</Text>
      {note ? (
        <Text style={[styles.meta, { color: theme.muted }]} numberOfLines={1}>
          {note}
        </Text>
      ) : null}
    </View>
  );
}

export function SectionTitle({ title, action }: { title: string; action?: { label: string; onPress: () => void } }) {
  const theme = useTheme();
  return (
    <View style={styles.sectionTitle}>
      <Text style={[styles.sectionText, { color: theme.text }]}>{title}</Text>
      {action ? (
        <Pressable accessibilityRole="link" onPress={action.onPress} hitSlop={8}>
          <Text style={{ color: theme.primary, fontWeight: '600' }}>{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Chips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
}) {
  const theme = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
      {options.map((option) => {
        const active = option.id === value;
        return (
          <Pressable
            key={option.id}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.id)}
            style={[
              styles.chip,
              { borderColor: active ? theme.primary : theme.border, backgroundColor: active ? theme.primary : theme.surface },
            ]}
          >
            <Text style={{ color: active ? theme.onPrimary : theme.text, fontWeight: '600', fontSize: 13 }}>{option.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'danger';
  disabled?: boolean;
  loading?: boolean;
}) {
  const theme = useTheme();
  const inactive = disabled || loading;
  const colors =
    variant === 'primary'
      ? { backgroundColor: theme.primary, borderColor: theme.primary, color: theme.onPrimary }
      : variant === 'danger'
        ? { backgroundColor: 'transparent', borderColor: theme.danger, color: theme.danger }
        : { backgroundColor: 'transparent', borderColor: theme.border, color: theme.text };
  return (
    <Pressable
      accessibilityRole="button"
      disabled={inactive}
      onPress={onPress}
      style={[styles.button, { backgroundColor: colors.backgroundColor, borderColor: colors.borderColor, opacity: inactive ? 0.5 : 1 }]}
    >
      {loading ? <ActivityIndicator color={colors.color} /> : <Text style={[styles.buttonText, { color: colors.color }]}>{label}</Text>}
    </Pressable>
  );
}

export function SearchBar({ value, onChangeText, placeholder }: { value: string; onChangeText: (text: string) => void; placeholder: string }) {
  const theme = useTheme();
  return (
    <TextInput
      style={[styles.search, { borderColor: theme.border, color: theme.text, backgroundColor: theme.surface }]}
      placeholder={placeholder}
      placeholderTextColor={theme.muted}
      value={value}
      onChangeText={onChangeText}
      autoCapitalize="none"
      autoCorrect={false}
      returnKeyType="search"
      clearButtonMode="while-editing"
    />
  );
}

export function Field({
  label,
  value,
  onChangeText,
  multiline,
  placeholder,
  editable = true,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  multiline?: boolean;
  placeholder?: string;
  editable?: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: theme.muted }]}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          { borderColor: theme.border, color: theme.text, backgroundColor: theme.surface, opacity: editable ? 1 : 0.6 },
        ]}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        placeholder={placeholder}
        placeholderTextColor={theme.muted}
        editable={editable}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
  );
}

export function Banner({ message, tone = 'danger' }: { message: string; tone?: Tone }) {
  const theme = useTheme();
  const color = toneColor(theme, tone);
  return (
    <View style={[styles.banner, { borderColor: color }]} accessibilityRole="alert">
      <Text style={{ color }}>{message}</Text>
    </View>
  );
}

export function Loading() {
  const theme = useTheme();
  return (
    <View style={styles.center}>
      <ActivityIndicator color={theme.primary} />
    </View>
  );
}

export function Empty({ title, text }: { title: string; text?: string }) {
  const theme = useTheme();
  return (
    <View style={styles.center}>
      <Text style={[styles.rowTitle, { color: theme.text }]}>{title}</Text>
      {text ? <Text style={{ color: theme.muted, textAlign: 'center' }}>{text}</Text> : null}
    </View>
  );
}

export function Facts({ items }: { items: readonly { label: string; value: string }[] }) {
  const theme = useTheme();
  return (
    <View>
      {items.map((item) => (
        <View key={item.label} style={[styles.fact, { borderBottomColor: theme.border }]}>
          <Text style={[styles.factLabel, { color: theme.muted }]}>{item.label}</Text>
          <Text style={[styles.factValue, { color: theme.text }]}>{item.value}</Text>
        </View>
      ))}
    </View>
  );
}

/**
 * Pull-to-refresh list wired to an async loader. The header (search, filters) stays
 * mounted while rows reload, so typing in a search box never loses focus.
 */
export function AsyncList<T>({
  state,
  data,
  renderItem,
  keyExtractor,
  header,
  emptyTitle,
  emptyText,
  insetBottom = false,
}: {
  state: AsyncState<unknown>;
  data: readonly T[];
  renderItem: ListRenderItem<T>;
  keyExtractor: (item: T) => string;
  header?: ReactNode;
  emptyTitle: string;
  emptyText?: string;
  insetBottom?: boolean;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <FlatList
      style={{ backgroundColor: theme.background }}
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={state.loading && state.data !== null} onRefresh={state.reload} tintColor={theme.primary} />}
      contentContainerStyle={[
        styles.list,
        {
          paddingLeft: spacing.md + insets.left,
          paddingRight: spacing.md + insets.right,
          paddingBottom: spacing.md + (insetBottom ? insets.bottom : 0),
        },
      ]}
      ItemSeparatorComponent={Separator}
      ListHeaderComponent={
        <View style={styles.listHeader}>
          {header}
          {state.error ? <Banner message={state.error} /> : null}
          {state.loading && state.data === null ? <Loading /> : null}
        </View>
      }
      ListEmptyComponent={state.loading || state.error ? null : <Empty title={emptyTitle} text={emptyText} />}
    />
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  badge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 2, alignSelf: 'flex-start' },
  badgeText: { fontSize: 12, fontWeight: '700' },
  card: { borderWidth: 1, borderRadius: 12, padding: spacing.md, gap: spacing.xs },
  pressed: { opacity: 0.7 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  rowTitle: { fontSize: 16, fontWeight: '600', flexShrink: 1 },
  meta: { fontSize: 12 },
  stat: { flexGrow: 1, flexBasis: '45%', borderWidth: 1, borderRadius: 12, padding: spacing.md, gap: 2 },
  statLabel: { fontSize: 12 },
  statValue: { fontSize: 24, fontWeight: '700' },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md },
  sectionText: { fontSize: 18, fontWeight: '700' },
  chips: { gap: spacing.sm, paddingVertical: spacing.xs },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  button: { borderWidth: 1, borderRadius: 10, paddingVertical: 13, paddingHorizontal: spacing.md, alignItems: 'center', minHeight: 48, justifyContent: 'center' },
  buttonText: { fontSize: 15, fontWeight: '600' },
  search: { borderWidth: 1, borderRadius: 10, paddingHorizontal: spacing.md, paddingVertical: 11, fontSize: 15 },
  field: { gap: 6 },
  fieldLabel: { fontSize: 12, fontWeight: '600' },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: spacing.md, paddingVertical: 11, fontSize: 15 },
  inputMultiline: { minHeight: 110 },
  banner: { borderWidth: 1, borderRadius: 10, padding: spacing.md },
  center: { alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.sm },
  fact: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth },
  factLabel: { fontSize: 14, flexShrink: 0 },
  factValue: { fontSize: 14, fontWeight: '500', flexShrink: 1, textAlign: 'right' },
  list: { paddingTop: spacing.md, flexGrow: 1, width: '100%', maxWidth: MAX_CONTENT_WIDTH + spacing.md * 2, alignSelf: 'center' },
  listHeader: { gap: spacing.sm, marginBottom: spacing.sm },
  separator: { height: spacing.sm },
});
