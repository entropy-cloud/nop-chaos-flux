# 756 PH-3 owner-doc 语义一致性门禁（`check:owner-doc-semantics`）

> Plan Status: completed
> Last Reviewed: 2026-10-26
> Source: `docs/backlog/platform-hardening-roadmap.md` PH-3（A 组；MA8.3 + MG successor）；种子 `docs/audits/2026-10-19-1002-arm2-MA1.1-core-structure.md` P1-MA1.1-001（Where-To-Add 指向文件与符号归属 drift）、`docs/audits/2026-10-19-1052-arm2-MA1.2-runtime-structure.md` P1-MA1.2-001（注册族清单 7→9 未回写）
> Related: plan `754`（`check:wiring-coverage` 会强制本门禁接线）；`scripts/check-active-doc-code-anchors.mjs`（路径存在性门禁，本门禁是其语义层 successor）

## Purpose

把 owner doc 与 live 代码的**语义**一致性变成机械门禁。现有 `check:active-doc-code-anchors` 只校验反引号路径存在；两条 arm2 P1 都是"路径存在但内容/归属说错"。本 plan 落两类可判定断言，并以 manifest 驱动、可逐步扩面。

## Current Baseline

全部为 2026-10-26 live 实测（HEAD `e56ed6feb`）：

- `scripts/check-active-doc-code-anchors.mjs` 的 `repoPathPattern` 仅做 `access()`；无任何脚本比对文档声称的符号/集合与代码。
- 两条种子 drift 已由 arm2 MR 修复：`docs/architecture/flux-runtime-module-boundaries.md` §Bundle Default Registration Face 现写 "**9 renderer families**" 并点名 `registerSchedulingRenderers`/`registerThreeRenderers`/`registerXlangDebugEditorRenderers`（其余 6 族以 kebab 词 basic/form/form-advanced/data/content/layout 出现）；§Where To Add A New Validation Rule 第 1 步已指向 `packages/flux-compiler/src/validation-lowering.ts` 并点名 `collectSchemaValidationRules`/`normalizeValidationTriggers`/`normalizeValidationVisibilityTriggers`/`CompiledValidationRule`。live `packages/flux-bundle/src/index.tsx:43-56` `registerDefaultFluxRenderers` 调用 9 个 `register*Renderers`。
- 原型实测（本 plan 起草时，`_tmp` 内临时脚本，未入库）：
  - **identifier-set**：`registerDefaultFluxRenderers` 体内 `register[A-Z]\w*(` 调用集 9 项；文档节对每项"原名或 kebab 族名"全部命中；bold `**9 renderer families**` 与 live 9 相等。
  - **symbol-anchor**（条目粒度 = 列表项 + 其缩进续行；路径须带扩展名）：全文 32 个条目 / 约 58–59 次核对（计数随去重口径 ±1，审阅者独立复现 58）/ **3 个不一致**——①`packages/flux-action-core/src/action-dispatcher.ts` 不含 `ActionRuntimeAdapter`：该文件是 1 行 facade（`export … from './action-dispatcher/index.js'`），符号出现于 `action-dispatcher/types.ts`（作为从 `@nop-chaos/flux-core` 导入的类型引用；定义在 `packages/flux-core/src/types/actions.ts`）——facade 形态须并入本地再导出目标；②`extractLegacyPayload`：条目原文 "has been deleted"——否定陈述；③`form-runtime-owner-validation-utils.ts` 与 `FormRuntimeOwner`：条目说 "shared by `FormRuntimeOwner`"——符号是消费者称谓而非文件内容。
  - 行粒度（单行）只覆盖 4 条目/7 核对，覆盖过薄；段落粒度把整个编号列表并作一段，产生 34 个误配——故选条目粒度。
- 新增 `check:*` 若不接线会被 `check:wiring-coverage`（plan 754）判红；接线数以该门禁 live 输出为准。

## Goals

- 新门禁 `check:owner-doc-semantics` 入 `pnpm check`，以 `scripts/baselines/owner-doc-semantics.json` manifest 驱动：
  - **identifier-set 断言**：`{doc, heading, codeFile, functionName, callPattern, countPattern?}`——文档节须覆盖函数体内每个匹配调用（原名或派生 kebab 族名），bold 计数（若配置）须等于 live 集合大小。
  - **symbol-anchor 断言**：对 manifest 列出的 docs 全文按条目粒度核对——同条目内每个反引号 PascalCase/camelCase 符号须出现在同条目反引号路径文件（含 facade 本地再导出目标 + 同名目录）的文本中；含否定词（`deleted|removed|no longer|retired|dropped`）的条目跳过；显式 `allow` 列表按 `(path, symbol, reason)` 豁免。
