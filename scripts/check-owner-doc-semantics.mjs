import { readdir, readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Semantic owner-doc gate (plan 756, roadmap PH-3). check:active-doc-code-anchors
// proves cited paths exist; this gate proves what the doc says ABOUT them:
//   identifier-set — a doc section must cover every call matched inside a named
//                    function body (by name or derived kebab family word) and its
//                    bold count must equal the live set size.
//   symbol-anchor  — within one doc item (list item + indented continuation), every
//                    backticked symbol must appear in every backticked file cited by
//                    the same item (facade re-exports and the same-name module
//                    directory are folded in). Items describing deleted/removed
//                    symbols are skipped; explicit allow entries exempt a pair.

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const defaultRoot = path.join(__dirname, '..');

const PATH_PATTERN = /`((?:packages|apps|scripts|tests)\/[\w/.-]+?\.[a-z]+)`/g;
const SYMBOL_PATTERN = /`([A-Za-z][\w$]{3,})`/g;
const NEGATION_PATTERN = /\b(deleted|removed|no longer|retired|dropped)\b/i;
const LOCAL_REEXPORT_PATTERN = /from\s+['"](\.\.?\/[^'"]+)['"]/g;

function parseArgs(argv) {
  const rootIndex = argv.indexOf('--root');
  return { root: rootIndex >= 0 ? path.resolve(argv[rootIndex + 1]) : defaultRoot };
}

async function readText(filePath) {
  try {
    return await readFile(filePath, 'utf8');
  } catch {
    return null;
  }
}

async function listFilesRecursive(dir) {
  const out = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await listFilesRecursive(full)));
    else if (/\.(ts|tsx|mjs|js)$/.test(entry.name)) out.push(full);
  }
  return out;
}

