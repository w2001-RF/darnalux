import { useEffect, useId, useRef } from 'react';
import type { ReactNode, SelectHTMLAttributes, InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Tone } from '@darnalux/core';

export function PageHeader({
  title,
  subtitle,
  actions,
  back,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  back?: { to: string; label: string };
}) {
  return (
    <div className="page-header">
      <div>
        {back && (
          <Link className="back-link" to={back.to}>
            <ArrowLeft size={16} aria-hidden="true" /> {back.label}
          </Link>
        )}
        <h2 className="page-title">{title}</h2>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function EmptyState({ icon: Icon, title, text, action }: { icon?: LucideIcon; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="empty-state">
      {Icon && <Icon size={34} aria-hidden="true" />}
      <strong>{title}</strong>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

export function StatCard({
  icon: Icon,
  label,
  value,
  note,
  tone,
}: {
  icon?: LucideIcon;
  label: string;
  value: ReactNode;
  note?: ReactNode;
  tone?: 'success' | 'danger' | 'muted';
}) {
  return (
    <div className="kpi">
      <div className="kpi-top">
        <span>{label}</span>
        {Icon && (
          <span className="kpi-icon">
            <Icon size={18} aria-hidden="true" />
          </span>
        )}
      </div>
      <b>{value}</b>
      {note && <small className={tone ? `kpi-note-${tone}` : undefined}>{note}</small>}
    </div>
  );
}

interface FieldShellProps {
  label: string;
  error?: string;
  hint?: ReactNode;
  required?: boolean;
  className?: string;
}

function FieldShell({ label, error, hint, required, className, id, children }: FieldShellProps & { id: string; children: ReactNode }) {
  return (
    <div className={'field' + (className ? ` ${className}` : '') + (error ? ' field-invalid' : '')}>
      <label htmlFor={id}>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      {children}
      {hint && !error && <small className="field-hint">{hint}</small>}
      {error && (
        <small className="field-error" role="alert">
          {error}
        </small>
      )}
    </div>
  );
}

type InputProps = FieldShellProps & Omit<InputHTMLAttributes<HTMLInputElement>, 'id'>;

export function TextField({ label, error, hint, required, className, ...input }: InputProps) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} required={required} className={className}>
      <input id={id} required={required} aria-invalid={Boolean(error)} {...input} />
    </FieldShell>
  );
}

type SelectProps = FieldShellProps &
  Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> & {
    options: readonly { value: string; label: string }[];
    placeholder?: string;
  };

export function SelectField({ label, error, hint, required, className, options, placeholder, ...select }: SelectProps) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} required={required} className={className}>
      <select id={id} required={required} aria-invalid={Boolean(error)} {...select}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

type TextAreaProps = FieldShellProps & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'>;

export function TextAreaField({ label, error, hint, required, className, ...textarea }: TextAreaProps) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} required={required} className={className}>
      <textarea id={id} required={required} aria-invalid={Boolean(error)} {...textarea} />
    </FieldShell>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: ReactNode;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="toggle-row">
      <div>
        <label htmlFor={id} className="toggle-label">
          {label}
        </label>
        {description && <div className="toggle-description">{description}</div>}
      </div>
      <input
        id={id}
        type="checkbox"
        role="switch"
        className="switch"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
    </div>
  );
}

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  wide,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className={'modal' + (wide ? ' modal-wide' : '')}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
    >
      {open && (
        <div className="modal-inner">
          <div className="modal-head">
            <h3>{title}</h3>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Fermer">
              <X size={18} aria-hidden="true" />
            </button>
          </div>
          <div className="modal-body">{children}</div>
          {footer && <div className="modal-foot">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}

export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: readonly { id: T; label: string; count?: number }[];
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={tab.id === active}
          className={'tab' + (tab.id === active ? ' active' : '')}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
          {tab.count !== undefined && <span className="tab-count">{tab.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Facts({ items }: { items: readonly { label: string; value: ReactNode }[] }) {
  return (
    <dl className="facts">
      {items.map((item) => (
        <div key={item.label}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Section({ title, actions, children, flush }: { title: string; actions?: ReactNode; children: ReactNode; flush?: boolean }) {
  return (
    <section className={'panel' + (flush ? ' panel-flush' : '')}>
      <div className="panel-head">
        <h2>{title}</h2>
        {actions && <div className="panel-actions">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

export function FormActions({ children }: { children: ReactNode }) {
  return <div className="form-actions">{children}</div>;
}

export function optionsFrom<T extends string>(values: readonly T[], labels: Record<T, string>) {
  return values.map((value) => ({ value, label: labels[value] }));
}
