import { describe, expect, it } from 'vitest';
import type { RendererDefinition } from './types/index.js';
import {
  buildPerRendererSourceResolver,
  findUnreferencedContracts,
  isCapabilityHandleReferenced,
  isRendererEventKeyReferenced,
} from './contract-honesty.js';

function defineRenderer(overrides: Partial<RendererDefinition>): RendererDefinition {
  return { type: '__probe__', component: () => null, ...overrides };
}

describe('contract-honesty capability handle anchoring (G4)', () => {
  it('does NOT count an incidental quoted string (action type / i18n key / error message)', () => {
    // With the old `['"]<handle>['"]` regex every one of these matched; the
    // tightened anchor must reject them so a silently-dropped handle impl can
    // no longer hide behind an unrelated quoted literal.
    const incidental = [
      `const action = { action: 'submit' };`,
      `t('flux.common.submit');`,
      `throw new Error('cannot submit');`,
      `const label = 'Submit';`,
    ].join('\n');

    expect(isCapabilityHandleReferenced('submit', incidental)).toBe(false);
  });

  it('counts a switch case dispatch as a real wiring', () => {
    expect(isCapabilityHandleReferenced('submit', `switch (method) { case 'submit': return run(); }`)).toBe(true);
  });

  it('counts an equality comparison as a real wiring', () => {
    expect(isCapabilityHandleReferenced('reset', `if (method === 'reset') doReset();`)).toBe(true);
    expect(isCapabilityHandleReferenced('reset', `return 'reset' === method;`)).toBe(true);
  });

  it('counts a methods/listMethods array-literal element as a real wiring', () => {
    expect(isCapabilityHandleReferenced('validate', `return ['submit', 'validate', 'reset'];`)).toBe(true);
    expect(isCapabilityHandleReferenced('focus', `methods: ['clear', 'focus']`)).toBe(true);
  });

  it('does NOT count an incidental array element (labels / action types) as a wiring (H16)', () => {
    // A common-word handle such as 'save' must not be incidental-satisfied by
    // an unrelated UI array. Only a methods/listMethods (or case/===) context
    // counts; `labels: ['save', 'cancel']` is incidental.
    const incidental = [
      `const labels = { labels: ['save', 'cancel'] };`,
      `const buttons = ['save', 'cancel', 'reset'];`,
      `actions: [{ actionType: 'save' }];`,
    ].join('\n');

    expect(isCapabilityHandleReferenced('save', incidental)).toBe(false);
    expect(isCapabilityHandleReferenced('cancel', incidental)).toBe(false);
  });

  it('detects a dropped real handle implementation against the per-renderer factory source (exit criterion)', () => {
    // A renderer delegates its ComponentHandle to a shared factory. The factory
    // wires every handle it actually implements; here it dropped 'submit'.
    const renderer = defineRenderer({
      componentCapabilityContracts: [
        { handle: 'submit', displayName: 'Submit' },
        { handle: 'reset', displayName: 'Reset' },
      ],
    });
    const factorySource = `
      function invoke(method) {
        switch (method) {
          case 'reset': return reset();
          default: return unknown();
        }
      }
      function listMethods() { return ['reset']; }
    `;

    const violations = findUnreferencedContracts([renderer], () => ({
      componentSource: '',
      capabilityHandleSource: factorySource,
    }));

    expect(violations).toEqual([
      {
        rendererType: '__probe__',
        unreferencedEventKeys: [],
        unreferencedCapabilityHandles: ['submit'],
      },
    ]);
  });
});

describe('contract-honesty per-definition isolation (G15)', () => {
  it('a sibling renderer usage does NOT mask a missing implementation', () => {
    // Renderer A genuinely wires onChange and the focus handle; renderer B
    // declares both but wires neither. With the old whole-package blob, B was
    // masked by A. Per-definition source isolation must flag B.
    const rendererA = defineRenderer({
      type: 'alpha',
      eventContracts: { onChange: { displayName: 'Change' } },
      componentCapabilityContracts: [{ handle: 'focus', displayName: 'Focus' }],
    });
    const rendererB = defineRenderer({
      type: 'beta',
      eventContracts: { onChange: { displayName: 'Change' } },
      componentCapabilityContracts: [{ handle: 'focus', displayName: 'Focus' }],
    });
    const sourceA = `props.events.onChange(); methods: ['focus'];`;
    const sourceB = `// beta does not wire onChange or focus yet`;

    const byType: Record<string, string> = { alpha: sourceA, beta: sourceB };
    const violations = findUnreferencedContracts([rendererA, rendererB], (def) => byType[def.type] ?? '');

    expect(violations).toEqual([
      {
        rendererType: 'beta',
        unreferencedEventKeys: ['onChange'],
        unreferencedCapabilityHandles: ['focus'],
      },
    ]);
  });

  it('a comment-only reference does NOT count as a reference', () => {
    const source = `
      // props.events.onChange is wired elsewhere
      /* events['onChange'] */
    `;

    expect(isRendererEventKeyReferenced('onChange', source)).toBe(false);
    expect(
      findUnreferencedContracts(
        [defineRenderer({ eventContracts: { onChange: { displayName: 'Change' } } })],
        source,
      ),
    ).toHaveLength(1);
  });

  it('keeps the synthetic probe true-negative (a fully unknown contract is flagged) with a blob source', () => {
    const probe = defineRenderer({
      eventContracts: { onInjectedFakeEvent: { displayName: 'Fake' } },
      componentCapabilityContracts: [{ handle: 'injectedFakeCapability', displayName: 'Fake' }],
    });

    const violations = findUnreferencedContracts([probe], 'const x = 1;');

    expect(violations).toEqual([
      {
        rendererType: '__probe__',
        unreferencedEventKeys: ['onInjectedFakeEvent'],
        unreferencedCapabilityHandles: ['injectedFakeCapability'],
      },
    ]);
    expect(isRendererEventKeyReferenced('onInjectedFakeEvent', 'const x = 1;')).toBe(false);
    expect(isCapabilityHandleReferenced('injectedFakeCapability', 'const x = 1;')).toBe(false);
  });
});

