# 644 最终成熟度审计 FM-3：测试保护力审计批（单测契约覆盖审计 + 探索性契约测试 + 探索性 e2e）

> Plan Status: completed
> Last Reviewed: 2026-10-18
> Source: `docs/backlog/final-maturity-audit-roadmap.md` FM-3；`missions/final-maturity-audit.json` T2.2；口径 = `docs/skills/unit-test-logic-and-contract-coverage-audit-prompt.md`（主）+ `docs/skills/exploratory-contract-testing-prompt.md` + `docs/skills/exploratory-e2e-testing-prompt.md`
> Related: `docs/plans/643-final-maturity-fm2-code-quality-audit-plan.md`（completed，台账/分片执行先例）；`docs/backlog/final-maturity-audit-roadmap.md` FM-3 行

## Purpose

收官轮测试保护力终审：不是覆盖率审计，而是"现有单元测试是否真的约束稳定契约、跨层逻辑与高风险行为"的审计（先识别稳定契约再看测试），叠加探索性契约测试（写最小复现测试探契约洞）与有界探索性 e2e。产出 = **判别性补测清单**（进 FM-6/FM-7 消化）+ 探索中落地的可保留测试；发现三态归族落 `docs/audits/final-maturity-audit/` 台账。roadmap 交互类判别测试缺位面（拖拽/全选等）为 FM-0 已部分补齐——本批审计其剩余面。

## Current Baseline（2026-10-18 live 核对）

- **测试体量**：`pnpm test` 82/82 任务全绿 exit 0（FM-2 收口实测）；flux-runtime 1543+1skip、flux-react 622、flux-renderers-data 1240、flux-renderers-basic 673、flux-ui 358（reviewer 实测复核）。
- **e2e**：`--list` 约 1,871 项（plan 623 口径）；`E2E_EXCLUDE_WATCH_ONLY=1` 干净运行开关在案；既有登记红 = c1a console 门禁（FM-005 外来红归 RM）、`gantt-bars-and-links.spec.ts` 交互既有红 5/5（FM-1b 收口对象；gantt/kanban perf 阈值项已被 plan 623 `@watch-only` 隔离，不构成红）、scada perf ×3 未裁决（归 628）。全量 e2e 最后全绿 sweep 为 2026-10-05（628 Baseline B 记录，全量 e2e 恢复归 628/FM-8——本批不做全量 sweep）。
- **FM-0 已补的交互判别面**：列宽拖拽三测 + 固定列状态叠加层判别 + 全选取证（`tests/e2e/table-interaction-maturity.spec.ts`）+ 行拖拽 CSS 契约（`packages/ui/src/__tests__/table-css-state-passthrough-contract.test.ts`）；compile cache runtime-identity 判别（FM-2，`compile-cache-runtime-identity.test.ts`）。
- **既有测试审计沉淀（去重对象，实际落点已核）**：`docs/audits/interaction-state/`（plan 543 系列）、`playwright.config.ts` grepInvert + e2e `@watch-only` 标记 + `docs/audits/visual-quality-r2/watch-pool.md`（plan 623）、`docs/backlog/audit-remediation-roadmap.md` Follow-up Backlog（plan 638 UR-11）；最相邻同方法前例 = `docs/audits/arm-MA4-core-runtime-test-coverage.md` 等测试覆盖审计 + `docs/analysis/2026-07-27-ma4-*-test-coverage/` 轮次目录——Phase 1 去重按此执行。
- **探索性测试的方法边界**（exploratory-contract-testing 口径）：写**失败测试**探洞 → 若证实为缺陷则立案（FM-6），测试本身保留为 regression 须以修复为前提；若测试通过（契约已守）则留为加固。本批新增测试一律标注来源（FM-3）。
- 台账/报告/分片执行先例：`docs/audits/final-maturity-audit/`（FM-0/FM-2 批）。

## Goals

