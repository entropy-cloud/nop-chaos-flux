# 645 最终成熟度审计 FM-4：React19 与运行时健壮性复查批（react19 review + audit 脚本全家 + UR-8/9 门禁复核）

> Plan Status: completed
> Last Reviewed: 2026-10-18
> Source: `docs/backlog/final-maturity-audit-roadmap.md` FM-4；`missions/final-maturity-audit.json` T2.3；口径 = `docs/skills/react19-best-practices-review.md`（自动化优先，人工只报 lint/check 拦不住的）
> Related: `docs/plans/643-final-maturity-fm2-code-quality-audit-plan.md`（completed，分片执行与台账先例）；`docs/backlog/cross-roadmap-remediation-roadmap.md` UR-8/UR-9（done 记录，门禁复核对象）

## Purpose

收官轮 React19 与运行时健壮性复查：react19 口径复查（自动化已稳定拦截的不重复报，人工只审 lint/check 拦不住的面）+ `audit:knip`/`audit:react-doctor`/`audit:mutants` 实跑对照基线（`audit:semgrep` 本机缺依赖——运行能力核查与环境事实记录，见 tool-unavailable） + UR-8 异步安全 / UR-9 错误传播 done 门禁复核无回退。发现三态归族落台账；P0/P1 当批修（不触保护区域）。

## Current Baseline（2026-10-18 live 核对）

- **自动化面已在门禁常开**：`pnpm lint`（含 check:react19 / react-hooks 全规则族）/ `pnpm check`（react19 + src-artifacts + scanner-baselines ratchet 等）——FM-3 收口实测 lint 44/44、check exit 1（唯一红 = knip xlang mock-server unused-file，并发 xlang 176032924 引入，归属已登记）。
- **未在门禁内、本批处置的**：`audit:knip`（对照 knip-baseline 949 条）、`audit:react-doctor`（npx react-doctor@latest）、`audit:mutants`（默认 = 既有 stryker.runtime.conf.mjs 既定 mutate 集）、`audit:semgrep`（本机缺依赖，见 tool-unavailable——仅能力核查与环境事实记录）。
- **UR-8/UR-9 done 记录**（cross-roadmap UR 表）：UR-8 异步取消安全统一 10 条（plan 635 核验回写，06-10 文档化注记落地）、UR-9 错误传播 13 条（plan 636 收口；19-16 部分修复，非严格外发收尾经判别实验改判 Deferred → flux-compiler report-only 通道 successor）。复核 = 抽查其 done 证据在 live 仍成立（不重做全量 23 条，抽样 ≥6 条覆盖两 UR）。
- **已知交叉**：FM-2 已审错误传播保真度（维度 19）并立案 FM-010/013/014，另 FM-011（action-runners AbortError 包装降级）与 FM-012（并行聚合丢 cancelled 旗标）恰在本批 UR 复核代表面相邻——相邻新缺陷按归属注记 FM-2 台账，不重复立案。plan 628 拥有 schema-renderer 失败态类型债等（628 Current Baseline 首条）。`fm2-code-quality-report.md` 四处显式"归 FM-4"记录面（§7 Automation 观察、§23 测试有效性记录面、knip 基线噪音 flagged 条目、audit 三脚本运行效果未评估）为 Phase 1 输入，逐条 triage/注记。
- **门禁基线**：master @ c24d65aae；lint 44/44、typecheck 42-43/44（playground vite.config 既有红）、check exit 1（唯一 knip xlang 归属红）。

## Goals

- audit 脚本处置完成：knip / react-doctor 实跑 triage，semgrep 运行能力核查与环境事实记录（tool-unavailable），mutants 按既有配置 bounded run——新发现立案、既有基线内注记不展开。
- UR-8/UR-9 done 门禁抽样复核 ≥6 条（覆盖两 UR 的代表性修复：异步 AbortError 透传、取消不触发失败分类、错误外发缝、诊断缝收敛），无回退结论或回退立案。
- react19 人工复查（自动化外）产出 findings：仅报 lint/react-hooks 规则族与 check:react19 拦不住的面（如跨组件状态所有权、subscription 粒度、effect 语义边界）。
- 全部发现三态归族落台账 FM-4 批；P0/P1 当批修。

## Non-Goals

- FM-2 已立案项（FM-008–FM-026）的修复；628 领地；xlang；新扫描器/规则建设（发现"应补自动化"仅记录）。
- Stryker 全量 mutation（成本不可控——bounded 裁定）。

## Scope

### In Scope

