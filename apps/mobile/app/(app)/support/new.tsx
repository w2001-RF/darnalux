import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SUPPORT_CATEGORIES, SUPPORT_CATEGORY_LABELS, SUPPORT_PRIORITIES, SUPPORT_PRIORITY_LABELS, validateSupportTicket } from '@darnalux/core';
import type { SupportTicketInput } from '@darnalux/core';
import { toUserMessage } from '@darnalux/data/errors';
import { createTicket } from '@darnalux/data/support';
import { Screen } from '../../../src/components/Screen';
import { Banner, Button, Chips, Field, SectionTitle } from '../../../src/components/ui';
import { useAuth } from '../../../src/features/auth/AuthContext';
import { spacing } from '../../../src/theme';

export default function NewTicketScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [input, setInput] = useState<SupportTicketInput>({ subject: '', category: 'TECHNICAL', priority: 'MEDIUM', message: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    const validation = validateSupportTicket(input);
    if (!validation.valid || !user) {
      setError(Object.values(validation.errors)[0] ?? 'Formulaire incomplet.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const id = await createTicket(input, user.id);
      router.replace(`/support/${id}`);
    } catch (e) {
      setError(toUserMessage(e));
      setBusy(false);
    }
  }

  return (
    <Screen insetBottom contentStyle={styles.content}>
      <Stack.Screen options={{ title: 'Nouvelle conversation' }} />
      {error ? <Banner message={error} /> : null}
      <Field label="Sujet" value={input.subject} onChangeText={(subject) => setInput((v) => ({ ...v, subject }))} />
      <SectionTitle title="Catégorie" />
      <Chips
        options={SUPPORT_CATEGORIES.map((c) => ({ id: c, label: SUPPORT_CATEGORY_LABELS[c] }))}
        value={input.category}
        onChange={(category) => setInput((v) => ({ ...v, category }))}
      />
      <SectionTitle title="Priorité" />
      <Chips
        options={SUPPORT_PRIORITIES.map((p) => ({ id: p, label: SUPPORT_PRIORITY_LABELS[p] }))}
        value={input.priority}
        onChange={(priority) => setInput((v) => ({ ...v, priority }))}
      />
      <Field label="Message" value={input.message} onChangeText={(message) => setInput((v) => ({ ...v, message }))} multiline />
      <Button label="Envoyer" onPress={() => void submit()} loading={busy} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.sm },
});
