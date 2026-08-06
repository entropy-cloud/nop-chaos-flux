import React from 'react';
import { createSchemaRenderer, createDefaultEnv } from '@nop-chaos/flux-react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetLeaferMock } from '../test-support/leafer-ui-mock.js';
import { registerBuiltinScadaSymbols } from '../symbols/register-builtin.js';
import { industrialEditorRendererDefinitions } from './renderer-definitions.js';

vi.mock('leafer-ui', () => import('../test-support/leafer-ui-mock.js'));
vi.mock('@leafer-in/viewport', () => ({}));
vi.mock('@leafer-in/editor', () => ({}));

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

beforeEach(() => {
  resetLeaferMock();
  registerBuiltinScadaSymbols();
});

afterEach(() => {
  cleanup();
});

describe('scada-editor-canvas render smoke (E5.1 编辑态画布)', () => {
  it('mounts and reaches ready status (not shell)', async () => {
    const SchemaRenderer = createSchemaRenderer(industrialEditorRendererDefinitions);
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://industrial-editor/smoke"
        schema={{ type: 'scada-editor-canvas' }}
        env={createDefaultEnv()}
        formulaCompiler={createFormulaCompiler()}
      />,
    );
    const root = container.querySelector('[data-slot="scada-editor-canvas"]') as HTMLElement;
    expect(root).toBeTruthy();
    expect(root.className).toContain('nop-scada-editor-canvas');
    // E5.1 替换空壳后：data-status 从 shell 升级为 ready（经 useEditorEngine 装配 + onReady）。
    await waitFor(() => {
      expect(root.getAttribute('data-status')).toBe('ready');
    });
    // 缺省 mode = edit。
    expect(root.getAttribute('data-mode')).toBe('edit');
  });
});
