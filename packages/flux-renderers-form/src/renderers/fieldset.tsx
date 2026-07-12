import { useState } from 'react';
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
  const fieldsetGap = resolveGap(slotProps.gap as number | string | undefined);
  const resolvedColumnCount =
    slotProps.columnCount !== undefined && Number.isFinite(slotProps.columnCount)
      ? Math.max(1, Math.floor(slotProps.columnCount))
      : undefined;
  const showGrid = resolvedColumnCount !== undefined && resolvedColumnCount > 1;

  const bodyStyle = collapsed
    ? { display: 'none', ...fieldsetGap.style }
    : showGrid
      ? { display: 'grid', gridTemplateColumns: `repeat(${resolvedColumnCount}, minmax(0, 1fr))`, ...fieldsetGap.style }
      : fieldsetGap.style;

  return (
    <fieldset
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
            className={cn(fieldsetGap.className, slotProps.bodyClassName)}
            style={bodyStyle}
          >
            {hasRendererSlotContent(bodyContent) ? bodyContent : null}
          </CollapsibleContent>
        ) : (
          <div
            data-slot="fieldset-body"
            className={cn(fieldsetGap.className, slotProps.bodyClassName)}
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
  fields: [
    { key: 'collapsible', kind: 'prop', valueType: 'boolean' },
    { key: 'collapsed', kind: 'prop', valueType: 'boolean' },
    { key: 'columnCount', kind: 'prop' },
    { key: 'body', kind: 'region', regionKey: 'body' },
  ],
};
