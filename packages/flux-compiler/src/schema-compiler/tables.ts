import type {
  TemplateRegion,
  TemplateNode,
  CompileSchemaOptions,
  SchemaInput,
} from '@nop-chaos/flux-core';
import { extractNestedSchemaRegions } from './regions';

export const TABLE_COLUMN_REGION_FIELDS = [
  { key: 'label', regionKeySuffix: 'label', compiledKey: 'labelRegionKey' },
  {
    key: 'buttons',
    regionKeySuffix: 'buttons',
    compiledKey: 'buttonsRegionKey',
    params: ['record', 'index'] as readonly string[],
    isolate: true,
  },
  {
    key: 'cell',
    regionKeySuffix: 'cell',
    compiledKey: 'cellRegionKey',
    params: ['record', 'index'] as readonly string[],
    isolate: true,
  },
] as const;

export const TABS_ITEM_REGION_FIELDS = [
  { key: 'title', regionKeySuffix: 'title', compiledKey: 'titleRegionKey' },
  { key: 'body', regionKeySuffix: 'body', compiledKey: 'bodyRegionKey' },
  { key: 'toolbar', regionKeySuffix: 'toolbar', compiledKey: 'toolbarRegionKey' },
] as const;

export type DeepFieldNormalizer = (input: {
  value: unknown;
  path: string;
  regions: Record<string, TemplateRegion>;
  compileSchema: (
    input: SchemaInput,
    options?: CompileSchemaOptions,
  ) => TemplateNode | TemplateNode[];
}) => unknown;

function normalizeTableColumns(
  value: unknown,
  path: string,
  regions: Record<string, TemplateRegion>,
  compileSchema: (
    input: SchemaInput,
    options?: CompileSchemaOptions,
  ) => TemplateNode | TemplateNode[],
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
      compileSchema,
    }).value;
  });
}

function normalizeTabsItems(
  value: unknown,
  path: string,
  regions: Record<string, TemplateRegion>,
  compileSchema: (
    input: SchemaInput,
    options?: CompileSchemaOptions,
  ) => TemplateNode | TemplateNode[],
) {
  if (!Array.isArray(value)) {
    return value;
  }

  return value.map((item, index) => {
    if (!item || typeof item !== 'object') {
      return item;
    }

    return extractNestedSchemaRegions({
      candidate: item as Record<string, unknown>,
      itemRegionPath: `${path}.items[${index}]`,
      itemRegionKeyPrefix: `items.${index}`,
      rules: TABS_ITEM_REGION_FIELDS,
      regions,
      compileSchema,
    }).value;
  });
}

export const DEEP_FIELD_NORMALIZERS: Record<string, Record<string, DeepFieldNormalizer>> = {
  table: {
    columns(input) {
      return normalizeTableColumns(input.value, input.path, input.regions, input.compileSchema);
    },
  },
  tabs: {
    items(input) {
      return normalizeTabsItems(input.value, input.path, input.regions, input.compileSchema);
    },
  },
};
