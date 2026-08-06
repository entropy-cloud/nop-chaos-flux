# CG — Guard 沉淀（pc-index 汇总索引 + 工具脚本升级 + lessons + checklist v2）

> Plan Status: active（draft → active：独立子 agent 审查 pass-with-minors，零 Blocker/零 Major，Minor 全部处理，共识达成）
> Mission: component-audit
> Work Item: CG
> Last Reviewed: 2026-08-06
> Source: `docs/backlog/component-audit-roadmap.md`（CG Phase Details、Work Item Status、Cross-Cutting）、`docs/audits/arm-index.md`（上轮 arm 风格索引范式）、`docs/audits/component-audit-checklist.md`（18 维 v1）、`docs/lessons/README.md`（lessons 格式）
> Related: 前置依赖 CR（`docs/plans/2026-08-06-0329-1-...`）与 CV（`docs/plans/2026-08-06-0329-2-...`，均 active）；p2p3（`docs/plans/2026-08-05-1359-1-...`，active）输出为输入

## Purpose

在 CR 收口（裁决表 + shared/P2 修复 + 文档同步）与 CV 全量验证（full-green 基线）之后，把 component-audit mission 的成果沉淀为可持续复用的组织防护：① 为 113 张逐组件审计卡生成 arm 风格汇总索引 `docs/audits/per-component/pc-index.md`（与上轮 audit-remediation 的 `arm-index.md` 同范式，支持后续审计快速检索）；② 评估并落地执行期间暴露的新可机械化审计模式（若有），升级 `check:audit-*` 工具脚本基线；③ 将 CX-1..CX-12 与跨 plan 共性问题（bug 73/83/89 模式等）提炼为 lessons 写入 `docs/lessons/`；④ 把执行期经验回灌 `docs/audits/component-audit-checklist.md` 修订为 checklist v2（含 `docs/audits/per-component/README.md` 模板 v2）。收口后 roadmap CG 行标 `done`，component-audit mission 的 guard 层闭合。

## Current Baseline

- **组件卡状态**：113 张审计卡全部 `closed`（C0–C9 + CX-1..CX-12 全部 `done`，2026-08-06 live 核对：`docs/audits/per-component/*.md` 中 `状态: closed` 恰 113 处）；卡内发现均带 `状态: fixed`/`卡内记录` 标注与 plan/commit 引用。
- **CR/CV 前置**：CR 与 CV plan 已 `active`（2026-08-06-0329 起草，独立子 agent review pass-with-minors），未执行。CR 产出 `docs/audits/cr-inventory-adjudication.md` 裁决表（~110 处"归 CR"引用零未分类）；CV 产出 full-green 验证记录（daily log + full-green 标记提交）。本 plan 依赖二者收口后执行（CG 依赖边 CR → CV → CG）。
- **模板所有权**：`docs/audits/per-component/README.md` 明确声明"模板语义修订属 CG work item「checklist v2」，不得在 C\* 执行中擅自改动"——checklist v2 是本 plan 唯一合法修订点。
- **索引范式**：`docs/audits/arm-index.md`（audit-remediation 轮 M0–MG）为既有 master index 范式（Phase/Milestone Index + Package Cluster Index + P0/P1/P2 Finding Index + Audit Tool Baseline + 报告索引）；component-audit 轮尚无对等索引。
- **lessons 现状**：`docs/lessons/README.md` 内嵌 4 条 MR 派生 lessons（Audit-Remediation Lessons 节，MG 轮写入，无独立编号文件）；01 为 compiler lesson（独立编号文件）；component-audit 轮 lessons 未写入（Phase 3 新文件从 `02-` 起始编号，避免与 README 命名示例冲突）。
- **工具基线**：12 个 `check:audit-*` 脚本（`scripts/audit/*.mjs`，根 package.json scripts），C0（2026-08-02）记录基线数量（daily log），`pnpm check` 聚合其中部分；另有 `check:i18n-keys`/`check:oversized-code-files` 等独立检查。p2p3 plan 已修复 eslint i18n `words.exclude` 盲区（第 1 盲区）。
- **执行期暴露的新模式**（工具/清单升级候选输入）：bug 73 模式（单测绿但真实浏览器失败，C 阶段宿主专项 host-\*）；bug-83/CX-10 家族（schema 事件派发缺 `{ event, evaluationBindings, scope }` ctx，13+10 处派发补齐）；CX-9/CX-12（`kind:'reaction'` 字段未接线、无 ComponentHandle 注册）；CX-11（surface args 内嵌 schema body 急切求值，docs/bugs/89）；p2p3 data-slot 重复（15 文件）与 i18n 三盲区；C6.1 URL 协议校验（isSafeNavigationUrl）。
- **project-context.md**：freshness `fresh`，但 e2e 基线段仍为 C0 快照口径（9 pre-existing failed），CV full-green 后需回写。

