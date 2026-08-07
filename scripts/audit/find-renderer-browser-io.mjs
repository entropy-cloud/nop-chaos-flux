import { readFile } from 'fs/promises';
import { collectSourceFiles, getLineNumber, getLineText, isTestFile, rootDir, toPosixPath } from './shared.mjs';

const LABEL = 'find-renderer-browser-io';

const RULES = [
  {
    id: 'renderer-direct-fetch',
    message: 'Direct browser fetch() in renderer package — INV-1: must go through RendererEnv.fetcher',
    pattern: /\bfetch\s*\(/g,
  },
  {
    id: 'renderer-direct-xhr',
    message: 'Direct XMLHttpRequest/axios in renderer package — INV-1: must go through RendererEnv.fetcher',
    pattern: /\b(?:XMLHttpRequest|axios)\b/g,
  },
  {
    id: 'renderer-direct-storage',
    message: 'Direct localStorage/sessionStorage access in renderer package — INV-1: must go through RendererEnv storage adapter',
    pattern: /\b(?:localStorage|sessionStorage)\b/g,
  },
  {
    id: 'renderer-direct-indexeddb',
    message: 'Direct indexedDB access in renderer package — INV-1: must go through RendererEnv',
    pattern: /\bindexedDB\b/g,
  },
  {
    id: 'renderer-direct-open',
    message: 'Direct window.open in renderer package — INV-1: must go through RendererEnv',
    pattern: /\bwindow\.open\s*\(/g,
  },
  {
    id: 'renderer-direct-history',
    message: 'Direct history.pushState/replaceState in renderer package — INV-1: must go through RendererEnv.navigate',
    pattern: /\bhistory\s*\.\s*(?:pushState|replaceState)\s*\(/g,
  },
  {
    id: 'renderer-direct-websocket',
    message: 'Direct WebSocket/EventSource/RTCPeerConnection in renderer package — INV-1: must go through RendererEnv stream API',
    pattern: /\b(?:WebSocket|EventSource|RTCPeerConnection)\s*\(/g,
  },
  {
    id: 'renderer-direct-beacon',
    message: 'Direct navigator.sendBeacon in renderer package — INV-1 network family: must go through RendererEnv',
    pattern: /\bnavigator\s*\.\s*sendBeacon\s*\(/g,
  },
  {
    id: 'renderer-direct-navigation',
    message: 'Direct location navigation in renderer package — INV-1: must go through RendererEnv.navigate',
    pattern: /\blocation\s*\.\s*(?:href|assign|replace)\b/g,
  },
  {
    id: 'renderer-remote-dynamic-import',
    message: 'Dynamic import() of remote module in renderer package — INV-1: must go through RendererEnv.importLoader',
    pattern: /\bimport\s*\(\s*(?:['"`](?:https?:)?\/\/|['"`]data:|['"`]blob:)/g,
  },
];

function isCodePosition(content, index) {
  let inString = false;
  let stringQuote = '';
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < index; i += 1) {
    const char = content[i];
    const nextChar = content[i + 1] ?? '';

    if (inLineComment) {
      if (char === '\n') {
        inLineComment = false;
      }
      continue;
    }

    if (inBlockComment) {
      if (char === '*' && nextChar === '/') {
        inBlockComment = false;
        i += 1;
      }
      continue;
    }

    if (inString) {
      if (char === '\\') {
        i += 1;
        continue;
      }
      if (char === stringQuote) {
        inString = false;
        stringQuote = '';
      }
      continue;
    }

    if (char === '/' && nextChar === '/') {
      inLineComment = true;
      i += 1;
      continue;
    }

    if (char === '/' && nextChar === '*') {
      inBlockComment = true;
      i += 1;
      continue;
    }

    if (char === "'" || char === '"' || char === '`') {
      inString = true;
      stringQuote = char;
      continue;
    }
  }

  return !inString && !inLineComment && !inBlockComment;
}

async function main() {
  const files = [];
  for (const root of ['apps', 'packages', 'tests']) {
    files.push(...(await collectSourceFiles(`${rootDir}/${root}`)));
  }

  const results = [];
  for (const filePath of files) {
    const relativePath = toPosixPath(filePath);
    if (!/^packages\/(flux-renderers-|flow-designer-renderers|spreadsheet-renderers|report-designer-renderers|word-editor-renderers)\//.test(relativePath)) {
      continue;
    }
    if (isTestFile(relativePath)) {
      continue;
    }

    const content = await readFile(filePath, 'utf8');
    for (const rule of RULES) {
      const pattern = new RegExp(rule.pattern.source, rule.pattern.flags);
      let match;
      while ((match = pattern.exec(content)) !== null) {
        if (!isCodePosition(content, match.index)) {
          continue;
        }
        results.push({
          ruleId: rule.id,
          message: rule.message,
          filePath: relativePath,
          line: getLineNumber(content, match.index),
          lineText: getLineText(content, getLineNumber(content, match.index)).trim(),
          matchText: match[0],
        });
      }
    }
  }

  results.sort((a, b) => {
    return a.ruleId.localeCompare(b.ruleId) || a.filePath.localeCompare(b.filePath) || a.line - b.line;
  });

  if (results.length === 0) {
    console.log(`[${LABEL}] No direct browser IO in renderer packages.`);
    return;
  }

  const grouped = new Map();
  for (const result of results) {
    if (!grouped.has(result.ruleId)) {
      grouped.set(result.ruleId, []);
    }
    grouped.get(result.ruleId).push(result);
  }

  console.log(
    `[${LABEL}] Found ${results.length} direct browser IO hits across ${grouped.size} buckets (INV-1 red line).`,
  );
  for (const [ruleId, bucket] of grouped) {
    const rule = RULES.find((r) => r.id === ruleId);
    console.log(`\n[high] ${ruleId} - ${rule?.message ?? ''}`);
    for (const result of bucket) {
      console.log(`  ${result.filePath}:${result.line}`);
      console.log(`    ${result.lineText}`);
    }
  }
  process.exit(1);
}

main().catch((error) => {
  console.error(`[${LABEL}] Error:`, error);
  process.exit(1);
});
