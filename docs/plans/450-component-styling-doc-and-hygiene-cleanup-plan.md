# 450 Component Honesty, Selector/Styling Contract, Design-System, Docs, Diagnostics & Hygiene Cleanup

> Plan Status: completed
> Last Reviewed: 2026-06-26
> Source: `docs/audits/2026-06-24-2213-multi-audit-components.md` ([C-06],[C-07],[C-08],[C-09],[C-12],[C-13],[C-14],[C-15],[C-16],[C-17],[C-18],[C-19],[C-20],[C-21],[C-22],[C-23]), `docs/audits/2026-06-24-2213-open-audit-components.md` ([O-02],[O-03],[O-04])
> Related: `docs/plans/448-*.md`（{1}，契约/身份正确性）、`docs/plans/449-*.md`（{2}，文件拆分）
> Execution Order: {3} of the 3-plan queue. 最后一棒：含若干与 `448` 同文件的项（`crud-renderer.tsx`→C-07、`dynamic-renderer.tsx`→C-15），故排在 `448` 之后以减少同文件反复改动；其余项彼此独立，可在 plan 内并行 workstream。

## Purpose

收口组件审计里**契约/能力/消息诚实、选择器与样式契约、设计系统一致性、文档新鲜度、诊断与测试卫生**这一结果面。这些 finding 多为 P3、低风险、可调度，但合起来是「组件面在细节上的诚实与一致性」。按 Rule 22-25 不再细拆为 one-finding-per-plan，而在单个 owner plan 内用 workstream 分组收口。

**明确不做事项**：审计 [C-24]（carousel/steps 指示点 raw `<button>`）与 5 条 [REJ-*] 已被裁定为「文档化例外 / 误报」，**本计划不含任何工作项**，仅在此声明以避免重复处理。

## Current Baseline

起草者已 live 核对关键引用（行号见各 workstream）。所有 finding 均未修复。各 finding 的现状摘要：

