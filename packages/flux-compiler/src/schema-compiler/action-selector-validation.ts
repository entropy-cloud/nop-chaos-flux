import type { CompileSymbolTable, PreparedImportSpec } from '@nop-chaos/flux-core';
import { getBuiltInActionDescriptor } from '@nop-chaos/flux-core';
import { appendJsonPointer, type SchemaCompilerDiagnosticsContext } from './diagnostics.js';
import { isInsideCapableRegion, parseNamespacedAction, type HostActionValidationContext } from './host-action-validation.js';

export type ActionSelectorClass =
  | 'built-in'
  | 'component-targeted'
  | 'plain-named'
  | 'host-namespaced'
  | 'import-namespaced'
  | 'external-namespaced'
  | 'unresolved-plain';

export interface ActionSelectorResolution {
  class: ActionSelectorClass;
  action: string;
  canonicalBuiltInName?: string;
  parsedNamespace?: { namespace: string; method: string };
  importMeta?: PreparedImportSpec;
  isAlias?: boolean;
}

function findImportMetaByAlias(
  visibleImports: ReadonlyMap<string, PreparedImportSpec | undefined> | undefined,
  alias: string,
): PreparedImportSpec | undefined {
  if (!visibleImports) {
    return undefined;
  }

  return visibleImports.get(alias);
}

export function classifyActionSelector(input: {
  action: string;
  symbolTable?: CompileSymbolTable;
  visibleImports?: ReadonlyMap<string, PreparedImportSpec | undefined>;
  hostContext?: HostActionValidationContext;
}): ActionSelectorResolution {
  const builtIn = getBuiltInActionDescriptor(input.action);
  if (builtIn) {
    return {
      class: 'built-in',
      action: input.action,
      canonicalBuiltInName: builtIn.canonicalName,
      isAlias: builtIn.isAlias,
    };
  }

  const parsed = parseNamespacedAction(input.action);
  if (parsed) {
    if (parsed.namespace === 'component') {
      return {
        class: 'component-targeted',
        action: input.action,
        parsedNamespace: parsed,
      };
    }

    if (
      input.hostContext &&
      isInsideCapableRegion(input.hostContext) &&
      parsed.namespace === input.hostContext.manifest.capabilities.namespace
    ) {
      return {
        class: 'host-namespaced',
        action: input.action,
        parsedNamespace: parsed,
      };
    }

    const importMeta = findImportMetaByAlias(input.visibleImports, parsed.namespace);
    if (importMeta) {
      return {
        class: 'import-namespaced',
        action: input.action,
        parsedNamespace: parsed,
        importMeta,
      };
    }

    return {
      class: 'external-namespaced',
      action: input.action,
      parsedNamespace: parsed,
    };
  }

  const resolved = input.symbolTable?.resolve(input.action);
  if (resolved?.kind === 'xui-action-definition') {
    return {
      class: 'plain-named',
      action: input.action,
    };
  }

  return {
    class: 'unresolved-plain',
    action: input.action,
  };
}

export function validateActionSelector(input: {
  resolution: ActionSelectorResolution;
  path: string;
  diagnostics: SchemaCompilerDiagnosticsContext;
  enabled: boolean;
  strictMode?: boolean;
}) {
  if (!input.enabled) {
    return;
  }

  const actionPath = appendJsonPointer(input.path, 'action');
  const { resolution, diagnostics } = input;

  if (resolution.class === 'built-in' && resolution.isAlias && resolution.canonicalBuiltInName) {
    diagnostics.emit({
      code: 'builtin-action-alias',
      path: actionPath,
      message: `Built-in action alias "${resolution.action}" is compatibility-only. Use canonical selector "${resolution.canonicalBuiltInName}" instead.`,
      severity: input.strictMode ? 'error' : 'warning',
      source: 'core',
    });
    return;
  }

  if (resolution.class === 'unresolved-plain') {
    diagnostics.emit({
      code: 'unresolved-action-selector',
      path: actionPath,
      message: `Unresolved plain action selector "${resolution.action}". Plain action names must resolve through lexical xui:actions definitions.`,
      source: 'core',
    });
    return;
  }

  if (resolution.class === 'component-targeted') {
    diagnostics.emit({
      code: 'unvalidated-component-target',
      path: actionPath,
      message: `Component-targeted selector "${resolution.action}" uses the correct selector family, but compile-time target typing is unavailable without explicit target-binding metadata.`,
      severity: input.strictMode ? 'error' : 'warning',
      source: 'core',
    });
    return;
  }

  if (resolution.class === 'import-namespaced' && resolution.parsedNamespace) {
    const namespaceMethods = resolution.importMeta?.staticMeta?.namespaceMethods;
    if (!namespaceMethods) {
      diagnostics.emit({
        code: 'missing-import-static-meta',
        path: actionPath,
        message: `Import namespace "${resolution.parsedNamespace.namespace}" does not publish namespaceMethods static metadata, so compile-time method validation was skipped for "${resolution.action}".`,
        severity: input.strictMode ? 'error' : 'warning',
        source: 'core',
      });
      return;
    }

    if (!namespaceMethods.includes(resolution.parsedNamespace.method)) {
      diagnostics.emit({
        code: 'unknown-import-member',
        path: actionPath,
        message: `Unknown import namespace method "${resolution.action}". Available methods for "${resolution.parsedNamespace.namespace}": ${namespaceMethods.join(', ') || 'none'}.`,
        source: 'core',
      });
    }
  }
}
