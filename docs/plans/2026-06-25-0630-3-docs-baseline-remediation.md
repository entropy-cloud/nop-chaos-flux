# Docs And Descriptive-Text Baseline Remediation

> Plan Status: completed
> Last Reviewed: 2026-06-25
> Source: `docs/audits/2026-06-24-2213-multi-audit-components.md` (C-25, C-20, C-26, C-27, C-21, C-12)
> Related: `docs/plans/2026-06-25-0630-1-renderer-correctness-and-contract-guard.md`

## Purpose

收口 components 审计中全部 P2/P3 文档与描述性文本漂移：让 `docs/components/` 导航基线、内容家族 `design.md` §2、架构/策略文档、以及 `flux-bundle/package.json` 描述与 live code 一致，消除“已 shipped 组件被列为尚未实现”这类高误导缺陷。

## Current Baseline

起草前已对 live code/docs 抽查核实：

- **C-25（P2）**：`docs/components/index.md:363` “已文档化且当前尚未实现的 retained renderer” 清单把 ~42 个已注册渲染器（alert/card/carousel/combo/editor/grid/list/markdown/html/...）列为未实现；`:301-345` 已注册清单遗漏 content/layout 家族及 list/pagination 等。每条均对照 live `*-renderer-definitions.ts` 注册数组核实为已 shipped。
- **C-20**：`docs/components/markdown/design.md:10` 与 `html/design.md:10` §2 称“当前尚未实现”，但两者已注册、有测试（`content-renderer-definitions.ts:164-189`）。
- **C-26**：`card/design.md:9,14-15`、`spinner`、`progress`、`empty`、`json-view`、`image`、`link` 七份 §2 仍用“当前尚未实现 / 目标 type / 预期归属”等过时语言。
- **C-27**：`docs/components/package-splitting-strategy.md:109-110,124,677` 称 `flux-renderers-content`/`flux-renderers-layout` “当前尚未创建”，但两包均有 `src/index.ts` + `package.json` + 注册数组。
- **C-21**：`docs/architecture/flux-runtime-module-boundaries.md:399` 称 crud 从 `/unstable` 导入 `createReadonlyScopeBinding`，但 live `crud-renderer.tsx:4-11` 从 `@nop-chaos/flux-react` root 导入（同文档 :467 自相矛盾）。
- **C-12**：`packages/flux-bundle/package.json:57` description 称 “full Flux renderer stack”，实际仅注册 basic/form/data（Plan 436 已裁定该 facade 决策，残留仅描述文本）。

## Goals

- 重建 `docs/components/index.md` 三张清单（已注册 / 已文档化但未实现 / schema 已声明未注册）使其完全来自 live `*-renderer-definitions.ts`（C-25）。
- 将 9 份内容家族 `design.md` §2 从“未实现/proposed”翻转为 shipped 现状（C-20 + C-26）。
- 修正 `package-splitting-strategy.md`、`flux-runtime-module-boundaries.md`、`flux-bundle/package.json` 描述文本与 live code 一致（C-27 / C-21 / C-12）。

## Non-Goals

- 不改动任何代码行为（纯文档/描述文本）。
- 不重写 `design.md` 的完整能力矩阵（仅翻转 §2 状态与事实性错误）。
- 不回写已 `completed` 的历史计划（Minimum Rule 21）。
- 不处理 renderer 代码缺陷（Plan 1）或 ui 代码缺陷（Plan 2）。

## Scope

### In Scope

- `docs/components/index.md`（C-25）。
- `docs/components/{markdown,html,card,spinner,progress,empty,json-view,image,link}/design.md` §2（C-20 + C-26）。
- `docs/components/package-splitting-strategy.md`（C-27）。
- `docs/architecture/flux-runtime-module-boundaries.md:399`（C-21）。
- `packages/flux-bundle/package.json:57` description（C-12）。

### Out Of Scope

- 任何代码行为变更。
- layout 家族 `design.md`（审计确认 layout 家族未漂移）。
- `docs/components/components-audit.md` 的历史 baseline 表（除非其与 index.md 修复直接冲突）。

## Test Strategy

档位选择：**不适用：理由**

本计划为纯文档/描述文本变更，无任何代码行为改动。验证方式为文档内容与 live code 一致性抽查 + `pnpm check:active-doc-code-anchors`（若命中）。按 Plan Guide，纯文档计划可从 Closure Gates 删除 `pnpm test/lint/typecheck/build`。

## Execution Plan

### Phase 1 - docs/components/index.md Registration Lists (C-25)

Status: completed
Targets: `docs/components/index.md:301-413`

- Item Types: `Fix`

- [x] 从 live `*-renderer-definitions.ts` 注册数组重建三张清单：把全部已注册类型移入“已注册”清单；删除“已文档化但未实现”清单中已 shipped 的 ~42 条；删除“schema 已声明但未注册”清单中已注册的领域 renderer。**逐条**核对清单中每一项（含 audio/video/cards/mapping/separator/input-file/input-image 等审计未逐条核验的项）与 live 注册数组，禁止批量搬运。
- [x] 核对 `docs/components/components-audit.md:300-304` 关于该清单“已修复”的过时声明，修正为当前事实。

Exit Criteria:

- [x] `docs/components/index.md:301-413` 三张清单每条与对应 live 注册数组逐条一致；不再有已 shipped 渲染器被列为未实现。
- [x] 主要验证为 doc-vs-live-code 逐条核对（注：`pnpm check:active-doc-code-anchors` 仅校验反引号路径在磁盘存在，**不**校验 prose 准确性；本计划缺陷多为“错误陈述”而非“路径缺失”，故 anchor gate 仅作顺带检查，不作为 prose 正确性的收口依据）。

