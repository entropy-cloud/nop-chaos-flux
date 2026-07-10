/**
 * generate-types.mjs
 *
 * Reads RendererDefinition objects from the *registered in-memory* registry
 * (built dist/, via loadRegisteredDefinitions) and generates:
 *   1. flux-guide/flux-types/schema.d.ts  — TypeScript type definitions
 *   2. flux-guide/flux-types/index.ts      — exports + FluxSchema union & map
 *
 * Uses the executed registry (not source-text parsing), so helper-function
 * prop contracts, spreads, and .concat field lists are fully resolved.
 *
 * Prerequisite: `pnpm build` so each package's dist/ exists.
 * Usage: node --experimental-loader ./scripts/css-stub.mjs scripts/generate-types.mjs
 *        (or: pnpm --dir flux-guide generate-types)
 */

import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  loadRegisteredDefinitions,
  resolveFieldType,
  shapeToTS,
  toPascalCase,
} from './shared.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../..');
const SCHEMA_DTS_PATH = resolve(REPO_ROOT, 'flux-guide/flux-types/schema.d.ts');
const INDEX_TS_PATH = resolve(REPO_ROOT, 'flux-guide/flux-types/index.ts');

// ─── Organize definitions by package ────────────────────────────────────────

const PACKAGE_CATEGORY = {
  'flux-renderers-basic': 'basic',
  'flux-renderers-layout': 'layout',
  'flux-renderers-form': 'form',
  'flux-renderers-form-advanced': 'form-advanced',
  'flux-renderers-data': 'data',
  'flux-renderers-content': 'content',
  'flux-renderers-mobile': 'mobile',
  'flux-code-editor': 'code-editor',
};

const CATEGORY_COMMENTS = {
  'basic': 'Basic — structural/display, flux-renderers-basic',
  'layout': 'Layout — flux-renderers-layout',
  'form': 'Form — flux-renderers-form',
  'form-advanced': 'Form Advanced — flux-renderers-form-advanced',
  'data': 'Data — flux-renderers-data',
  'content': 'Content/Display — flux-renderers-content',
  'mobile': 'Mobile — flux-renderers-mobile',
  'code-editor': 'Code Editor — flux-code-editor (lazy-loaded CodeMirror)',
};

// ─── Name overrides for TS interface names ──────────────────────────────────

const NAME_OVERRIDES = {
  'input-text': 'InputTextSchema',
  'input-password': 'InputPasswordSchema',
  'input-email': 'InputEmailSchema',
  'input-number': 'InputNumberSchema',
  'input-date': 'InputDateSchema',
  'input-datetime': 'InputDatetimeSchema',
  'input-time': 'InputTimeSchema',
  'input-month': 'InputMonthSchema',
  'input-quarter': 'InputQuarterSchema',
  'input-year': 'InputYearSchema',
  'input-file': 'InputFileSchema',
  'input-image': 'InputImageSchema',
  'input-tree': 'InputTreeSchema',
  'input-table': 'InputTableSchema',
  'tree-select': 'TreeSelectSchema',
  'data-source': 'DataSourceSchema',
  'markdown-editor': 'MarkdownEditorSchema',
  'dynamic-renderer': 'DynamicRendererSchema',
  'input': 'InputSchema',
  'pull-refresh': 'PullRefreshSchema',
  'infinite-scroll': 'InfiniteScrollSchema',
  'swipe-cell': 'SwipeCellSchema',
  'notice-bar': 'NoticeBarSchema',
  'scope-debug': 'ScopeDebugSchema',
  'detail-view': 'DetailViewSchema',
  'detail-field': 'DetailFieldSchema',
  'object-field': 'ObjectFieldSchema',
  'array-field': 'ArrayFieldSchema',
  'variant-field': 'VariantFieldSchema',
  'button-group': 'ButtonGroupSchema',
  'dropdown-button': 'DropdownButtonSchema',
  'json-view': 'JsonViewSchema',
  'qrcode': 'QrCodeSchema',
  'date-range': 'DateRangeSchema',
  'condition-builder': 'ConditionBuilderSchema',
  'input-period': 'InputPeriodSchema',
};

function getInterfaceName(type) {
  if (NAME_OVERRIDES[type]) return NAME_OVERRIDES[type];
  return toPascalCase(type) + 'Schema';
}

// ─── Build the base fields common to all schemas ────────────────────────────

const BASE_TYPE_FIELDS = new Set([
  'type', 'id', 'name', 'label', 'title', 'className', 'frameClassName',
  'classAliases', 'when', 'visible', 'hidden', 'disabled', 'testid',
  'frameWrap', 'validateOn', 'showErrorOn', 'onMount', 'onUnmount',
  'xui:imports', 'data',
]);

const BOUND_FIELD_EXTRA = new Set([
  'readOnly', 'required', 'mode', 'labelAlign', 'labelWidth',
  'hint', 'description', 'remark', 'labelRemark',
]);

// ─── Generate schema interface for one definition ───────────────────────────

