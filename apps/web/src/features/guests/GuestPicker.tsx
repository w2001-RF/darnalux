import { useEffect, useState } from 'react';
import { assessGuestRisk, personFullName } from '@darnalux/core';
import type { GuestRow } from './api';
import { getGuest, listGuests } from './api';
import { Badge } from '../../components/ui';

// Search-as-you-type selection of an existing guest.
export function GuestPicker({ value, onChange }: { value: string | null; onChange: (guest: GuestRow | null) => void }) {
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<GuestRow[]>([]);
  const [selected, setSelected] = useState<GuestRow | null>(null);

  useEffect(() => {
    if (value && (!selected || selected.id !== value)) {
      getGuest(value).then(setSelected).catch(() => setSelected(null));
    }
    if (!value) setSelected(null);
  }, [value, selected]);

  useEffect(() => {
    if (term.trim().length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      listGuests({ search: term, limit: 8 })
        .then((rows) => !cancelled && setResults(rows))
        .catch(() => !cancelled && setResults([]));
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [term]);

  if (selected) {
    const risk = assessGuestRisk({ isBlacklisted: selected.is_blacklisted, blacklistReason: selected.blacklist_reason });
    return (
      <div className="picked">
        <div>
          <strong>{personFullName(selected.first_name, selected.last_name)}</strong>
          <small className="dim cell-sub">{[selected.email, selected.phone].filter(Boolean).join(' · ') || '—'}</small>
          {risk.blocked && <Badge tone="danger">Liste noire</Badge>}
        </div>
        <button
          type="button"
          className="btn btn-link btn-sm"
          onClick={() => {
            setSelected(null);
            onChange(null);
          }}
        >
          Changer
        </button>
      </div>
    );
  }

  return (
    <div className="picker">
      <input type="search" placeholder="Rechercher par nom, email ou téléphone…" aria-label="Rechercher un voyageur" value={term} onChange={(e) => setTerm(e.target.value)} />
      {results.length > 0 && (
        <ul className="picker-results">
          {results.map((guest) => (
            <li key={guest.id}>
              <button
                type="button"
                onClick={() => {
                  setSelected(guest);
                  setTerm('');
                  onChange(guest);
                }}
              >
                <span>{personFullName(guest.first_name, guest.last_name)}</span>
                <small className="dim">{guest.email ?? guest.phone ?? ''}</small>
                {guest.is_blacklisted && <Badge tone="danger">Liste noire</Badge>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
