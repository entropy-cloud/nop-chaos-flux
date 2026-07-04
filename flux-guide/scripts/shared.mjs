import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../..');

/**
 * Find definition source files using find command.
 */
export function findAllDefinitionFiles() {
  const out = execSync(
    `find packages/flux-renderers-* packages/flux-renderers-form-advanced packages/flux-code-editor -name '*.ts' -o -name '*.tsx' 2>/dev/null | sort -u`,
    { cwd: REPO_ROOT, encoding: 'utf-8' },
  );
  const allFiles = out.trim().split('\n').filter(Boolean);

  const defFiles = allFiles.filter(f => {
    const content = readFileSync(`${REPO_ROOT}/${f}`, 'utf-8');
    return /RendererDefinition/.test(content) &&
      /type\s*:\s*['"]/.test(content) &&
      !f.includes('/node_modules/') &&
      !f.includes('/dist/');
  });

  return [...new Set(defFiles)].map(f => ({
    path: `${REPO_ROOT}/${f}`,
    shortPath: f,
    content: readFileSync(`${REPO_ROOT}/${f}`, 'utf-8'),
  }));
}

/**
 * Known definition files organized by package.
 */
export const KNOWN_DEFINITION_FILES = [
  // Basic
  'packages/flux-renderers-basic/src/basic-renderer-definitions.ts',
  'packages/flux-renderers-basic/src/surface-renderer-definitions.ts',
  // Layout
  'packages/flux-renderers-layout/src/layout-renderer-definitions.ts',
  'packages/flux-renderers-layout/src/process-display-definitions.ts',
  // Form
  'packages/flux-renderers-form/src/renderers/form-definition.ts',
  'packages/flux-renderers-form/src/renderers/input.tsx',
  'packages/flux-renderers-form/src/renderers/date-renderer-definitions.ts',
  'packages/flux-renderers-form/src/renderers/fieldset.tsx',
  'packages/flux-renderers-form/src/renderers/markdown-editor-renderer.tsx',
  // Form Advanced
  'packages/flux-renderers-form-advanced/src/tree-controls.tsx',
  'packages/flux-renderers-form-advanced/src/tag-list.tsx',
  'packages/flux-renderers-form-advanced/src/key-value.tsx',
  'packages/flux-renderers-form-advanced/src/array-editor.tsx',
  'packages/flux-renderers-form-advanced/src/condition-builder/condition-builder.tsx',
  'packages/flux-renderers-form-advanced/src/composite-field/object-field.tsx',
  'packages/flux-renderers-form-advanced/src/composite-field/array-field.tsx',
  'packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx',
  'packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx',
  'packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx',
  'packages/flux-renderers-form-advanced/src/editor-renderer.tsx',
  'packages/flux-renderers-form-advanced/src/input-file-renderer.tsx',
  'packages/flux-renderers-form-advanced/src/input-image-renderer.tsx',
  'packages/flux-renderers-form-advanced/src/combo-renderer.tsx',
  'packages/flux-renderers-form-advanced/src/input-table-renderer.tsx',
  'packages/flux-renderers-form-advanced/src/transfer-renderer.tsx',
  'packages/flux-renderers-form-advanced/src/picker-renderer.tsx',
  // Data
  'packages/flux-renderers-data/src/data-renderer-definitions.ts',
  'packages/flux-renderers-data/src/crud-renderer-definition.ts',
  'packages/flux-renderers-data/src/w2a-data-composition-definitions.ts',
  // Content
  'packages/flux-renderers-content/src/content-renderer-definitions.ts',
  // Mobile
  'packages/flux-renderers-mobile/src/mobile-renderer-definitions.ts',
];

/**
 * Load all definitions from known files.
 */
export function loadAllDefinitions() {
  const allDefs = [];
  for (const shortPath of KNOWN_DEFINITION_FILES) {
    const filePath = `${REPO_ROOT}/${shortPath}`;
    try {
      const defs = extractDefinitions(filePath);
      allDefs.push(...defs);
    } catch (e) {
      console.error(`  [warn] Failed to parse ${shortPath}: ${e.message}`);
    }
  }
  // Deduplicate by type
  const seen = new Set();
  return allDefs.filter(d => {
    if (seen.has(d.type)) return false;
    seen.add(d.type);
    return true;
  });
}

/**
 * Match a bracket pair, returning the matched text including brackets.
 */
export function matchBracket(text, start) {
  const open = text[start];
  const close = open === '{' ? '}' : open === '[' ? ']' : null;
  if (!close) return null;

  let depth = 1;
  let inString = null;
  let inLineComment = false;
  let i = start + 1;

  for (; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];

    if (inString) {
      if (c === '\\') { i++; continue; }
      if (c === inString) inString = null;
      continue;
    }

    if (inLineComment) {
      if (c === '\n') inLineComment = false;
      continue;
    }

    if (c === '/' && next === '/') { inLineComment = true; i++; continue; }
    if (c === '/' && next === '*') {
      const end = text.indexOf('*/', i + 2);
      if (end === -1) return null;
      i = end + 1;
      continue;
    }

    if (c === '"' || c === "'" || c === '`') { inString = c; continue; }
    if (c === open) depth++;
    if (c === close) {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

/**
 * Convert JSONC (single quotes, unquoted keys, trailing commas, comments) to valid JSON.
 */
function jsoncToJSON(raw) {
  const chars = [...raw];
  const out = [];
  let inString = null;
  let i = 0;

  while (i < chars.length) {
    const c = chars[i];
    const next = chars[i + 1];

    // Line comment
    if (!inString && c === '/' && next === '/') {
      while (i < chars.length && chars[i] !== '\n') i++;
      continue;
    }

    // Block comment
    if (!inString && c === '/' && next === '*') {
      i += 2;
      while (i < chars.length && !(chars[i] === '*' && chars[i + 1] === '/')) i++;
      i += 2;
      continue;
    }

    // String handling
    if (c === '"' || c === "'") {
      if (!inString) {
        inString = c;
        out.push('"');
        i++;
        continue;
      }
      if (c === inString) {
        inString = null;
        out.push('"');
        i++;
        continue;
      }
      // Quote char inside a different quote type — emit as-is
      out.push(c);
      i++;
      continue;
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
        continue;
      }
    }

    // Unquoted property name: identifier followed by ':'
    if (!inString && /[a-zA-Z_$]/.test(c)) {
      const start = i;
      while (i < chars.length && /[a-zA-Z0-9_$]/.test(chars[i])) i++;
      const ident = chars.slice(start, i).join('');
      // Skip whitespace and check for ':'
      let j = i;
      while (j < chars.length && /\s/.test(chars[j])) j++;
      if (j < chars.length && chars[j] === ':') {
        out.push(`"${ident}"`);
        i = j;
        continue;
      }
      // Not a property name, emit as-is
      out.push(ident);
      continue;
    }

    out.push(c);
    i++;
  }

  return out.join('');
}

/**
 * Parse JSONC: supports single quotes, unquoted keys, trailing commas, comments.
 */
export function jsoncParse(text) {
  const cleaned = jsoncToJSON(text).trim();
  return JSON.parse(cleaned);
}

/**
 * Extract all definition objects from a source file.
 */
export function extractDefinitions(filePath) {
  const source = readFileSync(filePath, 'utf-8');
  const definitions = [];

  // Pattern: export const xxxRendererDefinition[s] = [...]
  const arrayPattern = /export\s+const\s+\w+(RendererDefinitions|RendererDefinition|Definitions|Definition)\s*(:\s*[^=]+)?=\s*\[/g;
  let match;

  while ((match = arrayPattern.exec(source)) !== null) {
    const arrayStart = match.index + match[0].length - 1;
    const arrayStr = matchBracket(source, arrayStart);
    if (!arrayStr) continue;

    const arrayContent = arrayStr.slice(1, -1);
    let objPos = 0;

    while (objPos < arrayContent.length) {
      while (objPos < arrayContent.length && /\s[,;\n\r]/.test(arrayContent[objPos])) objPos++;
      if (objPos >= arrayContent.length) break;

      if (arrayContent[objPos] === '{') {
        const objStr = matchBracket(arrayContent, objPos);
        if (!objStr) { objPos++; continue; }
        objPos += objStr.length;

        const def = parseDefinitionObject(objStr);
        if (def && def.type) definitions.push(def);
      } else {
        objPos++;
      }
    }
  }

  // Single-object pattern: export const xxxRendererDefinition = { ... }
  const singlePattern = /export\s+const\s+\w+RendererDefinition\s*(:\s*[^=]+)?=\s*/g;
  while ((match = singlePattern.exec(source)) !== null) {
    const eqEnd = match.index + match[0].length;
    if (source[eqEnd] === '[') continue;

    const objStr = matchBracket(source, eqEnd);
    if (!objStr || objStr[0] !== '{') continue;

    const def = parseDefinitionObject(objStr);
    if (def && def.type && !definitions.some(d => d.type === def.type)) {
      definitions.push(def);
    }
  }

  return definitions;
}

function parseDefinitionObject(objText) {
  const result = {};

  const typeMatch = objText.match(/type\s*:\s*['"]([^'"]+)['"]/);
  if (!typeMatch) return null;
  result.type = typeMatch[1];

  const extractString = (key) => {
    const re = new RegExp(`${key}\\s*:\\s*['"]([^'"]+)['"]`);
    const m = objText.match(re);
    if (m) result[key] = m[1];
  };
  extractString('displayName');
  extractString('category');
  extractString('sourcePackage');
  extractString('rendererClass');

  const traitsMatch = objText.match(/rendererTraits\s*:\s*\[([^\]]*)\]/);
  if (traitsMatch) {
    result.rendererTraits = traitsMatch[1].split(',').map(s => s.replace(/['"\s]/g, '')).filter(Boolean);
  }

  // Extract `fields` array
  const fieldsIdx = objText.search(/fields\s*:\s*\[/);
  if (fieldsIdx >= 0) {
    const start = fieldsIdx + objText.slice(fieldsIdx).search(/\[/);
    const fieldsStr = matchBracket(objText, start);
    if (fieldsStr) {
      try { result.fields = jsoncParse(fieldsStr); }
      catch { result.fields = []; }
    }
  }

  // Extract propContracts
  const propIdx = objText.search(/propContracts\s*:\s*\{/);
  if (propIdx >= 0) {
    const start = propIdx + objText.slice(propIdx).search(/\{/);
    const propStr = matchBracket(objText, start);
    if (propStr) {
      try { result.propContracts = parsePropContracts(propStr); }
      catch { result.propContracts = {}; }
    }
  }

  // Extract eventContracts
  const eventIdx = objText.search(/eventContracts\s*:\s*\{/);
  if (eventIdx >= 0) {
    const start = eventIdx + objText.slice(eventIdx).search(/\{/);
    const eventStr = matchBracket(objText, start);
    if (eventStr) {
      try { result.eventContracts = jsoncParse(eventStr); }
      catch { result.eventContracts = {}; }
    }
  }

  // Extract injectedLocals
  const injIdx = objText.search(/injectedLocals\s*:\s*\{/);
  if (injIdx >= 0) {
    const start = injIdx + objText.slice(injIdx).search(/\{/);
    const injStr = matchBracket(objText, start);
    if (injStr) {
      try { result.injectedLocals = jsoncParse(injStr); }
      catch { result.injectedLocals = {}; }
    }
  }

  // Extract componentCapabilityContracts
  const capIdx = objText.search(/componentCapabilityContracts\s*:\s*\[/);
  if (capIdx >= 0) {
    const start = capIdx + objText.slice(capIdx).search(/\[/);
    const capStr = matchBracket(objText, start);
    if (capStr) {
      try { result.componentCapabilityContracts = jsoncParse(capStr); }
      catch { result.componentCapabilityContracts = []; }
    }
  }

  return result;
}

function parsePropContracts(text) {
  const inner = text.slice(1, -1);
  const contracts = {};
  let pos = 0;

  while (pos < inner.length) {
    while (pos < inner.length && /\s[,;\n\r]/.test(inner[pos])) pos++;
    if (pos >= inner.length) break;

    const keyMatch = inner.slice(pos).match(/^(\w+)\s*:\s*/);
    if (!keyMatch) { pos++; continue; }
    const key = keyMatch[1];
    pos += keyMatch[0].length;

    if (inner[pos] === '{') {
      const objStr = matchBracket(inner, pos);
      if (!objStr) { pos++; continue; }
      pos += objStr.length;

      try {
        contracts[key] = parsePropContract(objStr);
      } catch {
        contracts[key] = { shape: { kind: 'unknown' } };
      }
    } else {
      pos++;
    }
  }

  return contracts;
}

function parsePropContract(text) {
  const shapeIdx = text.search(/shape\s*:\s*\{/);
  if (shapeIdx < 0) return { shape: { kind: 'unknown' } };
  const start = shapeIdx + text.slice(shapeIdx).search(/\{/);
  const shapeStr = matchBracket(text, start);
  if (!shapeStr) return { shape: { kind: 'unknown' } };
  return { shape: parseShape(shapeStr) };
}

function parseShape(text) {
  const inner = text.slice(1, -1).trim();
  if (!inner) return { kind: 'unknown' };

  const kindMatch = inner.match(/kind\s*:\s*['"]([^'"]+)['"]/);
  if (!kindMatch) return { kind: 'unknown' };
  const kind = kindMatch[1];

  switch (kind) {
    case 'string':
    case 'number':
    case 'boolean':
    case 'null':
    case 'unknown':
      return { kind };

    case 'literal': {
      const valMatch = inner.match(/value\s*:\s*([^,\n}]+)/);
      if (!valMatch) return { kind: 'literal', value: null };
      const raw = valMatch[1].trim();
      if (raw === 'null') return { kind: 'literal', value: null };
      if (raw === 'true') return { kind: 'literal', value: true };
      if (raw === 'false') return { kind: 'literal', value: false };
      const num = Number(raw);
      if (!Number.isNaN(num)) return { kind: 'literal', value: num };
      return { kind: 'literal', value: raw.replace(/['"]/g, '') };
    }

    case 'array': {
      const idx = inner.search(/item\s*:\s*\{/);
      if (idx < 0) return { kind: 'array', item: { kind: 'unknown' } };
      const s = idx + inner.slice(idx).search(/\{/);
      const str = matchBracket(inner, s);
      return { kind: 'array', item: str ? parseShape(str) : { kind: 'unknown' } };
    }

    case 'record': {
      const idx = inner.search(/value\s*:\s*\{/);
      if (idx < 0) return { kind: 'record', value: { kind: 'unknown' } };
      const s = idx + inner.slice(idx).search(/\{/);
      const str = matchBracket(inner, s);
      return { kind: 'record', value: str ? parseShape(str) : { kind: 'unknown' } };
    }

    case 'union': {
      const idx = inner.search(/anyOf\s*:\s*\[/);
      if (idx < 0) return { kind: 'union', anyOf: [] };
      const s = idx + inner.slice(idx).search(/\[/);
      const arrStr = matchBracket(inner, s);
      if (!arrStr) return { kind: 'union', anyOf: [] };

      const items = [];
      let ip = 1;
      while (ip < arrStr.length) {
        while (ip < arrStr.length && /\s[,;\n\r]/.test(arrStr[ip])) ip++;
        if (ip >= arrStr.length || arrStr[ip] === ']') break;
        if (arrStr[ip] === '{') {
          const istr = matchBracket(arrStr, ip);
          if (istr) { items.push(parseShape(istr)); ip += istr.length; }
          else ip++;
        } else ip++;
      }
      return { kind: 'union', anyOf: items };
    }

    case 'object': {
      const fields = {};
      const optional = [];
      const fIdx = inner.search(/fields\s*:\s*\{/);
      if (fIdx >= 0) {
        const s = fIdx + inner.slice(fIdx).search(/\{/);
        const fStr = matchBracket(inner, s);
        if (fStr) {
          const fInner = fStr.slice(1, -1);
          let fp = 0;
          while (fp < fInner.length) {
            while (fp < fInner.length && /\s[,;\n\r]/.test(fInner[fp])) fp++;
            if (fp >= fInner.length) break;
            const km = fInner.slice(fp).match(/^(\w+)\s*:\s*/);
            if (!km) { fp++; continue; }
            const fk = km[1];
            fp += km[0].length;
            if (fInner[fp] === '{') {
              const ss = matchBracket(fInner, fp);
              if (ss) { fields[fk] = parseShape(ss); fp += ss.length; }
              else fp++;
            } else fp++;
          }
        }
      }
      const optMatch = inner.match(/optional\s*:\s*\[([^\]]*)\]/);
      if (optMatch) {
        optMatch[1].split(',').forEach(s => {
          const t = s.trim().replace(/['"]/g, '');
          if (t) optional.push(t);
        });
      }
      return { kind: 'object', fields, optional };
    }

    default:
      return { kind: 'unknown' };
  }
}

/**
 * Convert a FluxValueShape to a TypeScript type string.
 */
export function shapeToTS(shape) {
  switch (shape.kind) {
    case 'string': return 'string';
    case 'number': return 'number';
    case 'boolean': return 'boolean';
    case 'null': return 'null';
    case 'unknown': return 'unknown';
    case 'literal': return JSON.stringify(shape.value);
    case 'array': return `${shapeToTS(shape.item)}[]`;
    case 'record': return `Record<string, ${shapeToTS(shape.value)}>`;
    case 'union': {
      const parts = shape.anyOf.map(s => shapeToTS(s));
      return parts.join(' | ');
    }
    case 'object': {
      const entries = Object.entries(shape.fields || {});
      if (entries.length === 0) return 'Record<string, unknown>';
      const optSet = new Set(shape.optional || []);
      const lines = entries.map(([k, v]) => {
        const opt = optSet.has(k) ? '?' : '';
        return `    ${k}${opt}: ${shapeToTS(v)};`;
      });
      return `{\n${lines.join('\n')}\n  }`;
    }
    default: return 'unknown';
  }
}

const STRING_CONTRACT_KEYS = new Set([
  'displayName', 'description', 'editorType',
]);

/**
 * Convert a prop contract key + shape to a schema field type.
 */
export function contractToFieldType(shape, valueType) {
  if (valueType === 'boolean') return 'boolean';
  if (valueType === 'string') return 'string';

  switch (shape.kind) {
    case 'boolean': return 'boolean';
    case 'string': return 'string';
    case 'number': return 'number';
    default: return shapeToTS(shape);
  }
}

/**
 * Determine the TypeScript type for a schema field given its kind and contracts.
 */
export function resolveFieldType(field, propContracts, eventContracts) {
  const kind = field.kind;
  const key = field.key;

  if (kind === 'meta') {
    return field.valueType === 'boolean' ? 'boolean' : 'string';
  }

  if (kind === 'region') {
    return 'SchemaInput';
  }

  if (kind === 'value-or-region') {
    return 'SchemaValue | SchemaInput';
  }

  if (kind === 'event') {
    return 'ActionSchema | ActionSchema[]';
  }

  if (kind === 'prop') {
    // Check propContracts
    const contract = propContracts?.[key];
    if (contract?.shape) {
      return contractToFieldType(contract.shape, field.valueType);
    }
    // Fallback by valueType
    if (field.valueType === 'boolean') return 'boolean';
    if (field.valueType === 'string') return 'string';
    return 'SchemaValue';
  }

  return 'SchemaValue';
}

export function toPascalCase(str) {
  return str
    .replace(/[-:](.)/g, (_, c) => c.toUpperCase())
    .replace(/^(\w)/, c => c.toUpperCase())
    .replace(/^(\d+)/, '') // strip leading digits
    .replace(/[^a-zA-Z0-9]/g, '');
}
