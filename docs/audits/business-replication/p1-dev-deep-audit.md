# P1 开发阶段深度审计（business-page-replication roadmap M3-P1）

> Status: completed
> Date: 2026-11-01
> Plan: `docs/plans/819-business-replication-p1-dev-deep-audit-plan.md`
> Scope: M3 二十一复刻页（W1-W3 / C1-C3 / I1-I2 / K1-K3 / M1-M3 / S1-S2 / O1-O2 / V1-V3）

## 结论

**Pass（修复后）。** 四个独立 fresh 子 agent 分组审计二十一页（复刻保真度 / 断言真实性 / 登记一致性三维），首轮发现 **5 Major + 1 登记缺失 Major**；全部在本 plan 内修复或以文档裁决闭环，对应 spec `--retries=0` 复跑绿。另收口 plans 814-818 指派 P1 的 C2 日历月初时区窗口红（根因修复 + 判别性回归测试）。断言真实性总体健康：二十一份 spec 均为载荷级 / 数据面断言（写镜像逐字段、端点计数差值、确定性 fixture 数学、computed style），无空断言；首轮发现的弱断言（条件分支跳过 1 处、裸负等待 4 处、focus 口径 1 处）已全部加强。

## 审计方法

- **分组**：A 组 W1-W3+C1-C3、B 组 I1-I2+K1-K3、C 组 M1-M3+S1-S2、D 组 O1-O2+V1-V3，各由独立 fresh 子 agent（不复用执行者上下文）对照上游 R1-R3 盘点、D2-D4 设计（含各页「实现勘误」节、§5 断言清单、§6 边界）与收口 plan，逐页核对 live schema / mock / spec。
- **主审复核**：每条 Major 由主审打开对应 schema / mock / spec 行实证后处置；Minor 逐条裁决（修复 / 文档裁决 / 维持）。
- **判别性要求**：修复型 Finding 需有修复前必挂的证据（C2 时区回归、各 e2e 新增断言在修复前因字段/面缺失不可能通过）。

## Findings 与处置

| # | 页 | 类型 | 级别 | 证据 | 处置 |
| --- | --- | --- | --- | --- | --- |
| C3-1 | C3 | 保真度 | **Major** | 全局筛选 territoryId/teamId 仅 UI 呈现，五 data-source 只传 periodId，mock 零消费 | **修复**：dashboardKpi/dashboardTrend 携三维参数，mock 按份额切片金额面；e2e 交互①b 断言请求参数 + 216 |
| K2-1 | K2 | 保真度 | **Major** | R2 要素⑥「AI 自动分类/优先级可人工改写」、⑧「内部备注」全仓无踪迹 | **修复**：mock aiCategory/category/internalNote + `classify` mutation；drawer 分类表单；e2e 载荷逐字段 |
| M1-1 | M1 | 保真度 | **Major** | R2 要素③「工单四阶段进度」未落，原出处为清单遗漏型剪裁登记 | **修复**：mock workOrders（progressBand 四档）+ 第 9 面板 table status 配色；e2e 5 工单四档 data-level |
| M2-1 | M2 | 保真度 | **Major** | 报工明细缺「返工数 reworkQty」列（设计 + mock 均在） | **修复**：input-table 补列 + 合计 sum；e2e 载荷断言 reworkQty |
| S1-1 | S1 | 断言 | **Major** | 交互④⑤/focus② `if (stock<=0) return` 条件分支可静默跳过核心载荷断言（fixture 含缺货 SKU） | **修复**：selectFullSpec 有界重转 + 硬断言 stock>0，删除三处跳过分支与调试输出 |
| REG-1 | 跨页 | 登记 | **Major** | D2 §3.2 / D3 §6.1-6.2 / R4 §2 声称 G5/G9/G10 已登记 missing-components，底账无行 | **修复**：missing-components L7.9 补登三项 demand-gated 候选 |
| TZ-1 | C2 | 缺陷（P1 指派） | — | 日历 UTC 日模型 vs mock 本地月夹取 → UTC+8 每月 1 日 00:00-08:00 零事件 | **修复**：mock UTC 夹取；判别性回归测试（`page.clock` 2026-11-01T01:30+08:00 + Asia/Shanghai）修复前失败、修复后通过；日历 UTC 语义登记 improvement-analysis |
| O1-2 / O2-2 / V2-2 | O1/O2/V2 | 断言 | Minor | 「阻断」用 500ms 裸负等待 | **修复**：改字段错误 / wizard 校验 alert 确定性断言 |
| V2-3 | V2 | 断言 | Minor | focus ① 以 focus()+Enter 驱动，未走 Tab 序 | **修复**：真实 Tab 遍历至「下一步」 |
| V2-4 | V2 | 断言 | Minor | D4 §3.3 timeline 行数 = history 未断 | **修复**：断言 timeline-item = 6 |
| V3-1 | V3 | 断言 | Minor | D4 §3.3 圆形围栏几何 vitest 未做 | **修复**：`iot-fence-geojson.test.ts` 环闭合 + 偏差 < r×5% |
| S2-2 | S2 | 断言 | Minor | batch-bar 结算入口零 e2e | **修复**：交互⑦；顺带修复 toast `${count}` 越作用域（改 `COUNT($crud.selectedRowKeys)`） |
| W1-1 / W2-1 / C2-1 / C3-2 / C3-3 / K1 / M3 / S2-1 / O1-1 / O2-1 / V1-1 / V2-1 | 各页 | 保真度 | Minor | 静默收窄（无裁决出处） | **文档裁决**：D2/D3/D4 各页「实现勘误」节就地补「P1 审计裁决」条（扫描级防重、分组表次要落位、地址/团队、指标卡钻取并入 G8、pie 终态移除、附件灰区、快捷入口归 swipe-cell、sparkline、类型校验、掩码、时间窗、markFailed） |

