/**
 * validate-pages.mjs
 *
 * Generic CLI: validate exported Flux page JSON files (e.g. produced by
 * nop-entropy WebPageExporter) against the real Flux compiler —
 * L0 root check, L1 validateSchema (includes compile diagnostics), and by
 * default L2 compile() throw-protection. No browser, no requests.
 *
 * Unlike flux-guide/scripts/validate.mjs (which skips doc-demo blocks that
 * reference runtime-only namespaces), this tool treats every input file as a
 * production page artifact: an invalid/unparseable/unknown-type root is an
 * ERROR and yields a non-zero exit. `xui:*` keys (shell-layer conventions
 * consumed by nop-chaos-next transformPageJson, not known to the compiler)
 * are stripped before validation and counted in the report.
 *
 * Usage:
 *   node --experimental-loader ./flux-guide/scripts/css-stub.mjs \
 *        --import ./flux-guide/scripts/env-stub.mjs \
 *        flux-guide/scripts/validate-pages.mjs <dir-or-file>... \
 *        --pattern GLOB (default: all .page.json files, recursively) \
 *        --level compile|validate  --report FILE  --max-errors N
 *
 * Exit codes: 0 = no errors; 1 = validation errors found; 2 = environment
 * error (registry assembly failed — run `pnpm build` first).
 */

import { readFileSync, readdirSync, writeFileSync, statSync, mkdirSync } from 'node:fs';
import { resolve, dirname, relative, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildFullRegistry } from './shared.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../..');

// ─── Args ───────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const inputs = [];
  const opts = { pattern: '**/*.page.json', level: 'compile', report: null, maxErrors: 0 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--pattern') opts.pattern = argv[++i];
    else if (a.startsWith('--pattern=')) opts.pattern = a.slice('--pattern='.length);
    else if (a === '--level') opts.level = argv[++i];
    else if (a.startsWith('--level=')) opts.level = a.slice('--level='.length);
    else if (a === '--report') opts.report = argv[++i];
    else if (a.startsWith('--report=')) opts.report = a.slice('--report='.length);
    else if (a === '--max-errors') opts.maxErrors = Number(argv[++i]);
    else if (a.startsWith('--max-errors='))
      opts.maxErrors = Number(a.slice('--max-errors='.length));
    else if (a === '--') continue;
    else if (a === '--help' || a === '-h') opts.help = true;
    else if (a.startsWith('-') && a !== '-') {
      console.error(`Unknown option: ${a}`);
      process.exit(2);
    } else inputs.push(a);
  }
  if (opts.level !== 'compile' && opts.level !== 'validate') {
    console.error(`Invalid --level: ${opts.level} (expected compile|validate)`);
    process.exit(2);
  }
  return { inputs, opts };
}

function globToRegExp(pattern) {
  let re = '';
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === '*') {
      if (pattern[i + 1] === '*') {
        re += '.*';
        i++;
      } else {
        re += '[^/]*';
      }
    } else if (c === '.') {
      re += '\\.';
    } else {
      re += c;
    }
  }
  return new RegExp(`^${re}$`);
}

// ─── File collection ────────────────────────────────────────────────────────

/**
 * Directories are always walked recursively; the glob's last path segment is
 * matched against file names (so a `**`-prefixed glob and a bare file-name
 * glob behave identically here).
 */
function fileNamePatternRegExp(pattern) {
  const namePattern = pattern.slice(pattern.lastIndexOf('/') + 1);
  return globToRegExp(namePattern || pattern);
}

function collectFiles(inputs, nameRe) {
  const files = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (nameRe.test(entry.name)) files.push(full);
    }
  };
  for (const input of inputs) {
    const st = statSync(input, { throwIfNoEntry: false });
    if (!st) {
      console.error(`Input not found: ${input}`);
      process.exit(2);
    }
    if (st.isDirectory()) walk(resolve(input));
    else files.push(resolve(input));
  }
  return files;
}

// ─── xui:* stripping (shell-layer convention keys, see design D7) ──────────

function stripXuiKeys(value, counter) {
  if (Array.isArray(value)) {
    for (const item of value) stripXuiKeys(item, counter);
    return value;
  }
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) {
      if (key.startsWith('xui:')) {
        delete value[key];
        counter.n++;
      } else {
        stripXuiKeys(value[key], counter);
      }
    }
  }
  return value;
}

// ─── Validation ─────────────────────────────────────────────────────────────

function severityTag(severity) {
  return severity === 'error' ? 'ERR' : severity === 'warning' ? 'WARN' : 'INFO';
}

/**
 * L0: the parsed root must be a page schema we can validate. Exported pages
 * are objects with a registered renderer type; a non-empty array root is
 * wrapped as a page body (same convention as validate.mjs). Anything else is
 * an error — never silently skipped.
 */
function toValidatableRoot(parsed, registry) {
  if (Array.isArray(parsed)) {
    if (parsed.length === 0) return { error: 'invalid-root: empty array' };
    return { schema: { type: 'page', body: parsed } };
  }
  if (parsed && typeof parsed === 'object' && typeof parsed.type === 'string') {
    if (!registry.get(parsed.type)) {
      return { error: `invalid-root: unknown renderer type '${parsed.type}'` };
    }
    return { schema: parsed };
  }
  return {
    error: `invalid-root: expected object with renderer 'type', got ${parsed === null ? 'null' : typeof parsed}`,
  };
}

