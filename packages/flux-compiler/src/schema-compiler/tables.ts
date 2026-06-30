import type {
  TemplateRegion,
  TemplateNode,
  CompileSchemaOptions,
  SchemaInput,
} from '@nop-chaos/flux-core';
import { extractNestedSchemaRegions } from '@nop-chaos/flux-core';

function normalizeBooleanLikeField(record: Record<string, unknown>, key: string) {
  const value = record[key];
  if (value === undefined) {
    return;
  }

  record[key] = { __nopPreserveLiteral: true, value: value === true };
}

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
  {
    key: 'body',
    regionKeySuffix: 'quickEditBody',
    compiledKey: 'quickEditBodyRegionKey',
  },
] as const;

export const TABS_ITEM_REGION_FIELDS = [
  {
    key: 'title',
    regionKeySuffix: 'title',
    compiledKey: 'titleRegionKey',
    params: ['item', 'index', 'key'] as readonly string[],
  },
  {
    key: 'body',
    regionKeySuffix: 'body',
    compiledKey: 'bodyRegionKey',
    params: ['item', 'index', 'key'] as readonly string[],
  },
  {
    key: 'toolbar',
    regionKeySuffix: 'toolbar',
    compiledKey: 'toolbarRegionKey',
    params: ['item', 'index', 'key'] as readonly string[],
  },
] as const;

export const TABS_ITEM_BOOLEAN_FIELDS = ['disabled'] as const;

export const VARIANT_ITEM_REGION_FIELDS = [
  { key: 'content', regionKeySuffix: 'content', compiledKey: 'contentRegionKey' },
  { key: 'viewer', regionKeySuffix: 'viewer', compiledKey: 'viewerRegionKey' },
] as const;

export type DeepFieldNormalizer = (input: {
  value: unknown;
  path: string;
  regions: Record<string, TemplateRegion>;
  compileSchema: (
    input: SchemaInput,
    options?: CompileSchemaOptions,
    regionMeta?: { params?: readonly string[]; isolate?: boolean },
  ) => TemplateNode | TemplateNode[];
}) => unknown;

function normalizeTableColumns(
  value: unknown,
  path: string,
  regions: Record<string, TemplateRegion>,
  compileSchema: (
    input: SchemaInput,
    options?: CompileSchemaOptions,
    regionMeta?: { params?: readonly string[]; isolate?: boolean },
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
    regionMeta?: { params?: readonly string[]; isolate?: boolean },
  ) => TemplateNode | TemplateNode[],
) {
  if (!Array.isArray(value)) {
    return value;
  }

  return value.map((item, index) => {
    if (!item || typeof item !== 'object') {
      return item;
    }

    const normalized = extractNestedSchemaRegions({
      candidate: item as Record<string, unknown>,
      itemRegionPath: `${path}.items[${index}]`,
      itemRegionKeyPrefix: `items.${index}`,
      rules: TABS_ITEM_REGION_FIELDS,
      regions,
      compileSchema,
    }).value as Record<string, unknown>;

    normalizeBooleanLikeField(normalized, 'disabled');
    return normalized;
  });
}

function normalizeVariantItems(
  value: unknown,
  path: string,
  regions: Record<string, TemplateRegion>,
  compileSchema: (
    input: SchemaInput,
    options?: CompileSchemaOptions,
    regionMeta?: { params?: readonly string[]; isolate?: boolean },
  ) => TemplateNode | TemplateNode[],
) {
  if (!Array.isArray(value)) {
    return value;
  }

  return value.map((item, index) => {
    if (!item || typeof item !== 'object') {
      return item;
    }

    const normalized = extractNestedSchemaRegions({
      candidate: item as Record<string, unknown>,
      itemRegionPath: `${path}.variants[${index}]`,
      itemRegionKeyPrefix: `variants.${index}`,
      rules: VARIANT_ITEM_REGION_FIELDS,
      regions,
      compileSchema,
    }).value as Record<string, unknown>;

    const match = normalized.match as { kind?: unknown; when?: unknown } | undefined;
    if (!match || typeof match !== 'object' || Array.isArray(match)) {
      return normalized;
    }

    if (match.kind !== 'expression' || typeof match.when !== 'string') {
      return normalized;
    }

    return {
      ...normalized,
      match: {
        ...match,
        // Preserve expression match source for runtime variant detection.
        when: { __nopPreserveLiteral: true, value: match.when },
      },
    };
  });
}

function normalizeTableExpandable(
  value: unknown,
  path: string,
  regions: Record<string, TemplateRegion>,
  compileSchema: (
    input: SchemaInput,
    options?: CompileSchemaOptions,
    regionMeta?: { params?: readonly string[]; isolate?: boolean },
  ) => TemplateNode | TemplateNode[],
) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return value;
  }

  return extractNestedSchemaRegions({
    candidate: value as Record<string, unknown>,
    itemRegionPath: `${path}.expandable`,
    itemRegionKeyPrefix: 'expandable',
    rules: [
      {
        key: 'expandedRow',
        regionKeySuffix: 'expandedRow',
        compiledKey: 'expandedRowRegionKey',
        params: ['record', 'index'] as readonly string[],
        isolate: true,
      },
    ],
    regions,
    compileSchema,
  }).value;
}

export const DEEP_FIELD_NORMALIZERS: Record<string, Record<string, DeepFieldNormalizer>> = {
  table: {
    columns(input) {
      return normalizeTableColumns(input.value, input.path, input.regions, input.compileSchema);
    },
    expandable(input) {
      return normalizeTableExpandable(input.value, input.path, input.regions, input.compileSchema);
    },
  },
  crud: {
    columns(input) {
      return normalizeTableColumns(input.value, input.path, input.regions, input.compileSchema);
    },
  },
  tabs: {
    items(input) {
      return normalizeTabsItems(input.value, input.path, input.regions, input.compileSchema);
    },
  },
  'variant-field': {
    variants(input) {
      return normalizeVariantItems(input.value, input.path, input.regions, input.compileSchema);
    },
  },
};
