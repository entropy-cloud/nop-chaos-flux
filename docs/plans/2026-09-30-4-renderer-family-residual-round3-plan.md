# 04 renderer 族残余性能与 UX 批量（round-3）

> Plan Status: active
> Last Reviewed: 2026-09-30
> Source: `docs/analysis/2026-09-30-perf-ux-round3-deep-optimization-analysis.md`（R3-P23 ~ P30 + R3-U3、U14 ~ U17、U29 ~ U31）
> Related: `docs/plans/2026-09-29-1-scheduling-renderer-performance-plan.md`、`docs/plans/2026-09-29-5-visual-consistency-a11y-round2-plan.md`、`docs/plans/2026-09-30-5-playground-ui-ux-round3-plan.md`（playground 侧 UX 分开承接）

## Purpose

收口前两轮 renderer 优化后的漏网组件：8 条性能热点（富文本每击键 DOMPurify、签名板全量重绘与键盘不可达、key-value 行未 memo、condition-builder O(n²)、图表 sr-only/heatmap 无上限、stat-tile Intl、crud 轮询无限重试）与 8 条 UX 残余（barcode i18n 冻结、key-value/input-table 英文碎片、tree 搜索命名、carousel 指示点、query-filter aria-controls、role 冗余）。

## Current Baseline

- kanban/calendar/gantt/AI 流式/transfer/list/tabs/upload/diff-view 等前两轮修复全部在位且无回归（round-2 closure audit 通过）。
- `editor-renderer.tsx:145-156` onUpdate 每击键 `sanitizeEditorHtml(getHTML())`——live 核实（执行者抽查成立）。
- `signature-renderer.tsx:167-177` 每 pointermove 全量 redraw、:256-263 canvas 无键盘路径——live 核实。
- `key-value.tsx:43` KeyValueRow 未 memo；:544,:554,:246 英文碎片——live 核实。
- `condition-group.tsx:240-242,:296` 每项 computeUsedFields；`chart-renderer.tsx:249-251` pie 无 slice；`chart-heatmap.tsx:106-122` 无上限；`stat-tile-renderer.tsx:56-61` Intl 每 render；`use-crud-polling.ts:140` 无限重试——live 核实。
- `barcode-scanner-overlay.tsx:16-19` 模块顶层 t() 冻结——live 核实（执行者抽查成立）。
- `input-table-renderer.tsx:361`、`tree-renderer.tsx:617-628`、`carousel.tsx:302-327`、`query-filter.tsx:49-59`、`sparkline-renderer.tsx:85-88`、`stat-tile-renderer.tsx:218-221`——live 核实。
- 相关包单测/e2e 全绿（round-2 收口基线）。

## Goals

- 富文本击键路径零 DOMPurify（sanitize 移到 commit 边界）；签名会话从 O(点数²) 降到 O(点数)。
- key-value 行渲染收敛到单行；condition-builder 组内线性；图表 sr-only/heatmap 有上限；stat-tile formatter 缓存；crud 轮询有限重试。
- barcode 文案随语言切换；key-value/input-table 文案全本地化；tree 搜索有可访问名称；签名板有键盘替代说明路径；carousel 指示点非仅颜色；query-filter aria-controls 接线；冗余 role 清理。

## Non-Goals

- 不改富文本编辑器的 ProseMirror allowlist 与安全模型（仅 sanitize 时机移动）。
- 不做 heatmap 虚拟化/窗口化（设上限即可收口本轮）。
- 不改签名板的产品形态（键盘路径以"可达 + 降级说明"为收口标准，不做手写板替代实现）。
- swipe-cell 键盘策略维持已记录产品决策，不倒账。

## Scope

### In Scope

