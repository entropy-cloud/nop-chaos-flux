# DV 全量验证与 e2e 增量化

> Plan Status: completed
> Last Reviewed: 2026-08-25
> Source: `docs/backlog/ai-widgets-product-roadmap.md` §DV + `docs/components/flux-renderers-ai/product-spec.md` §7（DV 断言清单契约）
> Mission: ai-widgets-product
> Work Item: DV 全量验证与 e2e 增量化
> Related: D1–D6 plans（`docs/plans/2026-08-24-1045-2` / `-1045-3` / `2026-08-24-2237-1` / `-2237-2` / `-2237-3` / `2026-08-24-2317-1`，全部 completed）

## Purpose

把 D0–D6 已落地的产品化改动收口到「仓库级可验证的绿色基线」：补齐 product-spec §7 断言清单的 e2e 层真缺口（typography light/dark 计算样式 + 流式节奏间接证据），修复登记在册的 route-inventory e2e 红（5 条路由缺 smoke 断言），跑通全量验证链 + 全量 e2e 套件，落档产品级快照。本 plan 是 roadmap 倒数第二项（DV → DG）。

## Current Baseline

- **D0–D6 全部 done**（roadmap Work Item Status 表 + 各 plan 独立 closure-audit 记录）；master HEAD = `ca1c9c37c`（D4），工作区干净。
- **ai e2e 家族现状**：D4 收口记录（2026-08-25）为 18 文件 120 passed；live 复核 `ai-*.spec.ts` 文件数为 **19**（含 D5 新增 showcase spec 等），精确测试数以 Phase 3 全量 e2e 输出为准。其中 4 个 ai-widgets 专属 spec（live 精确计数）：`ai-widgets-demo.spec.ts` **14** / `ai-widgets-button-actions.spec.ts` **7** / `ai-widgets-fixture.spec.ts` **6** / `ai-widgets-showcase.spec.ts` **5** = 32 测试。
- **product-spec §7 的 14 面断言清单逐面核对（live）**：
  - 已有 e2e 证据 10 面：avatar / welcome icon（demo spec D3 增 2）、副作用 prompts·refresh·feedback·pill（button-actions spec ①②④⑤⑥，4 面）、fixture ×6（fixture spec）、showcase（showcase spec (a)–(e)）、公式渲染 / 代码高亮（demo spec G5/G6 增 2）——10 + 本 plan 新增 3 + 流式边界单元层裁定 1 = 14。
  - **真缺口 3 面**：typography（light，`getComputedStyle`）+ typography（dark）——D2 只落了单元层 CSS 源文本断言（`markdown-content.test.tsx`，jsdom 不加载包级 stylesheet，product-spec §7「DV 归属说明」明确把 `getComputedStyle` 断言归 DV e2e 层）；节奏（200ms/词的间接时长证据，fixture spec 无时长断言）。
  - 流式边界 1 面：D6 已在单元层覆盖（`markdown-buffer.test.ts` 单美元 / `\[` / fence cut）；e2e 化需注入流式时序、flaky 风险高 → 本 plan 裁定单元层足够（见 Deferred But Adjudicated）。
- **product-spec §7 refresh 行措辞与 live 不符**：「点击 refresh → assistant 消息数 +1」，live 引擎语义是 truncate-rerun（D4 裁定 + button-actions spec ④ 按「重新流式 + 计数不变 + branchId 更新」断言）。owner-doc 与 live 行为不一致属不可 deferred 项，本 plan 修正该行。
- **route-inventory e2e 红（登记在册，live 仍红）**：`tests/e2e/playground-entry-pages.spec.ts:490` `test('domain route coverage matches playground route inventory')`——live 实测 `apps/playground/src/domain-route-entries.ts` 共 **76** 路由 id，`ROUTE_ASSERTIONS` 仅 **71** 键，缺 5：`gantt-states` / `ai-coverage` / `dingtalk-flow-demo` / `scada-editor-demo` / `dashboard-demo`。自 2026-08-24 D1 记录起，D2/D3/D5/D6 均以「范围外 pre-existing 红」为由未跑全量 e2e；本 plan 是全量验证 phase，必须处置。
- **watch-only 终态清单（既有登记，不属本 plan 修复范围）**：gantt-perf ×2 + kanban-perf ×1（主屏 50Hz rAF 上限致 60Hz 阈值不可达，需 60Hz 环境最终确认，见 `docs/context/project-context.md`）；`ai-attachments.spec.ts` 冷 dev server 首屏 2 例 retry-flaky（D4/D5 记录的既有环境模式）。
- **全量链最近绿态**：`pnpm typecheck`/`build`/`lint` 37/37、`pnpm test` 68/68 tasks、`pnpm check` exit 0（2026-08-25 D4 收口）。全量 e2e 自 DV 08-09 基线后未整跑过。
- **roadmap §DV 数字目标已过期**：原文「`ai-widgets-demo.spec.ts` 从当前 10 个测试增至 ≥ 16 个」以起草时点为准；D3/D4/D6 已随 phase 落地增量（10→14）。本 plan 按目标语义校准：demo spec 14 + 本 plan 增 3（typography ×2 + 节奏 ×1）= **17 ≥ 16**，且 §7 14 面证据矩阵全闭合。

