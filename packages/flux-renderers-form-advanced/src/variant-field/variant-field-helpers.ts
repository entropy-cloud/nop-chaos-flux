import type {
  ActionSchema,
  CompiledActionProgram,
  RendererComponentProps,
  RendererEnv,
  SchemaObject,
  TemplateNode,
} from '@nop-chaos/flux-core';
import type { VariantFieldSchema, VariantOption } from '../composite-field/composite-schemas.js';

export type BaseNodeInstance = RendererComponentProps['node'];

export type VariantResolvedOption = VariantOption & {
  contentRegionKey?: string;
  viewerRegionKey?: string;
};

export function getAuthoredVariantOption(
  schema: VariantFieldSchema | undefined,
  key: string,
  index: number,
): VariantOption | undefined {
  const authoredVariants = Array.isArray(schema?.variants) ? schema.variants : [];
  return authoredVariants.find((variant) => variant.key === key) ?? authoredVariants[index];
}

function isCompiledActionProgram(value: unknown): value is CompiledActionProgram {
  return Boolean(
    value && typeof value === 'object' && 'nodes' in value && Array.isArray((value as { nodes?: unknown }).nodes),
  );
}

export function getAuthoredActionSchema(value: unknown): ActionSchema | ActionSchema[] | undefined {
  if (!isCompiledActionProgram(value)) {
    return undefined;
  }

  const authoredActions = value.nodes.map((node) => node.source).filter(Boolean);
  if (authoredActions.length === 0) {
    return undefined;
  }

  return authoredActions.length === 1 ? authoredActions[0] : authoredActions;
}

export function collectNamedChildPaths(input: VariantOption['content']): string[] {
  const nodes = Array.isArray(input) ? input : [input];
  const names = new Set<string>();

  for (const node of nodes) {
    if (!node || typeof node !== 'object' || Array.isArray(node)) {
      continue;
    }

    const candidateName = (node as { name?: unknown }).name;
    if (typeof candidateName === 'string' && candidateName.length > 0) {
      names.add(candidateName);
    }
  }

  return Array.from(names);
}

export function collectNamedChildPathsFromTemplateNode(
  templateNode: TemplateNode | readonly TemplateNode[] | null | undefined,
): string[] {
  const nodes = Array.isArray(templateNode) ? templateNode : templateNode ? [templateNode] : [];
  const names = new Set<string>();

  for (const node of nodes) {
    const candidateName = (node.schema as { name?: unknown }).name;
    if (typeof candidateName === 'string' && candidateName.length > 0) {
      names.add(candidateName);
    }

    for (const region of Object.values(node.regions) as Array<{
      node?: TemplateNode | readonly TemplateNode[] | null;
    }>) {
      for (const childName of collectNamedChildPathsFromTemplateNode(region?.node)) {
        names.add(childName);
      }
    }
  }

  return Array.from(names);
}

export function injectDetectVariantArgs(
  actionSchema: ActionSchema | ActionSchema[],
  payload: { value: unknown; variants: string[] },
): ActionSchema | ActionSchema[] {
  const schemaPayload = payload as SchemaObject;

  if (Array.isArray(actionSchema)) {
    return actionSchema.map((entry) =>
      entry.args === undefined ? { ...entry, args: schemaPayload } : entry,
    );
  }

  return actionSchema.args === undefined ? { ...actionSchema, args: schemaPayload } : actionSchema;
}

export function reportVariantFieldFailure(
  notify: RendererEnv['notify'] | undefined,
  error: unknown,
) {
  const message = error instanceof Error && error.message ? error.message : 'Variant field update failed';
  notify?.('warning', message);
}
