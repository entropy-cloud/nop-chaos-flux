# 670 审计修复 R2·MA3.4：代码质量审计—flux-react + flux-bundle

> Plan Status: completed
> Last Reviewed: 2026-10-20
> Source: `docs/backlog/audit-remediation-r2-roadmap.md` MA3.4；`missions/audit-remediation-r2.json`；方法论 `docs/skills/code-quality-audit-prompt.md`（七维度）+ `react19-best-practices-review.md`（口径②——本项首次 in scope）+ `workaround-code-smell-audit-prompt.md`（口径④）
> Related: `docs/audits/arm2-scope-and-dimension-matrix.md` MA3 节、`docs/audits/arm2-index.md`、MA1.2（C2 结构面已审）、MA2.1（C2 运行时正确性已审）、MA3.1 P3-003（WARN 登记机制 family）、MA3.2/3.3 P3-003（跨包克隆家族批累计 8 处）、owner doc `docs/architecture/renderer-runtime.md` + `docs/context/codebase-map.md`（'use no memo' 专节登记）

## Purpose

对 flux-react（68 src/76 test，9,363 行，18 tsx）+ flux-bundle（3/3，152 行，1 tsx）执行代码质量审计（matrix MA3.4，四口径——**口径② React 19 本项首次 in scope**）。产出 arm2 报告并登记 arm2-index；零代码变更（P0 即时通道除外）。

## Current Baseline（2026-10-20 live 实测，HEAD `480e2e213`，工作树含并发线未提交文件——本项产物与提交不含之）

- **规模**：flux-react 68 src / 76 test / 9,363 行 / 18 tsx（口径：68/9,363 = 非 `*.test.*` 全集去除根级 test-support\* 与 `test-support/runtime.tsx`；18 tsx 为排除 test-support 口径——closure audit m3 勘正注）；flux-bundle 3 src / 3 test / 152 行 / 1 tsx。
- **口径② 基线**：`check:react19` 全仓 **0**；'use no memo' 本域 **2 件**（render-nodes.tsx:313 `RenderNodes`、node-renderer-resolved.tsx:66 `NodeRendererResolved`——均为**手写 `memo()` 包裹 + compiler opt-out** 组合，codebase-map.md 专节登记在案〔全仓 9 件族〕）；手写 `React.memo` 本域 2 处（node-renderer.tsx:66 / node-renderer-resolved.tsx:57）；useCallback/useMemo 使用 100 处分布 20 文件（React Compiler 基线下的手动记忆化密度，逐类复核）。
- **口径③ 基线**：oversized WARN 触及本域 **7 件**（实现 2：render-nodes.tsx 586〔render 管线根〕、schema-renderer.tsx 503〔主入口〕；测试 5：frame-slot-meta.test 656 / compilation-and-boundaries.test 642 / field-frame-layout.test 624 / form-state.test 590 / schema-renderer.test 514）——**均未登记**（MA3.1 P3-003 family）。
- **口径④ 基线**：TODO/FIXME/HACK 两包 **0**；`as any` **0**（`check:audit-as-any-casts` 口径，非测试件）；duplicates 触及本域 **11 处**（component-handle hooks 族 in-package 3 处〔use-input↔use-surface 10L / use-form-hooks 内部 12L / use-composite↔use-input 17L〕+ 跨包 industrial editor hooks 2 处〔workbench/use-editor-component-handles 9L、status-path↔serialization/equality 9L〕等——家族批清单累计）。
- **口径① 抽样初判**：render-nodes.tsx（RenderNodes 管线根，'use no memo' + 六上下文消费 + fragmentScopeCacheKey）、node-renderer-resolved.tsx（NodeRendererResolved memo 件）、schema-renderer.tsx（主入口）、flux-bundle/index.tsx（registry 装配 + plan 2474 轻子路径懒加载约定注释）。
- **churn（近 1 个月窗口实测）**：flux-react **163 触摸事件**（name-only 口径；unique 文件 100）——FM-7（plan 651）/FM-6（plan 649）/FM-4（plan 645）系列收口热点（抽检携 plan 号）。
- **WA 台账基线**：WA-react **13 条**（001-005/007/008 verified；006/009-013 found——011 status-path shallowEqualSummary / 012 hook-subscriptions 五连拷贝 / 013 七对小孪生，2026-10-18 fa636f3e2 入账）——无 open 件。
- **执行状态**：roadmap MA3.4 当前 `todo`；无已登记 `arm2-MA3.4-*` 报告。

