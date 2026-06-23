import type { RendererComponentProps, RendererRenderOutput } from '@nop-chaos/flux-core';
import { t } from '@nop-chaos/flux-i18n';
import {
  hasRendererSlotContent,
  resolveRendererSlotContent,
  useStatusPathPublication,
} from '@nop-chaos/flux-react';
import { cn } from '@nop-chaos/ui';
import type { ServiceSchema } from './schemas.js';

type ServiceStatus = 'idle' | 'ready' | 'error';

function toServiceItems(value: unknown): { items: unknown[]; error: unknown; raw: unknown } {
  if (value instanceof Error) {
    return { items: [], error: value, raw: value };
  }
  if (value && typeof value === 'object' && 'error' in value) {
    const maybeError = (value as { error?: unknown }).error;
    if (maybeError instanceof Error || maybeError) {
      return { items: [], error: maybeError, raw: value };
    }
  }
  if (Array.isArray(value)) {
    return { items: value, error: null, raw: value };
  }
  if (value === null || value === undefined) {
    return { items: [], error: null, raw: value };
  }
  // Single object: treat as one-item collection so body can render it.
  return { items: [value], error: null, raw: value };
}

function asReactNode(value: RendererRenderOutput): React.ReactNode {
  return value as React.ReactNode;
}

export function ServiceRenderer(props: RendererComponentProps<ServiceSchema>) {
  const schemaProps = props.props;
  const itemsValue = schemaProps.items;
  const { items, error } = toServiceItems(itemsValue);
  const statusPath =
    typeof schemaProps.statusPath === 'string' ? schemaProps.statusPath : undefined;

  const status: ServiceStatus = error ? 'error' : items.length > 0 ? 'ready' : 'idle';
  const summary = {
    kind: 'service' as const,
    status,
    itemCount: items.length,
  };

  useStatusPathPublication(props.node.scope.parent ?? props.node.scope, statusPath, summary);

  const bodyContent = resolveRendererSlotContent(props, 'body');
  const hasBody = hasRendererSlotContent(bodyContent);
  const emptyContent = resolveRendererSlotContent(props, 'empty', {
    fallback: t('flux.common.noData'),
  });
  const loadingContent = resolveRendererSlotContent(props, 'loading');
  const hasLoading = hasRendererSlotContent(loadingContent);
  const errorContent = resolveRendererSlotContent(props, 'error');

  // Loading region only renders when author explicitly set a loading slot AND items is empty/null.
  // (per design §7: service status is derived from items resolution, NOT a request mirror)
  const showLoading = items.length === 0 && !error && hasLoading;

  return (
    <div
      className={cn('nop-service', props.meta.className)}
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
      data-slot="service-root"
      data-status={status}
      data-item-count={items.length}
    >
      {showLoading ? (
        <div data-slot="service-loading">{asReactNode(loadingContent as RendererRenderOutput)}</div>
      ) : null}
      {error ? (
        <div data-slot="service-error">
          {hasRendererSlotContent(errorContent) ? (
            asReactNode(errorContent as RendererRenderOutput)
          ) : (
            <span>{String((error as Error)?.message ?? error)}</span>
          )}
        </div>
      ) : null}
      {!showLoading && !error && items.length === 0 ? (
        <div data-slot="service-empty">
          {hasRendererSlotContent(emptyContent)
            ? asReactNode(emptyContent as RendererRenderOutput)
            : null}
        </div>
      ) : null}
      {!showLoading && !error && items.length > 0 && hasBody ? (
        <div data-slot="service-body">{asReactNode(bodyContent as RendererRenderOutput)}</div>
      ) : null}
    </div>
  );
}
