import { createResult, getLineNumber, isTestFile, scanTopLevelLets } from './shared.mjs';

const allowedFieldFrameOwnerPrefixes = ['packages/flux-react/src/'];
const documentedFieldFrameBypassAllowlist = new Set([
  'packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx',
]);

const knownReactiveReadSafePaths = [
  /^apps\/playground\/src\/pages\//,
  /^packages\/flux-react\/src\/schema-renderer\.tsx$/,
  /^packages\/flux-renderers-form\/src\/field-utils\.tsx$/,
  /^packages\/flux-renderers-form\/src\/renderers\/form\.tsx$/,
  /\/test-support\.tsx$/,
];

const knownSafeFireAndForgetPatterns = [
  /\b(?:currentForm|parentForm)\.(?:validateField|validateSubtree|validateAll)\b/,
  /\bcurrentValidationScope\.validateAt\b/,
  /\b(?:ctx|ownerRuntime)\.revalidateDependents\b/,
  /\b(?:handleSave|runSave|handleQuerySubmit|invokeAction|setSelectionTarget|refreshDerivedState|refreshFieldSources)\b/,
  /\b(?:handleContextCopy|handleContextCut|handleContextPaste|handleContextClear|handleContextSort|handleContextFilterBySelectedValue|handleContextClearFilter|handleContextMerge|handleContextUnmerge|handleContextFreeze|handleContextUnfreeze|handleContextInsertRow|handleContextInsertRowBelow|handleContextDeleteRow|handleContextInsertColumn|handleContextInsertColumnRight|handleContextDeleteColumn)\b/,
  /\bbridge\.dispatch\b/,
  /\bPromise\.resolve\(\)\.then\(/,
  /\b(?:runRequest|runReaction)\b/,
];

const knownAsyncSafePaths = [
  /^packages\/flux-runtime\/src\/async-data\//,
  /^packages\/spreadsheet-renderers\/src\/spreadsheet-grid\/spreadsheet-grid-context-menu\.tsx$/,
  /^packages\/spreadsheet-renderers\/src\/spreadsheet-interactions\/use-selection\.ts$/,
  /^packages\/report-designer-renderers\/src\/report-spreadsheet-canvas\.tsx$/,
  /^packages\/report-designer-core\/src\/core\.ts$/,
  /^packages\/flow-designer-renderers\/src\/designer-toolbar\.tsx$/,
  /^packages\/flux-renderers-data\/src\/table-renderer\/table-quick-edit-cell\.tsx$/,
  /^packages\/word-editor-renderers\/src\/word-editor-page\.tsx$/,
  /^packages\/flux-renderers-data\/src\/crud-renderer\.tsx$/,
  /^packages\/flux-renderers-form\/src\/renderers\/form\.tsx$/,
];

function shouldIgnoreReactiveRenderRead(relativePath, lineText, content, line) {
  if (knownReactiveReadSafePaths.some((pattern) => pattern.test(relativePath))) {
    return true;
  }

  if (lineText.includes('=>')) {
    return true;
  }

  const lines = content.split(/\r?\n/);
  const windowStart = Math.max(0, line - 20);
  const windowEnd = Math.min(lines.length, line + 1);
  const windowText = lines.slice(windowStart, windowEnd).join('\n');

  if (windowText.includes('registerField({')) {
    return true;
  }

  if (
    windowText.includes('getValue() {') ||
    windowText.includes('validate() {') ||
    windowText.includes('validateChild(')
  ) {
    return true;
  }

  if (windowText.includes('fetcher<') || windowText.includes('fetcher(')) {
    return true;
  }

  return false;
}

function shouldIgnoreAsyncFailure(relativePath, lineText, content, line) {
  if (knownAsyncSafePaths.some((pattern) => pattern.test(relativePath))) {
    return true;
  }

  if (lineText.includes('.catch(')) {
    return true;
  }

  if (knownSafeFireAndForgetPatterns.some((pattern) => pattern.test(lineText))) {
    return true;
  }

  const lines = content.split(/\r?\n/);
  const windowStart = Math.max(0, line - 25);
  const windowEnd = Math.min(lines.length, line + 5);
  const windowText = lines.slice(windowStart, windowEnd).join('\n');

  if (
    windowText.includes('onClick={() => void') ||
    windowText.includes('onMouseDown={(e) =>') ||
    windowText.includes('onBlurCapture')
  ) {
    return true;
  }

  if (
    windowText.includes('try {') &&
    (windowText.includes('catch') || windowText.includes('finally'))
  ) {
    return true;
  }

  if (windowText.includes('setTimeout(() => {')) {
    return true;
  }

  return false;
}

function shouldIgnoreTestGlobalPatch(lineText, content) {
  const trimmed = lineText.trim();

  if (trimmed.includes('window.__NOP_DEBUGGER__')) {
    if (
      content.includes('delete window.__NOP_DEBUGGER__') ||
      content.includes('vi.unstubAllGlobals()')
    ) {
      return true;
    }
  }

  return false;
}

function scanMissingRendererMarkers({ rule, relativePath, content }) {
  if (!content.includes('RendererComponentProps')) {
    return [];
  }

  if (content.includes('nop-')) {
    return [];
  }

  const anchorIndex =
    content.indexOf('export function ') >= 0
      ? content.indexOf('export function ')
      : content.indexOf('return (') >= 0
        ? content.indexOf('return (')
        : 0;

  return [
    createResult(
      rule,
      relativePath,
      getLineNumber(content, anchorIndex),
      'No nop-* marker found in renderer component file',
      'missing nop-* marker',
    ),
  ];
}

function findMatchingParen(content, openIndex) {
  let depth = 0;
  let inString = false;
  let stringQuote = '';
  let inLineComment = false;
  let inBlockComment = false;

  for (let index = openIndex; index < content.length; index += 1) {
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

    if (char === '(') {
      depth += 1;
      continue;
    }

    if (char === ')') {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }

  return -1;
}

function findStatementEnd(content, startIndex) {
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

    if (char === ';' && parenDepth === 0 && braceDepth === 0 && bracketDepth === 0) {
      return index;
    }
  }

  return content.length;
}

function hasTopLevelComma(text) {
  let inString = false;
  let stringQuote = '';
  let inLineComment = false;
  let inBlockComment = false;
  let parenDepth = 0;
  let braceDepth = 0;
  let bracketDepth = 0;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1] ?? '';

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

    if (char === ',' && parenDepth === 0 && braceDepth === 0 && bracketDepth === 0) {
      return true;
    }
  }

  return false;
}

