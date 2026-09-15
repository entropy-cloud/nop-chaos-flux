/**
 * check:audit-ui-consistency-gaps — R2/R3 consistency-pattern static gates (D2).
 *
 * Owner doc: `docs/analysis/ui-review/R2-consistency-audit.md` (共性族 1–10 +
 * §R3 收口节 §3 清扫记录); terminal adjudication: plan
 * `docs/plans/2026-08-31-1522-1-d2-consistency-gates-and-roadmap-closure.md`
 * Phase 1 终审落字. Four rules landed from the R2 family-9 / R3 batch-⑦
 * statically decidable sub-patterns:
 *
 *   1. hardcoded-literal-color   — hex / hsl( / rgb( literals, Tailwind
 *      literal color classes, `color-mix(..., white|black)` in renderer
 *      package sources (R2 族9: graph HSL, scheduling hex/red-400, kanban
 *      `bg-white`, gantt color-mix). Pre-existing adjudicated instances are
 *      registered in EXEMPTIONS below and printed as `[exempt]`.
 *   2. hardcoded-cjk-ui-copy     — CJK literals reaching user-visible UI copy
 *      (complements check:i18n-keys, which only validates key existence).
 *      Excluded channels per Phase 1 rulings: `t(..., { defaultValue })`
 *      i18n fallback (①), dev diagnostics `devWarn`/`warnOnce`/`console.*`
 *      (②), schema propContract `description:` author-facing docs.
 *   3. raw-error-message-direct-out — raw `error.message` routed into
 *      user-visible state/JSX (R2 族5/族9 交叉: map/wizard/barcode direct-out).
 *      Excluded: console/dev diagnostics, `t(key, { message })` i18n
 *      interpolation channel. Structured diagnostic payloads are registered
 *      exemptions.
 *   4. data-blob-href-without-download — `data:`/`blob:` href without
 *      download passthrough (R3 batch-⑦ regression guard; the single
 *      playground generator point is registered exempt — schema side carries
 *      `download: true` via the link renderer channel, [G7-R2-视角11-01]).
 *
 * Exemption governance follows the `check:oversized-code-files`
 * OVERSIZED_EXEMPTIONS precedent: in-script constant, every entry carries a
 * reason + R2/R3 adjudication backlink (`source`), exempt instances stay
 * visible in the output (`[exempt]` per-file listing) and never flip the exit
 * code. Red line = zero NEW unregistered instances.
 */

import { readFile } from 'fs/promises';
import path from 'path';
import {
  collectSourceFiles,
  getCodeTextForLine,
  isTestFile,
  rootDir,
} from './shared.mjs';

const LABEL = 'find-ui-consistency-gaps';

// `FLUX_AUDIT_SCAN_ROOT` overrides the scan root so committed script tests can
// host fixtures in a throwaway temp tree while exec-ing this real gate
// (0150-1 stagedDirs governance, DG 2026-08-09; same contract as
// find-event-dispatch-without-ctx.mjs).
const scanRoot = process.env.FLUX_AUDIT_SCAN_ROOT
  ? path.resolve(process.env.FLUX_AUDIT_SCAN_ROOT)
  : rootDir;

function toScanRelativePath(filePath) {
  return path.relative(scanRoot, filePath).split(path.sep).join('/');
}

