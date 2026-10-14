import type { ImportedLibraryModule, ModuleCache } from '@nop-chaos/flux-core';

export function createModuleCache(): ModuleCache {
  const resolved = new Map<string, ImportedLibraryModule>();
  const pending = new Map<string, Promise<ImportedLibraryModule>>();

  return {
    get(absUrl) {
      return resolved.get(absUrl);
    },
    set(absUrl, module) {
      resolved.set(absUrl, module);
    },
    has(absUrl) {
      return resolved.has(absUrl);
    },
    getPending(absUrl) {
      return pending.get(absUrl);
    },
    setPending(absUrl, promise) {
      pending.set(absUrl, promise);
    },
    removePending(absUrl) {
      pending.delete(absUrl);
    },
    clear() {
      resolved.clear();
      pending.clear();
    },
  };
}