## Goals

- 产出 `docs/audits/2026-10-20-HHmm-arm2-MA3.4-flux-react-bundle-quality.md`：双风格（multi + open），P0/P1/P2/P3 分级（P1 入 arm2-index，ID `P1-MA3.4-<nnn>`；发现归族 local/family/systemic）。
- 覆盖面（四口径）：① **实现质量**（核心路径抽读 ≥6：render-nodes / node-renderer / node-renderer-resolved / schema-renderer / hooks.ts 或 use-render-fragment / flux-bundle index——意图表达、复杂度组织、错误传播）；② **React 19**（in scope：'use no memo' ×2 与 codebase-map 登记一致性 + manual memo ×2 理由 + useCallback/useMemo 密度复核 + check:react19 0）；③ **重构候选**（oversized 7 件逐件裁定 + duplicates 11 处归族〔component-handle hooks 族〕）；④ **workaround 嗅探**（TODO 0 + WA-react 台账 13 条状态核对〔含 011/012/013〕+ 设计缝探测）。
- 产出即登记 `docs/audits/arm2-index.md`（MA3.4 行 + P1 行如有，精确行编辑）。
- BUILD_VERIFY：全量 `pnpm test`（Cross-Cutting 9，在 Closure Gates）。

## Non-Goals

- 零代码变更；命中只定级登记（修复归 MR2 批）。不预载 MA1.2/MA2.1 finding；测试组织归 MA4.1；订阅精度/重渲染深裁归 MA7.1（reactive reads 处理器内读取口径已由 MA2.1/2.3 确立）。
- 不执行 MA3.5 及以后工作项。

## Scope（必填节）

### In Scope

- `docs/audits/` 新建 1 份 arm2-MA3.4 报告 + `docs/audits/arm2-index.md` 登记回填。
- 只读取证：核心路径抽读 ≥6 文件、oversized 7 件逐件裁定、duplicates 11 处归族、React 19 三点（'use no memo'/manual memo/密度）、WA 台账核对、churn top、四口径扫描器复跑。
- `docs/logs/2026/10-20.md` 追加 MA3.4 条目；roadmap MA3.4 行状态流转。
- 收口提交：`fix(audit-r2):` 格式。

### Out Of Scope

- 任何代码/测试/配置变更（P0 即时通道除外）；定级命中修复；MA3.5+ / MR / MV / MG；并发线未提交变更（一律排除）。

## Failure Paths

| 可测场景编号   | 触发                                                                                                                      | 行为                                                                          | 是否可重试 | 用户可见表现   |
| -------------- | ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ---------- | -------------- |
| audit-p0-found | 发现 P0——Rule 2 全六类适用（本项高概率实例：render 管线断裂、核心渲染循环崩溃；示例须可归入六类之一，否则按 P1/报告登记） | P0 即时通道：plan 内追加 Fix Phase（判别测试先红后绿）或异步注入独立修复 plan | 否         | 无（修复先行） |
| scanner-drift  | `check:react19` >0 / as-any 本域 >0 / oversized 本域 unique 超 7 件 / TODO >0 / 'use no memo' 件数漂移                    | 停止收口，归因（应零代码变更），报告记录                                      | 是         | 无             |

预期不触发；预声明仅为通道完整性。

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**不适用**——纯审计取证 plan，零行为变更；全量 `pnpm test`（BUILD_VERIFY，Cross-Cutting 9 强制的 Proof 交付物）为 Proof 交付物。若触发 P0 追加 Fix Phase，自动升档 `必须自动化`（Cross-Cutting 11）。

## Execution Plan

