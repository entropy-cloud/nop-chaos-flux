import { useEffect, useRef } from 'react';
import type {
  CompiledRuntimeValue,
  RendererHelpers,
  ScopeRef,
  StructuralLoopBindings,
} from '@nop-chaos/flux-core';

interface ItemDataScratchEvaluatorInput {
  helpers: RendererHelpers;
  bindings: StructuralLoopBindings;
  itemDataProgram: CompiledRuntimeValue<Record<string, unknown>> | undefined;
}

export function useItemDataScratchEvaluator(input: ItemDataScratchEvaluatorInput) {
  // P14 (plan 2026-09-28-6): one scratch child scope per LoopRenderer instance,
  // re-published per itemData evaluation via merge — replaces the per-item
  // create/dispose pairing (two store allocations per item per render). The
  // scratch scope has no subscribers of its own and no legitimate external
  // holder (the previous scopes were evaluate-and-discard), so reuse is
  // semantics-preserving; it is disposed at unmount.
  const scratchBindingsScopeRef = useRef<ScopeRef | null>(null);
  const helpersRef = useRef(input.helpers);
  // eslint-disable-next-line react-hooks/refs -- latest-ref: the structural loop evaluates itemData during render (renderStructuralLoop), so refs are intrinsic to the scratch-scope design; the scope has no subscribers and is disposed at unmount
  helpersRef.current = input.helpers;
  const itemDataProgramRef = useRef<
    CompiledRuntimeValue<Record<string, unknown>> | undefined
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
  // eslint-disable-next-line react-hooks/refs -- latest-ref (see helpersRef): the program identity follows the compiled structural field
  itemDataProgramRef.current = input.itemDataProgram;

  return function evaluateItemDataViaScratch(
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
      [input.bindings.itemName]: item,
      [input.bindings.indexName]: index,
      ...(input.bindings.keyName ? { [input.bindings.keyName]: itemKey } : {}),
    });

    return helpersRef.current.evaluateCompiled(itemDataProgram, scope);
  };
}