## Goals

- product-spec §7 的 14 面断言证据矩阵全闭合：新增 typography（light）、typography（dark）、节奏 3 个 e2e 测试（落在 `ai-widgets-demo.spec.ts`，14 → 17）。
- 修正 product-spec §7 refresh 行为 truncate-rerun 语义（与 D4 已落地行为对齐）。
- 补齐 5 条路由的 `ROUTE_ASSERTIONS` smoke 断言，`playground-entry-pages.spec.ts:490` route-inventory 测试转绿。
- 全量验证链（`pnpm typecheck` / `build` / `lint` / `test` / `check`）+ 全量 e2e（`pnpm test:e2e`）跑通；失败项逐条裁定——修复（授权目录内小修）或 stash 实证为 pre-existing 后登记；超出 watch-only 清单的红零残留。
- `_tmp/ai-widgets-product-snapshot.png` 产品级快照留档（roadmap §DV + product-spec §7 明示「仅留档对照」，捕获方式记录进 daily log，遵守 AGENTS.md 程序化纪律）。
- roadmap DV `todo → done`（closure audit 通过后流转，见 roadmap Rule）。

## Non-Goals

- 不修 gantt-perf / kanban-perf watch-only 终态项（60Hz 环境归属，project-context 在册登记）。
- 不修 content 包 diff-view 高亮零注册缺陷（`packages/flux-renderers-content/src/diff-view/adapters/syntax-highlight.ts:7`，D6 裁定归 DG 登记 bug + successor 路由；且 content 包不在 mission 授权目录）。
- 不做 owner-doc 同步（design.md typography 段 / renderers.md setSenderDraft 段等归 DG phase）。
- 不新增 `check:*` 门禁（roadmap §Cross-Cutting 明示）。
- 不回写 roadmap §DV 的「10 → ≥16」原文（历史起草时点数字；校准记录进本 plan 与 daily log，roadmap 动态区仅 Work Item Status 表）。

## Scope

### In Scope

- `tests/e2e/ai-widgets-demo.spec.ts`：+3 测试（typography light / typography dark / 节奏）。
- `tests/e2e/playground-entry-pages.spec.ts`：+5 条 `ROUTE_ASSERTIONS` smoke 断言。
- `docs/components/flux-renderers-ai/product-spec.md`：§7 refresh 行语义修正（一词组级别的事实对齐，不改断言方式列）。
- `_tmp/ai-widgets-product-snapshot.png` + 捕获命令记录。
- `docs/logs/{year}/{month}-{day}.md` 验证收口记录。

### Out Of Scope

- 上表之外的一切代码 / 样式 / fixture 改动（含 flux-renderers-ai 包源码）。
- 全量 e2e 中新发现红的「大修」——超出授权目录或 > 小修量级的，登记 + 路由 successor，不在本 plan 修。

## Failure Paths

