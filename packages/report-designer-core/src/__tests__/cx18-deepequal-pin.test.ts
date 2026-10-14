import { describe, expect, it } from 'vitest';
import { deepEqual as fluxCoreDeepEqual } from '@nop-chaos/flux-core';
import { createEmptyDocument } from '@nop-chaos/spreadsheet-core';
import { createReportTemplateDocument, hasReportDocChanges } from '../index.js';
import type { ReportTemplateDocument } from '../index.js';

/**
 * plan 598 (CX-18) Phase 1 characterization pin for the editor-core-adapter
 * deepEqual twin (report face). G2 replaces the private 15-line twin with
 * flux-core deepEqual; the equivalence pin (NaN / key-order / nested) must stay
 * green across the swap. The ±0 cases record the OBSERVED divergence
 * pre-adjudicated in plan 598 "Deferred But Adjudicated" (R1 M1): the current
 * twin's `===` judges +0 === -0 (no change), flux-core's Object.is judges them
 * different (change). After G2 hasReportDocChanges adopts the flux-core
 * verdict — the flip is pre-adjudicated, not a regression.
 *
 * Equality pairs share one base document (deep-cloned per side): sheet ids and
 * report ids are crypto.randomUUID() per factory call, so fresh documents are
 * never identity-comparable.
 */

function baseReport(value: unknown): ReportTemplateDocument {
  const doc = createReportTemplateDocument(
    createEmptyDocument('cx18-report-deepequal-sheet'),
    'cx18-report-deepequal',
  );
  doc.spreadsheet.workbook.sheets[0].cells = { A1: cell(value) };
  return doc;
}

function cloneReport(doc: ReportTemplateDocument): ReportTemplateDocument {
  return structuredClone(doc);
}

function cell(value: unknown) {
  return { address: 'A1', row: 0, col: 0, value } as const;
}

describe('report hasReportDocChanges equivalence pin (plan 598 G2)', () => {
  it('judges NaN cell values equal (no change)', () => {
    const a = baseReport(Number.NaN);
    const b = cloneReport(a);
    expect(hasReportDocChanges(a, b)).toBe(false);
  });

  it('judges documents equal regardless of key insertion order (no change)', () => {
    const a = baseReport('v');
    const b = cloneReport(a);
    const reordered: ReportTemplateDocument = {
      version: b.version,
      semantic: b.semantic,
      spreadsheet: b.spreadsheet,
      name: b.name,
      kind: b.kind,
      id: b.id,
    };
    expect(hasReportDocChanges(a, reordered)).toBe(false);
  });

  it('detects nested differences (change)', () => {
    const a = baseReport('before');
    const b = baseReport('after');
    expect(hasReportDocChanges(a, b)).toBe(true);
  });

  it('detects metadata differences (change)', () => {
    const a = baseReport('v');
    const b = cloneReport(a);
    if (b.semantic) {
      b.semantic.workbookMeta = { ...(b.semantic.workbookMeta ?? {}), title: 'changed-title' };
    }
    expect(hasReportDocChanges(a, b)).toBe(true);
  });

  it('±0-only cell delta — FLIPPED with G2 (pre-adjudicated, plan 598 Deferred): +0 ≠ -0 → change', () => {
    // Phase 1 recorded the old twin's `===` verdict (no change); G2 adopts
    // flux-core Object.is semantics — a ±0-only document delta now creates an
    // undo entry instead of being silently ignored (defensive direction,
    // adjudicated residual-risk-only).
    const plusZero = baseReport(0);
    const minusZero = cloneReport(plusZero);
    minusZero.spreadsheet.workbook.sheets[0].cells = {
      A1: { address: 'A1', row: 0, col: 0, value: -0 },
    };
    expect(hasReportDocChanges(plusZero, minusZero)).toBe(true);
  });

  it('±0-only cell delta — flux-core verdict (post-G2 single source): Object.is judges +0 !== -0 → change', () => {
    const plusZero = baseReport(0);
    const minusZero = cloneReport(plusZero);
    minusZero.spreadsheet.workbook.sheets[0].cells = {
      A1: { address: 'A1', row: 0, col: 0, value: -0 },
    };
    expect(fluxCoreDeepEqual(plusZero, minusZero)).toBe(false);
    expect(fluxCoreDeepEqual(plusZero, cloneReport(plusZero))).toBe(true);
  });
});
