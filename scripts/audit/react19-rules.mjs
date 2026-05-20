import { createResult, getLineNumber, isTestFile } from './shared.mjs';

function hasUseNoMemoDirective(content) {
  return /^\s*['"]use no memo['"]\s*;?\s*$/m.test(content);
}

function scanRedundantReactMemo({ rule, relativePath, content }) {
  if (hasUseNoMemoDirective(content)) {
    return [];
  }

  const results = [];
  const lines = content.split(/\r?\n/);
  const memoPattern = /\b(?:React\.)?memo\s*\(/g;
  let match;

  while ((match = memoPattern.exec(content)) !== null) {
    const line = getLineNumber(content, match.index);
    const windowStart = Math.max(0, line - 3);
    const windowEnd = Math.min(lines.length, line + 3);
    const windowText = lines.slice(windowStart, windowEnd).join('\n');

    if (windowText.includes('eslint-disable') && windowText.includes('react-compiler')) {
      continue;
    }

    const lineText = lines[line - 1] ?? '';
    results.push(
      createResult(rule, relativePath, line, lineText, 'React.memo (redundant with React Compiler)'),
    );
  }

  return results;
}

function scanRedundantUseCallback({ rule, relativePath, content }) {
  if (hasUseNoMemoDirective(content)) {
    return [];
  }

  const results = [];
  const lines = content.split(/\r?\n/);
  const pattern = /\buseCallback\s*\(/g;
  let match;

  while ((match = pattern.exec(content)) !== null) {
    const line = getLineNumber(content, match.index);
    const windowStart = Math.max(0, line - 2);
    const windowEnd = Math.min(lines.length, line + 2);
    const windowText = lines.slice(windowStart, windowEnd).join('\n');

    if (windowText.includes('eslint-disable') && windowText.includes('react-compiler')) {
      continue;
    }

    const lineText = lines[line - 1] ?? '';
    results.push(
      createResult(rule, relativePath, line, lineText, 'useCallback (redundant with React Compiler)'),
    );
  }

  return results;
}

function scanRedundantUseMemo({ rule, relativePath, content }) {
  if (hasUseNoMemoDirective(content)) {
    return [];
  }

  const results = [];
  const lines = content.split(/\r?\n/);
  const pattern = /\buseMemo\s*\(/g;
  let match;

  while ((match = pattern.exec(content)) !== null) {
    const line = getLineNumber(content, match.index);
    const windowStart = Math.max(0, line - 2);
    const windowEnd = Math.min(lines.length, line + 2);
    const windowText = lines.slice(windowStart, windowEnd).join('\n');

    if (windowText.includes('eslint-disable') && windowText.includes('react-compiler')) {
      continue;
    }

    const lineText = lines[line - 1] ?? '';
    results.push(
      createResult(rule, relativePath, line, lineText, 'useMemo (redundant with React Compiler)'),
    );
  }

  return results;
}

function scanDerivedStatePattern({ rule, relativePath, content }) {
  if (hasUseNoMemoDirective(content)) {
    return [];
  }

  const results = [];
  const lines = content.split(/\r?\n/);
  const effectSetStatePattern = /useEffect\s*\(\s*\(\)\s*=>\s*\{[^}]*\bset[A-Z]\w*\s*\(/g;
  let match;

  while ((match = effectSetStatePattern.exec(content)) !== null) {
    const line = getLineNumber(content, match.index);
    const windowStart = Math.max(0, line - 1);
    const windowEnd = Math.min(lines.length, line + 15);
    const windowText = lines.slice(windowStart, windowEnd).join('\n');

    if (windowText.includes('async') || windowText.includes('await') || windowText.includes('fetch')) {
      continue;
    }

    if (windowText.includes('subscribe') || windowText.includes('addEventListener')) {
      continue;
    }

    const lineText = lines[line - 1] ?? '';
    results.push(
      createResult(
        rule,
        relativePath,
        line,
        lineText,
        'useEffect sets state synchronously (possible derived state, consider useMemo or compute during render)',
      ),
    );
  }

  return results;
}

function scanStartTransitionUsage({ rule, relativePath, content }) {
  const results = [];
  const lines = content.split(/\r?\n/);
  const pattern = /\bstartTransition\s*\(/g;
  let match;

  while ((match = pattern.exec(content)) !== null) {
    const line = getLineNumber(content, match.index);
    const windowStart = Math.max(0, line - 3);
    const windowEnd = Math.min(lines.length, line + 5);
    const windowText = lines.slice(windowStart, windowEnd).join('\n');

    if (
      windowText.includes('validate') ||
      windowText.includes('submit') ||
      windowText.includes('dispatch') ||
      windowText.includes('save') ||
      windowText.includes('form.')
    ) {
      const lineText = lines[line - 1] ?? '';
      results.push(
        createResult(
          rule,
          relativePath,
          line,
          lineText,
          'startTransition wrapping critical action (validate/submit/dispatch/save should not be deferred)',
        ),
      );
    }
  }

  return results;
}

export const react19OptimizationRules = [
  {
    id: 'redundant-react-memo',
    severity: 'info',
    description:
      'React.memo is redundant when React Compiler is enabled (Compiler auto-memoizes). Remove unless there is an eslint-disable comment for react-compiler.',
    include: (filePath) => /\.(tsx|jsx)$/.test(filePath) && !isTestFile(filePath),
    scanWithContent: scanRedundantReactMemo,
  },
  {
    id: 'redundant-use-callback',
    severity: 'info',
    description:
      'useCallback is redundant when React Compiler is enabled (Compiler auto-memoizes). Remove unless there is an eslint-disable comment for react-compiler.',
    include: (filePath) => /\.(tsx|jsx)$/.test(filePath) && !isTestFile(filePath),
    scanWithContent: scanRedundantUseCallback,
  },
  {
    id: 'redundant-use-memo',
    severity: 'info',
    description:
      'useMemo is redundant when React Compiler is enabled (Compiler auto-memoizes). Remove unless there is an eslint-disable comment for react-compiler.',
    include: (filePath) => /\.(tsx|jsx)$/.test(filePath) && !isTestFile(filePath),
    scanWithContent: scanRedundantUseMemo,
  },
  {
    id: 'derived-state-in-effect',
    severity: 'info',
    description:
      'useEffect synchronously sets state that could be derived during render (useMemo or direct computation). See docs/skills/react19-best-practices-review.md.',
    include: (filePath) => /\.(tsx|jsx)$/.test(filePath) && !isTestFile(filePath),
    scanWithContent: scanDerivedStatePattern,
  },
  {
    id: 'start-transition-on-critical-action',
    severity: 'info',
    description:
      'startTransition wraps a critical action (validate/submit/dispatch/save). These should not be deferred. See docs/skills/react19-best-practices-review.md.',
    include: (filePath) => /\.(tsx|jsx)$/.test(filePath) && !isTestFile(filePath),
    scanWithContent: scanStartTransitionUsage,
  },
];
