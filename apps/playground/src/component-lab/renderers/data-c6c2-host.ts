import type { ActionScope, BaseSchema } from '@nop-chaos/flux-core';

/**
 * C6.2 Phase 3 host-scenario schemas + probe registration (real-browser surfaces).
 * Extracted to keep the lab pages within the lint max-lines budget.
 *
 * Covers the plan failure paths:
 *   host-cards-select — cards local-only selection (single/multiple/none) with
 *                       onSelectionChange reports; no value/valueOwnership.
 *   host-cards-action — bug 73 pattern: cards item embedded button action submits
 *                       the CORRECT per-row item scope value (row pollution
 *                       re-verification) + onItemClick per-row report.
 *   host-card-click   — card onClick + embedded action coexist (DOM bubbling).
 *   host-empty-cta    — empty actions CTA triggers its action.
 *   host-progress-clamp — progress value over max / negative clamps correctly
 *                       and follows scope updates (aria-valuenow = real value).
 *   host-spinner-visible — meta.visible scope toggle hides/shows the spinner.
 *   host-separator    — horizontal/vertical/labelled/decorative contracts.
 */

export const CARDS_ROWS = [
  { id: '1', label: 'Alpha' },
  { id: '2', label: 'Beta' },
  { id: '3', label: 'Gamma' },
];

export const c6c2CardsSelectSchema = {
  type: 'page',
  body: [
    {
      type: 'text',
      text: 'single (local-only): click cards to move the highlight.',
      testid: 'c6c2-single-heading',
    },
    {
      type: 'cards',
      testid: 'c6c2-cards-single',
      selectionMode: 'single',
      items: '${cardsRows}',
      onSelectionChange: {
        action: 'setValue',
        args: { path: 'singleReport', value: '${selectedKeys}' },
      },
      card: { type: 'text', text: '${$slot.item.label}' },
    },
    {
      type: 'text',
      text: 'single-report:${singleReport ?? "pending"}',
      testid: 'c6c2-single-report',
    },
    {
      type: 'text',
      text: 'multiple: clicks accumulate.',
      testid: 'c6c2-multiple-heading',
    },
    {
      type: 'cards',
      testid: 'c6c2-cards-multiple',
      selectionMode: 'multiple',
      items: '${cardsRows}',
      card: { type: 'text', text: '${$slot.item.label}' },
    },
    {
      type: 'text',
      text: 'none: selection is off entirely.',
      testid: 'c6c2-none-heading',
    },
    {
      type: 'cards',
      testid: 'c6c2-cards-none',
      selectionMode: 'none',
      items: '${cardsRows}',
      onSelectionChange: {
        action: 'setValue',
        args: { path: 'noneReport', value: 'fired' },
      },
      card: { type: 'text', text: '${$slot.item.label}' },
    },
    {
      type: 'text',
      text: 'none-report:${noneReport ?? "pending"}',
      testid: 'c6c2-none-report',
    },
  ],
} as unknown as BaseSchema;

/**
 * Probe namespace: `probe:record` (item/selection events) stores into
 * __c6c2CardsProbe; `probe:pick` (embedded item buttons) stores into
 * __c6c2CardsPick — separate slots so bubbling dispatches do not overwrite
 * each other's evidence.
 */
export function registerC6c2Probe(actionScope: ActionScope | null) {
  actionScope?.registerNamespace('probe', {
    kind: 'host',
    invoke(method, payload) {
      const value = String((payload as { value?: unknown } | undefined)?.value ?? '');
      const w = window as unknown as {
        __c6c2CardsProbe?: string;
        __c6c2CardsPick?: string;
      };
      if (method === 'pick') {
        w.__c6c2CardsPick = value;
      } else {
        w.__c6c2CardsProbe = value;
      }
      return { ok: true, data: value };
    },
  });
}

