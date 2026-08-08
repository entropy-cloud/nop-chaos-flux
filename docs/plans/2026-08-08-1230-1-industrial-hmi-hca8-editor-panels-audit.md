# 01 Industrial HMI Component Audit — HCA8 Editor Panels（palette/inspector/toolbox 23 维包级深审 + 自动修复）

> Plan Status: completed
> Last Reviewed: 2026-08-08
> Mission: industrial-hmi-component-audit
> Work Item: HCA8. Editor panels 审计
> Source: `docs/backlog/industrial-hmi-component-audit-roadmap.md` §HCA8；包级深审 `docs/skills/deep-audit-prompts.md`（23 维；align-distribute/z-order 为复杂定位算法，维度 21 显示与定位正确性必选触发）；先验修复基线 `docs/plans/2026-08-08-0900-1-industrial-hmi-editor-p2-correctness-robustness-remediation.md`（completed，#5 align-distribute group-relative watch-only residual 在本 plan 复核范围内）
> Related: HCA7（planned，editor renderer 层基线，本 plan 前置依赖；audit card `scada-editor-canvas.md` fixed-pending-closure）、HCA0（done，编排基线）、HCA-BL（successor，bug 归档）、HCA-CR（successor，跨层集中修复）

## Purpose

对 `@nop-chaos/flux-renderers-industrial` 的 **editor panels 层**（3 子目录 9 源文件，~1,112 行）做一次完整的 23 维包级深审（align-distribute/z-order 追加维度 21），把发现的 P0/P1 live defect 立即 test-first 修复，P2 低成本当场修复 / 否则入审计卡 backlog，复核前序 plan 0900-1 转交的 `#5 align-distribute group-relative` watch-only residual（确认仍为 residual 或升级修复），产出审计记录文件。editor panels 是 SCADA 编辑器的 React UI 面板层——图元库浏览（palette）、属性面板 schema 抽取 + 字段路由（inspector）、工具箱对齐/分布/层级/剪贴板（toolbox）直接决定编辑器的可操作性、属性编辑保真与图层操作正确性。

## Current Baseline

> 起草前已逐条核对 live repo（2026-08-08，`packages/flux-renderers-industrial/src/editor/{palette,inspector,toolbox}/`，行号/`wc -l` 实测对齐 HEAD，与 roadmap §审计对象总览一致）。

### 审计对象：3 子目录 9 源文件（`wc -l` 实测）

**palette（1 文件 / ~58 行）**：

- `palette/editor-palette.tsx`（58）— 图元库 React UI：从 `listScadaSymbols()` 只读枚举注册图元，渲染可拖放项；HCA7 P3-1 已修复 `title` 用 `def.name`（displayName）替代 `def.type`。

**inspector（4 文件 / ~426 行）**：

- `inspector/inspector-panel.tsx`（85）— 属性面板 React UI：选中图元 → 调用 `extractSchema` 派生字段列表 → 渲染 inspector-field 列表。
- `inspector/inspector-field.tsx`（148）— 单字段编辑 React UI：按字段类型路由到 `@nop-chaos/ui` 输入控件（Input/Select/Switch/Slider 等），parse 失败仅 `setParseError` 不调 onChange（plan 0900-1 #6 已复核）。
- `inspector/schema-extractor.ts`（142）— 纯逻辑：从 symbol definition 的 props 声明 + 实例 values 派生可编辑字段 schema（类型/默认值/约束）。
- `inspector/field-errors.ts`（51）— 纯逻辑：字段级错误码 → i18n key 映射 + 错误聚合。

**toolbox（4 文件 / ~628 行）**：

