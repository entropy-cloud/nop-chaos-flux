import { describe, expect, it } from 'vitest';
import { deepEqual as fluxCoreDeepEqual } from '@nop-chaos/flux-core';
import { createEmptyDocument, hasSpreadsheetDocChanges } from '../index.js';
import type { SpreadsheetDocument } from '../index.js';

/**
 * plan 598 (CX-18) Phase 1 characterization pin for the editor-core-adapter
 * deepEqual twin (spreadsheet face). G2 replaces the private 15-line twin with
 * flux-core deepEqual; the equivalence pin (NaN / key-order / own-key / nested)
 * must stay green across the swap. The ±0 cases record the OBSERVED divergence
 * pre-adjudicated in plan 598 "Deferred But Adjudicated" (R1 M1): the current
 * twin's `===` judges +0 === -0 (no change), flux-core's Object.is judges them
 * different (change). After G2 hasSpreadsheetDocChanges adopts the flux-core
 * verdict — the flip is pre-adjudicated, not a regression.
 *
 * Equality pairs share one base document (deep-cloned per side): sheet ids are
 * crypto.randomUUID() per createEmptyDocument call, so fresh documents are
 * never identity-comparable.
 */

function baseDoc(value: unknown): SpreadsheetDocument {
  const doc = createEmptyDocument('cx18-deepequal');
  const sheet = doc.workbook.sheets[0];
  sheet.cells = {
    A1: cell(value),
  };
  return doc;
}

function cloneDoc(doc: SpreadsheetDocument): SpreadsheetDocument {
  return structuredClone(doc);
}

function cell(value: unknown) {
  return { address: 'A1', row: 0, col: 0, value } as const;
}

describe('spreadsheet hasSpreadsheetDocChanges equivalence pin (plan 598 G2)', () => {
  it('judges NaN cell values equal (no change)', () => {
    const a = baseDoc(Number.NaN);
    const b = cloneDoc(a);
    expect(hasSpreadsheetDocChanges(a, b)).toBe(false);
  });

  it('judges documents equal regardless of key insertion order (no change)', () => {
    const a = baseDoc('v');
    const b = cloneDoc(a);
    b.workbook.sheets[0].cells = {
      B2: { address: 'B2', row: 1, col: 1, value: undefined },
      A1: cell('v'),
    };
    a.workbook.sheets[0].cells = {
      A1: cell('v'),
      B2: { address: 'B2', row: 1, col: 1, value: undefined },
    };
    expect(hasSpreadsheetDocChanges(a, b)).toBe(false);
  });

  it('detects nested differences (change)', () => {
    const a = baseDoc('before');
    const b = baseDoc('after');
    expect(hasSpreadsheetDocChanges(a, b)).toBe(true);
  });

  it('detects key-set differences (change)', () => {
    const a = baseDoc('v');
    const b = cloneDoc(a);
    b.workbook.sheets[0].cells = {};
    expect(hasSpreadsheetDocChanges(a, b)).toBe(true);
  });

  it('±0-only cell delta — FLIPPED with G2 (pre-adjudicated, plan 598 Deferred): +0 ≠ -0 → change', () => {
    // Phase 1 recorded the old twin's `===` verdict (no change); G2 adopts
    // flux-core Object.is semantics — a ±0-only document delta now creates an
    // undo entry instead of being silently ignored (defensive direction,
    // adjudicated residual-risk-only).
    const plusZero = baseDoc(0);
    const minusZero = cloneDoc(plusZero);
    minusZero.workbook.sheets[0].cells = { A1: cell(-0) };
    expect(hasSpreadsheetDocChanges(plusZero, minusZero)).toBe(true);
  });

  it('±0-only cell delta — flux-core verdict (post-G2 single source): Object.is judges +0 !== -0 → change', () => {
    const plusZero = baseDoc(0);
    const minusZero = cloneDoc(plusZero);
    minusZero.workbook.sheets[0].cells = { A1: cell(-0) };
    expect(fluxCoreDeepEqual(plusZero, minusZero)).toBe(false);
    expect(fluxCoreDeepEqual(plusZero, cloneDoc(plusZero))).toBe(true);
  });
});