- **C-06（P2）**：`packages/flux-renderers-form-advanced/src/transfer-renderer.tsx:314` 用 BEM `nop-transfer__candidate/__selected`，同元素已有 `data-slot="transfer-pane-{kind}"`；违反 `docs/architecture/renderer-markers-and-selectors.md:130-135`。
- **C-07（P2）**：`packages/flux-renderers-data/src/crud-renderer.tsx:418-425,498` 的 query（搜索）表单失败回退到 `t('flux.common.saveFailed')`（「保存失败」），语义错误且错误被字符串化丢失 `cause`。
- **C-08（P3）**：`flux-renderers-form-advanced/src/index.tsx:71-96` 是 7 个渲染器包里唯一没用共享 `registerRendererDefinitions`（`flux-core/src/registry.ts:52-61`）的，且含冗余 `as RendererDefinition` cast。
- **C-09（P3）**：`flux-renderers-form-advanced/src/index.tsx:30,53-69` 泄漏 9 个内部 helper + 3 个 wildcard barrel，仓内零外部消费者。
- **C-12（P3）**：`packages/flux-bundle/package.json:57` description 写 "full Flux renderer stack"，实际只注册 basic/form/data（plan 436 已裁定 facade 栈）。
- **C-13（P3）**：`flux-renderers-content/src/alert-renderer.tsx:15-23` 硬编码 `emerald/amber/red`，未用 `--success/--warning/--destructive` token。
- **C-14（P3）**：`flux-renderers-layout/src/timeline-renderer.tsx:12-19` 六色里三色（`bg-green-500`/`bg-amber-500`/`bg-sky-500`）绕过主题。
- **C-15（P3）**：`flux-renderers-basic/src/dynamic-renderer.tsx:254` loading 分支在 `nop-dynamic-renderer` marker 上硬注入 `flex flex-col gap-3`（其余分支 marker-only）。
- **C-16（P3）**：`flux-renderers-basic/src/utils.ts:3-5` 自带朴素 `classNames`，与强制的 `cn()`（clsx+tailwind-merge）冲突；唯一消费者是一个测试。
- **C-17（P3）**：4 个 `wrap:true` 字段渲染器（`array-editor.tsx:516`、`renderers/period-renderers.tsx:147`、`tag-list.tsx:88`、`upload-field.tsx:306`）自身根节点重复 `data-slot="field-control"`，与 `field_frame.tsx:248-254` 外层同 slot 嵌套。
- **C-18（P3）**：`transfer-renderer.tsx:347-360`、`picker-renderer.tsx:274-289` 用 raw `<label>`+raw `<input>`，未用 `@nop-chaos/ui` 的 `Label`/`Checkbox`/`RadioGroup`（非 a11y 缺陷，仅一致性）。
- **C-19（P3）**：`wizard-renderer.tsx:422-457`、`editor-renderer.tsx:346-360`、`upload-field.tsx:380-388` 用 raw `<button>`，同文件别处用 `<Button>`（非 a11y 缺陷，仅一致性）。
- **C-20（P3）**：`docs/components/markdown/design.md:8-11` 与 `docs/components/html/design.md:8-11` §2 仍写「尚未实现」，实际均已实现/注册/有测试。
- **C-21（P3）**：`docs/architecture/flux-runtime-module-boundaries.md:399` 称 crud 从 `flux-react/unstable` 导入 `createReadonlyScopeBinding`，live 代码（`crud-renderer.tsx:4-11`）已迁到 `flux-react` root（plan 436 迁移）。
- **C-22（P3）**：`flux-renderers-content/src/qrcode.tsx:57` `void error;` 显式丢弃 QR 渲染错误，无任何 dev 诊断。
- **C-23（P3）**：`flux-renderers-form-advanced/src/detail-view/detail-view-owner-updates.test.tsx:8,14,272,310` 模块级可变 `viewerMountCount`，仅在测试体内手重置。
- **O-02（P3）**：`flux-renderers-data/src/chart-renderer.tsx:229-231` `handleResize` 是 `void chartRef.current;` 纯 no-op，却对外 `invoke('resize')→{ok:true}` / `hasMethod('resize')===true` / `listMethods()` 含之；真实 resize 由独立 `ResizeObserver`（`:101-118`）完成。
- **O-03（P3）**：`flux-renderers-content/src/carousel.tsx:83-122` handle `useMemo` deps 含 `activeIndex`（仅 `getDebugData` 消费），导致每次切播 → handle 重建 → unregister/register 抖动。
- **O-04（P3）**：`carousel.tsx:73-81` autoplay 是裸 `setInterval`，无 hover/focus 暂停、无 `IntersectionObserver` 离屏暂停、无 `prefers-reduced-motion` 尊重（WCAG 2.2 2.2.2）。

## Goals

- 收口上述 19 条 finding（C-06/C-07/C-08/C-09/C-12..C-23/O-02/O-03/O-04），每条达到其各自 recommendation 描述的可观测结果。
- 能力/消息/选择器/诊断类（WS-A）做到「对外不再撒谎」。
- 包表面/文档类（WS-B）做到「导出/描述/路径与 live 一致」。
- 样式/设计系统类（WS-C）做到「token/mark/data-slot 与契约一致」。
- 轮播运行时（WS-D）做到「handle 稳定 + autoplay 受控可暂停」。
- 测试卫生（WS-E）做到「无模块级可变跨测污染」。

## Non-Goals

- 不含 C-24（已裁定文档化例外，无工作）、不含 5 条 REJ（误报）。
- 不做 O-01/C-01/C-02/C-03/C-10/C-11（归 `448`）。
- 不做 C-04/C-05 文件拆分（归 `449`）。本计划触及 `table-body-row-rendering.tsx` 之外的 table 文件时，避免与 `449` 冲突。
- 不做 `>500` 行 WARN 级清理、不做 react19 文档里「不必删除的冗余 memo」整体清理（审计仅保留 O-03 一例自毁式 memo）。

## Scope

### In Scope

