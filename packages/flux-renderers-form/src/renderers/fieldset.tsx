import { useState, useCallback } from 'react';
import type { BaseSchema, RendererComponentProps, RendererDefinition } from '@nop-chaos/flux-core';
import { resolveRendererSlotContent, hasRendererSlotContent } from '@nop-chaos/flux-react';
import { resolveGap } from '@nop-chaos/flux-react';
import { cn } from '@nop-chaos/ui';

export interface FieldsetSchema extends BaseSchema {
  type: 'fieldset';
  title?: string;
  collapsible?: boolean;
  collapsed?: boolean;
  gap?: number | string;
  body?: BaseSchema[];
  bodyClassName?: string;
  titleClassName?: string;
}

function FieldsetRenderer(props: RendererComponentProps<FieldsetSchema>) {
  const slotProps = props.props as FieldsetSchema;
  const title = typeof slotProps.title === 'string' ? slotProps.title : undefined;
  const bodyContent = resolveRendererSlotContent(props, 'body');
  const collapsible = Boolean(slotProps.collapsible);
  const [collapsed, setCollapsed] = useState(Boolean(slotProps.collapsed) && collapsible);
  const fieldsetGap = resolveGap(slotProps.gap as number | string | undefined);

  const toggle = useCallback(() => {
    if (collapsible) {
      setCollapsed((prev) => !prev);
    }
  }, [collapsible]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (collapsible && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        setCollapsed((prev) => !prev);
      }
    },
    [collapsible],
  );

  const bodyStyle = collapsed ? { display: 'none', ...fieldsetGap.style } : fieldsetGap.style;

  return (
    <fieldset
      className={cn('nop-fieldset', props.meta.className)}
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
      data-collapsible={collapsible || undefined}
      data-collapsed={(collapsible && collapsed) || undefined}
    >
      {title ? (
        <legend
          data-slot="fieldset-title"
          className={cn(slotProps.titleClassName)}
          onClick={toggle}
          onKeyDown={collapsible ? handleKeyDown : undefined}
          tabIndex={collapsible ? 0 : undefined}
          role={collapsible ? 'button' : undefined}
          aria-expanded={collapsible ? !collapsed : undefined}
          aria-controls={collapsible ? `${props.meta.cid}-body` : undefined}
          style={collapsible ? { cursor: 'pointer' } : undefined}
        >
          {title}
        </legend>
      ) : null}
      <div
        id={collapsible ? `${props.meta.cid}-body` : undefined}
        data-slot="fieldset-body"
        className={cn(fieldsetGap.className, slotProps.bodyClassName)}
        style={bodyStyle}
      >
        {hasRendererSlotContent(bodyContent) ? bodyContent : null}
      </div>
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
  regions: ['body'],
  fields: [],
};