- `toolbox/toolbox-panel.tsx`（222）— 工具箱 React UI：对齐/分布/层级/复制粘贴/导入导出按钮编排；`canPaste` 由 canonical clipboard 派生（plan 0900-1 #21 已移除 `clipboardCount` state mirror）；导入确认对话框（toolbox-panel.test.tsx 覆盖失败路径）。
- `toolbox/align-distribute.ts`（150）— **复杂定位算法**（维度 21）：基于 selection 包围盒计算对齐（左/右/顶/底/中/居中）与分布（水平/垂直均布）；扁平算法，跨层级混选使用各节点 local 坐标为文档化 M3 T1 限制（`:6` 注释）。
- `toolbox/z-order.ts`（144）— **数组索引操作**（维度 21）：toTop/toBottom/bringForward/sendBackward = symbols 数组重排（splice + push/unshift）；空/单元素边界。
- `toolbox/clipboard.ts`（112）— 纯逻辑：复制/粘贴 symbol 实例，粘贴时分配新 ID（symbol id + 点表 key 重映射）。

### 7 colocated 测试文件（喂入 Phase 1/2 回归，不纳入审计对象 / ~1,234 行）

`inspector/field-errors.test.ts`（80）/ `inspector/schema-extractor.test.ts`（149）/ `inspector/inspector-field.test.tsx`（214）/ `toolbox/toolbox-panel.test.tsx`（364）/ `toolbox/align-distribute.test.ts`（186）/ `toolbox/clipboard.test.ts`（138）/ `toolbox/z-order.test.ts`（103）。

### 已收口的先验修复（构成基线，本 plan 不重做，仅 Phase 3 抽查回归）

- **plan 0900-1 #6**：inspector-field parse 失败仅 setParseError 不调 onChange（`inspector-field.tsx:134-137`）——复核仍成立。
- **plan 0900-1 #21**：toolbox canPaste 由 canonical clipboard 派生（移除 clipboardCount state mirror）——复核仍成立。
- **HCA7 P3-1**：palette `title={def.name}`（`editor-palette.tsx:51`）——已修复，复核仍成立。

### 前序 plan 转交项（#5 watch-only residual，本 plan 必须复核）

**plan 0900-1 #5**（`align-distribute.ts`）：`alignSelection`/`distributeSelection` 跨层级混选使用各节点 local 坐标，对「跨父容器混选」不对齐到世界坐标；classified watch-only residual（M3 T1 文档化接受限制，`align-distribute.ts:6` 注释 + `align-distribute.test.ts:156-178` 单测证明同 group 兄弟自洽）。**本 plan 在维度 21 深审中复核**：确认限制仍被正确文档化、单测仍覆盖、且无新的 live 渲染缺陷（例如 P1-C2/C3 回归）；若发现新缺陷则升级 test-first 修复，否则维持 watch-only residual 并在审计记录落 per-file 裁定。

### owner doc 现状

- `docs/components/industrial-hmi-editor/design-toolbox.md` §4.2（对齐/分布/层级算法）/ §4.3（clipboard）/ §5（字段分类）/ §10（样式子标记）。
- `docs/components/industrial-hmi-editor/design-property-panel.md`（inspector schema 抽取 + 字段路由）。
- `docs/components/industrial-hmi/editor-initiation.md` §2.1（M3 工具箱功能域）。
  Phase 3 核对这些章节与 live panels 一致性。

### 包级机械健康

`pnpm --filter @nop-chaos/flux-renderers-industrial typecheck/lint/test` 全绿（HEAD 基线 ~1,300+ tests / 97 test files）。

## Goals

- 对 3 子目录 9 源文件逐文件完成 23 维包级深审（align-distribute/z-order 追加维度 21），产出带 `文件:行` 证据的 finding 清单（P0/P1/P2/P3 triage）。
- 所有确认的 P0/P1 live defect test-first 修复（failing-first proof 先于 fix，断言结果值而非 not.toThrow）。
- P2 低成本当场修复并带回归测试；P2 高成本 / P3 入审计卡 backlog（归 HCA-CR）。
- 复核 plan 0900-1 #5 转交项：确认 align-distribute group-relative 限制仍为 watch-only residual 或升级修复，给出 per-file 裁定。
- owner doc（design-toolbox.md §4.2/§4.3/§5/§10、design-property-panel.md）与 live panels 一致性核对 + 必要同步。
- 产出审计记录文件 `docs/audits/2026-08-08-*-hca8-editor-panels.md`。

