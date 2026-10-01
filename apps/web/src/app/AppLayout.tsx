import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Menu } from 'lucide-react';
import { hasAnyPermission, personFullName } from '@darnalux/core';
import { useAuth } from '../features/auth/AuthContext';
import { isPortalUser } from '../features/auth/portal';
import { Brand } from '../components/Brand';
import { Avatar, initialsOf } from '../components/Avatar';
import { ThemeToggle } from '../components/ThemeToggle';
import { NAV_SECTIONS } from './navigation';
import { GlobalSearch } from './GlobalSearch';
import { NotificationBell } from './NotificationBell';

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

  const portal = isPortalUser(user);
  const sections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) => (!item.portalOnly || portal) && (item.anyOf.length === 0 || hasAnyPermission(user, item.anyOf)),
    ),
  })).filter((section) => section.items.length > 0);

  const firstName = user?.profile?.firstName;
  const lastName = user?.profile?.lastName;
  const displayName = personFullName(firstName, lastName) || user?.email || 'DarnaLux';
  const initials = initialsOf(firstName, lastName) === '?' ? initialsOf(user?.email) : initialsOf(firstName, lastName);

  return (
    <div className="app">
      <div className={'scrim' + (menuOpen ? ' open' : '')} onClick={() => setMenuOpen(false)} aria-hidden="true" />
      <aside id="sidebar" className={'sidebar' + (menuOpen ? ' open' : '')} aria-label="Menu latéral">
        <Brand light to="/app" />
        <nav className="side-nav" aria-label="Navigation de l'espace">
          {sections.map((section) => (
            <div className="side-section" key={section.title}>
              <div className="side-title">{section.title}</div>
              {section.items.map(({ to, label, icon: Icon }) => (
                <NavLink key={to} to={to} className={({ isActive }) => 'side-link' + (isActive ? ' active' : '')}>
                  <Icon size={18} aria-hidden="true" />
                  {label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="side-user">
          <Link to="/app/profile" className="side-user-link" aria-label="Mon profil">
            <Avatar initials={initials} />
            <div className="side-user-info">
              <strong>{displayName}</strong>
              <small>{user?.email ?? ''}</small>
            </div>
          </Link>
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
          <div className="header-greeting">
            <div className="eyebrow">DarnaLux</div>
            <h1>Bonjour, {firstName ?? user?.email ?? 'DarnaLux'}.</h1>
          </div>
          <GlobalSearch />
          <div className="header-actions">
            <NotificationBell />
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
