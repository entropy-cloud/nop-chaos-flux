import { Fragment } from 'react';
import type {
  FluxActionEvent,
  RendererComponentProps,
  RendererRenderOutput,
  ScopeRef,
} from '@nop-chaos/flux-core';
import { Button, Popover, PopoverContent, PopoverTrigger, cn } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import type { ChatMessage, ChatMessageContentPart } from '../engine/types.js';
import type { AiCitationSource, AiCitationsSchema } from '../schemas.js';

const UNSAFE_URL_RE = /^(javascript|data):/i;

function sanitizeUrl(url: string): string | undefined {
  return UNSAFE_URL_RE.test(url) ? undefined : url;
}

/**
 * C8.2 P1-1 (CX-10 / bug-83 family convention): the second dispatch arg
 * carries `{ event, evaluationBindings, scope }` so action-args templates can
 * read `${source.title}` / `${index}` (ai-conversations.tsx:29-33 precedent).
 */
function dispatchCtx(payload: Record<string, unknown>, nodeScope: ScopeRef | undefined) {
  return {
    event: payload as FluxActionEvent,
    evaluationBindings: payload,
    scope: nodeScope,
  };
}

/**
 * ai-citations (Widget, P3, A-13): renders an assistant message's content as
 * plain text with `[N]` / `[N,M]` citation markers turned into hoverable
 * `<sup>` markers that open a source card.
 *
 * Composition model (Decision-C): this is an **independent** widget the host
 * places in an `ai-chat` region (e.g. `afterMessages` / a bubble footer). It
 * re-renders a *copy* of `message.content` — the `ai-bubble` keeps rendering
 * its own (markdown) content with `[1]` as literal text; the two never render
 * the same slice twice (host chooses one placement). The in-bubble inline
 * variant (improvement §4.2) is out-of-scope (host `BubbleContentRenderer`).
 *
 * Security: the inline path parses the RAW message text and renders each text
 * run as a **controlled React text node** (never `dangerouslySetInnerHTML`
 * with user content), so `<`/`>`/`&` are escaped exactly once by React and no
 * `<script>` element can ever reach the DOM (XSS gate). A prior version ran
 * `sanitizeHtml` (DOMPurify) before parsing; that HTML-encoded the output and
 * the subsequent React text render double-encoded it (`5 < 3` → literal
 * `&lt;`), so the sanitize step was removed (P1-d). The markdown path
 * (`ai-bubble/renderers/markdown.tsx`) still uses `sanitizeHtml` — react-markdown
 * re-parses HTML entities, so no double-encode occurs there. Citation markers
 * are rendered as **controlled React elements** (Failure Path
 * `citation-no-sources` + XSS gate).
 *
 * Marker `nop-ai-citations`; `data-slot="ai-citations"`; per-citation
 * `data-citation-index`.
 */
export function AiCitationsView(props: {
  message?: ChatMessage;
  sources?: AiCitationSource[];
  mode?: 'inline' | 'list';
  className?: string;
  testid?: string;
  cid?: number;
  onSourceClick?: (source: AiCitationSource, index: number) => void;
}): React.ReactElement | null {
  const { message, mode = 'inline', className, onSourceClick, testid, cid } = props;
  const sources = resolveSources(message, props.sources);
  const byIndex = new Map<number, AiCitationSource>();
  for (const s of sources) byIndex.set(s.index, s);

  // list mode renders directly from sources (no message content required).
  if (mode === 'list') {
    return (
      <ol
        className={cn('nop-ai-citations', 'm-0 list-decimal pl-4 text-xs space-y-1', className)}
        data-slot="ai-citations"
        data-mode="list"
        data-cid={cid || undefined}
        data-testid={testid || undefined}
      >
        {sources.map((s) => (
          <li key={s.index} data-slot="ai-citation-item" data-citation-index={s.index}>
            <CitationBody source={s} onClick={onSourceClick} />
          </li>
        ))}
      </ol>
    );
  }

  const rawText = extractMessageText(message);
  if (!rawText) return null;

  // P1-d (multi-audit P1-2): do NOT run `sanitizeHtml(rawText)` here. The
  // output of `sanitizeHtml` is an HTML-encoded string (e.g. `5 < 3` →
  // `5 &lt; 3`); feeding that to `parseCitations` and then rendering each text
  // segment as React text re-escapes the `&`, so the DOM textContent held the
  // literal `&lt;`/`&gt;`/`&amp;` (double-encoding). It also dropped citation
  // markers that sat inside a forbidden tag (open-audit P2-3 same root).
  // Instead we parse the RAW text and let React's controlled text-node
  // rendering provide the single, safe escape — `<`/`>`/`&` display as the
  // literal chars and no `<script>` element can ever be created (XSS gate
  // preserved; verified by the FP-5/FP-6 tests).
  const segments = parseCitations(rawText);

  return (
    <div
      className={cn('nop-ai-citations', 'text-sm leading-relaxed', className)}
      data-slot="ai-citations"
      data-mode="inline"
      data-cid={cid || undefined}
      data-testid={testid || undefined}
    >
      {segments.map((seg) =>
        seg.kind === 'text' ? (
          <Fragment key={seg.id}>{seg.text}</Fragment>
        ) : (
          <CitationGroup key={seg.id} indices={seg.indices} byIndex={byIndex} onSourceClick={onSourceClick} />
        ),
      )}
    </div>
  );
}

