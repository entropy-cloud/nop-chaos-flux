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
import { EXEMPTIONS } from './ui-consistency-exemptions.mjs';

const LABEL = 'find-ui-consistency-gaps';

// `FLUX_AUDIT_SCAN_ROOT` overrides the scan root so committed script tests can
// host fixtures in a throwaway temp tree while exec-ing this real gate
// (0150-1 stagedDirs governance, DG 2026-08-09; same contract as
// find-event-dispatch-without-ctx.mjs).
const scanRoot = process.env.FLUX_AUDIT_SCAN_ROOT
  ? path.resolve(process.env.FLUX_AUDIT_SCAN_ROOT)
  : rootDir;

// plan 470 (visual-quality V0): `--json` switches the report channel to a
// deterministic machine-readable payload (sorted byRule/byFile, no timestamp)
// so the exempt baseline can be snapshotted and diffed by V12 governance.
const jsonMode = process.argv.includes('--json');

function toScanRelativePath(filePath) {
  return path.relative(scanRoot, filePath).split(path.sep).join('/');
}

// ---------------------------------------------------------------------------
// Exemption baseline (adjudicated pre-existing instances; path-prefix match).
// `rule` scopes an entry to one rule id; entries without `rule` cover all
// rules. Every entry must cite its R2/R3 adjudication ledger row or the D2
// plan registration decision. Red line: zero NEW unregistered instances.
// ---------------------------------------------------------------------------
// Exemption baseline lives in `./ui-consistency-exemptions.mjs` (plan 483 A1
// phase-4 split: pure data module; every entry carries reason + adjudication
// source; path-shape guard below enforces file-level paths or explicit
// isPrefix markers).


// plan 483 A3 adjudication: these engine/bridge/parse-layer files route
// `error.message` into structured diagnostic payloads (onError three-arg
// engine channel, diagnostic tuple builders, tool-result text back to the
// engine) and never into user-visible UI state/JSX. They are the permanent
// structured-channel register — lines here are filtered from the
// raw-error-message-direct-out rule BEFORE exemption accounting, so they do
// not consume EXEMPTIONS entries. New entries must cite their adjudication.
const STRUCTURED_ERROR_CHANNEL_FILES = new Set([
  // industrial (11): scada §8.1 non-escalating diagnostic contract, D2 候选 C
  'packages/flux-renderers-industrial/src/binding/point-store.ts',
  'packages/flux-renderers-industrial/src/binding/refresh-pipeline.ts',
  'packages/flux-renderers-industrial/src/editor/scada-editor-canvas.tsx',
  'packages/flux-renderers-industrial/src/engine/event-bridge.ts',
  'packages/flux-renderers-industrial/src/renderer/hooks/use-scada-config-sync.ts',
  'packages/flux-renderers-industrial/src/renderer/scada-canvas.tsx',
  'packages/flux-renderers-industrial/src/renderer/scada-errors.ts',
  'packages/flux-renderers-industrial/src/serialization/parse.ts',
  // 3d (4): onError three-arg engine channel (plan 464/465 判例)
  'packages/flux-renderers-3d/src/ai/schema-generator.ts',
  'packages/flux-renderers-3d/src/binding/transform-engine.ts',
  'packages/flux-renderers-3d/src/renderer/hooks/use-binding-bridge.ts',
  // ai (1): tool result text back to the engine
  'packages/flux-renderers-ai/src/engine/tool-execution.ts',
  // form-advanced (1): upload onUploadError event payload `error` field is the
  // schema-action machine channel (CX-10 / bug-83 family — `${error}` in action
  // args resolves to the server's raw message, pinned by the upload-field
  // `${error}` dispatch test since before plan 483). User-visible text in the
  // same file goes through the `t(key, { message })` channel. plan 483 A3
  // closing-session adjudication.
  'packages/flux-renderers-form-advanced/src/upload-field.tsx',
]);

