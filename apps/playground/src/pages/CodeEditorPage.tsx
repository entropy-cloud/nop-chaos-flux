import { useMemo } from 'react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer, createDefaultRegistry } from '@nop-chaos/flux-react';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerFormRenderers } from '@nop-chaos/flux-renderers-form';
import { registerDataRenderers } from '@nop-chaos/flux-renderers-data';
import { codeEditorRendererDefinition } from '@nop-chaos/flux-code-editor';

const schema = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'codeEditorForm',
      body: [
        {
          type: 'code-editor',
          name: 'expression',
          label: 'Expression Editor',
          language: 'expression',
          mode: 'expression',
          placeholder: 'Type an expression, e.g. data.age > 18',
          autoHeight: true,
        },
        {
          type: 'code-editor',
          name: 'sql',
          label: 'SQL Editor',
          language: 'sql',
          height: 300,
          lineNumbers: true,
          sqlConfig: {
            tables: [
              {
                name: 'users',
                description: 'User table',
                columns: [
                  { name: 'id', type: 'BIGINT', description: 'Primary key' },
                  { name: 'username', type: 'VARCHAR(64)', description: 'Username' },
                  { name: 'email', type: 'VARCHAR(128)' },
                ],
              },
              {
                name: 'orders',
                alias: 'o',
                description: 'Order table',
                columns: [
                  { name: 'id', type: 'BIGINT' },
                  { name: 'user_id', type: 'BIGINT' },
                  { name: 'amount', type: 'DECIMAL(10,2)' },
                  { name: 'status', type: 'VARCHAR(16)' },
                ],
              },
            ],
            dialect: 'mysql',
            uppercaseKeywords: true,
          },
        },
        {
          type: 'code-editor',
          name: 'jsonSchema',
          label: 'JSON Editor',
          language: 'json',
          height: 200,
          lineNumbers: true,
          folding: true,
          placeholder: '{\n  "key": "value"\n}',
        },
        {
          type: 'code-editor',
          name: 'javascriptCode',
          label: 'JavaScript Editor',
          language: 'javascript',
          height: 200,
          lineNumbers: true,
          placeholder: '// Write JavaScript code here',
        },
        {
          type: 'code-editor',
          name: 'readOnlyCode',
          label: 'Read-Only Viewer',
          language: 'javascript',
          readOnly: true,
          value: 'const greeting = "Hello, World!";\nconsole.log(greeting);',
          lineNumbers: true,
          editorTheme: 'dark',
        },
        {
          type: 'code-editor',
          name: 'cssEditor',
          label: 'CSS Editor',
          language: 'css',
          height: 150,
          lineNumbers: true,
          placeholder: '.container {\n  display: flex;\n}',
        },
        {
          type: 'code-editor',
          name: 'plaintextEditor',
          label: 'Plain Text',
          language: 'plaintext',
          height: 100,
          placeholder: 'Just plain text...',
        },
      ],
    },
  ],
};

interface CodeEditorPageProps {
  onBack: () => void;
}

const registry = createDefaultRegistry();
registerBasicRenderers(registry);
registerFormRenderers(registry);
registerDataRenderers(registry);
registry.register(codeEditorRendererDefinition);

const SchemaRenderer = createSchemaRenderer();
const formulaCompiler = createFormulaCompiler();

const env: RendererEnv = {
  fetcher: async <T,>() => ({ ok: true, status: 200, data: null as T }),
  notify: () => undefined,
};

export function CodeEditorPage({ onBack }: CodeEditorPageProps) {
  return (
    <main className="min-h-screen grid place-items-center p-6">
      <section className="max-w-[1100px] p-10 rounded-3xl bg-[var(--nop-hero-bg)] border border-[var(--nop-hero-border)] shadow-[var(--nop-hero-shadow)]">
        <button
          type="button"
          className="mb-[18px] px-3.5 py-2.5 rounded-full border border-[var(--nop-nav-border)] bg-[var(--nop-nav-surface)] text-[var(--nop-text-strong)] font-sans text-[13px] font-bold cursor-pointer transition-[transform,box-shadow,border-color] duration-160 hover:-translate-y-px hover:shadow-[var(--nop-nav-shadow-active)] hover:border-[var(--nop-nav-hover-border)]"
          onClick={onBack}
        >
          Back to Home
        </button>
        <p className="mb-3 uppercase tracking-[0.16em] text-xs text-[var(--nop-eyebrow)]">
          Code Editor
        </p>
        <h1 className="m-0 mb-4">Code Editor Playground</h1>
        <p className="text-lg leading-relaxed text-[var(--nop-body-copy)]">
          Test the CodeMirror 6 based code-editor renderer across different
          languages: expression, SQL, JSON, JavaScript, CSS, HTML, and plain
          text. Each editor supports syntax highlighting, auto-completion, and
          configurable features like line numbers, folding, themes, and
          read-only mode.
        </p>
        <div className="mt-8">
          <SchemaRenderer
            schema={schema}
            env={env}
            registry={registry}
            formulaCompiler={formulaCompiler}
          />
        </div>
      </section>
    </main>
  );
}
