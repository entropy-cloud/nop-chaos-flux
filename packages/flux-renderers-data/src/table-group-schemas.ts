import type { SchemaObject, SchemaValue } from '@nop-chaos/flux-core';

/** D1 G-D schema type family split out of schemas.ts (file-size governance). */

/** Group-level aggregate declaration (D1 G-D). */
export interface TableGroupAggregateConfig extends SchemaObject {
  fn: 'sum' | 'avg' | 'min' | 'max' | 'count';
  /** Record field aggregated. Required for sum/avg/min/max; ignored by count. */
  field?: string;
  /** Display label (defaults to the fn name). */
  label?: string;
}

/**
 * Client-side grouping declaration (D1 G-D). Declaring `group.field` enables
 * grouping over the sorted/filtered row set: group header rows interleave the
 * body, aggregates evaluate per group over the full member set.
 */
export interface TableGroupConfig extends SchemaObject {
  /** Record field grouped by. Required. */
  field?: string;
  /** Per-group aggregates rendered inside the header. */
  aggregates?: TableGroupAggregateConfig[];
  /** Label of the fallback group for missing/null/empty field values. Defaults to '-'. */
  missingLabel?: string;
}

/** Select option for the cell in-place edit editor matrix (D1 G-D). */
export interface TableCellEditableOption extends SchemaObject {
  label?: string;
  value?: SchemaValue;
}

/**
 * Cell-level in-place edit declaration (D1 G-D). Drives the per-cell
 * navigation↔editing two-state machine; coexists with (and takes precedence
 * over) the row-embedded `quickEdit` channel.
 */
export interface TableCellEditableConfig extends SchemaObject {
  /** Editor kind mapped onto the existing input-family widgets. Defaults to 'text'. */
  editor?: 'text' | 'number' | 'select' | 'date' | 'checkbox';
  /** Select editor options. */
  options?: TableCellEditableOption[];
  /** Block commit on empty value (gd-cell-edit-invalid). */
  required?: boolean;
}