/** Registered renderer: schema-driven entry. */
export function AiCitationsRenderer(props: RendererComponentProps<AiCitationsSchema>): RendererRenderOutput {
  const resolved = props.props;
  return (
    <AiCitationsView
      message={resolved.message as ChatMessage | undefined}
      sources={resolved.sources as AiCitationSource[] | undefined}
      mode={resolved.mode ?? 'inline'}
      className={props.meta.className}
      testid={props.meta.testid}
      cid={props.meta.cid}
      onSourceClick={
        props.events?.onSourceClick
          ? (source, index) => {
              const payload = { type: 'ai:citation-click', source, index };
              void props.events.onSourceClick?.(payload, dispatchCtx(payload, props.node.scope as ScopeRef | undefined));
            }
          : undefined
      }
    />
  );
}

function CitationGroup({
  indices,
  byIndex,
  onSourceClick,
}: {
  indices: number[];
  byIndex: Map<number, AiCitationSource>;
  onSourceClick?: (source: AiCitationSource, index: number) => void;
}): React.ReactElement {
  return (
    <sup data-slot="ai-citation" className="font-medium">
      [
      {indices.map((n, i) => {
        const source = byIndex.get(n);
        return (
          <Fragment key={n}>
            {i > 0 ? ', ' : null}
            <Popover>
              <PopoverTrigger
                render={
                  <Button
                    variant="link"
                    size="xs"
                    data-slot="ai-citation-trigger"
                    data-citation-index={n}
                    className="align-super px-0"
                    aria-label={t('flux.ai.citation', { n })}
                  >
                    {n}
                  </Button>
                }
              />
              <PopoverContent
                align="start"
                className="max-w-[18rem] p-3 text-xs"
              >
                <div data-slot="ai-citation-card">
                  {source ? (
                    <CitationBody source={source} onClick={onSourceClick} />
                  ) : (
                    <p data-slot="ai-citation-empty" className="text-muted-foreground">
                      {t('flux.ai.citationNoSource')}
                    </p>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </Fragment>
        );
      })}
      ]
    </sup>
  );
}

function CitationBody({
  source,
  onClick,
}: {
  source: AiCitationSource;
  onClick?: (source: AiCitationSource, index: number) => void;
}): React.ReactElement {
  return (
    <article className="space-y-1">
      {source.title ? (
        <p className="font-medium leading-tight">{source.title}</p>
      ) : null}
      {source.snippet ? <p className="text-muted-foreground">{source.snippet}</p> : null}
      {source.url ? (() => {
        const safeUrl = sanitizeUrl(source.url);
        return safeUrl ? (
          <a
            href={safeUrl}
            target="_blank"
            rel="noopener noreferrer"
            data-slot="ai-citation-url"
            className="inline-block text-primary hover:underline"
            onClick={() => onClick?.(source, source.index)}
          >
            {source.url}
          </a>
        ) : (
          <span
            data-slot="ai-citation-url"
            className="inline-block text-muted-foreground"
          >
            {source.url}
          </span>
        );
      })() : null}
      {onClick && !source.url ? (
        <Button
          variant="link"
          size="xs"
          data-slot="ai-citation-open"
          className="px-0"
          onClick={() => onClick(source, source.index)}
        >
          {t('flux.ai.openSource')}
        </Button>
      ) : null}
    </article>
  );
}

// ============================================
// Parsing + source resolution (pure helpers)
// ============================================

const CITATION_RE = /\[(\d+(?:\s*,\s*\d+)*)\]/g;

type CitationSegment =
  | { kind: 'text'; text: string; id: string }
  | { kind: 'citation'; indices: number[]; id: string };

/**
 * Split sanitized text into text runs + citation groups. Each citation group
 * captures a `[N]` or `[N,M,…]` marker and yields the parsed 1-based indices.
 * Each segment carries a stable `id` derived from its character offset (not an
 * array index) so it is a correct React key even when content repeats.
 *
 * P2 (FP `citation-in-codeblock`): markdown code spans — fenced (``` / ~~~)
 * blocks and inline `` `…` `` — are stripped of citation parsing first, so a
 * literal `array[0]` inside code never becomes an empty `[0]` citation card.
 * Indices that are not 1-based positive integers (`0`, negatives) are also
 * dropped: citations are 1-based per the schema contract.
 */
export function parseCitations(text: string): CitationSegment[] {
  const segments: CitationSegment[] = [];
  let last = 0;
  for (const match of text.matchAll(CITATION_RE)) {
    const start = match.index ?? 0;
    if (start > last) segments.push({ kind: 'text', text: text.slice(last, start), id: `t@${last}` });
    const indices = match[1]
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => Number.isFinite(n) && n > 0);
    // If every index was filtered out (e.g. `[0]`), emit the raw text back
    // instead of an empty citation group, so the marker stays as literal text.
    if (indices.length === 0) {
      segments.push({ kind: 'text', text: match[0], id: `t@${start}` });
    } else {
      segments.push({ kind: 'citation', indices, id: `c@${start}` });
    }
    last = start + match[0].length;
  }
  if (last < text.length) segments.push({ kind: 'text', text: text.slice(last), id: `t@${last}` });
  return stripCitationsInsideCode(segments);
}

/**
 * Walk the parsed segments and drop citation groups that fall inside a code
 * region (fenced ``` / ~~~ block, or a paired inline `` ` `` span). The code
 * runs themselves are kept as literal text so the visible output is unchanged
 * — only the citation interpretation is suppressed.
 *
 * Streaming-incomplete input (unclosed fence) is treated conservatively: an
 * unclosed fence makes everything from its opening to EOF "code", so no
 * citations are parsed in the dangling tail.
 */
function stripCitationsInsideCode(segments: CitationSegment[]): CitationSegment[] {
  const out: CitationSegment[] = [];
  let fenceDelimiter: string | null = null; // '`' | '```' | '~~~' when inside a fenced block
  let inlineOpen = false; // true when inside a single-backtick inline code span
  for (const seg of segments) {
    if (seg.kind === 'citation') {
      if (fenceDelimiter || inlineOpen) {
        // Inside code → emit the original marker text verbatim (no card).
        out.push({ kind: 'text', text: citationMarkerText(seg.indices), id: seg.id });
      } else {
        out.push(seg);
      }
      continue;
    }
    // Text segment: scan for fence / inline-code delimiters and split it so we
    // can keep tracking state across the whole stream.
    const pieces = scanTextForCodeRegions(seg.text, fenceDelimiter, inlineOpen, seg.id);
    fenceDelimiter = pieces.nextFenceDelimiter;
    inlineOpen = pieces.nextInlineOpen;
    for (const piece of pieces.runs) {
      out.push({ kind: 'text', text: piece.text, id: piece.id });
    }
  }
  return out;
}

function citationMarkerText(indices: number[]): string {
  return `[${indices.join(',')}]`;
}

interface TextRunScan {
  text: string;
  id: string;
}

interface CodeRegionScan {
  runs: TextRunScan[];
  nextFenceDelimiter: string | null;
  nextInlineOpen: boolean;
}

/**
 * Split a text segment at code-fence and inline-code delimiters. Returns the
 * literal text runs (no transformation) plus the updated fence/inline state
 * carried across segments. Run ids are prefixed with the enclosing segment id
 * so keys stay unique across calls (idCounter restarts per call).
 */
function scanTextForCodeRegions(
  text: string,
  fenceDelimiter: string | null,
  inlineOpen: boolean,
  segmentId: string,
): CodeRegionScan {
  const runs: TextRunScan[] = [];
  // Match fence opens/closes OR an inline backtick toggle. A fence wins over
  // a single backtick when 3+ backticks are contiguous.
  // - Fence run: 3+ backticks or 3+ tildes at the start of a line.
  // - Inline toggle: a single backtick not part of a fence run.
  const tokenRe = /(?:^|\n)(`{3,}|~{3,})|`/g;
  let last = 0;
  let fence = fenceDelimiter;
  let inline = inlineOpen;
  let idCounter = 0;
  const push = (str: string): void => {
    if (str.length > 0) {
      runs.push({ text: str, id: `${segmentId}#${last}#${idCounter++}` });
    }
  };
  for (const m of text.matchAll(tokenRe)) {
    const start = m.index ?? 0;
    const token = m[0];
    const isFenceToken = Boolean(m[1]);
    // Emit the text up to (but not including) the token. The leading `\n`
    // capture of a fence token belongs to the literal text run (it precedes
    // the fence marker), so we keep it in the run when present.
    const fenceLeadNl = isFenceToken && token.startsWith('\n') ? 1 : 0;
    const tokenTextStart = start + fenceLeadNl;
    push(text.slice(last, tokenTextStart));
    if (isFenceToken) {
      const delim = m[1]; // the backtick/tilde run, length >= 3
      const sameKind = (fence: string | null, ch: '`' | '~'): boolean =>
        fence !== null && fence[0] === ch;
      const ch = delim[0] === '~' ? '~' : '`';
      if (fence === null) {
        // Opening a fenced block. CommonMark: ``` cannot be closed by ~~~ and
        // vice versa; we track the opening delimiter's character kind only.
        fence = ch;
      } else if (sameKind(fence, ch)) {
        // Closing the current fenced block (same delimiter kind).
        fence = null;
      }
      // If the delimiter kind mismatches the open fence, it is literal text
      // inside the code block — keep it in the run by emitting it verbatim.
      push(text.slice(tokenTextStart, start + token.length));
    } else {
      // Single backtick → toggles inline code (only meaningful outside a
      // fenced block; inside a fence backticks are literal).
      if (fence === null) {
        inline = !inline;
      }
      push(text.slice(tokenTextStart, start + token.length));
    }
    last = start + token.length;
  }
  push(text.slice(last));
  return { runs, nextFenceDelimiter: fence, nextInlineOpen: inline };
}

/** Extract plain text from a ChatMessage content (string or text parts). */
export function extractMessageText(message: ChatMessage | undefined): string {
  if (!message) return '';
  const content = message.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => textOfPart(part))
      .join('');
  }
  return '';
}