- 反向验证：注入"文档点名不存在的符号 / 注册族数量写错 / 新增注册调用未回写"三种 drift 均红。
- 两条种子 drift 若重演即红（判别性 fixture 复刻 7→9 与错误 Where-To-Add 文件）。

## Non-Goals

- 不做自然语言级矛盾检测（"同文档两节互相矛盾"类——symbol-anchor 已覆盖其可判定子集：错误归属的那一句必红）。**已知假阴性边界**：symbol-anchor 以文本包含判定，若文档把符号错误归属到一个*仅 import 该符号*的文件，门禁不报（如 `ActionRuntimeAdapter` 形态）；真正的定义归属校验留待后续以 export 解析升级。
- 不改 `check:active-doc-code-anchors`。
- 首批 manifest 只登记 `flux-runtime-module-boundaries.md`（种子 owner doc）；扩面到其它 `docs/architecture/*` 为后续 owner 面工作（Non-Blocking Follow-ups）。
- 不修改 owner doc 的契约语义；仅当门禁揭示真 drift 时做就地勘误（本 plan 即该 protected area 的 plan）。

## Scope

### In Scope

- `scripts/check-owner-doc-semantics.mjs`（新）、`scripts/baselines/owner-doc-semantics.json`（新）、`scripts/__tests__/check-owner-doc-semantics.test.ts`（新）
- `package.json`：`check:owner-doc-semantics` + 聚合接线
- `docs/references/audit-tooling.md`：Hard Gates 行
- `docs/architecture/flux-runtime-module-boundaries.md`：仅当门禁揭示真 drift 时就地勘误（起草时原型未发现真 drift，三处均为门禁口径问题）
- roadmap PH-3 回写、daily log

### Out Of Scope

- 其它 owner doc 的 manifest 登记
- `docs/architecture/*` 契约文本重写

## Failure Paths

| 场景                    | 触发                                                 | 行为                          | 可重试 | 用户可见        |
| ----------------------- | ---------------------------------------------------- | ----------------------------- | ------ | --------------- |
| set-missing             | 代码新增 `registerXRenderers(` 调用，文档节未提      | exit 1，列出缺失族            | 是     | `pnpm check` 红 |
| count-drift             | 文档 bold 计数 ≠ live 集合大小                       | exit 1                        | 是     | 红              |
| symbol-missing          | 条目点名符号不在同条目路径文件（含 facade 目标）中   | exit 1，列 doc 行号/路径/符号 | 是     | 红              |
| stale-allow             | allow 条目的 (path, symbol) 已在文件中出现           | exit 1（提示删除）            | 是     | 红              |
| manifest-target-missing | manifest 引用的 doc/heading/codeFile/function 不存在 | exit 1                        | 是     | 红              |

## Test Strategy

本档选择：**必须自动化**——CI 门禁契约。Proof 先于 Fix。

## Execution Plan

### Phase 1 - Proof：先红用例

Status: completed
Targets: `scripts/__tests__/check-owner-doc-semantics.test.ts`

- Item Types: `Proof`

- [x] 新建测试 11 用例（`--root <fixture>` 驱动）：①set 全覆盖+计数一致 → 0；②代码多 `registerXlangDebugEditorRenderers(` 文档未提 → 1（复刻 P1-MA1.2-001）；③bold 2 vs live 3 → 1；④anchor 命中 → 0；⑤点名 `normalizeTriggers` 不在文件 → 1（复刻 P1-MA1.1-001）；⑥facade `./dispatcher/index.js` + 符号在 `dispatcher/types.ts` → 0；⑦"has been deleted" 条目跳过 → 0；⑧allow 豁免 → 0；⑨stale allow → 1；⑩heading 不存在 → 1；⑪live 仓库 → 0。
- [x] 先红：2026-10-26 `11 failed (11)`（脚本 ENOENT）。

Exit Criteria:

- [x] 11 条用例在仓库且整体先红（证据同上）。

### Phase 2 - Fix：门禁实现与接线

Status: completed
Targets: `scripts/check-owner-doc-semantics.mjs`、`scripts/baselines/owner-doc-semantics.json`、`package.json`

- Item Types: `Fix`

- [x] 实现脚本（heading 精确定位；identifier-set 函数体/kebab 派生/bold 计数；symbol-anchor 条目切分/路径与符号正则/facade 展开/否定词跳过/allow + stale 检测；`--root`）。**执行修订**：facade 展开按 `from './x'` 匹配，天然把一层**本地 import** 也并入检索文本（不仅再导出）——语义上"文件引用了该符号"同样成立，且比原型更准：原型的第 ③ 处不一致（`FormRuntimeOwner`）经此展开直接命中，无需 allow。
- [x] manifest 首批：docs=[`flux-runtime-module-boundaries.md`]；identifier-set 1 条；**allow 0 条**（计划中的 1 条因上述修订成为 stale，门禁自己报红后删除——stale 检测反向验证顺带完成）。
- [x] `package.json` 新增 `check:owner-doc-semantics` 并接入 `check` 聚合；`check:wiring-coverage` 绿。
- [x] live 无真 drift，owner doc 零改动。

