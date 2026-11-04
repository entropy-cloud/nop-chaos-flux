# U3 桌面域 B 五页走查报告（I1/I2/K1/K2/K3）

> Created: 2026-11-04。方法：三步法（自由 critique → A-H grounding → 程序化取证）+ baseline §2.3 desktop 口径；环境：dev server（strict 校验）+ playwright chromium，视口按各页 spec 同款（I1/I2/K1/K3 1440×900、K2 2160→2520×1050〔见 F-K2-2 裁决〕），浅/深双主题（`data-mode='dark'`）+ I1 盘点 tab / I2 双轴趋势 / K2 横滚链中间态取证。探针（复用 + 新增）：`_tmp/u3-walkthrough.mjs` + `_tmp/u3-walkthrough-out.txt`（前任遗留，复用）、`_tmp/u3-i1-buttons-probe.mjs`、`_tmp/u3-i2-trend-probe2.mjs`、`_tmp/u3-k2-trunc-probe.mjs`、`_tmp/u3-k2-scroll-probe.mjs`、`_tmp/u3-i2-pivot-deep.mjs`、`_tmp/u3-dark-sweep*.mjs`。截图（评审证据，不入库）：`_tmp/ux-fidelity/u3/`。约束：packages/ 零改动（`git status` 全程确认干净）。

## I1 `itam-asset-inventory`（1440×900）

Findings：

- **F-I1-1（Major，在册 F1 预警，本轮根因修复）双按钮对**：crud queryForm 内嵌 form 渲染默认 `搜索/重置`（`DIV.form-actions`，justify-end 对），crud 又合成 `CrudQueryActions`（`data-slot="crud-query-search/reset"`，左下对）——同屏两对。程序化取证：DOM 探针列出 4 个按钮（两组 slot/parentChain 区分，`_tmp/u3-walkthrough-out.txt` buttons + 复跑探针）。根因：`crud-query-actions.tsx`（P1-MA5.4-001 合成对）与 queryForm carrier 默认 form actions 重复；前者被 e2e 依赖，后者页面级可抑制。
  **Fix**：schema `queryForm.actions: []` 抑制内嵌 form 默认对。反向验证：探针复跑仅剩 `crud-query-search/reset` 一对；spec `crud-query-search` 点击链路 11/11 绿。
- **Minor**：台账表 4px 微溢出（scrollW 1092 / clientW 1088，探针 overflow 首条）——滚动承载正常，页面级接受（W2 F-W2-3 同族先例）。
- 盘点 tab 中间态（take-light/dark 截图 + takeDiff rows=1 探针）：扫码链/差表/diff-view 形态 ✓。

评分卡：A 交互（e2e 11/11 ✓ 含扫码三步/守卫/drawer）/ B 颜色（浅深 ✓，dark sweep 零白块）/ C 布局（tab→query→工具栏→表 ✓）/ D 间隔 ✓ / E 排布 ✓ / F 一致性（双按钮对修复后 ✓）/ G na / H 弹层（完成 dialog + 报修 drawer e2e ✓）。**达标。**

## I2 `itam-depreciation-dashboard`（1440×900）

Findings：

- **F-I2-1（Major，在册 F1 预警，本轮根因修复）趋势量纲压扁**：本期折旧（~3.4 万）与累计折旧（~100 万）同轴，本期折旧线被压成贴底直线。程序化取证：探针 axisLabels `0..1000000` 单轴 + 贴底曲线几何。
  **Fix**：chart 渲染器已支持双轴（`chart-schemas.ts` yAxis 数组 + series.yAxisId），schema 声明 `yAxis: [{label 本期折旧}, {label 累计折旧}]` + 双 series `yAxisId 0/1`。反向验证：探针复跑左轴 0–34000 / 右轴 0–1000000，两线各自量纲均显形态（`_tmp/ux-fidelity/u3/itam-depreciation-dashboard-trend-fixed.png`）。
- **F-I2-2（Major→renderer 级登记，同 F-W3-1 族）深色 pivot 画布白底**：`data-mode='dark'` 下 pivot（VTable canvas）渲染为纯白空块。程序化取证：`elementsFromPoint` 命中 `CANVAS > DIV.vtable > DIV.nop-pivot-canvas`，自身 bg 透明、白色为 canvas 自绘；light 正常；dark sweep 其余四页零白块（I1/K2/K3 无同类）。与 u2 F-W3-1 根因完全同族（canvas 渲染器 probe 裸 HSL 分量令牌 → 恒回退 light），并入既有 U6 登记，不重复立条。
- **Minor**：pivot 表头/列头截断（"quar…"、"本期…"）——列宽启发式渲染器行为，同 u2 F-W3-3 族，U6 pivot 族在案。

