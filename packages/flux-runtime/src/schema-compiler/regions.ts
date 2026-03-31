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
};

export function createCompiledRegion(
  key: string,
  value: unknown,
  path: string,
  compileSchema: (input: SchemaInput, options?: CompileSchemaOptions) => CompiledSchemaNode | CompiledSchemaNode[]
): CompiledRegion {
  if (value == null) {
    return {
      key,
      path,
      node: null
    };
  }

  if (!isSchemaInput(value)) {
    throw new Error(`Region ${path} must contain schema input.`);
  }

  return {
    key,
    path,
    node: compileSchema(value, { basePath: path, parentPath: path })
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
    input.regions[regionKey] = createCompiledRegion(
      regionKey,
      fieldValue,
      `${input.itemRegionPath}.${rule.regionKeySuffix}`,
      input.compileSchema
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