- WS-A：`transfer-renderer.tsx`、`crud-renderer.tsx`、`chart-renderer.tsx`、`qrcode.tsx`。
- WS-B：`flux-renderers-form-advanced/src/index.tsx`、`flux-bundle/package.json`、`docs/components/{markdown,html}/design.md`、`docs/architecture/flux-runtime-module-boundaries.md`。
- WS-C：`alert-renderer.tsx`、`timeline-renderer.tsx`、`dynamic-renderer.tsx`、`flux-renderers-basic/src/utils.ts`、`array-editor.tsx`、`period-renderers.tsx`、`tag-list.tsx`、`upload-field.tsx`、`picker-renderer.tsx`、`editor-renderer.tsx`、`wizard-renderer.tsx`。
- WS-D：`carousel.tsx`。
- WS-E：`detail-view-owner-updates.test.tsx`。

### Out Of Scope

- C-24 / REJ-1..5（无工作）。
- `448`/`449` 范围。

## Failure Paths

| 场景                      | 触发                                   | 行为                                                                  | 可重试 | 用户可见表现                        |
| ------------------------- | -------------------------------------- | --------------------------------------------------------------------- | ------ | ----------------------------------- |
| CRUD 查询失败提示（C-07） | query 表单提交 reject 且无可读 message | 回退到 query 语义文案（如 `flux.common.queryFailed`）而非「保存失败」 | 否     | 搜索/筛选失败时显示与操作匹配的提示 |
| QR 渲染失败（C-22）       | payload 过大/颜色非法                  | 维持现有 `failed` UI 态，新增 dev `console.warn`                      | 否     | 失败态不变；dev 控制台可见诊断      |
| 图表 resize 能力（O-02）  | host 调 `invoke('resize')`             | 按裁定：要么真实触发重测，要么从能力面移除                            | —      | 不再返回假成功                      |

## Test Strategy

档位选择：**建议有测**（混合；纯文档项标「不适用」）

- WS-A：C-07 加用户可见文案断言；O-02 加能力面断言（`hasMethod`/`listMethods` 与裁定一致）；C-22/C-06 仅需 grep + 既有测试。
- WS-B：纯文档/描述项（C-12/C-20/C-21）**不适用：理由=纯文档/manifest 文本，无行为变更**；C-08/C-09 加注册/导出冒烟测试。
- WS-C：token/mark 迁移靠既有渲染测试 + 视觉抽查（不靠截图诊断，按 AGENTS 用 `getComputedStyle`/DOM 断言）。
- WS-D：O-03 加「切播不触发 register/unregister」断言；O-04 加 hover/focus/reduced-motion 暂停行为测试。
- WS-E：C-23 加/保持多测下计数隔离断言。

## Execution Plan

### Workstream 1 - 通道诚实与诊断（C-06, C-07, O-02, C-22）

Status: completed
Targets: `transfer-renderer.tsx`、`crud-renderer.tsx`、`chart-renderer.tsx`、`qrcode.tsx`

- Item Types: `Decision | Fix | Proof`

- [x] `Fix`（C-06）：删除 `transfer-renderer.tsx:314` 的 `paneMarker` BEM 类，仅保留 `data-slot="transfer-pane-{kind}"`；外层保留单一 `nop-transfer` marker。
- [x] `Fix`（C-07）：`crud-renderer.tsx:418-425` query 失败回退改用 query 语义 key（新增 `flux.common.queryFailed`/`searchFailed`），并通过 `cause`/monitor details 保留原始错误而非边界字符串化。（`flux.common.queryFailed` 已存在于 i18n；`handleQuerySubmitWithFeedback` 用 `new Error(t('flux.common.queryFailed'), { cause: error })` + `env.notify('warning', ...)`。`env.notify` 仅接受 `(level, message)` 字符串，故结构化错误经 `cause` 保留，文案走 notify。）
- [x] `Decision`（O-02）：**裁定 (A)** — 实装 `resize`。`handleResize` 调 `measureContainerWidth()`（读 `chartRef.current.getBoundingClientRect().width` 并 `setContainerWidth`），与既有 `ResizeObserver`（`:121-134`）一致地驱动 responsive 重测；能力面（`hasMethod('resize')===true`/`listMethods()` 含 `resize`/`invoke('resize')→{ok:true}`）反映真实行为，不再撒谎。`chart-renderer.tsx:245-272`。
- [x] `Fix`（O-02）：按 Decision 落地（option A 实装）。
- [x] `Fix`（C-22）：`qrcode.tsx:54-63` 把 `void error;` 换成 dev-only `console.warn('[qrcode] render failed:', error)`（`import.meta.env?.DEV === true` 门控）。
- [x] `Proof`：C-07 用户可见文案断言（`crud-query-and-pagination.test.tsx:274` "notifies when query submit capability rejects" 断言 notify 收到 warning + 错误消息，非 saveFailed）；O-02 能力面断言（`data-chart-handles.test.tsx:38` 断言 `hasMethod('resize')===true`）。

