# 655 审计修复 R2·MA1.2：runtime 簇结构契约审计（依赖 / 边界 / 导出面）

> Plan Status: completed
> Last Reviewed: 2026-10-19
> Source: `docs/backlog/audit-remediation-r2-roadmap.md` MA1.2；`missions/audit-remediation-r2.json`；方法论 `docs/skills/deep-audit-prompts.md`（§A 架构与模块边界 + 通用审计口径 + 附录 A 输出格式）+ `docs/skills/architecture-deepening-review-prompt.md`
> Related: `docs/audits/arm2-scope-and-dimension-matrix.md` MA1 节、`docs/audits/arm2-index.md`、MA1.1 plan 654 与报告（方法先例，不预载其结论）、owner doc `docs/architecture/flux-runtime-module-boundaries.md`

## Purpose

对 C2 runtime 簇（flux-runtime / flux-react / flux-bundle=facade `@nop-chaos/flux`）执行结构与契约层审计：依赖方向、模块边界（Main Rule + Package Entry Boundaries）、公共导出面稳定性，产出 arm2 审计报告并登记 arm2-index。零代码变更（P0 即时通道除外）。

## Current Baseline（2026-10-19 live 实测，HEAD `fa768d9c4`，干净树）

- **簇构成与规模**（roadmap 包簇表口径）：flux-runtime 89 src/153 test、flux-react 65/76、flux-bundle 3/3，合计 157/232。
- **依赖方向**：flux-runtime deps = {flux-core, flux-formula, flux-compiler, flux-action-core, flux-i18n} + peer zustand；flux-react deps = {flux-core, flux-formula, flux-i18n, flux-runtime, ui} + peer {react, lucide-react}；flux-bundle = **facade `@nop-chaos/flux`**，deps = `{}`（零运行时依赖）+ peers（ui/react/react-dom/react-i18next/i18next/lucide-react/zustand/echarts/recharts）——符合 owner doc「packed manifest 不得把内部包列为 host 安装要求」。
- **反向边**：`packages/flux-runtime/src` 对 `@nop-chaos/flux-react` 引用 **0 条**（react→runtime 单向，24 文件）；flux-bundle→flux-react 属 facade 合成（owner doc 授权形态）。
- **`audit:deps` 现状（2026-10-19 实测）**：exit 57、全 no-circular；**C2 命中 0 条**（57 条全在其他簇/apps——与 M0 基线 57 一致）。
- **跨包 deep import**：`from '@nop-chaos/flux-{runtime,react}/<path>'` 全仓 12 条，**全部为已声明 subpath** `@nop-chaos/flux-react/test-support`（package.json `exports` 显式声明 `./test-support`、`./unstable`、`./default-spacing.css`）——无未声明深层路径穿透。`flux-react` 对 `flux-runtime` 的引用全部经包根。
- **入口面快照**：flux-runtime `src/index.ts` **41 行**具名导出（Main Rule 要求 thin entry）；flux-react `src/index.tsx` 172 行稳定桶 + `unstable.ts` 18 行；flux-bundle `src/index.tsx` 104 行。`runtime-factory.ts` = **670 行**，全文件单一导出 `createRendererRuntime`（Main Rule 合规抽验对象，见 Phase 1）。
- **定义字段参与面（draft review R1 M1 修正口径）**：定义字段**主干**归 flux-core（`types/renderer-definition-types.ts`，MA1.1 已审）；C2 的实际参与面 = ① `flux-react/src/react-contracts.ts:16-21` 的 `RendererDefinition extends CoreRendererDefinition { reactComponent?: ... }` 可选扩展（经 root index.tsx:28 导出，`auto-renderer.tsx:130` 消费）；② flux-bundle（`@nop-chaos/flux`）的默认注册面（owner doc `## Bundle Default Registration Face`）——两者纳入 Phase 1 抽验，其余部分 n/a 附理由。
- **marker 发射面（draft review R1 M2 修正口径）**：C2 是 marker 协议**实际发射方**（`field-frame.tsx:259` `nop-field`、`node-error-boundary.tsx:60,160` `nop-node-error`/`nop-schema-root-fallback`、`workbench-shell.tsx:227` `nop-workbench`、`dialog-host` `nop-dialog`/`nop-drawer`、`auto-renderer.tsx` `stampRenderedRoot` 盖 `data-renderer`、`flux-bundle/src/index.tsx:41` `nop-flux-root`）；`check:audit-missing-renderer-markers` 规则 include 仅 `packages/flux-renderers-*/src/*.tsx`（`scripts/audit/rules.mjs:491-497`）——**扫描器层对 C2 n/a**（理由=规则范围，非"不发射"），C2 发射面在 Phase 1 以人工抽样核对覆盖。
- **Package Entry Boundaries 抽验（已完成三项）**：① `unstable.ts` 与稳定桶**不相交**（文件头注释引 AUDIT-05 / Plan 2026-06-27-0850-1）——`createHelpers`/`mergeActionContext`/`EMPTY_SCOPE_DATA`/`rendererHooks`/`RenderInstancePathContext`/`StructuralLoopContext`/`useRequiredContext`/`publishOwnerStatus`/`executeApiObject`/`createProjectedScopeStore` 均不在 root；② 声称已稳定的 `RenderNodes`/`createReadonlyScopeBinding`/`useSyncExternalStoreWithSelector` 在 root ✅；③ facade manifest deps={} ✅。
- **knip C2 现状（本轮实跑，exit 1）**：67 行命中 = unused exports 段 30 + unused exported types 段 32 + `flux-bundle/package.json` devDeps 段 4（`@nop-chaos/ui`/`i18next`/`react-i18next`/`zustand`）+ 其他 1；待抽样裁定（含 `flux-runtime/src/validation/index.ts` barrel 部分 re-export 零消费候选——注意该 barrel **确有**消费方 `createValidationError`/`createBuiltInValidationRegistry`/`normalizeRuntimeValidationErrors` 等 5 处，仅部分名字零消费）。
- **相关扫描器 M0 基线**（只核对不高于）：`check:audit-runtime-raw-schema-reads` 0、`check:audit-fieldframe-bypasses` 0、`check:audit-event-dispatch-ctx` 0、`check:audit-hardcoded-type-dispatch` 0、`check:audit-missing-renderer-markers` 0（C2 为基础设施簇，renderer marker 维度 n/a，报告须显式记理由）、`check:workspace-manifest-deps` 绿。
- **owner doc 规则锚点**：Main Rule（runtime-factory = assembly，非平凡逻辑应外移）、Architecture Guardrails（bug-derived 强制边界——本项以结构口径对照，行为深审计归 MA2）、Package Entry Boundaries（稳定/unstable/facade 三面纪律）、Current Runtime Ownership 各节（文件职责清单）。
- **执行状态**：roadmap MA1.2 当前 `todo`（依赖 M0 已 `done`）；`docs/audits/` 无 `arm2-MA1.2-*` 报告。

