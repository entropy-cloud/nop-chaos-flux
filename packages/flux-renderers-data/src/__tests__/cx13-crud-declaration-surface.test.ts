import { describe, expect, it } from 'vitest';
import type { BaseSchema, SchemaValue } from '@nop-chaos/flux-core';
import type {
  CrudColumnFilterConfig,
  CrudColumnFilterOption,
  CrudColumnSchema,
  CrudColumnSettingsConfig,
  CrudQuickEditConfig,
  CrudResponsiveConfig,
} from '../crud-schema.js';
import type {
  TableColumnFilterConfig,
  TableColumnFilterOption,
  TableColumnQuickEditConfig,
  TableColumnSchema,
  TableColumnSettingsConfig,
  TableResponsiveConfig,
} from '../schemas.js';

/**
 * CX-13 (plan 591) Phase 1/4 pins — crud ↔ table column declaration mirror.
 *
 * Leg D converges FOUR mechanically-extends pairs
 * (CrudColumnFilterOption / CrudColumnFilterConfig / CrudQuickEditConfig /
 * CrudResponsiveConfig → their TableColumn* counterparts). These pins freeze
 * the type surface BEFORE the change (structural identity per pair) and must
 * stay green AFTER (extends is structure-preserving; export names unchanged).
 *
 * TWO pairs are excluded with recorded reasons (plan R1 M1):
 *  - CrudColumnSettingsConfig: the Table side has an extra `align` key, so
 *    `extends` would widen the Crud type (forbidden).
 *  - CrudColumnSchema: `label?: SchemaValue` vs `label?: string` and
 *    `buttons?: SchemaInput` vs `buttons?: BaseSchema[]` make `extends` a
 *    TS2430 compile error on both keys.
 * The exclusion pins assert exactly those divergences so a later batch cannot
 * silently flip the adjudication.
 */

// ── structural-identity helpers ──────────────────────────────────────────────

type SameShape<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

/**
 * Distinguishes a DECLARED key from one resolved only through the SchemaObject
 * string index signature (`[key: string]: SchemaValue`). A missing key
 * resolves to the full SchemaValue union; a declared key stays narrow, so
 * `SchemaValue extends T[K]` only holds for index-signature/missing keys.
 */
type KeyResolution<T, K extends keyof T> = SchemaValue extends T[K]
  ? 'index-signature-or-missing'
  : 'declared';

// ── the four extends pairs: structural identity frozen ──────────────────────

const filterOptionSame: SameShape<CrudColumnFilterOption, TableColumnFilterOption> = true;
const filterConfigSame: SameShape<CrudColumnFilterConfig, TableColumnFilterConfig> = true;
const quickEditSame: SameShape<CrudQuickEditConfig, TableColumnQuickEditConfig> = true;
const responsiveSame: SameShape<CrudResponsiveConfig, TableResponsiveConfig> = true;

// ── the two excluded pairs: divergence frozen ────────────────────────────────

const crudSettingsAlignViaIndexOnly: KeyResolution<
  CrudColumnSettingsConfig,
  'align'
> = 'index-signature-or-missing';
const tableSettingsAlignDeclared: KeyResolution<TableColumnSettingsConfig, 'align'> = 'declared';

const crudLabelSameAsTable: SameShape<CrudColumnSchema['label'], TableColumnSchema['label']> = false;
const crudButtonsSameAsTable: SameShape<
  CrudColumnSchema['buttons'],
  TableColumnSchema['buttons']
> = false;

// CrudColumnSchema['label'] stays the wide SchemaValue form (accepts non-string
// schema values); TableColumnSchema['label'] stays `string | undefined`.
const crudLabelAcceptsNumber: SchemaLabelAcceptsNumber<CrudColumnSchema['label']> = true;
type SchemaLabelAcceptsNumber<T> = undefined extends T ? (number extends NonNullable<T> ? true : false) : false;

// CrudColumnSchema['buttons'] stays the SchemaInput form (BaseSchema | BaseSchema[]).
const crudButtonsAcceptSingleSchema: SchemaButtonsAcceptSingle<CrudColumnSchema['buttons']> = true;
const tableButtonsRejectSingleSchema: SchemaButtonsAcceptSingle<TableColumnSchema['buttons']> = false;
type SchemaButtonsAcceptSingle<T> = BaseSchema extends NonNullable<T> ? true : false;

describe('CX-13 crud declaration surface — four extends pairs', () => {
  it('CrudColumnFilterOption is structurally identical to TableColumnFilterOption', () => {
    expect(filterOptionSame).toBe(true);
  });

  it('CrudColumnFilterConfig is structurally identical to TableColumnFilterConfig', () => {
    expect(filterConfigSame).toBe(true);
  });

  it('CrudQuickEditConfig is structurally identical to TableColumnQuickEditConfig', () => {
    expect(quickEditSame).toBe(true);
  });

  it('CrudResponsiveConfig is structurally identical to TableResponsiveConfig', () => {
    expect(responsiveSame).toBe(true);
  });
});

describe('CX-13 crud declaration surface — two excluded pairs (recorded reasons)', () => {
  it('CrudColumnSettingsConfig has no declared align key while the Table side does (extends would widen)', () => {
    expect(crudSettingsAlignViaIndexOnly).toBe('index-signature-or-missing');
    expect(tableSettingsAlignDeclared).toBe('declared');
  });

  it('CrudColumnSchema label/buttons diverge from TableColumnSchema (extends would be TS2430)', () => {
    expect(crudLabelSameAsTable).toBe(false);
    expect(crudButtonsSameAsTable).toBe(false);
  });

  it('CrudColumnSchema keeps the wide label (SchemaValue) and SchemaInput buttons forms', () => {
    expect(crudLabelAcceptsNumber).toBe(true);
    expect(crudButtonsAcceptSingleSchema).toBe(true);
    expect(tableButtonsRejectSingleSchema).toBe(false);
  });
});
