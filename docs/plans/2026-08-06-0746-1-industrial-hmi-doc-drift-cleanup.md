# 01 Industrial HMI Design-Doc Drift Cleanup（post-I18 / post-module-move stale references）

> Plan Status: completed
> Mission: industrial-hmi
> Work Item: 2026-08-05-2129 post-remediation audit P2（doc-drift 子集）
> Last Reviewed: 2026-08-06
> Source: `docs/audits/2026-08-05-2129-multi-audit-industrial-hmi.md` `[P2-1]`/`[P2-2]`/`[P2-3]`（dim 16 documentation drift），登记于 `docs/components/roadmap-industrial-hmi.md` Follow-up Backlog「2026-08-05-2129 post-remediation audit P2」子节
> Related: `docs/plans/2026-08-05-2129-1-industrial-hmi-expression-unification.md`（I18 表达式一元化——P2-2/P2-3 漂移的根因）、`docs/plans/2026-08-05-2129-3-industrial-hmi-audit-p1-remediations.md`（同轮 P1 收口）

## Purpose

把 2026-08-05-2129 multi-audit 登记的 3 条**纯文档漂移** P2（dim 16）收口到「设计文档与 live 代码逐项一致」。

三条均由 **I18 表达式一元化**（弃用 `$xxx` / `@{pointId}`、删除 `binding/expression-evaluator.ts`、模块拆分为 `bind-resolver.ts` + `flux-eval.ts`）与历次模块迁移（`schemas.ts`/`renderer-definitions.ts` 上移至 `src/` 顶层、新增 `scada-errors.ts`/`serialization/equality.ts`/`use-scada-handles.ts`）造成——设计文档未同步回写。它们是**活跃 footgun**：未来维护者读 `design-engine.md §9` 会以为 `$xxx` 是合法 flux 语法；读 `design-renderer.md §11` 实现树会去错误的 `renderer/` 目录找 `schemas.ts`；读 `editor-initiation.md` 三态清单 row 8 会以为 `expression-evaluator` 模块与 `@{pointId}` 方言仍在。

本计划**纯文档**，零代码变更。

## Current Baseline

> 起草前已逐条核对 live repo（2026-08-06），下列事实均经文件路径实测确认。

- **multi P2-1 已确认 live**：`docs/components/industrial-hmi/design-renderer.md §11` 实现树（`:294-315`）将 `schemas.ts`（`:306`）/`renderer-definitions.ts`（`:307`）置于 `renderer/` 子目录，但 live 二者均位于 `src/` 顶层（`ls packages/flux-renderers-industrial/src/{schemas,renderer-definitions}.ts` 实证）。同树 `serialization/` 目录（`:299-303`）列 config-types/validate/parse/serialize/diff，**缺** `equality.ts`（live `src/serialization/equality.ts` 存在，plan `2026-08-05-0653-4` C2 新建）。`renderer/hooks/`（`:308-312`）列 use-scada-engine/config-sync/points-bridge/events，**缺** `use-scada-handles.ts`（live `src/renderer/hooks/use-scada-handles.ts` 存在）。`renderer/` 目录树**缺** `scada-errors.ts`（live `src/renderer/scada-errors.ts` 存在，plan `2026-08-04-1558-2` Phase 4 WD-6 新建，§10 错误码段落已引用但 §11 树未列入）。即 §11 树与 live 布局在 4 处偏离（2 错位 + 2 缺失 + 1 缺失目录条目）。
- **multi P2-2 已确认 live**：`docs/components/industrial-hmi/design-engine.md §9:270` 仍写「绑定表达式/flux `$xxx` 由数据层（I2.2）消费 flux-formula/flux-compiler 求值后写属性」。I18（plan `2026-08-05-2129-1`）已弃用 `$xxx` 简写（与平台保留 `$` 内置命名空间 `$Math`/`$JSON`/`$Date` 冲突，`flux-formula.md:196,205`），live 唯一语法为 `${expr}`；`$xxx` 走 `dollar-without-brace` Failure Path 求值 undefined。
- **multi P2-3 已确认 live**：`docs/components/industrial-hmi/editor-initiation.md:60` 三态清单 row 8（binding 域）仍写「`expression-evaluator（@{pointId} 子集）`」。I18 已删除 `binding/expression-evaluator.ts`（404 行自建 tokenizer/parser/evaluator），表达式求值改 `bind-resolver.ts` + `dirty-collector.ts` 的 `evaluateFlux`（经 flux compiler）；`@{pointId}` 方言已弃用（统一 `${expr}`）。该 row 与 `design-data-binding.md §11` post-I18 模块拆分不一致。
- **本轮无代码变更**：三条均为 `docs/components/industrial-hmi/*.md` 文档文本，不触及 `packages/flux-renderers-industrial/src/` 任何源码。

