import type {
  CompiledRegion,
  CompiledSchemaNode,
  CompileSchemaOptions,
  SchemaInput
} from '@nop-chaos/flux-core';
import { isSchemaInput } from '@nop-chaos/flux-core';

export type NestedRegionFieldRule = {
  key: string;
  regionKeySuffix: string;
  compiledKey: string;
  params?: readonly string[];
  isolate?: boolean;
};

const RESERVED_SLOT_PARAM_NAMES = new Set(['$parent', '$name', '$key', '$depth']);

export function validateRegionParams(params: readonly string[], regionPath: string): void {
  const seen = new Set<string>();

  for (const name of params) {
    if (RESERVED_SLOT_PARAM_NAMES.has(name)) {
      throw new Error(
        `Region ${regionPath} declares reserved param name "${name}". ` +
        `Names starting with "$" are reserved for slot-frame metadata.`
      );
    }

    if (seen.has(name)) {
      throw new Error(
        `Region ${regionPath} has duplicate param name "${name}".`
      );
    }

    seen.add(name);
  }
}

export function createCompiledRegion(
  key: string,
  value: unknown,
  path: string,
  compileSchema: (input: SchemaInput, options?: CompileSchemaOptions) => CompiledSchemaNode | CompiledSchemaNode[],
  regionMeta?: { params?: readonly string[]; isolate?: boolean }
): CompiledRegion {
  if (regionMeta?.params) {
    validateRegionParams(regionMeta.params, path);
  }

  if (value == null) {
    return {
      key,
      path,
      node: null,
      ...(regionMeta?.params !== undefined ? { params: regionMeta.params } : {}),
      ...(regionMeta?.isolate !== undefined ? { isolate: regionMeta.isolate } : {})
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
    ...(regionMeta?.isolate !== undefined ? { isolate: regionMeta.isolate } : {})
  };
}

export function extractNestedSchemaRegions(input: {
  candidate: Record<string, unknown>;
  itemRegionPath: string;
  itemRegionKeyPrefix: string;
  rules: readonly NestedRegionFieldRule[];
  regions: Record<string, CompiledRegion>;
  compileSchema: (input: SchemaInput, options?: CompileSchemaOptions) => CompiledSchemaNode | CompiledSchemaNode[];
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
    input.regions[regionKey] = createCompiledRegion(
      regionKey,
      fieldValue,
      regionPath,
      input.compileSchema,
      { params: rule.params, isolate: rule.isolate }
    );
    delete nextValue[rule.key];
    nextValue[rule.compiledKey] = regionKey;
    changed = true;
  }

  return {
    value: changed ? nextValue : input.candidate,
    changed
  };
}
