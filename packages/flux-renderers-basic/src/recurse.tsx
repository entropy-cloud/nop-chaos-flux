import React, { useContext } from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { StructuralLoopContext } from './structural-loop-context';
import type { RecurseSchema } from './schemas';
import { createStructuralRepeatedTemplateId, renderStructuralLoop, resolveLoopBindings } from './structural-loop';

export function RecurseRenderer(props: RendererComponentProps<RecurseSchema>) {
  const loopContext = useContext(StructuralLoopContext);

  if (!loopContext) {
    return null;
  }

  const bindings = resolveLoopBindings({
    itemName: props.props.itemName as string | undefined,
    indexName: props.props.indexName as string | undefined,
    keyName: props.props.keyName as string | undefined
  });
  const itemData = (props.props.itemData as Record<string, unknown> | undefined) ?? loopContext.itemData;
  const keyBy = props.props.keyBy ?? loopContext.keyBy;
  const maxDepth = typeof props.props.maxDepth === 'number' ? props.props.maxDepth : undefined;

  return (
    <>
      {renderStructuralLoop({
        helpers: props.helpers,
        items: props.props.items,
        hasBody: Boolean(loopContext.bodyNode),
        bindings,
        itemData,
        keyBy,
        basePath: props.path,
        ownerId: props.id,
        parentScope: loopContext.scope,
        parentInstancePath: loopContext.instancePath,
        repeatedTemplateId: createStructuralRepeatedTemplateId(props.id),
        maxDepth,
        currentDepth: loopContext.depth,
        renderItem: ({ itemKey, scope, instancePath, depth }) => (
          <StructuralLoopContext.Provider
            key={itemKey}
            value={{
              ...loopContext,
              ownerId: props.id,
              path: props.path,
              bindings,
              itemData,
              keyBy,
              scope,
              instancePath,
              depth
            }}
          >
            {props.helpers.render(loopContext.bodyNode, {
              scope,
              instancePath,
              pathSuffix: `recurse.${itemKey}`
            })}
          </StructuralLoopContext.Provider>
        )
      })}
    </>
  );
}