Exit Criteria:

- [x] 测试 11/11（与 wiring 11 共 22/22）。
- [x] `node scripts/check-owner-doc-semantics.mjs` exit 0：identifier-set 9 live calls covered；symbol-anchor 31 items / 58 checks / 1 negated skipped / 0 allow。
- [x] 反向探针：bundle `index.tsx` 临时加 `registerProbeRenderers(registry)` → 红并点名 `registerProbeRenderers` 与 family "probe"；已还原（`git diff` 空）。

### Phase 3 - Docs 与回写

Status: completed
Targets: `docs/references/audit-tooling.md`、roadmap、`docs/logs/2026/10-26.md`

- Item Types: `Fix`

- [x] `audit-tooling.md` Hard Gates 表新增 `check:owner-doc-semantics` 行。
- [x] roadmap PH-3 `todo`→`planned`→`done`（closure 同 commit）；daily log（closure 同 commit）。

Exit Criteria:

- [x] 文档与 live 一致；`pnpm check` exit 0（见 Closure Gates）。

## Draft Review Record

- Reviewer / Agent: fresh-session sub-agent `agent_bfe0941d`（2026-10-26）
- Verdict: `pass-with-minors`（0 Blocker / 0 Major / 4 Minor）
- Rounds: 1
- Findings addressed: 无 Blocker/Major。4 Minor 全部落文：①`ActionRuntimeAdapter` 归属措辞改为"作为导入的类型引用出现"；②核对计数标注 ±1 口径；③wired 数改以 `check:wiring-coverage` 输出为准；④Non-Goals 补充"仅 import 文件"假阴性边界。审阅者独立复现 32 条目 / 58 核对 / 同样 3 处不一致。

## Closure Gates

- [x] 两类断言已落脚本并入 `pnpm check`（`check:wiring-coverage` 判定 wired）
- [x] 两条种子 drift 的复刻 fixture 均红（用例 ②⑤，判别性）
- [x] 反向探针红（`registerProbeRenderers`）
- [x] 无 in-scope 项被静默降级
- [x] owner doc（`audit-tooling.md` Hard Gates 行）已同步；架构 owner doc 零改动（无真 drift）
- [x] 由独立子 agent（fresh session）执行的 closure audit 已完成并记录证据——`agent_d2823ddf`，2026-10-26，verdict `approved`（0 Blocker / 0 Major / 1 Minor，见 §Closure）
- [x] `pnpm typecheck` 45/45
- [x] `pnpm build` 45/45
- [x] `pnpm lint` 45/45
- [x] `pnpm test` 84/84；`pnpm test:scripts` 145/149（4 红 = plan 754 已披露 pre-existing；本 plan 11 用例全绿）
- [x] `pnpm check` exit 0

## Deferred But Adjudicated

### manifest 扩面到其它 `docs/architecture/*` owner docs

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: roadmap PH-3 交付的是"语义层门禁 + 种子族覆盖"；每份 owner doc 的条目口径需各自 owner 核对误配后登记，属增量扩面。
- Successor Required: `no`（manifest 追加即生效，无需新 plan；由各 owner 面在触及该 doc 时登记）

## Non-Blocking Follow-ups

- 其它 `docs/architecture/*` 逐份加入 manifest `docs` 列表并清理误配。

## Closure

Status Note: owner doc 与 live 代码的语义一致性首次有了机械门禁 `check:owner-doc-semantics`（identifier-set + symbol-anchor，manifest 驱动），两条 arm2 P1 种子 drift 的复刻 fixture 均红；live 首批覆盖 `flux-runtime-module-boundaries.md`（31 条目 / 58 核对，零真 drift，零 allow）。扩面到其它 owner doc 为增量 manifest 追加。

Closure Audit Evidence:

- Auditor / Agent: fresh-session sub-agent `agent_d2823ddf`（2026-10-26）
- Evidence: verdict `approved`（0 Blocker / 0 Major / 1 Minor）。审计者独立实跑：门禁 exit 0 且摘要一致；11/11 并逐条确认 ②⑤ 复刻种子 drift 的断言真实；自做反向探针 `registerProbeRenderers` → 红（set-missing + count-drift 双路径）并精确还原；`check:wiring-coverage` 判 wired；`pnpm check` exit 0；`test:scripts` 145/149 与披露一致；audit-tooling 行与脚本行为逐项对照一致；Deferred 分类与执行修订记录完整。1 Minor（否定词表缺 `dropped`）已在本 closure commit 内补齐。

Follow-up:

- no remaining plan-owned work。manifest 扩面（其它 `docs/architecture/*`）由各 owner 面触及时追加。