| 场景编号             | 触发                                                                                    | 行为                                                                                                   | 可重试 | 用户可见表现           |
| -------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------ | ---------------------- |
| e2e-red-unregistered | 全量 e2e 出现 watch-only 清单之外的失败                                                 | stash 实证归因：master 干净树同红 → 登记 baseline red；本 plan 引入 → 修复                             | 是     | daily log 记录归因证据 |
| route-smoke-fragile  | 新增 5 条 smoke 断言中某路由首屏不稳定                                                  | 按 spec 内既有模式放宽 timeout / 加入 `ROUTES_WITH_KNOWN_ERRORS`（仅当该路由确有登记的 console error） | 是     | 断言仍必须可重复通过   |
| dark-probe-fail      | dark 面注入（`page.emulateMedia({ colorScheme: 'dark' })` 或 `data-mode='dark'`）不生效 | 回退另一触发路径（D2 双轨：media query + `[data-mode='dark']`），两轨都失效则视为 D2 CSS 回归          | 否     | 测试失败即阻塞收口     |

## Test Strategy

本档选择：**必须自动化**

理由：本 plan 的交付物本身就是自动化断言（§7 面缺口 + route-inventory 修复）。route-inventory 修复天然先红后绿（`:490` 测试 live 红 → 补断言转绿）；typography / 节奏 / dark 为已落地行为（D1/D2）的覆盖补全，首跑应绿——若需验证断言有效性，可临时注释 `styles.css` 对应规则做变异抽查（抽 1 面即可，验完还原）。

## Execution Plan

### Phase 1 - §7 证据矩阵补齐（typography ×2 + 节奏 + refresh 行修正）

Status: completed
Targets: `tests/e2e/ai-widgets-demo.spec.ts`、`docs/components/flux-renderers-ai/product-spec.md`

- Item Types: `Fix | Proof`

- [x] `ai-widgets-demo.spec.ts` 新增 typography（light）测试：以 `citation` 关键词触发 fixture（**唯一同时覆盖三断言目标的 preset**——live `ai-widgets-fixture.ts`：h2 `:182`、links `:184-186`、blockquote `:188`；default/weather preset 无 blockquote），断言 `h2` 计算 `fontSize` = 20px（1.25rem）、`blockquote` 计算 `backgroundColor` 非透明、`a` 计算 `color` 非 browser 默认蓝（product-spec §7 第 1 行）。
- [x] 新增 typography（dark）测试：以 `page.emulateMedia({ colorScheme: 'dark' })` 或 `data-mode='dark'` 注入（D2 双轨任一），断言 fenced code 计算 `backgroundColor` 为暗色 fallback 值（product-spec §7 第 2 行）。
- [x] 新增节奏测试：断言 widgets demo 流式全程时长 ≥ 数秒量级（如首词到完结 elapsed ≥ 2s，200ms/词 × ≥10 词的间接证据；不断言精确时长，product-spec §7 末行）。
- [x] `product-spec.md` §7「副作用（refresh）」行措辞修正：`assistant 消息数 +1` → `重新流式 + 计数不变 + branchId 更新（truncate-rerun，D4 裁定）`（Fix：owner-doc 与 live 行为一致性）。

Exit Criteria:

- [x] demo spec 17 测试（14 + 3）在 headless Chromium 全过；新 3 测试断言方式与 §7 对应行逐字对应（可从测试代码映射回 §7 行）。
- [x] product-spec §7 refresh 行与 `ai-widgets-button-actions.spec.ts` ④ 的断言语义一致（同一行为无两套描述）。
- [x] 变异抽查 1 面：临时禁用 typography CSS 规则后 typography 测试转红、还原后转绿（证明断言非恒真）——证据记 daily log。

### Phase 2 - route-inventory 修复（5 条 smoke 断言）

Status: completed
Targets: `tests/e2e/playground-entry-pages.spec.ts`

- Item Types: `Fix | Proof`

- [x] 为 `gantt-states` / `ai-coverage` / `dingtalk-flow-demo` / `scada-editor-demo` / `dashboard-demo` 各补一条 `ROUTE_ASSERTIONS` smoke 断言（按 spec 内既有模式：打开路由 → 首屏关键 marker 可见；marker 选择基于各 demo 页 live data-slot / heading，执行时核实）。
- [x] `:490` route-inventory 测试转绿（`assertionIds === routeIds`，76 = 76）。
- [x] 新增 5 条 smoke 断言对应路由的测试全过。注意：spec 末尾循环（`playground-entry-pages.spec.ts:502-512`）已为**每条**路由生成一个 smoke test（`ROUTE_ASSERTIONS[route.id]?.(page)` 可选链，缺断言 = no-op 空过），因此本 Phase 是把 5 个既有 no-op 升级为有效断言，**测试条数不增加**（总量仍 = 路由数 76）。缺断言路由不在 `ROUTES_WITH_KNOWN_ERRORS`，升级后须过 `assertTrackedPageErrors`；若某路由确有既有 console error，按 spec 内注释纪律处理并记录归因。

