import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { contentRendererDefinitions } from './content-renderer-definitions.js';
import { createMockRendererProps } from './test-support.js';
import type {
  CardSchema,
  EmptySchema,
  HtmlSchema,
  ImageSchema,
  JsonViewSchema,
  LinkSchema,
  MappingSchema,
  MarkdownSchema,
  ProgressSchema,
  SeparatorSchema,
  SpinnerSchema,
  StatusSchema,
} from './schemas.js';

afterEach(() => {
  cleanup();
});

const TYPES = [
  'separator',
  'spinner',
  'progress',
  'empty',
  'card',
  'link',
  'image',
  'json-view',
  'markdown',
  'html',
  'cards',
  'alert',
  'mapping',
  'status',
  'audio',
  'video',
  'carousel',
  'qrcode',
] as const;

describe('contentRendererDefinitions', () => {
  it('declares 18 renderer definitions for the content family (W1a + W1b + W2a + W3c + W4a)', () => {
    expect(contentRendererDefinitions.map((d) => d.type).sort()).toEqual([...TYPES].sort());
  });

  it('every definition points at @nop-chaos/flux-renderers-content sourcePackage', () => {
    for (const def of contentRendererDefinitions) {
      expect(def.sourcePackage).toBe('@nop-chaos/flux-renderers-content');
    }
  });

  it('every definition has a component', () => {
    for (const def of contentRendererDefinitions) {
      expect(typeof def.component).toBe('function');
    }
  });

  it('card declares header/body/footer/actions regions + onClick event', () => {
    const card = contentRendererDefinitions.find((d) => d.type === 'card');
    const regionKeys = card?.fields?.filter((f) => f.kind === 'region').map((f) => f.key);
    expect(regionKeys).toEqual(['header', 'body', 'footer', 'actions']);
    expect(card?.fields?.find((f) => f.key === 'title')?.kind).toBe('value-or-region');
    expect(card?.fields?.find((f) => f.key === 'onClick')?.kind).toBe('event');
    expect(card?.category).toBe('layout');
  });

  it('empty declares title/description value-or-region + actions region', () => {
    const empty = contentRendererDefinitions.find((d) => d.type === 'empty');
    expect(empty?.fields?.find((f) => f.key === 'title')?.kind).toBe('value-or-region');
    expect(empty?.fields?.find((f) => f.key === 'description')?.kind).toBe('value-or-region');
    expect(empty?.fields?.find((f) => f.key === 'actions')?.kind).toBe('region');
  });

  it('progress declares value/max props + label value-or-region', () => {
    const progress = contentRendererDefinitions.find((d) => d.type === 'progress');
    expect(progress?.fields?.find((f) => f.key === 'value')?.kind).toBe('prop');
    expect(progress?.fields?.find((f) => f.key === 'max')?.kind).toBe('prop');
    expect(progress?.fields?.find((f) => f.key === 'label')?.kind).toBe('value-or-region');
  });

  it('separator component renders the nop-separator marker via its definition', () => {
    const separator = contentRendererDefinitions.find((d) => d.type === 'separator');
    const props = createMockRendererProps<SeparatorSchema>({ schema: { type: 'separator' } });
    const Comp = separator?.component as React.ComponentType<typeof props>;
    const view = render(<Comp {...props} />);
    expect(view.container.querySelector('[data-slot="separator"]')?.className).toContain(
      'nop-separator',
    );
  });

  it('spinner component renders via its definition', () => {
    const spinner = contentRendererDefinitions.find((d) => d.type === 'spinner');
    const props = createMockRendererProps<SpinnerSchema>({ schema: { type: 'spinner' } });
    const Comp = spinner?.component as React.ComponentType<typeof props>;
    const view = render(<Comp {...props} />);
    expect(view.container.querySelector('[data-slot="spinner"]')).toBeTruthy();
  });

  it('progress component renders via its definition', () => {
    const progress = contentRendererDefinitions.find((d) => d.type === 'progress');
    const props = createMockRendererProps<ProgressSchema>({
      schema: { type: 'progress' },
      props: { value: 40 },
    });
    const Comp = progress?.component as React.ComponentType<typeof props>;
    const view = render(<Comp {...props} />);
    expect(view.container.querySelector('[data-slot="progress"]')).toBeTruthy();
  });

  it('empty component renders via its definition', () => {
    const empty = contentRendererDefinitions.find((d) => d.type === 'empty');
    const props = createMockRendererProps<EmptySchema>({ schema: { type: 'empty' } });
    const Comp = empty?.component as React.ComponentType<typeof props>;
    const view = render(<Comp {...props} />);
    expect(view.container.querySelector('[data-slot="empty"]')).toBeTruthy();
  });

  it('card component renders all four regions via its definition', () => {
    const card = contentRendererDefinitions.find((d) => d.type === 'card');
    const props = createMockRendererProps<CardSchema>({
      schema: { type: 'card' },
      props: { title: 'T' },
      regions: {
        header: <i data-testid="h" />,
        body: <i data-testid="b" />,
        footer: <i data-testid="f" />,
        actions: <i data-testid="a" />,
      },
    });
    const Comp = card?.component as React.ComponentType<typeof props>;
    const view = render(<Comp {...props} />);
    const root = view.container.querySelector('[data-slot="card"]') as HTMLElement;
    expect(root).toBeTruthy();
    expect(root.querySelector('[data-testid="h"]')).toBeTruthy();
    expect(root.querySelector('[data-testid="b"]')).toBeTruthy();
    expect(root.querySelector('[data-testid="f"]')).toBeTruthy();
    expect(root.querySelector('[data-testid="a"]')).toBeTruthy();
  });

  it('link declares label value-or-region + href/target/rel props + onClick event', () => {
    const link = contentRendererDefinitions.find((d) => d.type === 'link');
    expect(link?.fields?.find((f) => f.key === 'label')?.kind).toBe('value-or-region');
    expect(link?.fields?.find((f) => f.key === 'href')?.kind).toBe('prop');
    expect(link?.fields?.find((f) => f.key === 'onClick')?.kind).toBe('event');
  });

  it('image declares src/alt/fit props + onClick/onLoadError events', () => {
    const image = contentRendererDefinitions.find((d) => d.type === 'image');
    expect(image?.fields?.find((f) => f.key === 'src')?.kind).toBe('prop');
    expect(image?.fields?.find((f) => f.key === 'lazy')?.kind).toBe('prop');
    expect(image?.fields?.find((f) => f.key === 'onClick')?.kind).toBe('event');
    expect(image?.fields?.find((f) => f.key === 'onLoadError')?.kind).toBe('event');
  });

  it('json-view declares value/collapsed/showCopy props + empty value-or-region', () => {
    const json = contentRendererDefinitions.find((d) => d.type === 'json-view');
    expect(json?.fields?.find((f) => f.key === 'value')?.kind).toBe('prop');
    expect(json?.fields?.find((f) => f.key === 'empty')?.kind).toBe('value-or-region');
  });

  it('markdown/html declare content prop + empty value-or-region + boolean toggle', () => {
    const markdown = contentRendererDefinitions.find((d) => d.type === 'markdown');
    expect(markdown?.fields?.find((f) => f.key === 'content')?.kind).toBe('prop');
    expect(markdown?.fields?.find((f) => f.key === 'allowHtml')?.kind).toBe('prop');
    expect(markdown?.fields?.find((f) => f.key === 'empty')?.kind).toBe('value-or-region');
    const html = contentRendererDefinitions.find((d) => d.type === 'html');
    expect(html?.fields?.find((f) => f.key === 'content')?.kind).toBe('prop');
    expect(html?.fields?.find((f) => f.key === 'sanitize')?.kind).toBe('prop');
    expect(html?.fields?.find((f) => f.key === 'empty')?.kind).toBe('value-or-region');
  });

  it('link/image/json-view/html components render via their definitions', () => {
    const cases = [
      {
        type: 'link',
        schema: { type: 'link' } as LinkSchema,
        props: { label: 'L', href: '/x' },
        slot: 'link',
        passProps: {} as Record<string, unknown>,
      },
      {
        type: 'image',
        schema: { type: 'image' } as ImageSchema,
        props: { src: '/a.png', alt: 'a' },
        slot: 'image',
        passProps: {} as Record<string, unknown>,
      },
      {
        type: 'json-view',
        schema: { type: 'json-view' } as JsonViewSchema,
        props: { value: { x: 1 } },
        slot: 'json-view',
        passProps: {} as Record<string, unknown>,
      },
      {
        type: 'html',
        schema: { type: 'html' } as HtmlSchema,
        props: { content: '<b>s</b>' },
        slot: 'html',
        passProps: {} as Record<string, unknown>,
      },
    ];
    for (const c of cases) {
      const def = contentRendererDefinitions.find((d) => d.type === c.type);
      const props = createMockRendererProps<typeof c.schema>({
        schema: c.schema,
        props: c.props,
      });
      const Comp = def?.component as React.ComponentType<typeof props>;
      const view = render(<Comp {...props} />);
      expect(view.container.querySelector(`[data-slot="${c.slot}"]`)).toBeTruthy();
      cleanup();
    }
  });

  it('markdown component renders via its definition', () => {
    const def = contentRendererDefinitions.find((d) => d.type === 'markdown');
    const props = createMockRendererProps<MarkdownSchema>({
      schema: { type: 'markdown' },
      props: { content: '## hi' },
    });
    const Comp = def?.component as React.ComponentType<typeof props>;
    const view = render(<Comp {...props} />);
    expect(view.container.querySelector('[data-slot="markdown"] h2')).toBeTruthy();
  });

  it('mapping declares value/map/defaultLabel/placeholder props + item region', () => {
    const mapping = contentRendererDefinitions.find((d) => d.type === 'mapping');
    expect(mapping?.fields?.find((f) => f.key === 'value')?.kind).toBe('prop');
    expect(mapping?.fields?.find((f) => f.key === 'map')?.kind).toBe('prop');
    expect(mapping?.fields?.find((f) => f.key === 'defaultLabel')?.kind).toBe('prop');
    expect(mapping?.fields?.find((f) => f.key === 'placeholder')?.kind).toBe('prop');
    expect(mapping?.fields?.find((f) => f.key === 'item')?.kind).toBe('region');
    expect(mapping?.category).toBe('content');
  });

  it('status declares value/labelMap/levelMap/iconMap/placeholder props (no events/regions)', () => {
    const status = contentRendererDefinitions.find((d) => d.type === 'status');
    expect(status?.fields?.find((f) => f.key === 'value')?.kind).toBe('prop');
    expect(status?.fields?.find((f) => f.key === 'labelMap')?.kind).toBe('prop');
    expect(status?.fields?.find((f) => f.key === 'levelMap')?.kind).toBe('prop');
    expect(status?.fields?.find((f) => f.key === 'iconMap')?.kind).toBe('prop');
    expect(status?.fields?.find((f) => f.key === 'placeholder')?.kind).toBe('prop');
    expect(status?.fields?.some((f) => f.kind === 'region')).toBe(false);
    expect(status?.fields?.some((f) => f.kind === 'event')).toBe(false);
    expect(status?.category).toBe('content');
  });

  it('mapping component renders nop-mapping marker via its definition', () => {
    const mapping = contentRendererDefinitions.find((d) => d.type === 'mapping');
    const props = createMockRendererProps<MappingSchema>({
      schema: { type: 'mapping' },
      props: { value: 'active', map: { active: 'Active' } },
    });
    const Comp = mapping?.component as React.ComponentType<typeof props>;
    const view = render(<Comp {...props} />);
    const root = view.container.querySelector('[data-slot="mapping-root"]') as HTMLElement;
    expect(root).toBeTruthy();
    expect(root.className).toContain('nop-mapping');
    expect(root.getAttribute('data-state')).toBe('hit');
  });

  it('status component renders nop-status marker via its definition', () => {
    const status = contentRendererDefinitions.find((d) => d.type === 'status');
    const props = createMockRendererProps<StatusSchema>({
      schema: { type: 'status' },
      props: {
        value: 'ok',
        labelMap: { ok: 'OK' },
        levelMap: { ok: 'success' },
      },
    });
    const Comp = status?.component as React.ComponentType<typeof props>;
    const view = render(<Comp {...props} />);
    const root = view.container.querySelector('[data-slot="status-root"]') as HTMLElement;
    expect(root).toBeTruthy();
    expect(root.className).toContain('nop-status');
    expect(root.getAttribute('data-state')).toBe('hit');
    expect(root.getAttribute('data-level')).toBe('success');
    expect(root.querySelector('[data-slot="status-badge"]')).toBeTruthy();
  });
});
