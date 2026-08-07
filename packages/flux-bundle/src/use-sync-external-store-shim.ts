// ESM replacement for npm `use-sync-external-store` (whose shim entries are CJS
// and break browser ESM with "does not provide an export" or `require('react')`).
// Uses React 19 native useSyncExternalStore + flux-react's WithSelector impl.
export { useSyncExternalStore } from 'react';
export { useSyncExternalStoreWithSelector } from '@nop-chaos/flux-react';
