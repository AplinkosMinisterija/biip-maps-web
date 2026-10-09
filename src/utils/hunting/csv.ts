// CSV export of the filtered wolf records (SPEC §6.8).
// UTF-8 with BOM, ';' separator, CRLF line ends. Lithuanian labels as values.
// Never coordinates, never ids.
import type { Interval, WolfRecord } from './types';
import { formatDateTime, seasonLabel } from './dates';
import { ageLabel, methodLabel, packLabel, sexLabel, sourceLabel } from './labels';

export const CSV_BOM = '﻿';
export const CSV_SEPARATOR = ';';
export const CSV_EOL = '\r\n';
export const CSV_MIME = 'text/csv;charset=utf-8';

const HEADER = [
  'data',
  'sezonas',
  'amzius',
  'lytis',
  'medziokles_budas',
  'gaujos_narys',
  'saltinis',
  'ne_medziokles_laikotarpiu',
];

// A cell starting with one of these is run as a formula by spreadsheet apps (CSV injection).
const FORMULA_START = /^[=+\-@\t\r]/;

// Neutralise formula-like text with a leading apostrophe; dates and numbers are left alone.
export function csvSafe(text: string) {
  return FORMULA_START.test(text) && !/^-?\d+([.,]\d+)?$/.test(text) ? `'${text}` : text;
}

export function csvField(value: string | number | null | undefined) {
  const text = csvSafe(value === null || value === undefined ? '' : String(value));
  return /[;"\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export interface CsvOptions {
  interval: Interval;
  // Municipality name when filtered by one (P1); otherwise 'visa Lietuva'.
  placeLabel?: string | null;
  // P1: add a 'savivaldybe' column.
  withMunicipality?: boolean;
  // Preparation time; defaults to now.
  now?: Date;
}

export function buildCsv(records: WolfRecord[], options: CsvOptions) {
  const { interval, placeLabel, withMunicipality } = options;
  const now = options.now || new Date();
  const lines: string[] = [
    `# Sumedžioti vilkai; ${interval.from}–${interval.to}; ` +
      `${csvSafe((placeLabel || 'visa Lietuva').replace(/[;\r\n]/g, ' '))}; ` +
      `parengta ${formatDateTime(now)}; šaltinis: BIIP ir BIOMON (medziokle.biip.lt); ` +
      'vietos koordinatės ir identifikatoriai neįtraukti',
    [...HEADER, ...(withMunicipality ? ['savivaldybe'] : [])].join(CSV_SEPARATOR),
  ];
  records.forEach((r) => {
    const fields = [
      r.day,
      seasonLabel(r.season),
      ageLabel(r.age),
      sexLabel(r.sex),
      methodLabel(r.method),
      packLabel(r.packMember, r.packAmount),
      sourceLabel(r.source),
      r.inWolfWindow ? 'ne' : 'taip',
    ];
    if (withMunicipality) fields.push(r.municipalityName || 'Nenustatyta');
    lines.push(fields.map(csvField).join(CSV_SEPARATOR));
  });
  return CSV_BOM + lines.join(CSV_EOL) + CSV_EOL;
}

export const csvFileName = (interval: Interval) => `vilkai_${interval.from}_${interval.to}.csv`;
