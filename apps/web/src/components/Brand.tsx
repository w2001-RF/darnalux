import { useId } from 'react';
import { Link } from 'react-router-dom';

export function BrandMark() {
  const gradientId = useId();
  const stroke = `url(#${gradientId})`;
  return (
    <svg viewBox="0 0 140 166" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F2DC72" />
          <stop offset="45%" stopColor="#D4AF37" />
          <stop offset="100%" stopColor="#9A7C1A" />
        </linearGradient>
      </defs>
      <path d="M24 148L24 72Q24 16 70 16Q116 16 116 72L116 148Z" fill="none" stroke={stroke} strokeWidth="5" />
      <path d="M36 148L36 76Q36 30 70 30Q104 30 104 76L104 148Z" fill="none" stroke={stroke} strokeWidth="2" opacity=".4" />
      <line x1="10" y1="148" x2="130" y2="148" stroke={stroke} strokeWidth="5" />
      <polygon points="70,34 75,47 88,47 78,55 82,68 70,60 58,68 62,55 52,47 65,47" fill={stroke} />
      <line x1="70" y1="72" x2="70" y2="138" stroke={stroke} strokeWidth="5" />
      <line x1="59" y1="114" x2="70" y2="114" stroke={stroke} strokeWidth="4" />
      <line x1="59" y1="126" x2="70" y2="126" stroke={stroke} strokeWidth="4" />
    </svg>
  );
}

export function Brand({ to = '/', light = false }: { to?: string; light?: boolean }) {
  return (
    <Link to={to} className={'brand' + (light ? ' brand-light' : '')} aria-label="DarnaLux — accueil">
      <span className="brand-mark"><BrandMark /></span>
      <span className="brand-text" aria-hidden="true">
        <span className="brand-name">DARNA<span>LUX</span></span>
        <span className="brand-sub">Conciergerie</span>
      </span>
    </Link>
  );
}
