import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer, createDefaultRegistry } from '@nop-chaos/flux-react';
import type { RendererEnv, SchemaInput } from '@nop-chaos/flux-core';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerFormRenderers } from '@nop-chaos/flux-renderers-form';
import { registerDataRenderers } from '@nop-chaos/flux-renderers-data';
import { codeEditorRendererDefinition } from '../index.js';
import { createLanguageExtension } from '../extensions/base.js';
import type { EditorLanguage } from '../types.js';

const env: RendererEnv = {
  fetcher: async <T,>() => ({ ok: true, status: 200, data: null as T }),
  notify: () => undefined,
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
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
      schemaUrl="test://flux-code-editor/languages"
      schema={schema}
      env={env}
      registry={registry}
      formulaCompiler={createFormulaCompiler()}
    />,
  );
}

describe('createLanguageExtension (E2h language presets)', () => {
  const NEW_LANGUAGES: EditorLanguage[] = ['python', 'yaml', 'xml', 'markdown'];
  const EXISTING_LANGUAGES: EditorLanguage[] = [
    'expression',
    'javascript',
    'typescript',
    'sql',
    'json',
    'html',
    'css',
    'plaintext',
  ];

  it('returns a non-empty extension for each new language', () => {
    for (const lang of NEW_LANGUAGES) {
      const ext = createLanguageExtension(lang);
      // Extensions are either Extension objects or arrays of them. Either way,
      // a language pack should yield at least one extension slot.
      const flat = Array.isArray(ext) ? ext : [ext];
      expect(flat.length, `${lang} should yield at least one extension`).toBeGreaterThan(0);
    }
  });

  it('returns python language support', () => {
    const ext = createLanguageExtension('python');
    expect(ext).toBeTruthy();
  });

  it('returns markdown language support', () => {
    const ext = createLanguageExtension('markdown');
    expect(ext).toBeTruthy();
  });

  it('returns yaml language support (native @codemirror/lang-yaml package)', () => {
    const ext = createLanguageExtension('yaml');
    expect(ext).toBeTruthy();
  });

  it('returns xml language support (native @codemirror/lang-xml package)', () => {
    const ext = createLanguageExtension('xml');
    expect(ext).toBeTruthy();
  });

  it('does not regress existing 8 languages', () => {
    for (const lang of EXISTING_LANGUAGES) {
      expect(() => createLanguageExtension(lang)).not.toThrow();
    }
  });

  it('returns empty array for plaintext', () => {
    const ext = createLanguageExtension('plaintext');
    const flat = Array.isArray(ext) ? ext : [ext];
    expect(flat.length).toBe(0);
  });
});

describe('code-editor integration with new languages', () => {
  const cases: Array<{ lang: EditorLanguage; sample: string }> = [
    { lang: 'python', sample: 'def hello():\n    print("world")' },
    { lang: 'markdown', sample: '# Title\n\nSome **bold** text.' },
    { lang: 'yaml', sample: 'key: value\nlist:\n  - one\n  - two' },
    { lang: 'xml', sample: '<root>\n  <child attr="1" />\n</root>' },
  ];

  for (const { lang, sample } of cases) {
    it(`renders ${lang} editor without crashing`, async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      const view = renderCodeEditorSchema({
        type: 'page',
        body: [
          {
            type: 'form',
            name: 'testForm',
            body: [
              {
                type: 'code-editor',
                name: 'sample',
                label: `${lang} Editor`,
                language: lang,
                value: sample,
                height: 200,
              },
            ],
          },
        ],
      });

      await waitFor(() => {
        expect(view.container.querySelector('.nop-code-editor')).toBeTruthy();
      });
      await waitFor(() => {
        expect(view.container.querySelector('.cm-editor')).toBeTruthy();
      });

      expect(consoleError).not.toHaveBeenCalled();
      consoleError.mockRestore();
    });
  }
});

