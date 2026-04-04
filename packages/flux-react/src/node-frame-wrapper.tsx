import type { ReactNode } from 'react';
import type { CompiledSchemaNode, RenderRegionHandle, ResolvedNodeMeta } from '@nop-chaos/flux-core';
import { FieldFrame } from './field-frame';
import { getNodeSchemaFrameWrap, resolveFrameWrapMode } from './node-renderer-utils';

export function NodeFrameWrapper(props: {
  node: CompiledSchemaNode;
  resolvedMeta: ResolvedNodeMeta;
  resolvedPropsValue: Record<string, unknown>;
  regions: Readonly<Record<string, RenderRegionHandle>>;
  children: ReactNode;
}) {
  const frameWrapMode = resolveFrameWrapMode(
    props.node.component.wrap,
    getNodeSchemaFrameWrap(props.node)
  );

  if (frameWrapMode === 'none') {
    return <>{props.children}</>;
  }

  const fieldName = typeof props.resolvedPropsValue.name === 'string'
    ? props.resolvedPropsValue.name
    : typeof props.node.schema.name === 'string'
      ? props.node.schema.name
      : undefined;
  const labelValue = props.resolvedMeta.label
    ?? (props.regions.label ? props.regions.label.render() : props.node.schema.label);

  return (
    <FieldFrame
      name={fieldName}
      label={labelValue}
      required={props.node.schema.required === true}
      layout={frameWrapMode === 'group' ? 'checkbox' : 'default'}
      className={props.resolvedMeta.className}
      testid={props.resolvedMeta.testid}
      cid={props.resolvedMeta.cid}
    >
      {props.children}
    </FieldFrame>
  );
}