function scanCatchWithoutStructuredFailurePath({ rule, relativePath, content }) {
  const results = [];
  const catchPattern = /\bcatch\s*(?:\([^)]*\))?\s*\{/g;
  let match;

  while ((match = catchPattern.exec(content)) !== null) {
    const blockStart = content.indexOf('{', match.index);
    const blockEnd = findMatchingBrace(content, blockStart);
    if (blockEnd < 0) {
      continue;
    }

    const body = content.slice(blockStart + 1, blockEnd).trim();
    const normalized = body.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '').trim();
    const hasStructuredFailurePath =
      /\bthrow\b/.test(normalized) ||
      /\b(?:monitor|telemetry|diagnostic|diagnostics|reportError|onError|errorHandler)\b/.test(
        normalized,
      ) ||
      /\bset[A-Z]\w*(?:Error|Failure|Status)\b/.test(normalized) ||
      /\b(?:toast|notify)\s*\(/.test(normalized) ||
      /\bcause\s*:/.test(normalized);
    const looksSwallowed =
      normalized.length === 0 ||
      /^(?:void\s+\w+\s*;?\s*)+$/.test(normalized) ||
      !hasStructuredFailurePath;

    if (looksSwallowed) {
      results.push(
        createResult(
          rule,
          relativePath,
          getLineNumber(content, match.index),
          content.split(/\r?\n/)[getLineNumber(content, match.index) - 1] ?? '',
          'catch without structured failure path',
        ),
      );
    }
  }

  return results;
}

function findMatchingBrace(content, openIndex) {
  let depth = 0;
  let inString = false;
  let stringQuote = '';
  let inLineComment = false;
  let inBlockComment = false;

  for (let index = openIndex; index < content.length; index += 1) {
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

    if (char === '{') {
      depth += 1;
      continue;
    }

    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }

  return -1;
}