## Goals

- `docs/audits/per-component/pc-index.md` 建成：113 张卡逐卡一条索引行（组件/包/家族/状态/发现计数），P0/P1/P2/P3 发现索引（arm 风格），CX-1..CX-12 共性模式索引，family/package 汇总表，审计工具基线表，与 plans/bugs/e2e 交叉引用。
- 工具脚本升级：执行期新模式的机械化可行性评估记录；落地的新 `check:audit-*`（或既有脚本扩展）基线输出记录；不可机械化项显式记录理由（零悬空）。
- `docs/lessons/` 新增 ≥3 条 component-audit lessons（按 README 格式：Problem Context / Decisive Evidence / Correct Decision Rule / Preventive Checklist），覆盖 bug 73 模式、事件 ctx 家族（CX-10）、surface args 求值（CX-11）等执行期最可复用模式。
- `component-audit-checklist.md` v2 修订落地（维度增补/措辞修正 + 变更记录），`per-component/README.md` 模板 v2 同步。
- roadmap CG 行 `todo → done`（closure-audit pass 后收口）；project-context.md 基线段回写（依赖 CV full-green 结果）；daily log 记录交付物。

## Non-Goals

- **不做产品代码变更**：不动 renderers/runtime/core 行为；本 plan 唯一的代码落点是 `scripts/audit/` 工具脚本与根 package.json 脚本注册（若评估落地）。
- **不重开审计**：不重跑 18 维、不重审已 closed 卡、不为新发现开新卡（新发现若出现，记录并归 successor，不静默吞掉）。
- **不处理 `pnpm check` 既有 pre-existing red**（如 `check:oversized-code-files` 14 文件 >700 行，CV Phase 1 记录在案）——治理归属 successor，非本 plan 修复面。
- **不重构 CI/管道**：不做 pipeline 级改动，工具升级限定在 scripts + package.json 脚本层面。
- **不创建新 skill 提示词**：审计方法沉淀走 checklist v2 + lessons（skills 归独立维护，同 MG 先例）。

## Scope

### In Scope

- `docs/audits/per-component/pc-index.md` 创建（含逐卡索引、发现索引、CX-n 索引、工具基线、交叉引用）。
- 新机械化审计模式评估 + 落地（`scripts/audit/*.mjs` + package.json）+ 基线输出记录 + 不可机械化项决策记录。
- `docs/lessons/` ≥3 条 component-audit lessons + README 索引条目。
- `docs/audits/component-audit-checklist.md` v2 修订 + `docs/audits/per-component/README.md` 模板 v2 同步。
- `docs/backlog/component-audit-roadmap.md` CG 行收口、`docs/context/project-context.md` 基线回写、daily log 记录、`docs/index.md` 路由核对（pc-index 是否需要登记）。

### Out Of Scope

- 产品代码行为修复（含 CR 裁决遗留的 `defer-other` successor 项）。
- 已 closed 卡的复核重开。
- `pnpm check` 既有 red 集治理。
- 新组件/新能力/新审计轮次。

## Failure Paths

> 不适用：本 plan 为文档沉淀 + 内部静态检查脚本，无外部 IO、鉴权、错误码契约。工具脚本若有输出格式/退出码问题，由 Phase 2 Exit Criteria 的运行冒烟验证兜底。

## Test Strategy

本档选择：`不适用：计划主体为文档沉淀（pc-index / lessons / checklist v2），无产品行为变更；Phase 2 若落地工具脚本，属纯内部静态检查工具（不进产品包、不进类型面），其验收即"脚本运行 + 输出断言"（写入 Phase 2 Exit Criteria），不引入 vitest 层`

- 校验方式：pc-index/lessons/checklist v2 以 repo-observable 一致性检查为验收（grep 计数对账、`check:active-doc-code-anchors` 类锚点校验、链接解析）；工具脚本以运行输出为验收。
- 全量 typecheck/build/test 不适用（无产品代码变更），按 plan guide「纯文档计划」条款从 Closure Gates 剔除；`pnpm lint` 保留为仓库级检查（其 runner 聚合 `check-active-doc-code-anchors` 等，与 Phase 1/5 验收相关；注意 eslint 配置仅匹配 `**/*.{ts,tsx}`，`scripts/audit/*.mjs` 不在 lint 覆盖内——脚本验收以运行输出 + 命中样本抽查为准）。