- 单测契约覆盖审计：对核心链路（compile → runtime → render → action）与高风险面（表单提交/校验生命周期、selection/ownership、异步取消、scope 父子切换）产出"稳定契约 vs 测试约束"差距清单（每条：契约描述、现有测试为何守不住、建议补测形态）。
- 探索性契约测试：对差距清单的高价值子集实际写最小复现测试探洞——通过者留为加固测试（标注 FM-3），失败者证实契约洞 → 立案进台账（修复归 FM-6/FM-7）。
- 有界探索性 e2e：对交互判别缺位剩余面（弹层嵌套开合、分页 + keepSelectionOnPageChange、树/懒加载交互等 FM-1a 前哨）做 ≤6 个探针式 e2e，产出台账发现；不追求全量覆盖。
- 补测清单落盘 `docs/audits/final-maturity-audit/fm3-test-protection-report.md` + 台账 FM-3 批登记（补测项 disposition = local→FM-6 / systemic→FM-7 / watch-only）。

## Non-Goals

- 修复审计发现的缺陷本体（除探索性测试写作过程中暴露的 P0/P1，按 mission 预授权当批修；其余归族）。
- 大规模补齐补测清单（FM-6/FM-7 消化）。
- 全量 e2e sweep / 覆盖率数字工程；react19/运行时门禁（FM-4）。
- xlang 域；628 领地（验证基线恢复、静态债）。

## Scope

### In Scope

- 核心五包 + 渲染器三家族的契约覆盖差距审计（fresh sub-agent 分片：core 链路 / form 家族 / data+basic 家族）。
- 探索性契约测试 ≤10 个（高价值差距子集；新增测试文件按包归位 + `FM-3` 标注）。
- 探索性 e2e ≤6 个探针（新建 spec `tests/e2e/fm3-contract-probes.spec.ts` 或并入既有交互 spec；发现立案，探针按价值决定保留或删除——保留者须绿）。
- 报告 + 台账登记 + roadmap/mission 回写。

### Out Of Scope

- 628/FM-4/FM-1/FM-5 领地；xlang；补测清单的批量消化。

## Failure Paths

| 编号        | 触发                                       | 行为                                                                           | 可重试 | 用户可见表现 |
| ----------- | ------------------------------------------ | ------------------------------------------------------------------------------ | ------ | ------------ |
| probe-flaky | 探索性 e2e 探针暴露环境性 flake 而非契约洞 | 记录为环境观察不入 findings；探针删除或改造为稳定断言后重试                    | 是     | 无           |
| hole-p0p1   | 探索测试证实 P0/P1 契约洞                  | 按 mission 预授权当批修复 + 判别测试留档；触保护区域则仅立案（successor plan） | 是     | 视缺陷       |
| overlap-fm0 | 差距与 FM-0 已补判别面重叠                 | 注记"covered by FM-0"不重复立案                                                | —      | 无           |

## Test Strategy

档位选择（三选一）：`建议有测`

本档选择：**建议有测**——本批交付即测试面本身（新增探索测试 + 补测清单）。测试处置规则（对齐 exploratory-contract-testing 口径的复现保留要求，草案评审 R1 修订）：探洞**通过**者留为加固测试（全绿入库）；**P0/P1 契约洞**修复同批、修复后测试转绿留档；**P2/P3 契约洞**的失败复现测试**不得删除**——以 `it.skip` + 立案号注记形态留档（或复现草案落报告附录），不进默认绿套件，台账跟踪待 FM-6 消化转绿。

## 口径执行模型声明（草案评审 R1 修订）

本批为三份口径的 **bounded 采样执行**，不声称全口径执行：单轮三分片（非多轮至耗尽）；轮次/分片记录落报告附录而非 `docs/analysis/` 独立 run 目录。Phase 2/3 授权 fresh sub-agent 并行、分片文件合并（643 先例）。保留探针须含 console/pageerror 零报错断言；遇 FM-005 同类页面级外部红（无关诊断整 spec 拒绿）按 Failure Path probe-flaky 同类处理（注记外部归属，不立案）。

