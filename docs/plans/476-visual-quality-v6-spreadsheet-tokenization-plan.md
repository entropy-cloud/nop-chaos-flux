# 476 视觉质量 V6：Spreadsheet 视觉令牌化 Plan

> Plan Status: completed
> Last Reviewed: 2026-09-21
> Source: `docs/analysis/visual-quality/V6-spreadsheet-visuals.md`（独立核实 pass，4 项轻微勘误已回写）、`docs/backlog/visual-quality-roadmap.md` V6、`docs/architecture/report-designer/spreadsheet-canvas-css.md`、`docs/components/spreadsheet-page/design.md`
> Related: `docs/plans/475-visual-quality-v5-flow-designer-plan.md`（--fd-\* 作用域定义 + dark 块的同构先例）

## Purpose

把路线图 V6 收口：canvas-styles.css 29 处浅色 hex 与约 39 处 light-only rgb()/rgba() 收敛为令牌（既有 --nop-_ 消费 + 新增 --ss-_ 私有令牌族），双 scope 定义 + `[data-mode='dark']` 变体（report 画布共用约束）；3 个未定义令牌 dangling 消费（R1）与 2 个死类（R2/R3）处置；单元格值类型视觉最小实现（数值右对齐 + numberFormat 基础应用 + 日期格式化）；冻结/填充柄/选中态 light/dark 双态计算样式断言。

## Current Baseline

- 包：`packages/spreadsheet-renderers`（canvas-styles.css 894 行，唯一样式载体）+ `packages/spreadsheet-core`。消费点 4：spreadsheet-renderers/renderers.tsx:1、report-designer-renderers/src/report-spreadsheet-canvas.tsx:2（report 画布共用点）、playground spreadsheet-demo.tsx:2、report-designer-demo.tsx:2。
- **F1**：29 处浅色 hex——画布结构 8（#ffffff:30、#f6f7fa:353、#cecece:372、#d4d4d4:522-523、#999999:708/:717、#1a1a1a:29、#e8f4fd:667 等）、选中态 12（#0f9d58 填充柄 :80/active outline :606/选区边 :698/拖放框 :678、#1a73e8 :620/:688/:693、#dbeafe/:205、#1d4ed8:206、#d3e3fd:687/:692、#e0e7ff:403）、语义色 9（绑定 :632-646、评论 #f97316:662、冻结 #e8f4fd/#2196f3:667-668、合并 #fff8e1/#ffc107:672-673、拖放 #e3f2fd:677）。
- **F2**：dark 零支持——两包 src `data-mode/.dark/prefers-color-scheme` 零命中；外壳 chrome 已消费 --nop-\*（宿主 styles.css :96-166 light、:185 起 dark 定义）；**R1：3 个 dangling 令牌 4 处消费** `--nop-background`(:44-45、:824)、`--nop-ring`(:821)、`--nop-destructive`(:862-867) 全仓无定义且无 fallback（声明静默失效）；**R4**：约 39 处 light-only rgb()/rgba()（表头渐变/hover/编辑输入/状态色/阴影/fill-preview 等）；**R5**：选中底色 rgba(41,98,255,…) 固定蓝 :612/:628。
- **F3**：值类型视觉空白——table-shell.tsx:174 `String(cell.value)` 直出；cell-style-map.ts:23-26 仅显式 textAlign；numberFormat storage-only（spreadsheet-core/src/core/cell-operations.ts:152/:169）；`type?: string`（types.ts:104）/`numberFormat?: string`（:111）字段已在 core，渲染端为纯增量。
- **F4**：spreadsheet-demo.spec 10 test 零色彩/dark/填充柄断言；可复用 V0 helper（visual-assert.ts）与 theme-switcher.spec 翻转先例。
- **F5**：双 scope 隔离机制（`.nop-spreadsheet-page` 与 `[data-slot='report-designer-spreadsheet-canvas']` 成对出现全文件）；design.md §10 :123-125 禁止裸 data-slot 泄漏；spreadsheet-canvas-css.md §3.2（~:99）「ss-cell 提供 Excel 默认样式基线」为设计决策，dark 化须修订该契约；§2.3 示例 hex 已与 live 漂移。
- **R2/R3 死类**：table-shell.tsx:438 发出 `frozen-row`、spreadsheet-grid.tsx:296 发出 `ss-grid-shell`，全仓零 CSS 规则。
- 门禁：spreadsheet-renderers 在 `find-ui-consistency-gaps.mjs` RENDERER_PACKAGE_SCOPE（:290）扫描集外，令牌化合规靠包内单测承接。
- `canvas-styles.test.ts` 现行契约：外壳 chrome 必须消费 --nop-\* 且**禁止包内写 fallback 值**（:14-17）——宿主发布默认值架构维持。

