# R2-1b 设计器域走查汇总（summary）

> Date: 2026-09-23 ｜ Owner plan: `docs/plans/493-visual-quality-r2-1b-designer-domain-walkthrough-plan.md`
> 口径: `docs/skills/visual-page-quality-inspection-prompt.md`（G 维度主维度）｜ 截图: `_tmp/visual-inspection-2026-09-23/r2-1b/`
> 产物: cards/×10 ｜ review.md（独立复核 9 条 + 2 存疑澄清）｜ rounds 深挖并入复核轮

## 1. 评分卡（10 页）

| 页面                 | A                 | B        | C                 | D    | E        | F        | G                 | H    | 总评   |
| -------------------- | ----------------- | -------- | ----------------- | ---- | -------- | -------- | ----------------- | ---- | ------ |
| flow-designer        | fail(A1)·warn(A2) | fail(B5) | fail(C2)          | pass | pass     | fail(F4) | fail(G1,G6,G7)    | pass | fail   |
| dingtalk-flow-demo   | fail(A8)          | pass     | warn(C2)          | pass | pass     | fail(F4) | fail(G1)          | pass | fail   |
| taskflow-designer    | pass              | pass     | warn(C2)          | pass | pass     | warn(F4) | fail(G7)          | n/a  | fail   |
| report-designer      | fail(A3)          | fail(B5) | fail(C1)          | pass | pass     | warn     | pass(G5 n/a)      | pass | fail   |
| report-designer-host | fail(A3,A9)       | warn     | pass              | pass | fail(E4) | pass     | pass              | 引用 | fail   |
| print-designer       | pass              | fail(B5) | fail(C2)·warn(C5) | pass | pass     | pass     | fail(G8)·warn(G3) | pass | fail   |
| debugger-lab         | pass              | warn(B1) | pass              | pass | pass     | pass     | n/a               | n/a  | 有风险 |
| spreadsheet          | warn(A3)          | pass     | warn(C2)          | pass | pass     | pass     | pass              | pass | 有风险 |
| word-editor          | pass              | pass     | fail(C1,C4)       | pass | pass     | pass     | pass              | pass | fail   |
| scada-editor-demo    | fail(A9)          | pass     | warn(C4)          | pass | pass     | pass     | fail(G7)          | pass | fail   |

分布：fail 8 ｜ 有风险 2 ｜ pass 0。设计器域整体低于复杂页域——属性面板链路与 dark 适配是两大短板，画布交互手感（G1/G3/G5/G6 的 leafer/xyflow 实现面）反而质量高。

## 2. 发现台账

- **正式发现条目 31 条**（按卡内 `### [R2-1b-*]` 锚定）：P1 ×5 ｜ P2 ×13 ｜ P3 ×13（无 P0）
- 另有：watch-only 段 12 条（debugger-lab 3 / print 4 / report-designer 3 / report-host 2）、scada 行内 watch 注记 2 条、跨卡同族引用 5 条（taskflow 3 + dingtalk 2，指向 G1/C2/A3 族）——合并口径合计 50 处记录；正式条目归族：systemic 候选 12 ｜ local 14 ｜ watch 段与行内注记见 watch-pool.md（新增 4 行登记）

## 3. 独立复核（review.md）

9 条发现全部重开页面独立取证：**9/9 保留、0 降级、0 驳回**。特别裁决：print G8-01 维持 P1（V8a 豁免仅覆盖纸面恒白不覆盖墨色翻转；dark 一级公民 + 画布唯一工作面全内容 1.19:1 不可读，判级表字面另有升 P0 空间，供 R2-4 排期加权）。2 存疑澄清：①scada 连线拖拽可用（双接头+边锚点 commit/undo 全通，原探针落点在中心 noop 正确）；②flow dark 3.81/1.05 为渐变背景解析伪值（像素采样 13.6:1，dark 可读）。

## 4. 族归并（与 R2-1a 已裁定族去重合并）

1. **【新 systemic 族候选】属性面板↔画布双向同步契约缺失（G7 族，P1×3）**：flow（写路径断、限 graph 模式）、taskflow（读断+写断）、scada-editor（键入错提交+回显失同步）——三页三种断法但同属 G7 契约缺口；钉钉 tab 写路径正常可作对照实现。→ 登记 R2-3 字母批候选（R2-3c/R2-3d 排期由 R2-3b 落地后按台账定）。
2. **【既有族扩面】dark 平价族（R2-4）**：flow 节点工具栏 `bg-popover/96` 恒亮（B5-01，dark 快捷操作近乎不可发现）、print 墨色翻转（G8-01 P1，新机理=主题前景误用而非缺 dark 块）、report 工具栏白带（B5-01，literal rgb 无 dark 覆写）——三页增量并入 R2-1a 已裁定的 dark 平价族输入。
3. **【新 systemic 族候选】playground 调试器 chip 遮挡族（C2，≥3 页跨批）**：fixed z9998 chip 遮 flow 返回键（P1，功能性遮挡）、taskflow 压标题、word 返回钮视觉碰撞（R2-1a standard-crud 同 chip）——单点修复（chip 位置/z/可收起）。
4. **【既有族扩面】窄视口固定壳层（R2-3c 候选）**：word 大纲面板 1280 裁 222px（P2）、report workbench 1137/800（P2）、scada 800 溢出 298px（P3）——与 R2-1a 窄视口族同根因面（固定列宽+overflow-hidden 无折叠）。
5. **【既有族扩面】画布小目标（A3 族，P3）**：行列头 21px（report/spreadsheet）并入 R2-1a A3 族。
6. **local 散项**：dingtalk 孤儿路由渲染主页（F4-02 P2，App switch 缺 case）、钉钉 add 菜单无键盘路径（A8-01 P2）、flow 网格开关死控件（A1-01 P2）、flow inspector 双表单堆叠（F4-01 P2）、report-host preview 静默（A9-01 P2）、scada Save 零反馈（A9-01 P3）等。

## 5. 健康面（复核确认正向基线）

plan 490 弹层契约在设计器域零命中：全部弹层落阶梯（560 base / 480 sm / 960 lg），footer 全 flex-end + 8px gap——R2-1a 首批族的组件级合规对照组继续成立。G1/G3/G5/G6（选中/拖拽/缩放/undo）在 spreadsheet/scada/print/taskflow 精确达标；flow JSON 面板 560 契约（plan 490 迁移点）双主题复验通过；debugger-lab 双主题自洽。

## 6. Quick Wins

1. dingtalk 孤儿路由：App.tsx 补 case 或删 route entry（一行）。
2. print 墨色/标尺改用纸面恒定色（脱离主题前景，两处）。
3. 调试器 chip 收起/移位（一处）。
4. report 工具栏 literal 白底换令牌（styles.css 一处）。

## 7. 最大影响修复 Top 3

1. **G7 属性面板双向同步契约（新族）**——三设计器核心编辑闭环 P1。
2. **print dark 墨色翻转（R2-4 dark 族加重项）**——画布唯一工作面整体不可读。
3. **调试器 chip 遮挡（跨批单点）**——功能性遮挡返回导航。
