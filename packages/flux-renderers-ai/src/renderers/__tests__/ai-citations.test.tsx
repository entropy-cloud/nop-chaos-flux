import { afterEach, describe, it, expect, vi } from 'vitest';
import { cleanup, render, fireEvent, act } from '@testing-library/react';
import { initFluxI18n } from '@nop-chaos/flux-i18n';
import {
  AiCitationsView,
  parseCitations,
  resolveSources,
  extractMessageText,
} from '../ai-citations.js';
import type { ChatMessage } from '../../engine/types.js';

initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });

afterEach(() => {
  cleanup();
});

describe('ai-citations — [N] parsing', () => {
  it('parses a single [1] marker', () => {
    const segs = parseCitations('Hello [1] world');
    expect(segs.map((s) => ({ kind: s.kind, ...('text' in s ? { text: s.text } : { indices: s.indices }) }))).toEqual([
      { kind: 'text', text: 'Hello ' },
      { kind: 'citation', indices: [1] },
      { kind: 'text', text: ' world' },
    ]);
  });

  it('parses a grouped [2,3] marker into multiple indices', () => {
    const segs = parseCitations('See [2,3] for details');
    const citation = segs.find((s) => s.kind === 'citation');
    expect('indices' in citation! ? citation.indices : []).toEqual([2, 3]);
  });

  it('parses [1, 2, 3] with spaces', () => {
    const segs = parseCitations('Refs [1, 2, 3].');
    const citation = segs.find((s) => s.kind === 'citation');
    expect('indices' in citation! ? citation.indices : []).toEqual([1, 2, 3]);
  });

  it('renders the correct number of <sup> citation triggers for [1] and [2,3]', () => {
    const message: ChatMessage = { id: 'm1', role: 'assistant', content: 'See [1] and [2,3].' };
    const { container } = render(<AiCitationsView message={message} />);
    const triggers = container.querySelectorAll('[data-citation-index]');
    // [1] -> 1 trigger; [2,3] -> 2 triggers → 3 total.
    expect(triggers.length).toBe(3);
    expect(Array.from(triggers).map((t) => t.getAttribute('data-citation-index'))).toEqual([
      '1',
      '2',
      '3',
    ]);
  });
});

describe('ai-citations — source hover card', () => {
  it('clicking a citation trigger opens a card showing the source title', () => {
    const message: ChatMessage = { id: 'm1', role: 'assistant', content: 'Result [1].' };
    const sources = [{ index: 1, title: 'Wikipedia: Flux', url: 'https://example.com/flux' }];
    render(<AiCitationsView message={message} sources={sources} />);
    const trigger = document.querySelector('[data-citation-index="1"]') as HTMLElement;
    expect(trigger).not.toBeNull();
    // Card is not present before open.
    expect(document.querySelector('[data-slot="ai-citation-card"]')).toBeNull();
    act(() => {
      fireEvent.click(trigger);
    });
    // Portal renders to document.body.
    const card = document.querySelector('[data-slot="ai-citation-card"]');
    expect(card).not.toBeNull();
    expect(card?.textContent).toContain('Wikipedia: Flux');
    expect(card?.querySelector('[data-slot="ai-citation-url"]')?.getAttribute('href')).toBe(
      'https://example.com/flux',
    );
  });

  it('citation-no-sources: marker present but card shows empty state', () => {
    const message: ChatMessage = { id: 'm1', role: 'assistant', content: 'Claim [9].' };
    const { container } = render(<AiCitationsView message={message} />);
    // Marker still rendered.
    expect(container.querySelector('[data-citation-index="9"]')).not.toBeNull();
    const trigger = document.querySelector('[data-citation-index="9"]') as HTMLElement;
    act(() => {
      fireEvent.click(trigger);
    });
    const empty = document.querySelector('[data-slot="ai-citation-empty"]');
    expect(empty).not.toBeNull();
    expect(empty?.textContent).toContain('No source');
  });
});

