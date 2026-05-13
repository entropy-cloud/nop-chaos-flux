import { readdir, readFile } from 'fs/promises';
import path from 'path';
import process from 'process';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = path.join(__dirname, '..');

const scanRoots = ['apps', 'docs', 'packages', 'tests'];
const scanExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.md']);
const ignoreDirectoryNames = new Set([
  '.git',
  '.turbo',
  'coverage',
  'dist',
  'node_modules',
  'temp',
  'test-results',
]);

const ignorePathSubstrings = ['docs/ppts/assets/'];

const args = process.argv.slice(2);
const jsonOutput = args.includes('--json');

function toPosixPath(filePath) {
  return path.relative(rootDir, filePath).split(path.sep).join('/');
}

async function collectFiles(dir) {
  const files = [];
  let entries;

  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return files;
    }
    throw error;
  }

  for (const entry of entries) {
    if (ignoreDirectoryNames.has(entry.name)) {
      continue;
    }

    const fullPath = path.join(dir, entry.name);
    const relPath = toPosixPath(fullPath);
    if (ignorePathSubstrings.some((segment) => relPath.includes(segment))) {
      continue;
    }

    if (entry.isDirectory()) {
      files.push(...(await collectFiles(fullPath)));
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (entry.name.endsWith('.min.js')) {
      continue;
    }

    if (scanExtensions.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

function classifyDefinitionScope(filePath, values) {
  const relPath = toPosixPath(filePath);
  const valueSet = new Set(values);

  if (relPath === 'packages/flux-renderers-basic/src/schemas.ts' && valueSet.has('link')) {
    return 'public-schema:button';
  }
  if (relPath === 'packages/flux-renderers-basic/src/schemas.ts' && valueSet.has('line')) {
    return 'public-schema:tabs';
  }
  if (relPath === 'packages/flow-designer-core/src/types.ts') {
    return 'domain-schema:designer-toolbar';
  }
  if (relPath === 'packages/report-designer-renderers/src/schemas.ts') {
    return 'domain-schema:report-toolbar';
  }
  if (relPath.startsWith('packages/ui/src/components/ui/')) {
    return 'ui-component-private';
  }
  if (relPath.includes('variant-field')) {
    return 'business-data:variant-field';
  }
  if (relPath.includes('/toolbar') || relPath.includes('toolbar-')) {
    return 'ui-helper-private';
  }
  return 'other';
}

function inferUsageBucket(relPath, variantValue, content, line) {
  if (
    relPath === 'packages/flux-renderers-basic/src/schemas.ts' ||
    relPath === 'docs/references/flux-json-conventions.md' ||
    relPath === 'docs/components/button/example.json' ||
    relPath === 'docs/components/form/example.json'
  ) {
    return 'public-button';
  }

  if (relPath === 'packages/flow-designer-core/src/types.ts') {
    return 'designer-toolbar';
  }

  if (
    relPath === 'docs/architecture/flow-designer/config-schema.md' ||
    relPath === 'docs/examples/workflow-designer/config.json' ||
    relPath === 'packages/flow-designer-renderers/src/designer-toolbar.tsx'
  ) {
    return 'designer-toolbar';
  }

  if (relPath === 'packages/report-designer-renderers/src/schemas.ts') {
    return 'report-toolbar';
  }

  if (relPath === 'packages/flux-renderers-basic/src/tabs.tsx' || relPath.endsWith('/ui/tabs.tsx')) {
    return 'tabs';
  }

  if (relPath.includes('variant-field')) {
    return 'business-data:variant-field';
  }

  if (relPath.endsWith('/ui/button.tsx') || relPath.includes('wrapped-field-action.tsx')) {
    return 'button-implementation';
  }

  if (relPath.endsWith('/ui/badge.tsx')) {
    return 'badge-implementation';
  }

  if (variantValue === 'accent' || variantValue === 'primary' || variantValue === 'danger') {
    if (line.includes('toolbar') || content.includes('designer:') || content.includes('report-toolbar')) {
      return 'domain-toolbar-like';
    }
  }

  if (
    variantValue === 'default' ||
    variantValue === 'destructive' ||
    variantValue === 'outline' ||
    variantValue === 'secondary' ||
    variantValue === 'ghost' ||
    variantValue === 'link'
  ) {
    return 'button-like';
  }

  return 'other';
}

function lineNumberAt(content, index) {
  let line = 1;
  for (let i = 0; i < index; i++) {
    if (content.charCodeAt(i) === 10) {
      line++;
    }
  }
  return line;
}

function getLine(content, lineNumber) {
  const lines = content.split(/\r?\n/);
  return lines[lineNumber - 1] ?? '';
}

function extractUnionValues(unionText) {
  return [...unionText.matchAll(/'([^']+)'/g)].map((match) => match[1]);
}

function stripQuotedText(input) {
  return input.replace(/'[^'\\]*(?:\\.[^'\\]*)*'|"[^"\\]*(?:\\.[^"\\]*)*"|`[^`\\]*(?:\\.[^`\\]*)*`/g, '');
}

function uniqueSorted(values) {
  return [...new Set(values)].sort();
}

function addCount(map, key, delta = 1) {
  map.set(key, (map.get(key) ?? 0) + delta);
}

function pushSample(map, key, sample, limit = 5) {
  if (!map.has(key)) {
    map.set(key, []);
  }
  const list = map.get(key);
  if (list.length < limit) {
    list.push(sample);
  }
}

async function main() {
  const files = [];
  for (const root of scanRoots) {
    files.push(...(await collectFiles(path.join(rootDir, root))));
  }

  const definitionRecords = [];
  const definitionValuesByScope = new Map();
  const definitionSamplesByScope = new Map();

  const usageCountsByValue = new Map();
  const usageBuckets = new Map();
  const usageSamplesByValue = new Map();

  for (const filePath of files) {
    const relPath = toPosixPath(filePath);
    let content;

    try {
      content = await readFile(filePath, 'utf8');
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
        continue;
      }
      throw error;
    }

    const unionRegex = /variant\??\s*:\s*('(?:[^']+)'(?:\s*\|\s*'[^']+')*)/g;
    for (const match of content.matchAll(unionRegex)) {
      const values = uniqueSorted(extractUnionValues(match[1]));
      if (values.length === 0) {
        continue;
      }
      const lineNumber = lineNumberAt(content, match.index ?? 0);
      const scope = classifyDefinitionScope(filePath, values);
      const record = {
        file: relPath,
        line: lineNumber,
        scope,
        values,
      };
      definitionRecords.push(record);
      if (!definitionValuesByScope.has(scope)) {
        definitionValuesByScope.set(scope, new Set());
      }
      for (const value of values) {
        definitionValuesByScope.get(scope).add(value);
      }
      pushSample(definitionSamplesByScope, scope, `${relPath}:${lineNumber} -> ${values.join(', ')}`);
    }

    const cvaVariantBlockRegex = /variants\s*:\s*\{[\s\S]*?variant\s*:\s*\{([\s\S]*?)\}\s*,[\s\S]*?defaultVariants/g;
    for (const match of content.matchAll(cvaVariantBlockRegex)) {
      const block = stripQuotedText(match[1]);
      const values = uniqueSorted(
        [...block.matchAll(/^\s*([a-zA-Z][\w-]*)\s*:/gm)].map((entry) => entry[1]),
      );
      if (values.length === 0) {
        continue;
      }
      const lineNumber = lineNumberAt(content, match.index ?? 0);
      const scope = classifyDefinitionScope(filePath, values);
      const record = {
        file: relPath,
        line: lineNumber,
        scope: `${scope}:cva`,
        values,
      };
      definitionRecords.push(record);
      if (!definitionValuesByScope.has(record.scope)) {
        definitionValuesByScope.set(record.scope, new Set());
      }
      for (const value of values) {
        definitionValuesByScope.get(record.scope).add(value);
      }
      pushSample(definitionSamplesByScope, record.scope, `${relPath}:${lineNumber} -> ${values.join(', ')}`);
    }

    const usageRegex = /(?:variant\s*=\s*|"variant"\s*:\s*|'variant'\s*:\s*|variant\s*:\s*)['"]([^'"]+)['"]/g;
    for (const match of content.matchAll(usageRegex)) {
      const variantValue = match[1];
      const lineNumber = lineNumberAt(content, match.index ?? 0);
      const line = getLine(content, lineNumber).trim();
      addCount(usageCountsByValue, variantValue);
      const bucket = inferUsageBucket(relPath, variantValue, content, line);
      if (!usageBuckets.has(bucket)) {
        usageBuckets.set(bucket, new Map());
      }
      addCount(usageBuckets.get(bucket), variantValue);
      pushSample(usageSamplesByValue, variantValue, `${relPath}:${lineNumber} ${line}`);
    }
  }

  definitionRecords.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);

  const normalizedDefinitionScopes = [...definitionValuesByScope.entries()]
    .map(([scope, values]) => ({ scope, values: uniqueSorted([...values]) }))
    .sort((a, b) => a.scope.localeCompare(b.scope));

  const normalizedUsageCounts = [...usageCountsByValue.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));

  const normalizedBuckets = [...usageBuckets.entries()]
    .map(([bucket, counts]) => ({
      bucket,
      values: [...counts.entries()]
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value)),
    }))
    .sort((a, b) => a.bucket.localeCompare(b.bucket));

  const publicButtonValues =
    normalizedDefinitionScopes.find((entry) => entry.scope === 'public-schema:button')?.values ?? [];
  const designerValues =
    normalizedDefinitionScopes.find((entry) => entry.scope === 'domain-schema:designer-toolbar')
      ?.values ?? [];
  const reportValues =
    normalizedDefinitionScopes.find((entry) => entry.scope === 'domain-schema:report-toolbar')
      ?.values ?? [];
  const tabsValues =
    normalizedDefinitionScopes.find((entry) => entry.scope === 'public-schema:tabs')?.values ?? [];

  const overlaps = {
    publicButtonAndDesigner: publicButtonValues.filter((value) => designerValues.includes(value)),
    publicButtonAndReport: publicButtonValues.filter((value) => reportValues.includes(value)),
    designerAndReport: designerValues.filter((value) => reportValues.includes(value)),
  };

  const result = {
    summary: {
      filesScanned: files.length,
      definitionCount: definitionRecords.length,
      usageValueCount: normalizedUsageCounts.length,
      recommendedLayers: [
        'schema-public variants: component contract values exposed to authored schema',
        'domain-local variants: toolbar/workbench semantic vocabulary owned by one domain',
        'ui-private variants: cva/internal component-only styling tokens',
      ],
    },
    definitions: {
      scopes: normalizedDefinitionScopes,
      records: definitionRecords,
      samplesByScope: Object.fromEntries(
        [...definitionSamplesByScope.entries()].sort((a, b) => a[0].localeCompare(b[0])),
      ),
      overlaps,
    },
    usage: {
      values: normalizedUsageCounts,
      buckets: normalizedBuckets,
      samplesByValue: Object.fromEntries(
        [...usageSamplesByValue.entries()].sort((a, b) => a[0].localeCompare(b[0])),
      ),
    },
  };

  if (jsonOutput) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log('Variant Vocabulary Analysis');
  console.log('='.repeat(80));
  console.log(`Files scanned: ${result.summary.filesScanned}`);
  console.log(`Definition records: ${result.summary.definitionCount}`);
  console.log(`Distinct used variant values: ${result.summary.usageValueCount}`);
  console.log('');
  console.log('Recommended normalization layers:');
  for (const layer of result.summary.recommendedLayers) {
    console.log(`- ${layer}`);
  }

  console.log('\nDefinition scopes:');
  for (const scope of normalizedDefinitionScopes) {
    console.log(`- ${scope.scope}: ${scope.values.join(', ') || '(none)'}`);
  }

  console.log('\nKnown overlaps:');
  console.log(
    `- public button ∩ designer toolbar: ${overlaps.publicButtonAndDesigner.join(', ') || '(none)'}`,
  );
  console.log(
    `- public button ∩ report toolbar: ${overlaps.publicButtonAndReport.join(', ') || '(none)'}`,
  );
  console.log(`- designer toolbar ∩ report toolbar: ${overlaps.designerAndReport.join(', ') || '(none)'}`);

  console.log('\nUsage counts by value:');
  for (const item of normalizedUsageCounts) {
    console.log(`- ${item.value}: ${item.count}`);
  }

  console.log('\nUsage buckets:');
  for (const bucket of normalizedBuckets) {
    const renderedValues = bucket.values.map((item) => `${item.value}(${item.count})`).join(', ');
    console.log(`- ${bucket.bucket}: ${renderedValues || '(none)'}`);
  }

  console.log('\nDefinition samples:');
  for (const [scope, samples] of [...definitionSamplesByScope.entries()].sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    console.log(`- ${scope}`);
    for (const sample of samples) {
      console.log(`  ${sample}`);
    }
  }

  console.log('\nUsage samples by value:');
  for (const [value, samples] of [...usageSamplesByValue.entries()].sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    console.log(`- ${value}`);
    for (const sample of samples) {
      console.log(`  ${sample}`);
    }
  }
}

main().catch((error) => {
  console.error('[analyze-variant-vocabulary] failed', error);
  process.exit(1);
});
