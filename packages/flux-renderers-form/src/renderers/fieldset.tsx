import { useEffect, useRef, useState } from 'react';
import type { BaseSchema, RendererComponentProps, RendererDefinition } from '@nop-chaos/flux-core';
import { resolveRendererSlotContent, hasRendererSlotContent } from '@nop-chaos/flux-react';
import { resolveGap } from '@nop-chaos/flux-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger, cn } from '@nop-chaos/ui';
import { ChevronDownIcon, ChevronRightIcon } from 'lucide-react';

export interface FieldsetSchema extends BaseSchema {
  type: 'fieldset';
  title?: string;
  collapsible?: boolean;
  collapsed?: boolean;
  columnCount?: number;
  gap?: number | string;
  body?: BaseSchema[];
  bodyClassName?: string;
  titleClassName?: string;
}

function FieldsetRenderer(props: RendererComponentProps<FieldsetSchema>) {
  const slotProps = props.props as FieldsetSchema;
  const title = typeof slotProps.title === 'string' ? slotProps.title : undefined;
  const bodyContent = resolveRendererSlotContent(props, 'body');
  const collapsible = slotProps.collapsible === true;
  const [collapsed, setCollapsed] = useState(slotProps.collapsed === true && collapsible);
  const fieldsetRef = useRef<HTMLFieldSetElement | null>(null);
  const fieldsetGap = resolveGap(slotProps.gap as number | string | undefined);
  const resolvedColumnCount =
    slotProps.columnCount !== undefined && Number.isFinite(slotProps.columnCount)
      ? Math.max(1, Math.floor(slotProps.columnCount))
      : undefined;
  const showGrid = resolvedColumnCount !== undefined && resolvedColumnCount > 1;

  // P2-18 residual (plan 485 Phase 2): the collapsed body keeps validating, so
  // a submit-blocking error must reveal itself — auto-expand when any inner
  // field flips to aria-invalid instead of hiding it behind display:none.
  useEffect(() => {
    const host = fieldsetRef.current;
    if (!collapsible || !collapsed || !host || typeof MutationObserver === 'undefined') return;
    // [G2-R5-视角4-02] a field that is already aria-invalid at attach time
    // never mutates again — reveal it now instead of waiting for a mutation.
    // Deferred one microtask: a synchronous setCollapsed here triggers a
    // cascading render in the effect body (react-hooks/set-state-in-effect).
    if (host.querySelector('[aria-invalid="true"]')) {
      queueMicrotask(() => setCollapsed(false));
      return;
    }
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if ((mutation.target as Element | null)?.getAttribute?.('aria-invalid') === 'true') {
          // observer callbacks already run as microtasks — the microtask hop
          // just makes that explicit to the react-compiler set-state-in-effect rule
          queueMicrotask(() => setCollapsed(false));
          return;
        }
      }
    });
    observer.observe(host, { attributes: true, attributeFilter: ['aria-invalid'], subtree: true });
    return () => observer.disconnect();
  }, [collapsible, collapsed]);

  const bodyStyle = collapsed
    ? { display: 'none', ...fieldsetGap.style }
    : showGrid
      ? { display: 'grid', gridTemplateColumns: `repeat(${resolvedColumnCount}, minmax(0, 1fr))`, ...fieldsetGap.style }
      : fieldsetGap.style;

  return (
    <fieldset
      ref={fieldsetRef}
      className={cn('nop-fieldset', props.meta.className)}
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
      data-collapsible={collapsible || undefined}
      data-collapsed={(collapsible && collapsed) || undefined}
    >
      <Collapsible open={!collapsed} onOpenChange={(open) => setCollapsed(!open)}>
        {title ? (
          collapsible ? (
            <CollapsibleTrigger
              nativeButton={false}
              aria-controls={`${props.meta.cid}-body`}
              render={
                <legend
                  data-slot="fieldset-title"
                  className={cn(
                    'flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-ring rounded-sm outline-none',
                    slotProps.titleClassName,
                  )}
                  style={{ cursor: 'pointer' }}
                />
              }
            >
              {collapsed ? (
                <ChevronRightIcon
                  data-slot="fieldset-collapse-icon"
                  className="size-4 shrink-0 text-muted-foreground"
                />
              ) : (
                <ChevronDownIcon
                  data-slot="fieldset-collapse-icon"
                  className="size-4 shrink-0 text-muted-foreground"
                />
              )}
              {title}
            </CollapsibleTrigger>
          ) : (
            <legend data-slot="fieldset-title" className={slotProps.titleClassName}>
              {title}
            </legend>
          )
        ) : null}
        {collapsible ? (
          <CollapsibleContent
            keepMounted
            id={`${props.meta.cid}-body`}
            data-slot="fieldset-body"
            className={cn('nop-fieldset-body', fieldsetGap.className, slotProps.bodyClassName)}
            style={bodyStyle}
          >
            {hasRendererSlotContent(bodyContent) ? bodyContent : null}
          </CollapsibleContent>
        ) : (
          <div
            data-slot="fieldset-body"
            className={cn('nop-fieldset-body', fieldsetGap.className, slotProps.bodyClassName)}
            style={bodyStyle}
          >
            {hasRendererSlotContent(bodyContent) ? bodyContent : null}
          </div>
        )}
      </Collapsible>
    </fieldset>
  );
}