## Goals

- 产出 `docs/audits/YYYY-MM-DD-HHmm-arm2-MA1.2-runtime-structure.md`：双风格（multi + open），P0/P1/P2/P3 分级（P1 落 arm2-index，P2/P3 留报告 deferred 区）。
- 覆盖面（matrix MA1.2 取证要点 + MA1 共享方法）：① 依赖图与跨包引用（含反向边 0 复核与 facade 合成授权核验）；② 模块边界合规（Main Rule 对 `runtime-factory.ts` 670 行抽验 + Package Entry Boundaries 三面纪律全量核对 + Current Runtime Ownership 抽样对照 live 文件）；③ 公共导出面稳定性（3 入口逐包核对 + unstable 不相交断言 + knip C2 抽样裁定 + churn 审查）；④ 定义字段参与面与 marker 发射面（定义字段主干归 flux-core——MA1.1 范围；C2 参与面 = `reactComponent` 扩展 + bundle 注册面，抽验；`check:renderer-definition-fields-only` 复扫覆盖含 C2 的全仓规则；C2 marker 发射面人工抽样核对，missing-markers 扫描器对 C2 按规则范围 n/a 附理由）；⑤ 架构深化机会（systemic 记录不落地）。
- 产出即登记 `docs/audits/arm2-index.md`（MA1.2 行 + P1 行如有，ID `P1-MA1.2-<nnn>`）。
- BUILD_VERIFY：全量 `pnpm test`（Cross-Cutting 9，在 Closure Gates）。

## Non-Goals

