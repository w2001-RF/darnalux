import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { SUPPORT_CATEGORY_LABELS, SUPPORT_STATUS_LABELS, SUPPORT_STATUS_TONES } from '@darnalux/core';
import { toUserMessage } from '@darnalux/data/errors';
import { getTicket, listMessages, sendMessage } from '@darnalux/data/support';
import { Screen } from '../../../src/components/Screen';
import { Badge, Banner, Button, Empty, Field, Loading } from '../../../src/components/ui';
import { useAuth } from '../../../src/features/auth/AuthContext';
import { formatDateTime } from '../../../src/lib/format';
import { useAsync } from '../../../src/lib/useAsync';
import { spacing, useTheme } from '../../../src/theme';

export default function TicketScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const theme = useTheme();
  const ticket = useAsync(() => getTicket(id), [id]);
  const messages = useAsync(() => listMessages(id), [id]);
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (ticket.loading && !ticket.data) return <Loading />;
  if (ticket.error || !ticket.data) {
    return (
      <Screen insetBottom>
        <Banner message={ticket.error ?? 'Conversation introuvable.'} />
      </Screen>
    );
  }
  const t = ticket.data;

  async function send() {
    if (!user || !body.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await sendMessage(t.id, body.trim(), user.id);
      setBody('');
      messages.reload();
    } catch (e) {
      setError(toUserMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen insetBottom contentStyle={styles.content} onRefresh={messages.reload} refreshing={messages.loading}>
      <Stack.Screen options={{ title: t.subject }} />
      <View style={styles.badges}>
        <Badge tone={SUPPORT_STATUS_TONES[t.status]} label={SUPPORT_STATUS_LABELS[t.status]} />
        <Badge label={SUPPORT_CATEGORY_LABELS[t.category]} />
      </View>
      {error ? <Banner message={error} /> : null}

      {(messages.data ?? []).length === 0 && !messages.loading ? <Empty title="Aucun message" /> : null}
      {(messages.data ?? []).map((m) => {
        const mine = m.author_id === user?.id;
        return (
          <View
            key={m.id}
            style={[
              styles.bubble,
              mine ? styles.mine : styles.theirs,
              { backgroundColor: theme.surface, borderColor: mine ? theme.primary : theme.border },
            ]}
          >
            <Text style={{ color: theme.text, lineHeight: 21 }}>{m.body}</Text>
            <Text style={[styles.meta, { color: theme.muted }]}>
              {mine ? 'Vous' : 'Équipe'} · {formatDateTime(m.created_at)}
            </Text>
          </View>
        );
      })}

      {t.status !== 'CLOSED' ? (
        <>
          <Field label="Votre message" value={body} onChangeText={setBody} multiline />
          <Button label="Envoyer" onPress={() => void send()} loading={busy} disabled={!body.trim()} />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.sm },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  bubble: { borderWidth: 1, borderRadius: 12, padding: spacing.md, gap: spacing.xs, maxWidth: '90%' },
  mine: { alignSelf: 'flex-end' },
  theirs: { alignSelf: 'flex-start' },
  meta: { fontSize: 12 },
});