- audit:knip / audit:react-doctor 实跑 + semgrep 运行能力核查与环境事实记录（tool-unavailable）+ audit:mutants 按既有 stryker.runtime.conf.mjs 范围 bounded run（默认 = 该配置既定 mutate 集，偏离才需裁定）。
- 非门禁覆盖的 check:audit-_ 扫描器单跑一轮 + triage（fieldframe-bypasses / hardcoded-type-dispatch / missing-renderer-markers / non-retained-renderer-references / performance-suspects / reactive-render-reads / canvas-wrapper-a11y——19 个 check:audit-_ 扫描器中 7 个无门禁覆盖，roadmap FM-4 行 "check:audit-\* 全家" scope 由此满足）。
- UR-8/UR-9 抽样复核 ≥6 条。
- react19 人工复查分片（fresh sub-agent：flux-react + flux-renderers-\* 抽样的 effect/subscription/ownership 面）。
- 报告 `docs/audits/final-maturity-audit/fm4-react19-runtime-report.md` + 台账 FM-4 批 + 回写。

### Out Of Scope

- FM-2/FM-3 已立案项消化；628；xlang；门禁规则建设。

## Failure Paths

| 编号             | 触发                                                                                                              | 行为                                                                                                          | 可重试 | 用户可见表现 |
| ---------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------ | ------------ |
| tool-drift       | audit:react-doctor（npx latest）行为随上游版本漂移                                                                | 版本钉定记录 + 输出仅作参考线索不直接立案；经人工确认的才归族                                                 | 是     | 无           |
| tool-unavailable | audit:semgrep 本机缺依赖无法运行（2026-04-30 已登记：Python 3.14 无法构建 semgrep 依赖，docs/logs/2026/04-30.md） | 该脚本输出标注 environment-unavailable 并引用既有记录，不伪造实跑；如裁定替代安装渠道（pip/容器）则记录并补跑 | 是     | 无           |
| mutants-cost     | 既有 bounded run 仍超时/资源不可控                                                                                | 降级抽样 mutation run；范围与理由落报告                                                                       | 是     | 无           |
| ur-regressed     | UR-8/9 抽样发现回退                                                                                               | P0/P1 当批修（不触保护区）；P2/P3 立案归族 + UR 行注记回退坐标                                                | 是     | 视缺陷       |

## Test Strategy

档位选择（三选一）：`建议有测`

本档选择：**建议有测**——审计批以报告+台账为交付；当批 P0/P1 修复携带判别测试（先红后绿）。

## Execution Plan

### Phase 1 - audit 全家实跑 + UR-8/9 门禁复核

Status: completed
Targets: `docs/audits/final-maturity-audit/fm4-react19-runtime-report.md`

- Item Types: `Proof`

- [x] Proof：audit:knip / audit:react-doctor 实跑 triage；semgrep environment-unavailable 如实记录；audit:mutants bounded run（score 1.63 = 测量失真裁定，FM-029）；7 非门禁扫描器单跑 triage 零 P0/P1 新面；fm2-report 四处记录面逐条 triage（L173/L175 归 628、L211 本批已处置、L301 基线内存量归 628 收缩批）。
- [x] Proof：UR-8×4 + UR-9×3 抽样 7/7 无回退（迁移坐标全部核实；19-16 部分修复态与 Deferred 裁定一致；边界规则生效——19-02/19-05 与 FM-011/012 互不重叠注记在案）。治理发现：plan 636 收口提交状态翻转漏落 → 已按在案审计记录回填 completed（FM-030）。
- [x] 报告落盘（`fm4-react19-runtime-report.md`：Phase 1a 脚本处置表 + 1b fm2 移交 triage + 1c UR 复核 + react-doctor/mutants triage + Phase 2 react19 复查全文）。

Exit Criteria:

- [ ] 四脚本按 tool-unavailable 口径有记录与 triage 结论；非门禁 7 扫描器与 fm2 记录面 triage 完成；UR 复核 ≥6 条有 live 证据。

### Phase 2 - react19 人工复查（自动化外）+ 归族

Status: completed
Targets: 报告、`docs/audits/final-maturity-audit/ledger.md`

- Item Types: `Proof | Fix | Follow-up`

- [x] Proof：fresh sub-agent 人工复查完成（55 文件精读：flux-react 45 全量 + 渲染器抽样 10）——7 findings（1 P1 + 4 P2 + 2 P3），自动化基线干净，FM-2 面硬性去重。
- [x] Fix：P1 F1 container-hooks cleanup 守卫失效缺陷当批修复（判别测试 `container-hooks-registration.test.tsx` 旧实现红→绿，含 unmount 反向用例；flux-react 全包 624/624 绿 + tsc/lint 干净）。Phase 1 无 P0/P1 新发现（脚本 triage 零 P0/P1；UR 复核零回退）。
- [x] 台账 FM-4 批登记：FM-027–FM-030 共 4 条；uncovered=0。

Exit Criteria:

- [ ] 复查 findings 有证据且与 FM-2/628 去重；P0/P1 修复判别绿；台账 uncovered=0。

