import type {
  FluxActionEvent,
  RendererComponentProps,
  RendererRenderOutput,
  ScopeRef,
} from '@nop-chaos/flux-core';
import { Button, cn } from '@nop-chaos/ui';
import type { AiPromptItem, AiPromptsSchema } from '../schemas.js';

/**
 * C8.3 P1-1 (CX-10 / bug-83 family convention): the second dispatch arg
 * carries `{ event, evaluationBindings, scope }` so action-args templates can
 * read `${item}` / `${index}` (ai-feedback.tsx:22-28 precedent).
 */
function dispatchCtx(payload: Record<string, unknown>, nodeScope: ScopeRef | undefined) {
  return {
    event: payload as FluxActionEvent,
    evaluationBindings: payload,
    scope: nodeScope,
  };
}

/**
 * ai-prompts (Widget, P1): recommended prompt cards. Marker `nop-ai-prompts`.
 * Supports vertical / horizontal / wrap layouts. Click fires `onSelect`
 * (design.md §5.1).
 */
export function AiPromptsRenderer(props: RendererComponentProps<AiPromptsSchema>): RendererRenderOutput {
  const resolved = props.props;
  const items = normalizeItems(resolved.items);
  const layout = resolved.layout ?? 'vertical';
  const size = resolved.size ?? 'md';

  const layoutClass =
    layout === 'horizontal'
      ? 'flex flex-row gap-2 overflow-x-auto'
      : layout === 'wrap'
        ? 'flex flex-row flex-wrap gap-2'
        : 'flex flex-col gap-2';

  const sizeClass =
    size === 'sm' ? 'text-xs px-2 py-1' : size === 'lg' ? 'text-base px-4 py-3' : 'text-sm px-3 py-2';

  if (items.length === 0) {
    return (
      <div
        className={cn('nop-ai-prompts', layoutClass, props.meta.className)}
        data-slot="ai-prompts"
        data-layout={layout}
        data-empty=""
        data-cid={props.meta.cid || undefined}
        data-testid={props.meta.testid || undefined}
      />
    );
  }

  return (
    <div
      className={cn('nop-ai-prompts', layoutClass, props.meta.className)}
      data-slot="ai-prompts"
      data-layout={layout}
      data-cid={props.meta.cid || undefined}
      data-testid={props.meta.testid || undefined}
    >
      {items.map((item, index) => {
        // P2 (N-6 family): derive the key from content only so reordering
        // the same item keeps its React identity (no remount). Falls back to
        // a synthetic placeholder when label is missing. Duplicate-content
        // items are rare for static recommendation lists (audit note).
        const stableKey = `${item.label ?? 'item'}${item.badge ? `#${item.badge}` : ''}`;
        return (
        <Button
          key={stableKey}
          variant="outline"
          data-slot="ai-prompts-item"
          data-index={index}
          className={cn(
            'rounded-md bg-card text-card-foreground text-left',
            sizeClass,
          )}
          onClick={() => {
            const payload = { type: 'ai:prompt-select', item, index };
            void props.events.onSelect?.(payload, dispatchCtx(payload, props.node.scope as ScopeRef | undefined));
          }}
        >
          <div className="flex items-center gap-2">
            {typeof item.icon === 'string' && item.icon.length > 0 ? (
              <span aria-hidden="true">{item.icon}</span>
            ) : null}
            <span data-slot="ai-prompts-item-label" className="font-medium">
              {item.label}
            </span>
            {typeof item.badge === 'string' && item.badge.length > 0 ? (
              <span data-slot="ai-prompts-item-badge" className="ml-auto text-xs text-muted-foreground">
                {item.badge}
              </span>
            ) : null}
          </div>
          {typeof item.description === 'string' && item.description.length > 0 ? (
            <p data-slot="ai-prompts-item-description" className="mt-1 text-xs text-muted-foreground">
              {item.description}
            </p>
          ) : null}
        </Button>
        );
      })}
    </div>
  );
}

function normalizeItems(items: unknown): AiPromptItem[] {
  if (!Array.isArray(items)) return [];
  return items
    .filter((x): x is AiPromptItem => typeof x === 'object' && x !== null && 'label' in x)
    .map((x) => ({ ...x }));
}