## Non-Goals

- 不审计 editor renderer / engine 层（HCA7 planned、HCA2 done）。
- 不审计 editor connection（HCA9）/ undo-redo（HCA10）/ infra（HCA11，下一轮）。
- 不重做已收口的 #6/#21/HCA7 P3-1 修复（仅 Phase 3 抽查回归）。
- 不做 HCA-BL（bug 归档）/ HCA-LL（lesson 沉淀）的全量汇总——本 plan 仅产出本层 finding 喂入 HCA-BL/LL。
- 不改 panels 公共面或 region 契约（除非审计发现 contract drift）。

## Scope

### In Scope

- `packages/flux-renderers-industrial/src/editor/palette/editor-palette.tsx`（1 源文件）。
- `packages/flux-renderers-industrial/src/editor/inspector/`（4 源文件：inspector-panel/inspector-field/schema-extractor/field-errors）。
- `packages/flux-renderers-industrial/src/editor/toolbox/`（4 源文件：toolbox-panel/align-distribute/z-order/clipboard）。
- 审计记录 `docs/audits/2026-08-08-*-hca8-editor-panels.md`。
- owner doc `docs/components/industrial-hmi-editor/design-toolbox.md`（§4.2/§4.3/§5/§10）+ `design-property-panel.md`（仅当审计发现 drift 时同步）。
- 任一 P0/P1 fix 的 focused regression test。

### Out Of Scope

- `src/editor/renderer/`（HCA7）、`src/editor/connection/`（HCA9）、`src/editor/undo-redo/`（HCA10）、`src/editor/` 顶层 infra（editor-session/adapter/working-helpers/runtime-factories/runtime-mutators/toolbox-runtime/connection-wiring/test-handle-factory/editor-test-handle，HCA11）。
- `*.test.ts` / `*.test.tsx` / `*-fixtures.ts` / `index.ts` barrel（测试基础设施 / 聚合导出，不纳入审计对象，仅作回归喂入）。
- `src/renderer/`（HCA1）、`src/engine/`（HCA2）、`src/binding/`（HCA3）、`src/serialization/`（HCA4）、`src/symbols/`（HCA5/HCA6）。
- HCA-BL/LL/CR/CV/CG 全量汇总（本 plan 仅喂入 finding）。

## Failure Paths

> editor panels 是 React UI + 纯逻辑适配器层，无外部 IO / 鉴权 / API 契约。失败路径关注点是 schema 抽取正确性、定位算法边界与 clipboard ID 冲突。

| 可测场景编号                | 触发                                                | 行为                                                 | 可重试 | 用户可见表现                       |
| --------------------------- | --------------------------------------------------- | ---------------------------------------------------- | ------ | ---------------------------------- |
| align-empty-selection       | alignSelection/distributeSelection 传入空 selection | no-op（不 throw、不 mutate symbols 数组）            | 否     | 无变化，无控制台异常               |
| zorder-single-element       | toTop/toBottom 对单元素 selection 调用              | no-op 或幂等（数组长度不变，元素不变）               | 否     | 图层无变化                         |
| clipboard-id-collision      | paste 时新分配的 symbol id 与现存 id 冲突           | 重分配唯一 id（点表 key 同步重映射），不覆盖现存图元 | 否     | 粘贴产生新图元，原图元保留         |
| schema-extract-unknown-type | symbol definition 声明未知字段类型                  | 字段降级为 text 输入或不渲染（不 throw）             | 否     | 字段以默认形态显示                 |
| inspector-parse-invalid     | 字段输入 parse 失败（非法数值/格式）                | setParseError + 不调 onChange（#6 基线）             | 否     | 字段标红 + 错误文案，config 不更新 |

## Test Strategy

本档选择：**建议有测**

