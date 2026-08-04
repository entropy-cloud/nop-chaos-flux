import type { BaseSchema, ActionScope } from '@nop-chaos/flux-core';

/**
 * C5.1 Phase 3 host-scenario schemas + probe wiring (real-browser surfaces).
 * Extracted to keep the lab pages within the lint max-lines budget.
 *
 * Covers the plan failure paths:
 *   host-wizard-step   — embedded form step validation + onComplete submit
 *   host-wizard-gate   — beforeEnter/beforeLeave async gate (probe namespace)
 *   host-collapse      — local/controlled/scope three-way expand ownership
 *   host-grid          — nested grid + responsive columns + marker-only root
 *   host-wizard-dialog — wizard inside a dialog (bug 73 pattern: unit-green but
 *                        real-browser failure risk from portal/focus layering)
 */

export const c5c1GridSchema = {
  type: 'page',
  body: [
    {
      type: 'grid',
      testid: 'c5c1-grid',
      columns: 2,
      responsiveColumns: { sm: 1, lg: 2 },
      gap: 'md',
      items: [
        { body: [{ type: 'text', text: 'outer-A', testid: 'c5c1-grid-outer-a' }] },
        {
          body: [
            {
              type: 'grid',
              testid: 'c5c1-grid-nested',
              columns: 2,
              gap: 8,
              items: [
                { body: [{ type: 'text', text: 'nested-1' }] },
                { body: [{ type: 'text', text: 'nested-2' }] },
                { body: [{ type: 'text', text: 'nested-3' }] },
                { body: [{ type: 'text', text: 'nested-4' }] },
              ],
            },
          ],
        },
        {
          body: [{ type: 'text', text: 'wide-cell', testid: 'c5c1-grid-wide' }],
          colSpan: 2,
        },
      ],
    },
  ],
} as unknown as BaseSchema;

function controlledCollapseValueButton(value: string, label: string) {
  return {
    type: 'button',
    label,
    onClick: { action: 'setValue', args: { path: 'c5c1CtrlPanel', value } },
  };
}

export const c5c1CollapseSchema = {
  type: 'page',
  body: [
    {
      type: 'flex',
      direction: 'column',
      gap: 16,
      body: [
        {
          type: 'text',
          text: 'Local: click panels to expand (multiple default).',
          testid: 'c5c1-local-label',
        },
        {
          type: 'collapse',
          testid: 'c5c1-local',
          items: [
            { key: 'l1', title: 'Local Panel A', body: [{ type: 'text', text: 'local-body-A' }] },
            { key: 'l2', title: 'Local Panel B', body: [{ type: 'text', text: 'local-body-B' }] },
          ],
        },
        {
          type: 'text',
          text: 'Controlled: value is scope-driven (${c5c1CtrlPanel ?? "none"}); clicking dispatches onChange but does not flip state.',
          testid: 'c5c1-ctrl-report',
        },
        {
          type: 'flex',
          direction: 'row',
          gap: 8,
          body: [
            controlledCollapseValueButton('a', 'Set controlled = a'),
            controlledCollapseValueButton('b', 'Set controlled = b'),
            controlledCollapseValueButton('none', 'Set controlled = none'),
          ],
        },
        {
          type: 'collapse',
          testid: 'c5c1-controlled',
          valueOwnership: 'controlled',
          value: '${c5c1CtrlPanel}',
          multiple: false,
          items: [
            { key: 'a', title: 'Controlled A', body: [{ type: 'text', text: 'ctrl-body-A' }] },
            { key: 'b', title: 'Controlled B', body: [{ type: 'text', text: 'ctrl-body-B' }] },
          ],
        },
        {
          type: 'text',
          text: 'Scope: writes valueStatePath (scope:${c5c1ScopeExpanded ?? "none"}).',
          testid: 'c5c1-scope-report',
        },
        {
          type: 'collapse',
          testid: 'c5c1-scope',
          valueOwnership: 'scope',
          valueStatePath: 'c5c1ScopeExpanded',
          multiple: false,
          items: [
            { key: 's1', title: 'Scope Panel One', body: [{ type: 'text', text: 'scope-body-1' }] },
            { key: 's2', title: 'Scope Panel Two', body: [{ type: 'text', text: 'scope-body-2' }] },
          ],
        },
      ],
    },
  ],
} as unknown as BaseSchema;

