import type { ReactNode } from 'react';
import { Brand } from '../../components/Brand';
import { ThemeToggle } from '../../components/ThemeToggle';

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

export function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <div className="auth-page">
      <aside className="auth-aside">
        <Brand light />
        <div>
          <p className="eyebrow eyebrow-light">Conciergerie haut de gamme</p>
          <h2>Votre maison,<br /><span className="serif-em">notre signature.</span></h2>
          <p>Propriétés, réservations, équipes et finances réunies dans un espace unique et sécurisé.</p>
        </div>
        <small>© 2026 DarnaLux Concierge · Rabat</small>
      </aside>
      <main className="auth-main">
        <ThemeToggle className="auth-theme" />
        <div className="auth-card">
          <div className="auth-card-brand"><Brand /></div>
          <h1>{title}</h1>
          <p className="auth-subtitle">{subtitle}</p>
          {children}
        </div>
      </main>
    </div>
  );
}
