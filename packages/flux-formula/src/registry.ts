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

export function registerFunction(
  name: string,
  fn: FormulaFunction,
  options: { invoke?: FormulaInvokeMode } = {}
): void {
  defaultFunctions.set(name, fn);
  defaultFunctionMeta.set(name, { invoke: options.invoke ?? 'eager' });
}

export function registerNamespace(name: string, value: unknown): void {
  defaultNamespaces.set(name, value);
}

export function getFormulaRegistrySnapshot(): FormulaRegistrySnapshot {
  return {
    functions: Object.freeze(Object.fromEntries(defaultFunctions.entries())),
    functionMeta: Object.freeze(Object.fromEntries(defaultFunctionMeta.entries())),
    namespaces: Object.freeze(Object.fromEntries(defaultNamespaces.entries()))
  };
}

export function resetFormulaRegistry(): void {
  defaultFunctions.clear();
  defaultFunctionMeta.clear();
  defaultNamespaces.clear();
}
