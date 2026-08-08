import { readdir, readFile } from 'fs/promises';
import path from 'path';
import process from 'process';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export const rootDir = path.join(__dirname, '..', '..');
export const scanRoots = ['apps', 'packages', 'tests'];

// `FLUX_AUDIT_SCAN_ROOT` overrides the scan root for the shared
// `scanFilesWithRules` runners (find-styling-suspects / find-test-global-leaks /
// find-performance-suspects / find-reactive-render-reads /
// find-react19-optimization-candidates / find-async-without-failure-path / ...)
// so committed script tests can host fixtures in a throwaway temp tree while
// still exec-ing the real gates (0150-1 stagedDirs governance, DG 2026-08-09;
// aligned with find-event-dispatch-without-ctx / find-renderer-browser-io).
export const scanRootOverride = process.env.FLUX_AUDIT_SCAN_ROOT
  ? path.resolve(process.env.FLUX_AUDIT_SCAN_ROOT)
  : null;

export function toScanRelativePath(filePath) {
  const base = scanRootOverride ?? rootDir;
  return path.relative(base, filePath).split(path.sep).join('/');
}
export const scanExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.css']);
export const ignoreDirectoryNames = new Set([
  '.git',
  '.turbo',
  'coverage',
  'dist',
  'node_modules',
  'temp',
  'test-results',
]);

export function toPosixPath(filePath) {
  return path.relative(rootDir, filePath).split(path.sep).join('/');
}

// Returns the code-only text of the given 1-based line (strings preserved,
// `//` line comments and `/*...*/` block comments stripped, block-comment state
// carried across lines). Pattern matches inside comments must not hit; this is
// the comment-aware base for `filterMatch` decisions.
export function getCodeTextForLine(content, line) {
  const lines = content.split(/\r?\n/);
  const targetIndex = line - 1;
  if (targetIndex < 0 || targetIndex >= lines.length) {
    return '';
  }

  let inBlockComment = false;
  let out = '';

  for (let lineIndex = 0; lineIndex <= targetIndex; lineIndex += 1) {
    const lineText = lines[lineIndex] ?? '';
    out = '';
    let inString = false;
    let stringQuote = '';

    for (let column = 0; column < lineText.length; column += 1) {
      const char = lineText[column];
      const nextChar = lineText[column + 1] ?? '';

      if (inBlockComment) {
        if (char === '*' && nextChar === '/') {
          inBlockComment = false;
          column += 1;
        }
        continue;
      }

      if (inString) {
        out += char;
        if (char === '\\') {
          column += 1;
          out += lineText[column] ?? '';
          continue;
        }
        if (char === stringQuote) {
          inString = false;
        }
        continue;
      }

      if (char === '/' && nextChar === '/') {
        break;
      }

      if (char === '/' && nextChar === '*') {
        inBlockComment = true;
        column += 1;
        continue;
      }

      if (char === "'" || char === '"' || char === '`') {
        inString = true;
        stringQuote = char;
        out += char;
        continue;
      }

      out += char;
    }
  }

  return out;
}

