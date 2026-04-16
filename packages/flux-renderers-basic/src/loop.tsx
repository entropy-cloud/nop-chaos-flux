import React, { useMemo } from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { useRenderInstancePath } from '@nop-chaos/flux-react';
import type { LoopSchema } from './schemas';
import { StructuralLoopContext } from './structural-loop-context';
import { createStructuralRepeatedTemplateId, renderStructuralLoop, resolveLoopBindings } from './structural-loop';

interface LoopProviderProps {
  ownerId: string;
  path: string;
  bindings: ReturnType<typeof resolveLoopBindings>;
  itemData: Record<string, unknown> | undefined;
  keyBy: LoopSchema['keyBy'];
  instancePath: RendererComponentProps<LoopSchema>['instancePath'];
  depth: number;
  schema: LoopSchema;
  renderBody: (childSlotBindings: Record<string, unknown>, childInstancePath: RendererComponentProps<LoopSchema>['instancePath']) => React.ReactNode;
  children: React.ReactNode;
}

function LoopProvider(props: LoopProviderProps) {
  const contextValue = useMemo(
    () => ({
      ownerId: props.ownerId,
      path: props.path,
      bindings: props.bindings,
      itemData: props.itemData,
      keyBy: props.keyBy,
      instancePath: props.instancePath,
      depth: props.depth,
      schema: props.schema,
      renderBody: props.renderBody
    }),
    [props.ownerId, props.path, props.bindings, props.itemData, props.keyBy, props.instancePath, props.depth, props.schema, props.renderBody]
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
            ownerId={props.id}
            path={props.path}
            bindings={bindings}
            itemData={itemData}
            keyBy={props.props.keyBy}
            instancePath={instancePath}
            depth={depth}
            schema={props.props as LoopSchema}
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
