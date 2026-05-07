import type {
  BaseSchema,
  RendererDefinition,
  RendererPlugin,
  RendererRegistry,
  SchemaInput,
} from '@nop-chaos/flux-core';
import { isSchemaInput } from '@nop-chaos/flux-core';
import { schemaPathToJsonPointer, type SchemaCompilerDiagnosticsContext } from './diagnostics.js';
import { classifyField } from './fields.js';
import { applyWrapComponentPlugins } from './shape-validation.js';

export function applyRendererAuthoringTransform(
  schema: BaseSchema,
  renderer: RendererDefinition,
  path: string,
  diagnostics: SchemaCompilerDiagnosticsContext,
  schemaUrl?: string,
): BaseSchema {
  if (!renderer.authoringTransform) {
    return schema;
  }

  return renderer.authoringTransform({
    schema,
    path,
    schemaUrl,
    emit(issue) {
      diagnostics.emit({
        ...issue,
        path: issue.path ?? schemaPathToJsonPointer(path),
        source: issue.source ?? 'renderer',
      });
    },
  });
}

export function canonicalizeSchemaInput(
  schema: SchemaInput,
  options: {
    basePath: string;
    schemaUrl?: string;
    registry: RendererRegistry;
    plugins?: RendererPlugin[];
    maxDepth: number;
  },
  diagnostics: SchemaCompilerDiagnosticsContext,
  depth = 0,
): SchemaInput {
  if (depth > options.maxDepth) {
    return schema;
  }

  if (Array.isArray(schema)) {
    return schema.map(
      (item, index) =>
        canonicalizeSchemaInput(
          item,
          {
            ...options,
            basePath: `${options.basePath}[${index}]`,
          },
          diagnostics,
          depth + 1,
        ) as BaseSchema,
    );
  }

  const renderer = options.registry.get(schema.type);

  if (!renderer) {
    return schema;
  }

  const wrappedRenderer = applyWrapComponentPlugins(renderer, options.plugins);
  const canonicalNode = applyRendererAuthoringTransform(
    schema,
    wrappedRenderer,
    options.basePath,
    diagnostics,
    options.schemaUrl,
  );
  const nextNode: Record<string, unknown> = { ...canonicalNode };

  for (const key of Object.keys(canonicalNode)) {
    const rule = classifyField(wrappedRenderer, key);
    const value = canonicalNode[key];

    if (rule.kind === 'region' || (rule.kind === 'value-or-region' && isSchemaInput(value))) {
      if (isSchemaInput(value)) {
        nextNode[key] = canonicalizeSchemaInput(
          value,
          {
            ...options,
            basePath: `${options.basePath}.${rule.regionKey ?? key}`,
          },
          diagnostics,
          depth + 1,
        );
      }
    }
  }

  return nextNode as BaseSchema;
}

