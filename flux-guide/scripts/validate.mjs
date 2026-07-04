/**
 * validate.mjs
 *
 * Validates ```json / ```jsonc blocks from flux-guide markdown files
 * using the actual Flux SchemaCompiler.validateSchema().
 *
 * Usage: node flux-guide/scripts/validate.mjs
 */

import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname, relative, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../..');

// ─── Real Flux imports (from dist) ──────────────────────────────────────────

const { createRendererRegistry, registerRendererDefinitions } = await import(
  resolve(REPO_ROOT, 'packages/flux-core/dist/index.js')
);
const { validateSchema } = await import(
  resolve(REPO_ROOT, 'packages/flux-compiler/dist/index.js')
);

const { registerBasicRenderers } = await import(
  resolve(REPO_ROOT, 'packages/flux-renderers-basic/dist/index.js')
);
const { registerLayoutRenderers } = await import(
  resolve(REPO_ROOT, 'packages/flux-renderers-layout/dist/index.js')
);
const { registerFormRenderers } = await import(
  resolve(REPO_ROOT, 'packages/flux-renderers-form/dist/index.js')
);
const { registerFormAdvancedRenderers } = await import(
  resolve(REPO_ROOT, 'packages/flux-renderers-form-advanced/dist/index.js')
);
const { registerDataRenderers } = await import(
  resolve(REPO_ROOT, 'packages/flux-renderers-data/dist/index.js')
);
const { registerContentRenderers } = await import(
  resolve(REPO_ROOT, 'packages/flux-renderers-content/dist/index.js')
);
const { registerMobileRenderers } = await import(
  resolve(REPO_ROOT, 'packages/flux-renderers-mobile/dist/index.js')
);

// ─── Setup full registry ────────────────────────────────────────────────────

const registry = createRendererRegistry();
registerBasicRenderers(registry);
registerLayoutRenderers(registry);
registerFormRenderers(registry);
registerFormAdvancedRenderers(registry);
registerDataRenderers(registry);
registerContentRenderers(registry);
registerMobileRenderers(registry);

// ─── JSONC → JSON (comments, single quotes, trailing commas, unquoted keys) ─

function jsoncToJSON(raw) {
  const chars = [...raw];
  const out = [];
  let inString = null;
  let i = 0;

  while (i < chars.length) {
    const c = chars[i], n = chars[i + 1];

    if (!inString && c === '/' && n === '/') {
      while (i < chars.length && chars[i] !== '\n') i++;
      continue;
    }
    if (!inString && c === '/' && n === '*') {
      i += 2;
      while (i < chars.length && !(chars[i] === '*' && chars[i + 1] === '/')) i++;
      i += 2;
      continue;
    }
    if (c === '"' || c === "'") {
      if (!inString) { inString = c; out.push('"'); i++; continue; }
      if (c === inString) { inString = null; out.push('"'); i++; continue; }
      out.push(c); i++; continue;
    }
    if (c === '\\' && inString) {
      out.push(c);
      if (i + 1 < chars.length) { out.push(chars[i + 1]); i++; }
      i++;
      continue;
    }
    // Trailing comma before } or ] (with whitespace between)
    if (!inString && c === ',') {
      let j = i + 1;
      while (j < chars.length && /\s/.test(chars[j])) j++;
      if (j < chars.length && (chars[j] === '}' || chars[j] === ']')) {
        i = j - 1;
        i++;
        continue;
      }
    }
    // Unquoted property name: identifier followed by ':'
    if (!inString && /[a-zA-Z_$]/.test(c)) {
      const s = i;
      while (i < chars.length && /[a-zA-Z0-9_$]/.test(chars[i])) i++;
      const ident = chars.slice(s, i).join('');
      let j = i;
      while (j < chars.length && /\s/.test(chars[j])) j++;
      if (j < chars.length && chars[j] === ':') {
        out.push(`"${ident}"`);
        i = j;
        continue;
      }
      out.push(ident);
      continue;
    }
    out.push(c);
    i++;
  }
  return out.join('');
}

// ─── Split block into individual JSON values ────────────────────────────────

function splitValues(cleaned) {
  const results = [];
  let depth = 0, bDepth = 0, inStr = false, start = 0;
  for (let i = 0; i < cleaned.length; i++) {
    const c = cleaned[i];
    if (inStr) {
      if (c === '\\') { i++; continue; }
      if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') { inStr = true; continue; }
    if (c === '{') depth++;
    if (c === '}') depth--;
    if (c === '[') bDepth++;
    if (c === ']') bDepth--;
    if (depth === 0 && bDepth === 0 && (c === '\n' || c === ';')) {
      const seg = cleaned.slice(start, i).trim();
      if (seg) results.push(seg);
      start = i + 1;
    }
  }
  const last = cleaned.slice(start).trim();
  if (last) results.push(last);
  return results;
}

// ─── File finders ───────────────────────────────────────────────────────────

function findMdFiles(dir) {
  const results = [];
  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.name === 'node_modules') continue;
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.md')) results.push(full);
    }
  }
  walk(resolve(REPO_ROOT, dir));
  return results;
}

