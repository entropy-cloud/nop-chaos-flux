import type { ActionScope, ComponentHandleRegistry, ImportedLibraryLoader, RendererEnv, RendererRuntime, ScopeRef, XuiImportSpec, CompiledSchemaNode } from '@nop-chaos/flux-core';
export declare function createImportManager(input: {
    loader?: ImportedLibraryLoader;
    getRuntime: () => RendererRuntime;
    env: RendererEnv;
}): {
    ensureImportedNamespaces: (args: {
        imports?: readonly XuiImportSpec[];
        actionScope?: ActionScope;
        componentRegistry?: ComponentHandleRegistry;
        scope: ScopeRef;
        node?: CompiledSchemaNode;
    }) => Promise<void>;
    releaseImportedNamespaces: (args: {
        imports?: readonly XuiImportSpec[];
        actionScope?: ActionScope;
    }) => void;
};