export const c5c1WizardStepSchema = {
  type: 'page',
  body: [
    {
      type: 'wizard',
      testid: 'c5c1-wizard-step',
      statusPath: 'c5c1WizardStatus',
      steps: [
        {
          title: 'Details',
          formId: 'c5c1-wizard-form',
          body: [
            {
              type: 'form',
              id: 'c5c1-wizard-form',
              body: [
                {
                  type: 'input-text',
                  name: 'customer',
                  label: 'Customer name',
                  required: true,
                  testid: 'c5c1-wizard-input',
                },
              ],
            },
          ],
        },
        {
          title: 'Review',
          body: [
            { type: 'text', text: 'Review step: all good', testid: 'c5c1-review' },
          ],
        },
      ],
      onComplete: {
        action: 'setValue',
        args: { path: 'c5c1WizardDone', value: true },
      },
    },
    {
      type: 'text',
      text: 'wizard-done:${c5c1WizardDone ? "yes" : "no"}',
      testid: 'c5c1-wizard-done-report',
    },
  ],
} as unknown as BaseSchema;

export const c5c1WizardGateSchema = {
  type: 'page',
  body: [
    {
      type: 'wizard',
      testid: 'c5c1-wizard-gate',
      allowStepJump: true,
      steps: [
        {
          title: 'A',
          body: [{ type: 'text', text: 'step-A', testid: 'c5c1-gate-step-a' }],
          beforeLeave: {
            action: 'setValue',
            args: { path: 'c5c1GateLeftA', value: true },
          },
        },
        {
          title: 'B',
          body: [{ type: 'text', text: 'step-B', testid: 'c5c1-gate-step-b' }],
          beforeEnter: { action: 'probe:blockEnter' },
        },
      ],
    },
    {
      type: 'text',
      text: 'left-a:${c5c1GateLeftA ? "yes" : "no"}',
      testid: 'c5c1-gate-report',
    },
  ],
} as unknown as BaseSchema;

/** Blocking probe for the async-gate scenario. */
export function registerC5c1GateProbe(actionScope: ActionScope | null) {
  actionScope?.registerNamespace('probe', {
    kind: 'host',
    invoke() {
      return { ok: false };
    },
  });
}

export const c5c1WizardDialogSchema = {
  type: 'page',
  body: [
    {
      type: 'text',
      text: 'Open the dialog and run the wizard inside it (bug 73 pattern).',
    },
    {
      type: 'button',
      label: 'Open wizard dialog',
      testid: 'c5c1-open-wizard-dialog',
      onClick: {
        action: 'openDialog',
        args: {
          title: 'Wizard inside dialog',
          body: [
            {
              type: 'wizard',
              testid: 'c5c1-wizard-dialog',
              steps: [
                {
                  title: 'First',
                  body: [
                    { type: 'text', text: 'Dialog step 1', testid: 'c5c1-dialog-step-1' },
                  ],
                },
                {
                  title: 'Last',
                  body: [{ type: 'text', text: 'Dialog step 2', testid: 'c5c1-dialog-step-2' }],
                },
              ],
              // Completion is reported through a host probe: dialog content
              // writes to its own (dialog-branch) scope by design, so the
              // page-level report cannot observe a setValue write — the window
              // probe is the canonical cross-scope host signal (dialog-edit-submit
              // pattern).
              onComplete: { action: 'probe:dialogWizardDone' },
            },
          ],
          actions: [{ type: 'button', label: 'Close', onClick: { action: 'closeSurface' } }],
        },
      },
    },
  ],
} as unknown as BaseSchema;

/** Completion probe for the dialog-hosted wizard scenario. */
export function registerC5c1DialogProbe(actionScope: ActionScope | null) {
  actionScope?.registerNamespace('probe', {
    kind: 'host',
    invoke() {
      const w = window as unknown as { __c5c1DialogWizardProbe?: number };
      w.__c5c1DialogWizardProbe = (w.__c5c1DialogWizardProbe ?? 0) + 1;
      return { ok: true };
    },
  });
}
