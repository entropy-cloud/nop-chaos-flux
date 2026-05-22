import type {
  RendererDefinition,
  RendererPlugin,
  RendererRegistry,
} from '@nop-chaos/flux-core';
import { visitNestedSchemaRegions } from '@nop-chaos/flux-core';
import type { SchemaCompilerDiagnosticsContext } from './diagnostics.js';
import {
  createRegionTraversalState,
  type ValidationTraversalState,
} from './shape-validation-traversal.js';

interface AnalyzeSchemaInputFn {
  (
    inputValue: unknown,
    path: string,
    registry: RendererRegistry,
    plugins: readonly RendererPlugin[] | undefined,
    diagnostics: SchemaCompilerDiagnosticsContext,
    traversalState?: ValidationTraversalState,
  ): void;
}

export function analyzeDeepSchemaField(input: {
  renderer: RendererDefinition;
  key: string;
  value: unknown;
  path: string;
  registry: RendererRegistry;
  plugins: readonly RendererPlugin[] | undefined;
  diagnostics: SchemaCompilerDiagnosticsContext;
  traversalState: ValidationTraversalState;
  startsHostBoundary: boolean;
  analyzeSchemaInput: AnalyzeSchemaInputFn;
}): boolean {
  const deepField = input.renderer.deepFields?.find((field) => field.key === input.key);

  if (!deepField) {
    return false;
  }

  const nestedRegions = deepField.nestedRegions;

  if (!nestedRegions?.length) {
    return true;
  }

  if (Array.isArray(input.value)) {
    input.value.forEach((item, index) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        return;
      }

      visitNestedSchemaRegions({
        candidate: item as Record<string, unknown>,
        itemRegionPath: `${input.path}.${input.key}[${index}]`,
        rules: nestedRegions,
        visitRegion(region) {
          input.analyzeSchemaInput(
            region.value,
            region.path,
            input.registry,
            input.plugins,
            input.diagnostics,
            createRegionTraversalState(
              input.traversalState,
              region.key,
              region.params,
              input.startsHostBoundary,
            ),
          );
        },
      });
    });
    return true;
  }

  if (!input.value || typeof input.value !== 'object' || Array.isArray(input.value)) {
    return true;
  }

  visitNestedSchemaRegions({
    candidate: input.value as Record<string, unknown>,
    itemRegionPath: `${input.path}.${input.key}`,
    rules: nestedRegions,
    visitRegion(region) {
      input.analyzeSchemaInput(
        region.value,
        region.path,
        input.registry,
        input.plugins,
        input.diagnostics,
        createRegionTraversalState(
          input.traversalState,
          region.key,
          region.params,
          input.startsHostBoundary,
        ),
      );
    },
  });

  return true;
}