### Phase 1 - multi 四口径取证

Status: completed
Targets: 报告草稿、`_tmp/`

- Item Types: `Proof | Decision`

- [x] **实现质量**（抽读 ≥6）：render-nodes.tsx（RenderNodes 管线根）、node-renderer.tsx（memo 件）、node-renderer-resolved.tsx（memo + use no memo）、schema-renderer.tsx（主入口）、hooks.ts 或 use-render-fragment.ts、flux-bundle/index.tsx（registry 装配）；每文件三问
- [x] **React 19 口径**（in scope 首项）：'use no memo' ×2 与 codebase-map 登记一致性核验；manual memo ×2（props 级）与 compiler opt-out 组合理由核对；useCallback/useMemo 100 处密度抽样（冗余手动记忆化 vs Compiler 基线——抽 3 处定性）；`check:react19` 0
- [x] **重构候选**：oversized 7 件逐件裁定（render-nodes/schema-renderer 管线核心 vs 测试 5 件归 MA4.1）；duplicates 11 处归族（component-handle hooks 族 + industrial 跨包 2 处并入家族批）
- [x] **workaround 嗅探**：TODO 0 复核 + WA-react 台账 13 条状态核对（001-005/007/008 verified + 006/009-013 found——011/013 与 P3-002 同缝定性）+ as-unknown-as 链探测
- [x] 深化机会：发现即记 systemic 候选

Exit Criteria:

- [x] 六文件三问记录落字；oversized 7 件逐件裁定行
- [x] 四口径基线对照行（react19=0 / 'use no memo' ×2 登记一致 / as-any=0 / TODO=0 / duplicates 11 处归族落字）

### Phase 2 - open 开放式追问（live 信号驱动）

Status: completed
Targets: 报告 open 段落

- Item Types: `Proof | Decision`

- [x] live 信号探针：churn 163 触摸（FM 系列亲核）、MA2.1 交叉点（reactive reads 处理器内口径）、'use no memo' 与 memo 组合的模式合理性
- [x] ≥2 轮开放式追问，每轮 live 证据或显式"未命中"；候选方向：render 管线六上下文消费的耦合面、component-handle hooks 族同构漂移、bundle 装配的懒加载边界
- [x] 深化机会与 MA4.1/MA7.1 交叉线索分栏记录

Exit Criteria:

- [x] open 段 ≥2 轮且每轮有证据；发现全部完成归族 + P 级判定

### Phase 3 - 报告落盘、arm2-index 登记与 BUILD_VERIFY

Status: completed
Targets: `docs/audits/2026-10-20-HHmm-arm2-MA3.4-flux-react-bundle-quality.md`、`docs/audits/arm2-index.md`、`docs/logs/2026/10-20.md`

- Item Types: `Proof | Decision`

- [x] 报告按附录 A 格式落盘（收口补记门禁节 + 复核统计），文件名含时间戳
- [x] arm2-index：MA3.4 行回填；P1（如有）入索引区（精确行编辑）
- [x] daily log 追加 MA3.4 条目（计数=报告实数）
- [x] 执行 Closure Gates 预声明的 BUILD_VERIFY（全量 `pnpm test`，Cross-Cutting 9 强制的 Proof 交付物）并登记

Exit Criteria:

- [x] 报告存在且 arm2-index 与报告逐条一致（编辑后 grep 复核行在位）
- [x] BUILD_VERIFY（`pnpm test`）exit 0（记录入报告收口补记/log）

### Phase 4 - 收口与状态流转

Status: in progress
Targets: roadmap、本 plan、git

- Item Types: `Proof | Follow-up`

- [x] draft review 通过后：roadmap MA3.4 `todo`→`planned`，本 plan `draft`→`active`
- [x] closure audit（独立 fresh-session 子代理）通过后：roadmap MA3.4 `planned`→`done`，本 plan→`completed`
- [x] 单次提交入库（本 plan + 报告 + arm2-index + log + roadmap），`fix(audit-r2):` 格式；标题不声称 `full-green verification`

