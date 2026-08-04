import type { BaseSchema, RendererEnv } from '@nop-chaos/flux-core';

/**
 * C5.2 Phase 3 host-scenario schemas + fetchers (real-browser surfaces).
 * Extracted to keep the lab pages within the lint max-lines budget.
 *
 * Covers the plan failure paths:
 *   host-bg-select      — button-group selection toggle + onChange payload
 *   host-dd-row         — CRUD row dropdown-button menu → openDialog edit →
 *                         submits the CURRENT row value (bug 73 pattern;
 *                         re-verifies the 08-02 row-scope isolation fix)
 *   host-steps-owner    — steps local/controlled/scope three-way ownership
 *   host-steps-change   — steps click + onChange payload {value,stepIndex,stepKey}
 *   host-timeline       — timeline mode/orientation/reverse display, no owner state
 */

export const c5c2ButtonGroupSchema = {
  type: 'page',
  body: [
    {
      type: 'button-group',
      testid: 'c5c2-bg',
      selectionMode: 'single',
      variant: 'outline',
      items: [
        { key: 'opt1', label: 'Option 1' },
        { key: 'opt2', label: 'Option 2' },
        { key: 'opt3', label: 'Option 3' },
      ],
      onChange: {
        action: 'setValue',
        args: {
          path: 'c5c2BgPayload',
          value: '${value}|${selectedKeys}|${selectionMode}',
        },
      },
    },
    {
      type: 'text',
      text: 'bg-payload:${c5c2BgPayload ?? "none"}',
      testid: 'c5c2-bg-report',
    },
  ],
} as unknown as BaseSchema;

function controlledStepsButton(value: string, label: string) {
  return {
    type: 'button',
    label,
    onClick: { action: 'setValue', args: { path: 'c5c2StepsCtrl', value } },
  };
}

export const c5c2StepsOwnerSchema = {
  type: 'page',
  body: [
    {
      type: 'text',
      text: 'Local: click to switch (defaultValue=a).',
      testid: 'c5c2-steps-local-label',
    },
    {
      type: 'steps',
      testid: 'c5c2-steps-local',
      defaultValue: 'a',
      items: [
        { value: 'a', title: 'A' },
        { value: 'b', title: 'B' },
        { value: 'c', title: 'C' },
      ],
    },
    {
      type: 'text',
      text: 'Controlled: value=${c5c2StepsCtrl ?? "none"}; clicks dispatch but do not move.',
      testid: 'c5c2-steps-ctrl-report',
    },
    {
      type: 'flex',
      direction: 'row',
      gap: 8,
      body: [
        controlledStepsButton('a', 'Set controlled = a'),
        controlledStepsButton('b', 'Set controlled = b'),
        controlledStepsButton('c', 'Set controlled = c'),
      ],
    },
    {
      type: 'steps',
      testid: 'c5c2-steps-controlled',
      valueOwnership: 'controlled',
      value: '${c5c2StepsCtrl}',
      items: [
        { value: 'a', title: 'A' },
        { value: 'b', title: 'B' },
        { value: 'c', title: 'C' },
      ],
    },
    {
      type: 'text',
      text: 'Scope: writes valueStatePath (scope:${c5c2StepsScope ?? "none"}).',
      testid: 'c5c2-steps-scope-report',
    },
    {
      type: 'steps',
      testid: 'c5c2-steps-scope',
      valueOwnership: 'scope',
      valueStatePath: 'c5c2StepsScope',
      defaultValue: 'a',
      items: [
        { value: 'a', title: 'A' },
        { value: 'b', title: 'B' },
        { value: 'c', title: 'C' },
      ],
    },
  ],
} as unknown as BaseSchema;

export const c5c2StepsChangeSchema = {
  type: 'page',
  body: [
    {
      type: 'steps',
      testid: 'c5c2-steps-change',
      defaultValue: 's1',
      items: [
        { value: 's1', title: 'One' },
        { value: 's2', title: 'Two' },
      ],
      onChange: {
        action: 'setValue',
        args: {
          path: 'c5c2StepsPayload',
          value: '${value}|${stepIndex}|${stepKey}',
        },
      },
    },
    {
      type: 'text',
      text: 'steps-payload:${c5c2StepsPayload ?? "none"}',
      testid: 'c5c2-steps-change-report',
    },
  ],
} as unknown as BaseSchema;

