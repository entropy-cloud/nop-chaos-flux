# F4 验证阶段开放审计（business-page-replication roadmap M4-F4）

> Status: Pass（final；round-1 一次通过，零 Blocker / 零 Major / 3 Minor）
> Date: 2026-11-02
> Plan: `docs/plans/844-business-replication-f4-verification-open-audit-plan.md` Phase 1
> Auditor / Agent: 独立 fresh sub-agent（不复用执行者与 F3 深审上下文；只读 + 本报告新建）
> 审计输入三件套：roadmap 全链状态（§2 全部行 + 头部 + ★ 定义 + Rules）、F1-F3 交付摘要（F1 plan 838 / F2 plan 842 / F3 plan 843 均 completed + closure approved）、验证证据（`_tmp/f1-snapshots/` 21 张、`_tmp/f1-family.log` 236 passed/1 failed、flake 台账 C1/K2 行）

## 结论（Verdict）

**Pass（round-1 即终态）。** F1 四支柱证据经独立复核全部成立、不可反驳；验证阶段四支柱模型经盲区评审无必须处置的真盲区（长时稳定性/数据规模/并发/i18n/主题均属 1.0 承诺口径外，登记即可）；F3 留裁量两项观测均裁定 **accept as residual**；roadmap 收口条件核对自洽（M1-M3 行状态与 plan 终态一致、M4 三 done + F4 本审计、审计纪律每阶段两审计项齐备、全链审计轨迹 R5/R6→D5/D6→P1/P2→F3/F4 完整）。**本审计通过后 roadmap 具备收口条件**：★ 上游典型页面复刻 1.0 里程碑解锁（M1-M4 全 done）。

## 方法

1. **验收结论可反驳性**：独立重跑证据核对命令（未复用 F3 结论）——`tail` family.log 实证 236/1 计数与唯一红 K2 focus③ 定位；`ls` 快照目录实证 21 张；flake 台账逐字核对 C1/K2 两行三证结构；`.last-run.json` 双读（k2-flake/focus 均 `status: passed`）；快照独立目检抽 4 页（K2/W1/O1/M3）；focus 断言与 mobile bbox/hasTouch 断言在 spec 源码逐行抽查（W2 focus①、W1/M3/S1 `toBe(375)/toBe(667)`）。
2. **方法论盲区**：对照 roadmap F1 行四要素与 D1 §3/§4 承诺口径，逐面排查长时稳定性、数据规模边界、并发操作、i18n/主题、错误路径五类候选盲区，判定口径归属。
3. **roadmap 收口条件**：§2 全部 31 行状态逐行比对 plan 终态（838/842/843 头部 `Plan Status: completed` 实证）；头部、★ 行、Rules（审计纪律、Milestone 不带状态）、全链审计轨迹自洽性核对。

## 评审面 ①：验收结论可反驳性——反驳尝试全部失败

| 复核点 | 独立取证 | 结果 |
| --- | --- | --- |
| family 复跑计数 | `_tmp/f1-family.log:284` `236 passed (6.5m)`；:282 `1 failed` 唯一红为 `replication-ai-ticket-console.spec.ts:428 focus ③` | 与 F1 报告 :21 逐字一致 |
| 快照 21/21 | `ls _tmp/f1-snapshots/ \| wc -l` = 21，文件名与 F2 §1 二十一页一一对应 | 成立 |
| 快照独立目检（4 页） | K2：六列看板/统计带/SLA 剩余渲染完整，无重叠破损；W1：375×667 画布居中嵌桌面壳、扫码表单全要素；O1：wizard 四步导航+原票对照+image-compare 分隔线正常；M3：倒计时超时标红（00:00:00 红字）+未关闭任务计数+响应超时 toast 均如实渲染 | 无页面级缺陷；4 项 F1 residual 描述与目检相符 |
| flake 台账两行三证 | `docs/testing/e2e-flake-ledger.md` C1 行（ATTRIBUTED(contention)，plan 819 P1 登记：单次红/p1-c1-flake 30/30 绿/P1 同代码全绿）与 K2 行（ATTRIBUTED(contention)，plan 838 登记：单次红 `_tmp/f1-family.log` #58/隔离 36/36 `_tmp/f1-k2-flake`/P1 1h 前同代码 237/237 绿） | 两行三证结构齐备、证据指针在案 |
| 隔离复绿证明 | `_tmp/f1-k2-flake/.last-run.json` 与 `_tmp/f1-focus/.last-run.json` 均 `{"status":"passed","failedTests":[]}` | 成立 |
| focus 断言抽查 | W2 spec :283 `focus ① 板 tab 首站可达` 为真实键盘链路断言（tab walk 至 tabs trigger），非空转 | 断言实质性成立 |
| mobile 断言抽查 | W1 :32 `viewport 1280×800 hasTouch` + :65-66 `toBe(375)/toBe(667)`；M3 :103/:113-114；S1 :159/:168 同构——与 F1 报告 mobile 支柱（经 F3 MIN-2 勘误后口径）逐行一致 | 断言深度足够、口径准确 |
| axe 28 项 | `a11y-axe-baseline.spec.ts` ROUTES（桌面含 V3）+ MOBILE_ROUTES（3）结构在案，随 family `--retries=0` 复跑零新增（family.log 无 axe 红） | 成立 |