function sectionBody(docText, heading) {
  const lines = docText.split('\n');
  const start = lines.findIndex((line) => line.trim() === heading.trim());
  if (start < 0) return null;
  const level = heading.match(/^#+/)[0].length;
  let end = start + 1;
  for (; end < lines.length; end += 1) {
    const match = lines[end].match(/^(#+) /);
    if (match && match[1].length <= level) break;
  }
  return lines.slice(start + 1, end).join('\n');
}

function functionBody(codeText, functionName) {
  const start = codeText.search(new RegExp(`export (?:async )?function ${functionName}\\b`));
  if (start < 0) return null;
  const end = codeText.indexOf('\n}', start);
  return end < 0 ? codeText.slice(start) : codeText.slice(start, end + 2);
}

function toKebabFamily(identifier) {
  return identifier
    .replace(/^register/, '')
    .replace(/Renderers$/, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase();
}

export function splitDocItems(docText) {
  const items = [];
  let current = null;
  for (const line of docText.split('\n')) {
    const listMatch = line.match(/^(\s*)(?:[-*]|\d+\.) /);
    if (listMatch) {
      const indent = listMatch[1].length;
      if (current && current.list && indent > current.indent) {
        current.text += `\n${line}`;
        continue;
      }
      current = { indent, list: true, text: line };
      items.push(current);
    } else if (current && current.list && /^\s+\S/.test(line)) {
      current.text += `\n${line}`;
    } else {
      current = null;
      if (line.trim()) items.push({ indent: 0, list: false, text: line });
    }
  }
  return items;
}

async function expandCitedFile(root, relativePath) {
  const texts = [];
  const absolute = path.join(root, relativePath);
  const own = await readText(absolute);
  if (own === null) return null;
  texts.push(own);
  for (const match of own.matchAll(LOCAL_REEXPORT_PATTERN)) {
    const target = path.resolve(path.dirname(absolute), match[1].replace(/\.js$/, ''));
    for (const candidate of [`${target}.ts`, `${target}.tsx`, path.join(target, 'index.ts'), path.join(target, 'index.tsx')]) {
      const text = await readText(candidate);
      if (text !== null) {
        texts.push(text);
        break;
      }
    }
  }
  const siblingDir = path.join(path.dirname(absolute), path.basename(absolute).replace(/\.[a-z]+$/, ''));
  for (const file of await listFilesRecursive(siblingDir)) {
    const text = await readText(file);
    if (text !== null) texts.push(text);
  }
  return texts.join('\n');
}

async function checkIdentifierSet(root, assertion, errors, summary) {
  const docText = await readText(path.join(root, assertion.doc));
  if (docText === null) {
    errors.push(`${assertion.id}: doc ${assertion.doc} not found`);
    return;
  }
  const section = sectionBody(docText, assertion.heading);
  if (section === null) {
    errors.push(`${assertion.id}: heading "${assertion.heading}" not found in ${assertion.doc}`);
    return;
  }
  const codeText = await readText(path.join(root, assertion.codeFile));
  if (codeText === null) {
    errors.push(`${assertion.id}: codeFile ${assertion.codeFile} not found`);
    return;
  }
  const body = functionBody(codeText, assertion.functionName);
  if (body === null) {
    errors.push(`${assertion.id}: function ${assertion.functionName} not found in ${assertion.codeFile}`);
    return;
  }
  const callPattern = new RegExp(`\\b(${assertion.callPattern})\\(`, 'g');
  const live = [...new Set([...body.matchAll(callPattern)].map((match) => match[1]).filter((name) => name !== assertion.functionName))];
  for (const identifier of live) {
    const family = toKebabFamily(identifier);
    const covered = section.includes(identifier) || new RegExp(`\\b${family}\\b`, 'i').test(section);
    if (!covered) {
      errors.push(`${assertion.id}: ${assertion.codeFile} ${assertion.functionName} calls ${identifier} but section "${assertion.heading}" in ${assertion.doc} mentions neither it nor family "${family}"`);
    }
  }
  if (assertion.countPattern) {
    const countMatch = section.match(new RegExp(assertion.countPattern));
    if (!countMatch) {
      errors.push(`${assertion.id}: countPattern ${assertion.countPattern} not found in section "${assertion.heading}"`);
    } else if (Number(countMatch[1]) !== live.size && Number(countMatch[1]) !== live.length) {
      errors.push(`${assertion.id}: doc count ${countMatch[1]} differs from live call count ${live.length} in ${assertion.functionName}`);
    }
  }
  summary.sets.push({ id: assertion.id, live: live.length });
}

async function checkSymbolAnchors(root, docRelative, allow, errors, summary) {
  const docText = await readText(path.join(root, docRelative));
  if (docText === null) {
    errors.push(`symbol-anchor: doc ${docRelative} not found`);
    return;
  }
  const items = splitDocItems(docText);
  const fileCache = new Map();
  for (const item of items) {
    const paths = [...new Set([...item.text.matchAll(PATH_PATTERN)].map((match) => match[1]))];
    if (paths.length === 0) continue;
    const symbols = [...new Set([...item.text.matchAll(SYMBOL_PATTERN)].map((match) => match[1]))];
    if (symbols.length === 0) continue;
    if (NEGATION_PATTERN.test(item.text)) {
      summary.skippedNegated += 1;
      continue;
    }
    summary.items += 1;
    for (const cited of paths) {
      if (!fileCache.has(cited)) fileCache.set(cited, await expandCitedFile(root, cited));
      const haystack = fileCache.get(cited);
      if (haystack === null) continue;
      for (const symbol of symbols) {
        summary.checks += 1;
        const allowed = allow.find((entry) => entry.path === cited && entry.symbol === symbol);
        const present = haystack.includes(symbol);
        if (allowed) {
          allowed.used = true;
          if (present) errors.push(`symbol-anchor: stale allow entry — ${symbol} is now present in ${cited}; delete the entry`);
          continue;
        }
        if (!present) {
          errors.push(`symbol-anchor: ${docRelative} item "${item.text.trim().split('\n')[0].slice(0, 80)}" names ${symbol} but ${cited} (incl. local re-exports / module dir) does not contain it`);
        }
      }
    }
  }
}

async function main() {
  const { root } = parseArgs(process.argv.slice(2));
  const manifestPath = path.join(root, 'scripts', 'baselines', 'owner-doc-semantics.json');
  const manifestText = await readText(manifestPath);
  if (manifestText === null) {
    console.error(`[check:owner-doc-semantics] manifest missing: ${manifestPath}`);
    process.exit(1);
  }
  const manifest = JSON.parse(manifestText);
  const allow = (manifest.allow ?? []).map((entry) => ({ ...entry, used: false }));
  const errors = [];
  const summary = { sets: [], items: 0, checks: 0, skippedNegated: 0 };

  for (const assertion of manifest.identifierSets ?? []) {
    await checkIdentifierSet(root, assertion, errors, summary);
  }
  for (const doc of manifest.docs ?? []) {
    await checkSymbolAnchors(root, doc, allow, errors, summary);
  }
  for (const entry of allow) {
    if (!entry.used) errors.push(`symbol-anchor: stale allow entry — (${entry.path}, ${entry.symbol}) is never cited together in any manifest doc; delete the entry`);
  }

  console.log(`[check:owner-doc-semantics] docs: ${(manifest.docs ?? []).join(', ') || '(none)'}`);
  for (const set of summary.sets) console.log(`  identifier-set ${set.id}: ${set.live} live calls covered`);
  console.log(`  symbol-anchor: ${summary.items} items / ${summary.checks} checks / ${summary.skippedNegated} negated items skipped / ${allow.length} allow entries`);

  if (errors.length > 0) {
    console.error('[check:owner-doc-semantics] FAILED:');
    for (const error of errors) console.error(`  ${error}`);
    process.exit(1);
  }
  console.log('[check:owner-doc-semantics] owner docs agree with live code');
}

main().catch((error) => {
  console.error('[check:owner-doc-semantics] fatal:', error?.message ?? error);
  process.exit(1);
});