- 零代码变更；扫描器/knip 命中的修复归 MR 批量（只定级登记）。
- 不排 MR/R\*.n 行；不改写 r1/FM 历史文档；不预载 MA1.1 结论（报告可作检测启发，命中须本轮重新取证）。
- MA2 行为维度（StrictMode 生命周期、裸 schema 读取、FieldFrame、错误传播）不在本项——发现此类线索记交叉引用给 MA2.x，不定级为本项 P1。
- 不执行 MA1.3 及以后工作项。

## Scope（必填节）

### In Scope

- `docs/audits/` 新建 1 份 arm2-MA1.2 报告 + `docs/audits/arm2-index.md` 登记回填。
- 只读取证：`audit:deps`、`audit:knip`、`check:audit-runtime-raw-schema-reads`/`fieldframe-bypasses`/`event-dispatch-ctx`/`hardcoded-type-dispatch`/`audit-missing-renderer-markers`/`workspace-manifest-deps`、3 个 package.json 与 exports map、3 个入口文件、`runtime-factory.ts` 结构抽验、git churn、deep-import 复扫。
- `docs/logs/2026/{month}-{day}.md` 追加 MA1.2 条目；roadmap MA1.2 行状态流转（draft review→`planned`；closure audit→`done`）。
- 收口提交：`fix(audit-r2):` 格式（共享 log hunk 级 staging）。

### Out Of Scope

- 任何代码/测试/配置变更（P0 即时通道除外，见 Failure Paths）。
- knip/扫描器命中的修复（定级入报告，修复归 MR1.0）。
- MA1.3+ / MR / MV / MG 的执行或立项。
- 并发线未提交变更的处置（出现即排除出提交范围并记录）。

## Failure Paths

| 可测场景编号   | 触发                                                                                                                                                                                                                                                     | 行为                                                                                                 | 是否可重试 | 用户可见表现   |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------- | -------------- |
| audit-p0-found | 发现 P0——按 roadmap Rule 2 实例化：公共导出面破坏性变更未通知（如 facade 稳定入口移除/改名）、facade manifest 泄漏内部包为宿主安装依赖（使「宿主以 `@nop-chaos/flux` 单依赖完成渲染」的核心路径不可用，对应 Rule 2「功能核心操作无法完成」）、运行时崩溃 | P0 即时通道：plan 内追加 Fix Phase（判别测试先红后绿）或异步注入独立修复 plan，登记 arm2-index P0 区 | 否         | 无（修复先行） |
| scanner-drift  | 核对扫描器输出高于 arm2-index M0 基线                                                                                                                                                                                                                    | 停止收口，查明归因（应零变更），报告记录                                                             | 是         | 无             |

预期均不触发；预声明仅为通道完整性。

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**不适用**——纯审计取证 plan，零行为变更；全量 `pnpm test`（BUILD_VERIFY）为 Proof 交付物，在 Closure Gates 执行登记。若触发 P0 追加 Fix Phase，该 Fix 自动升档 `必须自动化`（Cross-Cutting 11）。

## Execution Plan

### Phase 1 - multi 维度清单取证（依赖 / 边界 / 导出面）

Status: completed
Targets: 报告草稿、`_tmp/`（取证输出）

- Item Types: `Proof | Decision`

