declare module 'use-sync-external-store/shim/with-selector' {
  export function useSyncExternalStoreWithSelector<TSnapshot, TSelection>(
    subscribe: (onStoreChange: () => void) => () => void,
    getSnapshot: () => TSnapshot,
    getServerSnapshot: () => TSnapshot,
    selector: (snapshot: TSnapshot) => TSelection,
    isEqual?: (a: TSelection, b: TSelection) => boolean
  ): TSelection;
}
