import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type {
  BaseSchema,
  ExecutableApiRequest,
  RendererComponentProps,
} from '@nop-chaos/flux-core';
import type { RendererDefinition } from '../react-contracts';
import { createDefaultEnv, createDefaultRegistry } from '../defaults';
import { createAutoRendererComponent, ensureRendererComponent } from '../auto-renderer';

describe('defaults and auto renderer', () => {
  it('creates default env and allows input overrides', async () => {
    const notify = vi.fn();
    const env = createDefaultEnv({ notify });

    expect(
      await env.fetcher<{ ok: true }>({ url: '/api/demo' } as ExecutableApiRequest, {} as any),
    ).toEqual({
      ok: true,
      status: 200,
      data: null,
    });
    expect(
      await env.fetcher<{ ok: true }>(
        { url: 'https://example.com' } as ExecutableApiRequest,
        {} as any,
      ),
    ).toEqual({ ok: true, status: 200, data: null });

    env.notify?.('info', 'message');
    expect(notify).toHaveBeenCalledWith('info', 'message');
  });

  it('wraps react components into renderer components when needed', () => {
    function PlainComponent(props: Record<string, unknown>) {
      return (
        <button
          type="button"
          data-testid={String(props['data-testid'])}
          data-cid={String(props['data-cid'])}
          className={String(props.className)}
          disabled={Boolean(props.disabled)}
          onClick={() => (props.onClick as (() => void) | undefined)?.()}
        >
          {String(props.label ?? '')}
        </button>
      );
    }

    const Auto = createAutoRendererComponent(PlainComponent);
    const click = vi.fn();
    render(
      <Auto
        id="node-1"
        path="$.body[0]"
        props={{ label: 'Run' }}
        schema={{ type: 'button' } as BaseSchema}
        meta={{ disabled: false, className: 'x', testid: 'auto-btn', cid: 'cid-1' } as any}
        events={{ onClick: click as RendererComponentProps['events'][string] }}
        helpers={{} as any}
        regions={{}}
        templateNode={{} as any}
        node={{} as any}
      />,
    );

    const btn = screen.getByTestId('auto-btn');
    expect(btn.getAttribute('data-cid')).toBe('cid-1');
    expect(btn.className).toContain('x');
    expect((btn as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(btn);
    expect(click).toHaveBeenCalled();
  });

  it('keeps existing components and auto-wraps reactComponent definitions', () => {
    const component = () => null;
    const withComponent = ensureRendererComponent({ type: 'a', component } as RendererDefinition);
    expect(withComponent.component).toBe(component);

    const wrapped = ensureRendererComponent({
      type: 'b',
      reactComponent: () => null,
    } as RendererDefinition);
    expect(typeof wrapped.component).toBe('function');

    const registry = createDefaultRegistry([
      { type: 'x', reactComponent: () => null } as RendererDefinition,
      { type: 'y', component } as RendererDefinition,
    ]);
    expect(registry.get('x')?.component).toBeTruthy();
    expect(registry.get('y')?.component).toBe(component);
  });

  it('skips undefined event handlers and omits empty ids', () => {
    const seen = vi.fn();

    function PlainComponent(props: Record<string, unknown>) {
      seen(props);
      return null;
    }

    const Auto = createAutoRendererComponent(PlainComponent);

    render(
      <Auto
        id="node-2"
        path="$.body[1]"
        props={{ label: 'Idle' }}
        schema={{ type: 'button' } as BaseSchema}
        meta={{ disabled: false, className: undefined, testid: '', cid: '' } as any}
        events={{ onClick: undefined }}
        helpers={{} as any}
        regions={{}}
        templateNode={{} as any}
        node={{} as any}
      />,
    );

    const props = seen.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(props.onClick).toBeUndefined();
    expect(props['data-testid']).toBeUndefined();
    expect(props['data-cid']).toBeUndefined();
  });
});
