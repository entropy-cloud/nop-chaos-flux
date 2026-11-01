# F1 统一 UX 验收（business-page-replication roadmap M4-F1）

> Status: Pass
> Date: 2026-11-02
> Plan: `docs/plans/838-business-replication-f1-unified-ux-acceptance-plan.md`
> Scope: M3 二十一复刻页统一验收（快照评审 / axe 全绿 / focus 抽查 / mobile viewport）

## 结论

**Pass。** 二十一页快照评审无布局破损/重叠/空态异常（4 项观测级发现全部登记 residual，无页面级缺陷）；axe 28 项扫描 `--retries=0` 零新增违规；focus 抽查 5 页 15/15 绿 + `check:focus-ledger` 绿；mobile viewport 验证由分支 B 扫描 + 页 spec 既有 mobile context 断言承载（覆盖齐备，无新增缺口）。

## 验收四支柱结果

| 支柱 | 结果 | 证据 |
| --- | --- | --- |
| 快照评审（21/21） | Pass，4 项观测级 residual | `_tmp/f1-snapshots/*.png`（1440×900，dev server strict 模式）逐页目检；发现清单见下节 |
| axe 基线全绿 | Pass | `a11y-axe-baseline.spec.ts` 28 项（桌面 25 + mobile 3）随 family 复跑 `--retries=0` 零新增违规（`_tmp/f1-family.log`） |
| focus 抽查 | Pass | W2/C3/O1/V3/W1 五页 `-g "focus"` `--retries=0` **15/15 绿**（`_tmp/f1-focus`）；`check:focus-ledger` exit 0 |
| mobile viewport | Pass | 分支 B（W1/M3/S1 mobile 画布 375×667 axe 扫描）+ 三页 spec 既有 hasTouch 交互断言（页 spec viewport 为 1280×800/1080 桌面壳；375×667 为 host override 固定画布，经 bbox `toBe(375)`/`toBe(667)` 断言承载）——程序化验证在案，无覆盖缺口（分支 C V3 已在 axe ROUTES ≈650ms 棘轮内，随 family 复跑覆盖） |

复跑口径：replication 全族 + axe 于 2026-11-02 以共享 dev server（strict 校验开启，端口 4203）`--retries=0` 实跑 **236 passed / 1 failed**；唯一失败 K2 `focus ③`（drawer 10s 未现）经单 spec 隔离 `--repeat-each=3`（12 test × 3 = **36/36 绿**，`_tmp/f1-k2-flake/.last-run.json` status passed）+ 同代码 1 小时前 P1 复跑全绿（无相关代码变更）→ 三证构成 contention，按 flake 台账口径登记 `docs/testing/e2e-flake-ledger.md`（plan 838 F1 登记行）；不属页面缺陷。

## 快照评审观测级发现（residual，非阻断）

| # | 页 | 观测 | 处置 |
| --- | --- | --- | --- |
| 1 | I1 资产台账 | queryForm「搜索/重置」与下方按钮对视觉重复（queryForm actions + crud 工具条两层） | residual——组合形态观感，非破损；demand-gated 改进候选 |
| 2 | I2 折旧仪表盘 | 近 12 月折旧趋势线量纲悬殊（累计 ~100 万 vs 本期 ~3.5 万）致本期线贴底 | residual——数据面真实、spec 有断言；双轴/归一化归 echarts 使用面改进候选 |
| 3 | W3 库存台账 | pivot 月份列序 2026-09/10/08 非时序 | residual——fixture 数据序，spec 断言与之一致；排序属 pivot 功能面 |
| 4 | V3 围栏地图 | 围栏 region 圆形要素在地图自动缩放下视觉不显（小圆点形态） | residual——geojson feature 计数/环闭合均有 vitest+e2e data-level 断言；渲染缩放归 map 组件面 |

无布局破损、组件重叠、空态异常或交互不可达页面。

## 证据命令

```bash
PLAYWRIGHT_PORT=4203 npx playwright test tests/e2e/replication-*.spec.ts tests/e2e/a11y-axe-baseline.spec.ts --retries=0 --output=_tmp/f1-family
PLAYWRIGHT_PORT=4203 npx playwright test tests/e2e/replication-ai-ticket-console.spec.ts --retries=0 --repeat-each=3 --output=_tmp/f1-k2-flake
PLAYWRIGHT_PORT=4203 npx playwright test tests/e2e/replication-{wms-wave-picking,crm-sales-dashboard,doc-ocr-workbench,iot-geofence-videowall,wms-pda-receiving}.spec.ts -g "focus" --retries=0
node _tmp/f1-snapshots.mjs   # 21 页快照 → _tmp/f1-snapshots/
node scripts/audit/build-focus-ledger.mjs && node scripts/check-e2e-flake-ledger.mjs
```
