import { describe, it, expect } from 'vitest';
import type { FindResult } from '@nop-chaos/spreadsheet-core';
import {
  resolveSpreadsheetManifest,
  spreadsheetHostContract,
  SPREADSHEET_MANIFEST_V1,
  SPREADSHEET_HOST_METHOD_CONTRACTS,
} from './spreadsheet-manifest.js';
import type { HostCapabilityContract } from '@nop-chaos/flux-core';

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

describe('find result shape contract (declaration-is-contract)', () => {
  const methods = SPREADSHEET_HOST_METHOD_CONTRACTS as HostCapabilityContract['methods'];

  function declaredFields(method: string): string[] {
    const contract = methods[method];
    let shape = contract?.result;
    if (shape?.kind === 'union') {
      shape = shape.anyOf.find((branch) => branch.kind === 'object');
    }
    if (!shape || shape.kind !== 'object') {
      return [];
    }
    return Object.keys(shape.fields ?? {});
  }

  it('declares find/findNext result fields matching the FindResult type', () => {
    const typeKeys: (keyof FindResult)[] = [
      'sheetId',
      'address',
      'row',
      'col',
      'value',
      'matchStart',
      'matchEnd',
    ];
    for (const method of ['find', 'findNext']) {
      const fields = declaredFields(method);
      for (const key of typeKeys) {
        expect(fields, `${method} result should declare ${String(key)}`).toContain(key);
      }
    }
  });
});