## Execution Plan

### Phase 1 - pc-index.md 汇总索引

Status: planned
Targets: `docs/audits/per-component/pc-index.md`、`docs/audits/per-component/*.md`（113 卡）、`docs/audits/arm-index.md`（范式）、`docs/backlog/component-audit-roadmap.md`

- Item Types: `Decision | Proof | Fix`

- [ ] **Decision**：确定 pc-index 结构（参照 arm-index 范式 + component-audit 特有维度）：① Family/Work-Item 汇总表（C0–C9/CX-n → plan 文件 → 审计卡清单 → 宿主 e2e 场景）；② 逐组件卡索引表（type/包/家族/状态/发现计数 P0/P1/P2/P3/宿主场景结果）；③ 发现索引（P0/P1 全部 + 代表性 P2/P3，含 fixed 状态与修复引用）；④ CX-1..CX-12 共性模式索引（根因/影响面/修复 plan/bug 引用）；⑤ 审计工具基线表；⑥ 与 `docs/audits/cr-inventory-adjudication.md`（CR 产出）的衔接说明。
- [ ] **Proof**：以 grep 机械核对计数——`docs/audits/per-component/*.md` 卡数 = 113、`状态: closed` = 113、逐家族 P0/P1/P2/P3 发现数（`- [P<n>-<seq>]` 模式按卡统计）、`docs/bugs/` 引用与 `statusPath` 等关键交叉引用存在；计数记录为 pc-index 数据源。
- [ ] **Fix**：创建 `pc-index.md`，逐卡一行索引（含 file:line 可验证链接），发现索引与 CX-n 索引全覆盖（CX-1..CX-12 无遗漏），工具基线表引用 C0 daily log 与各 C\* plan 最新验证记录。
- [ ] **Fix**：链接与锚点自检（`check:active-doc-code-anchors` 对 pc-index 引用路径零失效；手工抽查 ≥3 条 `文件:行` 引用可解析）。

Exit Criteria:

- [ ] `pc-index.md` 存在，逐卡索引恰好 113 行（grep 对账一致），CX-1..CX-12 索引完整，P0/P1 发现零遗漏（计数与卡内 grep 一致）。
- [ ] 抽查 ≥3 条卡引用与 ≥1 条 bug 引用可解析（锚点校验零失效）。

### Phase 2 - 工具脚本升级评估与落地

Status: planned
Targets: `scripts/audit/*.mjs`、根 `package.json`（scripts）、`docs/logs/2026/08-06.md`（基线记录）

- Item Types: `Decision | Fix | Proof`

- [ ] **Decision**：逐项评估执行期新模式的可机械化性——① bug-83/CX-10 事件派发 ctx 缺失（静态可查性：`dispatch(` 调用点核对 ctx 参数形状，可行性待实证，假阳性需评估）；② CX-9/CX-12 `kind:'reaction'` 字段接线（可查：reaction 声明 vs ComponentHandle 注册对照，可行性待实证）；③ data-slot 重复（p2p3 已修 15 文件，可评估 DOM 唯一性静态检查）；④ i18n 盲区（第 1 盲区已由 p2p3 eslint 修复；第 2/3 盲区裁决归属 CR，本 plan 执行时已收口，仅登记不重复评估）；⑤ sanitize/URL 协议（C6.1 P0-1 link href `javascript:` URI → `isSafeNavigationUrl` 为手工审计发现、脚本零覆盖，评估是否新建立项）；⑥ 其他（如有）。每条产出 `mechanize | extend-existing | not-mechanizable(理由)` 裁定，记录于 plan。
- [ ] **Fix（落地项）**：对裁定 `mechanize`/`extend-existing` 的模式，在 `scripts/audit/` 新增或扩展脚本（遵循既有 `.mjs` 风格与输出格式），并在根 package.json 注册；不新增 `pnpm check` 聚合项除非该检查达到零/低假阳性（避免 CI 噪音）。
- [ ] **Proof**：运行新/扩展脚本，记录基线输出（命中数 + 抽查命中样本真实性 ≥2 条）；对 `not-mechanizable` 项记录理由与替代防护（写入 checklist v2 / lessons）。
- [ ] **Fix**：`pnpm lint` 全仓通过（含新脚本落地后的 repo-level runner 完整性；脚本本身不在 eslint 覆盖内，验收以运行输出为准）；`pnpm check` 聚合项（如有新增）无新增 red。