## Goals

- **§11 实现树对齐 live 布局**：`schemas.ts`/`renderer-definitions.ts` 移到 `src/` 顶层；`serialization/` 补 `equality.ts`；`renderer/hooks/` 补 `use-scada-handles.ts`；`renderer/` 补 `scada-errors.ts`。
- **§9 表达式语法对齐 I18**：`$xxx` 改 `${expr}`，并指向 `design-data-binding.md §4.2`（唯一语法契约）。
- **editor-initiation row 8 对齐 post-I18 模块拆分**：移除 `expression-evaluator` 与 `@{pointId}` 表述，改为 `bind-resolver.ts` + `dirty-collector.ts`（flux compiler 求值）+ `value-to-state.ts`，与 `design-data-binding.md §11` 一致。

## Non-Goals

- 不重写 §11 拆分依据段落（`:319`）或公共导出面段落（`:317`）——这两段经 plan `2026-08-04-1558-1` / `2026-08-05-1253-2` 已对齐 live，仅 §11 代码树块漂移。
- 不处理同轮 P2 的代码类条目（P2-4..P2-15、open P2-1..P2-10）——归 sibling plan `2026-08-06-0746-2`（test fidelity）/`2026-08-06-0746-3`（diagnostic residual）或后续 mission 节奏。
- 不回写已 `completed` 的 I18 plan 文本（plan guide Minimum Rule 21）。
- 不动 `design-data-binding.md §11` 本身（它已是 post-I18 正确基线，本 plan 仅让其他文档对齐它）。

## Scope

### In Scope

- `docs/components/industrial-hmi/design-renderer.md` §11 实现树代码块（`:294-315`）。
- `docs/components/industrial-hmi/design-engine.md` §9 表达式句（`:270`）。
- `docs/components/industrial-hmi/editor-initiation.md` 三态清单 row 8（`:60`）。

### Out Of Scope

- 其余 design-\*.md 章节、其余 editor-initiation.md 行、`design-data-binding.md`（已正确）。
- 任何 `packages/` 源码、测试、配置。

## Test Strategy

档位选择：`不适用：理由`

本档选择：**不适用**——纯文档计划，无代码/行为变更（plan guide「纯文档计划」条款）。Closure Gates 移除 `pnpm test`/`lint`/`typecheck`/`build`（见下）。

## Execution Plan

### Phase 1 - 三条文档漂移同步回写

Status: completed
Targets: `docs/components/industrial-hmi/design-renderer.md`（§11）、`design-engine.md`（§9:270）、`editor-initiation.md`（:60）

- Item Types: `Fix`