Exit Criteria:

- [x] `transfer-renderer.tsx` 不再含 `nop-transfer__*` BEM（grep 可证）。
- [x] CRUD query 失败显示 query 语义文案、错误经 `cause` 保留。
- [x] chart `resize` 要么真实生效、要么从能力面移除；`hasMethod`/`listMethods` 与裁定一致（option A：真实生效）。
- [x] QR 失败有 dev `console.warn`。
- [x] 各包相关既有测试全绿。

### Workstream 2 - 包表面与文档新鲜度（C-08, C-09, C-12, C-20, C-21）

Status: completed
Targets: `flux-renderers-form-advanced/src/index.tsx`、`flux-bundle/package.json`、`docs/components/{markdown,html}/design.md`、`docs/architecture/flux-runtime-module-boundaries.md`

- Item Types: `Fix | Proof`

- [x] `Fix`（C-08）：`index.tsx` 注册函数改用 `registerRendererDefinitions(registry, formAdvancedRendererDefinitions)`（已落地）。**`as RendererDefinition[]` cast 经核实为结构必需、非冗余**：`detailFieldRendererDefinition`/`detailViewRendererDefinition` 以 `RendererDefinition<DetailFieldSchema>` 类型声明，`ValidationContributor<S>` 不变（invariant），移除 cast 会导致 TS2322（已实测 build 失败）。 substantive 收口（共享 helper）已成立；cast 保留并在源码注释说明。
- [x] `Fix`（C-09）：删除 `index.tsx` 零外部消费者的 helper re-export 与 3 个 value `export *`（已清理；现仅 export 组件/定义/schema type，与 data/content 包一致）。仓内 grep 确认无外部消费者引用被删导出。
- [x] `Fix`（C-12）：`flux-bundle/package.json:57` description 改为 "Default Flux renderer stack (basic + form + data)"（已落地，与 plan 436 裁定一致）。
- [x] `Fix`（C-20）：更新 `markdown/design.md`、`html/design.md` §2 为已实现基线（react-markdown + remark-gfm + DOMPurify 门控 / `sanitize` 默认 on）。
- [x] `Fix`（C-21）：`flux-runtime-module-boundaries.md:399` 改为 "`@nop-chaos/flux-react` root"（已落地，对齐 live 代码 `crud-renderer.tsx:4-11` 与 plan-436 迁移）。
- [x] `Proof`：C-08/C-09 注册/导出冒烟测试通过（`form-advanced` 包测试 842 全绿）；仓内 grep 确认无外部消费者引用被删导出。

Exit Criteria:

- [x] form-advanced 注册走共享 helper（cast 经裁定为必需保留）；泄漏导出已删且无外部引用断裂。
- [x] flux-bundle description 与裁定一致；markdown/html design.md §2 反映已实现；boundaries doc 导入路径与代码一致。
- [x] `pnpm --filter @nop-chaos/flux-renderers-form-advanced test` 与 form-advanced 导出消费方 typecheck 通过。

### Workstream 3 - 样式与设计系统一致性（C-13, C-14, C-15, C-16, C-17, C-18, C-19）

Status: completed
Targets: `alert-renderer.tsx`、`timeline-renderer.tsx`、`dynamic-renderer.tsx`、`flux-renderers-basic/src/utils.ts`、`array-editor.tsx`、`period-renderers.tsx`、`tag-list.tsx`、`upload-field.tsx`、`transfer-renderer.tsx`、`picker-renderer.tsx`、`editor-renderer.tsx`、`wizard-renderer.tsx`

