import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, LogOut, Menu, ShieldCheck, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { PERMISSIONS, hasPermission } from '@darnalux/core';
import { useAuth } from '../features/auth/AuthContext';
import { Brand } from '../components/Brand';
import { Avatar, initialsOf } from '../components/Avatar';
import { ThemeToggle } from '../components/ThemeToggle';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

export default function AppLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  async function handleLogout() {
    await signOut();
    navigate('/', { replace: true });
  }

  const navItems: NavItem[] = [{ to: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard }];
  if (hasPermission(user, PERMISSIONS.USERS_VIEW)) {
    navItems.push({ to: '/app/users', label: 'Utilisateurs', icon: Users });
  }
  if (hasPermission(user, PERMISSIONS.ROLES_VIEW) || hasPermission(user, PERMISSIONS.ROLES_MANAGE)) {
    navItems.push({ to: '/app/roles', label: 'Rôles', icon: ShieldCheck });
  }

  const firstName = user?.profile?.firstName;
  const displayName = [firstName, user?.profile?.lastName].filter(Boolean).join(' ') || user?.email || 'DarnaLux';
  const initials = initialsOf(firstName, user?.profile?.lastName) === '?'
    ? initialsOf(user?.email)
    : initialsOf(firstName, user?.profile?.lastName);

  return (
    <div className="app">
      <div className={'scrim' + (menuOpen ? ' open' : '')} onClick={() => setMenuOpen(false)} aria-hidden="true" />
      <aside id="sidebar" className={'sidebar' + (menuOpen ? ' open' : '')} aria-label="Menu latéral">
        <Brand light />
        <div className="side-title">ESPACE DARNALUX</div>
        <nav className="side-nav" aria-label="Navigation de l'espace">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => 'side-link' + (isActive ? ' active' : '')}>
              <Icon size={19} aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="side-user">
          <Avatar initials={initials} />
          <div className="side-user-info">
            <strong>{displayName}</strong>
            <small>{user?.email ?? ''}</small>
          </div>
          <button type="button" className="icon-btn" onClick={handleLogout} aria-label="Se déconnecter" title="Se déconnecter">
            <LogOut size={18} aria-hidden="true" />
          </button>
        </div>
      </aside>
      <div className="app-main">
        <header className="app-header">
          <button
            type="button"
            className="icon-btn menu-btn"
            onClick={() => setMenuOpen(true)}
            aria-label="Ouvrir le menu"
            aria-controls="sidebar"
            aria-expanded={menuOpen}
          >
            <Menu size={20} aria-hidden="true" />
          </button>
          <div>
            <div className="eyebrow">DarnaLux</div>
            <h1>Bonjour, {firstName ?? user?.email ?? 'DarnaLux'}.</h1>
          </div>
          <div className="header-actions">
            <ThemeToggle />
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
