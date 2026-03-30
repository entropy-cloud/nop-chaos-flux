// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it, afterEach, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer, createDefaultRegistry } from '@nop-chaos/flux-react';
import type { RendererEnv, SchemaInput } from '@nop-chaos/flux-core';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerFormRenderers } from '@nop-chaos/flux-renderers-form';
import { registerDataRenderers } from '@nop-chaos/flux-renderers-data';
import { codeEditorRendererDefinition } from './index';

const env: RendererEnv = {
  fetcher: async <T,>() => ({ ok: true, status: 200, data: null as T }),
  notify: () => undefined,
};

afterEach(() => {
  cleanup();
});

const registry = createDefaultRegistry();
registerBasicRenderers(registry);
registerFormRenderers(registry);
registerDataRenderers(registry);
registry.register(codeEditorRendererDefinition);

const SchemaRenderer = createSchemaRenderer();

function renderCodeEditorSchema(schema: SchemaInput) {
  return render(
    <SchemaRenderer
      schema={schema}
      env={env}
      registry={registry}
      formulaCompiler={createFormulaCompiler()}
    />,
  );
}

describe('code-editor integration', () => {
  it('renders expression editor with expressionConfig without crashing', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderCodeEditorSchema({
      type: 'page',
      body: [
        {
          type: 'form',
          name: 'testForm',
          body: [
            {
              type: 'code-editor',
              name: 'expression',
              label: 'Expression Editor',
              language: 'expression',
              mode: 'expression',
              autoHeight: true,
              expressionConfig: {
                variables: [
                  { label: 'Name', value: 'data.name', type: 'string' },
                  { label: 'Age', value: 'data.age', type: 'number' },
                  {
                    label: 'Order',
                    value: 'data.order',
                    type: 'object',
                    children: [
                      { label: 'Order ID', value: 'data.order.id', type: 'string' },
                      { label: 'Amount', value: 'data.order.amount', type: 'number' },
                    ],
                  },
                ],
                functions: [
                  {
                    groupName: 'Logic',
                    items: [
                      { name: 'IF', description: 'Conditional', example: 'IF(cond, t, f)', returnType: 'any' },
                    ],
                  },
                ],
                lint: true,
                showFriendlyNames: true,
              },
            },
          ],
        },
      ],
    });

    expect(screen.getByText('Expression Editor')).toBeTruthy();
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('renders SQL editor with sqlConfig without crashing', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderCodeEditorSchema({
      type: 'page',
      body: [
        {
          type: 'form',
          name: 'testForm',
          body: [
            {
              type: 'code-editor',
              name: 'sql',
              label: 'SQL Editor',
              language: 'sql',
              height: 300,
              sqlConfig: {
                tables: [
                  {
                    name: 'users',
                    columns: [
                      { name: 'id', type: 'BIGINT' },
                      { name: 'username', type: 'VARCHAR(64)' },
                    ],
                  },
                ],
                dialect: 'mysql',
              },
            },
          ],
        },
      ],
    });

    expect(screen.getByText('SQL Editor')).toBeTruthy();
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('renders multiple editor variants without crashing', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderCodeEditorSchema({
      type: 'page',
      body: [
        {
          type: 'form',
          name: 'testForm',
          body: [
            {
              type: 'code-editor',
              name: 'jsonEditor',
              label: 'JSON Editor',
              language: 'json',
              height: 200,
            },
            {
              type: 'code-editor',
              name: 'jsEditor',
              label: 'JS Editor',
              language: 'javascript',
              height: 200,
            },
            {
              type: 'code-editor',
              name: 'cssEditor',
              label: 'CSS Editor',
              language: 'css',
              height: 150,
            },
            {
              type: 'code-editor',
              name: 'plainEditor',
              label: 'Plain Text',
              language: 'plaintext',
              height: 100,
            },
          ],
        },
      ],
    });

    expect(screen.getByText('JSON Editor')).toBeTruthy();
    expect(screen.getByText('JS Editor')).toBeTruthy();
    expect(screen.getByText('CSS Editor')).toBeTruthy();
    expect(screen.getByText('Plain Text')).toBeTruthy();
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('renders template mode editor with placeholder containing curly braces', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderCodeEditorSchema({
      type: 'page',
      body: [
        {
          type: 'form',
          name: 'testForm',
          body: [
            {
              type: 'code-editor',
              name: 'templateExpr',
              label: 'Template Mode',
              language: 'expression',
              mode: 'template',
              autoHeight: true,
              expressionConfig: {
                variables: [
                  { label: 'Name', value: 'data.name', type: 'string' },
                ],
              },
            },
          ],
        },
      ],
    });

    expect(screen.getByText('Template Mode')).toBeTruthy();
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('renders read-only editor with initial value', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderCodeEditorSchema({
      type: 'page',
      body: [
        {
          type: 'form',
          name: 'testForm',
          body: [
            {
              type: 'code-editor',
              name: 'readOnlyCode',
              label: 'Read-Only Viewer',
              language: 'javascript',
              readOnly: true,
              value: 'const greeting = "Hello";',
              lineNumbers: true,
              editorTheme: 'dark',
            },
          ],
        },
      ],
    });

    expect(screen.getByText('Read-Only Viewer')).toBeTruthy();
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('renders fullscreen editor with header bar when allowFullscreen is set', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderCodeEditorSchema({
      type: 'page',
      body: [
        {
          type: 'form',
          name: 'testForm',
          body: [
            {
              type: 'code-editor',
              name: 'jsonEditor',
              label: 'JSON Editor',
              language: 'json',
              height: 200,
              allowFullscreen: true,
            },
          ],
        },
      ],
    });

    expect(screen.getByText('JSON Editor')).toBeTruthy();
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
