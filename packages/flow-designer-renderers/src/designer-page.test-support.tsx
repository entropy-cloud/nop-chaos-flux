import React from 'react';
import { afterEach, beforeEach, vi } from 'vitest';
import type { RendererDefinition, RendererEnv } from '@nop-chaos/flux-core';
import type { DesignerConfig } from '@nop-chaos/flow-designer-core';
import { changeLanguage, initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { flowDesignerRendererDefinitions } from './index.js';

const flowDesignerMocks = vi.hoisted(() => ({
  layoutTreeWithElkMock: vi.fn(async (nodes: unknown[]) => nodes),
  createDesignerCoreMock: vi.fn(),
}));

export function getLayoutTreeWithElkMock() {
  return flowDesignerMocks.layoutTreeWithElkMock;
}

export function getCreateDesignerCoreMock() {
  return flowDesignerMocks.createDesignerCoreMock;
}

vi.mock('@nop-chaos/flow-designer-core', async () => {
  const actual = await vi.importActual<typeof import('@nop-chaos/flow-designer-core')>(
    '@nop-chaos/flow-designer-core',
  );
  return {
    ...actual,
    layoutTreeWithElk: flowDesignerMocks.layoutTreeWithElkMock,
    createDesignerCore: flowDesignerMocks.createDesignerCoreMock.mockImplementation(
      (
        initialDoc: Parameters<typeof actual.createDesignerCore>[0],
        config: Parameters<typeof actual.createDesignerCore>[1],
      ) => actual.createDesignerCore(initialDoc, config),
    ),
  };
});

const textRenderer: RendererDefinition = {
  type: 'text',
  component: (props) => <span>{String(props.props.text ?? '')}</span>,
};

const pageRenderer: RendererDefinition = {
  type: 'page',
  component: () => <section />,
  fields: [{ key: 'body', kind: 'region', regionKey: 'body' }],
};

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (typeof globalThis.ResizeObserver === 'undefined') {
  Object.defineProperty(globalThis, 'ResizeObserver', {
    value: ResizeObserverMock,
    writable: true,
    configurable: true,
  });
}

beforeEach(async () => {
  flowDesignerMocks.layoutTreeWithElkMock.mockClear();
  flowDesignerMocks.createDesignerCoreMock.mockClear();
  resetFluxI18n();
  initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
  await changeLanguage('en-US');
});

afterEach(() => {
  resetFluxI18n();
});

export function createTreeTestConfig(): DesignerConfig {
  return {
    version: '1.0.0',
    kind: 'test-tree',
    documentMode: 'tree',
    treeConfig: {
      layout: { direction: 'TB', nodeSpacing: 60, layerSpacing: 100 },
      showGatewayNodes: false,
      showMergeNodes: false,
      autoLayout: true,
      chainEdgeType: 'chain',
      branchEdgeType: 'branch',
      mergeEdgeType: 'merge',
    },
    nodeTypes: [
      { id: 'start', label: 'Start', body: { type: 'text' } },
      { id: 'task', label: 'Task', body: { type: 'text' } },
      { id: 'condition', label: 'Condition', body: { type: 'text' } },
      { id: 'end', label: 'End', body: { type: 'text' } },
    ],
    edgeTypes: [
      { id: 'chain', label: 'Chain', defaults: {} },
      { id: 'branch', label: 'Branch', defaults: {} },
      { id: 'merge', label: 'Merge', defaults: {} },
    ],
  };
}

export function createGraphTestConfig(): DesignerConfig {
  return {
    version: '1.0.0',
    kind: 'test-graph',
    nodeTypes: [
      { id: 'task', label: 'Task', body: { type: 'text' } },
      { id: 'end', label: 'End', body: { type: 'text' } },
    ],
    edgeTypes: [{ id: 'default', label: 'Flow', defaults: {} }],
  };
}

export function createRendererEnv(notify = vi.fn()): RendererEnv {
  return {
    fetcher: async function <T>() {
      return { ok: true, status: 200, data: null as T };
    },
    notify,
  };
}

export function createDesignerPageSchemaRenderer() {
  return createSchemaRenderer([pageRenderer, textRenderer, ...flowDesignerRendererDefinitions]);
}
