import type {
  ActionNamespaceProvider,
  ActionScope,
  RendererComponentProps,
  SchemaInput,
  ScopeRef,
} from '@nop-chaos/flux-core';
import type { DesignerCommandResult } from './designer-command-types.js';
import type { DesignerPageSchema } from './schemas.js';
import type { DesignerContextValue } from './designer-context.js';

export function normalizeShortcut(input: string): string[] {
  return input
    .toLowerCase()
    .split('+')
    .map((part) => part.trim())
    .filter(Boolean);
}

export function matchesShortcut(event: KeyboardEvent, shortcuts: string[] | undefined): boolean {
  if (!shortcuts || shortcuts.length === 0) {
    return false;
  }

  const eventKey = event.key.toLowerCase();
  return shortcuts.some((shortcut) => {
    const keys = normalizeShortcut(shortcut);
    const wantsCtrl = keys.includes('ctrl');
    const wantsMeta = keys.includes('cmd') || keys.includes('meta');
    const wantsShift = keys.includes('shift');
    const wantsAlt = keys.includes('alt') || keys.includes('option');
    const key = keys.find(
      (part) => !['ctrl', 'cmd', 'meta', 'shift', 'alt', 'option'].includes(part),
    );
    if (!key) {
      return false;
    }

    if (wantsCtrl !== event.ctrlKey) return false;
    if (wantsMeta !== event.metaKey) return false;
    if (wantsShift !== event.shiftKey) return false;
    if (wantsAlt !== event.altKey) return false;
    return key === eventKey.toLowerCase();
  });
}

export function createMergedDesignerProvider(args: {
  designerProvider?: ActionNamespaceProvider;
  upstreamBackHandler?: { provider: ActionNamespaceProvider; method: string };
}): ActionNamespaceProvider | undefined {
  const { designerProvider, upstreamBackHandler } = args;
  if (!designerProvider) {
    return undefined;
  }
  if (!upstreamBackHandler) {
    return designerProvider;
  }

  return {
    kind: designerProvider.kind ?? 'host',
    listMethods() {
      return designerProvider.listMethods?.() ?? [];
    },
    invoke(method, payload, ctx) {
      if (method === 'navigate-back') {
        return upstreamBackHandler.provider.invoke(upstreamBackHandler.method, payload, ctx);
      }
      return designerProvider.invoke(method, payload, ctx);
    },
    dispose() {
      designerProvider.dispose?.();
    },
  };
}

export function resolveDesignerNavigateBackHandler(
  actionScope: ActionScope | undefined,
): { provider: ActionNamespaceProvider; method: string } | undefined {
  return actionScope?.parent?.resolve('designer:navigate-back');
}

export function createDesignerContextValue(args: {
  core: DesignerContextValue['core'];
  commandAdapter: DesignerContextValue['commandAdapter'];
  dispatch: DesignerContextValue['dispatch'];
  config: DesignerContextValue['config'];
  designerScope?: DesignerContextValue['designerScope'];
  openCreateDialog: DesignerContextValue['openCreateDialog'];
  onPlusButtonClick: DesignerContextValue['onPlusButtonClick'];
  reportHostIssue?: DesignerContextValue['reportHostIssue'];
}): DesignerContextValue {
  return {
    core: args.core,
    commandAdapter: args.commandAdapter,
    dispatch: args.dispatch,
    config: args.config,
    designerScope: args.designerScope,
    openCreateDialog: args.openCreateDialog,
    onPlusButtonClick: args.onPlusButtonClick,
    reportHostIssue: args.reportHostIssue,
  };
}

export interface DesignerCreateDialogState {
  nodeType: import('@nop-chaos/flow-designer-core').NodeTypeConfig;
  position: { x: number; y: number };
}

export async function confirmCreateDialog(args: {
  pendingCreateDialog: DesignerCreateDialogState;
  helpers: RendererComponentProps<DesignerPageSchema>['helpers'];
  designerScope: ScopeRef;
  actionScope: ActionScope | undefined;
  dispatch: (command: import('./designer-command-types.js').DesignerCommand) => DesignerCommandResult;
}) {
  let nextData: Record<string, unknown> | undefined = args.pendingCreateDialog.nodeType.defaults
    ? { ...args.pendingCreateDialog.nodeType.defaults }
    : undefined;

  const submitAction = args.pendingCreateDialog.nodeType.createDialog?.submitAction;
  if (submitAction) {
    const result = await args.helpers.dispatch(submitAction, {
      scope: args.designerScope,
      actionScope: args.actionScope,
    });

    if (!result.ok) {
      return { ok: false as const, result };
    }

    if (result.data && typeof result.data === 'object' && !Array.isArray(result.data)) {
      nextData = {
        ...(nextData ?? {}),
        ...(result.data as Record<string, unknown>),
      };
    }
  }

  return {
    ok: true as const,
    result: args.dispatch({
      type: 'addNode',
      nodeType: args.pendingCreateDialog.nodeType.id,
      position: args.pendingCreateDialog.position,
      data: nextData,
    }),
  };
}

export function renderDesignerSchema(args: {
  schema: SchemaInput;
  helpers: RendererComponentProps<DesignerPageSchema>['helpers'];
  designerScope: ScopeRef;
  actionScope: ActionScope | undefined;
}) {
  return args.helpers.render(args.schema, {
    scope: args.designerScope,
    actionScope: args.actionScope,
  });
}