// ---------------------------------------------------------------------------
// Exemption baseline (adjudicated pre-existing instances; path-prefix match).
// `rule` scopes an entry to one rule id; entries without `rule` cover all
// rules. Every entry must cite its R2/R3 adjudication ledger row or the D2
// plan registration decision. Red line: zero NEW unregistered instances.
// ---------------------------------------------------------------------------
const EXEMPTIONS = [
  // --- scheduling (candidate A 调度域字面色族 + candidate C 错误消息双轨) ---
  {
    path: 'packages/flux-renderers-scheduling/src/',
    reason:
      'R2 族9 调度域字面色/字面 Tailwind 色类族（gantt/kanban/calendar/barcode hex、red-400、bg-white、color-mix white）+ 族5 错误状态消息双轨（calendar 渲染错误/导出失败、kanban 通知、barcode decode 错误）——全部 P2 登记候选，修复归候选池',
    source:
      'r2-audit/r3-p2-adjudication.md #35 [G4-视角1-01] / #36 [G4-视角3-01] / #39 [G4-视角7-01]；族5 候选池',
  },
  // --- industrial（candidate A canvas 绘图域 + candidate C 结构化诊断）------
  {
    path: 'packages/flux-renderers-industrial/src/',
    reason:
      'SCADA leafer canvas 绘图域字面色（符号/引擎 overlay/探针/绑定 fixtures）+ editor CSS 变量回退 hex + 结构化诊断 message 载荷（scada-errors/refresh-pipeline/point-store/parse/event-bridge/config-sync/scada-canvas/scada-editor-canvas）——R2 industrial 静态口径审查域，零色值发现',
    source:
      'D2 plan 2026-08-31-1522-1 Phase 2 豁免登记（R2 G5 组静态口径）；scada-editor-canvas 为 D2 候选 C 规格点名实例',
  },
  // --- 3d（three 渲染域字面色 + 结构化诊断通道）---------------------------
  {
    path: 'packages/flux-renderers-3d/src/',
    reason:
      'three-canvas 引擎域：THREE 灯光默认色（ColorRepresentation hex，非 UI 样式）+ 结构化诊断 message 载荷（useBindingBridge/SceneManager onError 三参通道，scada §8.1 非升级诊断契约对齐，plan 464 D6）——plan 465 登记',
    source:
      'plan 465 Phase 6 closure（industrial 域豁免同款判例：canvas 引擎字面色 + scada-errors 结构化诊断）',
  },
  // --- map（candidate A 域 + candidate C 单文件）---------------------------
  {
    path: 'packages/flux-renderers-map/src/',
    rule: 'hardcoded-literal-color',
    reason: 'R2 族9 map 域字面色（buildPinStyle/buildClusterStyle、map-color 工具、styles.css）',
    source: 'r2-audit/r3-p2-adjudication.md #98 [G5-R2-视角5-02] / #49 [G5-视角9-01]',
  },
  {
    path: 'packages/flux-renderers-map/src/use-map-geojson.ts',
    rule: 'raw-error-message-direct-out',
    reason: 'region 加载错误状态消息（族5 候选池登记）',
    source: 'r2-audit/r3-p2-adjudication.md 族5 候选池（#98 邻域）',
  },
  {
    path: 'packages/flux-renderers-map/src/map-renderer.tsx',
    rule: 'raw-error-message-direct-out',
    reason:
      'R2 族9 已裁决登记的 map 错误直出实例（本地化回退双轨 `error instanceof Error ? error.message : t(...)`），修复归 P2 候选池',
    source: 'r2-audit/r3-p2-adjudication.md #98 [G5-R2-视角5-02]',
  },
  // --- graph ----------------------------------------------------------------
  {
    path: 'packages/flux-renderers-graph/src/styles.css',
    rule: 'hardcoded-literal-color',
    reason: 'graph HSL 字面量族',
    source: 'r2-audit/r3-p2-adjudication.md #100 [G5-R2-视角7-01]',
  },
  // --- ai -------------------------------------------------------------------
  {
    path: 'packages/flux-renderers-ai/src/styles.css',
    rule: 'hardcoded-literal-color',
    reason: 'AI 包样式色值（R2 G5 组静态审查域）',
    source: 'D2 plan 2026-08-31-1522-1 Phase 2 豁免登记（R2 G5 组）',
  },
  {
    path: 'packages/flux-renderers-ai/src/renderers/ai-tool-call.tsx',
    rule: 'hardcoded-literal-color',
    reason: '工具调用成功态 text-white 字面（R2 ai-tool-call 域）',
    source: 'r2-audit/r3-p2-adjudication.md #99 [G5-R2-视角6-01]（邻域）',
  },
  {
    path: 'packages/flux-renderers-ai/src/engine/tool-execution.ts',
    rule: 'raw-error-message-direct-out',
    reason: 'AI 引擎工具结果文本（结构化 tool result 返回引擎，非 JSX 直出）',
    source: 'D2 plan 2026-08-31-1522-1 Phase 2 豁免登记',
  },
  // --- mobile ---------------------------------------------------------------
  {
    path: 'packages/flux-renderers-mobile/src/styles.css',
    rule: 'hardcoded-literal-color',
    reason: 'mobile 样式色值（notice-bar 变体等域）',
    source: 'r2-audit/r3-p2-adjudication.md #158 [G4-R5-视角3-01]（邻域）',
  },
  // --- data（chart palette 域 + crud/table 错误消息双轨）---------------------
  {
    path: 'packages/flux-renderers-data/src/chart-renderer.tsx',
    rule: 'hardcoded-literal-color',
    reason: 'chart 默认调色板（数据可视化域常量）',
    source: 'D2 plan 2026-08-31-1522-1 Phase 2 豁免登记',
  },
  {
    path: 'packages/flux-renderers-data/src/sparkline-renderer.tsx',
    rule: 'hardcoded-literal-color',
    reason: 'sparkline 默认色（数据可视化域常量）',
    source: 'D2 plan 2026-08-31-1522-1 Phase 2 豁免登记',
  },
  {
    path: 'packages/flux-renderers-data/src/chart-heatmap.tsx',
    rule: 'hardcoded-literal-color',
    reason: 'heatmap 默认色带（数据可视化域常量）',
    source: 'D2 plan 2026-08-31-1522-1 Phase 2 豁免登记',
  },
  {
    path: 'packages/flux-renderers-data/src/echarts-theme.ts',
    rule: 'hardcoded-literal-color',
    reason: 'echarts flux 主题 CSS 变量不可用时的静态回退调色板（数据可视化域常量，同 chart-renderer 域）',
    source: 'docs/logs/2026/09-15.md 收口核查豁免登记',
  },
  {
    path: 'packages/flux-renderers-data/src/stat-tile-renderer.tsx',
    rule: 'hardcoded-literal-color',
    reason: 'stat-tile 趋势色（R2 stat-tile 域）',
    source: 'r2-audit/r3-p2-adjudication.md #29 [G3-视角9-01]',
  },
  {
    path: 'packages/flux-renderers-data/src/crud-renderer-load.ts',
    rule: 'raw-error-message-direct-out',
    reason: 'env.notify 错误通道透传（族5 候选池登记）',
    source: 'r2-audit/r3-p2-adjudication.md 族5 候选池',
  },
  {
    path: 'packages/flux-renderers-data/src/crud-renderer.tsx',
    rule: 'raw-error-message-direct-out',
    reason: 'crud 保存错误状态消息双轨（族5 候选池登记）',
    source: 'r2-audit/r3-p2-adjudication.md 族5 候选池',
  },
  {
    path: 'packages/flux-renderers-data/src/table-renderer/table-quick-edit-cell.tsx',
    rule: 'raw-error-message-direct-out',
    reason: 'quick-edit 保存错误消息本地化回退双轨（族5 候选池登记）',
    source: 'r2-audit/r3-p2-adjudication.md 族5 候选池',
  },
  {
    path: 'packages/flux-renderers-data/src/table-renderer/use-table-lazy-children.ts',
    rule: 'raw-error-message-direct-out',
    reason: 'lazy children 加载错误消息本地化回退双轨（族5 候选池登记）',
    source: 'r2-audit/r3-p2-adjudication.md 族5 候选池',
  },
  // --- form-advanced（candidate C 表单域错误消息双轨族）----------------------
  {
    path: 'packages/flux-renderers-form-advanced/src/',
    rule: 'raw-error-message-direct-out',
    reason:
      '表单域错误消息本地化回退双轨/结构化 message 状态（tree-control-sources/object-field/upload-field/detail-view 族）——族5 候选池',
    source:
      'r2-audit/r3-p2-adjudication.md 族5 候选池（#13/#14/#80 upload-field、detail-view 族）',
  },
  // --- form -------------------------------------------------------------------
  {
    path: 'packages/flux-renderers-form/src/form-renderers.css',
    rule: 'hardcoded-literal-color',
    reason: 'form 渲染器 CSS 色值（族9 域）',
    source: 'D2 plan 2026-08-31-1522-1 Phase 2 豁免登记',
  },
  {
    path: 'packages/flux-renderers-form/src/renderers/select-combobox-lists.tsx',
    rule: 'hardcoded-literal-color',
    reason: 'combobox 高亮 bg-yellow-200 字面类',
    source: 'D2 plan 2026-08-31-1522-1 Phase 2 豁免登记',
  },
  {
    path: 'packages/flux-renderers-form/src/field-utils/field-handlers.tsx',
    rule: 'raw-error-message-direct-out',
    reason: '字段更新失败消息回退（族5 候选池登记）',
    source: 'r2-audit/r3-p2-adjudication.md 族5 候选池',
  },
  {
    path: 'packages/flux-renderers-form/src/renderers/use-select-remote-search.ts',
    rule: 'raw-error-message-direct-out',
    reason: '远程搜索错误消息状态（族5 候选池登记）',
    source: 'r2-audit/r3-p2-adjudication.md 族5 候选池',
  },
  // --- content ----------------------------------------------------------------
  {
    path: 'packages/flux-renderers-content/src/',
    rule: 'hardcoded-literal-color',
    reason:
      'content 包字面色（qrcode 暗模块、carousel 渐变 text-white、diff-view bg-gray-50）',
    source:
      'r2-audit/r3-p2-adjudication.md #5 [G1-视角7-08] / #6 [G1-视角7-09]（diff/content 域）；qrcode 为 D2 登记域',
  },
  // --- pivot --------------------------------------------------------------------
  {
    path: 'packages/flux-renderers-pivot/src/pivot-option.ts',
    rule: 'hardcoded-literal-color',
    reason: 'VTable 主题映射层默认色（映射域数据）',
    source: 'D2 plan 2026-08-31-1522-1 Phase 2 豁免登记',
  },
  {
    path: 'packages/flux-renderers-pivot/src/pivot-renderer.tsx',
    rule: 'raw-error-message-direct-out',
    reason: 'pivot 初始化错误状态（族5 候选池登记）',
    source: 'r2-audit/r3-p2-adjudication.md 族5 候选池',
  },
  // --- layout --------------------------------------------------------------------
  {
    path: 'packages/flux-renderers-layout/src/timeline-renderer.tsx',
    rule: 'hardcoded-literal-color',
    reason: 'timeline 图标 text-white 字面（R2 timeline 域）',
    source: 'r2-audit/r3-p2-adjudication.md #132 [G1-R4-视角8-01]（邻域）',
  },
  {
    path: 'packages/flux-renderers-layout/src/wizard-renderer.tsx',
    rule: 'raw-error-message-direct-out',
    reason: 'wizard stepError 状态消息（D2 候选 C 规格点名实例，族5 候选池）',
    source: 'D2 plan 2026-08-31-1522-1 候选 C 规格；族5 候选池',
  },
  // --- basic ----------------------------------------------------------------------
  {
    path: 'packages/flux-renderers-basic/src/dynamic-renderer.tsx',
    rule: 'raw-error-message-direct-out',
    reason: 'dynamic 渲染错误 JSX 展示面',
    source: 'r2-audit/r3-p2-adjudication.md #2 [G1-视角5-05]',
  },
  // --- candidate D: data-blob-href-without-download ------------------------
  {
    path: 'apps/playground/src/complex-pages/shared/showcase-env.ts',
    rule: 'data-blob-href-without-download',
    reason:
      'CSV 导出 data URL 唯一生成点；schema 侧已补 download: true 经 link 渲染器透传（R3 ⑦ 修复），生成点本身无 download 语义可表达',
    source: 'R2 owner doc §R3 收口节 §3 批次⑦ + [G7-R2-视角11-01] link-download.test.tsx',
  },
];

