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
    path: 'packages/flux-renderers-mobile/src/floating-panel.tsx',
    rule: 'hardcoded-literal-color',
    reason: 'plan 852 U6 族 A-3：inline background `var(--nop-floating-panel-bg, #ffffff)` 的 #ffffff 为 CSS var 防御性 fallback 值（宿主未定义令牌时兜底，非样式直值；var() fallback 写法契约本身）',
    source: 'docs/analysis/replication-ux/u6-family-remediation.md §2 A-3 裁决；improvement-analysis 2026-11-04 plan 846 U1 条目销单（渲染器侧 fallback 落地）',
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
    path: 'packages/flux-renderers-industrial/src/engine/interaction-tokens.ts',
    rule: 'hardcoded-literal-color',
    reason: 'plan 530 S1：--ind-* 令牌 fallback 常量面（INTERACTION_STYLE_PRESETS 裸宿主兜底值，与 src/styles.css light 块同值双写；fallback 字面色即契约本身，非 UI 样式硬编码）',
    source: 'plan 530 S1 Closure（2026-10-06）；先例：plan 507 penColor「prop 契约默认值即功能契约」判例',
  },
  {
    path: 'packages/flux-renderers-industrial/src/styles.css',
    rule: 'hardcoded-literal-color',
    reason: 'plan 483 A1 前缀收紧展开：继承原包级前缀豁免（域字面色存量，见上方原条目 reason）',
    source: 'D2 plan 2026-08-31-1522-1 Phase 2 豁免登记（R2 G5 组静态口径）；plan 483 A1 文件级展开',
  },
  {
    path: 'packages/flux-renderers-industrial/src/symbols/base-shapes/points-geometry-shape.ts',
    rule: 'hardcoded-literal-color',
    reason: 'plan 483 A1 前缀收紧展开：继承原包级前缀豁免（域字面色存量）；WA-industrial-004（plan 569）line/arrow/pipe points 骨架收敛为 createPointsGeometryShape 工厂，共享 default stroke 字面随实体迁移至此（原 arrow.ts 条目改指）',
    source: 'D2 plan 2026-08-31-1522-1 Phase 2 豁免登记（R2 G5 组静态口径）；plan 483 A1 文件级展开；WA-9 plan 569 批内修复随迁',
  },
  {
    path: 'packages/flux-renderers-industrial/src/symbols/device/tank.ts',
    rule: 'hardcoded-literal-color',
    reason: 'plan 559 Phase 1 新增符号：域字面色与既有符号族同口径（设备惯例色/钢系令牌邻值），继承原包级前缀豁免',
    source: 'plan 559 Phase 1 豁免登记（SCADA 符号库 24→37 扩充，域字面色存量口径）',
  },
  {
    path: 'packages/flux-renderers-industrial/src/symbols/device/heat-exchanger.ts',
    rule: 'hardcoded-literal-color',
    reason: 'plan 559 Phase 1 新增符号：域字面色与既有符号族同口径（设备惯例色/钢系令牌邻值），继承原包级前缀豁免',
    source: 'plan 559 Phase 1 豁免登记（SCADA 符号库 24→37 扩充，域字面色存量口径）',
  },
  {
    path: 'packages/flux-renderers-industrial/src/symbols/device/conveyor.ts',
    rule: 'hardcoded-literal-color',
    reason: 'plan 559 Phase 1 新增符号：域字面色与既有符号族同口径（设备惯例色/钢系令牌邻值），继承原包级前缀豁免',
    source: 'plan 559 Phase 1 豁免登记（SCADA 符号库 24→37 扩充，域字面色存量口径）',
  },
  {
    path: 'packages/flux-renderers-industrial/src/symbols/device/gate-valve.ts',
    rule: 'hardcoded-literal-color',
    reason: 'plan 559 Phase 1 新增符号：域字面色与既有符号族同口径（设备惯例色/钢系令牌邻值），继承原包级前缀豁免',
    source: 'plan 559 Phase 1 豁免登记（SCADA 符号库 24→37 扩充，域字面色存量口径）',
  },
  {
    path: 'packages/flux-renderers-industrial/src/symbols/device/check-valve.ts',
    rule: 'hardcoded-literal-color',
    reason: 'plan 559 Phase 1 新增符号：域字面色与既有符号族同口径（设备惯例色/钢系令牌邻值），继承原包级前缀豁免',
    source: 'plan 559 Phase 1 豁免登记（SCADA 符号库 24→37 扩充，域字面色存量口径）',
  },
  {
    path: 'packages/flux-renderers-industrial/src/symbols/pipe/pipe-fittings.ts',
    rule: 'hardcoded-literal-color',
    reason: 'plan 559 Phase 1 新增符号：域字面色与既有符号族同口径（设备惯例色/钢系令牌邻值），继承原包级前缀豁免',
    source: 'plan 559 Phase 1 豁免登记（SCADA 符号库 24→37 扩充，域字面色存量口径）',
  },
  {
    path: 'packages/flux-renderers-industrial/src/symbols/instrument/trend.ts',
    rule: 'hardcoded-literal-color',
    reason: 'plan 559 Phase 1 新增符号：域字面色与既有符号族同口径（设备惯例色/钢系令牌邻值），继承原包级前缀豁免',
    source: 'plan 559 Phase 1 豁免登记（SCADA 符号库 24→37 扩充，域字面色存量口径）',
  },
  {
    path: 'packages/flux-renderers-industrial/src/symbols/instrument/numeric.ts',
    rule: 'hardcoded-literal-color',
    reason: 'plan 559 Phase 1 新增符号：域字面色与既有符号族同口径（设备惯例色/钢系令牌邻值），继承原包级前缀豁免',
    source: 'plan 559 Phase 1 豁免登记（SCADA 符号库 24→37 扩充，域字面色存量口径）',
  },
  {
    path: 'packages/flux-renderers-industrial/src/symbols/sensor-control/alarm-light.ts',
    rule: 'hardcoded-literal-color',
    reason: 'plan 559 Phase 1 新增符号：域字面色与既有符号族同口径（设备惯例色/钢系令牌邻值），继承原包级前缀豁免',
    source: 'plan 559 Phase 1 豁免登记（SCADA 符号库 24→37 扩充，域字面色存量口径）',
  },
  {
    path: 'packages/flux-renderers-industrial/src/symbols/electrical/common.ts',
    rule: 'hardcoded-literal-color',
    reason: 'plan 559 Phase 1 新增符号：域字面色与既有符号族同口径（设备惯例色/钢系令牌邻值），继承原包级前缀豁免',
    source: 'plan 559 Phase 1 豁免登记（SCADA 符号库 24→37 扩充，域字面色存量口径）',
  },
  {
    path: 'packages/flux-renderers-industrial/src/symbols/electrical/breaker.ts',
    rule: 'hardcoded-literal-color',
    reason: 'plan 559 Phase 1 新增符号：域字面色与既有符号族同口径（设备惯例色/钢系令牌邻值），继承原包级前缀豁免',
    source: 'plan 559 Phase 1 豁免登记（SCADA 符号库 24→37 扩充，域字面色存量口径）',
  },
  {
    path: 'packages/flux-renderers-industrial/src/symbols/electrical/transformer.ts',
    rule: 'hardcoded-literal-color',
    reason: 'plan 559 Phase 1 新增符号：域字面色与既有符号族同口径（设备惯例色/钢系令牌邻值），继承原包级前缀豁免',
    source: 'plan 559 Phase 1 豁免登记（SCADA 符号库 24→37 扩充，域字面色存量口径）',
  },
  {
    path: 'packages/flux-renderers-3d/src/engine/label-sprite.ts',
    rule: 'hardcoded-literal-color',
    reason: 'plan 559 Phase 2 模型标注 Sprite：Canvas 2D 绘制缺省色（暗底白字），引擎域字面色与 three-defaults 同口径',
    source: 'plan 559 Phase 2 豁免登记（3D label 标注契约）',
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
  {
    path: 'packages/flux-renderers-3d/src/engine/three-defaults.ts',
    rule: 'hardcoded-literal-color',
    reason: 'plan 533 D1：THREE 灯光/材质默认色常量单一事实源（scene-manager 字面色收敛迁入本文件；canvas 引擎域字面色即契约本身，非 UI 样式硬编码）',
    source: 'plan 533 D1 Closure（2026-10-06）；先例：scene-manager.ts canvas 引擎字面色豁免（plan 465/483）',
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
  {
    path: 'apps/playground/src/complex-pages/shared/mock-backend-repl-crm-c3.ts',
    rule: 'data-blob-href-without-download',
    reason:
      'C3 销售驾驶舱 CSV 报表导出的 data URL 生成点（mock 层无 download 语义可表达）；运行时 download action form-3 路径对 data: URL 走 dataUrlToBlob → downloadBlob，不存在顶层导航——同 mock-backend-repl-wms-stock.ts 误报裁决',
    source:
      'plan 803 收口（M3-C3）；先例：mock-backend-repl-wms-stock.ts（W3/plan 800）+ showcase-env.ts candidate D',
  },
  {
    path: 'apps/playground/src/complex-pages/shared/mock-backend-repl-itam-depreciation.ts',
    rule: 'data-blob-href-without-download',
    reason:
      'I2 折旧仪表盘 CSV 报表导出的 data URL 生成点（mock 层无 download 语义可表达）；运行时 download action 路径对 data: URL 走 dataUrlToBlob → downloadBlob，不存在顶层导航——同 mock-backend-repl-crm-c3.ts 误报裁决',
    source: 'plan 805 收口（M3-I2）；先例：mock-backend-repl-crm-c3.ts（C3/plan 803）+ mock-backend-repl-wms-stock.ts（W3/plan 800）',
  },
  {
    path: 'apps/playground/src/complex-pages/shared/mock-backend-repl-mall.ts',
    rule: 'data-blob-href-without-download',
    reason:
      'S2 分销后台佣金明细 CSV 导出（commissionExport）的 data URL 生成点（mock 层无 download 语义可表达）；运行时 download action 路径对 data: URL 走 dataUrlToBlob → downloadBlob，不存在顶层导航（e2e 交互② waitForEvent download 实证）——同 mock-backend-repl-itam-depreciation.ts 误报裁决',
    source: 'plan 813 收口（M3-S2）；先例：mock-backend-repl-itam-depreciation.ts（I2/plan 805）+ mock-backend-repl-crm-c3.ts（C3/plan 803）',
  },
  {
    path: 'apps/playground/src/complex-pages/shared/mock-backend-repl-wms-stock.ts',
    rule: 'data-blob-href-without-download',
    reason:
      'W3 库存台账 CSV 导出的 data URL 生成点（mock 层无 download 语义可表达）；运行时 download action form-3 路径对 data: URL 走 dataUrlToBlob → downloadBlob（URL.createObjectURL + <a download>），不存在顶层导航——扫描器对该调用面系误报',
    source:
      'docs/audits/deep-audit-2026-10-31.md §1 A3 误报裁决 + packages/flux-runtime/src/runtime-action-helpers.ts:392-393 / async-data/blob-download.ts downloadBlob；先例：showcase-env.ts candidate D（plan 820）',
  },
];