## Goals

- 29 hex + 约 39 rgb()/rgba() 全量收敛：结构色接既有 --nop-_（保持无 fallback 契约）、画布专属/语义色收敛为 `--ss-_` 私有令牌族。**执行期裁决（audit 后如实修订）**：`--ss-\*`发布于`:root`+`:root[data-mode='dark']` 而非双 scope——文件内大量历史裸 data-slot 选择器（工具条/表头/编辑输入等）无统一包裹根，双 scope 定义覆盖不了全部消费点（曾被既有 e2e 拦截为回归：report 端工具条背景透明）；--ss- 前缀命名空间隔离。语义包裹规则（hsl(var(--success))）弃用：43 令牌全为直接字面值（dark 变体即主题耦合点），fidelity 优先且避免主题变量缺失时的静默失效。
- R1 三处 dangling 消费迁到已定义令牌；R2/R3 死类处置（frozen-row 补规则、ss-grid-shell 删除）。
- 值类型视觉最小实现：数值 → 右对齐 + numberFormat 基础应用（千分位/百分比/小数位）；日期 → toLocaleDateString；文本维持；零 schema 变更。
- e2e 双态（light/dark）计算样式断言：冻结线/填充柄/active outline/选中底色/编辑态 + report-designer-demo 路由；canvas-styles.test 增「禁裸 hex/禁未定义令牌」守卫。
- Owner docs 同步（spreadsheet-canvas-css.md §2.3 漂移修正 + Excel-light 基线契约改述 + dark 契约；design.md §12 注记；证据卡；roadmap；log）。

## Non-Goals

- 状态色视觉语言重设计（R6 watch-only）、斑马纹/条件格式渲染通道（R9 显式空白）、styleId 机制、spreadsheet-core 数据结构变更、滚动条原生样式 dark 一致性（R8 watch-only）。
- fill-handle z-index 遮挡（R7）：Phase 3 断言覆盖下实测，遮挡实锤则修 z-index，否则显式裁决 watch-only。

## Scope

### In Scope

- `packages/spreadsheet-renderers/src/canvas-styles.css`（令牌收敛 + --ss-\* 族 + dark 块）、`canvas-styles.test.ts`（守卫）、`spreadsheet-grid/table-shell.tsx`（frozen-row 处置 + 值类型分派）、`spreadsheet-grid/spreadsheet-grid.tsx`（ss-grid-shell 删除）、`cell-style-map.ts`（值类型对齐分派）+ 对应单测。
- e2e：`spreadsheet-demo.spec.ts` 扩展或新 spec（双态断言）；`report-designer-demo` 相关断言路由。
- Owner docs：spreadsheet-canvas-css.md、design.md、证据卡 spreadsheet.md、roadmap、daily log。

### Out Of Scope

- spreadsheet-core 任何变更（types/cell-operations 现状即满足渲染分派）；playground styles.css 的 --nop-_ 调色板扩充（--ss-_ 定义放包内，宿主零变更）；theme-tokens 包变更。

## Failure Paths

| 场景               | 触发                           | 行为                                                                                    | 可重试 | 用户可见表现                   |
| ------------------ | ------------------------------ | --------------------------------------------------------------------------------------- | ------ | ------------------------------ |
| dual-scope-leak    | dark 块只覆盖单 scope          | report 画布共用点不翻转——e2e 双路由断言拦截                                             | 否     | report 内嵌表格亮色            |
| bare-host-mount    | 无宿主 --nop-\* 的裸宿主       | 结构色回退失效——--ss-_ 定义内嵌 hsl(var(--x, literal)) 兜底，--nop-_ 读取点维持现状契约 | 否     | 外壳 chrome 退化（与现状一致） |
| number-format-edge | numberFormat 非法/不支持占位符 | 原样输出 String(value)，不抛错                                                          | 是     | 文本原样                       |
| dark-unmapped      | 新增规则引入新色               | 禁裸 hex 守卫单测拦截                                                                   | 否     | CI 红                          |

## Test Strategy

档位选择：**必须自动化**——dark 双态是样式契约变更（V0 helper L3 计算样式断言为判据）；值类型视觉是用户可感知渲染行为（先红后绿单测）；守卫单测防回填。

## Execution Plan

### Phase 1 - 令牌收敛 + dark 变体

Status: completed
Targets: `canvas-styles.css`、`canvas-styles.test.ts`、`table-shell.tsx`（frozen-row）、`spreadsheet-grid.tsx`（ss-grid-shell）

- Item Types: `Proof | Fix`

