import { describe, expect, it } from 'vitest';
import { matchesReportFieldQuery } from './report-field-panel.js';

describe('matchesReportFieldQuery', () => {
  const field = { label: '订单金额', fieldType: 'number' };

  it('empty query matches everything', () => {
    expect(matchesReportFieldQuery(field, '')).toBe(true);
    expect(matchesReportFieldQuery(field, '   ')).toBe(true);
  });

  it('matches by label case-insensitively', () => {
    expect(matchesReportFieldQuery(field, '订单')).toBe(true);
    expect(matchesReportFieldQuery({ label: 'Amount', fieldType: 'number' }, 'amount')).toBe(true);
  });

  it('matches by fieldType only', () => {
    expect(matchesReportFieldQuery(field, 'number')).toBe(true);
    expect(matchesReportFieldQuery(field, 'string')).toBe(false);
  });

  it('misses non-matching queries', () => {
    expect(matchesReportFieldQuery(field, '不存在')).toBe(false);
  });
});
