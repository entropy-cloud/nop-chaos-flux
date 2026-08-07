// Harness page for the BUILT @nop-chaos/flux dist artifact.
//
// This page is bundled by flux-bundle-built-dist.spec.ts in consumer style:
// a dedicated vite build with NO workspace src aliases, where the
// '@nop-chaos/flux' bare specifier resolves to packages/flux-bundle/dist/*
// (the same artifact a host would consume from the published tarball).
//
// The page exposes window.__fluxHarness so the spec can assert the
// registration surface (6 renderer families), one real render, and the
// editor-renderer (tiptap) path without any shim-related errors.
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import {
  createDefaultFluxEnv,
  createFluxRendererRegistry,
  createFluxSchemaRenderer,
} from '@nop-chaos/flux';
import '@nop-chaos/flux/style.css';

interface HarnessState {
  registered: Record<string, boolean>;
  mountError: string | null;
  rendered: boolean;
  textRendered: boolean;
  editorHtml: string | null;
}

declare global {
  interface Window {
    __fluxHarness?: HarnessState;
  }
}

const FAMILY_SAMPLES: Record<string, string[]> = {
  basic: ['text', 'container', 'button'],
  form: ['form', 'input-text', 'textarea'],
  'form-advanced': ['editor'],
  data: ['table', 'list'],
  content: ['card', 'link'],
  layout: ['grid', 'wizard'],
};

const SCHEMA = {
  type: 'page',
  body: [
    {
      type: 'container',
      body: [{ type: 'text', text: 'flux-bundle built-dist harness text' }],
    },
    {
      type: 'form',
      name: 'harnessForm',
      data: { rich: '<p>Initial <strong>rich</strong> text.</p>' },
      body: [{ type: 'editor', name: 'rich', label: 'Content', outputFormat: 'html' }],
    },
  ],
};

const state: HarnessState = {
  registered: {},
  mountError: null,
  rendered: false,
  textRendered: false,
  editorHtml: null,
};

try {
  const registry = createFluxRendererRegistry();
  for (const [family, types] of Object.entries(FAMILY_SAMPLES)) {
    for (const type of types) {
      state.registered[`${family}:${type}`] = registry.has(type);
    }
  }
  window.__fluxHarness = state;

  const SchemaRenderer = createFluxSchemaRenderer();
  const env = createDefaultFluxEnv({});
  const root = createRoot(document.getElementById('root') as HTMLElement);
  root.render(React.createElement(SchemaRenderer, { schema: SCHEMA, env, data: {} }));
  state.rendered = true;
  window.__fluxHarness = state;

  window.setTimeout(() => {
    state.editorHtml = document.querySelector('.ProseMirror')?.innerHTML ?? null;
    state.textRendered =
      document.body.textContent?.includes('flux-bundle built-dist harness text') ?? false;
    window.__fluxHarness = state;
  }, 2500);
} catch (error) {
  state.mountError = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  window.__fluxHarness = state;
}
