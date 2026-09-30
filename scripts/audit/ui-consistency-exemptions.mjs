/**
 * Exemption baseline for `find-ui-consistency-gaps.mjs` (plan 483 A1 phase-4
 * split: the table outgrew the 700-line gate ceiling after the four-package
 * prefix expansion — pure data, split by responsibility per repo convention).
 *
 * Adjudicated pre-existing instances; every entry carries a reason + R2/R3/D2
 * adjudication backlink (`source`). Path matching is `filePath.startsWith`.
 * plan 483 A1 path-shape guard: an entry's `path` must end with
 * `.ts`/`.tsx`/`.css` or carry an explicit `isPrefix: true` marker (enforced
 * by the gate at startup). Red line: zero NEW unregistered instances.
 */

export const EXEMPTIONS = [
  // --- scheduling：plan 483 A1 收紧为文件级（原全规则前缀条目展开，继承 reason/source）---
  // 原前缀条目 reason: R2 族9 调度域字面色/字面 Tailwind 色类族（gantt/kanban/calendar/barcode hex、red-400、bg-white、color-mix white）+ 族5 错误状态消息双轨——全部 P2 登记候选，修复归候选池
  // 原前缀条目 source: r2-audit/r3-p2-adjudication.md #35 [G4-视角1-01] / #36 [G4-视角3-01] / #39 [G4-视角7-01]；族5 候选池
  {
    path: 'packages/flux-renderers-scheduling/src/barcode-input/barcode-scanner-overlay.tsx',
    rule: 'hardcoded-literal-color',
    reason: 'plan 483 A1 前缀收紧展开：继承原包级前缀豁免（域字面色存量，见上方原条目 reason）',
    source: 'r2-audit/r3-p2-adjudication.md #35 [G4-视角1-01] / #36 [G4-视角3-01] / #39 [G4-视角7-01]；族5 候选池；plan 483 A1 文件级展开',
  },
  {
    path: 'packages/flux-renderers-form/src/renderers/signature-renderer.tsx',
    rule: 'hardcoded-literal-color',
    reason: 'plan 507 input-signature 笔色/画布底色的功能性默认值（penColor/backgroundColor 是组件的值域 prop，字面色即契约本身，无 token 替代）',
    source: 'missing-components L2.3 plan 507 Closure（2026-09-25）；exemption governance 先例：check:oversized-code-files OVERSIZED_EXEMPTIONS',
  },
  {
    path: 'packages/flux-renderers-form/src/renderers/input-contracts.ts',
    rule: 'hardcoded-literal-color',
    reason: 'plan 507 signatureSpecificContracts penColor/backgroundColor defaultValue 字面色（同上，prop 契约默认值即功能契约）',
    source: 'missing-components L2.3 plan 507 Closure（2026-09-25）；exemption governance 先例：check:oversized-code-files OVERSIZED_EXEMPTIONS',
  },
  {
    path: 'packages/flux-renderers-scheduling/src/calendar/calendar.css',
    rule: 'hardcoded-literal-color',
    reason: 'plan 483 A1 前缀收紧展开：继承原包级前缀豁免（域字面色存量，见上方原条目 reason）',
    source: 'r2-audit/r3-p2-adjudication.md #35 [G4-视角1-01] / #36 [G4-视角3-01] / #39 [G4-视角7-01]；族5 候选池；plan 483 A1 文件级展开',
  },
  {
    path: 'packages/flux-renderers-scheduling/src/calendar/calendar.tsx',
    rule: 'hardcoded-literal-color',
    reason: 'plan 483 A1 前缀收紧展开：继承原包级前缀豁免（域字面色存量，见上方原条目 reason）',
    source: 'r2-audit/r3-p2-adjudication.md #35 [G4-视角1-01] / #36 [G4-视角3-01] / #39 [G4-视角7-01]；族5 候选池；plan 483 A1 文件级展开',
  },
  {
    path: 'packages/flux-renderers-scheduling/src/calendar/components/calendar-header.tsx',
    rule: 'hardcoded-literal-color',
    reason: 'plan 483 A1 前缀收紧展开：继承原包级前缀豁免（域字面色存量，见上方原条目 reason）',
    source: 'r2-audit/r3-p2-adjudication.md #35 [G4-视角1-01] / #36 [G4-视角3-01] / #39 [G4-视角7-01]；族5 候选池；plan 483 A1 文件级展开',
  },
  {
    path: 'packages/flux-renderers-scheduling/src/calendar/hooks/use-calendar-export.ts',
    rule: 'hardcoded-literal-color',
    reason: 'plan 483 A1 前缀收紧展开：继承原包级前缀豁免（域字面色存量，见上方原条目 reason）',
    source: 'r2-audit/r3-p2-adjudication.md #35 [G4-视角1-01] / #36 [G4-视角3-01] / #39 [G4-视角7-01]；族5 候选池；plan 483 A1 文件级展开',
  },
  {
    path: 'packages/flux-renderers-scheduling/src/calendar/utils/calendar-print.css',
    rule: 'hardcoded-literal-color',
    reason: 'plan 483 A1 前缀收紧展开：继承原包级前缀豁免（域字面色存量，见上方原条目 reason）',
    source: 'r2-audit/r3-p2-adjudication.md #35 [G4-视角1-01] / #36 [G4-视角3-01] / #39 [G4-视角7-01]；族5 候选池；plan 483 A1 文件级展开',
  },
  {
    path: 'packages/flux-renderers-scheduling/src/gantt/gantt-header.tsx',
    rule: 'hardcoded-literal-color',
    reason: 'plan 483 A1 前缀收紧展开：继承原包级前缀豁免（域字面色存量，见上方原条目 reason）',
    source: 'r2-audit/r3-p2-adjudication.md #35 [G4-视角1-01] / #36 [G4-视角3-01] / #39 [G4-视角7-01]；族5 候选池；plan 483 A1 文件级展开',
  },
  {
    path: 'packages/flux-renderers-scheduling/src/gantt/gantt.css',
    rule: 'hardcoded-literal-color',
    reason: 'plan 483 A1 前缀收紧展开：继承原包级前缀豁免（域字面色存量，见上方原条目 reason）',
    source: 'r2-audit/r3-p2-adjudication.md #35 [G4-视角1-01] / #36 [G4-视角3-01] / #39 [G4-视角7-01]；族5 候选池；plan 483 A1 文件级展开',
  },
  {
    path: 'packages/flux-renderers-scheduling/src/gantt/hooks/use-gantt-drag.ts',
    rule: 'hardcoded-literal-color',
    reason: 'plan 483 A1 前缀收紧展开：继承原包级前缀豁免（域字面色存量，见上方原条目 reason）',
    source: 'r2-audit/r3-p2-adjudication.md #35 [G4-视角1-01] / #36 [G4-视角3-01] / #39 [G4-视角7-01]；族5 候选池；plan 483 A1 文件级展开',
  },
  {
    path: 'packages/flux-renderers-scheduling/src/kanban/kanban.css',
    rule: 'hardcoded-literal-color',
    reason: 'plan 483 A1 前缀收紧展开：继承原包级前缀豁免（域字面色存量，见上方原条目 reason）',
    source: 'r2-audit/r3-p2-adjudication.md #35 [G4-视角1-01] / #36 [G4-视角3-01] / #39 [G4-视角7-01]；族5 候选池；plan 483 A1 文件级展开',
  },
  {
    path: 'packages/flux-renderers-scheduling/src/kanban/components/kanban-tag-filter.tsx',
    rule: 'hardcoded-literal-color',
    reason: '选中 tag chip 的文字色（text-white/text-black）按 WCAG 相对亮度对任意用户配置 tag.color 背景取对比色——该字面量必须对比"用户色"而非主题表面，不存在可用的语义 token（kanban-tag-contrast.ts 计算，调用点三元选择）；plan 2026-09-28-5 Phase 1 已将同文件原 gray-* 存量全部 token 化（原豁免随之收缩），本条目为修复后新增的精确豁免。',
    source: 'plan 2026-09-28-5-visual-consistency-and-interaction-plan.md Phase 1 执行期裁定',
  },
  {
    path: 'packages/flux-renderers-scheduling/src/kanban/utils/kanban-export.ts',
    rule: 'hardcoded-literal-color',
    reason: 'plan 483 A1 前缀收紧展开：继承原包级前缀豁免（域字面色存量，见上方原条目 reason）',
    source: 'r2-audit/r3-p2-adjudication.md #35 [G4-视角1-01] / #36 [G4-视角3-01] / #39 [G4-视角7-01]；族5 候选池；plan 483 A1 文件级展开',
  },
  // --- industrial：plan 483 A1 收紧为文件级（原全规则前缀条目展开，继承 reason/source）
  // 原前缀条目 reason: SCADA leafer canvas 绘图域字面色（符号/引擎 overlay/探针/绑定 fixtures）+ editor CSS 变量回退 hex + 结构化诊断 message 载荷（结构化族已随 plan 483 A3 出规则登记）
  // 原前缀条目 source: D2 plan 2026-08-31-1522-1 Phase 2 豁免登记（R2 G5 组静态口径）
  {
    path: 'packages/flux-renderers-industrial/src/binding/refresh-pipeline-fixtures.ts',
    rule: 'hardcoded-literal-color',
    reason: 'plan 483 A1 前缀收紧展开：继承原包级前缀豁免（域字面色存量，见上方原条目 reason）',
    source: 'D2 plan 2026-08-31-1522-1 Phase 2 豁免登记（R2 G5 组静态口径）；plan 483 A1 文件级展开',
  },
  {
    path: 'packages/flux-renderers-industrial/src/editor/connection/connection-overlay-renderer.ts',
    rule: 'hardcoded-literal-color',
    reason: 'plan 483 A1 前缀收紧展开：继承原包级前缀豁免（域字面色存量，见上方原条目 reason）',
    source: 'D2 plan 2026-08-31-1522-1 Phase 2 豁免登记（R2 G5 组静态口径）；plan 483 A1 文件级展开',
  },
  {
    path: 'packages/flux-renderers-industrial/src/editor/styles.css',
    rule: 'hardcoded-literal-color',
    reason: 'plan 483 A1 前缀收紧展开：继承原包级前缀豁免（域字面色存量，见上方原条目 reason）',
    source: 'D2 plan 2026-08-31-1522-1 Phase 2 豁免登记（R2 G5 组静态口径）；plan 483 A1 文件级展开',
  },
  {
    path: 'packages/flux-renderers-industrial/src/engine/batch-add-probe.ts',
    rule: 'hardcoded-literal-color',
    reason: 'plan 483 A1 前缀收紧展开：继承原包级前缀豁免（域字面色存量，见上方原条目 reason）',
    source: 'D2 plan 2026-08-31-1522-1 Phase 2 豁免登记（R2 G5 组静态口径）；plan 483 A1 文件级展开',
  },
  {
    path: 'packages/flux-renderers-industrial/src/engine/interaction-overlay.ts',
    rule: 'hardcoded-literal-color',
    reason: 'plan 483 A1 前缀收紧展开：继承原包级前缀豁免（域字面色存量，见上方原条目 reason）',
    source: 'D2 plan 2026-08-31-1522-1 Phase 2 豁免登记（R2 G5 组静态口径）；plan 483 A1 文件级展开',
  },
  {
    path: 'packages/flux-renderers-industrial/src/styles.css',
    rule: 'hardcoded-literal-color',
    reason: 'plan 483 A1 前缀收紧展开：继承原包级前缀豁免（域字面色存量，见上方原条目 reason）',
    source: 'D2 plan 2026-08-31-1522-1 Phase 2 豁免登记（R2 G5 组静态口径）；plan 483 A1 文件级展开',
  },
  {
    path: 'packages/flux-renderers-industrial/src/symbols/base-shapes/arrow.ts',
    rule: 'hardcoded-literal-color',
    reason: 'plan 483 A1 前缀收紧展开：继承原包级前缀豁免（域字面色存量，见上方原条目 reason）',
    source: 'D2 plan 2026-08-31-1522-1 Phase 2 豁免登记（R2 G5 组静态口径）；plan 483 A1 文件级展开',
  },
  {
    path: 'packages/flux-renderers-industrial/src/symbols/base-shapes/ellipse.ts',
    rule: 'hardcoded-literal-color',
    reason: 'plan 483 A1 前缀收紧展开：继承原包级前缀豁免（域字面色存量，见上方原条目 reason）',
    source: 'D2 plan 2026-08-31-1522-1 Phase 2 豁免登记（R2 G5 组静态口径）；plan 483 A1 文件级展开',
  },
  {
    path: 'packages/flux-renderers-industrial/src/symbols/base-shapes/image.ts',
    rule: 'hardcoded-literal-color',
    reason: 'plan 483 A1 前缀收紧展开：继承原包级前缀豁免（域字面色存量，见上方原条目 reason）',
    source: 'D2 plan 2026-08-31-1522-1 Phase 2 豁免登记（R2 G5 组静态口径）；plan 483 A1 文件级展开',
  },
  {
    path: 'packages/flux-renderers-industrial/src/symbols/base-shapes/line.ts',
    rule: 'hardcoded-literal-color',
    reason: 'plan 483 A1 前缀收紧展开：继承原包级前缀豁免（域字面色存量，见上方原条目 reason）',
    source: 'D2 plan 2026-08-31-1522-1 Phase 2 豁免登记（R2 G5 组静态口径）；plan 483 A1 文件级展开',
  },
  {
    path: 'packages/flux-renderers-industrial/src/symbols/base-shapes/pipe.ts',
    rule: 'hardcoded-literal-color',
    reason: 'plan 483 A1 前缀收紧展开：继承原包级前缀豁免（域字面色存量，见上方原条目 reason）',
    source: 'D2 plan 2026-08-31-1522-1 Phase 2 豁免登记（R2 G5 组静态口径）；plan 483 A1 文件级展开',
  },
  {
    path: 'packages/flux-renderers-industrial/src/symbols/base-shapes/polygon.ts',
    rule: 'hardcoded-literal-color',
    reason: 'plan 483 A1 前缀收紧展开：继承原包级前缀豁免（域字面色存量，见上方原条目 reason）',
    source: 'D2 plan 2026-08-31-1522-1 Phase 2 豁免登记（R2 G5 组静态口径）；plan 483 A1 文件级展开',
  },
  {
    path: 'packages/flux-renderers-industrial/src/symbols/base-shapes/rect.ts',
    rule: 'hardcoded-literal-color',
    reason: 'plan 483 A1 前缀收紧展开：继承原包级前缀豁免（域字面色存量，见上方原条目 reason）',
    source: 'D2 plan 2026-08-31-1522-1 Phase 2 豁免登记（R2 G5 组静态口径）；plan 483 A1 文件级展开',
  },
  {
    path: 'packages/flux-renderers-industrial/src/symbols/base-shapes/round-rect.ts',
    rule: 'hardcoded-literal-color',
    reason: 'plan 483 A1 前缀收紧展开：继承原包级前缀豁免（域字面色存量，见上方原条目 reason）',
    source: 'D2 plan 2026-08-31-1522-1 Phase 2 豁免登记（R2 G5 组静态口径）；plan 483 A1 文件级展开',
  },
  {
    path: 'packages/flux-renderers-industrial/src/symbols/base-shapes/text.ts',
    rule: 'hardcoded-literal-color',
    reason: 'plan 483 A1 前缀收紧展开：继承原包级前缀豁免（域字面色存量，见上方原条目 reason）',
    source: 'D2 plan 2026-08-31-1522-1 Phase 2 豁免登记（R2 G5 组静态口径）；plan 483 A1 文件级展开',
  },
  {
    path: 'packages/flux-renderers-industrial/src/symbols/base-shapes/video.ts',
    rule: 'hardcoded-literal-color',
    reason: 'plan 483 A1 前缀收紧展开：继承原包级前缀豁免（域字面色存量，见上方原条目 reason）',
    source: 'D2 plan 2026-08-31-1522-1 Phase 2 豁免登记（R2 G5 组静态口径）；plan 483 A1 文件级展开',
  },
  {
    path: 'packages/flux-renderers-industrial/src/symbols/device/common.ts',
    rule: 'hardcoded-literal-color',
    reason: 'plan 483 A1 前缀收紧展开：继承原包级前缀豁免（域字面色存量，见上方原条目 reason）',
    source: 'D2 plan 2026-08-31-1522-1 Phase 2 豁免登记（R2 G5 组静态口径）；plan 483 A1 文件级展开',
  },
  {
    path: 'packages/flux-renderers-industrial/src/symbols/device/fan.ts',
    rule: 'hardcoded-literal-color',
    reason: 'plan 483 A1 前缀收紧展开：继承原包级前缀豁免（域字面色存量，见上方原条目 reason）',
    source: 'D2 plan 2026-08-31-1522-1 Phase 2 豁免登记（R2 G5 组静态口径）；plan 483 A1 文件级展开',
  },
  {
    path: 'packages/flux-renderers-industrial/src/symbols/device/motor.ts',
    rule: 'hardcoded-literal-color',
    reason: 'plan 483 A1 前缀收紧展开：继承原包级前缀豁免（域字面色存量，见上方原条目 reason）',
    source: 'D2 plan 2026-08-31-1522-1 Phase 2 豁免登记（R2 G5 组静态口径）；plan 483 A1 文件级展开',
  },
  {
    path: 'packages/flux-renderers-industrial/src/symbols/device/pump.ts',
    rule: 'hardcoded-literal-color',
    reason: 'plan 483 A1 前缀收紧展开：继承原包级前缀豁免（域字面色存量，见上方原条目 reason）',
    source: 'D2 plan 2026-08-31-1522-1 Phase 2 豁免登记（R2 G5 组静态口径）；plan 483 A1 文件级展开',
  },
  {
    path: 'packages/flux-renderers-industrial/src/symbols/device/valve.ts',
    rule: 'hardcoded-literal-color',
    reason: 'plan 483 A1 前缀收紧展开：继承原包级前缀豁免（域字面色存量，见上方原条目 reason）',
    source: 'D2 plan 2026-08-31-1522-1 Phase 2 豁免登记（R2 G5 组静态口径）；plan 483 A1 文件级展开',
  },
  {
    path: 'packages/flux-renderers-industrial/src/symbols/instrument/dial.ts',
    rule: 'hardcoded-literal-color',
    reason: 'plan 483 A1 前缀收紧展开：继承原包级前缀豁免（域字面色存量，见上方原条目 reason）',
    source: 'D2 plan 2026-08-31-1522-1 Phase 2 豁免登记（R2 G5 组静态口径）；plan 483 A1 文件级展开',
  },
  {
    path: 'packages/flux-renderers-industrial/src/symbols/instrument/gauge.ts',
    rule: 'hardcoded-literal-color',
    reason: 'plan 483 A1 前缀收紧展开：继承原包级前缀豁免（域字面色存量，见上方原条目 reason）',
    source: 'D2 plan 2026-08-31-1522-1 Phase 2 豁免登记（R2 G5 组静态口径）；plan 483 A1 文件级展开',
  },
  {
    path: 'packages/flux-renderers-industrial/src/symbols/instrument/level.ts',
    rule: 'hardcoded-literal-color',
    reason: 'plan 483 A1 前缀收紧展开：继承原包级前缀豁免（域字面色存量，见上方原条目 reason）',
    source: 'D2 plan 2026-08-31-1522-1 Phase 2 豁免登记（R2 G5 组静态口径）；plan 483 A1 文件级展开',
  },
  {
    path: 'packages/flux-renderers-industrial/src/symbols/instrument/progress.ts',
    rule: 'hardcoded-literal-color',
    reason: 'plan 483 A1 前缀收紧展开：继承原包级前缀豁免（域字面色存量，见上方原条目 reason）',
    source: 'D2 plan 2026-08-31-1522-1 Phase 2 豁免登记（R2 G5 组静态口径）；plan 483 A1 文件级展开',
  },
  {
    path: 'packages/flux-renderers-industrial/src/symbols/instrument/thermometer.ts',
    rule: 'hardcoded-literal-color',
    reason: 'plan 483 A1 前缀收紧展开：继承原包级前缀豁免（域字面色存量，见上方原条目 reason）',
    source: 'D2 plan 2026-08-31-1522-1 Phase 2 豁免登记（R2 G5 组静态口径）；plan 483 A1 文件级展开',
  },
  {
    path: 'packages/flux-renderers-industrial/src/symbols/pipe/pipe-junction.ts',
    rule: 'hardcoded-literal-color',
    reason: 'plan 483 A1 前缀收紧展开：继承原包级前缀豁免（域字面色存量，见上方原条目 reason）',
    source: 'D2 plan 2026-08-31-1522-1 Phase 2 豁免登记（R2 G5 组静态口径）；plan 483 A1 文件级展开',
  },
  {
    path: 'packages/flux-renderers-industrial/src/symbols/sensor-control/button.ts',
    rule: 'hardcoded-literal-color',
    reason: 'plan 483 A1 前缀收紧展开：继承原包级前缀豁免（域字面色存量，见上方原条目 reason）',
    source: 'D2 plan 2026-08-31-1522-1 Phase 2 豁免登记（R2 G5 组静态口径）；plan 483 A1 文件级展开',
  },
  {
    path: 'packages/flux-renderers-industrial/src/symbols/sensor-control/common.ts',
    rule: 'hardcoded-literal-color',
    reason: 'plan 483 A1 前缀收紧展开：继承原包级前缀豁免（域字面色存量，见上方原条目 reason）',
    source: 'D2 plan 2026-08-31-1522-1 Phase 2 豁免登记（R2 G5 组静态口径）；plan 483 A1 文件级展开',
  },
  {
    path: 'packages/flux-renderers-industrial/src/symbols/sensor-control/indicator.ts',
    rule: 'hardcoded-literal-color',
    reason: 'plan 483 A1 前缀收紧展开：继承原包级前缀豁免（域字面色存量，见上方原条目 reason）',
    source: 'D2 plan 2026-08-31-1522-1 Phase 2 豁免登记（R2 G5 组静态口径）；plan 483 A1 文件级展开',
  },
  {
    path: 'packages/flux-renderers-industrial/src/symbols/sensor-control/sensor.ts',
    rule: 'hardcoded-literal-color',
    reason: 'plan 483 A1 前缀收紧展开：继承原包级前缀豁免（域字面色存量，见上方原条目 reason）',
    source: 'D2 plan 2026-08-31-1522-1 Phase 2 豁免登记（R2 G5 组静态口径）；plan 483 A1 文件级展开',
  },
  {
    path: 'packages/flux-renderers-industrial/src/symbols/sensor-control/switch.ts',
    rule: 'hardcoded-literal-color',
    reason: 'plan 483 A1 前缀收紧展开：继承原包级前缀豁免（域字面色存量，见上方原条目 reason）',
    source: 'D2 plan 2026-08-31-1522-1 Phase 2 豁免登记（R2 G5 组静态口径）；plan 483 A1 文件级展开',
  },
  {
    path: 'packages/flux-renderers-industrial/src/symbols/visuals.ts',
    rule: 'hardcoded-literal-color',
    reason: 'plan 483 A1 前缀收紧展开：继承原包级前缀豁免（域字面色存量，见上方原条目 reason）',
    source: 'D2 plan 2026-08-31-1522-1 Phase 2 豁免登记（R2 G5 组静态口径）；plan 483 A1 文件级展开',
  },
  // --- 3d：plan 483 A1 收紧为文件级（原全规则前缀条目展开，继承 reason/source）
  // 原前缀条目 reason: three-canvas 引擎域 THREE 灯光默认色（ColorRepresentation hex，非 UI 样式）；结构化诊断族已随 plan 483 A3 出规则登记
  // 原前缀条目 source: plan 465 Phase 6 closure（industrial 域豁免同款判例：canvas 引擎字面色 + scada-errors 结构化诊断）
  {
    path: 'packages/flux-renderers-3d/src/engine/scene-manager.ts',
    rule: 'hardcoded-literal-color',
    reason: 'plan 483 A1 前缀收紧展开：继承原包级前缀豁免（域字面色存量，见上方原条目 reason）',
    source: 'plan 465 Phase 6 closure（industrial 域豁免同款判例：canvas 引擎字面色 + scada-errors 结构化诊断）；plan 483 A1 文件级展开',
  },
  // --- map（candidate A 域 + candidate C 单文件）---------------------------
  {
    path: 'packages/flux-renderers-map/src/',
    isPrefix: true, // plan 483 A1: rule-scoped prefix retained for V12b 按需收紧
    rule: 'hardcoded-literal-color',
    reason: 'R2 族9 map 域字面色（buildPinStyle/buildClusterStyle、map-color 工具、styles.css）',
    source: 'r2-audit/r3-p2-adjudication.md #98 [G5-R2-视角5-02] / #49 [G5-视角9-01]',
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

  // --- form -------------------------------------------------------------------
  {
    path: 'packages/flux-renderers-form/src/styles.css',
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
  // --- content ----------------------------------------------------------------
  {
    path: 'packages/flux-renderers-content/src/',
    isPrefix: true, // plan 483 A1: rule-scoped prefix retained for V12b 按需收紧
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
  // --- layout --------------------------------------------------------------------
  {
    path: 'packages/flux-renderers-layout/src/timeline-renderer.tsx',
    rule: 'hardcoded-literal-color',
    reason: 'timeline 图标 text-white 字面（R2 timeline 域）',
    source: 'r2-audit/r3-p2-adjudication.md #132 [G1-R4-视角8-01]（邻域）',
  },
  // --- basic ----------------------------------------------------------------------
  // --- candidate D: data-blob-href-without-download ------------------------
  {
    path: 'apps/playground/src/complex-pages/shared/showcase-env.ts',
    rule: 'data-blob-href-without-download',
    reason:
      'CSV 导出 data URL 唯一生成点；schema 侧已补 download: true 经 link 渲染器透传（R3 ⑦ 修复），生成点本身无 download 语义可表达',
    source: 'R2 owner doc §R3 收口节 §3 批次⑦ + [G7-R2-视角11-01] link-download.test.tsx',
  },
];
