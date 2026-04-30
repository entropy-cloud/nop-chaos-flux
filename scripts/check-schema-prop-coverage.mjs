/**
 * Check that every JSON-visible schema property declared in renderer definitions
 * has at least one test that uses it.
 *
 * Coverage model:
 *   - LAYER 1 (universal): BaseSchema properties shared by ALL renderers.
 *     These only need to be tested once across any renderer type.
 *     Includes: META_FIELDS, lifecycle keys, namespaced keys, and other BaseSchema keys.
 *   - LAYER 2 (renderer-specific): Properties declared in a specific renderer's
 *     fields[], propContracts, propSchema, regions, defaultSchema.
 *     Each must be tested for the owning renderer.
 *
 * Usage:
 *   node scripts/check-schema-prop-coverage.mjs [--verbose] [--json]
 *
 * Exit code 1 if any property is uncovered.
 */

import { readFile, readdir } from 'fs/promises';
import { join, extname, relative } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = join(__dirname, '..');

const TEST_EXTENSIONS = ['.test.ts', '.test.tsx'];

const META_FIELDS = new Set(['id', 'className', 'visible', 'hidden', 'disabled', 'testid']);
const LIFECYCLE_KEYS = new Set(['onMount', 'onUnmount']);
const NAMESPACED_KEYS = new Set(['xui:imports', 'xui:actions']);
const BASE_SCHEMA_OPTIONAL_KEYS = new Set([
  'name',
  'label',
  'title',
  'classAliases',
  'frameWrap',
  'validateOn',
  'showErrorOn',
]);
const ALL_UNIVERSAL_KEYS = new Set([
  ...META_FIELDS,
  ...LIFECYCLE_KEYS,
  ...NAMESPACED_KEYS,
  ...BASE_SCHEMA_OPTIONAL_KEYS,
]);

const args = process.argv.slice(2);
const verbose = args.includes('--verbose');
const jsonOutput = args.includes('--json');

// ─── Brace-depth helpers ─────────────────────────────────────────────────────

function findEnclosingObjectStart(content, fromIndex) {
  let depth = 0;
  for (let i = fromIndex; i >= 0; i--) {
    if (content[i] === '}') depth++;
    else if (content[i] === '{') {
      if (depth === 0) return i;
      depth--;
    }
  }
  return -1;
}

