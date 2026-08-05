import type { ActionScope, BaseSchema } from '@nop-chaos/flux-core';

/**
 * C9 Phase 3 host-scenario schemas + probe registration (real-browser
 * surfaces). Extracted to keep the lab pages within the lint max-lines budget
 * (data-c8-3-host.ts precedent).
 *
 * Covers the plan failure paths:
 *   host-gantt-dialog — gantt inside an openDialog surface (bug 73 pattern):
 *                        bar click dispatches onTaskClick with `${_taskId}`
 *                        resolved through the dispatch ctx.
 *   host-kanban-drag  — kanban inside an openDialog surface: card click
 *                        dispatches onCardClick with `${cardId}|${index}` and
 *                        a cross-column drag dispatches onCardMove.
 *   host-cal-load     — calendar inside a dialog: loadAction fires on mount,
 *                        event block click dispatches onEventClick with
 *                        `${eventId}|${title}` resolved via ctx.
 *   host-barcode-form — barcode-input in a form: manual input writes back to
 *                        the form, required validation blocks empty submit,
 *                        submit echoes the committed value via probe.
 */

export function registerC9Probe(actionScope: ActionScope | null) {
  actionScope?.registerNamespace('probe', {
    kind: 'host',
    invoke(method, payload) {
      const value = String((payload as { value?: unknown } | undefined)?.value ?? '');
      const w = window as unknown as Record<string, string | number | undefined>;
      const key = `__c9${method[0].toUpperCase()}${method.slice(1)}`;
      const countKey = `${key}Count`;
      w[key] = value;
      w[countKey] = ((w[countKey] as number | undefined) ?? 0) + 1;
      return { ok: true, data: value };
    },
  });
}

function isoDaysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const GANTT_TASKS = [
  { id: 'g1', text: 'Design review', start: isoDaysFromNow(-4), end: isoDaysFromNow(2) },
  { id: 'g2', text: 'Implementation', start: isoDaysFromNow(1), end: isoDaysFromNow(9), parent: null },
  { id: 'g3', text: 'QA pass', start: isoDaysFromNow(8), end: isoDaysFromNow(14) },
];

export const c9GanttDialogSchema = {
  type: 'page',
  body: [
    {
      type: 'button',
      label: 'Open gantt dialog',
      testid: 'c9-gantt-open',
      onClick: {
        action: 'openDialog',
        args: {
          title: 'Gantt host',
          body: {
            type: 'page',
            body: [
              {
                type: 'gantt',
                testid: 'c9-gantt-in-dialog',
                tasks: GANTT_TASKS,
                links: [],
                onTaskClick: {
                  action: 'probe:ganttClick',
                  args: { value: '${_taskId}' },
                },
              },
            ],
          },
        },
      },
    },
  ],
} as unknown as BaseSchema;

const KANBAN_BOARD = {
  root: { id: 'root', type: 'root', children: ['k1', 'k2'], data: {}, meta: {} },
  k1: { id: 'k1', type: 'column', parentId: 'root', children: ['kc1', 'kc2'], data: { title: 'To Do' }, meta: {} },
  k2: { id: 'k2', type: 'column', parentId: 'root', children: [], data: { title: 'Done' }, meta: {} },
  kc1: { id: 'kc1', type: 'card', parentId: 'k1', children: [], data: { title: 'Card Alpha' }, meta: {} },
  kc2: { id: 'kc2', type: 'card', parentId: 'k1', children: [], data: { title: 'Card Beta' }, meta: {} },
};

export const c9KanbanDialogSchema = {
  type: 'page',
  body: [
    {
      type: 'button',
      label: 'Open kanban dialog',
      testid: 'c9-kanban-open',
      onClick: {
        action: 'openDialog',
        args: {
          title: 'Kanban host',
          body: {
            type: 'page',
            body: [
              {
                type: 'kanban',
                testid: 'c9-kanban-in-dialog',
                data: KANBAN_BOARD,
                onCardClick: {
                  action: 'probe:kanbanCard',
                  args: { value: '${cardId}|${index}' },
                },
                onCardMove: {
                  action: 'probe:kanbanMove',
                  args: { value: '${cardId}|${toColumnId}|${toIndex}' },
                },
              },
            ],
          },
        },
      },
    },
  ],
} as unknown as BaseSchema;

const CAL_EVENTS = [
  { id: 'ce1', title: 'Morning shift', start: isoDaysFromNow(0), end: isoDaysFromNow(0), type: 'shift', resourceId: 'r1' },
  { id: 'ce2', title: 'Maintenance', start: isoDaysFromNow(1), end: isoDaysFromNow(1), type: 'maintenance', resourceId: 'r2' },
];

export const c9CalendarDialogSchema = {
  type: 'page',
  body: [
    {
      type: 'button',
      label: 'Open calendar dialog',
      testid: 'c9-cal-open',
      onClick: {
        action: 'openDialog',
        args: {
          title: 'Calendar host',
          body: {
            type: 'page',
            body: [
              {
                type: 'calendar',
                testid: 'c9-cal-in-dialog',
                events: CAL_EVENTS,
                resources: [
                  { id: 'r1', title: 'Team A' },
                  { id: 'r2', title: 'Team B' },
                ],
                loadAction: {
                  action: 'probe:calLoad',
                  args: { value: 'loaded' },
                },
                onEventClick: {
                  action: 'probe:calEvent',
                  args: { value: '${event.id}|${event.title}' },
                },
              },
            ],
          },
        },
      },
    },
  ],
} as unknown as BaseSchema;

export const c9BarcodeFormSchema = {
  type: 'page',
  body: [
    {
      type: 'form',
      testid: 'c9-barcode-form',
      submitAction: {
        action: 'probe:barcodeSubmit',
        args: { value: '${barcode}' },
      },
      body: [
        {
          type: 'barcode-input',
          name: 'barcode',
          label: 'Barcode',
          required: true,
          testid: 'c9-barcode',
        },
      ],
      actions: [
        {
          type: 'button',
          label: 'Submit',
          testid: 'c9-barcode-submit',
          onClick: { action: 'submitForm' },
        },
      ],
    },
  ],
} as unknown as BaseSchema;
