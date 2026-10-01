import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
import { countUnread, subscribeToNotifications } from '../features/notifications/api';

export function NotificationBell() {
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(() => {
    countUnread()
      .then(setUnread)
      .catch(() => setUnread(0));
  }, []);

  useEffect(() => {
    if (!user) return;
    refresh();
    const unsubscribe = subscribeToNotifications(user.id, refresh);
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    return () => {
      unsubscribe();
      window.removeEventListener('focus', onFocus);
    };
  }, [user, refresh]);

  return (
    <Link to="/app/notifications" className="icon-btn bell" aria-label={`Notifications${unread ? ` (${unread} non lues)` : ''}`}>
      <Bell size={19} aria-hidden="true" />
      {unread > 0 && <span className="bell-count">{unread > 99 ? '99+' : unread}</span>}
    </Link>
  );
}
