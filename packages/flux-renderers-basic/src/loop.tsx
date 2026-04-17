import React, { useMemo } from 'react';
import type { InstanceFrame, RendererComponentProps, StructuralLoopBindings, StructuralLoopRenderContext } from '@nop-chaos/flux-core';
import { StructuralLoopContext, useRenderInstancePath } from '@nop-chaos/flux-react';
import type { LoopSchema } from './schemas';
import { createStructuralRepeatedTemplateId, renderStructuralLoop, resolveLoopBindings } from './structural-loop';

interface LoopProviderProps {
  bindings: StructuralLoopBindings;
  itemData: Record<string, unknown> | undefined;
  keyBy: unknown;
  instancePath: readonly InstanceFrame[];
  depth: number;
  renderBody: (childSlotBindings: Record<string, unknown>, childInstancePath: readonly InstanceFrame[]) => React.ReactNode;
  children: React.ReactNode;
}

function LoopProvider(props: LoopProviderProps) {
  const contextValue = useMemo<StructuralLoopRenderContext>(
    () => ({
      bindings: props.bindings,
      itemData: props.itemData,
      keyBy: props.keyBy,
      instancePath: props.instancePath,
      depth: props.depth,
      renderBody: props.renderBody
    }),
    [props.bindings, props.itemData, props.keyBy, props.instancePath, props.depth, props.renderBody]
  );

  return <StructuralLoopContext.Provider value={contextValue}>{props.children}</StructuralLoopContext.Provider>;
}

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
          <LoopProvider
            key={itemKey}
            bindings={bindings}
            itemData={itemData}
            keyBy={props.props.keyBy}
            instancePath={instancePath}
            depth={depth}
            renderBody={(childSlotBindings, childInstancePath) =>
              props.regions.body?.render({
                bindings: childSlotBindings,
                instancePath: childInstancePath
              }) ?? null
            }
          >
            {props.regions.body?.render({
              bindings: slotBindings,
              instancePath
            }) ?? null}
          </LoopProvider>
        )
      })}
    </>
  );
}
