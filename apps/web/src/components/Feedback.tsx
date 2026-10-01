import type { ReactNode } from 'react';
import { AlertCircle, Info } from 'lucide-react';

export function Loading({ label = 'Chargement…', page = false }: { label?: string; page?: boolean }) {
  return (
    <div className={'state' + (page ? ' state-page' : '')} role="status">
      <span className="spinner" aria-hidden="true" />
      {label}
    </div>
  );
}

export function ErrorAlert({ children }: { children: ReactNode }) {
  return (
    <div className="alert alert-error" role="alert">
      <AlertCircle size={18} aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}

export function InfoAlert({ children }: { children: ReactNode }) {
  return (
    <div className="alert alert-info">
      <Info size={18} aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}
