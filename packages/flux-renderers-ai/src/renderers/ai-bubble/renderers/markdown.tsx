import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import { createLowlight, common } from 'lowlight';
import { sanitizeHtml } from '@nop-chaos/flux-renderers-content';
/* Adjudication 01-05: cross-package coupling ai→content for sanitizeHtml. Minimal scope (1 utility function, same dependency form-advanced also uses). Accept-and-annotate: not worth extracting without a 3rd consumer. */
import { Button, cn } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import type { Components } from 'react-markdown';
import type { BubbleContentRendererProps } from '../types.js';
import { safeMarkdownSlice } from '../markdown-buffer.js';
import { preprocessMathDelimiters } from '../math-delimiter-preprocess.js';

/**
 * Markdown content renderer (A-2 streaming-safe + A-3 code-block copy).
 *
 * - Wraps `react-markdown` in a lightweight buffer (~2KB, design.md §10.4
 *   path C) that holds back incomplete UTF-16 surrogates and unclosed code
 *   fences / `$$` math blocks, eliminating CJK garbling and mid-stream
 *   flicker.
 * - Renders a "Copy" button on every fenced code block (A-3). Copy goes
 *   through `navigator.clipboard` (host-owned IO surface — INV-1 permits this
 *   because the clipboard API is a user-gesture-only browser API, not a
 *   network/storage primitive; the package never opens a socket or persists).
 * - Sanitizes via the shared `sanitizeHtml` (DOMPurify) so XSS protection is
 *   consistent with the content package (design.md §5.2). Sanitize runs on
 *   the plain markdown SOURCE before parsing, so the KaTeX tree produced by
 *   rehype-katex downstream never passes through DOMPurify (D6 pipeline
 *   order, roadmap-adjudicated: no allowlist change needed).
 * - D6 (G5 + G6): `remark-math` + `rehype-katex` render LaTeX (`$...$` /
 *   `$$...$$`); fenced code is highlighted via lowlight with tokens rendered
 *   as controlled React elements (no `dangerouslySetInnerHTML`).
 * - P1-2/P1-3 (2026-08-25 remediation): `preprocessMathDelimiters` runs on
 *   the safe slice before sanitize/parse — it escapes original-text currency
 *   dollars (`$5` → literal, no `.katex`) and maps paired `\(...\)` /
 *   `\[...\]` delimiters to `$`/`$$` so mainstream LLM formula forms render
 *   as math (design.md §10.4 delimiter semantic table).
 */
// Streaming throttle: the full slice → sanitize → mdast/hast → highlight
// pipeline runs per parse; per-chunk re-parses of a growing answer cost O(n²)
// in total (plan 2026-09-29-2 R2-P1). Gate the pipeline to ~80ms time slices
// while streaming; non-streaming updates flush immediately. Compiler-safe:
// state/scheduler driven — no render-phase ref gating, no 'use no memo'.
const STREAM_PARSE_THROTTLE_MS = 80;

function useThrottledMarkdownSource(raw: string, streaming: boolean): string {
  const [displayed, setDisplayed] = useState(raw);
  const latestRawRef = useRef(raw);
  const parseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Shrink or non-prefix switch (message swap / truncation) must never wait
  // for the timer — render-time adjust (repo's adjust-state-during-render
  // pattern) snaps displayed back onto the new source immediately.
  if (raw !== displayed && (raw.length < displayed.length || !raw.startsWith(displayed))) {
    setDisplayed(raw);
  }

  useEffect(() => {
    latestRawRef.current = raw;
    if (!streaming || raw === displayed) return;
    if (parseTimerRef.current != null) return;
    parseTimerRef.current = setTimeout(() => {
      parseTimerRef.current = null;
      setDisplayed(latestRawRef.current);
    }, STREAM_PARSE_THROTTLE_MS);
  }, [raw, displayed, streaming]);

  useEffect(() => {
    return () => {
      if (parseTimerRef.current != null) {
        clearTimeout(parseTimerRef.current);
        parseTimerRef.current = null;
      }
    };
  }, []);

  // Non-streaming renders consume the source directly — the throttle only
  // exists to bound re-parse frequency during the accumulation window, so no
  // flush effect is needed when streaming ends.
  return streaming ? displayed : raw;
}

