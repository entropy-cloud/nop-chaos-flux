import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../..');

/**
 * Renderer packages whose `register*` functions populate the shared registry.
 * Order controls category grouping fallback and dedup precedence.
 */
export const REGISTER_PACKAGES = [
  { pkg: 'flux-renderers-basic', fn: 'registerBasicRenderers' },
  { pkg: 'flux-renderers-layout', fn: 'registerLayoutRenderers' },
  { pkg: 'flux-renderers-form', fn: 'registerFormRenderers' },
  { pkg: 'flux-renderers-form-advanced', fn: 'registerFormAdvancedRenderers' },
  { pkg: 'flux-renderers-data', fn: 'registerDataRenderers' },
  { pkg: 'flux-renderers-content', fn: 'registerContentRenderers' },
  { pkg: 'flux-renderers-mobile', fn: 'registerMobileRenderers' },
  { pkg: 'flux-code-editor', fn: 'registerCodeEditorRenderers' },
];

/**
 * Load renderer definitions from the *registered in-memory* registry (built
 * `dist/`). This executes each package's registration code, so helper-function
 * prop contracts (`booleanPropContract(...)`), spreads (`...formFieldRules`),
 * and `.concat(...)` field lists are all fully resolved — no source-text
 * parsing. This is the authoritative source for type generation.
 *
 * Requires `pnpm build` (or per-package build) so `dist/` exists.
 *
 * Note: importing renderer dist pulls in `.css` imports; run under the
 * `scripts/css-stub.mjs` loader (see package.json `generate-types` script).
 */
export async function loadRegisteredDefinitions() {
  const core = await import(`${REPO_ROOT}/packages/flux-core/dist/index.js`);
  const registry = core.createRendererRegistry();

  for (const { pkg, fn } of REGISTER_PACKAGES) {
    let mod;
    try {
      mod = await import(`${REPO_ROOT}/packages/${pkg}/dist/index.js`);
    } catch (e) {
      throw new Error(
        `Failed to import ${pkg}/dist — run \`pnpm build\` first. (${e.message})`,
      );
    }
    if (typeof mod[fn] !== 'function') {
      throw new Error(`${pkg} does not export ${fn}`);
    }
    mod[fn](registry);
  }

  return registry.list();
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

/**
 * Convert a prop contract shape + optional valueType hint to a field type.
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
    const contract = propContracts?.[key];
    if (contract?.shape) {
      return contractToFieldType(contract.shape, field.valueType);
    }
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
