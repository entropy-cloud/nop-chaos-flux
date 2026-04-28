import type {
  ActionContext,
  ActionNamespaceProvider,
  ActionResult,
  CompiledActionProgram
} from './types';

export function createNamedActionProvider(
  plans: Readonly<Record<string, CompiledActionProgram>>,
  parentActionScope: import('./types').ActionScope | undefined,
  executeProgram: (program: CompiledActionProgram, ctx: ActionContext) => Promise<ActionResult>
): ActionNamespaceProvider {
  return {
    kind: 'import',
    async invoke(method, payload, ctx) {
      const program = plans[method];
      if (program) {
        return executeProgram(program, ctx);
      }

      const XUI_ACTIONS_NAMESPACE = '__xui_actions__';
      const parentResolved = parentActionScope?.resolve(`${XUI_ACTIONS_NAMESPACE}:${method}`);
      if (parentResolved) {
        return parentResolved.provider.invoke(method, payload, ctx);
      }

      return { ok: false, error: new Error(`Unknown named action: ${method}`) };
    },
    listMethods() {
      const XUI_ACTIONS_NAMESPACE = '__xui_actions__';
      const parentResolved = parentActionScope?.resolve(`${XUI_ACTIONS_NAMESPACE}:__list_methods__`);
      const parentMethods = parentResolved?.provider.listMethods?.() ?? [];
      return [...new Set([...Object.keys(plans), ...parentMethods])];
    }
  };
}
