import React, { useMemo } from 'react';
import type { InstanceFrame, RendererComponentProps, StructuralLoopBindings, StructuralLoopRenderContext } from '@nop-chaos/flux-core';
import { StructuralLoopContext, useStructuralLoopContext } from '@nop-chaos/flux-react';
import type { RecurseSchema } from './schemas';
import { createStructuralRepeatedTemplateId, renderStructuralLoop, resolveLoopBindings } from './structural-loop';

interface RecurseProviderProps {
  loopContext: StructuralLoopRenderContext;
  bindings: StructuralLoopBindings;
  itemData: Record<string, unknown> | undefined;
  keyBy: unknown;
  instancePath: readonly InstanceFrame[];
  depth: number;
  children: React.ReactNode;
}

function RecurseProvider(props: RecurseProviderProps) {
  const contextValue = useMemo<StructuralLoopRenderContext>(
    () => ({
      ...props.loopContext,
      bindings: props.bindings,
      itemData: props.itemData,
      keyBy: props.keyBy,
      instancePath: props.instancePath,
      depth: props.depth
    }),
    [props.loopContext, props.bindings, props.itemData, props.keyBy, props.instancePath, props.depth]
  );

  return <StructuralLoopContext.Provider value={contextValue}>{props.children}</StructuralLoopContext.Provider>;
}

export function RecurseRenderer(props: RendererComponentProps<RecurseSchema>) {
  const loopContext = useStructuralLoopContext();
  const itemName = props.props.itemName as string | undefined;
  const indexName = props.props.indexName as string | undefined;
  const keyName = props.props.keyName as string | undefined;
  const bindings = useMemo(
    () => resolveLoopBindings({ itemName, indexName, keyName }),
    [itemName, indexName, keyName]
  );

  if (!loopContext) {
    return null;
  }

  const itemData = (props.props.itemData as Record<string, unknown> | undefined) ?? loopContext.itemData;
  const keyBy = props.props.keyBy ?? loopContext.keyBy;
  const maxDepth = typeof props.props.maxDepth === 'number' ? props.props.maxDepth : undefined;

  return (
    <>
      {renderStructuralLoop({
        items: props.props.items,
        hasBody: true,
        bindings,
        itemData,
        keyBy,
        ownerId: props.id,
        parentInstancePath: loopContext.instancePath,
        repeatedTemplateId: createStructuralRepeatedTemplateId(props.id),
        maxDepth,
        currentDepth: loopContext.depth,
        renderItem: ({ itemKey, slotBindings, instancePath, depth }) => (
          <RecurseProvider
            key={itemKey}
            loopContext={loopContext}
            bindings={bindings}
            itemData={itemData}
            keyBy={keyBy}
            instancePath={instancePath}
            depth={depth}
          >
            {loopContext.renderBody(slotBindings, instancePath)}
          </RecurseProvider>
        )
      })}
    </>
  );
}
