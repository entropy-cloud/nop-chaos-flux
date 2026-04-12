import React, { useMemo } from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { useRenderInstancePath } from '@nop-chaos/flux-react';
import type { LoopSchema } from './schemas';
import { StructuralLoopContext } from './structural-loop-context';
import { createStructuralRepeatedTemplateId, renderStructuralLoop, resolveLoopBindings } from './structural-loop';

export function LoopRenderer(props: RendererComponentProps<LoopSchema>) {
  const parentInstancePath = useRenderInstancePath();
  const items = props.props.items;
  const itemData = props.props.itemData as Record<string, unknown> | undefined;
  const schemaProps = props.props as LoopSchema;
  const itemName = schemaProps.itemName;
  const indexName = schemaProps.indexName;
  const keyName = schemaProps.keyName;
  const bindings = useMemo(
    () => resolveLoopBindings({ itemName, indexName, keyName }),
    [itemName, indexName, keyName]
  );
  const repeatedTemplateId = createStructuralRepeatedTemplateId(props.id);

  return (
    <>
      {renderStructuralLoop({
        items,
        hasBody: Boolean(props.regions.body?.templateNode),
        hasEmpty: Boolean(props.regions.empty?.templateNode),
        bindings,
        itemData,
        keyBy: props.props.keyBy,
        ownerId: props.id,
        parentInstancePath,
        repeatedTemplateId,
        renderEmpty: () => props.regions.empty?.render() ?? null,
        renderItem: ({ itemKey, slotBindings, instancePath, depth }) => (
          <StructuralLoopContext.Provider
            key={itemKey}
            value={{
              ownerId: props.id,
              path: props.path,
              bindings,
              itemData,
              keyBy: props.props.keyBy,
              instancePath,
              depth,
              schema: props.props as LoopSchema,
              renderBody: (childSlotBindings, childInstancePath) =>
                props.regions.body?.render({
                  bindings: childSlotBindings,
                  instancePath: childInstancePath
                }) ?? null
            }}
          >
            {props.regions.body?.render({
              bindings: slotBindings,
              instancePath
            }) ?? null}
          </StructuralLoopContext.Provider>
        )
      })}
    </>
  );
}
