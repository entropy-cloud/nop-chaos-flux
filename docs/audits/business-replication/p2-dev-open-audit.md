# P2 开发阶段开放审计（business-page-replication roadmap M3-P2）

> Status: completed
> Date: 2026-11-01
> Plan: `docs/plans/837-business-replication-p2-dev-open-audit-plan.md`
> Auditor: 独立 fresh sub-agent（开放评审，不复用 P1 深审/执行者上下文）
> Scope: W1-V3 二十一复刻页三评审面——①P1 修复保真度对抗验证、②方法论盲区、③登记与勘误自洽
> Style: open-ended（对照 `docs/audits/00-audit-execution-guide.md`；Pass = 零 Blocker 零 Major）

## 结论 verdict

> **终态：Pass（round-2，2026-11-02）**——round-1 Fail（1 Major / 8 Minor），处置后复审零 Blocker 零 Major，8 条 Minor 全部处置且无静默降级（轨迹见下节「复审轨迹」）。

**Round-1 结论（2026-11-01）：Fail（1 Major / 0 Blocker / 8 Minor）。**

- **① 保真度对抗验证：通过。** 抽样全部五个 P1 修复页（C3/K2/M1/M2/S1），逐页打开 live schema/mock/spec 试图反驳「修复后 Pass」——五页修复全部为**真承载**（schema 参数/列/面板 + mock 消费/守卫 + spec 载荷级断言三层齐备），未发现任何「改测试不改页」型伪装收敛（逐页证据见 §1）。
- **② 方法论盲区：确认多处系统性遗漏面**（错误态 UI 可达性、双发/重复提交、空态分支、主题变体、动态播报可及性），均为 Minor 级、可登记或勘误处置，不动摇二十一页交付（§2）。
- **③ 登记自洽：发现 1 Major。** P1 REG-1 修复不彻底——R4 §2 / D4 §3.2 对 G14/G15/G19/G21/G22/G23/G24(绘制)/G25/G26-播放器 的登记去向断言在底账（missing-components L7.9 / improvement-analysis）中**无对应行**，与 REG-1 同一缺陷类的残余面未收敛（MAJ-1，§3）。按 plan 837 Failure Path `open-audit-major` 进入修复→复审循环。

## 审计方法

- 输入三件套：roadmap §2 W1-V3 页清单（`docs/backlog/business-page-replication-roadmap.md` L61-83）+ R1-R3 盘点 / D2-D4 设计（含各页实现勘误）+ P1 diff 摘要（plans 798-818 收口 commit、2e4faac41）+ P1 复跑证据（`p1-dev-deep-audit.md` §复跑与归因）。
- ①：对 C3/K2/M1/M2/S1 五页（P1 全部修复页）做「假设修复是伪装」的对抗阅读：先读 spec 断言，再反查该断言是否可能在不改变页面能力的前提下通过——逐页核对 schema 参数/列/面板 → mock 消费/守卫 → 断言确定性（fixture 数学）。附抽查 C2 时区勘误节与 live mock 对账。
- ②：以逐页审计模板（交互断言 + axe + focus）之外的正交轴系统扫描：错误态、并发/双发、空态/数据量边界、i18n/主题、axe 不可见的动态可及性；每轴在 live repo 找具体页/具体场景证据，不做泛泛推断。
- ③：以底账为锚反向对账——`missing-components-and-designer-roadmap.md`、`existing-components-improvement-analysis.md`、`amis-baseline-matrix.md`、`docs/testing/e2e-flake-ledger.md`、`tests/e2e/__fixtures__/axe-baseline.json`——逐条核对 P1 声称的登记与 D2-D4 勘误节的存在性与指向一致性。
- 未实跑 e2e（本审计为文档级开放评审；复跑证据以 P1 档 237/237 `--retries=0` 为基线，§5 命令供处置后复跑）。

## Findings

