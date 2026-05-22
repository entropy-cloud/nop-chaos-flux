import type { TemplateRegion, TemplateNode } from './types/node-identity.js';
import type { CompileSchemaOptions } from './types/renderer-compiler.js';
import type { SchemaInput } from './types/schema.js';
import { isSchemaInput } from './utils/schema.js';

export type NestedRegionFieldRule = {
  key: string;
  regionKeySuffix: string;
  compiledKey: string;
  params?: readonly string[];
  isolate?: boolean;
};

export type RegionCompileSchema = (
  input: SchemaInput,
  options?: CompileSchemaOptions,
  regionMeta?: { params?: readonly string[]; isolate?: boolean },
) => TemplateNode | TemplateNode[];

export function validateRegionParams(params: readonly string[], regionPath: string): void {
  const seen = new Set<string>();

  for (const name of params) {
    if (name.startsWith('$')) {
      throw new Error(
        `Region ${regionPath} declares reserved param name "${name}". ` +
          'Names starting with "$" are reserved for slot-frame metadata.',
      );
    }

    if (seen.has(name)) {
      throw new Error(`Region ${regionPath} has duplicate param name "${name}".`);
    }

    seen.add(name);
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

export function extractNestedSchemaRegions(input: {
  candidate: Record<string, unknown>;
  itemRegionPath: string;
  itemRegionKeyPrefix: string;
  rules: readonly NestedRegionFieldRule[];
  regions: Record<string, TemplateRegion>;
  compileSchema: RegionCompileSchema;
}) {
  const nextValue: Record<string, unknown> = { ...input.candidate };
  let changed = false;

  for (const rule of input.rules) {
    const fieldValue = input.candidate[rule.key];

    if (!isSchemaInput(fieldValue)) {
      continue;
    }

    const regionKey = `${input.itemRegionKeyPrefix}.${rule.regionKeySuffix}`;
    const regionPath = `${input.itemRegionPath}.${rule.regionKeySuffix}`;
    input.regions[regionKey] = createTemplateRegion(
      regionKey,
      fieldValue,
      regionPath,
      (schema, options) =>
        input.compileSchema(schema, options, { params: rule.params, isolate: rule.isolate }),
      { params: rule.params, isolate: rule.isolate },
    );
    delete nextValue[rule.key];
    nextValue[rule.compiledKey] = regionKey;
    changed = true;
  }

  return {
    value: changed ? nextValue : input.candidate,
    changed,
  };
}

export function visitNestedSchemaRegions(input: {
  candidate: Record<string, unknown>;
  itemRegionPath: string;
  rules: readonly NestedRegionFieldRule[];
  visitRegion: (region: {
    key: string;
    path: string;
    value: SchemaInput;
    params?: readonly string[];
    isolate?: boolean;
  }) => void;
}) {
  for (const rule of input.rules) {
    const fieldValue = input.candidate[rule.key];

    if (!isSchemaInput(fieldValue)) {
      continue;
    }

    const regionKey = rule.regionKeySuffix;
    const regionPath = `${input.itemRegionPath}.${rule.regionKeySuffix}`;
    validateRegionParams(rule.params ?? [], regionPath);
    input.visitRegion({
      key: regionKey,
      path: regionPath,
      value: fieldValue,
      params: rule.params,
      isolate: rule.isolate,
    });
  }
}
