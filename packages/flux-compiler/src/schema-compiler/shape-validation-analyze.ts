import type {
  BaseSchema,
  RendererPlugin,
  RendererRegistry,
} from '@nop-chaos/flux-core';
import { isPlainObject, isSchemaInput } from '@nop-chaos/flux-core';
import {
  appendJsonPointer,
  schemaPathToJsonPointer,
  type SchemaCompilerDiagnosticsContext,
} from './diagnostics.js';
import { classifyField } from './fields.js';
import { validateRegionParams } from './regions.js';
import { analyzeDeepSchemaField } from './shape-validation-deep-fields.js';
import { inspectSchemaNodeFields } from './shape-validation-node-fields.js';
import {
  applyWrapComponentPlugins,
} from './shape-validation-utils.js';
import {
  createDefaultValidationTraversalState,
  createRegionTraversalState,
  resolveNodeHostContext,
  type ValidationTraversalState,
} from './shape-validation-traversal.js';

export function analyzeSchemaInput(
  inputValue: unknown,
  path: string,
  registry: RendererRegistry,
  plugins: readonly RendererPlugin[] | undefined,
  diagnostics: SchemaCompilerDiagnosticsContext,
  traversalState: ValidationTraversalState = createDefaultValidationTraversalState(diagnostics),
) {
  if (diagnostics.hasReachedLimit()) {
    return;
  }

  if (Array.isArray(inputValue)) {
    inputValue.forEach((entry, index) => {
      analyzeSchemaInput(entry, `${path}[${index}]`, registry, plugins, diagnostics, traversalState);
    });
    return;
  }

  if (!isPlainObject(inputValue)) {
    diagnostics.emit({
      code: path === '$' ? 'invalid-root' : 'expected-object',
      path: schemaPathToJsonPointer(path),
      message:
        path === '$'
          ? 'Schema root must be an object or an array of schema objects.'
          : 'Schema nodes must be objects.',
    });
    return;
  }

  if (typeof inputValue.type !== 'string' || inputValue.type.length === 0) {
    diagnostics.emit({
      code: 'missing-required-field',
      path: appendJsonPointer(schemaPathToJsonPointer(path), 'type'),
      message: 'Schema nodes require a non-empty type field.',
    });
    return;
  }

  const renderer = registry.get(inputValue.type);

  if (!renderer) {
    diagnostics.emit({
      code: 'unknown-renderer-type',
      path: appendJsonPointer(schemaPathToJsonPointer(path), 'type'),
      message: `Renderer not found for type: ${inputValue.type}`,
    });
    return;
  }

  const wrappedRenderer = applyWrapComponentPlugins(
    renderer,
    plugins as RendererPlugin[] | undefined,
  );
  const schema = inputValue as BaseSchema;
  const nodeTraversal = resolveNodeHostContext(
    schema,
    wrappedRenderer,
    path,
    diagnostics,
    traversalState.hostContext,
  );

  inspectSchemaNodeFields(
    schema,
    wrappedRenderer,
    path,
    diagnostics,
    true,
    nodeTraversal.hostContext,
  );

  for (const key of Object.keys(schema)) {
    const value = schema[key];
    const rule = classifyField(wrappedRenderer, key);

    if (
      analyzeDeepSchemaField({
        renderer: wrappedRenderer,
        key,
        value,
        path,
        registry,
        plugins,
        diagnostics,
        traversalState: nodeTraversal,
        startsHostBoundary: nodeTraversal.startsHostBoundary,
        analyzeSchemaInput,
      })
    ) {
      continue;
    }

    if (rule.kind === 'region') {
      if (value === undefined) {
        continue;
      }

      validateRegionParams(rule.params ?? [], `${path}.${rule.regionKey ?? key}`);

      if (!isSchemaInput(value)) {
        diagnostics.emit({
          code: 'invalid-region-node',
          path: appendJsonPointer(schemaPathToJsonPointer(path), key),
          message: `Region "${rule.regionKey ?? key}" must contain schema input.`,
        });
        continue;
      }

      analyzeSchemaInput(
        value,
        `${path}.${rule.regionKey ?? key}`,
        registry,
        plugins,
        diagnostics,
        createRegionTraversalState(
          nodeTraversal,
          rule.regionKey ?? key,
          rule.params,
          nodeTraversal.startsHostBoundary,
        ),
      );
      continue;
    }

    const isSourceCarrier =
      !!value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      (value as { type?: unknown }).type === 'source';

    if (rule.kind === 'value-or-region' && isSchemaInput(value) && !(rule.allowSource && isSourceCarrier)) {
      validateRegionParams(rule.params ?? [], `${path}.${rule.regionKey ?? key}`);
      analyzeSchemaInput(
        value,
        `${path}.${rule.regionKey ?? key}`,
        registry,
        plugins,
        diagnostics,
        createRegionTraversalState(
          nodeTraversal,
          rule.regionKey ?? key,
          rule.params,
          nodeTraversal.startsHostBoundary,
        ),
      );
    }
  }
}