Exit Criteria:

- [x] `playground-entry-pages.spec.ts` 全文件绿（inventory 测试 + 76 条 smoke，其中 71 既有有效 + 5 本 phase 升级）。
- [x] route-inventory 红从「登记在册 pre-existing」清单移除（daily log 注记消解）。

### Phase 3 - 全量验证 + 全量 e2e + 快照 + 收口

Status: completed
Targets: 全仓 + `_tmp/ai-widgets-product-snapshot.png` + `docs/logs/`

- Item Types: `Proof | Follow-up`

- [x] 全量验证链：`pnpm typecheck` && `pnpm build` && `pnpm lint` && `pnpm test` && `pnpm check`（roadmap §DV 原文命令集）。
- [x] 全量 e2e：`pnpm test:e2e`（headless Chromium 全套件）；失败项按 Failure Paths `e2e-red-unregistered` 协议逐条归因处置。
- [x] `_tmp/ai-widgets-product-snapshot.png` 捕获（roadmap 指定路径与用途；捕获命令记 daily log；本件为 roadmap 明示留档例外，任务结束不删除，但不得入 tracked 目录）。
- [x] daily log 写 DV 收口记录：§7 14 面证据矩阵（每面 → 具体 spec/test 名）、全量验证结果、红项归因清单、快照命令。
- [x] roadmap Work Item Status：DV `todo → planned`（本 plan draft review 通过时）→ `done`（独立 closure-audit 通过后，不得提前）。

Exit Criteria:

- [x] 全量链全绿（`check` exit 0，仅既有登记豁免项）。
- [x] 全量 e2e：0 failed，或失败项全部落在既有登记清单（watch-only 终态 + retry-flaky 模式）且无新增未登记红。（live 结果：14 failed 全部经 stash 实证归因为 clean-master 同红 baseline red——按 Failure Paths `e2e-red-unregistered` 协议登记进 daily log 并路由 successor owner 后，零未登记红残留；既有 watch-only 终态项本次全过。）
- [x] §7 证据矩阵 14/14 闭合记录在 daily log（含流式边界 1 面的单元层归属裁定引用）。
- [x] 快照文件存在于 `_tmp/`，daily log 含捕获命令。

## Draft Review Record

- Reviewer / Agent: fresh session `ses_fcafed0e7fferVaqcBVN7Tyskf`（round 1）+ `ses_fcaf9cb65ffen3q68PFg7E3c87`（round 2）
- Verdict: `pass`（round 2：0 Blocker / 0 Major / 1 anchor Minor 已顺手修正）
- Rounds: 2
- Findings addressed:
  - Major（round 1）：typography light 测试原指定 default/weather preset，二者无 blockquote（live fixture 仅 formula/reasoning/citation 含 `>` 行）→ 改为 `citation` 关键词单触发覆盖 h2+blockquote+links。
  - Minor：ai 家族计数改为「D4 收口记录 18 文件 120 passed + live 文件数 19，精确数以 Phase 3 为准」；面数算术 11→10 既有（10+3+1=14）；Phase 2 措辞改为「5 个既有 no-op smoke 升级为有效断言，测试条数不增加」。
  - Minor（round 2 新增）：citation preset 行号锚点漂移（h2 `:187`→`:182`、links `:181-183`→`:184-186`）已修正。

## Closure Gates

