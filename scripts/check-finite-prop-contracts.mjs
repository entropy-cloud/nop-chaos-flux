import { readFile } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = join(__dirname, '..');

const checks = [
  {
    file: 'packages/flux-renderers-basic/src/schemas.ts',
    schemaPattern: /export interface ButtonSchema[\s\S]*?variant\?:\s*'default'\s*\|\s*'destructive'\s*\|\s*'outline'\s*\|\s*'secondary'\s*\|\s*'ghost'\s*\|\s*'link'/,
    contractFile: 'packages/flux-renderers-basic/src/basic-renderer-definitions.ts',
    contractPattern: /type:\s*'button'[\s\S]*?propContracts:\s*\{[\s\S]*?variant:\s*\{[\s\S]*?editorType:\s*'select'[\s\S]*?kind:\s*'union'/,
    label: 'button.variant',
  },
  {
    file: 'packages/flux-renderers-basic/src/schemas.ts',
    schemaPattern: /export interface TabsSchema[\s\S]*?variant\?:\s*'default'\s*\|\s*'line'/,
    contractFile: 'packages/flux-renderers-basic/src/basic-renderer-definitions.ts',
    contractPattern: /type:\s*'tabs'[\s\S]*?propContracts:\s*\{[\s\S]*?orientation:\s*\{[\s\S]*?editorType:\s*'select'[\s\S]*?variant:\s*\{[\s\S]*?editorType:\s*'select'/,
    label: 'tabs.variant',
  },
  {
    file: 'packages/flux-renderers-form/src/schemas.ts',
    schemaPattern: /export interface FormSchema[\s\S]*?mode\?:\s*'normal'\s*\|\s*'horizontal'[\s\S]*?labelAlign\?:\s*'top'\s*\|\s*'left'\s*\|\s*'right'/,
    contractFile: 'packages/flux-renderers-form/src/renderers/form-definition.ts',
    contractPattern: /propContracts:\s*\{[\s\S]*?mode:\s*\{[\s\S]*?editorType:\s*'select'[\s\S]*?labelAlign:\s*\{[\s\S]*?editorType:\s*'select'/,
    label: 'form.mode + form.labelAlign',
  },
  {
    file: 'packages/flux-renderers-data/src/schemas.ts',
    schemaPattern: /export interface TableSchema[\s\S]*?paginationOwnership\?:\s*'local'\s*\|\s*'controlled'\s*\|\s*'scope'[\s\S]*?filterOwnership\?:\s*'local'\s*\|\s*'controlled'\s*\|\s*'scope'/,
    contractFile: 'packages/flux-renderers-data/src/data-renderer-definitions.ts',
    contractPattern: /type:\s*'table'[\s\S]*?propContracts:\s*\{[\s\S]*?paginationOwnership:\s*\{[\s\S]*?editorType:\s*'select'[\s\S]*?filterOwnership:\s*\{[\s\S]*?editorType:\s*'select'/,
    label: 'table ownership finite fields',
  },
  {
    file: 'packages/flux-renderers-data/src/crud-schema.ts',
    schemaPattern: /export interface CrudSchema[\s\S]*?selectionOwnership\?:\s*'local'\s*\|\s*'controlled'\s*\|\s*'scope'[\s\S]*?filterOwnership\?:\s*'local'\s*\|\s*'controlled'\s*\|\s*'scope'/,
    contractFile: 'packages/flux-renderers-data/src/crud-renderer-definition.ts',
    contractPattern: /propContracts:\s*\{[\s\S]*?selectionOwnership:\s*\{[\s\S]*?editorType:\s*'select'[\s\S]*?filterOwnership:\s*\{[\s\S]*?editorType:\s*'select'/,
    label: 'crud ownership finite fields',
  },
  {
    file: 'packages/report-designer-renderers/src/schemas.ts',
    schemaPattern: /intent\?:\s*ActionIntent/,
    contractFile: 'packages/report-designer-renderers/src/renderers.tsx',
    contractPattern: /type:\s*'report-toolbar'[\s\S]*?itemsOverride:\s*\{[\s\S]*?intent:\s*actionIntentShape/,
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