- [ ] Proof：`canvas-styles.test.ts` 先红——新增守卫断言：①全文件禁 hex 字面量（rgba()/rgb() 允许仅出现在 --ss-\* 定义块内——裁决：定义块内的字面值是 dark 变体的载体，消费点一律走令牌）；②定义块外禁 rgb()/rgba() 与固定色 hsl() 字面量（:829/:833 rename 聚焦环固定蓝一并收敛）；③禁 `--nop-background/--nop-ring/--nop-destructive` dangling 消费（模式级 regex）
- [x] Fix：全量清单驱动收敛——映射规则（执行时定稿）：结构色→既有 --nop-_ 无 fallback 读取；画布专属/语义/状态色→`--ss-_`43 令牌（--ss-gridline/--ss-active/--ss-accent 族/--ss-frozen-*/--ss-merge-*/--ss-danger-* 等）；定义值为直接字面值（语义包裹弃用，裁决见 Baseline）；定义块 =`:root`+`:root[data-mode='dark']`（双 scope 方案因裸选择器覆盖不全被既有 e2e 拦截后裁决改为 :root）
- [x] Fix：R1——4 处 dangling 消费（:44-45/:821/:824/:862-867）迁移到 --ss-\*（守卫按模式级 regex 实现）；R2——`frozen-row` 类改 `data-frozen-row` 属性 + 新增令牌化底边规则；R3——`ss-grid-shell` 类删除；`.ss-grid` 规则块裁决 = **删除**（全仓零 tsx/html 消费，audit review M-4 指出，已删）
- [x] Fix：R5 选中底色 rgba(41,98,255,…) :612/:628 → --ss-selected-overlay/--ss-range-overlay（dark 变体可辨）；R4 其余 rgb()/rgba() 按映射表收敛；R7 fill-handle z-index 5→7（高于冻结分隔线 z6，实锤修复）

Exit Criteria:

- [ ] 守卫单测先红后绿有记录；canvas-styles.test 全绿且含「禁裸 hex + 禁 dangling 令牌」断言
- [x] `:root` 与 `:root[data-mode='dark']` 双定义块存在（守卫断言），dark 变体覆盖全部同名令牌；spreadsheet-renderers 既有单测零回归（166/166）

### Phase 2 - 值类型视觉最小实现

Status: completed
Targets: `table-shell.tsx`（渲染分派）、`cell-style-map.ts`（对齐分派）、单测

- Item Types: `Proof | Fix`

- [ ] Proof：cell-style-map 单测先红——分派函数签名扩展裁决：`mapCellStyle` 保持纯 CellStyle 入参不变，新增独立 `resolveCellTypeClasses(cell)`（消费 CellDocument 的 value/numberFormat/type），table-shell 渲染处与 style 类合并——数值判据 `typeof value === 'number' || numberFormat 存在` → `ss-type-number`；日期判据 `type === 'date'`（或 value 为 Date/ISO 日期串）→ `ss-type-date`；显式 textAlign 优先级高于类型推断
- [ ] Fix：table-shell.tsx 渲染分派——按上述裁决接 `resolveCellTypeClasses`；数值右对齐 + numberFormat 基础应用（千分位/百分比/小数位，非法 format 原样输出不抛错）；日期 toLocaleDateString；文本维持现状；零 schema 变更（只消费 types.ts 既有 type/numberFormat 字段）

Exit Criteria:

- [ ] 单测先红后绿；非法 numberFormat 不抛错用例在；spreadsheet-renderers 既有单测零回归

### Phase 3 - 双态断言 + docs + 全量验证

Status: completed
Targets: e2e、owner docs、roadmap、daily log

- Item Types: `Proof | Fix | Decision`

- [ ] Proof：e2e 双态断言——扩展 spreadsheet-demo.spec 或新 spec：冻结线/填充柄/active outline/选中底色/编辑态在 light/dark 的计算样式翻转（V0 helper + data-mode 切换先例）；report-designer-demo 路由纳入至少一条双态断言（共用约束另一半）；R7 fill-handle 遮挡实测（遮挡实锤修 z-index，否则裁决 watch-only 落卡）
- [ ] Fix：owner docs——spreadsheet-canvas-css.md（§2.3 示例 hex 漂移修正、§3.2 Excel-light 基线契约改述为「令牌化基线 + dark 变体」、§8 测试策略补双态断言与守卫）、design.md §12 混用风险注记更新；证据卡 spreadsheet.md 回写；roadmap V6 行、Last Updated、daily log
- [ ] Fix：spreadsheet-demo 10 test 与 report-designer-demo 相关 e2e 零回归核对（全仓 typecheck/build/lint/test/check 归 Closure Gates）

Exit Criteria:

- [ ] e2e 双态断言绿（含 report 路由 + 冻结分隔线/填充柄/编辑态补强断言）；spreadsheet-demo 既有用例零回归
- [ ] owner docs 与 live 一致；证据卡无 pending 裁决残留

