import { describe, expect, it } from 'vitest';
import {
  detectDelimiter,
  mapOwnerRecords,
  mapPropertyRecords,
  mapReservationRecords,
  normalizeHeader,
  parseCsv,
  parseImportDate,
  rowsToRecords,
  toCsv,
} from './index';

describe('parseCsv', () => {
  it('handles quotes, escaped quotes, newlines inside fields and CRLF', () => {
    const text = '﻿nom;description\r\n"Villa ""Atlas""";"Ligne 1\nLigne 2"\r\nRiad;simple\r\n';
    expect(parseCsv(text)).toEqual([
      ['nom', 'description'],
      ['Villa "Atlas"', 'Ligne 1\nLigne 2'],
      ['Riad', 'simple'],
    ]);
  });

  it('detects the delimiter from the header line', () => {
    expect(detectDelimiter('a;b;c\n1;2;3')).toBe(';');
    expect(detectDelimiter('a,b,c')).toBe(',');
    expect(detectDelimiter('a\tb\tc')).toBe('\t');
  });

  it('skips blank lines', () => {
    expect(parseCsv('a,b\n\n1,2\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('normalizes headers', () => {
    expect(normalizeHeader(' Salles de bain ')).toBe('salles_de_bain');
    expect(normalizeHeader('Prénom')).toBe('prenom');
  });
});

describe('toCsv', () => {
  it('escapes delimiters, quotes and neutralizes spreadsheet formulas', () => {
    const csv = toCsv([
      ['a;b', 'say "hi"', '=HYPERLINK("x")', 12.5, null, true],
    ]);
    expect(csv).toBe('﻿"a;b";"say ""hi""";"\'=HYPERLINK(""x"")";12,5;;oui\r\n');
  });
});

describe('import mappers', () => {
  it('maps owners and reports invalid lines with their line number', () => {
    const records = rowsToRecords(parseCsv('prenom;nom;email;telephone\nAmina;Benali;amina@example.com;\n;Sans prenom;;\n'));
    const result = mapOwnerRecords(records);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].value.firstName).toBe('Amina');
    expect(result.issues).toEqual([{ line: 3, message: expect.stringContaining('prénom') }]);
  });

  it('maps properties with French type labels and numbers with commas', () => {
    const records = rowsToRecords(parseCsv('nom;type;ville;capacite;commission\nVilla Atlas;Villa;Rabat;6;17,5\nX;Château;Rabat;2;20\n'));
    const result = mapPropertyRecords(records);
    expect(result.rows[0].value).toMatchObject({ type: 'VILLA', capacity: 6, commissionRate: 17.5 });
    expect(result.issues[0]).toMatchObject({ line: 3 });
  });

  it('maps reservations with French dates', () => {
    const records = rowsToRecords(
      parseCsv('bien;voyageur_prenom;voyageur_nom;arrivee;depart;voyageurs;montant;source\nVilla Atlas;Amina;Benali;11/04/2026;18/04/2026;2;7000;airbnb\n'),
    );
    const result = mapReservationRecords(records);
    expect(result.issues).toEqual([]);
    expect(result.rows[0].value).toMatchObject({ checkIn: '2026-04-11', checkOut: '2026-04-18', source: 'AIRBNB', status: 'CONFIRMED' });
  });

  it('parses import dates strictly', () => {
    expect(parseImportDate('2026-04-11')).toBe('2026-04-11');
    expect(parseImportDate('1/4/2026')).toBe('2026-04-01');
    expect(parseImportDate('31/02/2026')).toBeNull();
  });
});