| #    | 页/面       | 类型   | 级别      | 证据                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | 建议处置                                                                                                                                                       |
| ---- | ----------- | ------ | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MAJ-1 | 跨页（登记） | 登记一致性 | **Major** | REG-1 修复只补了 G5/G9/G10 三行（`docs/backlog/missing-components-and-designer-roadmap.md` L182 L7.9），但同一断言面还有 9 项声称的登记去向底账无行：**missing-components 类** G15/G19/G21/G23/G25/G26-播放器（`docs/analysis/business-replication/r4-capability-gap-matrix.md` L62/L66/L68/L70/L72/L73「missing-components 需求行（demand-gated）」；全文件 grep G15/G19/G21/G23/G25 零命中底账，主题词 价格文本/bbox/DiffTree/ws 推送/轨迹/播放器 亦零命中）；**improvement-analysis 类** G14（input-image capture，R4 L61）/G22（compare 变体，R4 L69）/G24（map draw/modify，R4 L71）均标「improvement-analysis 新增条目」，而 `docs/components/existing-components-improvement-analysis.md` grep capture/compare/相机/绘制 零命中（L155 地图族登记的是 pin+geojson 叠加，非 draw/modify）。且 `docs/analysis/business-replication/d4-mall-doc-iot-design.md` §3.2（L432-443）逐行标「登记去向…一致 ✓」——该 ✓ 对空底账不成立 | 按 roadmap §Authority 补登：missing-components L7.9 扩行或新增 L7.10 收 G15/G19/G21/G23/G25/G26-播放器；improvement-analysis 补 G14/G22/G24 三条（G24 可并入既有地图族候选注记并写明 draw/modify 分项）；随后将 D4 §3.2 九行 ✓ 的指向改写为底账实锚（或先行把 ✓ 降为「待补登」）。补登后本 finding 转 Minor 级措辞对账并复审 |
| MIN-1 | C3         | 保真度残余 | Minor     | 全局筛选修复只覆盖 dashboardKpi/dashboardTrend 两源：`drillRows`/`forecastAccuracy`/`funnelSummary` 仍只消费 periodId（`apps/playground/src/complex-pages/page-schemas/crm-sales-dashboard.json` L44-45/L58-59；`mock-backend-repl-crm-c3.ts` L207-221 drillRows 仅 month、L220-221 forecastAccuracy 恒返回常量）——钻取明细与漏斗 bar 不随大区/团队筛选。勘误 P1-C3-1（`d2-erp-design.md` L412）只声明 kpi/trend 三维，未对该残余收窄显式裁决                                                                                                                              | D2 §2.6 勘误节补一条裁决（钻取/漏斗 bar 为期间单维，范围切片 demand-gated），或在 drillRows 携 scope 切片                                                                                                               |
| MIN-2 | K2         | 保真度残余 | Minor     | classify 修复真链路（schema 分类表单 `ai-ticket-console.json` L440-528 + mock `mock-backend-repl-ai-k2.ts` L411-425 持久化 + spec L372-396 载荷逐字段），但 `internalNote` 为**只写不读**：全 schema 仅出现在表单初值（L445）/字段名（L500）/payload（L527），保存后 drawer 无任何回显，mock 持久值亦无消费端——上游 R2 要素⑧「内部备注」的读面缺失                                                                                                                                                | drawer 分类区补备注回显（ticketFind 投影 internalNote），或 D3 §2.2 勘误补裁决「备注为录入面、回显 demand-gated」                                                                                                        |
| MIN-3 | C3         | 断言/错误态 | Minor     | mock 错误分支 `invalid period`（`mock-backend-repl-crm-c3.ts` L174-176）UI 不可达——period select 选项固定含 `''`（`crm-sales-dashboard.json` L82 C3_PERIODS、L110-127 options），spec 仅注释提及（`replication-crm-sales-dashboard.spec.ts` L33），零执行断言；同页 download 非法分支则有可达演练按钮（L236-252）+ spec 断言，错误态覆盖不对等                                                                                                                              | 勘误登记「kpi 错误分支仅 mock 契约面、无 UI 路径」，或经钩子强制非法 periodId 补一条渲染态断言                                                                                                                           |
| MIN-4 | 跨页       | 盲区/并发 | Minor     | 二十一份 replication spec 无一双击/重复提交防护断言（`grep dblclick tests/e2e/replication-*.spec.ts` 零命中）；M2 报工提交、O2 approve、C2 activityCreate 等写链均单击单发路径；O2 BATCH_STALE 为业务层 staleness，非传输层双发/竞态                                                                                                                                                                                                                                                               | demand-gated 登记（提交按钮 pending 防重为 ui/data 组件族横切能力），不阻塞本批验收                                                                                                                                      |
| MIN-5 | 跨页       | 盲区/主题 | Minor     | `apps/playground/src/complex-pages/shared/replication.css` 大量硬编码浅色：L103-110（促销横幅渐变 `#fff1f2/#fecdd3/#e11d48`）、L151（`--repl-low-confidence-bg: rgb(254,226,226)`）、L160-168（固定绿/橙/红文本色）；axe 基线与全部 spec 只跑默认浅色主题（`a11y-axe-baseline.spec.ts` 无 dark 变体）——深色主题下复刻页对比度/高亮面未验证，与 repo「Theme Independence」规则存在张力                                                                                                   | demand-gated 登记（复刻页主题适配随 F1 统一验收或 ui 主题线收敛），不在 M3 范围内静默扩大                                                                                                                                |
| MIN-6 | M1/C3      | 盲区/空态 | Minor     | 空态分支系统性无断言：M1 停机面板 `empty: 当前无停机`（`page-data-mes.ts` L197）fixture 恒非空、零 e2e；C3 drillRows 空集 face（mock L210-214 注释明示「name miss → empty set face」）无 UI 路径驱动且 spec 未断言；工单表 `暂无工单`（page-data-mes.ts L243）同面                                                                                                                                                                                                                                                              | 至少一页补 hook 驱动的空态渲染断言（如 M1 停机空 fixture 分支），或勘误登记「空态属组件族既有能力、复刻页不另验收」                                                                                                       |
| MIN-7 | M1/V1      | 盲区/可及性 | Minor     | 轮询更新无播报通道：M1 kpi interval=15s 静默轮询 + V1 interval 5s 轮询数值变化均无 aria-live/status region（entries 描述与 schema 零命中 `aria-live`；axe 静态扫描不覆盖动态播报）——屏幕阅读器用户对「实时刷新」零感知                                                                                                                                                                                                                                                                                            | improvement-analysis 登记观察项（echarts/stat-tile 实时族 live region 语义），owner 面                                                                                                                                  |
| MIN-8 | D2 文档    | 勘误自洽 | Minor     | `d2-erp-design.md` L691「R4 §2 G5 watch-only 需求行，不实现**不登记**」与同文件 L561「G5 → missing-components 需求行（demand-gated watch-only）」及底账 L7.9 实登三者互相矛盾（REG-1 修复后未同步 §6 表措辞）                                                                                                                                                                                                                                                                                                                 | 就地勘误 L691 为「不实现，已登记 L7.9 watch-only」                                                                                                        |

