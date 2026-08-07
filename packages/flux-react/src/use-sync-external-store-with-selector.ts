/**
 * fork of npm `use-sync-external-store/with-selector` (hand-copied implementation,
 * not a re-export of the npm package).
 *
 * Signature difference vs npm: `getServerSnapshot` is relaxed from required to
 * `(() => TSnapshot) | undefined` — React 19's native `useSyncExternalStore`
 * treats the third argument as optional, and this fork keeps that semantics.
 * Client rendering never invokes `getServerSnapshot`; it only applies on SSR
 * hydration (beyond the happy-dom unit-test surface).
 *
 * Maintenance warning: behavior changes must stay aligned with the 6 real
 * consumption points of this fork — 5 in-package relative imports
 * (`hooks.ts`, `dialog-host.tsx`, `dialog-host-surface.tsx`,
 * `hooks/use-form-hooks.ts`, `node-renderer-resolved.tsx`) plus 1 cross-package
 * bare import (`flux-bundle/src/use-sync-external-store-shim.ts`). The other
 * 12 consumers across 5 packages (flow-designer-renderers, nop-debugger,
 * report-designer-renderers, spreadsheet-renderers, word-editor-renderers,
 * incl. test files) import the npm `use-sync-external-store/shim/with-selector`
 * and are NOT part of this fork's sync surface.
 */
import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';

type SelectionInst<TSelection> =
  | {
      hasValue: true;
      value: TSelection;
    }
  | {
      hasValue: false;
      value: null;
    };

function is(x: unknown, y: unknown) {
  return (x === y && (x !== 0 || 1 / (x as number) === 1 / (y as number))) || (x !== x && y !== y);
}

const objectIs: (x: unknown, y: unknown) => boolean =
  typeof Object.is === 'function' ? Object.is : is;

export function useSyncExternalStoreWithSelector<TSnapshot, TSelection>(
  subscribe: (listener: () => void) => () => void,
  getSnapshot: () => TSnapshot,
  getServerSnapshot: (() => TSnapshot) | undefined,
  selector: (snapshot: TSnapshot) => TSelection,
  isEqual: (a: TSelection, b: TSelection) => boolean = objectIs,
): TSelection {
  const instRef = useRef<SelectionInst<TSelection>>({
    hasValue: false,
    value: null,
  });

  const [getSelectionSnapshot, getSelectionServerSnapshot] = useMemo<
    readonly [() => TSelection, (() => TSelection) | undefined]
  >(() => {
    const maybeGetServerSnapshot = getServerSnapshot;
    const memo: {
      hasMemo: boolean;
      snapshot: TSnapshot | undefined;
      selection: TSelection | undefined;
    } = {
      hasMemo: false,
      snapshot: undefined,
      selection: undefined,
    };

    function memoizedSelector(nextSnapshot: TSnapshot): TSelection {
      if (!memo.hasMemo) {
        memo.hasMemo = true;
        memo.snapshot = nextSnapshot;
        const nextSelection = selector(nextSnapshot);
        const inst = instRef.current;

        if (inst.hasValue && isEqual(inst.value, nextSelection)) {
          memo.selection = inst.value;
          return inst.value;
        }

        memo.selection = nextSelection;
        return nextSelection;
      }

      const prevSnapshot = memo.snapshot as TSnapshot;
      const prevSelection = memo.selection as TSelection;

      if (objectIs(prevSnapshot, nextSnapshot)) {
        return prevSelection;
      }

      const nextSelection = selector(nextSnapshot);

      if (isEqual(prevSelection, nextSelection)) {
        memo.snapshot = nextSnapshot;
        return prevSelection;
      }

      memo.snapshot = nextSnapshot;
      memo.selection = nextSelection;
      return nextSelection;
    }

    return [
      () => memoizedSelector(getSnapshot()),
      maybeGetServerSnapshot ? () => memoizedSelector(maybeGetServerSnapshot()) : undefined,
    ] as const;
  }, [getServerSnapshot, getSnapshot, isEqual, selector]);

  const value = useSyncExternalStore(
    subscribe,
    getSelectionSnapshot,
    getSelectionServerSnapshot,
  );

  useEffect(() => {
    instRef.current = {
      hasValue: true,
      value,
    };
  }, [value]);

  return value;
}
