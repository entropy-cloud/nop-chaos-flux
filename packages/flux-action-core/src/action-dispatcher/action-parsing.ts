const COMPONENT_ACTION_PREFIX = 'component:';

export function isComponentAction(actionName: string): boolean {
  return actionName.startsWith(COMPONENT_ACTION_PREFIX);
}

export function extractComponentMethod(actionName: string): string {
  return actionName.slice(COMPONENT_ACTION_PREFIX.length);
}

export function isNamespacedAction(actionName: string): boolean {
  const separatorIndex = actionName.indexOf(':');
  return separatorIndex > 0 && separatorIndex < actionName.length - 1 && !isComponentAction(actionName);
}

export function parseNamespacedAction(actionName: string): { namespace: string; method: string } | undefined {
  const separatorIndex = actionName.indexOf(':');
  if (separatorIndex <= 0 || separatorIndex >= actionName.length - 1) {
    return undefined;
  }
  return {
    namespace: actionName.slice(0, separatorIndex),
    method: actionName.slice(separatorIndex + 1)
  };
}