## §1 对抗验证逐页证据（五修复页全部真承载）

| 页   | 修复声称（P1）         | 反驳尝试结果                                                                                                           |
| ---- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| C3   | 筛选三维参数链         | 真：schema 两 data-source 携 territoryId/teamId（crm-sales-dashboard.json L12-16/L28-32）→ mock 读取并按份额切片金额面（crm-c3.ts L168-179/L195-204，比率类不切与勘误一致）→ spec 硬断言 hook query `toEqual({periodId:'2026-09',territoryId:'east',teamId:'key-account'})` + 720×0.5×0.6=216（spec L150-170）。改测试无法绕过 mock 消费面。残余见 MIN-1 |
| K2   | classify/内部备注      | 真：mock 工单带 aiCategory/category/internalNote（ai-k2.ts L55-59/L235-237）+ `classify` mutation 分支（L411-425）+ schema 分类表单提交链（ai-ticket-console.json L440-528）+ spec 载荷 `toEqual` 五字段（spec L372-396）。残余只写不读见 MIN-2 |
| M1   | 工单四档进度           | 真：mock dashboardKpi 增 workOrders + `workOrderBand` 四档函数（repl-mes.ts L144-164，边界 ≥100/≥50/>0/0 与设计一致）+ PAGE_DATA 第 9 面板 status labelMap/levelMap（page-data-mes.ts L196-231）+ spec 5 行 fixture 数学逐行断言文本与 `data-level`（spec L104-128） |
| M2   | reworkQty 列           | 真：schema 补输入列（含 min:0）+ aggregate sum（mes-work-reporting.json L174-181/L225-231）+ mock 类型/fixture/聚合写回（repl-mes-reporting.ts L129/L214/L369-375）+ spec 合计行 index 断言 + 交互④载荷 `toMatchObject({reworkQty: 2})`（spec L333-390） |
| S1   | 有界重转 + 硬断言      | 真：`selectFullSpec` 有界 3 次重转 + `expect(resolved.stock).toBeGreaterThan(0)` 硬断言（spec L143-154），跳过分支已删；另一处 `if (resolved.stock>0)` 双分支为缺货闸双态验证本体（spec L233-241），非静默跳过 |
| C2（附抽） | 时区窗口红根因 | 勘误 P1-C2 在 d2 L355；mock UTC 夹取与判别性回归（plan 819 TZ-1）在 P1 档有先红后绿证据，本轮未再反驳 |