- Item Types: `Decision | Fix | Proof`

- [x] `Fix`（C-13）：`alert-renderer.tsx:15-23` 改用 token 工具类（`bg-success-bg text-success border-success` / `bg-warning-bg text-warning border-warning`；error 走 `variant="destructive"`；info 已是 `bg-muted/40` token）。
- [x] `Fix`（C-14）：`timeline-renderer.tsx:12-19` success→`bg-success`、warning→`bg-warning` token；**info 裁定（C-14 Decision）：引入新 `--info` token**（`theme-tokens` 4 个 theme 块新增 `--info: 199 89% 48%`/dark `199 89% 60%`，`styles.css @theme inline` 新增 `--color-success`/`--color-success-bg`/`--color-warning-bg`/`--color-info` 映射），timeline info→`bg-info`。非 residual，token 已引入并在 WS-C 内完成。
- [x] `Fix`（C-15）：`dynamic-renderer.tsx:252` loading 分支移除硬编码 `flex flex-col gap-3`，与 error/schema/default 分支一致 marker-only（保留 `data-loading=""` 与 `data-slot="dynamic-renderer-loading"`）。
- [x] `Fix`（C-16）：`flux-renderers-basic/src/utils.ts` 的 `classNames` 已删除（现仅 `asReactNode`/`resolveDirection`/`resolveResponsive*`），该包统一用 `cn()`。
- [x] `Fix`（C-17）：4 个 `wrap:true` 渲染器内层重复 `data-slot="field-control"` 改为渲染器专属 slot（FieldFrame 已提供外层 `field-control`）：`array-editor`→`array-editor-control`、`tag-list`→`tag-list-control`、`upload-field`→`upload-field-control`、`period-renderers`→`period-control`，四处一致。（注：审计 round 已将 C-17 广义化为 18 处；本 plan 按 plan 文本 scope 收口 4 处命名项，其余为独立 consistency follow-up，见 Non-Blocking Follow-ups。）
- [x] `Fix`（C-18）：`transfer`（既有 Label+Checkbox）+`picker` 迁到 `<Label>`+`<Checkbox>`（多选）/`<RadioGroup>`+`<RadioGroupItem>`（单选），保留 option 原 value 类型。
- [x] `Fix`（C-19）：`wizard`/`upload-field` 已用 `<Button>`（既有）；`editor-renderer.tsx:346` raw `<button>` 迁到 `<Button variant="ghost" size="sm">`，active/disabled state 挂 className。
- [x] `Proof`：迁移后既有渲染测试全绿（content 160 / layout / basic 390 / form 499 / form-advanced 842）；token 项用 DOM className 断言验证 token 生效（`alert-renderer.test.tsx` 断言 `bg-success-bg`/`bg-warning-bg` 且不含 emerald/amber）。

Exit Criteria:

- [x] alert/timeline 用 token；info 裁定已记录（引入 `--info` token）。
- [x] dynamic loading 分支 marker-only；`classNames` 已删；4 处 `data-slot` 无重复嵌套；transfer/picker/wizard/editor/upload 控件走 `@nop-chaos/ui`。
- [x] token / data-slot 迁移的正面验证来自 WS-C 的 Proof（DOM className 断言），而非 `check:audit-styling-suspects`（该脚本只扫 `bare-data-slot-selector` CSS 模式，对 token 迁移/C-17 去重无覆盖）；既有渲染测试无回归。

### Workstream 4 - 轮播运行时（O-03, O-04）

Status: completed
Targets: `packages/flux-renderers-content/src/carousel.tsx`

- Item Types: `Fix | Proof`

