import React from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { useRenderInstancePath, useRenderScope } from '@nop-chaos/flux-react';
import type { LoopSchema } from './schemas';
import { StructuralLoopContext } from './structural-loop-context';
import { createStructuralRepeatedTemplateId, renderStructuralLoop, resolveLoopBindings } from './structural-loop';

export function LoopRenderer(props: RendererComponentProps<LoopSchema>) {
  const parentScope = useRenderScope();
  const parentInstancePath = useRenderInstancePath();
  const items = props.props.items;
  const itemData = props.props.itemData as Record<string, unknown> | undefined;
  const bindings = resolveLoopBindings(props.props as LoopSchema);
  const repeatedTemplateId = createStructuralRepeatedTemplateId(props.id);

  return (
    <>
      {renderStructuralLoop({
        helpers: props.helpers,
        items,
        hasBody: Boolean(props.regions.body?.templateNode),
        hasEmpty: Boolean(props.regions.empty?.templateNode),
        bindings,
        itemData,
        keyBy: props.props.keyBy,
        basePath: props.path,
        ownerId: props.id,
        parentScope,
        parentInstancePath,
        repeatedTemplateId,
        renderEmpty: () => props.regions.empty
          ? props.helpers.render(props.regions.empty.templateNode, { pathSuffix: 'empty' })
          : null,
        renderItem: ({ itemKey, scope, instancePath, depth }) => (
          <StructuralLoopContext.Provider
            key={itemKey}
            value={{
              ownerId: props.id,
              path: props.path,
              bodyNode: props.regions.body?.templateNode ?? null,
              bindings,
              itemData,
              keyBy: props.props.keyBy,
              scope,
              instancePath,
              depth,
              schema: props.props as LoopSchema
            }}
          >
            {props.regions.body
              ? props.helpers.render(props.regions.body.templateNode, {
                  scope,
                  instancePath,
                  pathSuffix: `body.${itemKey}`
                })
              : null}
          </StructuralLoopContext.Provider>
        )
      })}
    </>
  );
}
