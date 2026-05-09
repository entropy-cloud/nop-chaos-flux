import React, { useMemo } from 'react';
import type {
  InstanceFrame,
  RendererComponentProps,
  StructuralLoopBindings,
  StructuralLoopRenderContext,
} from '@nop-chaos/flux-core';
import { useRenderInstancePath } from '@nop-chaos/flux-react';
import { StructuralLoopContext } from '@nop-chaos/flux-react/unstable';
import type { LoopSchema } from './schemas.js';
import {
  createStructuralRepeatedTemplateId,
  renderStructuralLoop,
  resolveLoopBindings,
} from './structural-loop.js';
import { asReactNode } from './utils.js';

interface LoopProviderProps {
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
  renderBody: (
    childSlotBindings: Record<string, unknown>,
    childInstancePath: readonly InstanceFrame[],
  ) => React.ReactNode;
  children: React.ReactNode;
}

function LoopProvider(props: LoopProviderProps) {
  const contextValue = useMemo<StructuralLoopRenderContext>(
    () => ({
      bindings: props.bindings,
      itemData: props.itemData,
      evaluateItemData: props.evaluateItemData,
      keyBy: props.keyBy,
      instancePath: props.instancePath,
      depth: props.depth,
      renderBody: props.renderBody,
    }),
    [
      props.bindings,
      props.itemData,
      props.evaluateItemData,
      props.keyBy,
      props.instancePath,
      props.depth,
      props.renderBody,
    ],
  );

  return (
    <StructuralLoopContext.Provider value={contextValue}>
      {props.children}
    </StructuralLoopContext.Provider>
  );
}

export function LoopRenderer(props: RendererComponentProps<LoopSchema>) {
  const parentInstancePath = useRenderInstancePath();
  const items = props.props.items;
  const itemDataProgram = props.templateNode.structuralFields?.itemData as
    | import('@nop-chaos/flux-core').CompiledRuntimeValue<Record<string, unknown>>
    | undefined;
  const schemaProps = props.props as LoopSchema;
  const itemName = schemaProps.itemName;
  const indexName = schemaProps.indexName;
  const keyName = schemaProps.keyName;
  const bindings = useMemo(
    () => resolveLoopBindings({ itemName, indexName, keyName }),
    [itemName, indexName, keyName],
  );
  const repeatedTemplateId = createStructuralRepeatedTemplateId(props.id);

  return (
    <>
      {renderStructuralLoop({
        items,
        hasBody: Boolean(props.regions.body?.templateNode),
        hasEmpty: Boolean(props.regions.empty?.templateNode),
        bindings,
        evaluateItemData(item, index, itemKey) {
          if (!itemDataProgram) {
            return undefined;
          }

          const bindingsScope = props.helpers.createScope({
            [bindings.itemName]: item,
            [bindings.indexName]: index,
            ...(bindings.keyName ? { [bindings.keyName]: itemKey } : {}),
          });

          return props.helpers.evaluateCompiled(itemDataProgram, bindingsScope);
        },
        keyBy: props.props.keyBy,
        ownerId: props.id,
        parentInstancePath,
        repeatedTemplateId,
        renderEmpty: () => asReactNode(props.regions.empty?.render()),
        renderItem: ({ itemKey, slotBindings, instancePath, depth }) => (
          <LoopProvider
            key={itemKey}
            bindings={bindings}
            itemData={undefined}
            evaluateItemData={(item, index, key) => {
              if (!itemDataProgram) {
                return undefined;
              }

              const bindingsScope = props.helpers.createScope({
                [bindings.itemName]: item,
                [bindings.indexName]: index,
                ...(bindings.keyName ? { [bindings.keyName]: key } : {}),
              });

              return props.helpers.evaluateCompiled(itemDataProgram, bindingsScope);
            }}
            keyBy={props.props.keyBy}
            instancePath={instancePath}
            depth={depth}
            renderBody={(childSlotBindings, childInstancePath): React.ReactNode =>
              asReactNode(
                props.regions.body?.render({
                  bindings: childSlotBindings,
                  instancePath: childInstancePath,
                }),
              )
            }
          >
            {asReactNode(
              props.regions.body?.render({
                bindings: slotBindings,
                instancePath,
              }),
            )}
          </LoopProvider>
        ),
      })}
    </>
  );
}
