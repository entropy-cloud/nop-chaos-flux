import type { ActionScope, BaseSchema } from '@nop-chaos/flux-core';

/**
 * C6.3 Phase 3 host-scenario schemas + probe registration (real-browser surfaces).
 * Extracted to keep the lab pages within the lint max-lines budget.
 *
 * Covers the plan failure paths:
 *   host-alert-close   — closable alert: close hides the node AND onClose
 *                        action args read the event payload `${level}`
 *                        (evaluationBindings contract, alert P1-1 fix).
 *   host-alert-action  — alert actions-region embedded button dispatches its
 *                        own action independently.
 *   host-mapping-row   — bug 73 pattern: mapping inside a repeated card row
 *                        resolves each row's OWN scope value (row pollution
 *                        re-verification); embedded Pick button submits the
 *                        clicked row's values.
 *   host-mapping-region — mapping item region renders the template on hit and
 *                        the embedded button dispatches its action; miss does
 *                        not render the region.
 *   host-status-dialog — status inside an openDialog surface evaluates
 *                        `$slot.record.*` scope values and projects the
 *                        levelMap semantic color.
 */

export const C6C3_ROWS = [
  { id: '1', label: 'Alpha', status: 'active' },
  { id: '2', label: 'Beta', status: 'idle' },
  { id: '3', label: 'Gamma', status: 'pending' },
];

export const C6C3_STATUS_MAP: Record<string, string> = {
  active: 'Active',
  idle: 'Idle',
};

/**
 * Probe namespace: `probe:record` (alert onClose report), `probe:action`
 * (alert actions-region button), `probe:pick` (mapping row embedded buttons),
 * `probe:region` (mapping item-region embedded button) — separate window slots
 * so overlapping dispatches never overwrite each other's evidence.
 */
export function registerC6c3Probe(actionScope: ActionScope | null) {
  actionScope?.registerNamespace('probe', {
    kind: 'host',
    invoke(method, payload) {
      const value = String((payload as { value?: unknown } | undefined)?.value ?? '');
      const w = window as unknown as {
        __c6c3AlertClose?: string;
        __c6c3AlertAction?: string;
        __c6c3MappingPick?: string;
        __c6c3MappingRegion?: string;
      };
      if (method === 'action') {
        w.__c6c3AlertAction = value;
      } else if (method === 'pick') {
        w.__c6c3MappingPick = value;
      } else if (method === 'region') {
        w.__c6c3MappingRegion = value;
      } else {
        w.__c6c3AlertClose = value;
      }
      return { ok: true, data: value };
    },
  });
}

export const c6c3AlertHostSchema = {
  type: 'page',
  body: [
    {
      type: 'alert',
      testid: 'c6c3-alert-close',
      level: 'warning',
      title: 'Closable alert',
      body: 'Click the X to dismiss; onClose reports the level payload.',
      closable: true,
      onClose: {
        action: 'probe:record',
        // `${level}` must resolve from the event payload (evaluationBindings
        // contract, alert P1-1 fix) — NOT from scope.
        args: { value: '${level}|closed' },
      },
    },
    {
      type: 'alert',
      testid: 'c6c3-alert-actions',
      level: 'success',
      title: 'Alert with actions',
      body: 'The inner button dispatches its own action.',
      actions: [
        {
          type: 'button',
          label: 'Primary action',
          testid: 'c6c3-alert-inner-action',
          onClick: { action: 'probe:action', args: { value: 'inner-fired' } },
        },
      ],
    },
    {
      type: 'text',
      text: 'close-report:${closeReported ? "fired" : "pending"}',
      testid: 'c6c3-alert-close-report',
    },
  ],
} as unknown as BaseSchema;

export const c6c3MappingRowSchema = {
  type: 'page',
  body: [
    {
      type: 'cards',
      testid: 'c6c3-cards-rows',
      items: '${rows}',
      card: {
        type: 'flex',
        direction: 'row',
        gap: 8,
        align: 'center',
        body: [
          { type: 'text', text: '${$slot.item.label}' },
          {
            type: 'mapping',
            value: '${$slot.item.status}',
            map: '${statusMap}',
            defaultLabel: 'Unknown',
          },
          {
            type: 'button',
            label: 'Pick',
            onClick: {
              action: 'probe:pick',
              args: { value: '${$slot.item.label}|${$slot.item.status}' },
            },
          },
        ],
      },
    },
  ],
} as unknown as BaseSchema;

export const c6c3MappingRegionSchema = {
  type: 'page',
  body: [
    {
      type: 'mapping',
      testid: 'c6c3-mapping-region',
      value: 'active',
      map: { active: 'Active' },
      item: [
        {
          type: 'flex',
          direction: 'row',
          gap: 8,
          align: 'center',
          body: [
            { type: 'text', text: 'Custom hit template' },
            {
              type: 'button',
              label: 'Region action',
              testid: 'c6c3-region-action',
              onClick: { action: 'probe:region', args: { value: 'region-fired' } },
            },
          ],
        },
      ],
    },
    {
      type: 'mapping',
      testid: 'c6c3-mapping-region-miss',
      value: 'unknown',
      map: { active: 'Active' },
      item: [{ type: 'text', text: 'should-not-render' }],
    },
  ],
} as unknown as BaseSchema;

export const c6c3StatusDialogSchema = {
  type: 'page',
  body: [
    {
      type: 'crud',
      id: 'c6c3-status-crud',
      testid: 'c6c3-status-crud',
      rowKey: 'id',
      source: [
        { id: '1', label: 'Alpha', status: 'active' },
        { id: '2', label: 'Beta', status: 'idle' },
        { id: '3', label: 'Gamma', status: 'pending' },
      ],
      columns: [
        { name: 'label', label: 'Label' },
        {
          type: 'operation',
          label: 'Actions',
          buttons: [
            {
              type: 'button',
              label: 'Details',
              onClick: {
                action: 'openDialog',
                args: {
                  title: 'Status details',
                  body: {
                    type: 'page',
                    body: [
                      { type: 'text', text: 'Row: ${$slot.record.label}' },
                      {
                        type: 'status',
                        testid: 'c6c3-dialog-status',
                        value: '${$slot.record.status}',
                        labelMap: { active: 'Active', idle: 'Idle', pending: 'Pending' },
                        levelMap: { active: 'success', idle: 'info', pending: 'warning' },
                      },
                    ],
                  },
                },
              },
            },
          ],
        },
      ],
    },
  ],
} as unknown as BaseSchema;
