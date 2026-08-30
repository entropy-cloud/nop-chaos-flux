import type {
  FieldCompileContext,
  RendererDefinition,
  SchemaFieldRule,
} from '@nop-chaos/flux-core';
import { CommandPaletteRenderer, OPEN_BINDING_KIND } from './command-palette.js';
import { DialogRenderer } from './dialog.js';
import { DrawerRenderer } from './drawer.js';

const surfaceEventContracts = {
  onOpen: {
    displayName: 'Open',
    description: 'Runs after the surface becomes open.',
    payload: {
      kind: 'object' as const,
      fields: {
        surfaceId: { kind: 'string' as const },
        kind: { kind: 'string' as const },
        open: { kind: 'boolean' as const },
      },
    },
  },
  onClose: {
    displayName: 'Close',
    description: 'Runs after the surface becomes closed.',
    payload: {
      kind: 'object' as const,
      fields: {
        surfaceId: { kind: 'string' as const },
        kind: { kind: 'string' as const },
        open: { kind: 'boolean' as const },
      },
    },
  },
  onConfirm: {
    displayName: 'Confirm',
    description:
      'Runs when the user activates the auto-generated Confirm button (only fires when "confirm" is truthy and "actions" is omitted).',
    payload: {
      kind: 'object' as const,
      fields: {
        surfaceId: { kind: 'string' as const },
        kind: { kind: 'string' as const },
        open: { kind: 'boolean' as const },
      },
    },
  },
};

const sizePropContract = {
  shape: {
    kind: 'union' as const,
    anyOf: [
      { kind: 'literal' as const, value: 'xs' },
      { kind: 'literal' as const, value: 'sm' },
      { kind: 'literal' as const, value: 'md' },
      { kind: 'literal' as const, value: 'lg' },
      { kind: 'literal' as const, value: 'xl' },
      { kind: 'literal' as const, value: 'full' },
    ],
  },
  displayName: 'Size',
  description:
    'Preset size token. The host maps the six tiers onto the surface geometry; "full" expands to 100vw/100vh (dialog) or 100% (drawer).',
  editorType: 'select',
};

const dimensionPropContract = (displayName: string, description: string) => ({
  shape: {
    kind: 'union' as const,
    anyOf: [{ kind: 'string' as const }, { kind: 'number' as const }],
  },
  displayName,
  description,
  editorType: 'text',
});

const booleanPropContract = (displayName: string, description: string) => ({
  shape: { kind: 'boolean' as const },
  displayName,
  description,
  editorType: 'switch',
});

const stringPropContract = (displayName: string, description: string) => ({
  shape: { kind: 'string' as const },
  displayName,
  description,
  editorType: 'text',
});

const confirmPropContract = {
  shape: {
    kind: 'union' as const,
    anyOf: [{ kind: 'boolean' as const }, { kind: 'string' as const }],
  },
  displayName: 'Confirm',
  description:
    'When truthy and "actions" is omitted, auto-generates [Cancel][Confirm] buttons. Boolean true uses the i18n default; a string provides the confirm button label.',
  editorType: 'text',
};

const sharedSurfaceFields = [
  { key: 'title', kind: 'value-or-region' as const, regionKey: 'title' },
  { key: 'body', kind: 'region' as const, regionKey: 'body' },
  { key: 'actions', kind: 'region' as const, regionKey: 'actions' },
  { key: 'header', kind: 'region' as const, regionKey: 'header' },
  { key: 'footer', kind: 'region' as const, regionKey: 'footer' },
  { key: 'onOpen', kind: 'event' as const },
  { key: 'onClose', kind: 'event' as const },
  { key: 'onConfirm', kind: 'event' as const },
  { key: 'data', kind: 'prop' as const },
  { key: 'open', kind: 'prop' as const },
  { key: 'defaultOpen', kind: 'prop' as const, valueType: 'boolean' as const },
  { key: 'statusPath', kind: 'prop' as const },
  { key: 'container', kind: 'prop' as const },
  { key: 'showMask', kind: 'prop' as const, valueType: 'boolean' as const },
  { key: 'closeOnEsc', kind: 'prop' as const, valueType: 'boolean' as const },
  { key: 'size', kind: 'prop' as const },
  { key: 'width', kind: 'prop' as const },
  { key: 'height', kind: 'prop' as const },
  { key: 'showCloseButton', kind: 'prop' as const, valueType: 'boolean' as const },
  { key: 'confirm', kind: 'prop' as const },
  { key: 'isolate', kind: 'prop' as const, valueType: 'boolean' as const },
  { key: 'bodyClassName', kind: 'prop' as const },
  { key: 'headerClassName', kind: 'prop' as const },
  { key: 'footerClassName', kind: 'prop' as const },
];

