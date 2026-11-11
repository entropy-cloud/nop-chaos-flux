# e2e 基线 — 2026-11-11 全量运行（plan 836 Phase 4 权威基线，逐名对账）

> Owner doc: `docs/testing/e2e-baseline-ledger.md`（PH-9 权威台账，2026-10-26 快照本体）。本文件为滚动后的当前权威基线节，plan 836 Phase 4 产出。

> Owner: plan 836 Phase 4（`docs/plans/836-e2e-post-ledger-reds-plan.md`，处置表 15 行在其「Phase 3 处置表」）；对账底稿 `_tmp/audit-1106/836-reconcile-1112.txt`（程序化逐名匹配 PH-9 台账 F1–F9/D/E/C 条目）。台账主文件本节位置留有指针。

### 运行元数据

| 项       | 值                                                                                                                                                                                          |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 运行日期 | 2026-11-11 08:36–10:04（1.5h）                                                                                                                                                              |
| 命令     | `PLAYWRIGHT_PORT=4291 E2E_EXCLUDE_WATCH_ONLY=1 npx playwright test --output=_tmp/audit-1106/836-full-e2e`（自有端口隔离，排除并行会话 WIP 干扰）                                            |
| 树状态   | 工作区未提交改动 = plan 836 全部产品修复（prosemirror overrides / industrial 19 契约 / content 3 契约 / form checkbox-group 契约 / linear schema+css）+ spec 修正；`pnpm-lock.yaml` 已同步  |
| 结果     | **1959 passed / 169 failed / 7 flaky / 30 skipped**（总 2165，比 11-01 基线 2140 净增 25 用例）                                                                                             |
| 证据     | 全量日志 `_tmp/audit-1106/836-full-e2e-full.log`；失败唯一名 `_tmp/audit-1106/836-full-failed-unique.txt`；隔离复验（2026-11-12，port 4293，--retries=0）`_tmp/audit-1106/836-iso-1112.log` |

### 对账结论

失败集（unique 168 项，不含 flaky）逐名归位：**PH-9 台账在册复现 164**（F1–F5 诊断语料族、F6 locator 歧义 ×6、F7 超时族 ×6、F9/F9 增补稳定红；其中含 836 归并不改 ai 定义/cron 的 4 项：ai-component-handle ×2、playground-entry ai 冒烟 ×2——均本就在 F1 名录内）**+ e2e-flake-ledger 在册 1**（`replication-crm-opportunity-kanban:436` C1 focus③ test.fail 棘轮，ATTRIBUTED(contention)，11-02 已登记）**+ 新登记 3**（见下）。**除新登记 3 项外无台账外失败**——「失败集 ⊆ 台账（含本节新登记）」成立。逐名计数与 list reporter 汇总 169 存在 ≤1 的 reporter 双计口径差，不影响逐名归位。

### 新转入（3 项，均稳定红、隔离复验确定性复现）

| 项                                                                                              | 签名                                                                                           | 归类/承接                                                                                                                                     |
| ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `a11y-axe-baseline.spec.ts` axe scan (complex-pages/doc-hitl-inbox)                             | `color-contrast: 15 (baseline 10)`（基线 11-01 plan 815 实测 10；retry #1 同值，隔离复验同红） | **E/未定**：色对比计数漂移 +5，根因未单点归因（836 域外，无 styling 触达）；owner=complex-pages shell 徽章对比债家族，承接 axe owner 债/PH-10 |
| `a11y-axe-baseline.spec.ts` axe scan (complex-pages/itam-asset-inventory)                       | `color-contrast: 10 (baseline 9)`（基线 10-30 plan 804 实测 9）                                | 同上                                                                                                                                          |
| `complex-pages-interaction-state.spec.ts:180` form-wizard: picker opens on a real pointer click | 真实 pointer 点击后 `picker-trigger` `aria-expanded` 保持 false（3s 未开）                     | **E/未定**：11-02 全量已登记未归因（plan 819 审计报告），本次复现确认稳定；owner=complex-pages/picker 组件面                                  |