- [x] 依赖图：复跑 `pnpm audit:deps` 确认 C2 命中 0（=M0 基线）；依赖方向 vs package.json 逐包对照（含 runtime→react 反向边 0 复扫、bundle facade 合成授权对照 owner doc Package Entry Boundaries）
- [x] 模块边界：deep-import 复扫（12 条全为已声明 subpath 的基线复核，出现新形态即 finding）；`check:workspace-manifest-deps`；**Main Rule 抽验**——`runtime-factory.ts` 670 行分段审读，判定 assembly vs 内嵌业务逻辑（发现非平凡逻辑定位到具体行段，记 local/family 归族与 P 级）；Current Runtime Ownership 抽样 3 节（Compiler boundary / Action adapter / Scope and state plumbing 指名的文件）对照 live 文件存在性与职责吻合
- [x] 导出面稳定性：3 入口逐包核对（runtime thin entry 41 行 / react 稳定桶 172 行 + unstable 18 行不相交全量符号 diff / bundle facade 104 行）；30 天 churn（`git log` 3 入口 + runtime-factory）是否 plan/roadmap 可追溯；knip C2 67 行命中分段抽样裁定（exports/types/devDeps 段各抽 ≥3，`validation/index.ts` barrel 部分零消费专项核验）
- [x] 定义字段参与面与 marker 发射面：`check:renderer-definition-fields-only` 复扫（全仓规则、含 C2，M0 基线 PASS）；`reactComponent` 扩展核验（react-contracts.ts 定义 / root 导出 / auto-renderer 消费链，扩展字段 vs core 主干字段的契约一致性抽验）+ bundle 默认注册面核验（owner doc `## Bundle Default Registration Face` 节对照 live）；`check:audit-missing-renderer-markers` 复跑（对 C2 按扫描器规则范围 n/a，报告写明 include 仅 flux-renderers-\* 的理由）+ **C2 发射面人工抽样**（nop-field / data-renderer 盖章 / nop-flux-root / nop-node-error 与 `docs/architecture/renderer-markers-and-selectors.md` Layer 1 口径对照，发现漂移按 P 级定级）；`check:audit-runtime-raw-schema-reads` 等 4 个 0 基线扫描器复跑（边界行为信号，供 MA2 交叉引用）
- [x] 架构深化机会：发现即记 systemic 候选（落地前人工确认）

Exit Criteria:

- [x] 四个取证维度各产出带证据条目（n/a 必须写理由）；每个命中/疑点均有 归族 + P 级判定（P0 触发 Failure Path）
- [x] Main Rule 抽验有明确结论（合规 / 违规行段定位 + P 级）

### Phase 2 - open 开放式追问（live 信号驱动）

Status: completed
Targets: 报告 open 段落

- Item Types: `Proof | Decision`

- [x] live 信号探针：C2 30 天 git log 热点、knip 命中全量分段、`docs/skills/README.md` 已知失败模式 #2（'use no memo' 文件——flux-react 内该类文件的导出面变动风险）/#3（index.ts 受保护）/#9（doc 契约漂移）在 C2 落地抽查、MA1.1 报告"高频问题文件"交叉引用点（`flux-react/src/node-renderer-resolved.tsx` 谓词分叉）本轮重新取证
- [x] ≥2 轮开放式追问，每轮 live 证据或显式"未命中"；候选方向：unstable 不相交断言是否被 test-support subpath 绕开、facade 零依赖是否被 `use-sync-external-store-shim` 别名机制破坏、670 行 factory 是否藏着可外移的状态机、validation barrel 部分死 re-export 是否暗示废弃面
- [x] 深化机会与 MA2 交叉线索分栏记录（结构 finding 定级 / 行为线索移交）

Exit Criteria:

- [x] open 段 ≥2 轮且每轮有证据；发现全部完成归族 + P 级判定

### Phase 3 - 报告落盘、arm2-index 登记与 BUILD_VERIFY

Status: completed
Targets: `docs/audits/YYYY-MM-DD-HHmm-arm2-MA1.2-runtime-structure.md`、`docs/audits/arm2-index.md`、`docs/logs/`

- Item Types: `Proof | Decision`

- [x] 报告按附录 A 格式落盘（范围/深挖统计/P0/P1/P2/P3/误报排除/深化候选/open 两轮/交叉引用），文件名含时间戳
- [x] arm2-index：MA1.2 行回填报告路径；P1（如有）入索引区（ID `P1-MA1.2-<nnn>`，状态 `open`）
- [x] daily log 追加 MA1.2 条目（路径 + 发现计数 + 门禁）
- [x] 执行 Closure Gates 预声明的 BUILD_VERIFY（全量 `pnpm test`，Cross-Cutting 9）并对照 M0 基线登记

Exit Criteria:

- [x] 报告存在且 arm2-index 与报告逐条一致
- [x] BUILD_VERIFY（`pnpm test`，即 Closure Gates 预声明门禁）exit 0（结果记录入报告/log）

### Phase 4 - 收口与状态流转

Status: completed
Targets: roadmap、本 plan、git

- Item Types: `Proof | Follow-up`

- [x] draft review 通过后：roadmap MA1.2 `todo`→`planned`，本 plan `draft`→`active`
- [x] closure audit（独立 fresh-session 子代理）通过后：roadmap MA1.2 `planned`→`done`，本 plan→`completed`
- [x] 单次提交入库（本 plan + 报告 + arm2-index + log + roadmap 流转），`fix(audit-r2):` 格式；标题不声称 `full-green verification`（e2e 不在本 plan 门禁范围）

