import type { CompiledSchemaNode, XuiImportSpec } from '@nop-chaos/flux-core';

export function resolveFrameWrapMode(
  definitionWrap: boolean | undefined,
  schemaFrameWrap: boolean | 'label' | 'group' | 'none' | undefined
): 'label' | 'group' | 'none' {
  if (!definitionWrap) {
    return 'none';
  }

  if (schemaFrameWrap === false || schemaFrameWrap === 'none') {
    return 'none';
  }

  if (schemaFrameWrap === 'group') {
    return 'group';
  }

  return 'label';
}

export function getNodeImports(node: CompiledSchemaNode): readonly XuiImportSpec[] | undefined {
  return 'xui:imports' in node.schema
    ? ((node.schema as { 'xui:imports'?: readonly XuiImportSpec[] })['xui:imports'])
    : undefined;
}

export function getNodeClassAliases(node: CompiledSchemaNode): Record<string, string> | undefined {
  return (node.schema as { classAliases?: Record<string, string> }).classAliases;
}

export function getNodeCompiledCid(node: CompiledSchemaNode): number | undefined {
  const cid = (node.schema as { _cid?: unknown })._cid;
  return typeof cid === 'number' ? cid : undefined;
}

export function getNodeSchemaFrameWrap(node: CompiledSchemaNode): boolean | 'label' | 'group' | 'none' | undefined {
  return (node.schema as { frameWrap?: boolean | 'label' | 'group' | 'none' }).frameWrap;
}

export function shouldWarnOnImportFailure(): boolean {
  const nodeEnv = 'process' in globalThis
    ? (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process?.env?.NODE_ENV
    : undefined;
  return nodeEnv !== 'production';
}

export function isReportedImportError(error: unknown): boolean {
  return error instanceof Error && Boolean((error as Error & { __fluxImportReported?: boolean }).__fluxImportReported);
}