export function MarkdownContentRenderer({ message, content, streaming: streamingProp }: BubbleContentRendererProps) {
  const raw = extractContentText(content);

  // A-11: append a blinking cursor while the assistant message is streaming.
  // bug 166 (plan 472 V2): prefer the chat-level streaming signal threaded by
  // `AiBubbleView` — the engine clears `message.loading` at the first chunk,
  // so the loading flag alone never covers the accumulation window.
  const streaming = streamingProp ?? message?.loading === true;
  const throttledRaw = useThrottledMarkdownSource(raw, streaming);
  const source = preprocessMathDelimiters(safeMarkdownSlice(throttledRaw));
  if (source.length === 0) return null;

  // A-11: append a blinking cursor while the assistant message is streaming.
  // bug 166 (plan 472 V2): prefer the chat-level streaming signal threaded by
  // `AiBubbleView` — the engine clears `message.loading` at the first chunk,
  // so the loading flag alone never covers the accumulation window.
  // Security gate: sanitize first, then let rehype-raw render the safe subset.
  const safe = sanitizeHtml(source);
  return (
    <div data-slot="ai-bubble-markdown" className="max-w-none break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeRaw, rehypeKatex]}
        components={markdownComponentOverrides}
      >
        {safe}
      </ReactMarkdown>
      {streaming ? <span data-slot="ai-bubble-cursor" aria-hidden="true">▍</span> : null}
    </div>
  );
}

function extractContentText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (
    typeof content === 'object' &&
    content !== null &&
    'type' in content &&
    (content as { type?: unknown }).type === 'text'
  ) {
    return String((content as { text?: unknown }).text ?? '');
  }
  return '';
}

const markdownComponentOverrides: Components = {
  pre({ children, ...rest }) {
    return (
      <pre data-slot="ai-bubble-pre" {...rest}>
        {children}
      </pre>
    );
  },
  code({ className, children, ...rest }) {
    // `react-markdown` v10 signals fenced code blocks with a `language-*` class
    // on the <code> element; inline code has no such class.
    const isFenced = typeof className === 'string' && className.includes('language-');
    if (!isFenced) {
      return (
        <code className={className} {...rest}>
          {children}
        </code>
      );
    }
    return (
      <CodeBlock className={className} {...rest}>
        {children}
      </CodeBlock>
    );
  },
};

// ---------------------------------------------------------------------------
// D6 (G6): fenced-code syntax highlighting via lowlight.
//
// Decision D-c (grammar registration): a bare `createLowlight()` registers
// ZERO grammars (lowlight@3 optional parameter) and every `highlight()` call
// throws `Unknown language` — the pre-existing silent-failure defect of the
// content package adapter. We explicitly register the `common` set (~37
// languages). Live check: `tsx` resolves through the `typescript` aliases
// registered by highlight.js's common bundle, so the D1 fixture fence needs
// no extra `register()` call.
// ---------------------------------------------------------------------------

const lowlight = createLowlight(common);

/**
 * Map highlight.js scopes onto the AI-15 `.tok-*` semantic palette (4
 * theme-controlled tokens, styled in styles.css). Scopes outside this map
 * render as unstyled spans; the palette stays small on purpose (design.md
 * size discipline).
 */
const HLJS_SCOPE_TO_TOK: Readonly<Record<string, string>> = {
  // plan 472 V2 (A5): comments are the largest unstyled visual mass in real
  // code blocks; tok-comment mutes them instead of leaving inherited body
  // color. `punctuation` was adjudicated out — the scope is absent from the
  // hljs common grammar set (dead-token pattern).
  comment: 'tok-comment',
  keyword: 'tok-key',
  'selector-tag': 'tok-key',
  'selector-class': 'tok-key',
  'selector-id': 'tok-key',
  section: 'tok-key',
  tag: 'tok-key',
  name: 'tok-key',
  attr: 'tok-key',
  attribute: 'tok-key',
  property: 'tok-key',
  title: 'tok-key',
  'title.function': 'tok-key',
  'title.class': 'tok-key',
  function: 'tok-key',
  'built_in': 'tok-key',
  type: 'tok-key',
  class: 'tok-key',
  string: 'tok-str',
  'string.regexp': 'tok-str',
  regexp: 'tok-str',
  char: 'tok-str',
  addition: 'tok-str',
  number: 'tok-num',
  literal: 'tok-bool',
  symbol: 'tok-bool',
  bool: 'tok-bool',
};

/** Structural subset of the hast tree lowlight returns (avoids a `hast` type dep). */
interface HighlightHastNode {
  type: string;
  tagName?: string;
  value?: string;
  properties?: { className?: string | Array<string | number> | null };
  children?: Array<HighlightHastNode>;
}

/**
 * Highlight `source` as `lang`, returning controlled React elements tagged
 * with `.tok-*` classes — or `null` when the language is not registered or
 * the grammar throws (lang-unknown failure path: plain-text fallback, the
 * code block itself keeps working).
 */
function highlightCode(lang: string, source: string): React.ReactNode[] | null {
  if (!lowlight.registered(lang)) return null;
  try {
    const root = lowlight.highlight(lang, source);
    return renderHighlightNodes(root.children);
  } catch {
    return null;
  }
}

