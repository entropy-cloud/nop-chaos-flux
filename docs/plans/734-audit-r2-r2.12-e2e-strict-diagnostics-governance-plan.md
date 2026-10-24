# 734 审计修复 R2·R2.12：门禁治理—e2e strict 诊断策略（P1-MA4.5-002）

> Plan Status: completed
> Last Reviewed: 2026-10-24
> Source: `docs/backlog/audit-remediation-r2-roadmap.md` R2.12（MR2.0/plan 713 展开）；`docs/audits/2026-10-22-0045-arm2-MA4.5-e2e-mutation-tests.md` §P1-MA4.5-002（Fix direction ①②③）；owner doc `docs/testing/e2e-standards.md`
> Related: plan 595（2f352d250 诊断策略 follow-up 收口）；R2.13（playground demo 真实红批）/ MV（全量 e2e）/ MG（③治理 guard 沉淀候选）
> 编号 runway：733 为 R2.11（本线）；734 本 plan；ARC 线从 735 起避开

## Purpose

e2e 零 console.error 门 × strict 诊断全 severity console.error 的同根交互治理（238/263 红同根，90.5%）：落地 Fix direction **② severity 分流**——default 诊断 reporter 按 severity 路由（error→console.error / warning+info→console.warn〔repo no-console 策略仅允许 warn/error 双通道——执行注记〕）。**诚实口径（review R1 M1 勘正）**：238 红语料主体为 strict 下 error severity（C1 unvalidated-component-target ×116〔action-selector-validation strict→error〕/ C2 unknown-property ×56〔closed-model strict→error〕/ C3 invalid-reaction-deps ×50〔error〕）——②仅使 info/warning 语料不再触门；**error 语料触门面须 ① 语料清洗收口后门才恢复判别力**（审计 Recommended Next #4 归因 ①）。① 归 R2.13（行 scope 扩入，见 Deferred）；③ 治理 guard 登记 MG 候选。finding 回填 `closed`（①③ 分工注记 + owner gap 披露）。

## Current Baseline（2026-10-24 live，HEAD `e02422b1a` 实测）

- `packages/flux-react/src/schema-diagnostics-reporter.ts:10-18`：createDefaultSchemaDiagnosticReporter 无条件 console.error（全 severity）；消费点 render-nodes.tsx:160 + schema-renderer.tsx:71（fallback reporter）；severity 联合 'error'|'warning'|'info'（schema-diagnostics-types.ts:1）。
- fail-fast 面正交：render-nodes.tsx:178 / schema-renderer.tsx:75 `failOnDiagnostics`（strictMode+shouldFailOnSchemaDiagnostics→collectedErrors throw）不受 console 路由影响。
- e2e 门：`tests/e2e/fixtures.ts:64/:79-80/:118`（console.error→toEqual([])/≤allowance）；playwright.config.ts webServer strict env。
- 既有测试无 reporter severity 路由 pin（grep 0）；plan 595 提交信息自认「e2e 未重跑见 follow-up」。
- roadmap R2.12 行 `todo`（:109）；arm2-index :167（005-002）状态 `open`、修复列 R2.12（review R1 m1 行号勘正）。

## Goals

- ② severity 分流落地（reporter 三路路由）+ 单元测试（severity→method 表驱动 + 既有字段格式不变），红证（还原全 error 路由 → warning/info 行红）。
- 代表性 e2e 验证：选一个审计取证点名的曾红 spec（ai-chat-states / ai-coverage 族）修复前红 → 修复后绿（live 演示门信号恢复）。
- finding 回填 `closed`（①归 R2.13、③归 MG 分工注记）；roadmap R2.12 翻转。

## Non-Goals

- ① 语料清洗（component:\* metadata / AMIS 风格 prop 清理 / reaction dependsOn——R2.13/后续行）；③ 治理 guard 机制（MG 候选）；fixtures 门放宽（保持零 console.error 严格）；并发线隔离。

## Scope（必填节）

### In Scope

- `packages/flux-react/src/schema-diagnostics-reporter.ts`（② severity 路由修复）
- `packages/flux-react/src/schema-diagnostics-reporter.test.ts`（新建，severity→method 表驱动）
- `tests/e2e/`（代表性曾红 spec 修复前后验证——只跑不改）
- `docs/audits/arm2-index.md` 回填 + daily log + roadmap R2.12 翻转（激活/收口两提交）

### Out Of Scope