## Execution Plan

### Phase 1 - 契约覆盖差距审计

Status: completed
Targets: `docs/audits/final-maturity-audit/fm3-test-protection-report.md`

- Item Types: `Proof`

- [x] Proof：fresh sub-agent 三分片并行（core 链路 / form 家族 / data+basic 家族）按"先识别稳定契约（owner doc + public API）→ 对照现有测试约束力"方法产出差距清单（每条：契约出处、现有测试为何守不住、建议补测形态/优先级）；与 FM-0 已补面及 Baseline 所列沉淀去重；**分片允许零发现**（如实记录已检契约面即可，防凑数）。
- [x] 报告落盘（`fm3-test-protection-report.md`：62+ 契约面、25 差距 = 1 P1 + 13 P2 + 11 P3，含 20 行"已检充分"对照）。

Exit Criteria:

- [x] 差距清单覆盖三分片、每条有契约出处与测试证据（file:line），去重注记完整（643 已补面/MA4 前例/543-623-638 沉淀）。

### Phase 2 - 探索性契约测试（高价值子集实测）

Status: completed
Targets: 各包测试目录、报告更新

- Item Types: `Proof | Fix`

- [x] Proof：从差距清单选 ≤10 个高价值项写最小复现测试（选取理由在报告记录，可对账）；通过者留为加固（FM-3 标注），失败者证实契约洞 → 立案：P0/P1 修复同批 + 修复后测试转绿留档（授权依据：exploratory 口径"简单问题当场修复" + 643 终审批先例延伸，不触保护区域）；P2/P3 以 `it.skip` + 立案号注记留档复现（或草案落报告附录），不进默认绿套件。
- [x] 报告更新（每项：探洞结果 + 测试落点或立案号 + 选取理由；10/10 有结论 = 7 加固 + 2 立案 + 1 降级补测清单）。

Exit Criteria:

- [x] ≤10 项全部有探洞结论；入库运行的新增测试全绿；无以失败态运行的测试入库（P2/P3 复现以 skip+立案注记留档：FM-023/024）。

### Phase 3 - 探索性 e2e 探针（有界）

Status: completed
Targets: `tests/e2e/`、报告更新

- Item Types: `Proof | Follow-up`

- [x] Proof：≤6 个交互判别探针（弹层嵌套开合、分页 keepSelection、树懒加载、quick-edit 取消、列设置持久化、popover 内表单校验——主题多为 FM-1a 走查对象：**发现登记注记"FM-1a 前哨"坐标，FM-1a 同契约点走查引用既有台账行复检、不重复立案**）；发现立案，环境性 flake 按 Failure Path 处理；探针保留者须绿（含 console/pageerror 零报错断言）并纳入常规回归。

Exit Criteria:

- [x] 探针全部有结论（6 契约守住绿保留 + 2 watch-only 注记；零缺陷立案、零环境 flake 残留）；保留探针全绿（6/6，零报错分桶断言在案）。

### Phase 4 - 补测清单 + 归族收口

Status: completed
Targets: 报告、`docs/audits/final-maturity-audit/ledger.md`、roadmap、mission

- Item Types: `Proof | Follow-up`

- [x] 台账 FM-3 批登记：FM-022–FM-026 共 5 条（FM-022 fixed→verified；FM-023/026 watch-only；FM-024/025 local→FM-6 候选，FM-025 为 test-gap 批量行含 disposition）；uncovered=0。
- [x] 回写：roadmap FM-3 `done`（表行按 closure F1 重写为标准 5 列）、mission T2.2 `done`、daily log 收口记录——随本收口提交落盘。

Exit Criteria:

- [ ] 台账 uncovered=0；多面回写一致。

## Draft Review Record