- `packages/flux-renderers-form-advanced/src/editor-renderer.tsx`、`key-value.tsx`、`condition-builder/condition-group.tsx`
- `packages/flux-renderers-form/src/renderers/signature-renderer.tsx`
- `packages/flux-renderers-data/src/chart-renderer.tsx`、`chart-heatmap.tsx`、`stat-tile-renderer.tsx`、`tree-renderer.tsx`、`query-filter.tsx`、`sparkline-renderer.tsx`、`use-crud-polling.ts`
- `packages/flux-renderers-content/src/carousel.tsx`
- `packages/flux-renderers-scheduling/src/barcode-input/barcode-scanner-overlay.tsx`
- `packages/flux-renderers-form-advanced/src/input-table-renderer.tsx`
- flux-i18n locales（新增键）
- 各改动点 focused 单测

### Out Of Scope

- playground 侧 UX（Plan 5 承接）
- editor 输出格式/校验语义变更

## Failure Paths

| 可测场景编号           | 触发                        | 行为                                                                                                                                                                    | 可重试 | 用户可见表现                                   |
| ---------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------- |
| editor-paste-unsafe    | 富文本粘贴含 script 的 HTML | sanitize 仍在 commit/onBlur 边界执行，存储值安全子集                                                                                                                    | 是     | 行为与现状等价（DOMPurify 门禁不消失，仅移位） |
| crud-polling-misconfig | 轮询数据源 handle 永不可用  | 重试达上限（20 次 ≈ 5s）后停止并 warn（不再永久空转）；达上限后 handle 才注册成功则不自动恢复（裁定：超过合法晚注册窗口视为配置错误，组件重渲染 effect 重跑时重新武装） | 是     | 无限循环消除                                   |
| heatmap-oversize       | 100×100 cells               | 渲染上限截断 + 数量提示（不生成 1 万节点）                                                                                                                              | 是     | 页面不卡死                                     |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**建议有测**（sanitize 移位与轮询上限是行为敏感点，必须 focused 单测锁定；其余为机械修复 + DOM 断言）。

## Execution Plan

### Phase 1 - 性能热点（R3-P23 ~ P30）

Status: planned
Targets: `editor-renderer.tsx`、`signature-renderer.tsx`、`key-value.tsx`、`condition-group.tsx`、`chart-renderer.tsx`、`chart-heatmap.tsx`、`stat-tile-renderer.tsx`、`use-crud-polling.ts`

- Item Types: `Fix`、`Proof`

- [ ] Fix (R3-P23)：editor onUpdate 路径 **sanitize 先于 store 写入**（可 trailing debounce 合并连续击键，但不引入"裸 HTML 进 store"的瞬态窗口）；粘贴/输入路径 sanitization 语义经既有 sanitize 测试证明等价
- [ ] Fix (R3-P24)：签名 pointermove 只增量绘制最新线段；全量 redraw 保留 undo/clear/resize
- [ ] Fix (R3-P25)：`KeyValueRow` 包 React.memo + 行级 props 收敛（对齐 ComboItem/ArrayItem/InputTableRow 先例）
- [ ] Fix (R3-P26)：condition-group 组级 useMemo 一次构建 `excludeId → usedFields` 映射
- [ ] Fix (R3-P27)：pie sr-only 摘要 `slice(0, 20)` + 总数注明（对齐 cartesian/heatmap 先例）
- [ ] Fix (R3-P28)：heatmap cells 上限（超限截断 + 提示），`<title>` 改单 tooltip 事件委托（或保持 per-cell title 但有上限，执行时按实现成本裁定并在 plan 本节回写最终裁定）
- [ ] Fix (R3-P29)：stat-tile Intl.NumberFormat 按 `language|decimals|thousands` 模块级 Map 缓存
- [ ] Fix (R3-P30)：crud 轮询解析重试设上限（20 次 × 250ms ≈ 5s，覆盖 schema 顺序 `[crud, data-source]` 的合法晚注册窗口；live 注释 `use-crud-polling.ts:126-133` 记载的 warn-once 设计保留）；达上限后停止自动重试并 warn 指引配置检查；组件 effect 重跑时计数重新武装
- [ ] Proof：focused 单测——sanitize 边界等价（unsafe HTML 不入存储值）；签名增量绘制断言（draw call 计数）；key-value 单行击键只重渲该行（渲染计数）；condition-builder 映射与原递归结果一致；pie/heatmap 上限生效；formatter 缓存命中；重试达上限停止

