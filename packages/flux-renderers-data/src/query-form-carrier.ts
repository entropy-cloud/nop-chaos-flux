import type { BaseSchema, SchemaInput } from '@nop-chaos/flux-core';

// The form renderer recognizes these label position values:
//   'normal'     → labels above inputs (default)
//   'horizontal' → labels left of inputs (same row, labelWidth applies)
//   'inline'     → labels and inputs on same line (compact)
// 'vertical' is an alias for 'normal' (used in `layout`); we normalize it.
const LABEL_POSITION_MODES = new Set(['normal', 'horizontal', 'inline']);
const MODE_TO_FORM_MODE: Record<string, string> = {
  horizontal: 'horizontal',
  inline: 'inline',
  normal: 'normal',
  vertical: 'normal', // alias
};

/**
 * Resolve the rendered form mode from `queryForm.mode` and `queryForm.layout`.
 *
 * Priority:
 *   1. Explicit `mode` if it is a label position value ('normal' | 'horizontal'
 *      | 'inline'). 'vertical' is accepted as an alias for 'normal' and
 *      normalized — the form renderer only recognizes 'normal' for vertical
 *      label stacking.
 *   2. Fallback to `layout`-based derivation:
 *        horizontal → horizontal, inline → inline, vertical/undefined → normal.
 *
 * The legacy `'manual' | 'auto'` mode values (autoGenerateQueryFilter behavior)
 * never collide with label position values, so they fall through to the layout
 * branch — preserving backwards compatibility for existing callers that use
 * `mode: 'manual'` without a layout.
 */
export function resolveFormMode(
  layout: string | undefined,
  mode: string | undefined,
): string {
  if (mode && (LABEL_POSITION_MODES.has(mode) || mode in MODE_TO_FORM_MODE)) {
    return MODE_TO_FORM_MODE[mode];
  }
  if (layout && layout in MODE_TO_FORM_MODE) {
    return MODE_TO_FORM_MODE[layout];
  }
  return 'normal';
}

interface EmbeddedQueryFormCarrierArgs {
  id: string;
  body: SchemaInput;
  layout: string | undefined;
  mode: string | undefined;
  columnCount?: number;
  gap?: number | string;
}

/**
 * Shared envelope for the two embedded query-form carriers (WA-data-005): the
 * crud `queryForm` region (data-schema-validation) and the query-filter
 * authoring transform (query-filter-definition).
 *
 * Default action buttons stay caller-owned — their dispatch channels genuinely
 * differ (`component:querySubmit`/`component:queryReset` against the crud id vs
 * `component:submit`/`component:reset` against the form id). Their variant
 * words ('default' vs 'primary') are visual aliases and render identically.
 */
export function buildEmbeddedQueryFormCarrier(
  args: EmbeddedQueryFormCarrierArgs,
): BaseSchema & Record<string, unknown> {
  const carrier: BaseSchema & Record<string, unknown> = {
    type: 'form',
    id: args.id,
    body: args.body,
    mode: resolveFormMode(args.layout, args.mode),
    actionsClassName: 'flex justify-end gap-2',
  } as BaseSchema & Record<string, unknown>;

  if (args.columnCount !== undefined) {
    carrier.columnCount = args.columnCount;
  }

  if (args.gap !== undefined) {
    carrier.gap = args.gap;
  }

  return carrier;
}