export { FieldsetRenderer };

export const fieldsetRendererDefinition: RendererDefinition = {
  type: 'fieldset',
  displayName: 'FieldSet',
  category: 'form',
  sourcePackage: '@nop-chaos/flux-renderers-form',
  defaultSchema: { type: 'fieldset', body: [] },
  component: FieldsetRenderer,
  // ux-r10 PD-5 裁定：补 propContracts（此前缺失 → page-designer inspector 落原始
  // JSON 直编兜底）。键集与下方 fields: 元数据 1:1（body 为 region 键，不入契约）。
  propContracts: {
    title: {
      shape: { kind: 'string' },
      displayName: 'Title',
      description: 'Fieldset legend text shown above the grouped fields.',
      editorType: 'text',
    },
    collapsible: {
      shape: { kind: 'boolean' },
      displayName: 'Collapsible',
      description: 'When true, the fieldset body can be collapsed via its header.',
      editorType: 'boolean',
    },
    collapsed: {
      shape: { kind: 'boolean' },
      displayName: 'Collapsed',
      description: 'Initial collapsed state when collapsible is true.',
      editorType: 'boolean',
    },
    columnCount: {
      shape: { kind: 'number' },
      displayName: 'Column Count',
      description:
        'Renders the fieldset body as a CSS grid with the given number of columns. Values < 1 are clamped to 1 (single column).',
      editorType: 'number',
    },
    gap: {
      shape: { kind: 'unknown' },
      displayName: 'Gap',
      description: 'Spacing between body fields (stack-*/hstack-* aliases or a raw length).',
      editorType: 'gap',
    },
    bodyClassName: {
      shape: { kind: 'string' },
      displayName: 'Body Class Name',
      description: 'Additional className applied to the fieldset body region.',
      editorType: 'text',
    },
    titleClassName: {
      shape: { kind: 'string' },
      displayName: 'Title Class Name',
      description: 'Additional className applied to the fieldset title.',
      editorType: 'text',
    },
  },
  fields: [
    { key: 'title', kind: 'prop' },
    { key: 'collapsible', kind: 'prop', valueType: 'boolean' },
    { key: 'collapsed', kind: 'prop', valueType: 'boolean' },
    { key: 'columnCount', kind: 'prop' },
    { key: 'gap', kind: 'prop' },
    { key: 'body', kind: 'region', regionKey: 'body' },
    { key: 'bodyClassName', kind: 'prop' },
    { key: 'titleClassName', kind: 'prop' },
  ],
};