- [x] product-spec §7 14 面断言证据矩阵全闭合（3 新增 e2e + 10 既有 + 流式边界单元层裁定 = 14）。
- [x] route-inventory 测试绿，登记红消解。
- [x] product-spec §7 refresh 行与 live 一致（无 owner-doc drift 残留）。
- [x] 全量验证链 + 全量 e2e 通过（超出登记清单的红零残留）。
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift（流式边界 e2e 化除外——已按 Deferred But Adjudicated 裁定）。
- [x] 受影响 owner docs 已同步（product-spec §7 refresh 行；design.md / renderers.md 归 DG，不在本 plan）。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check`（exit 0，零新增红）
- [x] `pnpm test:e2e` 全量（roadmap §DV 核心交付，单列）

## Deferred But Adjudicated

### 流式边界的 e2e 层断言

- Classification: `optimization candidate`
- Why Not Blocking Closure: D6 已在单元层覆盖完整 cut 逻辑（`markdown-buffer.test.ts`：单美元 open/close、`\[` 块级、fence 未闭合、货币防误切）；e2e 化需要向真实流注入半写状态（时序型注入），flaky 风险高且不增加语义覆盖。product-spec §7 该行标注方法为「行为」，未强制 e2e 层。
- Successor Required: `no`
- Successor Path: 无（如未来 markdown-buffer 重构，单测即回归防线）

### 全量 e2e 中可能新发现、超出授权目录的红

- Classification: `watch-only residual`
- Why Not Blocking Closure: 处置协议已在 Failure Paths 固化——stash 实证归因后登记 + 路由 successor；本 plan 是验证 phase，不承担越权大修。
- Successor Required: `yes`（发现时按归属路由）
- Successor Path: 执行时归因结果（已登记 `docs/logs/2026/08-25.md` DV 条目）：barcode 家族 ×5 → scheduling 包 owner（`BarcodeDetector` `pdf_417` 枚举 unsupported）；crud-demo ×6 → crud-demo owner（首屏标题未渲染）；sundial ×2 → sundial owner（detail dialog testid 缺失）；scada-edge-cases ×2 → scada owner（hover overlay 负载时序敏感）。

## Non-Blocking Follow-ups

- `_tmp/ai-widgets-product-snapshot.png` 的长期归宿（若产品对照需要耐久保存，由 DG 或后续治理决定是否迁入 docs 资产；本 plan 按 roadmap 原文留 `_tmp/`）。

## Closure

Status Note: §7 证据矩阵 14/14 闭合（3 新增 e2e 落 `ai-widgets-demo.spec.ts` 17 测试全绿 + 变异抽查证明非恒真）；route-inventory 登记红消解（76 = 76，`playground-entry-pages.spec.ts` 77 全过）；product-spec §7 refresh 行与 live truncate-rerun 语义归一；全量验证链全绿 + 全量 e2e 1310 passed / 14 failed（全部 stash 实证归因 clean-master 同红并登记路由 successor，零未登记红）；快照落档 `_tmp/`。本 plan 关闭，剩余 DG 收口归 `2026-08-25-0215-2-dg-owner-doc-sync-closure.md`。

Closure Audit Evidence:

- Auditor / Agent: fresh sub-agent `ses_fcad11b48ffeKJ8GrQ0snxItFM`（general agent，非执行 session，三件套 fresh-context 输入）
- Evidence: verdict **approved**（2026-08-25；0 Blocker / 0 Major / 3 Minor 记录性——Goals 与 Closure Gates 措辞张力按 Gate 口径满足、deferred Successor Path 已按归因回填、dingtalk-flow-demo fallback 钉住裁定为正确处理）；审计独立复跑 `domain route coverage` 1 passed + 新 3 测试 3 passed（27.5s）；live 核对 17 测试断言 ↔ §7 行映射、5 条 ROUTE_ASSERTIONS 键集 diff 空、`git status` 足迹 = 5 modified（2 spec + product-spec + roadmap + daily log）+ 2 untracked plan 文件、`styles.css` 变异零残留、`.gitignore` 覆盖 `_tmp/`。

Follow-up:

- route-inventory owner：`dingtalk-flow-demo` 路由条目为历史残留（demo 页已随 plan 2026-08-07-1053-2 删除，条目经 merge 复活），smoke 现钉住 HomePage fallback——条目清理 +（如需）独立 demo 页重建。
- e2e 治理 owner：`tests/e2e/exploratory/domain-page-interactions.spec.ts` 运行时自写 `docs/analysis/2026-07-27-ma43-.../04-e2e-domain-pages.md`（测试自突变 docs）；全量 e2e 生成未忽略的 `tests/e2e/artifacts/`（`.gitignore` 候选）。
- `_tmp/ai-widgets-product-snapshot.png` 长期归宿由 DG 或后续治理裁定（见 Non-Blocking Follow-ups）。
