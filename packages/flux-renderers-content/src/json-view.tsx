import React from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { hasRendererSlotContent, resolveRendererSlotContent } from '@nop-chaos/flux-react';
import { Button, JsonViewer, cn } from '@nop-chaos/ui';
import type { JsonViewSchema } from './schemas.js';

function isEmptyValue(value: unknown): boolean {
  return value === null || value === undefined || value === '';
}

export function JsonViewRenderer(props: RendererComponentProps<JsonViewSchema>) {
  const slotProps = props.props;
  const value = slotProps.value;

  // Hooks must run unconditionally (Rules of Hooks) — declare copy state
  // before the empty-value early return below.
  const [copied, setCopied] = React.useState(false);

  if (isEmptyValue(value)) {
    const emptyContent = resolveRendererSlotContent(props, 'empty');
    const hasEmpty = hasRendererSlotContent(emptyContent);
    return (
      <div
        data-testid={props.meta.testid || undefined}
        data-cid={props.meta.cid || undefined}
        data-slot="json-view"
        data-state="empty"
        className={cn('nop-json-view', props.meta.className)}
      >
        {hasEmpty ? emptyContent : null}
      </div>
    );
  }

  const collapsed = slotProps.collapsed;
  const showCopy = slotProps.showCopy === true;

  const expandLevel =
    typeof collapsed === 'number' ? collapsed : undefined;
  const defaultExpand =
    typeof collapsed === 'number' ? undefined : collapsed !== true;

  async function handleCopy() {
    try {
      const text = JSON.stringify(value, null, 2);
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      }
    } catch {
      // clipboard unavailable — copy is best-effort
    }
  }

  const data = (
    Array.isArray(value)
      ? value
      : typeof value === 'object'
        ? (value as Record<string, unknown>)
        : { value }
  ) as Record<string, unknown> | unknown[];

  return (
    <div
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
      data-slot="json-view"
      className={cn('nop-json-view', props.meta.className)}
    >
      {showCopy ? (
        <div data-slot="json-view-toolbar" className="mb-2 flex justify-end">
          <Button type="button" variant="outline" size="xs" onClick={() => void handleCopy()}>
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
      ) : null}
      <JsonViewer data={data} defaultExpand={defaultExpand} expandLevel={expandLevel} />
    </div>
  );
}
