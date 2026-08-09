import { createResult, getLineNumber } from './shared.mjs';

// plan 2026-08-08-0748-1 Phase 2 (HCAX-2 guard 沉淀)：
// canvas/scene-graph host wrapper 的 a11y 契约（`role="application"` + `aria-label`）机械 guard。
// HCAX-2 正是两 industrial canvas renderer 同型遗漏；本 rule 用 allowlist pin 住已知
// `role="application"` canvas host，缺任一契约属性即报 suspect，防 future canvas wrapper（含
// flow-designer 复发，但 flow-designer 另立 `role="button"` 契约，故显式排除避免 false positive）。
// 新增同型 `role="application"` canvas renderer 时须显式登记到 allowlist。
export const canvasWrapperA11yAllowlist = [
  {
    filePath: 'packages/flux-renderers-industrial/src/renderer/scada-canvas.tsx',
    dataSlot: 'scada-canvas',
    contract: ['role="application"', 'aria-label='],
  },
  {
    filePath: 'packages/flux-renderers-industrial/src/editor/scada-editor-canvas.tsx',
    dataSlot: 'scada-editor-canvas',
    contract: ['role="application"', 'aria-label='],
  },
];

function findJsxOpeningTagClose(content, tagStart) {
  let inString = false;
  let stringQuote = '';
  let inLineComment = false;
  let inBlockComment = false;
  let braceDepth = 0;
  for (let i = tagStart; i < content.length; i += 1) {
    const char = content[i];
    const next = content[i + 1] ?? '';
    if (inLineComment) {
      if (char === '\n') inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      if (char === '*' && next === '/') {
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
    if (char === '/' && next === '/') {
      inLineComment = true;
      i += 1;
      continue;
    }
    if (char === '/' && next === '*') {
      inBlockComment = true;
      i += 1;
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
      continue;
    }
    if (char === '>' && braceDepth === 0) return i;
  }
  return -1;
}

function scanCanvasWrapperA11y({ rule, relativePath, content }) {
  const entry = canvasWrapperA11yAllowlist.find((e) => e.filePath === relativePath);
  if (!entry) return [];

  const slotAttr = `data-slot="${entry.dataSlot}"`;
  const slotIndex = content.indexOf(slotAttr);
  if (slotIndex === -1) {
    return [
      createResult(
        rule,
        relativePath,
        1,
        '',
        `allowlist anchor "${slotAttr}" not found (reconcile canvas a11y allowlist)`,
      ),
    ];
  }

  let tagStart = -1;
  for (let i = slotIndex; i > 0; i -= 1) {
    if (content[i] === '<' && /[A-Za-z]/.test(content[i + 1] ?? '')) {
      tagStart = i;
      break;
    }
  }
  if (tagStart === -1) {
    return [
      createResult(rule, relativePath, 1, '', `could not locate opening tag for "${slotAttr}"`),
    ];
  }

  const tagEnd = findJsxOpeningTagClose(content, tagStart);
  if (tagEnd === -1) {
    return [
      createResult(
        rule,
        relativePath,
        1,
        '',
        `could not locate closing '>' for opening tag near "${slotAttr}"`,
      ),
    ];
  }

  const openingTag = content.slice(tagStart, tagEnd + 1);
  const tagStartLine = getLineNumber(content, tagStart);
  const results = [];
  for (const attr of entry.contract) {
    if (!openingTag.includes(attr)) {
      results.push(
        createResult(
          rule,
          relativePath,
          tagStartLine,
          `host wrapper (${entry.dataSlot}) opening tag`,
          `canvas/scene-graph host wrapper missing "${attr}" (contract: ${entry.contract.join(' + ')})`,
        ),
      );
    }
  }
  return results;
}

export const canvasWrapperA11yRules = [
  {
    id: 'canvas-wrapper-a11y',
    severity: 'high',
    description:
      'Canvas/scene-graph host wrapper element is missing role="application" or aria-label (a11y contract per renderer-markers-and-selectors.md)',
    include: (filePath) => canvasWrapperA11yAllowlist.some((e) => e.filePath === filePath),
    scanWithContent: scanCanvasWrapperA11y,
  },
];