## §3 登记自洽对账明细（已核实存在，佐证 MAJ-1 之外的登记面健康）

- missing-components **L7.9**（L182）：G5/G9/G10 demand-gated ✓（但仅此三项，见 MAJ-1）。
- improvement-analysis：§4 #9 inputClassName 死字段（L177，锚 types/schema.ts L158）✓；§3 地图族 pin+geojson 叠加候选（L155，含 matrix L225 `map` 别名同名不同物注）✓；§3 scheduling calendar UTC 日模型观察项（L157）✓。
- flake 台账：C1 focus③ 棘轮翻转 `ATTRIBUTED(contention)`（e2e-flake-ledger.md L38，三证齐全）✓。
- axe 棘轮：`tests/e2e/__fixtures__/axe-baseline.json` 含全部复刻页条目（sales-dashboard/ticket-console/shopfloor/work-reporting/sku-picker/hitl/ocr/ota/telemetry/geofence/pda/andon 均命中）✓；owner 债明细在 D4 各页 axe 注（如 d4 L158/L290 separator/tree role、L101 progressbar-name）✓。
- D2-D4 各页「实现勘误」节 + 「P1 审计裁决」条：逐页存在（d2 L101/L156/L209/L293/L346/L405/L479/L528；d3 L164/L231/L300/L352/L464/L565/L633；d4 L92/L147/L236/L280/L310/L338/L400）✓，与 live 修复页对账一致。
- 反向漂移一处：D2 L691「不登记」vs L561/L7.9 实登（MIN-8）。

## 证据命令

```bash
# ① 对抗验证阅读面（本轮以静态阅读完成；处置后复跑）
PLAYWRIGHT_PORT=<port> npx playwright test tests/e2e/replication-crm-sales-dashboard.spec.ts tests/e2e/replication-ai-ticket-console.spec.ts tests/e2e/replication-mes-shopfloor-board.spec.ts tests/e2e/replication-mes-work-reporting.spec.ts tests/e2e/replication-mall-sku-picker.spec.ts --retries=0 --output=_tmp/p2-open-audit

# ③ 底账反查（MAJ-1 证据）
grep -n "G15\|G19\|G21\|G23\|G25" docs/backlog/missing-components-and-designer-roadmap.md   # 零命中
grep -n "G15\|G19\|G21\|G23\|G25" docs/analysis/business-replication/r4-capability-gap-matrix.md
grep -n "capture\|compare\|相机\|绘制" docs/components/existing-components-improvement-analysis.md  # 零命中
# ② 盲区证据
grep -rn "dblclick" tests/e2e/replication-*.spec.ts   # 零命中
grep -n "invalid period" tests/e2e/ -r                # 仅注释
```

