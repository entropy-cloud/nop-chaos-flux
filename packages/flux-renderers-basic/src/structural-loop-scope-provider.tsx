import React, { useMemo } from 'react';
import type {
  InstanceFrame,
  StructuralLoopBindings,
  StructuralLoopRenderContext,
} from '@nop-chaos/flux-core';
import { StructuralLoopProvider } from '@nop-chaos/flux-react';

type StructuralLoopRenderBody = (
  childSlotBindings: Record<string, unknown>,
  childInstancePath: readonly InstanceFrame[],
) => React.ReactNode;

interface StructuralLoopScopeProviderProps {
  base?: StructuralLoopRenderContext;
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
  renderBody?: StructuralLoopRenderBody;
  children: React.ReactNode;
}

export function StructuralLoopScopeProvider(props: StructuralLoopScopeProviderProps) {
  const contextValue = useMemo<StructuralLoopRenderContext>(
    () =>
      ({
        ...(props.base ?? {}),
        bindings: props.bindings,
        itemData: props.itemData,
        evaluateItemData: props.evaluateItemData,
        keyBy: props.keyBy,
        instancePath: props.instancePath,
        depth: props.depth,
        ...(props.renderBody ? { renderBody: props.renderBody } : {}),
      }) as StructuralLoopRenderContext,
    [
      props.base,
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
