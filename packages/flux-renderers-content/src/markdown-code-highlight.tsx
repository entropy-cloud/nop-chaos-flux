import React from 'react';
import type { EditorLanguage } from '@nop-chaos/flux-code-editor';

// docs/components/markdown/design.md §2a: fence tag → CodeMirror language.
// Aliases owned by this package; tags without a mapping fall back to a plain
// text pre (fence-unknown-language). EditorLanguage has no shell family, so
// sh/bash/shell intentionally resolve to no mapping.
const FENCE_LANGUAGE_ALIASES: Record<string, EditorLanguage> = {
  js: 'javascript',
  jsx: 'javascript',
  javascript: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  typescript: 'typescript',
  json: 'json',
  md: 'markdown',
  markdown: 'markdown',
  python: 'python',
  py: 'python',
  sql: 'sql',
  html: 'html',
  css: 'css',
  xml: 'xml',
  yaml: 'yaml',
  yml: 'yaml',
};

function resolveFenceLanguage(tag: string | undefined): EditorLanguage | null {
  if (!tag) {
    return null;
  }
  return FENCE_LANGUAGE_ALIASES[tag.toLowerCase()] ?? null;
}

const LazyColorizeView = React.lazy(() =>
  import('@nop-chaos/flux-code-editor').then((m) => ({ default: m.ColorizeView })),
);

export function HighlightedFence(props: { code: string; tag: string | undefined }) {
  const language = resolveFenceLanguage(props.tag);
  return (
    <div data-code-highlight="true">
      {language ? (
        <React.Suspense fallback={<pre>{props.code}</pre>}>
          <LazyColorizeView value={props.code} language={language} editorTheme="light" />
        </React.Suspense>
      ) : (
        <pre>{props.code}</pre>
      )}
    </div>
  );
}