Exit Criteria:

- [ ] 8 项 Fix 落地，focused 测试全绿
- [ ] 相关包既有测试（editor sanitize、signature、chart、crud）无回归

### Phase 2 - UX 与 i18n 残余（R3-U3、U14 ~ U17、U29 ~ U31）

Status: planned
Targets: `barcode-scanner-overlay.tsx`、`signature-renderer.tsx`、`key-value.tsx`、`input-table-renderer.tsx`、`tree-renderer.tsx`、`carousel.tsx`、`query-filter.tsx`、`sparkline-renderer.tsx`、`stat-tile-renderer.tsx`、flux-i18n locales

- Item Types: `Fix`、`Proof`

- [ ] Fix (R3-U3)：barcode statusMessages 移入组件内（随语言切换）
- [ ] Fix (R3-U14)：签名板 tabIndex + 键盘可达说明（焦点进入时 sr-only/可视说明指引指针替代路径），满足"键盘可达 + 降级提示"收口标准
- [ ] Fix (R3-U15)：key-value 校验/aria-label 文案改用带 `{index}` 占位的完整本地化键（复用/新增 `flux.form.keyEntry` 系）
- [ ] Fix (R3-U16)：input-table "row actions" aria-label 换 t() 键
- [ ] Fix (R3-U17)：tree 搜索框补 `aria-label={t('flux.common.search')}`（或专用键）
- [ ] Fix (R3-U29)：carousel 激活指示点加非颜色差异（ring/scale）
- [ ] Fix (R3-U30)：query-filter 内容区 id + 按钮 aria-controls
- [ ] Fix (R3-U31)：sparkline/stat-tile 移除与 aria-hidden 矛盾的 `role="img"`
- [ ] Proof：DOM 断言单测——语言切换后 barcode 文案变化；签名聚焦出现说明；key-value aria-label 全本地化；tree 搜索 accessible name；carousel 激活点非仅颜色断言（class/attr 存在）；aria-controls 指向存在 id；冗余 role 移除
- [ ] Proof：新增 locale 键 en-US/zh-CN 齐全（i18n 契约测试通过）

Exit Criteria:

- [ ] 8 项 UX Fix 落地，DOM 断言测试全绿
- [ ] i18n 契约测试通过（键集一致）

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，agent_b8b0d3f0）
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed: 无 Blocker/Major；Minor（R3-P23 sanitize 先于存储写入措辞钉死、R3-P28 裁定回写义务、R3-P30 合法晚注册窗口与重新武装语义 + Failure Path 补写、U14 收口标准经 Non-Goals 裁定维持）已全部修正。

## Closure Gates

- [ ] 所有 in-scope confirmed live 缺陷已修复（R3-P23 ~ P30、U3、U14 ~ U17、U29 ~ U31 逐条核对）
- [ ] 不适用 contract drift（sanitize 边界移动不改变存储值安全语义，以等价测试为准）
- [ ] 行为/契约结果已达成（Failure Paths 三场景 + 全部 focused/DOM 断言测试通过）
- [ ] 必要 focused verification 已完成
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect
- [ ] owner docs 已同步（若 sanitize 边界属文档化设计决策需更新对应设计文档；否则写明 No owner-doc update required）
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

（无——in-scope 全部 Fix）

## Non-Blocking Follow-ups

- heatmap 大数据集降采样策略精细化（本轮以截断+提示收口）

## Closure

Status Note: <<完成时填写>>

Closure Audit Evidence:

- Auditor / Agent: <<独立子 agent>>
- Evidence: <<task id / daily log link / findings 摘要>>

Follow-up:

- <<只记录 non-blocking follow-up>>
