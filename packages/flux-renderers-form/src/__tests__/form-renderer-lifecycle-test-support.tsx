import React from 'react';
import { vi } from 'vitest';

export function makeScope(options: {
  id: string;
  visible?: Record<string, unknown>;
  own?: Record<string, unknown>;
  parent?: any;
}) {
  const visible = options.visible ?? {};
  const own = options.own ?? visible;

  return {
    id: options.id,
    path: `$${options.id}`,
    parent: options.parent,
    store: {
      subscribe: () => () => undefined,
      getSnapshot: () => visible,
    },
    get(path: string) {
      return visible[path];
    },
    has(path: string) {
      return Object.prototype.hasOwnProperty.call(visible, path);
    },
    readOwn() {
      return own;
    },
    readVisible() {
      return visible;
    },
    materializeVisible() {
      return { ...visible };
    },
    update: vi.fn(),
    merge: vi.fn(),
    replace: vi.fn(),
  } as any;
}

export function buildProps(overrides: Record<string, unknown> = {}) {
  return {
    id: 'rendered-form',
    path: '$.body[0]',
    props: {
      name: 'profile',
      data: { username: 'Alice' },
      statusPath: 'ui.status',
      valuesPath: 'ui.values',
      mode: 'horizontal',
      labelAlign: 'left',
      labelWidth: 120,
      bodyClassName: 'body-extra',
      actionsClassName: 'actions-extra',
    },
    schema: { type: 'form' },
    meta: { className: 'form-extra', testid: 'form-test', cid: 'cid-1' },
    events: {},
    helpers: {},
    regions: {
      body: <div>Body content</div>,
      actions: <div>Action content</div>,
    },
    templateNode: {
      schemaUrl: 'schema://profile',
      validationPlan: { kind: 'validation-plan' },
      importsPlan: { preparedImports: ['profileImport'] },
    },
    node: {
      instancePath: [{ repeatedTemplateId: 'repeat', instanceKey: 'first' }],
    },
    ...overrides,
  } as any;
}

export function getCallOptions(call: unknown, label: string): Record<string, any> {
  if (!Array.isArray(call) || call.length < 2) {
    throw new Error(`Expected ${label} call options`);
  }

  return call[1] as Record<string, any>;
}
