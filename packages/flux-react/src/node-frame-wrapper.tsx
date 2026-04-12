import type { ReactNode } from 'react';
import type { RenderRegionHandle, ResolvedNodeMeta, TemplateNode } from '@nop-chaos/flux-core';
import { FieldFrame } from './field-frame';
import { resolveFrameWrapMode } from './node-renderer-utils';

export function NodeFrameWrapper(props: {
  templateNode: TemplateNode;
  definitionWrap: boolean | undefined;
  resolvedMeta: ResolvedNodeMeta;
  resolvedPropsValue: Record<string, unknown>;
  regions: Readonly<Record<string, RenderRegionHandle>>;
  children: ReactNode;
}) {
  const frameWrapMode = resolveFrameWrapMode(
    props.definitionWrap,
    (props.templateNode.schema as { frameWrap?: boolean | 'label' | 'group' | 'none' }).frameWrap
  );

  if (frameWrapMode === 'none') {
    return <>{props.children}</>;
  }

  const fieldName = typeof props.resolvedPropsValue.name === 'string'
    ? props.resolvedPropsValue.name
    : typeof props.templateNode.schema.name === 'string'
      ? props.templateNode.schema.name
      : undefined;
  const labelValue = typeof props.resolvedPropsValue.label !== 'undefined'
    ? props.resolvedPropsValue.label as import('react').ReactNode
    : (props.regions.label ? props.regions.label.instantiate() : props.templateNode.schema.label as import('react').ReactNode);

  return (
    <FieldFrame
      name={fieldName}
      label={labelValue}
      required={Boolean(props.resolvedPropsValue.required ?? props.templateNode.schema.required === true)}
      layout={frameWrapMode === 'group' ? 'checkbox' : 'default'}
      className={props.resolvedMeta.className}
      testid={props.resolvedMeta.testid}
      cid={props.resolvedMeta.cid}
    >
      {props.children}
    </FieldFrame>
  );
}