Exit Criteria:

- [ ] 裁定记录完整（每模式一行裁定 + 理由），零悬空；落地脚本运行输出与基线记录一致（抽查命中样本真实）。
- [ ] `pnpm lint` 绿；新增脚本不引入 `pnpm check` 新增 red（或显式记录为 watch-only）。

### Phase 3 - lessons 写入（≥3 条）

Status: planned
Targets: `docs/lessons/`（新增编号文件 + README 索引）

- Item Types: `Fix`（文档）

- [ ] 候选 lessons（≥3 条落地，从执行期证据最强的模式选取）：① **bug 73 模式**——"单测绿但真实浏览器失败"（宿主专项 host-\* 机制与 DOM programmatic 断言纪律）；② **bug-83/CX-10 事件 ctx 家族**——schema 事件派发必须携带 `{ event, evaluationBindings, scope }`，否则 action args 模板不可解析（13+10 处补齐实证）；③ **CX-11 surface args 急切求值**——内嵌 schema body 会被 compilePayload 模板化，`__nopPreserveLiteral` envelope 契约（docs/bugs/89）；④ **CX-9/CX-12 reaction 接线**——`kind:'reaction'` 字段必须接线 + ComponentHandle 注册；⑤ p2p3 data-slot 重复 / i18n lint 盲区（第 1 盲区正则修复为 eslint 配置防 CJK 漏检的样板）。
- [ ] 每条按 `docs/lessons/README.md` 推荐章节撰写（Problem Context / Initial Judgment / Decisive Evidence / Correct Decision Rule / Preventive Checklist / Related Files），文件命名 `0N-<slug>.md` 递增。
- [ ] README 索引节追加新条目（含简短摘要）。

Exit Criteria:

- [ ] `docs/lessons/` 新增 ≥3 条文件，均含 Correct Decision Rule + Preventive Checklist 节；README 索引含全部新条目。

### Phase 4 - checklist v2 修订

Status: planned
Targets: `docs/audits/component-audit-checklist.md`、`docs/audits/per-component/README.md`

- Item Types: `Decision | Fix`

- [ ] **Decision**：汇总 v1 执行期短板（以执行证据为准）：维度 7（事件与 action 契约）增补"派发必须携带 `{ event, evaluationBindings, scope }` ctx + 模板键可解析验证"；维度 5（DOM 契约）增补 data-slot 唯一性（FieldFrame 包裹 vs 独立）；维度 12（组合宿主）将 bug 73 专项检查从"每族新增"固化为"每卡必检"语言；维度 9（i18n）记录 eslint 盲区与 `rg` 兜底做法；维度 16（测试质量）增补"事件 ctx/模板解析"断言要求；其余维度按执行经验微调（措辞/示例），不做维度编号重构（避免历史卡引用失效）。
- [ ] **Fix**：修订 `component-audit-checklist.md` 为 v2（顶部标注版本/修订日期/变更摘要节），P0/P1/P2/P3 裁决表与自动修复纪律保持 v1 语义不变（仅措辞）。
- [ ] **Fix**：`docs/audits/per-component/README.md` 模板 v2 同步（更新模板语义修订声明指向 v2；历史卡不回写，只更新模板本体）。
- [ ] **Fix**：`docs/backlog/component-audit-roadmap.md` 若引用 checklist v1 模板则同步措辞（只改引用口径，不改状态区）。

Exit Criteria:

- [ ] `component-audit-checklist.md` 标注 v2 + 变更摘要节存在；README 模板 v2 与 checklist 语义一致；历史审计卡未回写（确认 git diff 无 per-component/\*.md 改动）。

### Phase 5 - 收口与 roadmap

Status: planned
Targets: `docs/logs/2026/08-06.md`、`docs/backlog/component-audit-roadmap.md`（CG 行）、`docs/context/project-context.md`、`docs/index.md`

- Item Types: `Fix | Follow-up`

- [ ] **Fix**：daily log 记录 CG 交付物（pc-index/工具基线/lessons/checklist v2 + 各验证计数）。
- [ ] **Fix**：`project-context.md` 基线段回写（以 CV full-green 实测为准：e2e 计数、组件审计 mission 状态；freshness 保持/确认 `fresh`，按 AI autonomy 政策——回写仅限 CV 已实测事实）。
- [ ] **Fix**：`docs/index.md` 路由核对——pc-index 若应登记则追加一行（`docs/audits/` 区），否则记录"无需登记"。
- [ ] **Follow-up**：roadmap CG 行 `todo → done`（由独立 closure-audit pass 后收口动作完成，本 plan 不自行勾选 audit gate）。

