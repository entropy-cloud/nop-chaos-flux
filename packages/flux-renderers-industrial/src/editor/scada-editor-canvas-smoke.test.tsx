import React from 'react';
import { createSchemaRenderer, createDefaultEnv } from '@nop-chaos/flux-react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { industrialEditorRendererDefinitions } from './renderer-definitions.js';

beforeEach(() => {
  // E4.2 空壳不依赖 leafer（无 Editor 装配），无需 leafer mock。
  // 初始化 i18n 避免 renderer 路径读取未初始化 i18n。
});

afterEach(() => {
  cleanup();
});

describe('scada-editor-canvas render smoke (E4.2 空壳)', () => {
  it('compiles and renders the scada-editor-canvas shell without throwing', () => {
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
    // 空壳态标识（E5.1 替换后改为 ready/edit 等真实状态）。
    expect(root.getAttribute('data-status')).toBe('shell');
  });
});