**结论：四支柱 Pass 无法被反驳。** 唯一红已按台账口径三证登记为 contention，不属页面缺陷。

## 评审面 ②：方法论盲区评审

| 候选盲区 | 判定 | 依据与具体页/场景 |
| --- | --- | --- |
| 长时稳定性（soak/内存泄漏/轮询长跑衰减） | **1.0 口径外，登记即可** | roadmap F1 行/plan 838/D1 §3 均未承诺；V1 5s 轮询、M1 相位推进仅验证短窗行为断言。登记为复刻 1.0 后 demand-gated 候选（可在 F2 §3 备忘口径下按域演进） |
| 数据规模边界（大数据量分页/渲染性能） | **1.0 口径外，登记即可** | fixture 均为小数据集（K2 21-28 行、V1 288 点为最大）；O2 跨页批量、M3/S1 infinite-scroll 已覆盖分页链路正确性，但千行级规模/性能未测。属 perf/规模测试专项，非 UX 验收口径 |
| 并发操作（多用户竞争写） | **1.0 口径外，登记即可** | mock 单用户；乐观锁语义已由 O2 STALE/BATCH_STALE、K3 HITL 交接卡在契约层覆盖——单客户端并发态竞争（两 tab 同写）未测，属后端联调口径（roadmap §Authority：业务逻辑一律 mock） |
| i18n | **1.0 口径外，登记即可** | 二十一页均为 zh-CN 单语；roadmap/D1 未承诺多语。flux i18n 体系属全局基建面，非本 roadmap 验收要素 |
| 主题 | **1.0 口径外，登记即可（附 Minor MIN-3 观测）** | 主题独立性按 repo 全局契约（theme-compatibility）约束，快照在 light 主题下评审；dark/多主题视觉回归未做。属全局主题面，非 F1 承诺口径 |
| 错误/失败路径 | **非盲区** | 各页 spec 已覆盖守卫分支（ILLEGAL_TRANSITION/STALE/GATE_NOT_PASSED/ACK_FAILED/REASON_REQUIRED 等），F2 §1 验收面可证 |

**F3 留裁量两项观测——裁量结论：**

1. **responsive 形态（快照单 1440×900 viewport 口径外）→ accept as residual。** D1 §3 快照无 viewport 形态要求、plan 838 Goals 仅「跨页快照评审」、roadmap F1 行「浏览器快照评审」——承诺口径内无违约；mobile 页已有 375×667 画布 bbox 断言 + 分支 B axe 承载。窄桌面/平板形态视觉评审留 demand-gated（若后续出现窄屏复刻需求再立项）。
2. **K2 看板第 4 列 1440 宽横滚裁切 → accept as residual。** 本审计独立目检复核确认该形态存在（已解决列右缘裁切）但属 kanban 横向滚动组件设计形态，非布局破损/数据丢失；与 F1「无布局破损」结论不冲突。建议随 MIN-1 勘误在 F1 residual 节补一句记名注记（见 MIN-2），不要求行为处置。

## 评审面 ③：roadmap 收口条件核对

