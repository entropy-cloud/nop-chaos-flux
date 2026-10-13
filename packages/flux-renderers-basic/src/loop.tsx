import React from 'react';
import type { CompiledRuntimeValue, RendererComponentProps } from '@nop-chaos/flux-core';
import { useRenderInstancePath } from '@nop-chaos/flux-react';
import type { LoopSchema } from './schemas.js';
import {
  createStructuralRepeatedTemplateId,
  renderStructuralLoop,
  resolveLoopBindings,
} from './structural-loop.js';
import { useItemDataScratchEvaluator } from './structural-loop-scratch.js';
import { StructuralLoopScopeProvider } from './structural-loop-scope-provider.js';
import { asReactNode } from './utils.js';

export function LoopRenderer(props: RendererComponentProps<LoopSchema>) {
  const parentInstancePath = useRenderInstancePath();

  const items = props.props.items;
  const itemDataProgram = props.templateNode.structuralFields?.itemData as
    | CompiledRuntimeValue<Record<string, unknown>>
    | undefined;
  const schemaProps = props.props as LoopSchema;
  const itemName = schemaProps.itemName;
  const indexName = schemaProps.indexName;
  const keyName = schemaProps.keyName;
  const bindings = resolveLoopBindings({ itemName, indexName, keyName });
  const repeatedTemplateId = createStructuralRepeatedTemplateId(props.id);

  const evaluateItemDataViaScratch = useItemDataScratchEvaluator({
    helpers: props.helpers,
    bindings,
    itemDataProgram,
  });

  return (
    <>
      {renderStructuralLoop({
        items,
        hasBody: Boolean(props.regions.body?.templateNode),
        hasEmpty: Boolean(props.regions.empty?.templateNode),
        bindings,
        evaluateItemData: evaluateItemDataViaScratch,
        keyBy: props.props.keyBy,
        ownerId: props.id,
        parentInstancePath,
        repeatedTemplateId,
        renderEmpty: () => asReactNode(props.regions.empty?.render()),
        renderItem: ({ itemKey, slotBindings, instancePath, depth }) => (
          <StructuralLoopScopeProvider
            key={itemKey}
            bindings={bindings}
            itemData={undefined}
            evaluateItemData={evaluateItemDataViaScratch}
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
          </StructuralLoopScopeProvider>
        ),
      })}
    </>
  );
}
