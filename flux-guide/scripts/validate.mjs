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

// ─── Find markdown files ────────────────────────────────────────────────────

function findMarkdownFiles() {
  const results = [];
  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.name === 'node_modules') continue;
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.md')) results.push(full);
    }
  }
  walk(resolve(REPO_ROOT, 'flux-guide'));
  return results;
}

function extractBlocks(filePath) {
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

// ─── Main ───────────────────────────────────────────────────────────────────

function main() {
  console.log(`Registry: ${registry.list().length} renderer types`);

  let blocks = 0, nodes = 0, errs = 0, warns = 0;
  const files = findMarkdownFiles();

  for (const fp of files) {
    const rel = relative(REPO_ROOT, fp);
    for (const block of extractBlocks(fp)) {
      blocks++;
      const cleaned = jsoncToJSON(block.raw).trim();
      if (/\.\.\.\s*[}\]]/.test(cleaned)) continue;

      for (const seg of splitValues(cleaned)) {
        let parsed;
        try { parsed = JSON.parse(seg); }
        catch (e) {
          console.log(`  PARSE ERROR: ${rel}:${block.line} ${e.message}`);
          errs++;
          continue;
        }

        // Wrap multi-element arrays in a page so all siblings share a tree
        // and componentTargets can resolve across them.
        // Single objects with a type are validated directly.
        const toValidate = Array.isArray(parsed) && parsed.length > 1
          ? { type: 'page', body: parsed }
          : (Array.isArray(parsed) ? parsed
            : (parsed && typeof parsed === 'object' && typeof parsed.type === 'string') ? parsed
            : null);
        if (!toValidate) continue;
        nodes++;

        try {
          const diags = validateSchema({ schema: toValidate, registry });
          for (const d of diags) {
            const tag = d.severity === 'error' ? 'ERR' : d.severity === 'warning' ? 'WARN' : 'INFO';
            if (d.severity === 'error') errs++;
            else if (d.severity === 'warning') warns++;
            console.log(`  ${tag}: ${rel}:${block.line} ${d.path || '/'} ${d.message}`);
          }
        } catch (e) {
          console.log(`  THROW: ${rel}:${block.line} ${e.message}`);
          errs++;
        }
      }
    }
  }

  console.log(`\nResults:  blocks=${blocks}  nodes=${nodes}  errors=${errs}  warnings=${warns}`);
  if (errs > 0) process.exit(1);
}

main();