export const c5c2TimelineSchema = {
  type: 'page',
  body: [
    {
      type: 'timeline',
      testid: 'c5c2-timeline-left',
      items: [
        { time: '09:00', title: 'First', detail: 'detail-1', level: 'default' },
        { time: '11:30', title: 'Second', detail: 'detail-2', level: 'success' },
        { time: '14:00', title: 'Third', detail: 'detail-3', level: 'error' },
      ],
    },
    {
      type: 'timeline',
      testid: 'c5c2-timeline-alternate',
      mode: 'alternate',
      items: [
        { time: '09:00', title: 'Alt-A' },
        { time: '10:00', title: 'Alt-B' },
      ],
    },
    {
      type: 'timeline',
      testid: 'c5c2-timeline-reverse',
      reverse: true,
      items: [
        { time: '1', title: 'First' },
        { time: '2', title: 'Second' },
        { time: '3', title: 'Third' },
      ],
    },
    {
      type: 'timeline',
      testid: 'c5c2-timeline-horizontal',
      orientation: 'horizontal',
      items: [
        { time: '09:00', title: 'H-A' },
        { time: '10:00', title: 'H-B' },
      ],
    },
  ],
} as unknown as BaseSchema;

export const c5c2CrudRowDropdownSchema = {
  type: 'page',
  body: [
    {
      type: 'crud',
      id: 'c5c2-row-dropdown-crud',
      rowKey: 'id',
      source: [
        { id: '1', userName: 'RowOne', nickName: 'RowOneNick' },
        { id: '2', userName: 'RowTwo', nickName: 'RowTwoNick' },
      ],
      columns: [
        { name: 'userName', label: 'User Name' },
        { name: 'nickName', label: 'Nick' },
        {
          type: 'operation',
          label: 'Actions',
          buttons: [
            {
              type: 'dropdown-button',
              label: 'More',
              items: [
                {
                  label: 'Edit Row',
                  onClick: {
                    action: 'openDialog',
                    args: {
                      title: 'Edit Row',
                      body: {
                        type: 'form',
                        id: 'c5c2-row-edit-form',
                        name: 'edit',
                        submitScope: 'surface',
                        loadAction: {
                          action: 'ajax',
                          args: {
                            url: '/r/C5c2Row__get?id=${$slot.record.id}',
                            method: 'post',
                            includeScope: '*',
                          },
                        },
                        submitAction: {
                          action: 'ajax',
                          args: {
                            url: '/r/C5c2Row__update?id=${$slot.record.id}',
                            method: 'post',
                            data: {
                              id: '${id}',
                              nickName: '${nickName}',
                            },
                          },
                        },
                        onSubmitSuccess: [{ action: 'closeSurface' }],
                        body: [
                          { type: 'input-text', name: 'nickName', label: 'Nick' },
                        ],
                        actions: [
                          {
                            type: 'button',
                            label: 'OK',
                            level: 'primary',
                            onClick: {
                              action: 'submitForm',
                              then: { action: 'closeSurface' },
                            },
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
    },
  ],
} as unknown as BaseSchema;

const rowGetResponses: Record<string, unknown> = {
  '1': { id: '1', userName: 'RowOne', nickName: 'RowOneNick' },
  '2': { id: '2', userName: 'RowTwo', nickName: 'RowTwoNick' },
};

/** Mock fetcher: per-row __get (by ?id=) + probe-storing __update. */
export const c5c2CrudRowFetcher = (async (api: { url?: string; data?: unknown }) => {
  const url = api.url ?? '';
  if (url.includes('__get')) {
    const id = new URLSearchParams(url.split('?')[1] ?? '').get('id') ?? '1';
    return { ok: true, status: 200, data: rowGetResponses[id] ?? null };
  }
  if (url.includes('__update')) {
    (window as unknown as { __c5c2RowEditProbe?: unknown }).__c5c2RowEditProbe = api.data;
    return { ok: true, status: 200, data: api.data };
  }
  if (url.includes('__findPage') || url.includes('__findList')) {
    return { ok: true, status: 200, data: { total: 0, items: [] } };
  }
  return { ok: true, status: 200, data: null };
}) as unknown as RendererEnv['fetcher'];