已在案、非新 Finding（复核确认）：W1 focus 退守口径（D2 勘误 7）、C1 kanban 键盘层 `test.fail` 棘轮、C3/M1 echarts 像素点击 headless 不可达（实例 seam）、M2/M3/S2「证请求未发出」负等待（该语义下唯一口径，保留）。

## 登记一致性

- 本阶段新增登记：improvement-analysis §4 #9（inputClassName 类型死字段）、§3 地图族 pin+geojson 叠加候选、§3 scheduling calendar UTC 日模型观察项、missing-components L7.9（G5/G9/G10）；axe 基线 owner 债（table 列宽 separator、tree role、checkbox-group aria-required、壳 badge 对比度）；scanner-baselines map 名称碰撞（matrix L225 遗留 AMIS mapping 别名 ≠ flux geo map）。
- 与 roadmap §Authority 核对：新 type 候选只进 missing-components（不立项）、能力扩展只进 improvement-analysis、retention 未越权改动 amis-baseline-matrix；无重复立项。

## 复跑与归因

- C2 spec 10/10（含判别性回归测试）；C3 10/10、K2 12/12、M1 9/9、M2 12/12、S1 12/12、S2 11/11、O1+O2+V2 25/25，均 `--retries=0`。
- replication 全族 + axe `--retries=0` 复跑 **237/237 全绿**（2026-11-01，6.1m，`_tmp/p1-phase2-family.log`）。
- 全仓 `pnpm test:e2e` 实跑（workers=2、retries=0、57.3m）：**242 failed / 1896 passed / 46 skipped**（`_tmp/p1-phase2-full.log`）。逐红归因表（独立子 agent 按 PH-9 台账 F1-F9/D/E/C 逐名 + plan 836 台账外清单对账）：

| 归因类 | 项数 | 明细 |
| --- | ---: | --- |
| 复刻族 | 1 | `replication-crm-opportunity-kanban.spec.ts:436`（C1 focus③，test.fail 棘轮负载翻转；隔离 `--repeat-each=3` 30/30 绿 → flake 台账 `ATTRIBUTED(contention)` 登记） |
| PH-9 台账在册 | 237 | F1×144、F2×55、F3×3、F4×1、F5×1、F6(D)×6、D 路由清单×1、F7 45s 超时×6、F9×19、C-flaky×1（flow-designer ring） |
| plan 836 在途台账外 | 1 | `w3d-editor.spec.ts:70`（TipTap 列表切换，E2 漂移族余项；归 plan 836 收敛） |
| 新红/未归因→归因 owner | 3 | `complex-pages-interaction-state.spec.ts:180`（picker 指针点击未开弹层）、`renderer-lab-interaction-state.spec.ts:114`（提交后 evaluate 被导航销毁，疑似意外导航行为）、`table-virtual-body.spec.ts:43`（scrollTop=0）——均复刻族外，归各组件 owner / plan 836 域同类台账外收敛，登记不静默 |

- 与 2026-11-01 deep-audit 基线（231 在册 + 19 台账外）对比：净 −8。E1 时间边界族本轮全量零复现（C2 UTC 修复 + 836 在途）；F2 语料 9 项转绿（select/c2-3 语料，疑似在途 WIP 修复面，记观测）；台账外 19 → 1 + 新红 3。
- 负载抖动面裁决：M1 交互①、S1 :189 本轮全量未复现（观测结论，维持 `--repeat-each` 复绿口径）；新观测 C1 focus③ 棘轮翻转一件，已按 contention 登记 flake 台账（`docs/testing/e2e-flake-ledger.md`，`check:e2e-flake-ledger` 绿）。

## 证据命令

```bash
PLAYWRIGHT_PORT=<port> npx playwright test tests/e2e/replication-*.spec.ts tests/e2e/a11y-axe-baseline.spec.ts --retries=0 --output=_tmp/<dir>
PLAYWRIGHT_PORT=<port> npx playwright test tests/e2e/replication-crm-customer-360.spec.ts -g "时区窗口回归" --retries=0
cd apps/playground && npx vitest run src/complex-pages/__tests__/iot-fence-geojson.test.ts src/complex-pages/__tests__/page-schemas-validation.test.ts
```
