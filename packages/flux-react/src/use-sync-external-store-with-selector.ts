import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';

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
  const instRef = useRef<{ hasValue: boolean; value: TSelection | null }>({
    hasValue: false,
    value: null,
  });

  const memoRef = useRef<{
    hasMemo: boolean;
    snapshot: TSnapshot | undefined;
    selection: TSelection | undefined;
  }>({ hasMemo: false, snapshot: undefined, selection: undefined });

  const [getSelectionSnapshot, getSelectionServerSnapshot] = useMemo(() => {
    const maybeGetServerSnapshot = getServerSnapshot;

    function memoizedSelector(nextSnapshot: TSnapshot): TSelection {
      const memo = memoRef.current;
      if (!memo.hasMemo) {
        memo.hasMemo = true;
        memo.snapshot = nextSnapshot;
        const nextSelection = selector(nextSnapshot);

        if (instRef.current.hasValue && isEqual(instRef.current.value as TSelection, nextSelection)) {
          memo.selection = instRef.current.value as TSelection;
          return memo.selection;
        }

        memo.selection = nextSelection;
        return memo.selection;
      }

      if (objectIs(memo.snapshot, nextSnapshot)) {
        return memo.selection;
      }

      const nextSelection = selector(nextSnapshot);

      if (isEqual(memo.selection, nextSelection)) {
        memo.snapshot = nextSnapshot;
        return memo.selection;
      }

      memo.snapshot = nextSnapshot;
      memo.selection = nextSelection;
      return memo.selection;
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
    instRef.current.hasValue = true;
    instRef.current.value = value;
  }, [value]);

  return value;
}