| 核对项 | 取证 | 结果 |
| --- | --- | --- |
| M1（R1-R6） | 六行全 `done`，plans 786-791，交付文件在 `docs/audits/`、`docs/analysis/` 在案 | 一致 |
| M2（D1-D6） | 六行全 `done`，plans 792-797 | 一致 |
| M3（W1-V3 + P1 + P2） | 二十一页行 + P1/P2 全 `done`，plans 798-819/837 | 一致 |
| M4（F1-F4） | F1/F2/F3 `done`（plans 838/842/843 头部 `Plan Status: completed` 实证）；F4 `planned`（plan 844 active，即本审计） | 一致 |
| ★ 里程碑 | `unlocks when M1-M4 all done`；Milestone 不带状态（Rules 自洽）；达成记录载体为 §2 末 ★ 行就地附注（plan 844 Phase 1 收口步骤） | 待本审计 Pass 后由 plan 844 回写（头部终态 + F4 done + ★ 附注一次完成） |
| 审计纪律（每阶段两审计项） | M1 R5+R6 / M2 D5+D6 / M3 P1+P2 / M4 F3+F4，deep+open 成对齐备，八份报告均在 `docs/audits/business-replication/` | 齐备 |
| 全链审计轨迹 | R5/R6→D5/D6→P1/P2→F3/F4 逐环交付且后环引用前环结论（F3 引 F1/F2、本审计输入含 F3 终态） | 自洽 |
| 头部状态 | `:4` 仍称「F3〔plan 843〕planned、F4 todo」与 §2 :91 F3 `done` 矛盾——**该 drift 已在 plan 844 Baseline 记名**，消除动作即本 plan 收口回写步骤本身 | 见 MIN-1（已登记，非新增） |

## Findings

| # | 级 | 面 | 位置 | 发现 | 处置 |
| --- | --- | --- | --- | --- | --- |
| MIN-1 | Minor | ③收口核对 | `docs/backlog/business-page-replication-roadmap.md:4` | 头部仍称 F3 `planned`/F4 `todo`，与 §2 F3 `done`、F4 `planned` 滞后一拍。非新增发现——plan 844 Baseline 已记名该 drift，且消除动作即本 plan 收口回写（头部终态 M1-M4 全 done + F4 done + ★ 附注） | 随 plan 844 收口回写一并消除（已在 Goals 内）；不得遗留至 roadmap 归档后 |
| MIN-2 | Minor | ②裁量观测 | `docs/audits/business-replication/f1-unified-ux-acceptance.md` §residual | K2 看板第 4 列横滚裁切（F3 MIN-4 观测）未在 F1 residual 节记名；本审计裁量 accept as residual，但建议就地补一句注记使其与其他 4 项观测同级可见 | 可选就地补注；不阻断 |
| MIN-3 | Minor | ③收口核对 | roadmap K2 行（:69）vs F2 §1 K2 行 | K2 e2e 计数口径不一致：roadmap 行「e2e 11 测试」（plan 807 收口时点）vs F2 §1「e2e 12 测试」（终态实测 12，含 plan 838 侧补充确认 dialog 用例——roadmap 行已注「确认 dialog〔plan 侧补充〕」但未同步计数）。属历史行快照 vs 终态台账的口径差，非交付缺陷 | 登记即可；无需回改 roadmap 历史行（F2 §1 为终态权威） |

**零 Blocker / 零 Major → Verdict: Pass（round-1 终态）。**

## 证据命令（本审计独立取证所用，可复跑）

```bash
tail -8 _tmp/f1-family.log                                  # 236 passed (6.5m) + 1 failed（K2 focus③ :428）
ls _tmp/f1-snapshots/ | wc -l                               # 21
grep -n "contention" docs/testing/e2e-flake-ledger.md       # C1/K2 两行三证
cat _tmp/f1-k2-flake/.last-run.json _tmp/f1-focus/.last-run.json   # 均 passed
grep -n "toBe(375)\|hasTouch" tests/e2e/replication-{wms-pda-receiving,mes-andon-material,mall-sku-picker}.spec.ts
sed -n '283,305p' tests/e2e/replication-wms-wave-picking.spec.ts   # focus① 实断言
grep -c "test(" tests/e2e/replication-ai-ticket-console.spec.ts    # 12（F2 §1 口径）
grep -n "^> Plan Status" docs/plans/84{2,3,8}-*.md                 # 均 completed
sed -n '4p;89,92p;94p' docs/backlog/business-page-replication-roadmap.md
```

快照独立目检抽 4 页：`_tmp/f1-snapshots/{ai-ticket-console,wms-pda-receiving,doc-ocr-workbench,mes-andon-material}.png`。

## 复核要求

MIN-1 由 plan 844 收口回写步骤内在覆盖（头部终态 + F4 done + ★ 附注），无需重审；MIN-2/MIN-3 登记即可。本报告可直接归档为终态 Pass，无重派 round 必要。