function renderHighlightNodes(nodes: Array<HighlightHastNode>): React.ReactNode[] {
  // Deterministic content-derived keys (scope/text + per-render occurrence):
  // the tree is rebuilt per markdown re-parse, so index-free keys keep token
  // identity stable without tripping react/no-array-index-key.
  const seen = new Map<string, number>();
  const keyFor = (base: string): string => {
    const occurrences = (seen.get(base) ?? 0) + 1;
    seen.set(base, occurrences);
    return `${base}#${occurrences}`;
  };
  return nodes.map((node) => {
    if (node.type === 'text') return node.value ?? '';
    const rawClassName = node.properties?.className;
    const scopes = typeof rawClassName === 'string' ? [rawClassName] : (rawClassName ?? []);
    const scope = scopes.find(
      (name): name is string => typeof name === 'string' && name.startsWith('hljs-'),
    );
    const token = scope ? HLJS_SCOPE_TO_TOK[scope.slice('hljs-'.length)] : undefined;
    const text = node.children ? flattenHighlightText(node.children) : '';
    return (
      <span key={keyFor(text || scope || 'span')} className={token}>
        {node.children ? renderHighlightNodes(node.children) : null}
      </span>
    );
  });
}

function flattenHighlightText(nodes: Array<HighlightHastNode>): string {
  let out = '';
  for (const node of nodes) {
    if (node.type === 'text') out += node.value ?? '';
    else if (node.children) out += flattenHighlightText(node.children);
  }
  return out;
}

function CodeBlock({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  // 2-20: the copied-reset timer must be cleared on unmount (no setState on
  // an unmounted component).
  const copiedResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (copiedResetTimerRef.current) {
        clearTimeout(copiedResetTimerRef.current);
        copiedResetTimerRef.current = null;
      }
    };
  }, []);

  // D6 (G6): highlight the fenced source when a registered language is
  // declared; unknown languages and grammar failures fall back to the
  // plain children (code block keeps working).
  const lang = /language-([\w-]+)/.exec(className ?? '')?.[1];
  const source = extractElementText(children);
  const highlighted = lang ? highlightCode(lang, source) : null;

  function handleCopy() {
    const text = extractElementText(children);
    // clipboard-write-failed: only flip to "Copied" when the write resolves.
    // A rejected write (permission lost / no focus) keeps the button as-is so
    // the user does not see a false success.
    void Promise.resolve(copyToClipboard(text))
      .then(() => {
        setCopied(true);
        if (copiedResetTimerRef.current) {
          clearTimeout(copiedResetTimerRef.current);
        }
        copiedResetTimerRef.current = setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {
        // swallow: keep the button in its pre-copy state
      });
  }

  return (
    // [G5-R5-视角8-01] the copy button is absolutely positioned over the first
    // line — reserve the button row (pt-8 = top-1 + h-7) so the first code line
    // renders below it, and give the button an opaque chip so code scrolling
    // under its right edge stays legible.
    <code className={cn('relative block pt-8', className)} data-slot="ai-bubble-code">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="absolute right-1 top-1 bg-background/90 opacity-90 hover:opacity-100"
        data-slot="ai-bubble-copy-code"
        aria-label={t('flux.ai.copyCode')}
        onClick={handleCopy}
      >
        {copied ? t('flux.ai.copied') : t('flux.ai.copy')}
      </Button>
      {highlighted ?? children}
    </code>
  );
}

function extractElementText(node: React.ReactNode): string {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractElementText).join('');
  if (typeof node === 'object' && 'props' in (node as React.ReactElement)) {
    const element = node as React.ReactElement<{ children?: React.ReactNode }>;
    return extractElementText(element.props.children);
  }
  return '';
}

/**
 * Clipboard write indirection. Tests can stub this; production uses
 * `navigator.clipboard`. Allowed under INV-1 because clipboard is a
 * user-gesture browser API, not a network/storage primitive.
 *
 * R2-F2 (2026-08-11 open-audit): a MISSING clipboard API (non-https /
 * sandboxed / no `writeText`) must be an explicit failure signal, not a
 * silent success — the old `return undefined` resolved through
 * `Promise.resolve(undefined)` and flipped the button to a false "Copied".
 * The rejection flows into `handleCopy`'s `.catch`, keeping the button in its
 * pre-copy state (same behavior as a rejected write).
 */
export const clipboardAdapter: { writeText(text: string): void | Promise<void> } = {
  writeText(text: string): void | Promise<void> {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return Promise.reject(new Error('navigator.clipboard is not available'));
  },
};

function copyToClipboard(text: string): void | Promise<void> {
  return clipboardAdapter.writeText(text);
}