function findExampleJsonFiles() {
  const results = [];
  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.name === 'node_modules') continue;
      if (entry.isDirectory()) walk(full);
      else if (entry.name === 'example.json') results.push(full);
    }
  }
  walk(resolve(REPO_ROOT, 'docs/components'));
  return results;
}

function extractMdBlocks(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const blocks = [];
  const re = /```(jsonc?)\s*\n([\s\S]*?)```/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    blocks.push({
      raw: m[2].trim(),
      line: content.slice(0, m.index).split('\n').length,
    });
  }
  return blocks;
}

// ─── Validate one parsed JSON value ─────────────────────────────────────────

function validateParsed(parsed, label, errs, warns) {
  const toValidate = Array.isArray(parsed) && parsed.length > 1
    ? { type: 'page', body: parsed }
    : (Array.isArray(parsed) ? parsed
      : (parsed && typeof parsed === 'object' && typeof parsed.type === 'string') ? parsed
      : null);
  if (!toValidate) return;

  // Skip roots whose type is not a known renderer (e.g. condition-builder field configs)
  if (!Array.isArray(toValidate) && !registry.get(toValidate.type)) return;

  // Skip blocks demonstrating runtime-only $slot references (cannot be statically verified)
  if (JSON.stringify(toValidate).includes('$slot.')) return;

  try {
    const diags = validateSchema({ schema: toValidate, registry });
    for (const d of diags) {
      const tag = d.severity === 'error' ? 'ERR' : d.severity === 'warning' ? 'WARN' : 'INFO';
      if (d.severity === 'error') errs.n++;
      else if (d.severity === 'warning') warns.n++;
      console.log(`  ${tag}: ${label} ${d.path || '/'} ${d.message}`);
    }
  } catch (e) {
    console.log(`  THROW: ${label} ${e.message}`);
    errs.n++;
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────

function main() {
  console.log(`Registry: ${registry.list().length} renderer types`);

  let blocks = 0, nodes = 0;
  const errs = { n: 0 }, warns = { n: 0 };

  // ── flux-guide markdown blocks ──
  for (const fp of findMdFiles('flux-guide')) {
    const rel = relative(REPO_ROOT, fp);
    for (const block of extractMdBlocks(fp)) {
      blocks++;
      const cleaned = jsoncToJSON(block.raw).trim();
      if (/\.\.\.\s*[}\]]/.test(cleaned)) continue;

      for (const seg of splitValues(cleaned)) {
        let parsed;
        try { parsed = JSON.parse(seg); }
        catch (e) {
          console.log(`  PARSE ERROR: ${rel}:${block.line} ${e.message}`);
          errs.n++;
          continue;
        }
        nodes++;
        validateParsed(parsed, `${rel}:${block.line}`, errs, warns);
      }
    }
  }

  // ── docs/components/*/example.json ──
  // Skip packages whose renderers aren't registered in this script
  const skipPackages = new Set([
    'designer-canvas', 'designer-edge-row', 'designer-field',
    'designer-node-card', 'designer-page', 'designer-palette',
    'report-designer-page', 'report-field-panel', 'report-inspector',
    'report-inspector-shell', 'report-toolbar',
    'spreadsheet-page', 'word-editor-page',
    'code-editor',
  ]);

  for (const fp of findExampleJsonFiles()) {
    blocks++;
    const rel = relative(REPO_ROOT, fp);
    const dirName = rel.split('/')[2]; // docs/components/<name>/example.json
    if (skipPackages.has(dirName)) {
      continue;
    }

    let parsed;
    try { parsed = JSON.parse(readFileSync(fp, 'utf-8')); }
    catch (e) {
      console.log(`  PARSE ERROR: ${rel} ${e.message}`);
      errs.n++;
      continue;
    }
    nodes++;
    validateParsed(parsed, rel, errs, warns);
  }

  // ── docs/components/*/design.md blocks ──
  for (const fp of findMdFiles('docs/components')) {
    const rel = relative(REPO_ROOT, fp);
    const dirName = rel.split('/')[2]; // docs/components/<name>/design.md
    if (skipPackages.has(dirName)) continue;

    for (const block of extractMdBlocks(fp)) {
      blocks++;
      const cleaned = jsoncToJSON(block.raw).trim();
      if (/\.\.\.\s*[}\]]/.test(cleaned)) continue;

      for (const seg of splitValues(cleaned)) {
        let parsed;
        try { parsed = JSON.parse(seg); }
        catch (e) {
          console.log(`  PARSE ERROR: ${rel}:${block.line} ${e.message}`);
          errs.n++;
          continue;
        }
        nodes++;
        validateParsed(parsed, `${rel}:${block.line}`, errs, warns);
      }
    }
  }

  console.log(`\nResults:  blocks=${blocks}  nodes=${nodes}  errors=${errs.n}  warnings=${warns.n}`);
  if (errs.n > 0) process.exit(1);
}

main();
