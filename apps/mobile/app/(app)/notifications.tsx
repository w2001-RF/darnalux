import { Stack } from 'expo-router';
import { listNotifications, markAllRead, markRead } from '@darnalux/data/notifications';
import { AsyncList, Button, ListRow } from '../../src/components/ui';
import { formatRelative } from '../../src/lib/format';
import { useAsync } from '../../src/lib/useAsync';

export default function NotificationsScreen() {
  const state = useAsync(() => listNotifications(100), []);
  const rows = state.data ?? [];
  const unread = rows.filter((n) => !n.read_at).length;

  async function read(id: string) {
    await markRead(id).catch(() => undefined);
    state.reload();
  }

  async function readAll() {
    await markAllRead().catch(() => undefined);
    state.reload();
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Notifications' }} />
      <AsyncList
        insetBottom
        state={state}
        data={rows}
        keyExtractor={(n) => n.id}
        emptyTitle="Aucune notification"
        header={unread > 0 ? <Button label={`Tout marquer comme lu (${unread})`} variant="ghost" onPress={() => void readAll()} /> : undefined}
        renderItem={({ item: n }) => (
          <ListRow
            title={n.title}
            subtitle={n.body ?? undefined}
            meta={formatRelative(n.created_at)}
            badge={n.read_at ? undefined : { label: 'Nouveau', tone: 'gold' }}
            onPress={() => (n.read_at ? undefined : void read(n.id))}
          />
        )}
      />
    </>
  );
}
