import { Fragment } from 'react';
import type { RendererComponentProps, RendererRenderOutput } from '@nop-chaos/flux-core';
import { Button, Popover, PopoverContent, PopoverTrigger, cn } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import { sanitizeHtml } from '@nop-chaos/flux-renderers-content';
import type { ChatMessage, ChatMessageContentPart } from '../engine/types.js';
import type { AiCitationSource, AiCitationsSchema } from '../schemas.js';

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
 * Security: content is sanitized via the shared `sanitizeHtml` (DOMPurify)
 * pipeline — the same gate `ai-bubble` markdown uses — and citation markers
 * are rendered as **controlled React elements** (never `dangerouslySetInnerHTML`
 * with user content), so XSS payloads cannot execute (Failure Path
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
  onSourceClick?: (source: AiCitationSource, index: number) => void;
}): React.ReactElement | null {
  const { message, mode = 'inline', className, onSourceClick, testid } = props;
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

  const safeText = sanitizeHtml(rawText);
  const segments = parseCitations(safeText);

  return (
    <div
      className={cn('nop-ai-citations', 'text-sm leading-relaxed', className)}
      data-slot="ai-citations"
      data-mode="inline"
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
      onSourceClick={
        props.events?.onSourceClick
          ? (source, index) => props.events.onSourceClick?.({ source, index })
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
      {source.url ? (
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          data-slot="ai-citation-url"
          className="inline-block text-primary hover:underline"
          onClick={() => onClick?.(source, source.index)}
        >
          {source.url}
        </a>
      ) : null}
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
      .filter((n) => Number.isFinite(n));
    segments.push({ kind: 'citation', indices, id: `c@${start}` });
    last = start + match[0].length;
  }
  if (last < text.length) segments.push({ kind: 'text', text: text.slice(last), id: `t@${last}` });
  return segments;
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