### Phase 3 - 回写收口

Status: completed
Targets: roadmap、mission、daily log

- Item Types: `Proof`

- [x] 回写：roadmap FM-4 `done`（表行按 closure M1 重写为标准列）、mission T2.3 `done`、daily log 收口记录——随本收口提交落盘。

Exit Criteria:

- [ ] 多面回写一致。

## Draft Review Record

- Reviewer / Agent: agent_416bae1d（fresh session 独立子 agent，两轮）
- Verdict: `revised`（R1 0B/3M/5m → 全量修订 → R2 0B/2M/3m 全机械项 → 修后升 active）
- Rounds: 2
- Findings addressed: R1-M1 semgrep 无 Failure Path → tool-unavailable 行 + 措辞统一；R1-M2 FM-2 交接面 → FM-011/012 交叉 + ur-regressed 边界规则 + fm2-report 四处记录面列 Phase 1 输入 + 七维度④去重 + 排除理由自述；R1-M3 roadmap "check:audit-\* 全家" scope 漂移 → 非门禁 7 扫描器单跑 triage 入 In Scope/Phase 1；m1-m5 全部落地。R2-M1' 五处"四脚本实跑"措辞统一 + baseline semgrep 注；R2-M3' Phase 1 checklist/Exit 补 7 扫描器与 fm2 记录面落点；R2 minor-A/B/C（19 扫描器/mutants-cost 行/waterfall 措辞）随手落。

## Closure Gates

- [x] 四 audit 脚本处置完成（三脚本实跑 triage + semgrep 环境事实记录；mutants 按既有配置范围 run）
- [x] UR-8/9 抽样复核 7 条无回退（治理发现 plan 636 状态漂移已回填处置）
- [x] react19 人工复查 findings 归族完毕；P0/P1 修复判别绿（FM-027）
- [x] 台账 FM-4 批 uncovered=0
- [x] 受影响 owner docs 已同步或明确 No owner-doc update required（修复为内部 hook 语义纠偏，无公共契约面变更）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect（F2–F5 P2 归族 FM-028 有 Why Not Blocking；FM-029 工具测量失真非产品缺陷）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] `pnpm check`（并发归属披露口径）

## Deferred But Adjudicated

（起草期无；执行中改判当场落此节。）

## Closure

Status Note: FM-4 三段交付全部落地：audit 全家处置（knip/react-doctor 实跑 triage + semgrep environment-unavailable + mutants bounded run 测量失真裁定 FM-029）；非门禁 7 扫描器单跑 triage 零 P0/P1 新面；fm2-report 四处移交记录面逐条 triage 闭合；UR-8×4+UR-9×3 抽样 7/7 无回退（迁移坐标核实、与 FM-011/012 边界注记）；react19 人工复查 55 文件 7 findings——**P1 F1 当批修复**（container-hooks cleanup 守卫失效，判别测试旧实现红→绿，审计员独立回退实验复核）+ 4 P2 归族 FM-028。治理发现：plan 636 收口提交状态翻转漏落，已按在案审计记录回填（FM-030）。台账 uncovered=0。收口审计 R1 `approved`（1M/2m 簿记级）。

Closure Audit Evidence:

- Auditor / Agent: agent_ddcc7a8d（fresh session 独立子 agent，单轮 approved）
- Evidence: A1 P1 修复经审计员独立回退实验（sha256 恢复）证实真判别（旧实现重渲染后注册丢失必红）+ flux-react 624/624 实跑绿；A2 脚本处置数据零造假（hardcoded-type-dispatch 零命中、performance 27、semgrep 无命中、mutants score 1.63 逐字核对）；A3 UR 复核抽 2 条 live 精确命中（tree-control-sources.ts:99-158、action-adapter.ts 零 console.error + cause 保留）+ plan 636 回填证据链完整（7bbeeb9f2 在案）；A4 fm2 移交面四处对上（knip baseline.json:567 登记）；A5 台账四行对应；B 诚实性核验（FM-029 测量失真有据、F2 P2 定级读码合理、FM-027 修复最小 churn 可忽略）；C/D 一致性与领地 PASS。发现 M1 roadmap 行畸形（重写修复）+ m1 creditable 拼写 + m2 坐标刷新，全部处置。详见 `docs/logs/2026/10-18.md`。

Follow-up:

- FM-028 四条 P2（loadMore 单槽 resolver/env 宽依赖/裸 disposeScope/StrictMode 生命周期派发）归 FM-6 候选；FM-029 stryker test-mapping 配置手术归 watch-only；react-doctor 686 条启发式存档不立案。

## Non-Blocking Follow-ups

- react-doctor 上游版本漂移跟踪（如裁定钉版本，记录于报告）。