另：**新 flaky 观察 5 项**（retries=1 收敛，全量首败、重试绿）：`map-demo:22` region map、`playground-entry-pages` map-demo 冒烟、`scada-edge-cases:161` hover-miss、`stripe-replica-interactions:320` 列排序、`a11y-axe flux-basic`。C 类既有在册 `complex-pages:225` standard-crud picker 本次仍 flaky。`scada-perf:155`（F8）本次 flaky 化（重试收敛）——维持 F8 在册，阈值裁决仍委派 MA7.1/plan 628。

### 836 处置表摘要与转出项（在册未复现，本次全量为证）

处置表（详见 plan 836）：**product-fix ×6**（prosemirror 双实例 overrides；industrial scada-editor-canvas 19 契约；content carousel 3 契约；form checkbox-group focus+clear 契约；linear ln-progress direction+css ×2 处）+ **test-fix ×7**（editor-demos sc2 / cal-replica-visual 时间炸弹固定钟 / linear 03、15 / antdpro 01、03 / entry-pages :569 路由清单）+ **ledger-registered 归并 ×4**（cron-editor ×2、ai-component-handle/ai-widgets——不改既有裁决）。

转出项（在册但本次未复现；「契约修复族连带」指 #2/#3/#4 industrial/content/form 契约修复使对应页面 strict console 门禁语料清零）：

- **836 修复直接转绿**：`w3d-editor:70`（#1）；`cal-replica-visual:32`（#4 固定钟）；`linear-replica-visual` 03/05（#5/#6）；`linear-replica-interactions:576` 15（#7）；`antdpro-replica-visual` 01/03（#8/#9）；`editor-demos-ux-r10` sc1/sc2/sc3（#2/#3）；`playground-entry-pages` 冒烟 component-handles/w4a-multimedia/scada-editor-demo（#3/#12/#13）；`form-ai-mobile-interaction-state` clear checkbox group（#13）。
- **契约修复族连带转绿（F1 console 语料族）**：`scada-editor-context-menu` ×4、`scada-editor-drag-ux` ×4、`scada-editor-interaction-correctness` ×7、`scada-editor-panel-collapse` ×2、`scada-editor-plan522` ×5、`scada-editor-perf` ×3、`designer-toast-hygiene`、`home-entry-navigation` scada 卡、`domain-page-interactions` component-handles、`domain-page-zero-error` w4a/scada 两项、`scada-ux-visual`、`w4a-multimedia-family` ×9、`component-handles` ×6、`composite-editor-handles` ×5（后两组合同族 #13/#12 连带，个别或混有 850–864 批次修复，均以本次全量绿为证）。
- **时间炸弹族未复现**：`component-lab/simple-form` F2 两项（select / optionTemplate——836 TZ=UTC 分诊判定时间炸弹，CST 11-11 窗口绿）；**F9 增补 ai-bubble 冷启动 2 条**（corner shape / avatar——冷启动时延敏感，本轮窗口未复现，若复发按原条目回归）；`kanban-demo` programmatic card move（F9）。
- **C 类在册未复现**：`ai-attachments` ×2、`flow-designer-ux-visual` ring（免重跑证据沿用 iso-b7）。**data-viz map toast**（836 Deferred flaky 观察）未复现，维持 Deferred。
- **在册复现须注记**：`c2-4 range-host`、`c7 swipe-cell`、`simple-form confirm-password`（836 E1 族时间边界判定项）于 11-11/12 时间窗全量与隔离复验均红（`836-iso-1112.log`）——时间窗特性（TZ=UTC 分诊绿为窗口效应），**维持 F9 在册**；`simple-form` TypeScript checkbox（F2）亦复现维持。

**对 2026-10-26 快照的净变化**：248 failed → 169 failed + 7 flaky；在册项转出 ≈ 79（上列），新转入 3，A 类回归 0（新转入 3 项均无 836 触达面证据，非产品回归判定）。全仓五命令全量门禁留收口会话。