editor panels 是 React UI + 纯逻辑适配器层，非注册 renderer。审计前无已知 P0/P1 live defect（先验 #5 watch-only residual、#6/#21 已收口）。任何审计中确认的 P0/P1 live defect 按 roadmap 自动修复契约 test-first（failing-first proof 先于 fix）；P2 修复 same-PR 带回归。验证以 `pnpm --filter @nop-chaos/flux-renderers-industrial typecheck/test` + 关键行为抽查（schema 抽取 / 字段路由 @nop-chaos/ui 复用 / align-distribute 定位正确性 / z-order 数组操作 / clipboard 新 ID 分配）为主。DOM 契约变更（panel data-slot/marker）追加 e2e。

## Execution Plan

### Phase 1 - 逐文件 23 维包级深审 + finding triage + #5 复核

Status: completed
Targets: `packages/flux-renderers-industrial/src/editor/{palette,inspector,toolbox}/`（9 源文件）、`docs/audits/2026-08-08-*-hca8-editor-panels.md`

- Item Types: `Proof | Decision`

- [x] 逐文件过 `docs/skills/deep-audit-prompts.md` 23 维，按子目录分组审查。重点维度：
  - **@nop-chaos/ui 复用**（.tsx 文件）：palette/inspector-panel/inspector-field/toolbox-panel 是否有裸 HTML 元素（input/select/button 等）应替换为 `@nop-chaos/ui` 组件；`cn()` 合并；data-slot/marker class 契约。
  - **schema 抽取正确性**（schema-extractor.ts）：从 symbol definition props 声明派生字段 schema 的穷尽性；类型映射（text/number/boolean/select/color）；默认值/约束透传；未知类型降级。
  - **字段路由正确性**（inspector-field.tsx）：字段类型 → `@nop-chaos/ui` 控件路由穷尽性；parse 失败降级（#6 基线复核）；controlled/uncontrolled 一致性。
  - **对齐/分布算法**（align-distribute.ts，**维度 21 必选**）：包围盒计算正确性（空 selection 守卫、单元素、多元素）；对齐方向（左/右/顶/底/中/居中）数学；分布（均布间距计算）；浮点累积；跨层级混选 local 坐标限制。
  - **层级数组操作**（z-order.ts，**维度 21 必选**）：toTop/toBottom/bringForward/sendBackward 的 splice + push/unshift 正确性；空/单元素边界；越界守卫；幂等性。
  - **clipboard 新 ID 分配**（clipboard.ts）：粘贴时 symbol id + 点表 key 重映射唯一性；深拷贝隔离；空 clipboard 守卫。
  - **错误码/i18n**（field-errors.ts）：字段错误码 → i18n key 映射穷尽性；双 locale 注册。
  - **类型安全**：props 字段窄化、symbol definition cast、未知字段访问。
- [x] 重点抽查边界值：空 selection / 单元素 selection / 未知字段类型 / 非法 parse 输入 / 空 clipboard / 超大字段值 / 深嵌套 symbol。
- [x] **#5 复核（必须）**：对 `align-distribute.ts` 跨层级混选 local 坐标限制核查：`:6` 文档化注释仍在？`align-distribute.test.ts:156-178` group-relative convergence 单测仍覆盖且通过？是否存在 P1-C2/C3 回归迹象（selection 未正确收敛）？给出裁定（维持 watch-only residual / 升级 test-first 修复）。
- [x] 产出 `docs/audits/2026-08-08-*-hca8-editor-panels.md`：逐文件 finding 表（维度 / 结论 / `文件:行` 证据 / P0-P3 triage）+ #5 复核裁定行。

Exit Criteria:

> 写法原则：只写本 Phase 真正交付的可观测结果 + 保证后续 Phase 能继续的局部检查；全量验证归 Closure Gates。

- [x] 审计记录文件存在，含 3 子目录 9 文件逐文件 finding 表 + 每条 `文件:行` 证据经 live 核对。
- [x] 所有 finding 已 triage 为 P0/P1/P2/P3 之一（无未分类项）。
- [x] #5 复核裁定行存在（维持 residual 或升级修复，附证据）。

