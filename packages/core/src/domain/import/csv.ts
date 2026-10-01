// RFC 4180 CSV parsing/serialisation with delimiter detection (Excel in
// French locales exports with ';').

export function detectDelimiter(text: string): ',' | ';' | '\t' {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  const counts = { ';': 0, ',': 0, '\t': 0 };
  let inQuotes = false;
  for (const char of firstLine) {
    if (char === '"') inQuotes = !inQuotes;
    else if (!inQuotes && char in counts) counts[char as keyof typeof counts] += 1;
  }
  if (counts[';'] >= counts[','] && counts[';'] >= counts['\t'] && counts[';'] > 0) return ';';
  if (counts['\t'] > counts[',']) return '\t';
  return ',';
}

export function parseCsv(text: string, delimiter: string = detectDelimiter(text)): string[][] {
  const input = text.replace(/^﻿/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"' && field === '') {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && input[i + 1] === '\n') i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}

export function normalizeHeader(header: string): string {
  return header
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function rowsToRecords(rows: string[][]): Record<string, string>[] {
  if (rows.length === 0) return [];
  const headers = rows[0].map(normalizeHeader);
  return rows.slice(1).map((row) => {
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      if (header) record[header] = (row[index] ?? '').trim();
    });
    return record;
  });
}

export type CsvCell = string | number | boolean | null | undefined;

// Cells starting with = + - @ (or tab/CR) are interpreted as formulas by
// spreadsheet software; prefix them so exported data cannot execute.
function neutralizeFormula(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

export function toCsv(rows: readonly (readonly CsvCell[])[], delimiter = ';'): string {
  const escapeCell = (cell: CsvCell): string => {
    if (cell === null || cell === undefined) return '';
    if (typeof cell === 'number') return Number.isFinite(cell) ? String(cell).replace('.', ',') : '';
    if (typeof cell === 'boolean') return cell ? 'oui' : 'non';
    const value = neutralizeFormula(cell);
    return /["\n\r]/.test(value) || value.includes(delimiter) ? `"${value.replace(/"/g, '""')}"` : value;
  };
  return `﻿${rows.map((row) => row.map(escapeCell).join(delimiter)).join('\r\n')}\r\n`;
}