- [x] `Fix`（O-03）：把 `activeIndex`、`autoPlay`、`loop` 放进 ref（`getDebugData()` 读各自的 `.current`，经 effect 同步以满足 `react-hooks/refs` 规则），从 handle `useMemo` deps 移除这三项；**`items.length` 保留在 deps 中**——`setValue`（`carousel.tsx:100`）用它做边界钳制。handle deps 现 `[api, props.id, slotProps.name, items.length]`，切播期间 identity 稳定。
- [x] `Fix`（O-04）：autoplay 加 hover/focus 暂停（`mouseenter`/`mouseleave`/`focusin`/`focusout` 切 `paused`）、`IntersectionObserver` 离屏暂停、`matchMedia('(prefers-reduced-motion: reduce)')` 门控（matches 时不启动 interval）。
- [x] `Proof`：O-03 断言 handle deps 不含 activeIndex/autoPlay/loop 且含 items.length（`carousel.test.tsx` "keeps the component handle identity stable across slide changes"，源码级 regression guard，因 embla api 在 jsdom 下为 null 无法行为驱动）；O-04 断言 reduced-motion 门控 + hover/focus/IntersectionObserver 接线（`carousel.test.tsx` "gates autoplay on reduced-motion..."）。

Exit Criteria:

- [x] handle 在切播期间 identity 稳定（无 register 抖动）。
- [x] autoplay 受 hover/focus/离屏/reduced-motion 控制。
- [x] `pnpm --filter @nop-chaos/flux-renderers-content test` 全绿（160 passed）。

### Workstream 5 - 测试卫生（C-23）

Status: completed
Targets: `packages/flux-renderers-form-advanced/src/detail-view/detail-view-owner-updates.test.tsx`

- Item Types: `Fix`

- [x] `Fix`（C-23）：模块级 `viewerMountCount` 重置已迁入 `beforeEach`（`detail-view-owner-updates.test.tsx:10-13`），不再在测试体内手重置。

Exit Criteria:

- [x] 不再在测试体内手重置模块级可变；多测顺序/`.only` 下计数不串。
- [x] 该测试文件全绿；`pnpm --filter @nop-chaos/flux-renderers-form-advanced test` 全绿（842 passed）。

## Draft Review Record

- Reviewer / Agent: 独立子 agent fresh session (ses_1049b3723ffeb3aJVNYqpGoKk7K round 1；ses_10495eb53ffewf1a81aABGDkHM round 2)
- Verdict: round 1 `revised`（1 Major + 3 Minor）→ 修复 → round 2 `pass`（共识达成）
- Rounds: 2
- Findings addressed:
  - Major（round 1）：O-03 错误要求从 handle `useMemo` deps 移除 `items.length`——但 `setValue`（`carousel.tsx:100`）用它做边界钳制，移除会致 item 数变化时越界。已修正为「仅 `activeIndex`/`autoPlay`/`loop` 入 ref（三者仅 `getDebugData:117` 消费，已核），`items.length` 必须保留」。round 2 确认 resolved。
  - Minor（round 1）：WS-C Exit Criteria 误引 `check:audit-styling-suspects`（该脚本只扫 `bare-data-slot-selector`，对 token/C-17 去重无覆盖）— 已改为引用 Proof（getComputedStyle/DOM 断言）。
  - Minor（round 1）：C-07 cause 保留机制未确认 `env.notify` 签名 — 已补「执行前核对签名，若仅字符串则走 monitor/telemetry 通道并记录」。
  - Minor（round 1）：WS-E 单 finding 可并入他处 — 保留（Rule 24 允许按主题拆 workstream）。
- Split 评估（round 1）：独立 agent 判定「19 findings 合并为 1 个 owner plan 正确」（Rules 22-26：同源审计/同 owner 家族/同 P2-P3 profile/同低风险可调度特征/收敛于单一 closure criterion「component-surface honesty/consistency baseline」；5-workstream 内部分组按结果面诚实表达各自 proof 路径；拆成 5 plan 才是 over-split）。
- 引用核对（round 1+2）：transfer BEM:314、crud query saveFailed:418-425/498、chart no-op:229-231、qrcode void:57、form-advanced index register/leak、flux-bundle description:57、markdown/html design.md:8-11、boundaries doc:399、carousel deps:121/setValue:100/getDebugData:117、autoplay setInterval:73-81 — 全部 live 核对 OK。

## Closure Gates

