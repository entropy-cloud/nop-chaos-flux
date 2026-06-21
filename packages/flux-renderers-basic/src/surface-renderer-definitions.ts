import type { RendererDefinition } from '@nop-chaos/flux-core';
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
  { key: 'bodyClassName', kind: 'prop' as const },
  { key: 'headerClassName', kind: 'prop' as const },
  { key: 'footerClassName', kind: 'prop' as const },
];

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
    bodyClassName: stringPropContract('Body className', 'className applied to DialogBody.'),
    headerClassName: stringPropContract('Header className', 'className applied to DialogHeader.'),
    footerClassName: stringPropContract('Footer className', 'className applied to DialogFooter.'),
  },
  eventContracts: surfaceEventContracts,
  fields: sharedSurfaceFields.concat([
    { key: 'closeOnOutsideClick', kind: 'prop' as const, valueType: 'boolean' as const },
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
    bodyClassName: stringPropContract('Body className', 'className applied to DrawerBody.'),
    headerClassName: stringPropContract('Header className', 'className applied to DrawerHeader.'),
    footerClassName: stringPropContract('Footer className', 'className applied to DrawerFooter.'),
  },
  eventContracts: surfaceEventContracts,
  fields: sharedSurfaceFields.concat([
    { key: 'side', kind: 'prop' as const },
    { key: 'closeOnOutside', kind: 'prop' as const, valueType: 'boolean' as const },
    { key: 'resizable', kind: 'prop' as const, valueType: 'boolean' as const },
  ]),
};