function findMatchingBrace(content, openIndex) {
  let depth = 0;
  let inStr = false;
  let sch = '';
  for (let i = openIndex; i < content.length; i++) {
    const ch = content[i];
    const prev = i > 0 ? content[i - 1] : '';
    if ((ch === "'" || ch === '"' || ch === '`') && prev !== '\\') {
      if (!inStr) {
        inStr = true;
        sch = ch;
      } else if (ch === sch) inStr = false;
      continue;
    }
    if (inStr) continue;
    if (ch === '{' || ch === '[') depth++;
    else if (ch === '}' || ch === ']') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function findMatchingBracket(content, openIndex) {
  return findMatchingBrace(content, openIndex);
}

function findArrayContent(text, fieldName) {
  const re = new RegExp(fieldName + '\\s*:\\s*\\[');
  const m = re.exec(text);
  if (!m) return null;
  const start = text.indexOf('[', m.index + fieldName.length);
  const end = findMatchingBracket(text, start);
  if (end === -1) return null;
  return text.slice(start + 1, end);
}

// ─── Phase 1: Extract declared keys ──────────────────────────────────────────

function extractKeysFromRendererObject(objText) {
  const keys = new Set();

  // defaultSchema: { key: val, ... }
  const dsMatch = objText.match(/defaultSchema\s*:\s*\{/);
  if (dsMatch) {
    const si = objText.indexOf('{', dsMatch.index + dsMatch[0].length - 1);
    const ei = findMatchingBrace(objText, si);
    if (ei !== -1) {
      const inner = objText.slice(si + 1, ei);
      for (const m of inner.matchAll(/(\w+)\s*:/g)) {
        if (m[1] !== 'type') keys.add(m[1]);
      }
    }
  }

  // regions: ['key1', 'key2']
  const regArr = findArrayContent(objText, 'regions');
  if (regArr) {
    for (const m of regArr.matchAll(/['"](\w+)['"]/g)) keys.add(m[1]);
  }

  // fields: [ { key: 'xxx', ... }, ... ]
  const fieldsArr = findArrayContent(objText, 'fields');
  if (fieldsArr) {
    for (const m of fieldsArr.matchAll(/key\s*:\s*['"]([^'"]+)['"]/g)) keys.add(m[1]);
  }

  // propContracts: { key: { ... }, ... }
  const pcMatch = objText.match(/propContracts\s*:\s*\{/);
  if (pcMatch) {
    const si = objText.indexOf('{', pcMatch.index + pcMatch[0].length - 1);
    const ei = findMatchingBrace(objText, si);
    if (ei !== -1) {
      const inner = objText.slice(si + 1, ei);
      for (const m of inner.matchAll(/^\s*(\w+)\s*:\s*\{/gm)) keys.add(m[1]);
    }
  }

  // propSchema: { key: { ... }, ... }
  const psMatch = objText.match(/propSchema\s*:\s*\{/);
  if (psMatch) {
    const si = objText.indexOf('{', psMatch.index + psMatch[0].length - 1);
    const ei = findMatchingBrace(objText, si);
    if (ei !== -1) {
      const inner = objText.slice(si + 1, ei);
      for (const m of inner.matchAll(/^\s*(\w+)\s*:\s*[\{\[]/gm)) keys.add(m[1]);
    }
  }

  return keys;
}

function extractRenderersFromFile(content) {
  const renderers = new Map();
  const typeRe = /type\s*:\s*['"]([^'"]+)['"]/g;
  let tm;
  while ((tm = typeRe.exec(content)) !== null) {
    const typeName = tm[1];
    const objStart = findEnclosingObjectStart(content, tm.index);
    if (objStart === -1) continue;
    const objEnd = findMatchingBrace(content, objStart);
    if (objEnd === -1) continue;
    const objText = content.slice(objStart, objEnd + 1);
    if (objText.length > 15000) continue;
    const keys = extractKeysFromRendererObject(objText);
    if (keys.size > 0) {
      renderers.set(typeName, keys);
    }
  }
  return renderers;
}

// ─── Phase 2: Scan test files ────────────────────────────────────────────────

const ACTION_TYPES = new Set([
  'ajax',
  'setValue',
  'setValues',
  'submitForm',
  'openDialog',
  'openDrawer',
  'closeDialog',
  'closeDrawer',
  'closeSurface',
  'showToast',
  'navigate',
  'refreshTable',
  'refreshSource',
  'submit',
  'source',
]);

function extractObjectKeys(objText) {
  const keys = new Set();
  const re = /(?:['"]([^'"]+)['"]|(\w+))\s*:/g;
  let m;
  while ((m = re.exec(objText)) !== null) {
    const key = m[1] || m[2];
    if (key && (/[a-zA-Z_$]/.test(key[0]) || key.includes(':'))) {
      keys.add(key);
    }
  }
  return keys;
}

function extractTestKeysFromFile(content) {
  const typeUsage = new Map();
  const typeRe = /type\s*:\s*['"]([^'"]+)['"]/g;
  let tm;
  while ((tm = typeRe.exec(content)) !== null) {
    const typeName = tm[1];
    if (ACTION_TYPES.has(typeName)) continue;
    const objStart = findEnclosingObjectStart(content, tm.index);
    if (objStart === -1) continue;
    const objEnd = findMatchingBrace(content, objStart);
    if (objEnd === -1) continue;
    const objText = content.slice(objStart, objEnd + 1);
    if (objText.length > 10000) continue;
    const keys = extractObjectKeys(objText);
    if (!typeUsage.has(typeName)) typeUsage.set(typeName, new Set());
    for (const k of keys) typeUsage.get(typeName).add(k);
  }
  return typeUsage;
}

// ─── Directory scanning ──────────────────────────────────────────────────────

async function walkTestFiles(dir, visitor) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const fp = join(dir, entry.name);
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue;
    if (entry.isDirectory()) {
      await walkTestFiles(fp, visitor);
      continue;
    }
    if (!TEST_EXTENSIONS.some((e) => entry.name.endsWith(e))) continue;
    try {
      const content = await readFile(fp, 'utf-8');
      await visitor(content, fp);
    } catch {}
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  // Phase 1: Collect declared keys per renderer
  const rendererSpecificKeys = new Map(); // type -> Set<key> (renderer-specific only)

  const rendererFiles = [
    'packages/flux-renderers-basic/src/index.tsx',
    'packages/flux-renderers-form/src/renderers/form-definition.ts',
    'packages/flux-renderers-form/src/renderers/input.tsx',
    'packages/flux-renderers-form/src/renderers/fieldset.tsx',
    'packages/flux-renderers-data/src/index.tsx',
    'packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx',
    'packages/flux-renderers-form-advanced/src/array-editor.tsx',
    'packages/flux-renderers-form-advanced/src/tag-list.tsx',
    'packages/flux-renderers-form-advanced/src/key-value.tsx',
    'packages/flux-renderers-form-advanced/src/condition-builder/condition-builder.tsx',
    'packages/flux-renderers-form-advanced/src/composite-field/object-field.tsx',
    'packages/flux-renderers-form-advanced/src/composite-field/array-field.tsx',
    'packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx',
    'packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx',
    'packages/flux-renderers-form-advanced/src/tree-controls.tsx',
    'packages/flux-code-editor/src/code-editor-renderer.tsx',
  ];

  for (const relPath of rendererFiles) {
    const fullPath = join(rootDir, relPath);
    try {
      const content = await readFile(fullPath, 'utf-8');
      const fileRenderers = extractRenderersFromFile(content);
      for (const [type, rawKeys] of fileRenderers) {
        // Separate: strip universal keys, keep only renderer-specific
        const specific = new Set();
        for (const k of rawKeys) {
          if (!ALL_UNIVERSAL_KEYS.has(k) && k !== 'type') {
            specific.add(k);
          }
        }
        if (!rendererSpecificKeys.has(type)) rendererSpecificKeys.set(type, new Set());
        for (const k of specific) rendererSpecificKeys.get(type).add(k);
      }
    } catch {}
  }

  // Phase 2: Scan test files
  const testedKeys = new Map(); // type -> Set<key>
  const globalTestedKeys = new Set(); // union of all tested keys across all types

  for (const scanDir of ['packages']) {
    await walkTestFiles(join(rootDir, scanDir), (content, fp) => {
      const usage = extractTestKeysFromFile(content);
      for (const [type, keys] of usage) {
        if (!testedKeys.has(type)) testedKeys.set(type, new Set());
        for (const k of keys) {
          testedKeys.get(type).add(k);
          globalTestedKeys.add(k);
        }
      }
    });
  }

  // Phase 3: Coverage report
  // Layer 1: Universal keys
  const universalCovered = new Set();
  const universalUncovered = new Set();
  for (const key of ALL_UNIVERSAL_KEYS) {
    if (globalTestedKeys.has(key)) {
      universalCovered.add(key);
    } else {
      universalUncovered.add(key);
    }
  }

  // Layer 2: Renderer-specific keys
  const rendererResults = [];
  let totalSpecificDeclared = 0;
  let totalSpecificCovered = 0;
  let totalSpecificUncovered = 0;

  const sortedTypes = [...rendererSpecificKeys.keys()].sort();
  for (const type of sortedTypes) {
    const declared = rendererSpecificKeys.get(type);
    const tested = testedKeys.get(type) || new Set();

    const covered = [];
    const uncovered = [];

    for (const key of declared) {
      totalSpecificDeclared++;
      if (tested.has(key)) {
        covered.push(key);
        totalSpecificCovered++;
      } else {
        uncovered.push(key);
        totalSpecificUncovered++;
      }
    }

    if (uncovered.length > 0 || verbose) {
      rendererResults.push({
        type,
        declared: declared.size,
        covered: covered.length,
        uncovered: uncovered.sort(),
        coveredKeys: covered.sort(),
      });
    }
  }

  rendererResults.sort((a, b) => b.uncovered.length - a.uncovered.length);

  // Output
  if (jsonOutput) {
    const universalPct =
      ALL_UNIVERSAL_KEYS.size > 0
        ? ((universalCovered.size / ALL_UNIVERSAL_KEYS.size) * 100).toFixed(1)
        : '0.0';
    const specificPct =
      totalSpecificDeclared > 0
        ? ((totalSpecificCovered / totalSpecificDeclared) * 100).toFixed(1)
        : '0.0';
    const totalDeclared = ALL_UNIVERSAL_KEYS.size + totalSpecificDeclared;
    const totalCovered = universalCovered.size + totalSpecificCovered;
    const totalUncovered = universalUncovered.size + totalSpecificUncovered;
    console.log(
      JSON.stringify(
        {
          summary: {
            totalDeclared,
            totalCovered,
            totalUncovered,
            coveragePercent:
              totalDeclared > 0 ? ((totalCovered / totalDeclared) * 100).toFixed(1) : '0.0',
            universal: {
              declared: ALL_UNIVERSAL_KEYS.size,
              covered: universalCovered.size,
              uncovered: [...universalUncovered].sort(),
              coveragePercent: universalPct,
            },
            rendererSpecific: {
              declared: totalSpecificDeclared,
              covered: totalSpecificCovered,
              uncovered: totalSpecificUncovered,
              coveragePercent: specificPct,
            },
          },
          renderers: rendererResults,
        },
        null,
        2,
      ),
    );
  } else {
    const totalDeclared = ALL_UNIVERSAL_KEYS.size + totalSpecificDeclared;
    const totalCovered = universalCovered.size + totalSpecificCovered;
    const totalUncovered = universalUncovered.size + totalSpecificUncovered;
    const pct = totalDeclared > 0 ? ((totalCovered / totalDeclared) * 100).toFixed(1) : '0.0';

    console.log('\nSchema Property Coverage Report');
    console.log('='.repeat(60));
    console.log(`Total declared properties: ${totalDeclared}`);
    console.log(`Covered in tests:          ${totalCovered}`);
    console.log(`Uncovered:                 ${totalUncovered}`);
    console.log(`Coverage:                  ${pct}%`);

    const uniPct =
      ALL_UNIVERSAL_KEYS.size > 0
        ? ((universalCovered.size / ALL_UNIVERSAL_KEYS.size) * 100).toFixed(1)
        : '0.0';
    const specPct =
      totalSpecificDeclared > 0
        ? ((totalSpecificCovered / totalSpecificDeclared) * 100).toFixed(1)
        : '0.0';
    console.log('');
    console.log(
      `Layer 1 — Universal (BaseSchema):  ${universalCovered.size}/${ALL_UNIVERSAL_KEYS.size} = ${uniPct}%`,
    );
    console.log(
      `Layer 2 — Renderer-specific:       ${totalSpecificCovered}/${totalSpecificDeclared} = ${specPct}%`,
    );
    console.log('='.repeat(60));

    // Layer 1 report
    if (universalUncovered.size > 0) {
      console.log(`\n❌ Layer 1 — Uncovered universal properties:`);
      for (const k of [...universalUncovered].sort()) {
        console.log(`    ❌ ${k}`);
      }
    } else {
      console.log('\n✅ Layer 1 — All universal properties covered.');
    }

    // Layer 2 report
    const withUncovered = rendererResults.filter((r) => r.uncovered.length > 0);
    if (withUncovered.length === 0) {
      console.log('\n✅ Layer 2 — All renderer-specific properties covered.\n');
    } else {
      console.log(
        `\n❌ Layer 2 — ${withUncovered.length} renderer(s) with uncovered properties:\n`,
      );
      for (const r of withUncovered) {
        const rp = r.declared > 0 ? ((r.covered / r.declared) * 100).toFixed(0) : '0';
        console.log(`  ${r.type} (${r.covered}/${r.declared} = ${rp}%)`);
        for (const key of r.uncovered) console.log(`    ❌ ${key}`);
        if (verbose && r.coveredKeys.length > 0) {
          for (const key of r.coveredKeys) console.log(`    ✅ ${key}`);
        }
        console.log('');
      }

      console.log('Uncovered renderer-specific properties:');
      console.log('-'.repeat(50));
      for (const r of withUncovered) {
        console.log(`  ${(r.type + ':').padEnd(25)} ${r.uncovered.join(', ')}`);
      }
    }
  }

  const totalUncoveredCount = universalUncovered.size + totalSpecificUncovered;
  if (totalUncoveredCount > 0) {
    if (!jsonOutput) {
      console.log(`\n⚠️  ${totalUncoveredCount} uncovered property(ies).`);
    }
    process.exit(1);
  }

  if (!jsonOutput) console.log('\n✅ All schema properties have test coverage.\n');
  process.exit(0);
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