- [x] WS-A：transfer 无 BEM；CRUD query 文案正确且保留 cause；chart resize 能力面诚实；QR 有 dev 诊断。
- [x] WS-B：form-advanced 注册/导出收敛；flux-bundle description、markdown/html design.md、boundaries doc 与 live 一致。
- [x] WS-C：alert/timeline token 化；dynamic loading marker-only；`classNames` 删除；4 处 data-slot 无重复；相关控件走 `@nop-chaos/ui`。
- [x] WS-D：carousel handle 稳定 + autoplay 受控。
- [x] WS-E：测试无模块级可变跨测污染。
- [x] 不存在被静默降级到 deferred 的 in-scope live defect（O-02 裁定 option A 实装；timeline-info 裁定引入 `--info` token，已在 WS-C 完成）。
- [x] 受影响 owner docs 已同步（C-20/C-21 已含；timeline/alert 的 token 迁移无单独 owner-doc 改动需求）。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不自审本项。（fresh session `ses_100039e36ffeEFSVBDsAaxO339`，verdict `approved`，见 Closure Audit Evidence。）
- [x] `pnpm typecheck`（55/55 tasks OK）
- [x] `pnpm build`（29/29 tasks OK）
- [x] `pnpm lint`（29/29 tasks OK；1 non-blocking warning in flux-renderers-form-advanced）
- [x] `pnpm test`（55/55 tasks OK：content 160 / basic 390 / form 499 / form-advanced 842 全绿）

## Deferred But Adjudicated

> 起草时无；执行期无新增。timeline `info` 色裁定为「引入 `--info` token」并在 WS-C 内完成（非 residual）。C-08 的 `as RendererDefinition[]` cast 经裁定为结构必需（`ValidationContributor<S>` invariant），保留并在源码注释说明，不属 deferred。C-17 广义化（4→18）的其余 14 处为既有 widespread pattern，记入 Non-Blocking Follow-ups。

## Non-Blocking Follow-ups

- C-24（carousel/steps 指示点 raw `<button>`）：已裁定为文档化例外，待未来出现 `IconButton`/`DotIndicator` 原语时 revisit。
- C-17 广义残余（14 处）：`combo-renderer`/`input-table`/`key-value`/`transfer`/`picker`/`object-field`/`array-field`/`detail-field` 等 wrap:true 渲染器内层仍带 `data-slot="field-control"`，与 FieldFrame 外层 `field-control`（`field-frame.tsx:248-254`）嵌套。FieldFrame 已提供外层 slot，`querySelector('[data-slot="field-control"]')` 命中外层，selector 行为不受影响；本 plan 按 C-17 文本 scope 收口 4 处命名项，其余作为独立 consistency 治理 follow-up（归后续 styling-consistency plan）。
- 其余 `>500` 行 WARN 文件收敛（归独立治理 plan）。

## Closure

Status Note: 本 plan 19 条 finding（C-06/C-07/C-08/C-09/C-12..C-23/O-02/O-03/O-04）全部收口。多数 finding 已由前置 plan（0630-1/448/449）修复，本执行核对 live baseline 后仅改动 genuinely outstanding 项（C-13/C-14 token、C-15 marker-only、C-17 四处 slot、C-18 picker、C-19 editor、O-03/O-04 carousel，及 C-08 cast 裁定）。token 迁移引入 `--info` + `--color-success/success-bg/warning-bg/info` 以完整语义调色板。Closure Gates 全绿（typecheck/build/lint/test），独立 closure-audit `approved`。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent fresh session `ses_100039e36ffeEFSVBDsAaxO339`（不复用执行 session 上下文）。
- Evidence: verdict `approved`。独立 re-verify 全部 19 条 live 代码；独立 re-run `flux-renderers-content`（160/160）与 `flux-renderers-form-advanced`（842/842）+ 两包 `tsc -p` clean；确认 C-08 cast 裁定合法、C-17 deferral 诚实（FieldFrame 提供外层 slot，非阻塞）。

Follow-up:

- C-24 successor（条件性，待 `IconButton`/`DotIndicator` 原语）。
- C-17 广义残余 14 处 → 后续 styling-consistency plan。
- `>500` 行 WARN 收敛 → 独立治理 plan。
- 除此以外 no remaining plan-owned work。