function scanThenWithoutCatch({ rule, relativePath, content }) {
  const results = [];
  const thenPattern = /\.then\s*\(/g;
  let match;

  while ((match = thenPattern.exec(content)) !== null) {
    const thenOpenIndex = content.indexOf('(', match.index);
    const thenCloseIndex = findMatchingParen(content, thenOpenIndex);
    if (thenCloseIndex < 0) {
      continue;
    }

    const statementStart = content.lastIndexOf('\n', match.index) + 1;
    const statementEnd = findStatementEnd(content, statementStart);
    const statement = content.slice(statementStart, statementEnd + 1);
    const line = getLineNumber(content, match.index);
    const lineText = content.split(/\r?\n/)[line - 1] ?? '';
    const thenArgs = content.slice(thenOpenIndex + 1, thenCloseIndex);

    if (
      statement.includes('.catch(') ||
      statement.trim().startsWith('return ') ||
      statement.includes('import(') ||
      hasTopLevelComma(thenArgs)
    ) {
      continue;
    }

    if (shouldIgnoreAsyncFailure(relativePath, lineText, content, line)) {
      continue;
    }

    results.push(
      createResult(rule, relativePath, line, lineText, 'then chain without catch'),
    );
  }

  return results;
}

function scanBroadScopeSelectors({ rule, relativePath, content }) {
  const results = [];
  const selectorPattern = /\buseScopeSelector\s*\(/g;
  let match;

  while ((match = selectorPattern.exec(content)) !== null) {
    const openIndex = content.indexOf('(', match.index);
    const closeIndex = findMatchingParen(content, openIndex);
    if (closeIndex < 0) {
      continue;
    }

    const callText = content.slice(match.index, closeIndex + 1);
    if (/\bpaths\s*:/.test(callText)) {
      continue;
    }

    const line = getLineNumber(content, match.index);
    const lineText = content.split(/\r?\n/)[line - 1] ?? '';
    results.push(
      createResult(rule, relativePath, line, lineText, 'useScopeSelector without paths'),
    );
  }

  return results;
}

function scanJsonStringifyChangeDetection({ rule, relativePath, content }) {
  const results = [];
  const lines = content.split(/\r?\n/);
  const pattern = /\bJSON\.stringify\s*\(/g;
  let match;

  while ((match = pattern.exec(content)) !== null) {
    const line = getLineNumber(content, match.index);
    const windowText = lines.slice(Math.max(0, line - 3), Math.min(lines.length, line + 3)).join('\n');
    const lineText = lines[line - 1] ?? '';

    const looksLikeSerialization =
      /\b(?:localStorage|sessionStorage|fetch|Request|Response|Blob|postMessage|writeFile|setItem)\b/.test(
        windowText,
      ) ||
      /\b(?:body|payload|clipboardData)\b\s*:/.test(windowText) ||
      /JSON\.stringify\([^\n]+,\s*null\s*,\s*2\s*\)/.test(windowText) ||
      /\b(?:append|serialize|parse|format|stringifyDebugValue|stringifyAuditValue)\b/.test(windowText);
    const looksLikeChangeDetection =
      /\b(?:useMemo|useEffect|useCallback)\b/.test(windowText) ||
      /(?:===|!==|==|!=)/.test(windowText) ||
      /(?:Key|key|Hash|hash)\s*=/.test(windowText);

    if (!looksLikeSerialization && looksLikeChangeDetection) {
      results.push(
        createResult(rule, relativePath, line, lineText, 'JSON.stringify change detection'),
      );
    }
  }

  return results;
}

function scanBareDataSlotSelectors({ rule, relativePath, content }) {
  const results = [];
  const lines = content.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const lineText = lines[index] ?? '';
    const trimmed = lineText.trim();

    if (!trimmed.includes('[data-slot')) {
      continue;
    }

    if (
      /^(?:>|\+|~|,)?\s*\[data-slot/.test(trimmed) &&
      !/^\[data-slot[^\]]+\]\.[A-Za-z_-]/.test(trimmed)
    ) {
      results.push(
        createResult(rule, relativePath, index + 1, lineText, 'bare [data-slot] selector'),
      );
    }
  }

  return results;
}

export const reactiveRenderReadRules = [
  {
    id: 'reactive-render-read',
    severity: 'high',
    description: 'Possible imperative scope/store read in render-sensitive code',
    include: (filePath) => /\.(tsx|jsx)$/.test(filePath) && !isTestFile(filePath),
    patterns: [
      /\bscope\.get\s*\(/g,
      /\bscope\.read\s*\(/g,
      /\bscope\.readOwn\s*\(/g,
      /\b(?:runtime|store)\.getState\s*\(/g,
    ],
    filterMatch: ({ relativePath, lineText, content, line }) => {
      return !shouldIgnoreReactiveRenderRead(relativePath, lineText, content, line);
    },
  },
  {
    id: 'broad-scope-selector',
    severity: 'medium',
    description: 'useScopeSelector call has no explicit paths option',
    include: (filePath) => {
      return (
        /\.(tsx|jsx)$/.test(filePath) &&
        !isTestFile(filePath) &&
        !filePath.includes('/test-support')
      );
    },
    scanWithContent: scanBroadScopeSelectors,
  },
];

export const asyncFailureRules = [
  {
    id: 'void-promise-no-catch',
    severity: 'high',
    description: 'Possible fire-and-forget async with no explicit local failure path',
    include: (filePath) => /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(filePath) && !isTestFile(filePath),
    patterns: [
      /\bvoid\s+[A-Za-z_$][\w$.]*\([^;\n]*\)\s*;?/g,
      /\.then\s*\([^\n]*\)\s*\.finally\s*\(/g,
    ],
    filterMatch: ({ relativePath, lineText, content, line }) => {
      return !shouldIgnoreAsyncFailure(relativePath, lineText, content, line);
    },
  },
  {
    id: 'then-chain-no-catch',
    severity: 'medium',
    description: 'Promise .then() chain appears to have no local catch path',
    include: (filePath) => /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(filePath) && !isTestFile(filePath),
    scanWithContent: scanThenWithoutCatch,
  },
  {
    id: 'catch-without-structured-failure-path',
    severity: 'medium',
    description: 'catch block appears to swallow or flatten failure without structured reporting',
    include: (filePath) => /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(filePath) && !isTestFile(filePath),
    scanWithContent: scanCatchWithoutStructuredFailurePath,
  },
];

export const performanceAuditRules = [
  {
    id: 'json-stringify-change-detection',
    severity: 'medium',
    description: 'JSON.stringify appears to be used as change detection or dependency keying',
    include: (filePath) => /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(filePath) && !isTestFile(filePath),
    scanWithContent: scanJsonStringifyChangeDetection,
  },
];

export const stylingAuditRules = [
  {
    id: 'bare-data-slot-selector',
    severity: 'medium',
    description: 'CSS selector targets [data-slot] without a package/component scoping selector',
    include: (filePath) => /^packages\/.*\/src\/.*\.css$/.test(filePath),
    scanWithContent: scanBareDataSlotSelectors,
  },
];

export const fieldFrameBypassRules = [
  {
    id: 'fieldframe-bypass',
    severity: 'medium',
    description: 'Direct FieldFrame usage may bypass shared renderer contract paths',
    include: (filePath) => {
      return (
        /\.(tsx|jsx)$/.test(filePath) &&
        !isTestFile(filePath) &&
        !documentedFieldFrameBypassAllowlist.has(filePath) &&
        !allowedFieldFrameOwnerPrefixes.some((prefix) => filePath.startsWith(prefix))
      );
    },
    patterns: [/\bFieldFrame\b/g],
  },
];

export const testLeakRules = [
  {
    id: 'test-module-top-let',
    severity: 'medium',
    description: 'Mutable module-top state in tests can leak across cases',
    include: (filePath) => isTestFile(filePath),
    scanWithContent: scanTopLevelLets,
  },
  {
    id: 'test-global-patch',
    severity: 'medium',
    description: 'Global patch in tests may need explicit cleanup coverage',
    include: (filePath) => isTestFile(filePath),
    patterns: [
      /\bglobalThis\.[A-Za-z_$][\w$]*\s*=(?!=)\s*/g,
      /\bwindow\.[A-Za-z_$][\w$]*\s*=(?!=)\s*/g,
    ],
    filterMatch: ({ lineText, content }) => {
      return !shouldIgnoreTestGlobalPatch(lineText, content);
    },
  },
];

export const rendererMarkerRules = [
  {
    id: 'missing-renderer-marker',
    severity: 'medium',
    description: 'Renderer component file appears to have no nop-* marker class',
    include: (filePath) => {
      return (
        /^packages\/flux-renderers-[^/]+\/src\/.*\.tsx$/.test(filePath) &&
        !isTestFile(filePath) &&
        !filePath.includes('/test-support')
      );
    },
    scanWithContent: scanMissingRendererMarkers,
  },
];

export const allAuditSuspectRules = [
  ...reactiveRenderReadRules,
  ...asyncFailureRules,
  ...performanceAuditRules,
  ...stylingAuditRules,
  ...fieldFrameBypassRules,
  ...testLeakRules,
  ...rendererMarkerRules,
];
