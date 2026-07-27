import { describe, it, expect } from 'vitest';
import {
  resolveSpreadsheetManifest,
  spreadsheetHostContract,
  SPREADSHEET_MANIFEST_V1,
} from './spreadsheet-manifest.js';

describe('resolveSpreadsheetManifest', () => {
  it('resolves version "1.0"', () => {
    const result = resolveSpreadsheetManifest('1.0');
    expect(result).toBe(SPREADSHEET_MANIFEST_V1);
  });

  it('resolves version "1"', () => {
    const result = resolveSpreadsheetManifest('1');
    expect(result).toBe(SPREADSHEET_MANIFEST_V1);
  });

  it('resolves version "latest"', () => {
    const result = resolveSpreadsheetManifest('latest');
    expect(result).toBe(SPREADSHEET_MANIFEST_V1);
  });

  it('returns undefined for unknown version', () => {
    expect(resolveSpreadsheetManifest('2.0')).toBeUndefined();
    expect(resolveSpreadsheetManifest('0.9')).toBeUndefined();
    expect(resolveSpreadsheetManifest('')).toBeUndefined();
    expect(resolveSpreadsheetManifest('   ')).toBeUndefined();
  });

  it('returns undefined for arbitrary unknown strings', () => {
    expect(resolveSpreadsheetManifest('bad')).toBeUndefined();
    expect(resolveSpreadsheetManifest('v1')).toBeUndefined();
    expect(resolveSpreadsheetManifest('null')).toBeUndefined();
  });
});

describe('spreadsheetHostContract', () => {
  it('has family "spreadsheet"', () => {
    expect(spreadsheetHostContract.family).toBe('spreadsheet');
  });

  it('has defaultVersion "1.0"', () => {
    expect(spreadsheetHostContract.defaultVersion).toBe('1.0');
  });

  it('uses resolveSpreadsheetManifest as resolveManifest', () => {
    expect(spreadsheetHostContract.resolveManifest).toBe(resolveSpreadsheetManifest);
    const result = spreadsheetHostContract.resolveManifest('1.0');
    expect(result).toBe(SPREADSHEET_MANIFEST_V1);
  });

  it('has capabilityPublication with region-scoped mode', () => {
    expect(spreadsheetHostContract.capabilityPublication).toEqual({
      mode: 'region-scoped',
      capableRegions: ['toolbar', 'body', 'dialogs'],
      transitiveInheritance: true,
    });
  });
});
