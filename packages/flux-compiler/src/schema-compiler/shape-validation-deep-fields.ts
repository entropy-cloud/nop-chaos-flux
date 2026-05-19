import type {
  RendererDefinition,
  RendererPlugin,
  RendererRegistry,
} from '@nop-chaos/flux-core';
import type { SchemaCompilerDiagnosticsContext } from './diagnostics.js';
import {
  DEEP_FIELD_NORMALIZERS,
  TABLE_COLUMN_REGION_FIELDS,
  TABS_ITEM_REGION_FIELDS,
  VARIANT_ITEM_REGION_FIELDS,
} from './tables.js';
import { visitNestedSchemaRegions } from './regions.js';
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
  if (!(input.key in (DEEP_FIELD_NORMALIZERS[input.renderer.type] ?? {}))) {
    return false;
  }

  if (input.renderer.type === 'table' || input.renderer.type === 'crud') {
    if (input.key === 'columns' && Array.isArray(input.value)) {
      input.value.forEach((column, index) => {
        if (!column || typeof column !== 'object' || Array.isArray(column)) {
          return;
        }

        visitNestedSchemaRegions({
          candidate: column as Record<string, unknown>,
          itemRegionPath: `${input.path}.columns[${index}]`,
          rules: TABLE_COLUMN_REGION_FIELDS,
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

    if (input.renderer.type === 'table' && input.key === 'expandable') {
      const expandable = input.value;
      if (!expandable || typeof expandable !== 'object' || Array.isArray(expandable)) {
        return true;
      }

      visitNestedSchemaRegions({
        candidate: expandable as Record<string, unknown>,
        itemRegionPath: `${input.path}.expandable`,
        rules: [
          {
            key: 'expandedRow',
            regionKeySuffix: 'expandedRow',
            compiledKey: 'expandedRowRegionKey',
            params: ['record', 'index'] as readonly string[],
            isolate: true,
          },
        ],
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
  }

  if (input.renderer.type === 'tabs' && input.key === 'items' && Array.isArray(input.value)) {
    input.value.forEach((item, index) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        return;
      }

      visitNestedSchemaRegions({
        candidate: item as Record<string, unknown>,
        itemRegionPath: `${input.path}.items[${index}]`,
        rules: TABS_ITEM_REGION_FIELDS,
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

  if (input.renderer.type === 'variant-field' && input.key === 'variants' && Array.isArray(input.value)) {
    input.value.forEach((item, index) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        return;
      }

      visitNestedSchemaRegions({
        candidate: item as Record<string, unknown>,
        itemRegionPath: `${input.path}.variants[${index}]`,
        rules: VARIANT_ITEM_REGION_FIELDS,
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

  return true;
}