Exit Criteria:

- [ ] daily log CG 条目存在且数据与实测一致；project-context.md 基线段与 CV full-green 结果一致；docs/index.md 路由核对记录在案；roadmap CG 行已 `done`。

## Draft Review Record

> 起草后、执行前由独立子 agent（fresh session）审查；共识达成后本 plan 升级 `active`。

- Reviewer / Agent: task `ses_02c89f98dfferqzlqgSzg7E6zl`（独立 fresh session plan review，2026-08-06）
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed: 零 Blocker / 零 Major；Minor 已全部处理——①Phase 2 ⑤ URL/sanitize 前提纠正（C6.1 P0-1 为手工审计发现、脚本零覆盖，改为"评估是否新建立项"）；②`pnpm lint` 覆盖范围澄清（eslint 仅匹配 ts/tsx，`scripts/audit/*.mjs` 不在覆盖内，脚本验收以运行输出 + 样本抽查为准，lint 作为 repo-level 检查保留）；③i18n 第 2/3 盲区裁决归属 CR（执行时已收口），措辞改为"仅登记不重复评估"；④oversized-code-files 延期条目补充与 CV"归 CR/CG 治理"记录的衔接精化（治理归属独立 successor）；⑤lessons 基线措辞修正（MR lessons 为 README 内嵌 4 条、无独立编号文件），Phase 3 新文件从 `02-` 起始编号。

## Closure Gates

> 关闭条件：本 section 所有条目 + 每个 Phase Exit Criteria 全部 `[x]` 后，才能将 `Plan Status` 改为 `completed`。本 plan 为纯文档 + 内部工具脚本计划（无产品代码变更），按 guide「纯文档计划」条款剔除 typecheck/build/test 门禁；`pnpm lint` 保留（Phase 2 有脚本/配置改动时须绿）。

- [ ] `docs/audits/per-component/pc-index.md` 存在且覆盖全部 113 卡（grep 对账一致）+ CX-1..CX-12 索引完整
- [ ] 工具脚本升级裁定记录完整（零悬空）；落地脚本运行输出与基线一致，`pnpm lint` 绿
- [ ] `docs/lessons/` ≥3 条 component-audit lessons + README 索引更新
- [ ] `component-audit-checklist.md` v2 + `per-component/README.md` 模板 v2 落地（历史卡未回写）
- [ ] daily log CG 记录 + project-context.md 基线段与 CV full-green 一致 + docs/index.md 路由核对
- [ ] roadmap CG 行 `todo → done`
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope 项（发现的 confirmed live defect 必须显式归 successor，不得藏在 non-blocking 区）
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [ ] `pnpm lint`（若 Phase 2 落地脚本/配置改动）

## Deferred But Adjudicated

### `pnpm check` 既有 pre-existing red（check:oversized-code-files 14 文件等）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 属治理债而非本 mission 引入的缺陷；CV Phase 1 已记录对照基线并标注"归 CR/CG 治理"——本条目将其精化：治理归属独立 successor（非 CG 本 plan 范围，CG 只做 guard 沉淀），与 CV 记录不矛盾；与 component-audit 结果面无耦合。
- Successor Required: `yes`
- Successor Path: 未来治理/优化 plan（非 component-audit 路线；本 plan Non-Blocking Follow-ups 登记）

### 无法机械化检测的模式（事件派发 ctx、reaction 接线等的静态检测盲区，若裁定 not-mechanizable）

- Classification: `watch-only residual`
- Why Not Blocking Closure: 经实证裁定当前 grep/AST 手段假阳性率不可接受（记录于 Phase 2 决策），替代防护已落入 checklist v2 维度与 lessons 的 Preventive Checklist；不构成 supported baseline 缺陷。
- Successor Required: `no`（checklist v2 人工检查项已覆盖；若未来工具能力提升可再评估）

## Non-Blocking Follow-ups

- `check:oversized-code-files` 14 文件治理（>700 行）登记为独立治理 successor，不并入本 plan。
- pc-index 未来可扩展为脚本生成（若卡格式再冻结一轮）；本轮手写 + grep 对账即可。
- 事件派发 ctx / reaction 接线的静态检测工具，待 AST 工具链能力提升后再评估。

## Closure

Status Note: pending（执行完成后填写）

Closure Audit Evidence: pending

Follow-up:

- pending（仅记录 non-blocking follow-up）
