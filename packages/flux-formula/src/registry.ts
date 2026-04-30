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

const defaultFunctions = new Map<string, FormulaFunction>();
const defaultFunctionMeta = new Map<string, FormulaFunctionMeta>();
const defaultNamespaces = new Map<string, unknown>();
let cachedSnapshot: FormulaRegistrySnapshot | undefined;
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
  defaultFunctions.set(name, fn);
  defaultFunctionMeta.set(name, { invoke: options.invoke ?? 'eager' });
  cachedSnapshot = undefined;
}

export function registerNamespace(name: string, value: unknown): void {
  defaultNamespaces.set(name, value);
  cachedSnapshot = undefined;
}

export function getFormulaRegistrySnapshot(): FormulaRegistrySnapshot {
  if (cachedSnapshot) {
    return cachedSnapshot;
  }

  cachedSnapshot = {
    functions: Object.freeze(Object.fromEntries(defaultFunctions.entries())),
    functionMeta: Object.freeze(Object.fromEntries(defaultFunctionMeta.entries())),
    namespaces: Object.freeze(Object.fromEntries(defaultNamespaces.entries())),
  };
  return cachedSnapshot;
}

export function resetFormulaRegistry(): void {
  defaultFunctions.clear();
  defaultFunctionMeta.clear();
  defaultNamespaces.clear();
  cachedSnapshot = undefined;
  builtinsInstalled = false;
}
