import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { BaseSchema } from '@nop-chaos/flux-core';
import { resetFluxI18n, initFluxI18n } from '@nop-chaos/flux-i18n';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { formRendererDefinitions } from '../index.js';
import { env } from './form-test-support.js';

const allDefinitions = [...formRendererDefinitions];

beforeEach(() => {
  resetFluxI18n();
  initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
});

afterEach(() => {
  cleanup();
  resetFluxI18n();
});

function renderSchema(schema: BaseSchema) {
  const SchemaRenderer = createSchemaRenderer(allDefinitions);
  return render(
    <SchemaRenderer
      schemaUrl="test://markdown-editor-i18n"
      schema={schema}
      env={env}
      formulaCompiler={createFormulaCompiler()}
    />,
  );
}

function buildForm(extra: Record<string, unknown> = {}) {
  return {
    type: 'form',
    data: { md: '' },
    body: [{ type: 'markdown-editor', name: 'md', label: 'Markdown', ...extra }],
  } as any;
}

describe('markdown-editor — localized labels (P2-1 i18n)', () => {
  it('toolbar buttons are localized (zh-CN: 粗体/斜体/标题)', () => {
    resetFluxI18n();
    initFluxI18n({ lng: 'zh-CN', fallbackLng: 'zh-CN' });
    renderSchema(buildForm());
    expect(screen.getByTestId('md-toolbar-bold').getAttribute('aria-label')).toBe('粗体');
    expect(screen.getByTestId('md-toolbar-italic').getAttribute('aria-label')).toBe('斜体');
    expect(screen.getByTestId('md-toolbar-heading').getAttribute('aria-label')).toBe('标题');
  });

  it('toolbar container exposes no composite role or group label (20-07: role removed)', () => {
    resetFluxI18n();
    initFluxI18n({ lng: 'zh-CN', fallbackLng: 'zh-CN' });
    renderSchema(buildForm());
    const toolbar = document.querySelector('[data-slot="markdown-editor-toolbar"]');
    expect(toolbar).toBeTruthy();
    expect(toolbar?.getAttribute('role')).toBeNull();
    expect(toolbar?.getAttribute('aria-label')).toBeNull();
  });

  it('empty-textarea placeholder is localized (zh-CN: 输入 Markdown…)', () => {
    resetFluxI18n();
    initFluxI18n({ lng: 'zh-CN', fallbackLng: 'zh-CN' });
    renderSchema(buildForm());
    const textarea = screen.getByTestId('markdown-editor-textarea') as HTMLTextAreaElement;
    expect(textarea.placeholder).toBe('输入 Markdown…');
  });

  it('schema placeholder overrides the localized default', () => {
    resetFluxI18n();
    initFluxI18n({ lng: 'zh-CN', fallbackLng: 'zh-CN' });
    renderSchema(buildForm({ placeholder: '自定义占位' }));
    const textarea = screen.getByTestId('markdown-editor-textarea') as HTMLTextAreaElement;
    expect(textarea.placeholder).toBe('自定义占位');
  });

  it('en-US labels remain the canonical English strings', () => {
    renderSchema(buildForm());
    expect(screen.getByTestId('md-toolbar-bold').getAttribute('aria-label')).toBe('Bold');
    const textarea = screen.getByTestId('markdown-editor-textarea') as HTMLTextAreaElement;
    expect(textarea.placeholder).toBe('Enter markdown…');
  });
});