## 复审轨迹（round-2，2026-11-02，同一 fresh 审计上下文续审）

逐处对照 live repo 核验 round-1 处置五落点：

| 处置点 | live 证据 | 判定 |
| --- | --- | --- |
| ① L7.10 补登 | `docs/backlog/missing-components-and-designer-roadmap.md` L183：G15/G19/G21/G23/G25/G26-播放器六项 demand-gated 候选，锚 R4 §2 实行号（L62/L66/L68/L70/L72/L73），G26 iframe 半条维持 keep-out L183 不登记——与 round-1 finding 面完全一致 | ✓ |
| ② improvement-analysis 补登 | `docs/components/existing-components-improvement-analysis.md` L159（calendar UTC 观察项之后，2026-11-02）：G14 input-image capture / G22 compare 变体 / G24 map draw/modify + **MIN-7 aria-live 轮询播报通道** 一并收编 | ✓ |
| ③ D4 §3.2 就地勘误注 | `d4-mall-doc-iot-design.md` L445 表后注：诚实记载九行「✓」落表时点指向的底账行不存在（P1 只补三项），实锚改指 L7.10 + improvement 2026-11-02 登记；历史表格不改写、就地附注 | ✓ |
| ④ D2/D3 裁决条 | D2 L692 G5 行措辞勘误（「不实现不登记」→「不实现；已登记 L7.9…MIN-8 勘误」）；D2 L415 **P2-C3**（MIN-1/3/6 residual 显式化：筛选残余两源切面、invalid period 不可达、空集 face watch-only）；D3 L240 **P2-K2**（MIN-2 internalNote 只写不读 residual，回显 demand-gated） | ✓ |
| ⑤ plan 837 Deferred | `docs/plans/837-...p2-dev-open-audit-plan.md` L95-106：MIN-4（双击/重复提交防护）与 MIN-5（replication.css 深色主题）各带 `watch-only residual` 分类 + Why Not Blocking + Successor Path | ✓ |

**MAJ-1 消除判定**：round-1 列举的 9 项无底账断言全部落账（missing-components 6 项 + improvement-analysis 3 项），D4 §3.2「✓」断言面已实锚；无新增越权（全部只登记不立项，retention 未触碰）。

**Minor 处置诚实性判定**：8 条全部显式处置——MIN-1/3/6 → D2 P2-C3 裁决条（residual 显式化，非静默）；MIN-2 → D3 P2-K2；MIN-4/5 → plan 837 Deferred（带 Why Not Blocking）；MIN-7 → improvement-analysis 2026-11-02 登记收编；MIN-8 → D2 L692 就地勘误。无一条丢失或降级为不可追溯状态。

### 复审 verdict

**Pass（零 Blocker / 零 Major）。** 残留 8 Minor 全部为登记/勘误型处置，无 in-scope 缺口被静默降级。按 `00-audit-execution-guide.md` Pass 判定通过；plan 837 可进入 roadmap §2 P2 回写与 closure audit 流程。本报告无代码/测试变更，无需 spec 复跑。

## 复审入口（供 plan 837 Phase 1 处置）

MAJ-1 处置 = 底账补登（missing-components + improvement-analysis 共 ≤10 行/条）+ D4 §3.2 九行 ✓ 指向实锚 + D2 L691 一词勘误（MIN-8 可顺手同批）→ 复审仅需文档 diff 核对，无需 spec 复跑（无代码/测试变更时）。MIN-1/2/3 建议随勘误节同批裁决；MIN-4/5/6/7 按 demand-gated 登记进对应台账。