评分卡：A 交互（e2e 10/10 ✓ 含五源级联/行操作 dialog）/ B 颜色（浅 ✓；深色 pivot 白底 = F-I2-2 renderer 级登记裁决）/ C 布局（过滤→KPI→双图→透视 ✓）/ D 间隔 ✓ / E 排布 ✓ / F 一致性 ✓ / G na / H 弹层（预警 dialog + focus ③ e2e ✓）。**达标（F-I2-2 按 renderer 级 Failure Path 处置登记，页面侧无未处置项）。**

## K1 `ai-knowledge-chat`（1440×900，host override）

Findings：

- 零溢出、零截断（探针 overflow/truncated 空数组）；chatStructure 探针 conversations/messageList/sender/welcome 区块几何齐整（messageList 空态 h=1 为空会话初始态，发送后 e2e 覆盖流式面）。
- 浅/深双主题目检 ✓（welcome 空态、会话列表选中态、chips、用量行均为令牌色）；K1 为 host tsx + repl-ai-\* 类族，本轮无需改动。

评分卡：A 交互（e2e 9/9 ✓ 流式/护栏/引用/反馈/用量）/ B 颜色 ✓（浅深）/ C 布局（会话列→聊天列 ✓）/ D 间隔 ✓ / E 排布 ✓ / F 一致性 ✓ / G na / H 弹层（na，无弹层诉求）。**达标。**

## K2 `ai-ticket-console`（spec 视口，见 F-K2-2）

Findings：

- **F-K2-1（Major，在册「横滚裁切」预警，本轮取证裁决 + 就地修复）**：横滚本身**非裁切**——程序化取证：滚动链 `kanban→tabs→page-body` 逐层 `overflow-x` 与 scrollWidth/clientWidth，末列 REOPENED（x=2072，宽 340）`scrollIntoViewIfNeeded` 后 right=2104 全入视口（`_tmp/u3-k2-scroll-probe.mjs` 输出）。真缺陷为**列标题截断**：六列标题（如「处理中（PROCESSING）」sw=163 > w=125）被 header `truncate` 裁切（探针 truncated:true ×5）。
  **Fix（页面级）**：kanban CSS `min-width:280px` + flex shrink 把 `columnWidth:340` 内联宽钳回 280（探针 styleW=340/cssW=280 坐实）→ schema 加 `className: "repl-k2-kanban"`，replication.css 页面级抬列 min-width 至 340（渲染器 max 360 内）。反向验证：探针复跑六列标题 `truncated:false` ×6；横滚能力不受影响（K2 spec 12/12 含两例真实拖卡）。
- **F-K2-2（裁决，物理前置）spec 视口 2160→2520**：列宽 340 后 6 列 + 侧栏超出 2160 视口，拖卡②（CLOSED→REOPENED）目标列出视口致 boundingBox 直投丢靶（首跑 1 fail：ticketMutation 未触发）。按 U1 F-M3-4 先例改 spec 视口为物理前置调整（2520 容纳 6×340），**零断言弱化**；反向验证：K2 spec 12/12 全绿，拖卡①②均真实触发 mutation 载荷断言。

评分卡：A 交互（e2e 12/12 ✓ 含双拖卡路由/守卫/抽屉六要素/focus ①②③）/ B 颜色（浅深 ✓，dark sweep 零白块）/ C 布局（KPI→过滤→双视图→六列看板 ✓）/ D 间隔 ✓ / E 排布（六态动线 ✓）/ F 一致性（标题截断修复后 ✓）/ G na / H 弹层（drawer/dialog/focus ✓）。**达标。**

## K3 `ai-approval-trail`（1440×900）

Findings：

- **Minor**：待办表 4px 微溢出（scrollW 932 / clientW 928，探针）——同 I1 族，滚动承载正常，页面级接受。
- 浅/深目检 ✓（状态徽章、HITL 调用列、手动刷新面）；dark sweep 零白块；本轮无需改动。