### Phase 2 - Content-Family design.md §2 Status Flips (C-20, C-26)

Status: completed
Targets: `docs/components/{markdown,html,card,spinner,progress,empty,json-view,image,link}/design.md`

- Item Types: `Fix`

- [x] 将 9 份 `design.md` §2 “当前尚未实现 / 高优先级 / 目标 type / 预期归属” 改写为已 shipped 现状（描述实际实现基线，如 markdown 用 react-markdown + remark-gfm + DOMPurify）；`card/design.md` §3 `目标`→`实际`。
- [x] 对每份 doc 抽查其描述的依赖/行为与 live 代码一致。

Exit Criteria:

- [x] 9 份 §2 不再出现“尚未实现/proposed/目标态”语言，内容与 live 实现一致。

### Phase 3 - Architecture, Strategy, And Description Text Fixes (C-21, C-27, C-12)

Status: completed
Targets: `docs/architecture/flux-runtime-module-boundaries.md`、`docs/components/package-splitting-strategy.md`、`packages/flux-bundle/package.json`

- Item Types: `Fix`

- [x] `flux-runtime-module-boundaries.md:399` 改为“`@nop-chaos/flux-react` root”，并与 :467 内部一致化（C-21）。
- [x] `package-splitting-strategy.md:109-110,124,677` 将 `flux-renderers-content`/`flux-renderers-layout` 标为 live（或若该文纯为历史策略则移入 `docs/archive/` 并注明）（C-27）。
- [x] `packages/flux-bundle/package.json:57` description 改为 “Default Flux renderer stack (basic + form + data)”（C-12）。

Exit Criteria:

- [x] 三处描述文本与 live code 一致；`flux-runtime-module-boundaries.md:399` 与 :467 不再矛盾。

## Draft Review Record

- Reviewer / Agent: independent sub-agent `ses_1043a1c02ffeWoKi7exgckutjw` (fresh session)
- Verdict: pass-with-minors
- Rounds: 1
- Findings addressed:
  - [Minor] `active-doc-code-anchors` 仅校验路径存在、不校验 prose 准确性 → 已在 Phase 1 Exit 注明该 gate 仅作顺带检查，prose 正确性以 doc-vs-live-code 逐条核对为收口依据。
  - [Minor] 清单内 42 项不可批量搬运（含审计未逐条核验的 audio/video/cards 等）→ 已在执行项写明逐条核对要求。

## Closure Gates

> 纯文档计划：按 Plan Guide 删除 `pnpm test/lint/typecheck/build`。

- [x] `docs/components/index.md` 三张清单与 live 注册数组完全一致（C-25）。
- [x] 9 份内容家族 `design.md` §2 与 live 实现一致（C-20 + C-26）。
- [x] 架构/策略/描述文本三处与 live code 一致（C-21 + C-27 + C-12）。
- [x] `pnpm check:active-doc-code-anchors` 通过（若覆盖命中文件）。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。

## Deferred But Adjudicated

> 起草阶段无可裁定 deferred 项。

## Non-Blocking Follow-ups

- `docs/components/components-audit.md` 其余历史 baseline 表的全面核对（仅在本计划修复直接冲突项之外的部分）。

## Closure

Status Note: 已完成。三个 Phase 的全部 fix 项与 exit criteria 均已交付；Closure Gates 1-5 全部满足。纯文档/描述文本计划，无代码行为变更，故按 Plan Guide 不跑 `pnpm test/lint/typecheck/build`（仅 `pnpm check:active-doc-code-anchors` 通过）。

Closure Audit Evidence:

- Auditor / Agent: independent sub-agent `ses_1007bba12ffeaYZ1fnm3X9pPpO` (fresh session, 三段式输入：plan + diff summary + verification output)
- Verdict: **PASS**（all 5 closure gates substantively satisfied）
- Key evidence re-verified against live code by the auditor:
  - C-25：`index.md:311/315/307` content/layout/basic 三家族逐条与 `*-renderer-definitions.ts` `type:` 完全一致；"尚未注册" 清单确为 "当前无此项"，原 42 项已全部上移。
  - C-20 + C-26：9 份 `design.md` §2 均为 "已 shipped..."；grep `尚未实现|当前尚未|目标 type|预期归属|proposed|尚未创建` 无命中。
  - C-21：`flux-runtime-module-boundaries.md:399` 与 `:467` 一致，均称 `@nop-chaos/flux-react` root；`crud-renderer.tsx:5,11` 实证 root 导入。
  - C-27：`package-splitting-strategy.md:109-110/124/677` 标 content/layout 为 live；两包 `package.json` 存在。
  - C-12：`flux-bundle/package.json:57` 描述为 "Default Flux renderer stack (basic + form + data)"；`src/index.tsx:33-37` 仅注册 basic/form/data。
  - Gate 4：`pnpm check:active-doc-code-anchors` → "Verified code/doc anchors in 257 active docs"（auditor 自跑复核）。

Follow-up:

- no remaining plan-owned work（Non-Blocking Follow-ups 中的 components-audit.md 其余历史 baseline 表核对已记为非本计划职责）。
- 本计划为 audit-sourced（front matter 用 `> Source:` 而非 `> Source Audits:`），源审计文件 `docs/audits/2026-06-24-2213-multi-audit-components.md` 顶部 `> Audit Status:` 已为 `closed`，无 roadmap ❌/✅ 条目需翻转。
