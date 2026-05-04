export type FormulaInvokeMode = 'eager' | 'lazy';

export type FormulaFunction = (...args: any[]) => any;

export interface FormulaFunctionMeta {
  invoke: FormulaInvokeMode;
}

export interface FormulaRegistrySnapshot {
  functions: Readonly<Record<string, FormulaFunction>>;
  functionMeta: Readonly<Record<string, FormulaFunctionMeta>>;
  namespaces: Readonly<Record<string, unknown>>;
}

export interface FormulaRegistry {
  registerFunction(
    name: string,
    fn: FormulaFunction,
    options?: { invoke?: FormulaInvokeMode },
  ): void;
  registerNamespace(name: string, value: unknown): void;
  getSnapshot(): FormulaRegistrySnapshot;
  reset(): void;
}

export function createFormulaRegistry(): FormulaRegistry {
  const functions = new Map<string, FormulaFunction>();
  const functionMeta = new Map<string, FormulaFunctionMeta>();
  const namespaces = new Map<string, unknown>();
  let cachedSnapshot: FormulaRegistrySnapshot | undefined;

  return {
    registerFunction(
      name: string,
      fn: FormulaFunction,
      options: { invoke?: FormulaInvokeMode } = {},
    ): void {
      functions.set(name, fn);
      functionMeta.set(name, { invoke: options.invoke ?? 'eager' });
      cachedSnapshot = undefined;
    },

    registerNamespace(name: string, value: unknown): void {
      namespaces.set(name, value);
      cachedSnapshot = undefined;
    },

    getSnapshot(): FormulaRegistrySnapshot {
      if (cachedSnapshot) {
        return cachedSnapshot;
      }

      cachedSnapshot = {
        functions: Object.freeze(Object.fromEntries(functions.entries())),
        functionMeta: Object.freeze(Object.fromEntries(functionMeta.entries())),
        namespaces: Object.freeze(Object.fromEntries(namespaces.entries())),
      };
      return cachedSnapshot;
    },

    reset(): void {
      functions.clear();
      functionMeta.clear();
      namespaces.clear();
      cachedSnapshot = undefined;
    },
  };
}

// Default global instance for backward compatibility
const defaultRegistry = createFormulaRegistry();

let builtinsInstalled = false;

export function getBuiltinsInstalled(): boolean {
  return builtinsInstalled;
}

export function setBuiltinsInstalled(value: boolean): void {
  builtinsInstalled = value;
}

export function registerFunction(
  name: string,
  fn: FormulaFunction,
  options: { invoke?: FormulaInvokeMode } = {},
): void {
  defaultRegistry.registerFunction(name, fn, options);
}

export function registerNamespace(name: string, value: unknown): void {
  defaultRegistry.registerNamespace(name, value);
}

export function getFormulaRegistrySnapshot(): FormulaRegistrySnapshot {
  return defaultRegistry.getSnapshot();
}

export function resetFormulaRegistry(): void {
  defaultRegistry.reset();
  builtinsInstalled = false;
}