export const c6c2CardsActionSchema = {
  type: 'page',
  body: [
    {
      type: 'cards',
      testid: 'c6c2-cards-action',
      selectionMode: 'single',
      items: '${cardsRows}',
      onItemClick: {
        action: 'probe:record',
        // `${item.label}` resolves from the per-row itemScope; `${key}` is a
        // payload-only field (evaluationBindings contract) — both must work.
        args: { value: '${item.label}|${key}' },
      },
      card: {
        type: 'flex',
        direction: 'column',
        gap: 8,
        body: [
          { type: 'text', text: '${$slot.item.label} (id ${$slot.item.id})' },
          {
            type: 'button',
            label: 'Pick',
            onClick: { action: 'probe:pick', args: { value: '${$slot.item.label}' } },
          },
        ],
      },
    },
  ],
} as unknown as BaseSchema;

export const c6c2CardClickSchema = {
  type: 'page',
  body: [
    {
      type: 'card',
      testid: 'c6c2-card',
      title: 'Clickable card with inner action',
      onClick: { action: 'setValue', args: { path: 'cardClicked', value: true } },
      body: [{ type: 'text', text: 'Card body — click the card to flip the flag.' }],
      actions: [
        {
          type: 'button',
          label: 'Inner action',
          testid: 'c6c2-inner-action',
          onClick: {
            action: 'setValue',
            args: { path: 'innerCount', value: '${(innerCount ?? 0) + 1}' },
          },
        },
      ],
    },
    {
      type: 'text',
      text: 'card-clicked:${cardClicked ? "true" : "pending"}',
      testid: 'c6c2-card-click-report',
    },
    {
      type: 'text',
      text: 'inner:${innerCount ?? 0}',
      testid: 'c6c2-inner-report',
    },
  ],
} as unknown as BaseSchema;

export const c6c2EmptyCtaSchema = {
  type: 'page',
  body: [
    {
      type: 'empty',
      testid: 'c6c2-empty',
      title: 'No results',
      description: 'Try a different query.',
      actions: [
        {
          type: 'button',
          label: 'Reset',
          testid: 'c6c2-empty-cta',
          onClick: { action: 'setValue', args: { path: 'ctaClicked', value: true } },
        },
      ],
    },
    {
      type: 'text',
      text: 'cta:${ctaClicked ? "fired" : "pending"}',
      testid: 'c6c2-empty-report',
    },
  ],
} as unknown as BaseSchema;

export const c6c2ProgressClampSchema = {
  type: 'page',
  body: [
    {
      type: 'progress',
      testid: 'c6c2-progress',
      value: '${progressValue}',
      max: 100,
      showValue: true,
      label: 'Clamped progress',
    },
    {
      type: 'flex',
      direction: 'row',
      gap: 8,
      body: [
        {
          type: 'button',
          label: 'Set 250',
          onClick: { action: 'setValue', args: { path: 'progressValue', value: 250 } },
        },
        {
          type: 'button',
          label: 'Set -10',
          onClick: { action: 'setValue', args: { path: 'progressValue', value: -10 } },
        },
        {
          type: 'button',
          label: 'Set 42',
          onClick: { action: 'setValue', args: { path: 'progressValue', value: 42 } },
        },
      ],
    },
  ],
} as unknown as BaseSchema;

export const c6c2SpinnerVisibleSchema = {
  type: 'page',
  body: [
    {
      type: 'spinner',
      testid: 'c6c2-spinner',
      label: 'Loading…',
      visible: '${spinnerOn !== false}',
    },
    {
      type: 'button',
      label: 'Hide spinner',
      testid: 'c6c2-toggle-spinner',
      onClick: { action: 'setValue', args: { path: 'spinnerOn', value: false } },
    },
  ],
} as unknown as BaseSchema;

export const c6c2SeparatorSchema = {
  type: 'page',
  body: [
    {
      type: 'flex',
      direction: 'column',
      gap: 12,
      body: [
        { type: 'text', text: 'Above' },
        { type: 'separator', testid: 'c6c2-sep-h' },
        { type: 'text', text: 'Below' },
        {
          type: 'flex',
          direction: 'row',
          align: 'center',
          gap: 12,
          body: [
            { type: 'text', text: 'Left' },
            { type: 'separator', testid: 'c6c2-sep-v', orientation: 'vertical' },
            { type: 'text', text: 'Right' },
          ],
        },
        { type: 'separator', testid: 'c6c2-sep-label', label: 'Section' },
        { type: 'separator', testid: 'c6c2-sep-decorative', decorative: true },
      ],
    },
  ],
} as unknown as BaseSchema;