### Phase 2 - P0/P1 自动修复 + P2 低成本修复（test-first）

Status: completed
Targets: Phase 1 finding 中标 P0/P1 的源文件 + 对应 `*.test.ts(x)`

- Item Types: `Fix | Proof`

- [x] 对每条 P0/P1 finding：先写 failing-first focused test（断言正确结果值 / 行为，非 not.toThrow），再修代码使转绿。
- [x] P2 低成本（<~30 行 / 单文件 / 无公共面变更）当场修复并带回归测试；P2 高成本入审计卡 backlog（归 HCA-CR）。
- [x] 若 #5 复核发现升级为 P2/P1（group-relative 致 live 渲染缺陷），test-first 修复（世界坐标对齐或显式 selection 收敛）。
- [x] 每条 fix 在审计记录文件回写状态（fixed / recorded）+ fix 落点 `文件:行`。

Exit Criteria:

- [x] 所有 P0/P1 finding 的 failing-first test 存在且转绿（断言结果值）。
- [x] `pnpm --filter @nop-chaos/flux-renderers-industrial typecheck/test` 全绿（包级局部验证）。
- [x] 审计记录 finding 状态已回写（含 #5 复核裁定结果）。

### Phase 3 - owner doc 一致性核对 + 回归抽查 + bug 喂入

Status: completed
Targets: `docs/components/industrial-hmi-editor/design-toolbox.md`（§4.2/§4.3/§5/§10）、`design-property-panel.md`、审计记录、HCA-BL 引用

- Item Types: `Fix | Follow-up`

- [x] 核对 `design-toolbox.md` §4.2（对齐/分布/层级算法）/ §4.3（clipboard）/ §5（字段分类）/ §10（样式子标记）+ `design-property-panel.md`（schema 抽取 + 字段路由）与 live panels 一致；仅当发现 drift 时同步（无 drift 不写）。
- [x] 抽查先验修复回归（#6 inspector parse 不调 onChange / #21 canPaste canonical 派生 / HCA7 P3-1 palette title=def.name 行为仍成立）。
- [x] 把本层复杂 / 跨层 bug 候选汇总到审计记录「喂入 HCA-BL」节（正式归档动作在 HCA-BL，本 plan 不产出 `docs/bugs/` 卡片）。

Exit Criteria:

- [x] design-toolbox.md §4.2/§4.3/§5/§10 + design-property-panel.md 经 rg/读核对待无 drift（或有同步 commit）。
- [x] 先验修复回归抽查通过。
- [x] HCA-BL 喂入节存在（含 bug 候选清单 + `文件:行`，或明确「无复杂/跨层 bug 候选」+ 理由）。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 `docs/plans/00-plan-authoring-and-execution-guide.md` 的 `Plan Review Rule`。由独立子 agent（fresh session）反复 review 直到共识后填写。

- Reviewer / Agent: 独立子 agent fresh session `ses_0207895eaffeoRywdO7AmX34ma`
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed: 零 Blocker / 零 Major。1 Minor（Non-Goals 内联标注 `本批次 N=2/N=3 plan` 冗余）——已收紧为简洁引用。Live repo 全量复核通过：3 子目录 9 源文件行数精确（palette 58；inspector 85/148/142/51；toolbox 222/150/144/112，Σ=1,112）、7 测试文件行数精确（Σ~1,234）、owner-doc 路径存在（design-toolbox/design-property-panel）、plan 0900-1 #5/#6/#21 + 0900-2 #3 转交项描述准确、roadmap HCA7=planned/HCA8=todo、23-dim + dim 21 适用性匹配 deep-audit-prompts.md 与 roadmap §复杂交互层追加维度、与 HCA7/HCA9/HCA10/HCA11 无 scope 重叠。

## Closure Gates

> **关闭条件**：只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。全量 `pnpm typecheck/build/lint/test` 是 plan 收口时跑一次的仓库级检查（见 guide Minimum Rule 18）。

