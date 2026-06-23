import type { RendererDefinition } from '@nop-chaos/flux-core';
import { extractNestedSchemaRegions } from '@nop-chaos/flux-core';
import { WizardRenderer } from './wizard-renderer.js';

export const layoutRendererDefinitions: RendererDefinition[] = [
  {
    type: 'wizard',
    displayName: 'Wizard',
    category: 'layout',
    sourcePackage: '@nop-chaos/flux-renderers-layout',
    component: WizardRenderer,
    propContracts: {
      steps: {
        shape: { kind: 'array', item: { kind: 'unknown' } },
        displayName: 'Steps',
        description:
          'Renderer-owned structured step list. Declaration order = navigation order. Each step carries title/body/actions regions + visible/disabled/optional flags.',
        editorType: 'object-array',
      },
      value: {
        shape: { kind: 'union', anyOf: [{ kind: 'string' }, { kind: 'number' }] },
        displayName: 'Value',
        description:
          'Current step key or index (1-based index when numeric and no matching key). Local controlled by default.',
        editorType: 'expression',
      },
      defaultValue: {
        shape: { kind: 'union', anyOf: [{ kind: 'string' }, { kind: 'number' }] },
        displayName: 'Default Value',
        description: 'Initial current step when value is not provided.',
        editorType: 'expression',
      },
      valueOwnership: {
        shape: {
          kind: 'union',
          anyOf: [
            { kind: 'literal', value: 'local' },
            { kind: 'literal', value: 'controlled' },
            { kind: 'literal', value: 'scope' },
          ],
        },
        displayName: 'Value Ownership',
        editorType: 'select',
        defaultValue: 'local',
      },
      valueStatePath: {
        shape: { kind: 'string' },
        displayName: 'Value State Path',
        description: 'Scope path publishing the writable current-step value.',
        editorType: 'expression',
      },
      statusPath: {
        shape: { kind: 'string' },
        displayName: 'Status Path',
        description:
          'Publishes a read-only wizard summary: { currentStepKey, currentStepIndex, stepCount, canGoNext, canGoPrev, committing, validating, lastCommitStatus, stepError? }. Interaction state and lifecycle state are kept separate per design §6.',
        editorType: 'expression',
      },
      linear: {
        shape: { kind: 'boolean' },
        displayName: 'Linear',
        description:
          'Default true. When true, uncommitted steps cannot be jumped to unless allowStepJump is set.',
        editorType: 'switch',
        defaultValue: true,
      },
      allowStepJump: {
        shape: { kind: 'boolean' },
        displayName: 'Allow Step Jump',
        description: 'Allow non-linear step jumping even when linear=true.',
        editorType: 'switch',
        defaultValue: false,
      },
      mountOnEnter: {
        shape: { kind: 'boolean' },
        displayName: 'Mount On Enter',
        description: 'Mount step body on first enter (keep mounted after).',
        editorType: 'switch',
        defaultValue: false,
      },
      unmountOnExit: {
        shape: { kind: 'boolean' },
        displayName: 'Unmount On Exit',
        description: 'Unmount step body when it exits.',
        editorType: 'switch',
        defaultValue: false,
      },
    },
    eventContracts: {
      onChange: {
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
      onStepCommit: {
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
      onComplete: {
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
      onStepError: {
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
    deepFields: [
      {
        key: 'steps',
        nestedRegions: [
          {
            key: 'title',
            regionKeySuffix: 'title',
            compiledKey: 'titleRegionKey',
            params: ['step', 'index', 'key'],
            isolate: false,
          },
          {
            key: 'body',
            regionKeySuffix: 'body',
            compiledKey: 'bodyRegionKey',
            params: ['step', 'index', 'key'],
            isolate: false,
          },
          {
            key: 'actions',
            regionKeySuffix: 'actions',
            compiledKey: 'actionsRegionKey',
            params: ['step', 'index', 'key'],
            isolate: false,
          },
        ],
        booleanKeys: ['disabled', 'optional'],
        normalize(input) {
          if (!Array.isArray(input.value)) {
            return input.value;
          }

          return input.value.map((item, index) => {
            if (!item || typeof item !== 'object') {
              return item;
            }

            const normalized = extractNestedSchemaRegions({
              candidate: item as Record<string, unknown>,
              itemRegionPath: `${input.path}.steps[${index}]`,
              itemRegionKeyPrefix: `steps.${index}`,
              rules: [
                {
                  key: 'title',
                  regionKeySuffix: 'title',
                  compiledKey: 'titleRegionKey',
                  params: ['step', 'index', 'key'] as readonly string[],
                  isolate: false,
                },
                {
                  key: 'body',
                  regionKeySuffix: 'body',
                  compiledKey: 'bodyRegionKey',
                  params: ['step', 'index', 'key'] as readonly string[],
                  isolate: false,
                },
                {
                  key: 'actions',
                  regionKeySuffix: 'actions',
                  compiledKey: 'actionsRegionKey',
                  params: ['step', 'index', 'key'] as readonly string[],
                  isolate: false,
                },
              ],
              regions: input.regions,
              compileSchema: input.compileSchema,
            }).value as Record<string, unknown>;

            for (const booleanKey of ['disabled', 'optional']) {
              if (normalized[booleanKey] !== undefined) {
                normalized[booleanKey] = {
                  __nopPreserveLiteral: true,
                  value: normalized[booleanKey] === true,
                };
              }
            }

            return normalized;
          });
        },
      },
    ],
    fields: [
      { key: 'steps', kind: 'prop' },
      { key: 'value', kind: 'prop' },
      { key: 'defaultValue', kind: 'prop' },
      { key: 'valueOwnership', kind: 'prop' },
      { key: 'valueStatePath', kind: 'prop' },
      { key: 'statusPath', kind: 'prop' },
      { key: 'linear', kind: 'prop', valueType: 'boolean' },
      { key: 'allowStepJump', kind: 'prop', valueType: 'boolean' },
      { key: 'mountOnEnter', kind: 'prop', valueType: 'boolean' },
      { key: 'unmountOnExit', kind: 'prop', valueType: 'boolean' },
      { key: 'onChange', kind: 'event' },
      { key: 'onStepCommit', kind: 'event' },
      { key: 'onComplete', kind: 'event' },
      { key: 'onStepError', kind: 'event' },
    ],
  },
];
