import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { listNotifications, markAllRead, markRead } from '../../features/notifications/api';
import type { NotificationRow } from '../../features/notifications/api';
import { useAsync } from '../../lib/useAsync';
import { formatRelative } from '../../lib/format';
import { EmptyState, PageHeader } from '../../components/ui';
import { ErrorAlert, Loading } from '../../components/Feedback';

export default function NotificationsPage() {
  const navigate = useNavigate();
  const notifications = useAsync(() => listNotifications(), []);
  const unread = (notifications.data ?? []).filter((n) => !n.read_at).length;

  async function open(notification: NotificationRow) {
    if (!notification.read_at) await markRead(notification.id).catch(() => undefined);
    if (notification.link?.startsWith('/app/')) navigate(notification.link);
    else notifications.reload();
  }

  return (
    <div className="page-stack">
      <PageHeader
        title="Notifications"
        subtitle={unread ? `${unread} non lue(s)` : 'Tout est à jour.'}
        actions={
          unread > 0 && (
            <button type="button" className="btn btn-ghost" onClick={() => markAllRead().then(notifications.reload)}>
              <CheckCheck size={16} aria-hidden="true" /> Tout marquer comme lu
            </button>
          )
        }
      />
      {notifications.loading && <Loading />}
      {notifications.error && <ErrorAlert>{notifications.error}</ErrorAlert>}
      {notifications.data && notifications.data.length === 0 && <EmptyState icon={Bell} title="Aucune notification" text="Nouvelles réservations, annulations, tâches et vérifications apparaîtront ici." />}
      {notifications.data && notifications.data.length > 0 && (
        <ul className="notification-list">
          {notifications.data.map((n) => (
            <li key={n.id}>
              <button type="button" className={'notification' + (n.read_at ? '' : ' unread')} onClick={() => open(n)}>
                <span className="notification-dot" aria-hidden="true" />
                <span className="notification-body">
                  <strong>{n.title}</strong>
                  {n.body && <span className="dim">{n.body}</span>}
                </span>
                <span className="dim small">{formatRelative(n.created_at)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