Exit Criteria:

- [x] roadmap MA3.4 与 plan 状态流转一致
- [x] `git status` 复核提交仅含 In Scope 文件（并发线除外且未触碰）

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立 fresh-session 子代理填写。

- Reviewer / Agent: 独立 fresh-session 审查子代理（五项检查 + 扫描器/jscpd/台账实测复核 + 报告侧抽样）
- Verdict: R1 `revised`（0B/3M/2m）→ 回修（审查员预授权免复审直升 active）
- Rounds: 1
- Findings addressed: M1 WA-react 台账 10→**13 条**（漏 011/012/013——2026-10-18 fa636f3e2 入账；Baseline/Goals/Phase1 联动 + P3-002 同缝注）；M2 churn 159 不可复现→**163 触摸事件**（name-only 口径，unique 100）；M3 报告头状态超前→draft + 执行先于 review 门在本 record 留痕；m1 tsx 口径注（68 含 test-support、18 tsx 排除该件）；m2 家族批并清单列明 + as-any 口径钉 check:audit-as-any-casts

## Closure Gates

> 全量验证归此处（Rule 18）；BUILD_VERIFY 按 Cross-Cutting 9 预声明。

- [x] arm2 报告落盘且 Phase 1–3 Exit Criteria 全部满足（双风格两段齐备、收口补记门禁节实数）
- [x] arm2-index 登记（MA3.4 行 + P1 行如适用）与报告逐条一致
- [x] BUILD_VERIFY 全量 `pnpm test` 通过并登记
- [x] 执行期间核对 `check:react19`=0 / 'use no memo' 本域=2 件存量口径 / as-any=0 / oversized 本域 unique=7 件存量口径 / TODO=0
- [x] 不存在被静默降级的 in-scope 项（P2/P3 只入报告 deferred 区附定级理由）
- [x] roadmap Work Item Status MA3.4 行已流转 `done`（closure audit 通过后）
- [x] 由独立子代理（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（首轮 `approved` 0B/0M/5m 一行级——m1 残留旧数 10→13/m2 log 103→100/m3 口径注勘正/m4 churn 窗口敏感注/m5 符号名勘正，随收口 commit 落盘）
- [x] `pnpm typecheck`（既有登记红 playground vite.config 口径——零新增即通过）
- [x] `pnpm build`（同上）
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

（无——本 plan 无 deferred 预期；执行中若出现改判，当场落本节。）

## Non-Blocking Follow-ups

- no remaining plan-owned work（MG 候选：oversized WARN 登记机制〔MA3.1 P3-003 并案，本域 +7 件〕、handle hooks 三兄弟骨架〔P3-002 + WA-react-006 同族合并落点〕、跨包克隆家族批〔累计口径以 CX 批盘点为准〕、'use no memo' 件数棘轮〔codebase-map 登记表机械化〕）

## Closure

Status Note: MA3.4 全部 Phase 交付完成——报告双风格落盘（multi 四口径 + open 三轮）、arm2-index 登记（MA3.4 行唯一无重复，P1=0）、daily log MA3.4 条目、BUILD_VERIFY 与四门禁实测（test 82/82、lint 44/44、typecheck/build 既有登记红零新增）、零代码变更纪律经独立实测核验（含被审两包 focused 测试复绿佐证）。closure audit 首轮 `approved`（0B/0M/5m 一行级——9/9 对账全 PASS，m1-m5 随收口落盘）。P0=0/P1=0/P2=0、P3=2（oversized WARN family 本域 7 件并入 MA3.1 P3-003/component-handle hooks 族克隆并入家族批〔与 WA-react-006/011/013 同缝〕）。口径② React 19 首项 in scope 全合规。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh-session closure auditor（子代理，9/9 对账全 PASS + 补充实测〔被审两包 focused 测试复绿 629+9 passed〕）
- Evidence: 终局 `approved`（0B/0M/5m——"九条审核要求全数 PASS"；5m 机械订正随收口 commit 落盘，无需复审）

Follow-up:

- no remaining plan-owned work