function textOfPart(part: ChatMessageContentPart): string {
  if (part && typeof part === 'object' && (part as { type?: unknown }).type === 'text') {
    return String((part as { text?: unknown }).text ?? '');
  }
  return '';
}

/**
 * Resolve the citation source list with priority:
 * explicit `sources` prop > `message.metadata.sources` > a `data-sources`
 * ChatMessageDataPart (A-1). Returns an empty list when none are present
 * (Failure Path `citation-no-sources`).
 */
export function resolveSources(
  message: ChatMessage | undefined,
  explicitSources?: AiCitationSource[] | unknown,
): AiCitationSource[] {
  if (Array.isArray(explicitSources) && explicitSources.length > 0) {
    return normalizeSources(explicitSources);
  }
  const metaSources = message?.metadata?.sources;
  if (Array.isArray(metaSources) && metaSources.length > 0) {
    return normalizeSources(metaSources);
  }
  if (message && Array.isArray(message.content)) {
    for (const part of message.content) {
      if (
        part &&
        typeof part === 'object' &&
        (part as { type?: unknown }).type === 'data-sources'
      ) {
        const data = (part as { data?: unknown }).data;
        if (Array.isArray(data) && data.length > 0) {
          return normalizeSources(data);
        }
      }
    }
  }
  return [];
}

function normalizeSources(raw: unknown[]): AiCitationSource[] {
  return raw
    .map((entry, fallbackIndex) => normalizeSourceEntry(entry, fallbackIndex))
    .filter((s): s is AiCitationSource => s !== null);
}

function normalizeSourceEntry(entry: unknown, fallbackIndex: number): AiCitationSource | null {
  if (entry == null) return null;
  if (typeof entry === 'string') {
    return { index: fallbackIndex + 1, title: entry };
  }
  if (typeof entry === 'object') {
    const obj = entry as Record<string, unknown>;
    const rawIndex = obj.index;
    const index =
      typeof rawIndex === 'number' && Number.isFinite(rawIndex)
        ? rawIndex
        : typeof rawIndex === 'string' && /^\d+$/.test(rawIndex.trim())
          ? parseInt(rawIndex.trim(), 10)
          : fallbackIndex + 1;
    return {
      index,
      title: typeof obj.title === 'string' ? obj.title : undefined,
      url: typeof obj.url === 'string' ? obj.url : undefined,
      snippet: typeof obj.snippet === 'string' ? obj.snippet : undefined,
    };
  }
  return null;
}
