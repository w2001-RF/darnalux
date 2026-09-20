import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { PERMISSIONS, hasPermission } from '@darnalux/core';
import { useAuth } from '../features/auth/AuthContext';

export default function AppLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await signOut();
    navigate('/', { replace: true });
  }

  const initials = (user?.profile?.firstName?.[0] ?? user?.email?.[0] ?? '?').toUpperCase();

  return (
    <div className="app">
      <aside>
        <Link to="/" className="brand"><span className="brand-mark">D</span><span>Darna<span>Lux</span></span></Link>
        <div className="side-title">ESPACE DARNA LUX</div>
        <NavLink to="/app/dashboard" className={({ isActive }) => 'side-link' + (isActive ? ' active' : '')}>
          Dashboard
        </NavLink>
        {hasPermission(user, PERMISSIONS.USERS_VIEW) && (
          <NavLink to="/app/users" className={({ isActive }) => 'side-link' + (isActive ? ' active' : '')}>
            Utilisateurs
          </NavLink>
        )}
        {(hasPermission(user, PERMISSIONS.ROLES_VIEW) || hasPermission(user, PERMISSIONS.ROLES_MANAGE)) && (
          <NavLink to="/app/roles" className={({ isActive }) => 'side-link' + (isActive ? ' active' : '')}>
            Rôles
          </NavLink>
        )}
      </aside>
      <section className="app-main">
        <div className="app-header">
          <div>
            <div className="eyebrow">DARNA LUX</div>
            <h1>Bonjour, {user?.profile?.firstName ?? user?.email ?? 'DarnaLux'}.</h1>
          </div>
          <div className="user-menu">
            <div className="user">{initials}</div>
            <button type="button" className="secondary" onClick={handleLogout}>Se déconnecter</button>
          </div>
        </div>
        <Outlet />
      </section>
    </div>
  );
}
