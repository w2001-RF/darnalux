import { useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { SUPPORT_CATEGORY_LABELS, SUPPORT_STATUSES, SUPPORT_STATUS_LABELS, SUPPORT_STATUS_TONES } from '@darnalux/core';
import { listTickets } from '@darnalux/data/support';
import { AsyncList, Button, Chips, ListRow } from '../../../src/components/ui';
import { formatRelative } from '../../../src/lib/format';
import { useAsync } from '../../../src/lib/useAsync';

const FILTERS = [{ id: 'ALL', label: 'Tous' }, ...SUPPORT_STATUSES.map((s) => ({ id: s, label: SUPPORT_STATUS_LABELS[s] }))] as const;

export default function SupportScreen() {
  const router = useRouter();
  const [status, setStatus] = useState<string>('ALL');
  const state = useAsync(() => listTickets(status === 'ALL' ? '' : status), [status]);

  return (
    <>
      <Stack.Screen options={{ title: 'Support' }} />
      <AsyncList
        insetBottom
        state={state}
        data={state.data ?? []}
        keyExtractor={(t) => t.id}
        emptyTitle="Aucune conversation"
        header={
          <>
            <Button label="Nouvelle conversation" onPress={() => router.push('/support/new')} />
            <Chips options={FILTERS} value={status} onChange={setStatus} />
          </>
        }
        renderItem={({ item: t }) => (
          <ListRow
            title={t.subject}
            subtitle={t.support_messages[0]?.body}
            meta={`${SUPPORT_CATEGORY_LABELS[t.category]} · ${formatRelative(t.last_message_at)}`}
            badge={{ label: SUPPORT_STATUS_LABELS[t.status], tone: SUPPORT_STATUS_TONES[t.status] }}
            onPress={() => router.push(`/support/${t.id}`)}
          />
        )}
      />
    </>
  );
}