评分卡：A 交互（e2e 9/9 ✓ 行点击 drawer/审批轨迹/HITL 卡）/ B 颜色 ✓ / C 布局（列表→详情动线 ✓）/ D 间隔 ✓ / E 排布 ✓ / F 一致性 ✓ / G na / H 弹层（drawer + focus e2e ✓）。**达标。**

## 残留 residual（均带 Why Not Blocking）

| 残留                                                | 归属           | Why Not Blocking                                                                                                                       |
| --------------------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| I2 深色 pivot 画布白底（F-I2-2，并入 u2 F-W3-1 族） | U6 令牌归族    | 根因已登记（canvas 渲染器 probe 裸 HSL 分量令牌恒回退 light）；浅色为主口径自洽正确，令牌格式收敛一处改全族受益，页面级无法重绘 canvas |
| I2 pivot 表头截断（"quar…"/"本期…"）                | U6 pivot 族    | 同 u2 F-W3-3 在案；列宽启发式渲染器行为，数值明细可读                                                                                  |
| I1/K3 表 4px 微溢出                                 | 页面级接受     | 滚动条承载，非结构破损（u2 F-W2-3 同族先例）                                                                                           |
| K1 深色截图主题选择器仍显示 "light"                 | 探针方法学伪影 | 走查以 `data-mode` 直置主题，选择器控件态非产品缺陷；K1 host 主题切换链路由 spec 覆盖                                                  |

## 共性根因（U6 / improvement-analysis 登记建议条目）

1. **（新增建议）crud queryForm 双动作按钮对**：「improvement-analysis 2026-11-04：flux-renderers-data `crud-query-actions.tsx`（P1-MA5.4-001）在有 queryForm 时恒合成 `crud-query-search/reset` 按钮对，而 queryForm carrier（form）同时渲染默认 form actions → 同屏双「搜索/重置」对（I1 取证，所有带 queryForm 的 crud 页同族）。建议渲染器侧二选一：carrier 侧检测 embedded queryForm 时不渲染默认 actions，或 CrudQueryActions 检测 form 自带 actions 时让位；页面级 workaround 为 `queryForm.actions: []`（U3 已用于 I1）。」
2. **（新增建议）kanban 列 min-width CSS 钳制内联宽**：「improvement-analysis 2026-11-04：flux-renderers-scheduling kanban `.nop-kanban-column` 固定 `min-width:280px; max-width:360px`，列作为 flex item 被 shrink 钳回 min-width，schema `columnWidth>280` 不生效（K2 取证 styleW=340/cssW=280）；长标题恒被 header truncate 裁切。建议 kanban 列宽随 columnWidth 同步 min/max（U6 scheduling 族）。」
3. I2 深色 pivot 白底与 I2 pivot 表头截断——u2 §共性根因 1 / residual 已登记，本轮补充 I2 证据，不重复立条。

## 修复 diff 清单

- `apps/playground/src/complex-pages/page-schemas/itam-asset-inventory.json`：queryForm `actions: []`（F-I1-1）。
- `apps/playground/src/complex-pages/page-schemas/itam-depreciation-dashboard.json`：趋势 chart 双 y 轴 + series.yAxisId（F-I2-1）。
- `apps/playground/src/complex-pages/page-schemas/ai-ticket-console.json`：kanban `columnWidth 340` + `className repl-k2-kanban`（F-K2-1）。
- `apps/playground/src/complex-pages/shared/replication.css`：新增 `.repl-k2-kanban [data-slot='kanban-column'] { min-width: 340px }`（F-K2-1）。
- `tests/e2e/replication-ai-ticket-console.spec.ts`：视口 2160→2520 物理前置（F-K2-2，裁决见上，零断言弱化）。
- `docs/backlog/replication-ux-fidelity-roadmap.md`：§3 U4 行勘误附注（K2 横滚裁决跨行记账）。

## 验证

- 五 spec focused `--retries=0`：**51 passed**（11/10/9/12/9；首跑 1 fail = F-K2-2 拖卡②出视口，物理前置裁决后全量复跑 51/51；唯一 spec 改动即视口行 + 注释，断言零调整）。
- `pnpm typecheck` ✓；`pnpm lint` ✓；`pnpm --filter @nop-chaos/flux-playground test` **569/569** ✓。
- `packages/` 全程零改动（`git status` 前后核验；前任 `_tmp/*.bak` 对照文件未启用，留 `_tmp` 待清理）。