const RENDERER_PACKAGE_SCOPE = /^packages\/flux-renderers-[^/]+\//;

// `rgba(0, 0, 0, 0)` / `rgb(0, 0, 0, 0)` family — the transparent-default
// comparison idiom (getComputedStyle probes), not a styled color.
const TRANSPARENT_COLOR_LITERAL = /^rgba?\(\s*0\s*(?:,\s*0\s*){2,3}\)$/;

// Dev-diagnostic receivers at end of the previous line (multi-line
// `console.warn(\n  '...中文...',\n)` shapes).
const DEV_RECEIVER_AT_EOL = /(?:console\.(?:log|warn|error|info|debug)|devWarn|warnOnce)\s*\(\s*$/;

const RULES = [
  {
    id: 'hardcoded-literal-color',
    severity: 'medium',
    description: 'Renderer source hardcodes a literal color (hex/hsl/rgb, Tailwind literal color class, color-mix white/black)',
    include: (filePath) => {
      return (
        RENDERER_PACKAGE_SCOPE.test(filePath) &&
        /\.(ts|tsx|css)$/.test(filePath) &&
        !isTestFile(filePath)
      );
    },
    patterns: [
      /#[0-9a-fA-F]{3,8}\b/g,
      /\b(?:hsl|hsla|rgb|rgba)\s*\(/g,
      /\b(?:bg|text|border|ring|fill|stroke|from|to|via|outline|decoration|divide|accent|caret)-(?:white|black|(?:red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone)(?:-\d{2,3})?)\b/g,
      /color-mix\(\s*[^;]*\b(?:white|black)\b/g,
    ],
  },
  {
    id: 'hardcoded-cjk-ui-copy',
    severity: 'medium',
    description: 'Renderer source hardcodes CJK user-visible UI copy (bypasses the i18n channel)',
    include: (filePath) => {
      return (
        RENDERER_PACKAGE_SCOPE.test(filePath) &&
        /\.(ts|tsx)$/.test(filePath) &&
        !isTestFile(filePath)
      );
    },
    patterns: [/[\u4e00-\u9fff]/g],
    filterLine(codeText, lines, lineIndex) {
      // Phase 1 ruling ①: `t(..., { defaultValue })` i18n fallback channel.
      if (/\bt\s*\(/.test(codeText) && /defaultValue\s*:/.test(codeText)) {
        return true;
      }
      if (/^\s*defaultValue\s*:\s*['"`]/.test(codeText)) {
        return true;
      }
      // Phase 1 ruling ②: dev diagnostics are not user-visible UI copy.
      if (/\b(?:console\.(?:log|warn|error|info|debug)|devWarn|warnOnce)\s*\(/.test(codeText)) {
        return true;
      }
      // Schema propContract description fields are author-facing docs.
      if (/\bdescription\s*:/.test(codeText)) {
        return true;
      }
      const previousLine = lines[lineIndex - 1] ?? '';
      if (DEV_RECEIVER_AT_EOL.test(previousLine.trim())) {
        return true;
      }
      if (/description\s*:\s*$/.test(previousLine.trim())) {
        return true;
      }
      return false;
    },
  },
  {
    id: 'raw-error-message-direct-out',
    severity: 'medium',
    description: 'Renderer routes raw error.message into user-visible state/JSX instead of a structured failure channel',
    include: (filePath) => {
      return (
        RENDERER_PACKAGE_SCOPE.test(filePath) &&
        /\.(ts|tsx)$/.test(filePath) &&
        !isTestFile(filePath)
      );
    },
    patterns: [/\b(?:error|err)\.message\b/g],
    filterLine(codeText, lines, lineIndex) {
      // Dev diagnostic receivers are not user-visible output.
      if (/\b(?:console\.(?:log|warn|error|info|debug)|devWarn|warnOnce)\s*\(/.test(codeText)) {
        return true;
      }
      const previousLine = lines[lineIndex - 1] ?? '';
      if (DEV_RECEIVER_AT_EOL.test(previousLine.trim())) {
        return true;
      }
      // `t(key, { message })` i18n interpolation: a localized template carries
      // the user-facing sentence; the raw message is a template parameter.
      if (/\bt\s*\(\s*['"`][^'"`]*['"`]\s*,\s*\{[^}]*\bmessage\s*:/.test(codeText)) {
        return true;
      }
      return false;
    },
  },
  {
    id: 'data-blob-href-without-download',
    severity: 'high',
    description: 'data:/blob: href without download passthrough (top-level navigation intercepted by modern browsers)',
    include: (filePath) => {
      return (
        /^(?:apps|packages)\//.test(filePath) &&
        /\.(ts|tsx|js|jsx|mjs)$/.test(filePath) &&
        !isTestFile(filePath)
      );
    },
    patterns: [
      /["'`]data:(?:text|application)\//g,
      // Navigation hrefs only — `src:` media/embed sources (audio/video data
      // URIs) are not download-navigation surfaces (live false positive:
      // component-lab audio data-URI src; D2 plan False Path gate-false-positive).
      /href\s*[:=]\s*["'`]?(?:data:|blob:)/g,
    ],
  },
];

function matchRuleLine(rule, codeText, lines, lineIndex) {
  const matches = [];
  for (const pattern of rule.patterns) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match;
    while ((match = regex.exec(codeText)) !== null) {
      if (rule.filterLine && rule.filterLine(codeText, lines, lineIndex)) {
        break;
      }
      matches.push(match[0]);
    }
  }
  const surviving = matches.filter(
    (matchText) => !TRANSPARENT_COLOR_LITERAL.test(matchText),
  );
  // One actionable hit per (rule, line): multiple matches on a line describe
  // the same violation surface (per-character CJK matches included).
  return surviving.length > 0 ? [surviving[0]] : [];
}

function exemptionFor(ruleId, filePath) {
  return EXEMPTIONS.find((entry) => {
    if (entry.rule && entry.rule !== ruleId) {
      return false;
    }
    return filePath.startsWith(entry.path);
  });
}

async function main() {
  const files = [];
  for (const root of ['apps', 'packages', 'tests']) {
    files.push(...(await collectSourceFiles(path.join(scanRoot, root))));
  }

  const hits = [];
  for (const filePath of files) {
    const relativePath = toScanRelativePath(filePath);
    const activeRules = RULES.filter((rule) => rule.include(relativePath));
    if (activeRules.length === 0) {
      continue;
    }

    const content = await readFile(filePath, 'utf8');
    const lines = content.split(/\r?\n/);
    for (const rule of activeRules) {
      for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
        // getCodeTextForLine strips `//` and `/*...*/` comments while keeping
        // string literal contents — className strings and style hex are real
        // hit surfaces, commented-out code must never hit.
        const codeText = getCodeTextForLine(content, lineIndex + 1);
        if (!codeText.trim()) {
          continue;
        }
        const matches = matchRuleLine(rule, codeText, lines, lineIndex);
        for (const matchText of matches) {
          hits.push({
            ruleId: rule.id,
            severity: rule.severity,
            description: rule.description,
            filePath: relativePath,
            line: lineIndex + 1,
            lineText: (lines[lineIndex] ?? '').trim(),
            matchText,
          });
        }
      }
    }
  }

  const exemptHits = [];
  const newHits = [];
  for (const hit of hits) {
    if (exemptionFor(hit.ruleId, hit.filePath)) {
      exemptHits.push(hit);
    } else {
      newHits.push(hit);
    }
  }

  if (exemptHits.length > 0) {
    const exemptByFile = new Map();
    for (const hit of exemptHits) {
      const key = `${hit.ruleId} ${hit.filePath}`;
      exemptByFile.set(key, (exemptByFile.get(key) ?? 0) + 1);
    }
    console.log(
      `[${LABEL}] Exempt baseline: ${exemptHits.length} instance(s) across ${exemptByFile.size} file(s), covered by ${EXEMPTIONS.length} registered exemption entr(ies):`,
    );
    for (const [key, count] of exemptByFile) {
      console.log(`  [exempt] ${key} (${count} instance(s))`);
    }
  }

  if (newHits.length === 0) {
    console.log(
      `[${LABEL}] No new unregistered UI consistency gap instance (rules: ${RULES.map((rule) => rule.id).join(', ')}).`,
    );
    return;
  }

  console.log(
    `[${LABEL}] Found ${newHits.length} new unregistered UI consistency gap instance(s):`,
  );
  let currentRule = '';
  for (const hit of newHits) {
    if (hit.ruleId !== currentRule) {
      currentRule = hit.ruleId;
      const rule = RULES.find((entry) => entry.id === currentRule);
      console.log(`\n[${hit.severity}] ${currentRule} - ${rule?.description ?? ''}`);
    }
    console.log(`  ${hit.filePath}:${hit.line}`);
    console.log(`    ${hit.lineText}`);
  }
  process.exit(1);
}

main().catch((error) => {
  console.error(`[${LABEL}] Error:`, error);
  process.exit(1);
});
