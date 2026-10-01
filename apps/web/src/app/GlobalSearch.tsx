import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
import type { SearchHit } from '../features/search/api';
import { SEARCH_KIND_LABELS, globalSearch } from '../features/search/api';

export function GlobalSearch() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [term, setTerm] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (term.trim().length < 2) {
      setHits([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      globalSearch(term, user).then((result) => {
        if (!cancelled) {
          setHits(result);
          setActive(0);
          setOpen(true);
        }
      });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [term, user]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  function go(hit: SearchHit) {
    setOpen(false);
    setTerm('');
    navigate(hit.to);
  }

  return (
    <div className="global-search" ref={boxRef}>
      <Search size={16} aria-hidden="true" />
      <input
        type="search"
        placeholder="Rechercher un bien, une réservation, un voyageur…"
        aria-label="Recherche globale"
        value={term}
        onChange={(event) => setTerm(event.target.value)}
        onFocus={() => hits.length > 0 && setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setActive((i) => Math.min(i + 1, hits.length - 1));
          } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
          } else if (event.key === 'Enter' && hits[active]) {
            go(hits[active]);
          } else if (event.key === 'Escape') {
            setOpen(false);
          }
        }}
      />
      {open && term.trim().length >= 2 && (
        <div className="search-results" role="listbox">
          {hits.length === 0 ? (
            <div className="search-empty">Aucun résultat</div>
          ) : (
            hits.map((hit, index) => (
              <button
                type="button"
                key={`${hit.kind}-${hit.id}`}
                role="option"
                aria-selected={index === active}
                className={'search-hit' + (index === active ? ' active' : '')}
                onMouseEnter={() => setActive(index)}
                onClick={() => go(hit)}
              >
                <span className="search-kind">{SEARCH_KIND_LABELS[hit.kind]}</span>
                <span className="search-label">{hit.label}</span>
                <span className="search-detail">{hit.detail}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