const surfaceHandleCapabilityContracts = [
  {
    handle: 'open',
    displayName: 'Open',
    description:
      'Open the declarative surface. No-op when already open or when the surface is externally controlled via the `open` prop; returns { ok: true, skipped: true } in those cases.',
  },
  {
    handle: 'close',
    displayName: 'Close',
    description:
      'Close the declarative surface. No-op when already closed or when the surface is externally controlled via the `open` prop; returns { ok: true, skipped: true } in those cases.',
  },
  {
    handle: 'toggle',
    displayName: 'Toggle',
    description:
      'Toggle the declarative surface open/close state. No-op when the surface is externally controlled via the `open` prop; returns { ok: true, skipped: true } in that case.',
  },
] as const;

export const dialogRendererDefinition: RendererDefinition = {
  type: 'dialog',
  displayName: 'Dialog',
  category: 'layout',
  sourcePackage: '@nop-chaos/flux-renderers-basic',
  component: DialogRenderer,
  propContracts: {
    closeOnOutsideClick: booleanPropContract(
      'Close on outside click',
      'Closes the dialog when the overlay is clicked. Defaults to true.',
    ),
    closeOnEsc: booleanPropContract(
      'Close on Esc',
      'Closes the dialog when the Escape key is pressed. Defaults to true.',
    ),
    size: sizePropContract,
    width: dimensionPropContract(
      'Width override',
      'Explicit width (number = px, otherwise CSS length). Overrides the size-derived width when set.',
    ),
    height: dimensionPropContract(
      'Height override',
      'Explicit height (number = px, otherwise CSS length). Overrides the size-derived height when set.',
    ),
    showCloseButton: booleanPropContract(
      'Show close button',
      'Renders the top-right close affordance. Defaults to true.',
    ),
    showMask: booleanPropContract(
      'Show mask',
      'Renders the surface overlay mask. Defaults to true.',
    ),
    confirm: confirmPropContract,
    isolate: booleanPropContract(
      'Scope isolation',
      'When true, cuts off parent scope inheritance — the dialog body only sees own data. Defaults to false.',
    ),
    bodyClassName: stringPropContract('Body className', 'className applied to DialogBody.'),
    headerClassName: stringPropContract('Header className', 'className applied to DialogHeader.'),
    footerClassName: stringPropContract('Footer className', 'className applied to DialogFooter.'),
  },
  eventContracts: surfaceEventContracts,
  componentCapabilityContracts: surfaceHandleCapabilityContracts,
  fields: sharedSurfaceFields.concat([
    { key: 'closeOnOutsideClick', kind: 'prop' as const, valueType: 'boolean' as const },
    { key: 'draggable', kind: 'prop' as const, valueType: 'boolean' as const },
    { key: 'allowFullscreen', kind: 'prop' as const, valueType: 'boolean' as const },
  ]),
};

export const drawerRendererDefinition: RendererDefinition = {
  type: 'drawer',
  displayName: 'Drawer',
  category: 'layout',
  sourcePackage: '@nop-chaos/flux-renderers-basic',
  component: DrawerRenderer,
  propContracts: {
    closeOnOutside: booleanPropContract(
      'Close on outside click',
      'Closes the drawer when the overlay is clicked. Defaults to true. Mirrors dialog closeOnOutsideClick (E2f asymmetric-bug fix).',
    ),
    closeOnEsc: booleanPropContract(
      'Close on Esc',
      'Closes the drawer when the Escape key is pressed. Defaults to true.',
    ),
    size: sizePropContract,
    width: dimensionPropContract(
      'Width override',
      'Explicit width for left/right drawers (number = px, otherwise CSS length). Overrides the size-derived width.',
    ),
    height: dimensionPropContract(
      'Height override',
      'Explicit height for top/bottom drawers (number = px, otherwise CSS length). Overrides the size-derived height.',
    ),
    showCloseButton: booleanPropContract(
      'Show close button',
      'Renders the surface-level close affordance. Defaults to true.',
    ),
    showMask: booleanPropContract(
      'Show mask',
      'Renders the surface overlay mask. Defaults to true.',
    ),
    resizable: booleanPropContract(
      'Resizable',
      'Renders a resize handle on the drawer edge. Local state (resets on reopen).',
    ),
    confirm: confirmPropContract,
    isolate: booleanPropContract(
      'Scope isolation',
      'When true, cuts off parent scope inheritance — the drawer body only sees own data. Defaults to false.',
    ),
    bodyClassName: stringPropContract('Body className', 'className applied to DrawerBody.'),
    headerClassName: stringPropContract('Header className', 'className applied to DrawerHeader.'),
    footerClassName: stringPropContract('Footer className', 'className applied to DrawerFooter.'),
  },
  eventContracts: surfaceEventContracts,
  componentCapabilityContracts: surfaceHandleCapabilityContracts,
  fields: sharedSurfaceFields.concat([
    { key: 'side', kind: 'prop' as const },
    { key: 'closeOnOutside', kind: 'prop' as const, valueType: 'boolean' as const },
    { key: 'resizable', kind: 'prop' as const, valueType: 'boolean' as const },
  ]),
};

