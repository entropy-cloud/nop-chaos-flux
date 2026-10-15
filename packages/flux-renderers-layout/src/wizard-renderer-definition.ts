import type { RegisteredRendererDefinition } from '@nop-chaos/flux-core';
import { WizardRenderer } from './wizard-renderer.js';

// RM-4 (plan 606) sibling-extraction precedent (process-display-definitions /
// resizable-renderer-definition): the wizard definition's absorbed contracts
// pushed `layout-renderer-definitions.ts` past the 710-line lint ceiling.
export const wizardRendererDefinition: RegisteredRendererDefinition = {
    type: 'wizard',
    displayName: 'Wizard',
    category: 'layout',
    sourcePackage: '@nop-chaos/flux-renderers-layout',
    component: WizardRenderer,
    fields: [
      {
        key: 'steps',
        kind: 'prop',
        contract: {
          shape: {
            kind: 'array',
            item: {
              kind: 'schema-definition',
              fieldRules: {
                title: {
                  kind: 'value-or-region',
                  regionKey: 'titleRegionKey',
                  params: ['step', 'index', 'key'],
                  isolate: false,
                },
                body: {
                  kind: 'region',
                  regionKey: 'bodyRegionKey',
                  params: ['step', 'index', 'key'],
                  isolate: false,
                },
                actions: {
                  kind: 'region',
                  regionKey: 'actionsRegionKey',
                  params: ['step', 'index', 'key'],
                  isolate: false,
                },
                disabled: 'literal',
                beforeEnter: 'event',
                beforeLeave: 'event',
              },
            },
          },
          displayName: 'Steps',
          description:
            'Renderer-owned structured step list. Declaration order = navigation order. Each step carries title/body/actions regions + visible/disabled flags.',
          editorType: 'object-array',
        },
      },
      {
        key: 'value',
        kind: 'prop',
        contract: {
          shape: { kind: 'union', anyOf: [{ kind: 'string' }, { kind: 'number' }] },
          displayName: 'Value',
          description:
            'Initial step key or index (0-based index when numeric and no matching key). Seed only — step navigation is local controlled state (non-reactive to runtime value changes).',
          editorType: 'expression',
        },
      },
      {
        key: 'defaultValue',
        kind: 'prop',
        contract: {
          shape: { kind: 'union', anyOf: [{ kind: 'string' }, { kind: 'number' }] },
          displayName: 'Default Value',
          description: 'Initial current step when value is not provided. Seed only (non-reactive).',
          editorType: 'expression',
        },
      },
      {
        key: 'statusPath',
        kind: 'prop',
        contract: {
          shape: { kind: 'string' },
          displayName: 'Status Path',
          description:
            'Publishes a read-only wizard summary: { currentStepKey, currentStepIndex, stepCount, canGoNext, canGoPrev, committing, validating, lastCommitStatus, stepError? }. Interaction state and lifecycle state are kept separate per design §6.',
          editorType: 'expression',
        },
      },
      { key: 'mode', kind: 'prop' },
      {
        key: 'linear',
        kind: 'prop',
        valueType: 'boolean',
        contract: {
          shape: { kind: 'boolean' },
          displayName: 'Linear',
          description:
            'Default true. When true, uncommitted steps cannot be jumped to unless allowStepJump is set.',
          editorType: 'switch',
          defaultValue: true,
        },
      },
      {
        key: 'allowStepJump',
        kind: 'prop',
        valueType: 'boolean',
        contract: {
          shape: { kind: 'boolean' },
          displayName: 'Allow Step Jump',
          description: 'Allow non-linear step jumping even when linear=true.',
          editorType: 'switch',
          defaultValue: false,
        },
      },
      {
        key: 'mountOnEnter',
        kind: 'prop',
        valueType: 'boolean',
        contract: {
          shape: { kind: 'boolean' },
          displayName: 'Mount On Enter',
          description: 'Mount step body on first enter (keep mounted after). Defaults to true: visited steps stay mounted (back preserves values) unless unmountOnExit opts out.',
          editorType: 'switch',
          defaultValue: true,
        },
      },
      {
        key: 'unmountOnExit',
        kind: 'prop',
        valueType: 'boolean',
        contract: {
          shape: { kind: 'boolean' },
          displayName: 'Unmount On Exit',
          description: 'Unmount step body when it exits.',
          editorType: 'switch',
          defaultValue: false,
        },
      },
      { key: 'actionFinishLabel', kind: 'prop' },
      { key: 'actionNextLabel', kind: 'prop' },
      { key: 'actionPrevLabel', kind: 'prop' },
      {
        key: 'onChange',
        kind: 'event',
        contract: {
          displayName: 'On Change',
          description:
            'Navigation event (interaction layer). Dispatched when currentStepIndex changes via Next/Prev/step-click. Payload: { currentStepKey, currentStepIndex }.',
          payload: {
            kind: 'object',
            fields: {
              currentStepKey: { kind: 'unknown' },
              currentStepIndex: { kind: 'number' },
            },
          },
        },
      },
      {
        key: 'onStepCommit',
        kind: 'event',
        contract: {
          displayName: 'On Step Commit',
          description:
            'Semantic step-commit event (lifecycle layer). Dispatched when Next is clicked, BEFORE advancing. May validate or submit; failures surface as lastCommitStatus=error and prevent advancement.',
          payload: {
            kind: 'object',
            fields: {
              currentStepKey: { kind: 'unknown' },
              currentStepIndex: { kind: 'number' },
            },
          },
        },
      },
      {
        key: 'onComplete',
        kind: 'event',
        contract: {
          displayName: 'On Complete',
          description:
            'Lifecycle event dispatched when the final step is committed successfully. Payload: { currentStepKey, currentStepIndex }.',
          payload: {
            kind: 'object',
            fields: {
              currentStepKey: { kind: 'unknown' },
              currentStepIndex: { kind: 'number' },
            },
          },
        },
      },
      {
        key: 'onStepError',
        kind: 'event',
        contract: {
          displayName: 'On Step Error',
          description:
            'Lifecycle event dispatched when step commit fails or throws. Payload: { currentStepKey, currentStepIndex, reason, error? }.',
          payload: {
            kind: 'object',
            fields: {
              currentStepKey: { kind: 'unknown' },
              currentStepIndex: { kind: 'number' },
              reason: { kind: 'string' },
            },
          },
        },
      },
    ],
};