## Draft Review Record

- Reviewer / Agent: 独立 plan review 审查员（fresh sub-agent session，2026-09-21，一轮）
- Verdict: `pass-with-minors`（0 Blocker / 0 Major / 5 Minor，全部吸收）
- Rounds: 1
- Findings addressed: M-1——R1 实为 3 令牌 4 处消费（漏 :824），Baseline 修正 + 守卫改模式级 regex；M-2——:829/:833 固定色 hsl() 字面量纳入收敛面与守卫词汇；M-3——Phase 2 分派判据钉死（resolveCellTypeClasses 独立函数 + 数值/日期判据 + 显式 textAlign 优先）；M-4——`.ss-grid` 规则块（:22-33）疑似死规则纳入映射表裁决；M-5——Phase 3 Exit Criteria 移除与 Closure Gates 重复的全仓验证链条目（Rule 18）。

## Closure Gates

- [ ] 全部 in-scope 交付落地（Phase 1–3 Exit Criteria 全勾）
- [ ] in-scope contract drift 已收敛：29 hex + 约 39 rgb()/rgba() light-only 面、R1 dangling 令牌、R2/R3 死类、dark 零支持
- [ ] R6/R8/R9 显式裁决落卡（非静默 deferred）；R7 有实测结论
- [ ] 行为/契约结果已达成：dark 双态在 e2e 成立（含 report 路由）；值类型视觉在单测与 e2e 成立
- [ ] 必要 focused verification 已完成（守卫单测先红后绿 + cell-style-map 分派单测 + 双态 e2e）
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [ ] 受影响 owner docs 已同步：spreadsheet-canvas-css.md、design.md、证据卡、roadmap、daily log
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] `pnpm check`（零新 hit）

## Deferred But Adjudicated

### 状态色视觉语言（R6）

- Classification: `watch-only residual`
- Why Not Blocking Closure: 合并琥珀/冻结亮蓝/拖放绿的「调试感」是视觉语言重设计，超令牌化边界；令牌化后单点可调
- Successor Required: `no`

### 滚动条 dark 一致性（R8）

- Classification: `watch-only residual`
- Why Not Blocking Closure: ::-webkit-scrollbar 高度 0 隐藏策略下视觉影响极小
- Successor Required: `no`

### 斑马纹/条件格式通道（R9）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 显式空白非缺陷，能力型缺失归 spreadsheet 域功能 roadmap
- Successor Required: `no`

## Non-Blocking Follow-ups

- fill-handle z-index 遮挡（R7）：已实锤并修复（z 5→7），不转 watch-only。
- report-designer-demo 深度交互断言：本 plan 只纳入双态色彩断言路由。

## Closure

Status Note: 2026-09-21 closure audit 通过（首轮 verdict `issues`：3 Major + 2 Minor——Major-1 `background: white` 命名色守卫盲区、Major-2 plan 文本未回写执行期裁决、Major-3 断言面五缺三；全部当轮修复，复验另发现 2 处一处级文档对账项（Exit Criteria :79 双 scope 残句、owner doc 幽灵类条目）亦已修复，最终 approved）。交付实质（令牌收敛/dark 变体/值类型分派/双路由 e2e/守卫拦截力）经独立重跑证实。

Closure Audit Evidence:

- Auditor / Agent: 独立 closure auditor（fresh sub-agent session，2026-09-21，两轮：全量审计 + 定点复验，只读）
- Evidence: 首轮报告 3 Major + 2 Minor 全部附 文件:行 证据并当轮修复：①`background: white` → `var(--ss-cell-bg)` + 守卫补命名色禁令（对 HEAD 版 css 实证 RED 拦截）；②plan 文本如实回写（:root 发布裁决、语义包裹弃用、.ss-grid 删除裁决、R7 Follow-up 订正）+ 本 Exit Criteria 改写；③断言面补齐五面（填充柄可见 + z>6 R7 护栏、冻结单元格 border 双态、编辑态 outline 双态）+ Minor-2 标题对齐；Minor-1 死白名单删除。复验轮 2 处对账项：Exit Criteria 双 scope 残句改写为本 :root 表述、spreadsheet-canvas-css.md §3.5 幽灵类条目删除（执行期顺带发现 `.ss-frozen-separator-col/row` 死规则并删除，连带更新 spreadsheet/design.md:75 过时注记）。复验独立重跑：单测 167/167、spreadsheet 族 e2e 22/22、check exit 0。daily log：`docs/logs/2026/09-21.md`。

Follow-up:

- no remaining plan-owned work（R6/R8 watch-only、R9 out-of-scope 均已落卡）