/**
 * Compile-time capture of the controlled `open` binding. A simple `${path}`
 * expression records its scope path so user-initiated closes can write `false`
 * back (dialog plan-459 reopen parity) WITHOUT a runtime raw-schema read
 * (compile-once: the raw value is only ever seen by this compile hook).
 */
const compileOpenBinding: SchemaFieldRule = {
  key: 'open',
  kind: 'prop',
  compile: (value: unknown, context: FieldCompileContext) => {
    let path: string | undefined;
    if (typeof value === 'string') {
      const match = value.trim().match(/^\$\{([a-zA-Z_$][\w$]*(\.[a-zA-Z_$][\w$]*)*)\}$/);
      path = match?.[1];
    }
    return {
      kind: OPEN_BINDING_KIND,
      path,
      value: context.compileValue(value),
    };
  },
};

const commandPaletteEventContracts = {
  onOpen: surfaceEventContracts.onOpen,
  onClose: surfaceEventContracts.onClose,
  onCommand: {
    displayName: 'Command',
    description:
      'Runs when a command item is executed, after the palette closes (close-then-dispatch).',
    payload: {
      kind: 'object' as const,
      fields: {
        id: { kind: 'string' as const },
        item: { kind: 'unknown' as const },
        groupId: { kind: 'string' as const },
      },
    },
  },
};

export const commandPaletteRendererDefinition: RendererDefinition = {
  type: 'command-palette',
  displayName: 'Command Palette',
  category: 'layout',
  sourcePackage: '@nop-chaos/flux-renderers-basic',
  defaultSchema: { type: 'command-palette', items: [] },
  component: CommandPaletteRenderer,
  propContracts: {
    placeholder: stringPropContract(
      'Placeholder',
      'Search input placeholder text. Defaults to the i18n "search" message.',
    ),
    shouldFilter: booleanPropContract(
      'Should Filter',
      'cmdk built-in query filtering. Disable to drive items with schema expressions (external filtering). Defaults to true.',
    ),
    emptyText: stringPropContract(
      'Empty text',
      'Empty state copy shown when no items match. Defaults to the i18n "no results" message.',
    ),
    hotkey: stringPropContract(
      'Hotkey',
      'Local invocation key binding, e.g. "mod+k". No-op on controlled palettes (open prop); no conflict arbitration — global keybindings are G-B2 scope.',
    ),
    closeOnEsc: booleanPropContract(
      'Close on Esc',
      'Closes the palette when the Escape key is pressed. Defaults to true.',
    ),
    closeOnOutsideClick: booleanPropContract(
      'Close on outside click',
      'Closes the palette when the overlay or outside area is pressed. Defaults to true.',
    ),
    showMask: booleanPropContract(
      'Show mask',
      'Renders the overlay mask. Defaults to true.',
    ),
  },
  eventContracts: commandPaletteEventContracts,
  componentCapabilityContracts: surfaceHandleCapabilityContracts,
  fields: [
    { key: 'items', kind: 'prop' as const },
    { key: 'groups', kind: 'prop' as const },
    {
      key: 'source',
      kind: 'prop' as const,
      allowSource: true,
      // Loading/error transient state lands on props so the source-prop
      // controller's snapshot changes even when the fetched value is
      // unchanged — a failing source must re-render (to the empty state),
      // not freeze the node's prop bag. tree-controls precedent.
      sourceStateKey: 'sourceState',
    },
    { key: 'placeholder', kind: 'prop' as const },
    { key: 'shouldFilter', kind: 'prop' as const, valueType: 'boolean' as const },
    { key: 'emptyText', kind: 'prop' as const },
    { key: 'hotkey', kind: 'prop' as const },
    compileOpenBinding,
    { key: 'defaultOpen', kind: 'prop' as const, valueType: 'boolean' as const },
    { key: 'statusPath', kind: 'prop' as const },
    { key: 'container', kind: 'prop' as const },
    { key: 'closeOnEsc', kind: 'prop' as const, valueType: 'boolean' as const },
    { key: 'closeOnOutsideClick', kind: 'prop' as const, valueType: 'boolean' as const },
    { key: 'showMask', kind: 'prop' as const, valueType: 'boolean' as const },
    { key: 'onOpen', kind: 'event' as const },
    { key: 'onClose', kind: 'event' as const },
    { key: 'onCommand', kind: 'event' as const },
  ],
};
