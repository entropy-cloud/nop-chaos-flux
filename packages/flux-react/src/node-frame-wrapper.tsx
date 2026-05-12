import type { ReactNode } from 'react';
import type { ResolvedNodeMeta, TemplateNode } from '@nop-chaos/flux-core';
import type { RenderRegionHandle } from './react-contracts.js';
import { FieldFrame, toFieldRemarkProps } from './field-frame.js';
import type { FieldRemarkSchemaLike } from './field-frame.js';
import { resolveFrameWrapMode } from './node-renderer-utils.js';

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
    (props.templateNode.schema as { frameWrap?: boolean | 'label' | 'group' | 'none' }).frameWrap,
  );

  if (frameWrapMode === 'none') {
    return <>{props.children}</>;
  }

  const schema = props.templateNode.schema as Record<string, unknown>;
  const fieldName =
    typeof props.resolvedPropsValue.name === 'string' ? props.resolvedPropsValue.name : undefined;
  const labelValue =
    typeof props.resolvedPropsValue.label !== 'undefined'
      ? (props.resolvedPropsValue.label as ReactNode)
      : (props.regions.label?.render() as ReactNode);
  const requiredValue =
    typeof props.resolvedPropsValue.required === 'boolean'
      ? props.resolvedPropsValue.required
      : undefined;
  const hintValue =
    typeof props.resolvedPropsValue.hint === 'string'
      ? props.resolvedPropsValue.hint
      : typeof schema.hint === 'string'
        ? schema.hint
        : undefined;
  const descriptionValue =
    typeof props.resolvedPropsValue.description === 'string'
      ? props.resolvedPropsValue.description
      : typeof schema.description === 'string'
        ? schema.description
        : undefined;

  const remarkValue =
    typeof props.resolvedPropsValue.remark === 'object' && props.resolvedPropsValue.remark !== null
      ? toFieldRemarkProps(props.resolvedPropsValue.remark as FieldRemarkSchemaLike)
      : typeof schema.remark === 'object' && schema.remark !== null
        ? toFieldRemarkProps(schema.remark as FieldRemarkSchemaLike)
      : undefined;
  const labelRemarkValue =
    typeof props.resolvedPropsValue.labelRemark === 'object' &&
    props.resolvedPropsValue.labelRemark !== null
      ? toFieldRemarkProps(props.resolvedPropsValue.labelRemark as FieldRemarkSchemaLike)
      : typeof schema.labelRemark === 'object' && schema.labelRemark !== null
        ? toFieldRemarkProps(schema.labelRemark as FieldRemarkSchemaLike)
      : undefined;

  const labelAlignValue =
    (props.resolvedPropsValue.labelAlign as 'top' | 'left' | 'right' | 'inherit' | undefined) ??
    (schema.labelAlign as 'top' | 'left' | 'right' | 'inherit' | undefined);
  const labelWidthValue =
    (props.resolvedPropsValue.labelWidth as string | number | undefined) ??
    (schema.labelWidth as string | number | undefined);
  const usesInteractiveControlRoot =
    props.templateNode.type === 'array-editor' ||
    props.templateNode.type === 'array-field' ||
    props.templateNode.type === 'input-tree' ||
    props.templateNode.type === 'tree-select' ||
    props.templateNode.type === 'condition-builder' ||
    props.templateNode.type === 'key-value' ||
    props.templateNode.type === 'detail-field';

  return (
    <FieldFrame
      name={fieldName}
      label={labelValue}
      required={requiredValue}
      hint={hintValue}
      description={descriptionValue}
      remark={remarkValue}
      labelRemark={labelRemarkValue}
      labelAlign={labelAlignValue === 'inherit' ? undefined : labelAlignValue}
      labelWidth={labelWidthValue}
      rootTag={usesInteractiveControlRoot ? 'div' : undefined}
      layout={frameWrapMode === 'group' ? 'checkbox' : 'default'}
      className={props.resolvedMeta.frameClassName}
      testid={props.resolvedMeta.testid}
      cid={props.resolvedMeta.cid}
    >
      {props.children}
    </FieldFrame>
  );
}