- ① 语料清洗（R2.13）；③ MG guard；fixtures 门语义变更；R2.13-R2.15 与 R3.x；并发线（ARC WIP）。

## Failure Paths

| 可测场景编号   | 触发                                                   | 行为                                                                                   | 可重试     | 用户可见表现 |
| -------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------- | ---------- | ------------ |
| api-shape      | reporter 测试装配与规格不符                            | 以 schema-renderer.test.tsx console spy 惯用法校正                                     | 是         | 不适用       |
| gate-still-red | 代表性 spec 修复后仍红（该页存在 error severity 诊断） | 换审计取证点名且诊断为 warning-only 的页；两者皆 error 则如实记录为 R2.13 真实红并披露 | 是（一次） | 不适用       |
| blast-radius   | 修复破坏既有 fail-fast/strict 测试                     | 停：回退修复升级裁决（fail-fast 面正交性论证失效）                                     | 否         | 不适用       |

## Test Strategy

本档选择：**必须自动化**——红证 = 临时变异：reporter 还原无条件 console.error → warning/info 路由行红（缺陷本体：plan 595 的全 severity 路由即审计点名的交互根）。E2E live 验证 = 修复前该 spec 红（console 门触发）→ 修复后绿（基线对照）。

## Execution Plan

### Phase 1 - 分流修复与测试落地

Status: completed
Targets: schema-diagnostics-reporter.ts + 新测试

- Item Types: `Fix | Proof`

- [x] T1（reporter 表驱动测试）：severity→console 路由断言 ×4（error→error / warning→warn / info→warn〔repo no-console 策略仅 warn/error 双通道——三路收敛为两路，执行注记〕/ location 缺省无双空格）+ 消息格式 pin（含 sourceLocation 文件前缀与 .trim()）+ **同落 in-code 注释**（review R1 m3：reporter docstring / render-nodes / schema-renderer 三处措辞随分流更新）。（error→error/warning→warn/info→info）+ 消息格式不变（含 sourceLocation 文件前缀与结尾 .trim() 语义——review R1 m4：location 前缀+trim 均须 pin）+ **同落 in-code 注释**（review R1 m3：schema-diagnostics-reporter.ts docstring / render-nodes.tsx:157 / schema-renderer.tsx:63-64 三处「fallback console.error」措辞随分流更新）。红证：**M-A** 还原无条件 console.error → warning/info 行红。
- [x] T2（代表性 e2e live 验证，**两步门控**——review R1 M2 勘正：审计点名族为 ai-widgets 页（component:setSenderDraft 于 ai-widgets-demo.tsx），ai-chat-states 未被审计点名）：**leg 1 = HEAD 严重度探针**（修复前跑候选 spec——ai-widgets 相关 spec〔含 setSenderDraft 的页面族〕并捕获 console 输出 severity 分解）：探针示 warning-only → 该 spec 为 ② 的活体证据（修复前红/修复后绿对照留痕）；探针示 error-bearing → 该页属 error 语料（如实记录为 R2.13 输入并换 warning-only spec 重选）；探针示零诊断 → 换页重探。**leg 2** = 修复后复跑同 spec 留对照。结果如实入 plan。
- [x] flux-react 套件全绿复验（schema-renderer strict 相关用例不受扰；closure audit m1 补勾——auditor 独立复跑 655/655）。

Exit Criteria:

- [x] T1 绿证（4/4）+ M-A 红证留痕（warning/info 行红 2——缺陷本体）
- [x] T2 两步门控实证（**如实记录**）：ai-widgets 族 + component-handles playground = error 语料（fail-fast 编译抛、页面本体损坏——R2.13+ 输入，非 ② 可解）；ai-chat-states 零诊断已绿（修复前后双绿 vacuous）；complex-pages-interaction-state 9 用例绿；**warning-only 红样本采样未获——②效果为前瞻性记录**（warning/info 不再触门），门判别力恢复依赖 ① 收口
- [x] flux-react 包套件全绿：83 文件/655 用例（含新 4 用例）

### Phase 2 - 索引回填与收口

Status: completed
Targets: arm2-index、roadmap、daily log

- Item Types: `Proof`

- [x] arm2-index :167 回填 `closed` + 注记（②落地 + T2 实证 + ①③分工 + owner gap 披露）；Last Updated 滚动（open 34→33）
- [x] roadmap R2.12 `planned`→`done` 翻转（IN closure commit；激活提交 66d93016a 已先行翻转）

Exit Criteria:

- [x] arm2-index :167 状态与注记实测一致（open 34→33 grep 复核）；roadmap R2.12 行 `done`（收口提交内）
- [x] daily log R2.12 条目在场（随收口落）

## Closure Gates

- [ ] 全量门禁：typecheck / build / lint（实测 Tasks: N successful 计）+ test 全套件
- [x] `pnpm check` 零失败全链绿
- [x] M-A 红证复员（reporter 修复保留为唯一实现 diff——git checkout 曾误清、手动重落双核验）
- [x] owner doc：`docs/testing/e2e-standards.md` 零 console.error 门契约不变（No update required）+ 一句话记 diagnostics-vs-gate 交互（severity 分流后 error 触门）——review R1 m2
- [x] 独立 closure audit（fresh sub-agent `agent_42164006`，首轮 + 复审，输入=plan+diff summary+验证输出）：**approved** 0B/0M/2m（m1 flux-react 复验勾选补录〔auditor 独立复跑 655/655 核实〕、m2 in-code 注释 "/info" 措辞收紧随收口提交）——checklist 1-8 全 PASS：M-A 独立重演 2 红/复员 byte-identical、T2 如实记录三面一致（error 语料实证不越权声称门恢复）、fail-fast 正交复核（collector error 过滤 diff 仅注释）、open 33 程序化验证
- [x] 收口提交（flip `done` IN commit；记录复核结论）

## Deferred But Adjudicated

- **① 语料清洗归属**（review R1 M3 修正——R2.13 现行 scope 为 P1-MA4.5-003/004/005 不含语料清洗，owner gap 如实披露）：~222 error-red 语料清洗（component:\* target-binding metadata / AMIS prop 清理 / reaction dependsOn）**无既存 owner**——R2.13 行 scope 扩入（先扩行）或登记新行，归 closure audit/MV 裁决输入；severity 分流后 warning 语料仍可见 console.warn（可观测不致盲），error 语料触门面持续至 ① 收口。Classification: watch-only residual。Why Not Blocking Closure: ②即本行裁决面，①owner gap 已显式登记。Successor Required: 是（R2.13 扩行或新行，MV/人审裁决）。
- **③ 治理 guard**：「诊断策略变更类提交必须全量 e2e 复跑或显式登记 e2e 债」——沉淀候选移交 MG（audit 明示）。Classification: watch-only residual。Why Not Blocking Closure: 机制类沉淀归 MG 批次。Successor Required: 归 MG（非新设行）。

## Draft Review Record

- R1（fresh sub-agent agent_80d0901d，2026-10-24）：**FAIL** 0B/2M/1 gap/5m——M1 语料 severity 误判（238 红主体为 strict 下 error：C1×116/C2×56/C3×50——②仅解 info/warning，error 触门面归 ①收口后恢复判别力，Goals/Deferred 重述）；M2 T2 spec 引用失实（ai-chat-states 未被审计点名；setSenderDraft 在 ai-widgets-demo；改两步门控 HEAD 严重度探针）；M3 ① 语料清洗 owner 悬空（R2.13 现行 scope 不含——Deferred 改「扩行或新行」+arm2-index 披露）；m1 行号 :167；m2 owner-doc gate 条目补录；m3 in-code 注释三处同落；m4 消息格式 pin 含 location+trim。

## Non-Blocking Follow-ups

- 无（②即本行裁决面；①③分工如上）。

## Closure

- [x] R1 共识路径（reviewer 列明 M1/M2/M3+m1-m5 修复清单）后激活提交（Status→`active` + roadmap R2.12 `todo`→`planned` IN commit `66d93016a`；执行注记：激活编辑 python 引号失败一度 amend 缺编辑——文件型脚本重落+amend 修正）
- [x] 执行 Phase 1/2 → Closure Gates 全过 → closure audit 首轮 **REJECTED 后修正再提交** → closure audit **approved**（`agent_42164006`，0B/0M/2m）→ 收口提交（Status→`completed`、flip `done` IN commit）
- [x] Closure audit 记录：M-A 独立重演 2 红（warning+info 路由行——缺陷本体）/复员 byte-identical、fail-fast 正交复核（collector error 过滤 diff 仅注释）、open 33 程序化验证、T2 三面如实记录一致（error 语料实证不越权声称门恢复）、①owner gap/③MG 移交显式披露。
- [ ] 执行 Phase 1/2 → Closure Gates 全过 → closure audit PASS → 收口提交（Status→`completed`、flip `done` IN commit、记录复核结论于本节）