// Returns true when the given absolute content index is in real code (not
// inside a `//` line comment, `/*...*/` block comment, or string literal).
// Ported from find-event-dispatch-without-ctx.mjs — the position-aware base
// for pattern rules whose matches must not hit inside comments/strings.
export function isCodePosition(content, index) {
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

export function isTestFile(filePath) {
  return /(?:\.test\.|\.spec\.|__tests__|test-support)/.test(filePath);
}

export async function collectSourceFiles(dir) {
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
    if (entry.isDirectory()) {
      files.push(...(await collectSourceFiles(fullPath)));
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (scanExtensions.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

export function getLineNumber(content, index) {
  let line = 1;
  for (let i = 0; i < index; i += 1) {
    if (content[i] === '\n') {
      line += 1;
    }
  }
  return line;
}

export function getLineText(content, lineNumber) {
  const lines = content.split(/\r?\n/);
  return lines[lineNumber - 1] ?? '';
}

export function createResult(rule, relativePath, line, lineText, matchText) {
  return {
    ruleId: rule.id,
    severity: rule.severity,
    description: rule.description,
    filePath: relativePath,
    line,
    lineText: lineText.trim(),
    matchText,
  };
}

export function getLineStartIndices(content) {
  const starts = [0];
  for (let index = 0; index < content.length; index += 1) {
    if (content[index] === '\n') {
      starts.push(index + 1);
    }
  }
  return starts;
}

function scanBalanced(content, startIndex, handlers) {
  let inString = false;
  let stringQuote = '';
  let inLineComment = false;
  let inBlockComment = false;
  let parenDepth = 0;
  let braceDepth = 0;
  let bracketDepth = 0;

  for (let index = startIndex; index < content.length; index += 1) {
    const char = content[index];
    const nextChar = content[index + 1] ?? '';

    if (inLineComment) {
      if (char === '\n') {
        inLineComment = false;
      }
      continue;
    }

    if (inBlockComment) {
      if (char === '*' && nextChar === '/') {
        inBlockComment = false;
        index += 1;
      }
      continue;
    }

    if (inString) {
      if (char === '\\') {
        index += 1;
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
      index += 1;
      continue;
    }

    if (char === '/' && nextChar === '*') {
      inBlockComment = true;
      index += 1;
      continue;
    }

    if (char === "'" || char === '"' || char === '`') {
      inString = true;
      stringQuote = char;
      continue;
    }

    if (char === '(') parenDepth += 1;
    if (char === ')') parenDepth = Math.max(0, parenDepth - 1);
    if (char === '{') braceDepth += 1;
    if (char === '}') braceDepth = Math.max(0, braceDepth - 1);
    if (char === '[') bracketDepth += 1;
    if (char === ']') bracketDepth = Math.max(0, bracketDepth - 1);

    const result = handlers.onToken?.({ char, index, parenDepth, braceDepth, bracketDepth });
    if (result !== undefined) {
      return result;
    }
  }

  return handlers.fallback;
}

export function findMatchingParen(content, openIndex) {
  let depth = 0;
  return scanBalanced(content, openIndex, {
    fallback: -1,
    onToken: ({ char, index }) => {
      if (char === '(') depth += 1;
      if (char === ')') {
        depth -= 1;
        if (depth === 0) return index;
      }
      return undefined;
    },
  });
}

export function findMatchingBrace(content, openIndex) {
  let depth = 0;
  return scanBalanced(content, openIndex, {
    fallback: -1,
    onToken: ({ char, index }) => {
      if (char === '{') depth += 1;
      if (char === '}') {
        depth -= 1;
        if (depth === 0) return index;
      }
      return undefined;
    },
  });
}

export function findStatementEnd(content, startIndex) {
  return scanBalanced(content, startIndex, {
    fallback: content.length,
    onToken: ({ char, index, parenDepth, braceDepth, bracketDepth }) => {
      if (char === ';' && parenDepth === 0 && braceDepth === 0 && bracketDepth === 0) {
        return index;
      }
      return undefined;
    },
  });
}

export function hasTopLevelComma(text) {
  return scanBalanced(text, 0, {
    fallback: false,
    onToken: ({ char, parenDepth, braceDepth, bracketDepth }) => {
      if (char === ',' && parenDepth === 0 && braceDepth === 0 && bracketDepth === 0) {
        return true;
      }
      return undefined;
    },
  });
}

// Single-pass comment/string stripper preserving line structure (strings and
// comments become blanks). Used by `scanTopLevelLets` to evaluate const
// container mutation evidence on code-only text (2026-08-09 tool-governance
// round): a never-mutated `const` container cannot leak state across test
// cases, so only containers with real mutation evidence are flagged.
function stripCommentsAndStrings(content) {
  const lines = content.split(/\r?\n/);
  const out = [];
  let inBlock = false;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const lineText = lines[lineIndex] ?? '';
    let text = '';
    let inString = false;
    let stringQuote = '';

    for (let column = 0; column < lineText.length; column += 1) {
      const char = lineText[column];
      const nextChar = lineText[column + 1] ?? '';

      if (inBlock) {
        if (char === '*' && nextChar === '/') {
          inBlock = false;
          column += 1;
        }
        text += ' ';
        continue;
      }

      if (inString) {
        if (char === '\\') {
          column += 1;
          text += '  ';
          continue;
        }
        if (char === stringQuote) {
          inString = false;
        }
        text += ' ';
        continue;
      }

      if (char === '/' && nextChar === '/') {
        column = lineText.length;
        continue;
      }

      if (char === '/' && nextChar === '*') {
        inBlock = true;
        column += 1;
        text += '  ';
        continue;
      }

      if (char === "'" || char === '"' || char === '`') {
        inString = true;
        stringQuote = char;
        text += char;
        continue;
      }

      text += char;
    }
    out.push(text);
  }

  return out.join('\n');
}

// Mutation evidence for a module-top `const` container: mutator method calls
// (push/set/add/...), member/index assignment (including compound/increment),
// or Object.assign/defineProperty targeting the declared name. Evidence is
// evaluated on code-only text so comments/strings cannot fabricate it.
function isMutatedConstContainer(codeOnly, declarationLine) {
  const nameMatch = declarationLine.match(/^const\s+([A-Za-z_$][\w$]*)/);
  if (!nameMatch) {
    return false;
  }
  const name = nameMatch[1];
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const mutatorCall = new RegExp(
    `\\b${esc}\\s*\\.\\s*(?:push|pop|shift|unshift|splice|sort|reverse|fill|copyWithin|set|add|delete|clear)\\s*\\(`,
  );
  const memberAssign = new RegExp(
    `\\b${esc}(?:\\s*\\.\\s*\\w+|\\s*\\[\\s*[^\\]]*\\s*\\])+\\s*(?:=(?!=)|\\+=|-=|\\*=|\\/=|\\+\\+|--)`,
  );
  const helperAssign = new RegExp(`Object\\.(?:assign|defineProperty)\\s*\\(\\s*${esc}\\b`);
  return mutatorCall.test(codeOnly) || memberAssign.test(codeOnly) || helperAssign.test(codeOnly);
}

export function scanTopLevelLets({ rule, relativePath, content }) {
  const results = [];
  const lines = content.split(/\r?\n/);
  let braceDepth = 0;
  let inBlockComment = false;
  let inString = false;
  let stringQuote = '';

  // Module-top mutable containers declared with `const`: array/object literals
  // and Map/Set/WeakMap/WeakSet/Array/Object constructors hold mutable state
  // that can leak across test cases just like `let` module-top state (0150-3
  // Deferred But Adjudicated, adopted 2026-08-09). Only containers with real
  // mutation evidence are flagged — a never-mutated `const` fixture cannot
  // leak state (live hit-surface calibration, 2026-08-09 tool-governance
  // round). Primitive values, frozen containers (`Object.freeze`), `as const`
  // assertions, regex literals and function references are excluded.
  const constContainerPattern =
    /^const\s+[A-Za-z_$][\w$]*\s*=\s*(?:\[|\{|\bnew\s+(?:Map|Set|WeakMap|WeakSet|Array|Object)\s*(?:<(?:[^>=]|=>)*>)?\s*\()/;
  const codeOnly = stripCommentsAndStrings(content);

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const lineText = lines[lineIndex] ?? '';
    const trimmed = lineText.trim();

    // Skip the declaration checks while the line starts inside a block
    // comment (commented-out code must not register as module state).
    if (!inBlockComment && braceDepth === 0) {
      if (/^let\s+[A-Za-z_$][\w$]*\s*(?::|=|;)/.test(trimmed)) {
        results.push(
          createResult(
            rule,
            relativePath,
            lineIndex + 1,
            lineText,
            trimmed.match(/^let\s+[A-Za-z_$][\w$]*/)?.[0] ?? 'let',
          ),
        );
      } else if (
        constContainerPattern.test(trimmed) &&
        !/Object\.freeze\s*\(/.test(trimmed) &&
        !/\bas\s+const\b/.test(trimmed) &&
        isMutatedConstContainer(codeOnly, trimmed)
      ) {
        results.push(
          createResult(
            rule,
            relativePath,
            lineIndex + 1,
            lineText,
            trimmed.match(/^const\s+[A-Za-z_$][\w$]*/)?.[0] ?? 'const',
          ),
        );
      }
    }

    let lineComment = false;
    for (let column = 0; column < lineText.length; column += 1) {
      const char = lineText[column];
      const nextChar = lineText[column + 1] ?? '';

      if (lineComment) {
        break;
      }

      if (inBlockComment) {
        if (char === '*' && nextChar === '/') {
          inBlockComment = false;
          column += 1;
        }
        continue;
      }

      if (inString) {
        if (char === '\\') {
          column += 1;
          continue;
        }
        if (char === stringQuote) {
          inString = false;
          stringQuote = '';
        }
        continue;
      }

      if (char === '/' && nextChar === '/') {
        lineComment = true;
        continue;
      }

      if (char === '/' && nextChar === '*') {
        inBlockComment = true;
        column += 1;
        continue;
      }

      if (char === "'" || char === '"' || char === '`') {
        inString = true;
        stringQuote = char;
        continue;
      }

      if (char === '{') {
        braceDepth += 1;
        continue;
      }

      if (char === '}') {
        braceDepth = Math.max(0, braceDepth - 1);
      }
    }
  }

  return results;
}

export async function scanFilesWithRules(rules) {
  const files = [];
  const base = scanRootOverride ?? rootDir;
  for (const root of scanRoots) {
    files.push(...(await collectSourceFiles(path.join(base, root))));
  }

  const allResults = [];
  for (const filePath of files) {
    const relativePath = toScanRelativePath(filePath);
    const activeRules = rules.filter((rule) => rule.include(relativePath));
    if (activeRules.length === 0) {
      continue;
    }

    const content = await readFile(filePath, 'utf8');
    for (const rule of activeRules) {
      if (rule.scanWithContent) {
        allResults.push(...rule.scanWithContent({ rule, relativePath, content }));
        continue;
      }

      for (const pattern of rule.patterns) {
        const regex = new RegExp(pattern.source, pattern.flags);
        let match;
        while ((match = regex.exec(content)) !== null) {
          const line = getLineNumber(content, match.index);
          const lineText = getLineText(content, line);
          if (
            rule.filterMatch &&
            !rule.filterMatch({ match, lineText, content, line, relativePath })
          ) {
            continue;
          }
          allResults.push(createResult(rule, relativePath, line, lineText, match[0]));
        }
      }
    }
  }

  allResults.sort((a, b) => {
    return (
      a.ruleId.localeCompare(b.ruleId) || a.filePath.localeCompare(b.filePath) || a.line - b.line
    );
  });

  return allResults;
}

export function printResults(results, rules, label = 'discover-audit-suspects') {
  if (results.length === 0) {
    console.log(`[${label}] No suspect matches found.`);
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
    `[${label}] Found ${results.length} suspect matches across ${grouped.size} rule buckets.`,
  );

  for (const rule of rules) {
    const bucket = grouped.get(rule.id);
    if (!bucket || bucket.length === 0) {
      continue;
    }

    console.log(`\n[${rule.severity}] ${rule.id} - ${rule.description}`);
    for (const result of bucket) {
      console.log(`  ${result.filePath}:${result.line}`);
      console.log(`    ${result.lineText}`);
    }
  }
}

export async function runScanner({ label, rules }) {
  const results = await scanFilesWithRules(rules);
  printResults(results, rules, label);
}

export function handleFatalError(label, error) {
  console.error(`[${label}] Error:`, error);
  process.exit(1);
}
