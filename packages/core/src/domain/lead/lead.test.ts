import { describe, expect, it } from 'vitest';
import {
  buildMailtoUrl,
  buildWhatsappUrl,
  countLeadsByTab,
  fillTemplate,
  leadTab,
  leadTemplateValues,
  normalizeWhatsappNumber,
  validateReplyTemplate,
} from './index';

describe('leadTab', () => {
  it('routes requests to the right tab', () => {
    expect(leadTab({ kind: 'QUOTE', status: 'NEW' })).toBe('ESTIMATES');
    expect(leadTab({ kind: 'QUOTE', status: 'IN_PROGRESS' })).toBe('ESTIMATES');
    expect(leadTab({ kind: 'QUOTE', status: 'QUOTED' })).toBe('QUOTES');
    expect(leadTab({ kind: 'CONTACT', status: 'NEW' })).toBe('MESSAGES');
    expect(leadTab({ kind: 'CONTACT', status: 'QUOTED' })).toBe('MESSAGES');
    expect(leadTab({ kind: 'QUOTE', status: 'CLOSED' })).toBe('ARCHIVE');
    expect(leadTab({ kind: 'CONTACT', status: 'CLOSED' })).toBe('ARCHIVE');
  });

  it('counts per tab', () => {
    const counts = countLeadsByTab([
      { kind: 'QUOTE', status: 'NEW' },
      { kind: 'QUOTE', status: 'QUOTED' },
      { kind: 'CONTACT', status: 'NEW' },
      { kind: 'CONTACT', status: 'CLOSED' },
    ]);
    expect(counts).toEqual({ ESTIMATES: 1, QUOTES: 1, MESSAGES: 1, ARCHIVE: 1 });
  });
});

describe('normalizeWhatsappNumber', () => {
  it('reads national numbers as Moroccan', () => {
    expect(normalizeWhatsappNumber('06 12 34 56 78')).toBe('212612345678');
  });

  it('keeps international numbers', () => {
    expect(normalizeWhatsappNumber('+212 6 12 34 56 78')).toBe('212612345678');
    expect(normalizeWhatsappNumber('00212612345678')).toBe('212612345678');
    expect(normalizeWhatsappNumber('+33 6 12 34 56 78')).toBe('33612345678');
  });

  it('rejects empty or implausible numbers', () => {
    expect(normalizeWhatsappNumber('')).toBeNull();
    expect(normalizeWhatsappNumber(null)).toBeNull();
    expect(normalizeWhatsappNumber('abc')).toBeNull();
    expect(normalizeWhatsappNumber('123')).toBeNull();
  });
});

describe('reply links', () => {
  it('builds an encoded WhatsApp url or null', () => {
    expect(buildWhatsappUrl('0612345678', 'Bonjour & merci')).toBe('https://wa.me/212612345678?text=Bonjour%20%26%20merci');
    expect(buildWhatsappUrl('', 'x')).toBeNull();
  });

  it('builds an encoded mailto url', () => {
    expect(buildMailtoUrl(' a@b.ma ', 'Votre devis', 'Ligne 1\nLigne 2')).toBe('mailto:a@b.ma?subject=Votre%20devis&body=Ligne%201%0ALigne%202');
  });
});

describe('templates', () => {
  const lead = {
    full_name: 'Salma Benali',
    zone_label: 'Rabat-Salé-Kénitra',
    address: 'Agdal',
    config_label: 'Appartement · 2 chambres',
    estimate_low: 9500,
    estimate_high: 17500,
  };

  it('fills known variables and keeps unknown ones visible', () => {
    const values = leadTemplateValues(lead);
    expect(values.prenom).toBe('Salma');
    expect(fillTemplate('Bonjour {{prenom}}, {{ zone }} — {{inconnu}}', values)).toBe('Bonjour Salma, Rabat-Salé-Kénitra — {{inconnu}}');
  });

  it('formats the estimate, or leaves it empty without one', () => {
    expect(leadTemplateValues(lead).estimation).toContain('MAD par mois');
    expect(leadTemplateValues({ ...lead, estimate_low: null, estimate_high: null }).estimation).toBe('');
  });

  it('validates template input', () => {
    expect(validateReplyTemplate({ name: '', subject: '', body: '', applies_to: 'ALL' }).valid).toBe(false);
    expect(validateReplyTemplate({ name: 'Accusé', subject: 'Merci', body: 'Bonjour', applies_to: 'QUOTE' }).valid).toBe(true);
  });
});