- [x] **P2-1（§11 实现树）**：重写 `design-renderer.md §11` 代码树块以对齐 live 布局——`schemas.ts` / `renderer-definitions.ts` 从 `renderer/` 上移到 `src/` 顶层（与 `index.ts` 同级）；`serialization/` 目录补 `equality.ts`（标注 plan `2026-08-05-0653-4` C2 / W5 共享 deepEqual）；`renderer/hooks/` 补 `use-scada-handles.ts`（component:\* 句柄注册，I10.2/I11.1）；`renderer/` 补 `scada-errors.ts`（SCADA_ERROR_CODES 注册表 + i18n 映射，plan `2026-08-04-1558-2` Phase 4）。保留树块顶/尾注释与拆分依据段落不变。
- [x] **P2-2（§9 $xxx）**：`design-engine.md §9:270` 把「绑定表达式/flux `$xxx`」改为「绑定表达式 `${expr}`」（唯一语法，I18 一元化），并补「详见 `design-data-binding.md §4.2`」指向。
- [x] **P2-3（editor-initiation row 8）**：`editor-initiation.md:60` 三态清单 row 8 的 binding 域模块清单改为对齐 `design-data-binding.md §11`（`:340-346`）post-I18 拆分——移除 `expression-evaluator（@{pointId} 子集）`，改为 `point-store.ts`、`bind-resolver.ts`（属性绑定解析 + ${expr} 经注入 flux compiler 求值）、`flux-eval.ts`（isScadaPrimitive + createPrivateEvalScope，I18 提取）、`reverse-index.ts`、`dirty-collector.ts`（合帧单次 applyAttrs + generation 失效）、`value-to-state.ts`、`animator.ts`；保留该 row「编辑器属性面板只写声明结构、运行时零改动」结论不变。

Exit Criteria:

> 纯文档 Phase；只写本 Phase 真正交付的可观测结果（文档与 live 代码一致性），不写全量验证（plan guide Minimum Rule 18 + 纯文档计划条款）。

- [x] `design-renderer.md §11` 代码树块列出的文件路径经 `ls packages/flux-renderers-industrial/src/...` 逐项存在（schemas.ts/renderer-definitions.ts 在 src/ 顶层；equality.ts 在 serialization/；use-scada-handles.ts 在 renderer/hooks/；scada-errors.ts 在 renderer/），且不再把 schemas.ts/renderer-definitions.ts 标在 renderer/ 下。
- [x] `design-engine.md §9:270` 不再含字面 `$xxx`，改为 `${expr}` 并指向 `design-data-binding.md §4.2`。
- [x] `editor-initiation.md:60` row 8 不再含 `expression-evaluator` 或 `@{pointId}`，模块清单与 `design-data-binding.md §11`（`:340-346`，含 `flux-eval.ts`）逐项一致。
- [x] 本 plan 编辑的 3 处契约正文零漂移：`design-engine.md §9` 不含字面 `$xxx`；`design-renderer.md §11` 树与 `editor-initiation.md:60` row 8 不含 `expression-evaluator`/`@{pointId}`。注：`design-data-binding.md` 作为 post-I18 正确基线**合法保留** `$xxx`/`@{pointId}` 弃用通告语境（非漂移），本判据不扫该文件的弃用通告段。

## Draft Review Record

> 起草后、执行前的独立审查证据（plan guide `Plan Review Rule`）。由独立子 agent（fresh session）填写。

- Reviewer / Agent: independent fresh-session sub-agents（R1 `ses_02ba9622effeAPS0RMHDzWEOEA`、R2 `ses_02ba18b04ffebTfJ8DoqEhV5Dh`、R3 `ses_02b9e48f7ffe0WO6zI1LHSYSGz`）
- Verdict: `pass`（R3 共识轮零 Blocker / 零 Major）
- Rounds: 3（R1 pass-with-minors → 2 minor 落地：rg 判据收窄避免 `design-data-binding.md` 弃用通告误判、row 8 补 `flux-eval.ts`；R2 确认 minor 落地；R3 共识确认零新增）
- Findings addressed: R1 m-1 Exit/Closure rg 判据收窄到 3 处编辑面 + 显式排除弃用通告段；R1 m-2 P2-3 row 8 模块清单补 `flux-eval.ts`（对齐 `design-data-binding.md §11:342`）。参考准确性 3 条漂移均经 live 核对（schemas/renderer-definitions 顶层、equality/use-scada-handles/scada-errors 缺失、$xxx/expression-evaluator/@{pointId}）。

## Closure Gates

> 纯文档计划：按 plan guide「纯文档计划」条款，`pnpm test`/`lint`/`typecheck`/`build` 不适用，已移除。