// plan 483 A1 path-shape guard: a directory-prefix exemption silently
// auto-exempts every new instance added anywhere under it (the V12a-F1
// local-gate-degradation finding). Fail fast unless the entry is a real file
// path or carries an explicit `isPrefix: true` adjudication marker.
for (const entry of EXEMPTIONS) {
  if (!/\.(?:ts|tsx|css)$/.test(entry.path) && !entry.isPrefix) {
    throw new Error(
      `[find-ui-consistency-gaps] EXEMPTIONS path-shape guard (plan 483 A1): '${entry.path}' must end with .ts/.tsx/.css or carry an explicit isPrefix: true marker`,
    );
  }
}

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
      // `hsl(var(--x))` 是 token 引用而非字面色，不计入（plan 482 R2：graph styles.css
      // 豁免摘除后该文件须凭 token 化转绿；V0 快照里该文件 8 实例中有 6 例本就是 token 引用被过宽匹配）。
      /\b(?:hsl|hsla|rgb|rgba)\s*\(\s*(?!var\()/g,
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
    filterLine(codeText, lines, lineIndex, filePath) {
      // Dev diagnostic receivers are not user-visible output.
      if (/\b(?:console\.(?:log|warn|error|info|debug)|devWarn|warnOnce)\s*\(/.test(codeText)) {
        return true;
      }
      const previousLine = lines[lineIndex - 1] ?? '';
      if (DEV_RECEIVER_AT_EOL.test(previousLine.trim())) {
        return true;
      }
      // plan 483 A3: adjudicated structured diagnostic channels (register
      // above) are non-UI exits and never hit the rule.
      if (STRUCTURED_ERROR_CHANNEL_FILES.has(filePath)) {
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

function matchRuleLine(rule, codeText, lines, lineIndex, filePath) {
  const matches = [];
  for (const pattern of rule.patterns) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match;
    while ((match = regex.exec(codeText)) !== null) {
      if (rule.filterLine && rule.filterLine(codeText, lines, lineIndex, filePath)) {
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
        const matches = matchRuleLine(rule, codeText, lines, lineIndex, relativePath);
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

  if (jsonMode) {
    const byRule = {};
    for (const hit of exemptHits) {
      const entry = byRule[hit.ruleId] ?? (byRule[hit.ruleId] = { instances: 0, files: new Set() });
      entry.instances += 1;
      entry.files.add(hit.filePath);
    }
    const byFileMap = new Map();
    for (const hit of exemptHits) {
      const key = `${hit.filePath}|${hit.ruleId}`;
      const entry = byFileMap.get(key) ?? { file: hit.filePath, rule: hit.ruleId, instances: 0 };
      entry.instances += 1;
      byFileMap.set(key, entry);
    }
    const payload = {
      snapshot: 'v0',
      generatedFrom: 'node scripts/audit/find-ui-consistency-gaps.mjs --json',
      totals: {
        instances: exemptHits.length,
        // Same pair semantics as the human line's "across N file(s)":
        // unique (rule, file) pairs — the granularity exemptions are scoped
        // and historically tracked at (D2 series 399/116/30 → 413/121/32).
        files: byFileMap.size,
        entries: EXEMPTIONS.length,
      },
      byRule: Object.fromEntries(
        Object.keys(byRule)
          .sort()
          .map((ruleId) => [
            ruleId,
            { instances: byRule[ruleId].instances, files: byRule[ruleId].files.size },
          ]),
      ),
      byFile: [...byFileMap.values()].sort((a, b) =>
        `${a.file}|${a.rule}`.localeCompare(`${b.file}|${b.rule}`),
      ),
      newHits: newHits.map((hit) => ({ rule: hit.ruleId, file: hit.filePath, line: hit.line })),
    };
    console.log(JSON.stringify(payload, null, 2));
    if (newHits.length > 0) {
      process.exit(1);
    }
    return;
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
