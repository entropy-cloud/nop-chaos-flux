import type { TemplateRegion, TemplateNode } from './types/node-identity.js';
import type { CompileSchemaOptions } from './types/renderer-compiler.js';
import type { SchemaDiagnosticCollector } from './types/schema-diagnostics-types.js';
import type { SchemaInput } from './types/schema.js';
import { isSchemaInput } from './utils/schema.js';

export type RegionCompileSchema = (
  input: SchemaInput,
  options?: CompileSchemaOptions,
  regionMeta?: { params?: readonly string[]; isolate?: boolean },
) => TemplateNode | TemplateNode[];

export function validateRegionParams(
  params: readonly string[],
  regionPath: string,
  collector?: SchemaDiagnosticCollector,
): void {
  const seen = new Set<string>();
  const errors: string[] = [];

  for (const name of params) {
    if (name.startsWith('$')) {
      const message =
        `Region ${regionPath} declares reserved param name "${name}". ` +
        'Names starting with "$" are reserved for slot-frame metadata.';
      if (collector) {
        collector.add({
          code: 'invalid-property-value',
          path: regionPath,
          message,
          severity: 'error',
          source: 'core',
        });
      } else {
        errors.push(message);
      }
      continue;
    }

    if (seen.has(name)) {
      const message = `Region ${regionPath} has duplicate param name "${name}".`;
      if (collector) {
        collector.add({
          code: 'invalid-property-value',
          path: regionPath,
          message,
          severity: 'error',
          source: 'core',
        });
      } else {
        errors.push(message);
      }
      continue;
    }

    seen.add(name);
  }

  if (errors.length > 0) {
    throw new Error(errors.join('; '));
  }
}

export function createTemplateRegion(
  key: string,
  value: unknown,
  path: string,
  compileSchema: (input: SchemaInput, options?: CompileSchemaOptions) => TemplateNode | TemplateNode[],
  regionMeta?: { params?: readonly string[]; isolate?: boolean },
): TemplateRegion {
  if (regionMeta?.params) {
    validateRegionParams(regionMeta.params, path);
  }

  if (value == null) {
    return {
      key,
      path,
      node: null,
      ...(regionMeta?.params !== undefined ? { params: regionMeta.params } : {}),
      ...(regionMeta?.isolate !== undefined ? { isolate: regionMeta.isolate } : {}),
    };
  }

  if (!isSchemaInput(value)) {
    throw new Error(`Region ${path} must contain schema input.`);
  }

  return {
    key,
    path,
    node: compileSchema(value, { basePath: path, parentPath: path }),
    ...(regionMeta?.params !== undefined ? { params: regionMeta.params } : {}),
    ...(regionMeta?.isolate !== undefined ? { isolate: regionMeta.isolate } : {}),
  };
}
