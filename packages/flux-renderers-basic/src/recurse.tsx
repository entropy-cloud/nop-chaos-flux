import React from 'react';
import type { CompiledRuntimeValue, RendererComponentProps } from '@nop-chaos/flux-core';
import { useStructuralLoopContext } from '@nop-chaos/flux-react';
import type { RecurseSchema } from './schemas.js';
import {
  createStructuralRepeatedTemplateId,
  renderStructuralLoop,
  resolveLoopBindings,
} from './structural-loop.js';
import { useItemDataScratchEvaluator } from './structural-loop-scratch.js';
import { StructuralLoopScopeProvider } from './structural-loop-scope-provider.js';
import { asReactNode } from './utils.js';

const DEFAULT_RECURSE_BINDINGS = {
  itemName: 'item',
  indexName: 'index',
  keyName: undefined,
} as const;

export function RecurseRenderer(props: RendererComponentProps<RecurseSchema>) {
  const loopContext = useStructuralLoopContext();
  const inheritedBindings = loopContext?.bindings ?? DEFAULT_RECURSE_BINDINGS;

  const itemName = props.props.itemName as string | undefined;
  const indexName = props.props.indexName as string | undefined;
  const keyName = props.props.keyName as string | undefined;
  const bindings = resolveLoopBindings({
        itemName: itemName?.trim() || inheritedBindings.itemName,
        indexName: indexName?.trim() || inheritedBindings.indexName,
        keyName: keyName?.trim() || inheritedBindings.keyName,
      });
  const itemDataProgram = props.templateNode.structuralFields?.itemData as
    | CompiledRuntimeValue<Record<string, unknown>>
    | undefined;

  const evaluateItemDataViaScratch = useItemDataScratchEvaluator({
    helpers: props.helpers,
    bindings,
    itemDataProgram,
  });

  if (!loopContext) {
    return null;
  }

  const itemData = itemDataProgram ? undefined : loopContext.itemData;
  const evaluateItemData = itemDataProgram
    ? evaluateItemDataViaScratch
    : loopContext.evaluateItemData;
  const keyBy = props.props.keyBy ?? loopContext.keyBy;
  const maxDepth = typeof props.props.maxDepth === 'number' ? props.props.maxDepth : undefined;

  return (
    <>
      {renderStructuralLoop({
        items: props.props.items,
        hasBody: true,
        bindings,
        itemData,
        evaluateItemData,
        keyBy,
        ownerId: props.id,
        parentInstancePath: loopContext.instancePath,
        repeatedTemplateId: createStructuralRepeatedTemplateId(props.id),
        maxDepth,
        currentDepth: loopContext.depth,
        renderItem: ({ itemKey, slotBindings, instancePath, depth }) => (
          <StructuralLoopScopeProvider
            key={itemKey}
            base={loopContext}
            bindings={bindings}
            itemData={itemData}
            evaluateItemData={evaluateItemData}
            keyBy={keyBy}
            instancePath={instancePath}
            depth={depth}
          >
            {asReactNode(loopContext.renderBody(slotBindings, instancePath))}
          </StructuralLoopScopeProvider>
        ),
      })}
    </>
  );
}
