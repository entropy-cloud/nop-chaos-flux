import { readdir, readFile } from 'fs/promises';
import path from 'path';
import process from 'process';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export const rootDir = path.join(__dirname, '..', '..');
export const scanRoots = ['apps', 'packages', 'tests'];
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

export function isTestFile(filePath) {
  return /(?:\.test\.|\.spec\.|__tests__)/.test(filePath);
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

export function scanTopLevelLets({ rule, relativePath, content }) {
  const results = [];
  const lines = content.split(/\r?\n/);
  let braceDepth = 0;
  let inBlockComment = false;
  let inString = false;
  let stringQuote = '';

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const lineText = lines[lineIndex] ?? '';
    const trimmed = lineText.trim();

    if (braceDepth === 0 && /^let\s+[A-Za-z_$][\w$]*\s*(?::|=|;)/.test(trimmed)) {
      results.push(
        createResult(
          rule,
          relativePath,
          lineIndex + 1,
          lineText,
          trimmed.match(/^let\s+[A-Za-z_$][\w$]*/)?.[0] ?? 'let',
        ),
      );
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
  for (const root of scanRoots) {
    files.push(...(await collectSourceFiles(path.join(rootDir, root))));
  }

  const allResults = [];
  for (const filePath of files) {
    const relativePath = toPosixPath(filePath);
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
