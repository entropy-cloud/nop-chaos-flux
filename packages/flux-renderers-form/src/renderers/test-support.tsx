import React from 'react';
import type { ApiRequestContext, RendererEnv } from '@nop-chaos/flux-core';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '../index';

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => undefined;
}

if (typeof PointerEvent === 'undefined') {
  class PointerEvent extends MouseEvent {
    constructor(type: string, props: MouseEventInit & { pointerId?: number; pressure?: number } = {}) {
      super(type, props);
    }
  }

  globalThis.PointerEvent = PointerEvent as any;
}

export const baseEnv: RendererEnv = {
  fetcher: async function <T>() {
    return { ok: true, status: 200, data: null as T };
  },
  notify: () => undefined,
};

export const formulaCompiler = createFormulaCompiler();

export function makeCapturingFetcher(submitValues: Record<string, unknown>[]) {
  return async function <T>(_api: unknown, ctx: ApiRequestContext): Promise<{ ok: true; status: number; data: T }> {
    submitValues.push(ctx.scope.readOwn() as Record<string, unknown>);
    return { ok: true, status: 200, data: null as unknown as T };
  };
}

export const buttonRenderer = {
  type: 'button',
  component: (props: any) => (
    <button type="button" onClick={() => void props.events.onClick?.()}>
      {String(props.props.label ?? props.meta.label ?? 'Button')}
    </button>
  ),
  fields: [{ key: 'onClick', kind: 'event' as const }],
};

export function createFormSchemaRenderer() {
  return createSchemaRenderer([...basicRendererDefinitions, ...formRendererDefinitions]);
}

export function createFormSchemaRendererWithButton() {
  return createSchemaRenderer([...formRendererDefinitions, buttonRenderer]);
}

export function createPageSchemaRenderer() {
  return createSchemaRenderer([...basicRendererDefinitions, ...formRendererDefinitions]);
}
