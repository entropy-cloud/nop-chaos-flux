import { createContext, useContext } from 'react';
export const RuntimeContext = createContext(null);
export const ScopeContext = createContext(null);
export const ActionScopeContext = createContext(undefined);
export const ComponentRegistryContext = createContext(undefined);
export const FormContext = createContext(undefined);
export const PageContext = createContext(undefined);
export const NodeMetaContext = createContext(null);
export const ClassAliasesContext = createContext(undefined);
export function useRequiredContext(context, label) {
    const value = useContext(context);
    if (!value) {
        throw new Error(`${label} is unavailable outside SchemaRenderer.`);
    }
    return value;
}