describe('contract-honesty per-renderer source resolver (H7)', () => {
  it('isolates co-located and split renderers so a sibling cannot mask a missing event', () => {
    // Two co-located renderers share nothing: alpha wires onChange, beta does
    // not. The resolver must give each renderer ONLY its own file so beta is
    // flagged (a whole-package blob would mask beta with alpha's wiring).
    const files = [
      {
        path: 'alpha.tsx',
        content: `
          export function AlphaRenderer(props: any) { return props.events.onChange(); }
          export const alphaRendererDefinition: RendererDefinition = {
            type: 'alpha',
            component: AlphaRenderer,
            eventContracts: { onChange: { displayName: 'Change' } },
          };
        `,
      },
      {
        path: 'beta.tsx',
        content: `
          export function BetaRenderer(props: any) { return null; }
          export const betaRendererDefinition: RendererDefinition = {
            type: 'beta',
            component: BetaRenderer,
            eventContracts: { onChange: { displayName: 'Change' } },
          };
        `,
      },
    ];
    const resolver = buildPerRendererSourceResolver(files, ['alpha', 'beta']);

    const violations = findUnreferencedContracts(
      [
        { type: 'alpha', component: () => null, eventContracts: { onChange: { displayName: 'Change' } } },
        { type: 'beta', component: () => null, eventContracts: { onChange: { displayName: 'Change' } } },
      ],
      resolver,
    );

    expect(violations).toEqual([
      { rendererType: 'beta', unreferencedEventKeys: ['onChange'], unreferencedCapabilityHandles: [] },
    ]);
  });

  it('resolves a split-package component through the definition file imports', () => {
    // Split convention: definitions.ts references an IMPORTED component. The
    // resolver must follow the import to the component file (events are wired
    // there, NOT in the definitions file).
    const files = [
      {
        path: 'definitions.ts',
        content: `
          import type { RendererDefinition } from 'x';
          import { TableRenderer } from './table-renderer.js';
          export const tableDefinition: RendererDefinition = {
            type: 'table',
            component: TableRenderer,
            eventContracts: { onChange: { displayName: 'Change' } },
          };
        `,
      },
      {
        path: 'table-renderer.tsx',
        content: `export function TableRenderer(props: any) { return props.events.onChange(); }`,
      },
    ];
    const resolver = buildPerRendererSourceResolver(files, ['table']);

    const violations = findUnreferencedContracts(
      [{ type: 'table', component: () => null, eventContracts: { onChange: { displayName: 'Change' } } }],
      resolver,
    );

    expect(violations).toEqual([]);
  });

  it('mixes a runtime handle factory only for renderers that reference it', () => {
    const factorySource = `function invoke(m){ switch(m){ case 'clear': return 1; } }`;
    const files = [
      {
        path: 'a.tsx',
        content: `
          export function ARenderer() { return null; }
          export const aDef: RendererDefinition = {
            type: 'a', component: ARenderer,
            componentCapabilityContracts: [{ handle: 'clear', displayName: 'Clear' }],
          };
        `,
      },
      {
        path: 'b.tsx',
        content: `
          export function BRenderer() { useInputComponentHandle(); return null; }
          export const bDef: RendererDefinition = {
            type: 'b', component: BRenderer,
            componentCapabilityContracts: [{ handle: 'clear', displayName: 'Clear' }],
          };
        `,
      },
    ];
    const resolver = buildPerRendererSourceResolver(files, ['a', 'b'], [
      { hookPattern: /useInputComponentHandle/, source: factorySource },
    ]);

    const violations = findUnreferencedContracts(
      [
        { type: 'a', component: () => null, componentCapabilityContracts: [{ handle: 'clear', displayName: 'Clear' }] },
        { type: 'b', component: () => null, componentCapabilityContracts: [{ handle: 'clear', displayName: 'Clear' }] },
      ],
      resolver,
    );

    // 'a' does not reference the factory, so 'clear' is unreferenced.
    // 'b' references the factory, so 'clear' is satisfied.
    expect(violations).toEqual([
      { rendererType: 'a', unreferencedEventKeys: [], unreferencedCapabilityHandles: ['clear'] },
    ]);
  });
});
