import React, { useEffect, useMemo, useRef } from 'react';
import type {
  InstanceFrame,
  RendererComponentProps,
  StructuralLoopBindings,
  StructuralLoopRenderContext,
} from '@nop-chaos/flux-core';
import { StructuralLoopProvider, useRenderInstancePath } from '@nop-chaos/flux-react';
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

  return <StructuralLoopProvider value={contextValue}>{props.children}</StructuralLoopProvider>;
}

export function LoopRenderer(props: RendererComponentProps<LoopSchema>) {
  const parentInstancePath = useRenderInstancePath();
  // P14 (plan 2026-09-28-6): one scratch child scope per LoopRenderer instance,
  // re-published per itemData evaluation via merge — replaces the per-item
  // create/dispose pairing (two store allocations per item per render). The
  // scratch scope has no subscribers of its own and no legitimate external
  // holder (the previous scopes were evaluate-and-discard), so reuse is
  // semantics-preserving; it is disposed at unmount.
  const scratchBindingsScopeRef = useRef<import('@nop-chaos/flux-core').ScopeRef | null>(null);
  const helpersRef = useRef(props.helpers);
  // eslint-disable-next-line react-hooks/refs -- latest-ref: the structural loop evaluates itemData during render (renderStructuralLoop), so refs are intrinsic to the scratch-scope design; the scope has no subscribers and is disposed at unmount
  helpersRef.current = props.helpers;
  const itemDataProgramRef = useRef<
    import('@nop-chaos/flux-core').CompiledRuntimeValue<Record<string, unknown>> | undefined
  >(undefined);
  useEffect(
    () => () => {
      const scope = scratchBindingsScopeRef.current;
      if (scope) {
        helpersRef.current.disposeScope(scope.id);
        scratchBindingsScopeRef.current = null;
      }
    },
    [],
  );

  const items = props.props.items;
  const itemDataProgram = props.templateNode.structuralFields?.itemData as
    | import('@nop-chaos/flux-core').CompiledRuntimeValue<Record<string, unknown>>
    | undefined;
  // eslint-disable-next-line react-hooks/refs -- latest-ref (see helpersRef): the program identity follows the compiled structural field
  itemDataProgramRef.current = itemDataProgram;
  const schemaProps = props.props as LoopSchema;
  const itemName = schemaProps.itemName;
  const indexName = schemaProps.indexName;
  const keyName = schemaProps.keyName;
  const bindings = resolveLoopBindings({ itemName, indexName, keyName });
  const repeatedTemplateId = createStructuralRepeatedTemplateId(props.id);

  function evaluateItemDataViaScratch(
    item: unknown,
    index: number,
    itemKey: string,
  ): Record<string, unknown> | undefined {
    const itemDataProgram = itemDataProgramRef.current;
    if (!itemDataProgram) {
      return undefined;
    }

    let scope = scratchBindingsScopeRef.current;
    if (!scope) {
      scope = helpersRef.current.createScope({});
      scratchBindingsScopeRef.current = scope;
    }

    scope.merge({
      [bindings.itemName]: item,
      [bindings.indexName]: index,
      ...(bindings.keyName ? { [bindings.keyName]: itemKey } : {}),
    });

    return helpersRef.current.evaluateCompiled(itemDataProgram, scope);
  }

  return (
    <>
      {/* eslint-disable-next-line react-hooks/refs -- scratch-scope reads: the structural loop evaluates itemData during render by design; scope has no subscribers, disposed at unmount (plan 2026-09-28-6 P14) */}
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
          <LoopProvider
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
          </LoopProvider>
        ),
      })}
    </>
  );
}
