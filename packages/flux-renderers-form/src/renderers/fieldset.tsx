import { useState, useCallback } from 'react';
import type { BaseSchema, RendererComponentProps, RendererDefinition } from '@nop-chaos/flux-core';
import { resolveRendererSlotContent, hasRendererSlotContent } from '@nop-chaos/flux-react';
import { resolveGap } from '@nop-chaos/flux-renderers-basic';
import { cn } from '@nop-chaos/ui';

export interface FieldsetSchema extends BaseSchema {
  type: 'fieldset';
  title?: string;
  collapsible?: boolean;
  collapsed?: boolean;
  gap?: number | string;
  body?: BaseSchema[];
}

function FieldsetRenderer(props: RendererComponentProps<FieldsetSchema>) {
  const title = typeof props.props.title === 'string' ? props.props.title : undefined;
  const bodyContent = resolveRendererSlotContent(props, 'body');
  const collapsible = Boolean(props.props.collapsible);
  const [collapsed, setCollapsed] = useState(Boolean(props.props.collapsed) && collapsible);
  const fieldsetGap = resolveGap(props.props.gap as number | string | undefined);

  const toggle = useCallback(() => {
    if (collapsible) {
      setCollapsed((prev) => !prev);
    }
  }, [collapsible]);

  const bodyStyle = collapsed
    ? { display: 'none', ...fieldsetGap.style }
    : fieldsetGap.style;

  return (
    <fieldset
      className={cn('nop-fieldset', props.meta.className)}
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
      data-collapsible={collapsible || undefined}
      data-collapsed={collapsible && collapsed || undefined}
    >
      {title ? (
        <legend data-slot="fieldset-title" onClick={toggle} style={collapsible ? { cursor: 'pointer' } : undefined}>
          {title}
        </legend>
      ) : null}
      <div data-slot="fieldset-body" className={cn(fieldsetGap.className)} style={bodyStyle}>
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
  fields: []
};
