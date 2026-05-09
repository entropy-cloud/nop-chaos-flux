import React, { useMemo } from 'react';
import type {
  InstanceFrame,
  RendererComponentProps,
  StructuralLoopBindings,
  StructuralLoopRenderContext,
} from '@nop-chaos/flux-core';
import { useStructuralLoopContext } from '@nop-chaos/flux-react';
import { StructuralLoopContext } from '@nop-chaos/flux-react/unstable';
import type { RecurseSchema } from './schemas.js';
import {
  createStructuralRepeatedTemplateId,
  renderStructuralLoop,
  resolveLoopBindings,
} from './structural-loop.js';
import { asReactNode } from './utils.js';

const DEFAULT_RECURSE_BINDINGS = {
  itemName: 'item',
  indexName: 'index',
  keyName: undefined,
} as const;

interface RecurseProviderProps {
  loopContext: StructuralLoopRenderContext;
  bindings: StructuralLoopBindings;
  itemData: Record<string, unknown> | undefined;
  evaluateItemData?: (
    item: unknown,
    index: number,
    itemKey: string,
  ) => Record<string, unknown> | undefined;
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
      evaluateItemData: props.evaluateItemData,
      keyBy: props.keyBy,
      instancePath: props.instancePath,
      depth: props.depth,
    }),
    [
        props.loopContext,
        props.bindings,
        props.itemData,
        props.evaluateItemData,
        props.keyBy,
        props.instancePath,
        props.depth,
    ],
  );

  return (
    <StructuralLoopContext.Provider value={contextValue}>
      {props.children}
    </StructuralLoopContext.Provider>
  );
}

export function RecurseRenderer(props: RendererComponentProps<RecurseSchema>) {
  const loopContext = useStructuralLoopContext();
  const inheritedBindings = loopContext?.bindings ?? DEFAULT_RECURSE_BINDINGS;

  const itemName = props.props.itemName as string | undefined;
  const indexName = props.props.indexName as string | undefined;
  const keyName = props.props.keyName as string | undefined;
  const bindings = useMemo(
    () =>
      resolveLoopBindings({
        itemName: itemName?.trim() || inheritedBindings.itemName,
        indexName: indexName?.trim() || inheritedBindings.indexName,
        keyName: keyName?.trim() || inheritedBindings.keyName,
      }),
    [inheritedBindings, itemName, indexName, keyName],
  );

  if (!loopContext) {
    return null;
  }

  const itemDataProgram = props.templateNode.structuralFields?.itemData as
    | import('@nop-chaos/flux-core').CompiledRuntimeValue<Record<string, unknown>>
    | undefined;
  const itemData = itemDataProgram ? undefined : loopContext.itemData;
  const evaluateItemData = itemDataProgram
    ? (item: unknown, index: number, itemKey: string) => {
        const bindingsScope = props.helpers.createScope({
          [bindings.itemName]: item,
          [bindings.indexName]: index,
          ...(bindings.keyName ? { [bindings.keyName]: itemKey } : {}),
        });

        return props.helpers.evaluateCompiled(itemDataProgram, bindingsScope);
      }
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
          <RecurseProvider
            key={itemKey}
            loopContext={loopContext}
            bindings={bindings}
            itemData={itemData}
            evaluateItemData={evaluateItemData}
            keyBy={keyBy}
            instancePath={instancePath}
            depth={depth}
          >
            {asReactNode(loopContext.renderBody(slotBindings, instancePath))}
          </RecurseProvider>
        ),
      })}
    </>
  );
}
