# R2-1c 数据可视化与表格域走查汇总（summary）

> Date: 2026-09-23 ｜ Owner plan: `docs/plans/494-visual-quality-r2-1c-visualization-domain-walkthrough-plan.md`
> 口径: `docs/skills/visual-page-quality-inspection-prompt.md` ｜ 截图: `_tmp/visual-inspection-2026-09-23/r2-1c/`
> 产物: cards/×13 ｜ review.md（独立复核 11 条）｜ 深挖并入复核轮

## 1. 评分卡（13 页）

| 页面                | A         | B            | C              | D         | E           | F    | C6   | B3   | 总评     |
| ------------------- | --------- | ------------ | -------------- | --------- | ----------- | ---- | ---- | ---- | -------- |
| dashboard-demo      | fail(A6)  | fail(B3)     | fail(C1,C2,C6) | pass      | warn(E2)    | pass | fail | fail | fail     |
| pivot-table-demo    | pass      | fail(B5)     | fail(C1)       | pass      | warn(E2,E4) | pass | pass | n/a  | fail     |
| map-demo            | fail(A3)  | fail(B3,B5)  | fail(C6)       | pass      | fail(E1)    | pass | fail | fail | fail     |
| graph-demo          | pass      | fail(B5)     | fail(C2)       | pass      | warn(E1)    | pass | n/a  | pass | fail     |
| three-canvas-demo   | pass      | fail(B1)     | fail(C6,C4)    | warn(D1)  | pass        | pass | fail | n/a  | 有风险   |
| scada-demo          | pass      | fail(B1)     | fail(C4)       | warn      | pass        | pass | pass | pass | 有风险   |
| scada-pressure-demo | pass      | pass         | warn(C2)       | pass      | pass        | pass | pass | n/a  | 有风险   |
| scada-edge-cases    | fail(A5)  | fail(对比度) | warn(C2)       | pass      | warn        | pass | pass | n/a  | 有风险   |
| scada-perf-scale    | pass      | pass         | warn(C2)       | pass      | pass        | pass | pass | n/a  | **pass** |
| performance-table   | warn(A3)  | fail(B5)     | fail(C1)       | warn(D3)  | pass        | pass | n/a  | fail | 有风险   |
| table-popover       | pass      | warn(B5)     | fail(C2,C4)    | pass(D6✔) | warn(E4)    | pass | n/a  | fail | 有风险   |
| table-column-width  | warn(A3)  | pass         | pass           | pass      | warn(E4)    | pass | n/a  | n/a  | **pass** |
| data-verify         | pass(A9✔) | warn(B1)     | pass           | pass      | pass        | n/a  | n/a  | n/a  | **pass** |

分布：fail 6 ｜ 有风险 7 ｜ pass 2（scada-perf-scale 10 万图元渲染正确性全绿；table-column-width 宽度策略断言全绿）。

## 2. 发现台账

严格口径 **37 条**（按卡内 `### [R2-1c-*]` 锚定）：P1 ×7 ｜ P2 ×17 ｜ P3 ×13。独立复核 11 条（7 P1 全覆盖 + 4 P2 抽样）：**11/11 保留、0 降级、0 驳回**；1 条数值修订（graph B5-02 info 徽标 1.5→1.10:1，精确合成口径）。〔closure audit M1 更正：初版误记 40 = 7/15/18，不可复算；以本行 37 = 7/17/13 为准〕

## 3. 族归并

1. **【令牌级根因改判 → R2-4 dark 族核心项】`--secondary`/`--secondary-foreground` 令牌对 dark 破损**：theme-tokens dark 块浅紫底/浅蓝字（styles.css dark 区），实测 1.10:1；map/graph 页头 `bg-white` 字面 1.07:1、performance-table badge 1.4:1、R2-1a showcase pills 1.1:1 同值——根因从"宿主 literal"改判到**令牌本身**，修复面 = theme-tokens dark 块一处（±R2-1a 各实例消费面核对）。
2. **【新 systemic 族候选】第三方画布库集成契约族**：map geojson 缺 featureProjection（整版空白 P1，源码 map-layer-manager.ts:148 坐实）、ol/ol.css 全仓未引入（控件 10×22px P2）、pivot VTable dark 主题不随动（P2）、three DPR 缩放缺失（P2）、dashboard recharts 容器宽度不约束（P1）——"引入第三方库但未补集成层"的统一模式 → R2-3 字母批候选。
3. **【既有族扩面】窄视口/壳层 flex（R2-3c 候选）**：three grid 壳层 1280 即破版（P1，fresh load 复现）、scada resize 路径溢出（P1，附注：仅 resize 路径、fresh load 无溢出——画布内联宽冻结子根因建议单列）、performance-table grid min-content 传播（P2，host 壳 section 1333px）、table-popover 800 溢出（P3）。
4. **局部缺陷 → R2-4 输入**：pivot 明细格全空白（P1，核心功能失效）、graph hierarchy 节点过小（P1，缺 fitView）、dashboard 拖拽无 ghost/落位重叠/delta 不渲染（P2×3）、scada 缩放手势失真（P2，wheel=平移与提示不符、ctrl+wheel 非等比）、scada-edge 错误态 1.48:1 埋于 3576px 区（P2）、map cluster 无计数（P2）等。
5. **既有族再扩面**：A3 手柄 4px/ol 控件超小（A3 族）、E4 数值列左对齐（watch-pool 族 +2 实例）、B1 primary dark 3.26:1（B1 族新最差实例）、chip 遮挡族（scada-pressure/perf Back 按钮碰撞 +2 实例）。

## 4. 健康面

scada-perf-scale 10 万图元渲染正确（C6 pass、控制条可读、探针耗时 ≪120s）；分页条 12px 块距（D6）三表格页全过；plan-490 弹层契约无回归（scada 设备详情 Dialog 560 base 全过）；列宽拖拽中间态跟手/键盘替代/宽度守恒断言全绿；popOver 三 placement/碰撞回退/Esc/emptyText 行为面全绿；graph B3 语义色 light 正确；scada 系 C6 全过（作 three DPR 缺失的对照组）。

## 5. Quick Wins

1. `--secondary` dark 令牌对修正（theme-tokens 一处，收 4+ 页不可读）。
2. map-layer-manager 补 `featureProjection: 'EPSG:3857'`（一行，收 Region 空白）。
3. 引入 ol/ol.css（一行 import，收控件样式）。
4. map/graph 页头 `bg-white` → 令牌（两处字面类）。
5. graph hierarchy 默认 fitView（一处）。

## 6. 最大影响修复 Top 3

1. **`--secondary` 令牌对（R2-4 dark 族核心）**——令牌级一处修收跨批 ≥6 页不可读。
2. **第三方画布集成契约族（R2-3 候选）**——5 页 P1×2+P2×3，模式统一。
3. **窄视口壳层族（R2-3c）扩面坐实**——three P1 新增，scada resize 子根因单列。
