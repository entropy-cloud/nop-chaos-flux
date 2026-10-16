import { readFile } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = join(__dirname, '..');

// RM-4 (plan 606): prop-contract assertions re-anchored from the removed
// `propContracts` records to the absorbed `fields` entries (contract objects
// carried verbatim; the editorType finiteness assertions keep their meaning).
const checks = [
  {
    file: 'packages/flux-renderers-basic/src/schemas.ts',
    schemaPattern:
      /export interface ButtonSchema[\s\S]*?variant\?:\s*'default'\s*\|\s*'primary'\s*\|\s*'destructive'\s*\|\s*'outline'\s*\|\s*'secondary'\s*\|\s*'ghost'\s*\|\s*'link'[\s\S]*?size\?:\s*'default'\s*\|\s*'xs'\s*\|\s*'sm'\s*\|\s*'lg'\s*\|\s*'icon'\s*\|\s*'icon-xs'\s*\|\s*'icon-sm'\s*\|\s*'icon-lg'/,
    contractFile: 'packages/flux-renderers-basic/src/basic-renderer-definitions.ts',
    contractPattern:
      /type:\s*'button'[\s\S]*?key:\s*'variant'[\s\S]*?editorType:\s*'select'[\s\S]*?key:\s*'size'[\s\S]*?editorType:\s*'select'/,
    label: 'button.variant + button.size',
  },
  {
    file: 'packages/flux-renderers-basic/src/schemas.ts',
    schemaPattern: /export interface TabsSchema[\s\S]*?variant\?:\s*'default'\s*\|\s*'line'/,
    contractFile: 'packages/flux-renderers-basic/src/tabs-renderer-definition.ts',
    contractPattern: /type:\s*'tabs'[\s\S]*?key:\s*'orientation'[\s\S]*?editorType:\s*'select'[\s\S]*?key:\s*'variant'[\s\S]*?editorType:\s*'select'/,
    label: 'tabs.variant',
  },
  {
    file: 'packages/flux-renderers-form/src/schemas.ts',
    schemaPattern: /export interface FormSchema[\s\S]*?mode\?:\s*'normal'\s*\|\s*'horizontal'[\s\S]*?labelAlign\?:\s*'top'\s*\|\s*'left'\s*\|\s*'right'/,
    contractFile: 'packages/flux-renderers-form/src/renderers/form-definition.ts',
    contractPattern: /key:\s*'mode'[\s\S]*?editorType:\s*'select'[\s\S]*?key:\s*'labelAlign'[\s\S]*?editorType:\s*'select'/,
    label: 'form.mode + form.labelAlign',
  },
  {
    file: 'packages/flux-renderers-data/src/schemas.ts',
    // RM-11 (plan 613): ownership fields reference the single-source OwnershipMode
    // union instead of inline literals — the finite-vocabulary intent is preserved
    // (and strengthened: one named type, no per-field literal drift).
    schemaPattern:
      /export interface TableSchema[\s\S]*?paginationOwnership\?:\s*OwnershipMode[\s\S]*?selectionOwnership\?:\s*OwnershipMode[\s\S]*?sortOwnership\?:\s*OwnershipMode[\s\S]*?filterOwnership\?:\s*OwnershipMode/,
    contractFile: 'packages/flux-renderers-data/src/data-renderer-definitions.ts',
    contractPattern:
      /type:\s*'table'[\s\S]*?key:\s*'paginationOwnership'[\s\S]*?editorType:\s*'select'[\s\S]*?key:\s*'selectionOwnership'[\s\S]*?editorType:\s*'select'[\s\S]*?key:\s*'sortOwnership'[\s\S]*?editorType:\s*'select'[\s\S]*?key:\s*'filterOwnership'[\s\S]*?editorType:\s*'select'/,
    label: 'table ownership finite fields',
  },
  {
    file: 'packages/flux-renderers-data/src/crud-schema.ts',
    // RM-11 (plan 613): same OwnershipMode single-source reference as TableSchema.
    schemaPattern: /export interface CrudSchema[\s\S]*?selectionOwnership\?:\s*OwnershipMode[\s\S]*?filterOwnership\?:\s*OwnershipMode/,
    contractFile: 'packages/flux-renderers-data/src/crud-renderer-definition.ts',
    contractPattern: /key:\s*'selectionOwnership'[\s\S]*?editorType:\s*'select'[\s\S]*?key:\s*'filterOwnership'[\s\S]*?editorType:\s*'select'/,
    label: 'crud ownership finite fields',
  },
  {
    file: 'packages/flux-renderers-data/src/crud-renderer-definition.ts',
    schemaPattern: /pagination:\s*\{[\s\S]*?kind:\s*'union'[\s\S]*?value:\s*'pages'[\s\S]*?value:\s*'infinite'/,
    contractFile: 'packages/flux-renderers-data/src/crud-renderer-definition.ts',
    contractPattern: /pagination:\s*\{[\s\S]*?kind:\s*'union'[\s\S]*?value:\s*'pages'[\s\S]*?value:\s*'infinite'/,
    label: 'crud pagination.mode finite union',
  },
  {
    file: 'packages/flux-renderers-basic/src/schemas.ts',
    schemaPattern:
      /export interface DialogSchema[\s\S]*?size\?:\s*SurfaceSize[\s\S]*?footerClassName\?:\s*string[\s\S]*?export interface DrawerSchema[\s\S]*?size\?:\s*SurfaceSize/,
    contractFile: 'packages/flux-renderers-basic/src/surface-renderer-definitions.ts',
    contractPattern:
      /sizePropContract[\s\S]*?value:\s*'xs'[\s\S]*?value:\s*'sm'[\s\S]*?value:\s*'md'[\s\S]*?value:\s*'lg'[\s\S]*?value:\s*'xl'[\s\S]*?value:\s*'full'[\s\S]*?contract:\s*sizePropContract/,
    label: 'dialog.size + drawer.size finite union',
  },
  {
    file: 'packages/report-designer-renderers/src/schemas.ts',
    schemaPattern: /intent\?:\s*ActionIntent/,
    contractFile: 'packages/report-designer-renderers/src/renderers.tsx',
    contractPattern: /type:\s*'report-toolbar'[\s\S]*?key:\s*'itemsOverride'[\s\S]*?intent:\s*actionIntentShape/,
    label: 'report-toolbar intent',
  },
];

async function read(relPath) {
  return readFile(join(rootDir, relPath), 'utf8');
}

async function main() {
  const failures = [];

  for (const check of checks) {
    const schemaContent = await read(check.file);
    const contractContent = await read(check.contractFile);

    if (!check.schemaPattern.test(schemaContent)) {
      failures.push(`${check.label}: schema pattern missing in ${check.file}`);
    }

    if (!check.contractPattern.test(contractContent)) {
      failures.push(`${check.label}: contract pattern missing in ${check.contractFile}`);
    }
  }

  if (failures.length > 0) {
    for (const failure of failures) {
      console.error(`[check-finite-prop-contracts] ${failure}`);
    }
    process.exit(1);
  }

  console.log('[check-finite-prop-contracts] ok');
}

main().catch((error) => {
  console.error('[check-finite-prop-contracts] failed', error);
  process.exit(1);
});