- [x] 三条文档漂移（P2-1/P2-2/P2-3）均已回写，§11 树/§9 句/row 8 与 live 代码逐项一致。
- [x] 本 plan 编辑的 3 处契约正文零漂移：`design-engine.md §9`（无 `$xxx`）、`design-renderer.md §11` + `editor-initiation.md:60` row 8（无 `expression-evaluator`/`@{pointId}`，row 8 含 `flux-eval.ts`）；`design-data-binding.md` 弃用通告段不计为漂移。
- [x] 受影响 owner doc 一致性：`design-renderer.md §11` 与 `design-data-binding.md §11`（post-I18 模块拆分基线）模块清单无矛盾。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。

## Non-Blocking Follow-ups

- 其余 2026-08-05-2129 P2（multi P2-4..P2-15、open P2-1..P2-10）归 sibling plan 或后续 mission 节奏，不在本 plan。

## Closure

Status Note: 纯文档漂移收口完成（P2-1/P2-2/P2-3 三条均落地）；3 处编辑面经独立 fresh-session closure audit 逐项复核与 live 代码一致，零代码变更，Test Strategy 档位「不适用」对应 build/test/lint/typecheck gate 按 plan guide「纯文档计划」条款豁免。

Closure Audit Evidence:

- Auditor / Agent: independent fresh-session sub-agent（closure audit）
- Evidence: 独立 fresh session 复核（不引用执行 session 自述），逐条 live 核对结果如下：
  - **P2-1（§11 实现树）**：读 `design-renderer.md:294-318` 实现树块，逐项对照 live `ls packages/flux-renderers-industrial/src/`：
    - `src/schemas.ts` 顶层存在 ✓；`src/renderer-definitions.ts` 顶层存在 ✓（二者均不在 `renderer/` 列出，与基线对齐）
    - `src/serialization/equality.ts` 存在 ✓（与树块 `:304` 一致）
    - `src/renderer/scada-errors.ts` 存在 ✓（与树块 `:307` 一致）
    - `src/renderer/hooks/use-scada-handles.ts` 存在 ✓（与树块 `:313` 一致）
    - 树块顶/尾注释（`:296-298` engine/binding/symbols 域分隔 + `:314` 测试句柄归属注）与拆分依据段（`:320`）未变 ✓
  - **P2-2（§9:270 $xxx）**：`rg '\$xxx' docs/components/industrial-hmi/design-engine.md` → rc=1（无）✓；§9:270 已改为 `${expr}` 并指向 `design-data-binding.md §4.2`；读 §4.2（`design-data-binding.md:108`）确认其正文「仅认 `${expr}` 语法」为唯一语法契约，`$xxx`/`@{pointId}` 仅作弃用通告出现（非漂移）✓
  - **P2-3（row 8）**：`rg 'expression-evaluator|@\{pointId\}' docs/components/industrial-hmi/design-renderer.md docs/components/industrial-hmi/editor-initiation.md` → rc=1（无）✓；`rg 'flux-eval' docs/components/industrial-hmi/editor-initiation.md` → row 8 命中 ✓；读 `design-data-binding.md §11:340-346` 模块清单（point-store/bind-resolver/flux-eval/reverse-index/dirty-collector/value-to-state/animator）与 `editor-initiation.md:60` row 8 逐项一致 ✓；`ls packages/flux-renderers-industrial/src/binding/` 确认 `expression-evaluator.ts` 不存在 ✓
  - **docs-only**：`git diff --stat` 显示仅 3 个 .md 文件变更（design-engine.md 1 行、design-renderer.md 11 行、editor-initiation.md 1 行），`git status` 无 `packages/` 内任何源码/测试/配置改动 ✓
  - **gate 豁免**：纯文档计划，`pnpm test`/`lint`/`typecheck`/`build` 按 plan guide「纯文档计划」条款不适用，未运行亦不计为失败 ✓
  - 复核命令：`ls packages/flux-renderers-industrial/src/{,renderer/,renderer/hooks/,serialization/,binding/}`、`rg '\$xxx' design-engine.md`、`rg 'expression-evaluator|@\{pointId\}' design-renderer.md editor-initiation.md`、`rg 'flux-eval' editor-initiation.md`、`git diff --stat`、`git status`

Follow-up:

- no remaining plan-owned work（其余 2026-08-05-2129 P2 见 plan §Non-Blocking Follow-ups，归 sibling plan / 后续 mission 节奏）