function generateInterface(def) {
  const typeName = getInterfaceName(def.type);
  const fields = def.fields || [];
  const propContracts = def.propContracts || {};
  const eventContracts = def.eventContracts || {};

  // Determine base class
  const isFormField = def.category === 'form' || def.sourcePackage?.includes('flux-renderers-form');
  const baseClass = isFormField ? 'BoundFieldSchemaBase' : 'BaseSchema';

  const lines = [];

  // Preamble
  lines.push(`export interface ${typeName} extends ${baseClass} {`);
  lines.push(`  type: '${def.type}';`);

  const seenKeys = new Set(BASE_TYPE_FIELDS);
  if (isFormField) for (const k of BOUND_FIELD_EXTRA) seenKeys.add(k);

  // Process from `fields` array (order matters)
  for (const field of fields) {
    if (seenKeys.has(field.key)) continue;
    seenKeys.add(field.key);

    let tsType = resolveFieldType(field, propContracts, eventContracts);
    lines.push(`  ${field.key}?: ${tsType};`);
  }

  // Additional keys from propContracts not in fields
  for (const [key, contract] of Object.entries(propContracts)) {
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);

    // Try to find a matching field rule
    const matchingField = fields.find(f => f.key === key);
    const valueType = matchingField?.valueType;
    const tsType = contractToFieldType2(contract.shape, valueType);
    lines.push(`  ${key}?: ${tsType};`);
  }

  // Additional keys from eventContracts not in fields
  for (const key of Object.keys(eventContracts)) {
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    lines.push(`  ${key}?: ActionSchema | ActionSchema[];`);
  }

  lines.push('}');
  return { typeName, lines: lines.join('\n') };
}

function contractToFieldType2(shape, valueType) {
  if (valueType === 'boolean') return 'boolean | string';
  if (valueType === 'string') return 'string';
  switch (shape.kind) {
    case 'boolean': return 'boolean';
    case 'string': return 'string';
    case 'number': return 'number';
    default: return shapeToTS(shape);
  }
}

// ─── Group definitions by package category ──────────────────────────────────

function categorizeDef(def) {
  const pkg = def.sourcePackage || '';
  for (const [prefix, cat] of Object.entries(PACKAGE_CATEGORY)) {
    if (pkg.includes(prefix)) return cat;
  }
  // Fallback - check type patterns
  if (def.type === 'data-source') return 'data';
  if (def.type === 'service' || def.type === 'pagination') return 'data';
  if (def.type === 'dialog' || def.type === 'drawer') return 'basic';
  if (['wizard', 'grid', 'collapse'].includes(def.type)) return 'layout';
  if (['input-text', 'input-password', 'input-number', 'textarea',
       'select', 'checkbox', 'switch', 'radio-group', 'form',
       'fieldset', 'input-date', 'input-datetime', 'input-time',
       'date-range', 'input-file', 'input-image'].includes(def.type)) return 'form';
  return 'basic';
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('Loading registered renderer definitions from dist...');
  const defs = await loadRegisteredDefinitions();
  console.log(`  Loaded ${defs.length} definition(s)`);

  // Generate interfaces
  const interfaces = [];
  const typeNameMap = {}; // type -> interface name

  for (const def of defs) {
    const result = generateInterface(def);
    interfaces.push(result);
    typeNameMap[def.type] = result.typeName;
  }

  // Group by category
  const grouped = {};
  for (const def of defs) {
    const cat = categorizeDef(def);
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(def);
  }

  // ── Write schema.d.ts ──
  const lines = [];
  lines.push('/* eslint-disable max-lines */');
  lines.push('/**');
  lines.push(' * AUTO-GENERATED by flux-guide/scripts/generate-types.mjs');
  lines.push(' * Do not edit manually. Regenerate with: node flux-guide/scripts/generate-types.mjs');
  lines.push(' *');
  lines.push(' * Based on RendererDefinition.propContracts + .fields from source packages.');
  lines.push(' */');
  lines.push('');
  lines.push('import type {');
  lines.push('  BaseSchema,');
  lines.push('  BoundFieldSchemaBase,');
  lines.push('  SchemaInput,');
  lines.push('  SchemaValue,');
  lines.push('  ActionSchema,');
  lines.push('} from \'./common\';');
  lines.push('');

  const catOrder = ['basic', 'layout', 'form', 'form-advanced', 'data', 'content', 'mobile', 'code-editor'];

  for (const cat of catOrder) {
    const catDefs = grouped[cat];
    if (!catDefs || catDefs.length === 0) continue;

    lines.push('// ============================================================================');
    lines.push(`// ${CATEGORY_COMMENTS[cat] || cat}`);
    lines.push('// ============================================================================');
    lines.push('');

    for (const def of catDefs) {
      const result = generateInterface(def);
      lines.push(result.lines);
      lines.push('');
    }
  }

  const output = lines.join('\n');
  writeFileSync(SCHEMA_DTS_PATH, output, 'utf-8');
  console.log(`  Wrote ${SCHEMA_DTS_PATH} (${output.length} bytes)`);

  // ── Write index.ts ──
  generateIndex(defs, typeNameMap);
}

function generateIndex(defs, typeNameMap) {
  const schemaTypeNames = Object.values(typeNameMap)
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort();

  const fluxSchemaTypes = defs.map(d => `  | ${typeNameMap[d.type]}`);
  const fluxSchemaByTypeEntries = defs.map(d => `  '${d.type}': ${typeNameMap[d.type]};`);

  const content = `// ── AUTO-GENERATED by flux-guide/scripts/generate-types.mjs ──
// Do not edit manually. Regenerate with: node flux-guide/scripts/generate-types.mjs

import type {
${schemaTypeNames.map(n => `  ${n},`).join('\n')}
} from './schema';

export type FluxSchema =
${fluxSchemaTypes.join('\n')};

export interface FluxSchemaByType {
${fluxSchemaByTypeEntries.join('\n')}
}

export type {
${schemaTypeNames.map(n => `  ${n},`).join('\n')}
} from './schema';
`;

  writeFileSync(INDEX_TS_PATH, content, 'utf-8');
  console.log(`  Wrote ${INDEX_TS_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
