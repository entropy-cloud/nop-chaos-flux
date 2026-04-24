import type { ReactNode } from 'react';
import type { FieldRemarkSchema, RenderRegionHandle, ResolvedNodeMeta, TemplateNode } from '@nop-chaos/flux-core';
import { FieldFrame } from './field-frame';
import type { FieldRemarkProps } from './field-frame';
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

  const schema = props.templateNode.schema as Record<string, unknown>;
  const fieldName = typeof props.resolvedPropsValue.name === 'string'
    ? props.resolvedPropsValue.name : undefined;
  const labelValue = typeof props.resolvedPropsValue.label !== 'undefined'
    ? props.resolvedPropsValue.label as ReactNode
    : props.regions.label?.render();
  const requiredValue = typeof props.resolvedPropsValue.required === 'boolean'
    ? props.resolvedPropsValue.required : undefined;
  const hintValue = typeof schema.hint === 'string' ? schema.hint : undefined;
  const descriptionValue = typeof schema.description === 'string' ? schema.description : undefined;

  const remarkValue = typeof schema.remark === 'object' && schema.remark !== null
    ? toFieldRemarkProps(schema.remark as FieldRemarkSchema) : undefined;
  const labelRemarkValue = typeof schema.labelRemark === 'object' && schema.labelRemark !== null
    ? toFieldRemarkProps(schema.labelRemark as FieldRemarkSchema) : undefined;

  const labelAlignValue = schema.labelAlign as 'top' | 'left' | 'right' | 'inherit' | undefined;
  const labelWidthValue = schema.labelWidth as string | number | undefined;

  return (
    <FieldFrame
      name={fieldName} label={labelValue} required={requiredValue}
      hint={hintValue} description={descriptionValue}
      remark={remarkValue} labelRemark={labelRemarkValue}
      labelAlign={labelAlignValue === 'inherit' ? undefined : labelAlignValue}
      labelWidth={labelWidthValue}
      layout={frameWrapMode === 'group' ? 'checkbox' : 'default'}
      className={props.resolvedMeta.className} testid={props.resolvedMeta.testid}
      cid={props.resolvedMeta.cid}
    >
      {props.children}
    </FieldFrame>
  );
}

function toFieldRemarkProps(schema: FieldRemarkSchema): FieldRemarkProps {
  return {
    icon: schema.icon,
    content: schema.content,
    placement: schema.placement,
    trigger: schema.trigger
  };
}