describe('ai-citations — XSS safety (sanitize gate)', () => {
  it('content with <script> never produces an executable script element (XSS gate)', () => {
    const message: ChatMessage = {
      id: 'm1',
      role: 'assistant',
      content: 'Hi [1] <script>alert(1)</script><img src=x onerror=alert(2)>',
    };
    const sources = [{ index: 1, title: 'S' }];
    const { container } = render(<AiCitationsView message={message} sources={sources} />);
    // Security guarantee: sanitize + controlled React rendering means no live
    // script element and no inline event handler ever reach the DOM.
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('[onerror]')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
  });

  it('renders HTML-like content as escaped text (controlled rendering, not innerHTML)', () => {
    // sanitize keeps the safe <b> tag; but we render text runs as React text
    // nodes, so the tag is shown literally (escaped), never parsed as HTML.
    const message: ChatMessage = { id: 'm2', role: 'assistant', content: 'see <b>bold</b>[1]' };
    const sources = [{ index: 1, title: 'S' }];
    const { container } = render(<AiCitationsView message={message} sources={sources} />);
    // The citation marker parsed from the safe text.
    expect(container.querySelector('[data-citation-index="1"]')).not.toBeNull();
    // No <b> element is created (controlled rendering escapes markup).
    expect(container.querySelector('b')).toBeNull();
  });
});

describe('ai-citations — list mode', () => {
  it('renders a bottom sources list', () => {
    const sources = [
      { index: 1, title: 'First', url: 'https://a.test' },
      { index: 2, title: 'Second' },
    ];
    const { container } = render(<AiCitationsView sources={sources} mode="list" />);
    const list = container.querySelector('[data-slot="ai-citations"][data-mode="list"]');
    expect(list).not.toBeNull();
    const items = container.querySelectorAll('[data-slot="ai-citation-item"]');
    expect(items.length).toBe(2);
    expect(items[0].getAttribute('data-citation-index')).toBe('1');
    expect(list?.textContent).toContain('First');
    expect(list?.textContent).toContain('Second');
  });
});

describe('ai-citations — source resolution priority', () => {
  it('explicit sources prop wins over metadata.sources', () => {
    const message: ChatMessage = {
      id: 'm',
      role: 'assistant',
      content: '[1]',
      metadata: { sources: [{ index: 1, title: 'From metadata' }] },
    };
    const resolved = resolveSources(message, [{ index: 1, title: 'From prop' }]);
    expect(resolved[0].title).toBe('From prop');
  });

  it('falls back to message.metadata.sources when no explicit prop', () => {
    const message: ChatMessage = {
      id: 'm',
      role: 'assistant',
      content: '[1]',
      metadata: { sources: [{ index: 1, title: 'Meta source' }] },
    };
    const resolved = resolveSources(message);
    expect(resolved[0].title).toBe('Meta source');
  });

  it('falls back to a data-sources ChatMessageDataPart', () => {
    const message: ChatMessage = {
      id: 'm',
      role: 'assistant',
      content: [
        { type: 'text', text: '[1]' },
        { type: 'data-sources', data: [{ index: 1, title: 'Part source' }] },
      ],
    };
    const resolved = resolveSources(message);
    expect(resolved[0].title).toBe('Part source');
  });

  it('returns empty list when no sources are present anywhere', () => {
    const message: ChatMessage = { id: 'm', role: 'assistant', content: '[1]' };
    expect(resolveSources(message)).toEqual([]);
  });

  it('extractMessageText joins text parts from array content', () => {
    const message: ChatMessage = {
      id: 'm',
      role: 'assistant',
      content: [
        { type: 'text', text: 'a' },
        { type: 'text', text: 'b' },
        { type: 'data-sources', data: [] },
      ],
    };
    expect(extractMessageText(message)).toBe('ab');
  });
});

describe('ai-citations — onSourceClick', () => {
  it('invokes onSourceClick with the source when the open-source action is clicked', () => {
    const onSourceClick = vi.fn();
    const message: ChatMessage = { id: 'm', role: 'assistant', content: '[1]' };
    // Source without a url → renders the "Open source" button (no navigation).
    const sources = [{ index: 1, title: 'T' }];
    const { container } = render(
      <AiCitationsView message={message} sources={sources} onSourceClick={onSourceClick} />,
    );
    // Open the popover, then click the open-source button inside the card.
    const trigger = container.querySelector('[data-citation-index="1"]') as HTMLElement;
    act(() => {
      fireEvent.click(trigger);
    });
    const openBtn = document.querySelector('[data-slot="ai-citation-open"]') as HTMLElement;
    expect(openBtn).not.toBeNull();
    act(() => {
      fireEvent.click(openBtn);
    });
    expect(onSourceClick).toHaveBeenCalledWith(
      expect.objectContaining({ index: 1, title: 'T' }),
      1,
    );
  });
});
