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

  if (windowText.includes('onClick={() => void') || windowText.includes('onMouseDown={(e) =>') || windowText.includes('onBlurCapture')) {
    return true;
  }

  if (windowText.includes('try {') && (windowText.includes('catch') || windowText.includes('finally'))) {
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
];

export const asyncFailureRules = [
  {
    id: 'void-promise-no-catch',
    severity: 'high',
    description: 'Possible fire-and-forget async with no explicit local failure path',
    include: (filePath) => /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(filePath) && !isTestFile(filePath),
    patterns: [/\bvoid\s+[A-Za-z_$][\w$.]*\([^;\n]*\)\s*;?/g, /\.then\s*\([^\n]*\)\s*\.finally\s*\(/g],
    filterMatch: ({ relativePath, lineText, content, line }) => {
      return !shouldIgnoreAsyncFailure(relativePath, lineText, content, line);
    },
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
  ...fieldFrameBypassRules,
  ...testLeakRules,
  ...rendererMarkerRules,
];