async function main() {
  const { inputs, opts } = parseArgs(process.argv.slice(2));
  if (opts.help || inputs.length === 0) {
    console.log(
      'Usage: validate-pages.mjs <dir-or-file>... [--pattern=<glob>] [--level=compile|validate] [--report=<file>] [--max-errors=<n>]',
    );
    process.exit(inputs.length === 0 && !opts.help ? 2 : 0);
  }

  let registry, validateSchema, createSchemaCompiler;
  try {
    registry = await buildFullRegistry();
    ({ validateSchema, createSchemaCompiler } = await import(
      resolve(REPO_ROOT, 'packages/flux-compiler/dist/index.js')
    ));
  } catch (e) {
    console.error(`Registry assembly failed: ${e.message}`);
    process.exit(2);
  }

  const nameRe = fileNamePatternRegExp(opts.pattern);
  const files = collectFiles(inputs, nameRe);
  if (files.length === 0) {
    console.error(`No files matching ${opts.pattern} under the given inputs.`);
    process.exit(2);
  }

  const compiler = opts.level === 'compile' ? createSchemaCompiler({ registry }) : null;
  const totals = {
    files: files.length,
    validated: 0,
    errors: 0,
    warnings: 0,
    skipped: 0,
    strippedXui: 0,
  };
  const perFile = [];

  outer: for (const file of files) {
    const rel = relative(process.cwd(), file);
    const fileReport = { file: rel, strippedXui: 0, status: 'ok', errors: [], warnings: [] };
    perFile.push(fileReport);

    let parsed;
    try {
      parsed = JSON.parse(readFileSync(file, 'utf-8'));
    } catch (e) {
      const msg = `PARSE ERROR: ${e.message}`;
      console.log(`  ERR: ${rel} / ${msg}`);
      fileReport.status = 'parse-error';
      fileReport.errors.push({ path: '/', code: 'parse-error', message: msg });
      totals.errors++;
      continue;
    }

    const xuiCounter = { n: 0 };
    stripXuiKeys(parsed, xuiCounter);
    fileReport.strippedXui = xuiCounter.n;
    totals.strippedXui += xuiCounter.n;

    const root = toValidatableRoot(parsed, registry);
    if (root.error) {
      console.log(`  ERR: ${rel} / ${root.error}`);
      fileReport.status = 'invalid-root';
      fileReport.errors.push({ path: '/', code: 'invalid-root', message: root.error });
      totals.errors++;
      continue;
    }

    try {
      const diags = validateSchema({ schema: root.schema, registry }) || [];
      for (const d of diags) {
        const tag = severityTag(d.severity);
        if (d.severity === 'error') {
          totals.errors++;
          fileReport.errors.push({ path: d.path || '/', code: d.code || '', message: d.message });
        } else if (d.severity === 'warning') {
          totals.warnings++;
          fileReport.warnings.push({ path: d.path || '/', code: d.code || '', message: d.message });
        }
        console.log(`  ${tag}: ${rel} ${d.path || '/'} ${d.message}`);
      }

      if (compiler) {
        try {
          compiler.compile(root.schema);
        } catch (e) {
          // Dedup against diagnostics already reported by validateSchema
          const dup = fileReport.errors.some(
            (err) =>
              (err.message || '').includes(e.message) ||
              e.message.includes(err.message || '\u0000'),
          );
          if (!dup) {
            const msg = `compile-throw: ${e.message}`;
            console.log(`  ERR: ${rel} / ${msg}`);
            fileReport.errors.push({ path: '/', code: 'compile-throw', message: msg });
            totals.errors++;
          }
        }
      }
      totals.validated++;
      if (fileReport.errors.length > 0) fileReport.status = 'errors';
      else if (fileReport.warnings.length > 0) fileReport.status = 'warnings';

      if (opts.maxErrors > 0 && totals.errors >= opts.maxErrors) {
        console.log(`\n--max-errors=${opts.maxErrors} reached, stopping early.`);
        break outer;
      }
    } catch (e) {
      console.log(`  THROW: ${rel} ${e.message}`);
      fileReport.status = 'throw';
      fileReport.errors.push({ path: '/', code: 'validate-throw', message: e.message });
      totals.errors++;
    }
  }

  console.log(
    `\nResults:  files=${totals.files}  validated=${totals.validated}  errors=${totals.errors}  warnings=${totals.warnings}  strippedXui=${totals.strippedXui}`,
  );
  console.log(`Registry: ${registry.list().length} renderer types; level=${opts.level}`);

  if (opts.report) {
    const reportFile = resolve(opts.report);
    mkdirSync(dirname(reportFile), { recursive: true });
    writeFileSync(reportFile, JSON.stringify({ totals, perFile }, null, 2));
    console.log(`Report written: ${reportFile}`);
  }

  process.exit(totals.errors > 0 ? 1 : 0);
}

main();