Exit Criteria:

- [x] roadmap MA1.2 与 plan 状态流转一致
- [x] `git status` 复核提交仅含 In Scope 文件

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立 fresh-session 子代理填写。

- Reviewer / Agent: 独立 fresh-session 子代理 #1（R1，40 turns，26 组声称对账）+ 独立 fresh-session 子代理 #2（R2 复审，11 turns，修复核验 + live 抽验 + 无误伤抽查）
- Verdict: R1 `revised`（0 Blocker + 2 Major + 3 Minor）→ 五处修法全部落实；R2 `pass`（0 Blocker + 0 Major + 0 新 Minor，修复核验表 M1/M2/m1/m2/m3 全 ✅，R1 已判 ✅ 声称抽查未被误伤）→ 升级 `active`
- Rounds: 2
- Findings addressed: M1「C2 不拥有定义字段」改写为「主干归 core + C2 参与面 = reactComponent 扩展 + bundle 注册面，纳入抽验」；M2「非 marker 发射方」改写为「C2 为实际发射方，扫描器 n/a 理由=规则 include 范围，发射面人工抽样核对」；m1 P0 触发词映射 Rule 2 条款；m2 补 `check:renderer-definition-fields-only` 入 Phase 1 复扫；m3 Phase 3 措辞改「执行 Closure Gates 预声明的 BUILD_VERIFY」消除双挂

## Closure Gates

> 全量验证归此处（Rule 18）；BUILD_VERIFY 按 Cross-Cutting 9 预声明。

- [x] arm2 报告落盘且 Phase 1–3 Exit Criteria 全部满足（n/a 显式理由、双风格两段齐备）
- [x] arm2-index 登记（MA1.2 行 + P1 行如适用）与报告逐条一致
- [x] BUILD_VERIFY 全量 `pnpm test` 通过并登记
- [x] 执行期间核对扫描器输出不高于 arm2-index M0 基线
- [x] 不存在被静默降级的 in-scope 项（P2/P3 只入报告 deferred 区附定级理由）
- [x] roadmap Work Item Status MA1.2 行已流转 `done`（closure audit 通过后）
- [x] 由独立子代理（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（R1 verdict `issues` 2m+1 收口动作 → F1/F2/F3 回修 → 终局 `approved` 3 行复核全过、零新 finding）
- [x] `pnpm typecheck`（既有登记红 playground vite.config 口径——零新增即通过）
- [x] `pnpm build`（同上）
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

（无——本 plan 无 deferred 预期；执行中若出现改判，当场落本节。）

## Non-Blocking Follow-ups

- no remaining plan-owned work（P1-MA1.2-001 与 P3×2 按 Non-Goals 属 MR 批量修复面，已在 arm2-index/报告 Deferred 区排账）

## Closure

Status Note: MA1.2 全部 Phase 交付完成——报告双风格（multi 四维度 + open 两轮）落盘、arm2-index 登记（MA1.2 行 + P1-MA1.2-001）、daily log、BUILD_VERIFY 与四门禁实测、零代码变更纪律经审计核验；closure audit 首轮 `issues`（2 报告事实 Minor + 1 收口前向引用）→ 三处纯文档回修 → 终局 `approved`（复核 3 行全过、零新 finding）。roadmap MA1.2 已流转 `done`。P0=0、P1=1（进 MR 排账）、P3×2（报告 Deferred 区）、systemic 候选 3 条只记录不落地。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh-session closure auditor（子代理，37 turns 两轮：R1 8 任务逐项直接观测 → verdict issues〔F1 计数 6→9、F2 假证据句、F3 dangling 引用〕→ 执行者回修 → R2 仅复核 3 行 + 无新问题核查 → 终局 verdict `approved`）
- Evidence: R1 8 任务表（P1-001 注册面 9 族 vs 文档 7 族逐行开档、knip 67 分段逐项相等、门禁抽复跑 3 扫描器 exit 0、git status 恰 5 条零越界、deferred/roadmap 记账全过）；R2 三行复核全 ✅ 且新增声称 `check:flux-bundle-pack` 经 `check-flux-bundle-pack.mjs:144-179` 核验属实；无新 finding

Follow-up:

- no remaining plan-owned work
