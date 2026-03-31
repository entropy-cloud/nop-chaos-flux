import type {
  CompiledRegion,
  CompiledSchemaNode,
  CompileSchemaOptions,
  SchemaInput
} from '@nop-chaos/flux-core';
import { extractNestedSchemaRegions } from './regions';

export const TABLE_COLUMN_REGION_FIELDS = [
  { key: 'label', regionKeySuffix: 'label', compiledKey: 'labelRegionKey' },
  { key: 'buttons', regionKeySuffix: 'buttons', compiledKey: 'buttonsRegionKey' },
  { key: 'cell', regionKeySuffix: 'cell', compiledKey: 'cellRegionKey' }
] as const;

export type DeepFieldNormalizer = (input: {
  value: unknown;
  path: string;
  regions: Record<string, CompiledRegion>;
  compileSchema: (input: SchemaInput, options?: CompileSchemaOptions) => CompiledSchemaNode | CompiledSchemaNode[];
}) => unknown;

function normalizeTableColumns(
  value: unknown,
  path: string,
  regions: Record<string, CompiledRegion>,
  compileSchema: (input: SchemaInput, options?: CompileSchemaOptions) => CompiledSchemaNode | CompiledSchemaNode[]
) {
  if (!Array.isArray(value)) {
    return value;
  }

  return value.map((column, index) => {
    if (!column || typeof column !== 'object') {
      return column;
    }

    return extractNestedSchemaRegions({
      candidate: column as Record<string, unknown>,
      itemRegionPath: `${path}.columns[${index}]`,
      itemRegionKeyPrefix: `columns.${index}`,
      rules: TABLE_COLUMN_REGION_FIELDS,
      regions,
      compileSchema
    }).value;
  });
}

export const DEEP_FIELD_NORMALIZERS: Record<string, Record<string, DeepFieldNormalizer>> = {
  table: {
    columns(input) {
      return normalizeTableColumns(input.value, input.path, input.regions, input.compileSchema);
    }
  }
};