- [x] 3 子目录 9 源文件逐文件深审完成，审计记录文件存在且 finding 全 triage。
- [x] 所有 in-scope 确认的 P0/P1 live defect 已 test-first 修复（failing-first proof 存在）。（本 plan 零 P0/P1；P2-FE-1 已 test-first 修复 + failing-first proof）
- [x] plan 0900-1 #5 转交项已复核并裁定（维持 watch-only residual / 升级修复，证据入审计记录）。
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift。
- [x] 受影响 owner doc 与 live baseline 一致（或明确无 drift）。
- [x] 必要 focused verification 已完成。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。（独立子 agent `ses_02067b890ffe6MWtR9rRp5Br7X` verdict=pass，见 Closure 节证据）
- [x] `pnpm typecheck`（32/32 successful）
- [x] `pnpm build`（32/32 successful）
- [x] `pnpm lint`（32/32 successful）
- [x] `pnpm test`（industrial 97 files / 1311 tests passed；全仓 green）

## Deferred But Adjudicated

- **plan 0900-1 #5（align-distribute group-relative local 坐标限制）**：Classification = watch-only residual（M3 T1 文档化接受限制）。Phase 1 维度 21 复核裁定维持 residual：`align-distribute.ts:5-7` 文档化注释在位、`align-distribute.test.ts:159-185` group-relative convergence 单测覆盖且通过、无 P1-C2/C3 回归迹象。Why Not Blocking Closure：扁平算法对「同父兄弟」自洽（local 坐标系一致），仅「跨父容器混选」不对齐世界坐标（design-toolbox.md §12.1 T1 显式「接受」）；不构成 in-scope live defect。归 HCA-CR 复验项（M3 后跨 group 嵌套对齐若提需求再评估）。

## Non-Blocking Follow-ups

- 本层 P2 高成本项 / P3 归 HCA-CR 跨层集中修复（P3-FLD-1 注释/代码不符 / P3-FLD-2 number 清空写 0 / P3-FLD-3 Label htmlFor / P3-SCH-1 虚拟字段重复 latent / P3-PAL-1/INS-1/TB-1 onError 未 wiring / P3-PAL-2 id 查重 / P3-PAL-3/TB-2 a11y / P3-AD-1 浮点位移判定）。
- 本层 bug 候选 P2-FE-1 喂入 HCA-BL 正式归档（建议 `docs/bugs/NN-field-errors-nested-child-attribution.md`）。

## Closure

Status Note: 完成。3 子目录 9 源文件 23 维包级深审（align-distribute/z-order 追加维度 21）完成，零 P0/P1；P2-FE-1（嵌套子节点校验错误归因）test-first 修复（failing-first proof 2 测 + 旧假绿测试修正）；#5 复核维持 watch-only residual；owner doc §4.2/§4.3/§5/§10 + design-property-panel 无 drift；先验 #6/#21/HCA7 P3-1 回归抽查通过。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent fresh session `ses_02067b890ffe6MWtR9rRp5Br7X`（general subagent，不复用执行 session 上下文）
- Evidence: verdict=`pass`。逐项复核：(1) plan 全 Phase items + Exit Criteria + Status=completed；(2) `field-errors.ts` findSymbolScopePath 递归 + `${scopePath}.` prefix live 正确，旧 findSymbolIndex 已移除；(3) failing-first 测试断言 `result.<field>` defined + `result['children[0]']` undefined（结果值非 not.toThrow）；(4) 审计记录 9 文件全覆盖 + finding 全 triage + #5 verdict + HCA-BL 节；(5) `pnpm --filter ...industrial test` 97 files/1311 tests green；(6) align-distribute.ts:6-7 文档化 + test:159-185 group-relative 覆盖；(7) `git diff --stat` 仅 field-errors.ts/.test.ts 改动，无 scope creep。零 blocking issue。

Follow-up:

- 本层 P3 归 HCA-CR 跨层集中修复（见 Non-Blocking Follow-ups 清单）。
- P2-FE-1 bug 候选喂入 HCA-BL 正式归档。
- 无遗留 plan-owned work。