- Reviewer / Agent: agent_57976e41（fresh session 独立子 agent，两轮）
- Verdict: `pass-with-minors`（R1 fail 0B/3M/8m → 全量修订 → R2 pass-with-minors 0B/0M/2m）
- Rounds: 2
- Findings addressed: R1-M1 失败测试处置与 exploratory 口径冲突 → Test Strategy 四分法（通过加固/P0P1 修转绿/P2P3 skip 留档不删复现）+ Phase 2 三态钉死；R1-M2 baseline 失实 → flux-react 622 实测数 + 去重对象真实落点 + MA4 前例补充 + gantt 拆分；R1-M3 口径简化未声明/并行未授权 → 「口径执行模型声明」节；m1-m8 全部落地（指针拆分/FM-1a 前哨防双记账/选取理由/test-gap 表示法/零发现分片/授权依据/owner-doc gate/gantt 拆分）；R2 m-R2-1 Exit 短语改写 + m-R2-2 "closure R1"→"草案评审 R1"（随手落）。

## Closure Gates

- [x] 差距清单覆盖三分片且有契约出处与测试证据
- [x] 探索性契约测试 ≤10 项全部有结论，新增测试全绿
- [x] 探索性 e2e 探针全部有结论，保留者全绿
- [x] 台账 FM-3 批登记完毕，uncovered=0
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect（P1 当批修复；P2 立案 skip 留档有去向；test-gap 批量行有 disposition）
- [ ] 受影响 owner docs 已同步到 live baseline，或明确 No owner-doc update required（本批预期仅新增测试与报告，无契约面变更）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] `pnpm check`（newHits=0，并发归属披露口径）

## Deferred But Adjudicated

（起草期无；执行中改判当场落此节。）

## Closure

Status Note: FM-3 三段交付全部落地：契约覆盖差距审计（三分片 62+ 契约面、25 差距 = 1 P1 + 14 P2 + 10 P3，closure 簿记勘误后口径）；探索性契约测试 10/10 有结论——**证实并同批修复 1 个 P1 真契约洞**（clearValueWhenHidden 豁免键被投影过滤器丢弃）、证实 2 个 P2 洞 skip 立案留档（input-suggest IME Enter、responsive 无名 fixed 列双索引空间）、16 例加固测试入库；e2e 探针 6/6 绿保留零立案。台账 FM-022–026 五条 uncovered=0。收口审计 R1 `approved`（0B/1M/4m，全部簿记级）。

Closure Audit Evidence:

- Auditor / Agent: agent_099e73dd（fresh session 独立子 agent，单轮 approved）
- Evidence: A1 P1 修复经审计员独立回退实验（cmp 字节级恢复）证实真修复真判别（旧代码下恰 C10-point-2 回归测试失败、其余 3 条通过——与"3 加固 + 1 修复回归"刻画逐字一致）；A2 双 skip 立案经静态读码证实为真缺陷复现（responsive.ts 双索引空间实锤、input-suggest 无 isComposing 守卫实锤）；A3 已约束抽查 3/3 属实；A4 台账五行一致；A5 门禁独立复跑（runtime 1549+1skip / data 1247+1skip / form 1131+1skip / e2e 6 passed / check 唯一红 knip xlang mock-server 归属 176032924 核实）；D 领地零越界（form.tsx 并发 IME diff 确认非本批）。发现 F1 [M] roadmap 表行畸形（随 Phase 5 重写修复）+ F2–F5 [Minor]（测试边界注记补入/簿记勘误/计数更正/oversized WARN 登记）全部处置。详见 `docs/logs/2026/10-18.md`。

Follow-up:

- FM-023（input-suggest IME）/ FM-024（responsive 双索引空间）待 FM-6 消化转绿；FM-025 test-gap 批量清单归 FM-6/FM-7 裁定；form-runtime-submit-flow.ts 505 行 oversized WARN 登记（拆分评估归后续小批，见 daily log）。

## Non-Blocking Follow-ups

- 补测清单中未被当批消化的项由 FM-6/FM-7 首批裁定（台账跟踪）。
