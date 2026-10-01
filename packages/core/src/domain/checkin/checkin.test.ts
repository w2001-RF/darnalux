import { describe, expect, it } from 'vitest';
import type { CheckinSettings } from './index';
import {
  DEFAULT_CHECKIN_SETTINGS,
  DEFAULT_CONTRACT_TEMPLATE,
  checkinImpact,
  checkinSteps,
  isCheckinLinkUsable,
  renderContract,
  unknownPlaceholders,
  validateGuestCheckinInfo,
} from './index';

const settings = (overrides: Partial<CheckinSettings> = {}): CheckinSettings => ({ ...DEFAULT_CHECKIN_SETTINGS, ...overrides });

describe('checkin steps', () => {
  it('always starts with the guest information and ends with confirmation', () => {
    expect(checkinSteps(settings())).toEqual(['INFO', 'DOCUMENT', 'SELFIE', 'CONTRACT', 'DONE']);
    expect(checkinSteps(settings({ documentStep: false, selfieStep: false, contractStep: false }))).toEqual(['INFO', 'DONE']);
  });

  it('summarises the time/security impact', () => {
    expect(checkinImpact(settings())).toEqual({ steps: 3, estimatedMinutes: '4-5 min', securityLevel: 'Élevé' });
    expect(checkinImpact(settings({ selfieStep: false })).securityLevel).toBe('Moyen');
    expect(checkinImpact(settings({ documentStep: false })).securityLevel).toBe('Faible');
  });

  it('disables links once verified or expired', () => {
    const now = new Date('2026-04-10T00:00:00Z');
    expect(isCheckinLinkUsable('PENDING', '2026-05-01T00:00:00Z', now)).toBe(true);
    expect(isCheckinLinkUsable('VERIFIED', '2026-05-01T00:00:00Z', now)).toBe(false);
    expect(isCheckinLinkUsable('PENDING', '2026-04-01T00:00:00Z', now)).toBe(false);
  });
});

describe('validateGuestCheckinInfo', () => {
  const info = {
    fullName: 'Amina Benali',
    email: '',
    phone: '+212600000000',
    nationality: 'MA',
    documentType: 'PASSPORT' as const,
    documentNumber: '',
  };

  it('requires a full name and a document type when the document step is on', () => {
    expect(validateGuestCheckinInfo(info, settings()).valid).toBe(true);
    expect(validateGuestCheckinInfo({ ...info, fullName: 'Amina' }, settings()).errors.fullName).toBeDefined();
    expect(validateGuestCheckinInfo({ ...info, documentType: '' }, settings()).errors.documentType).toBeDefined();
    expect(validateGuestCheckinInfo({ ...info, documentType: '' }, settings({ documentStep: false })).valid).toBe(true);
  });

  it('requires the document number only when configured', () => {
    expect(validateGuestCheckinInfo(info, settings({ documentNumberRequired: true })).errors.documentNumber).toBeDefined();
  });
});

describe('renderContract', () => {
  it('fills known placeholders and marks missing values', () => {
    const text = renderContract('{{guest_full_name}} — {{ property_name }} — {{nights}} — {{guest_document_number}}', {
      guest_full_name: 'Amina Benali',
      property_name: 'Villa Atlas',
      nights: 7,
    });
    expect(text).toBe('Amina Benali — Villa Atlas — 7 — —');
  });

  it('leaves unknown placeholders untouched and reports them', () => {
    expect(renderContract('{{unknown}}', {})).toBe('{{unknown}}');
    expect(unknownPlaceholders('{{unknown}} {{nights}} {{other}}')).toEqual(['unknown', 'other']);
  });

  it('ships a default template that only uses supported placeholders', () => {
    expect(unknownPlaceholders(DEFAULT_CONTRACT_TEMPLATE)).toEqual([]);
  });
});
