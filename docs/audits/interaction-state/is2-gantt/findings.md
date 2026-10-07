# IS-2 Gantt 三页序列审查证据卡（plan 545 Phase 3）

> 审查方法：docs/skills/interaction-state-audit-prompt.md §4 五步法 / §6 滚动容器类序列。
> 原始读数：sequence-readings.json（9 序列程序化取证，2026-10-07，修复后采样）。
> 种子 006（IS-gantt-001）与附带缺陷 002（IS-gantt-002）的证据与修复见 ledger.md 行与下文摘要。

[IS-gantt-001] 拖拽 bar 提交后横向滚动平滑归零（种子 6，P1，已修复）

- 类别: A（视图状态跳变，V1） 级别: P1
- 页面/路由: #/gantt（gantt-states/gantt-perf-scale 同链路）
- 复现序列: 滚动 timeline 至 900 → resize-left 第 4 根 bar（抓点 x+3）→ 提交 → +1s scrollLeft 归 0（确定性 3/3；smooth 衰减 900→476→…→1→0）
- 根因（写入 trap 铁证）: 挂载居中 effect（ux-r8 GT-1）依赖 compiler 增强 deps（编译后有效依赖含 store.scaleRange），拖拽提交 updateTask 重算 scaleRange 换引用 → effect 重跑 → scrollToToday 写 `max(0, todayX − clientWidth/2)` = 0（demo 时间轴起点≈今天−pad）→ `gantt.css:103 scroll-behavior: smooth` 平滑归零。无重挂载（DOM 探针存活）、无宽度收缩（钳制前提不成立）、zoomToFit 未介入。
- 修复: 抽显式 deps hook `useGanttInitialCenter` + didInitialCenter 守卫（行为脱离 compiler，源码/编译一致）；Today 按钮 / scrollToTask / scrollToToday schema action 显式路径不变。
- 判别测试: 红 e2e（gantt-scroll-preservation.spec：resize 手势提交后 900→~0 衰减，stash 复现 3/3）→ 绿（±20px，容差覆盖 resize 收缩 scaleRange 的合法钳制）；move 手势旧实现即保持（回归锁，非先红项）；compiler-true 判别由 e2e 承担。

[IS-gantt-002] grid 横向 scrollLeft 与 timeline 竞写同一 store 值（P2，已修复）

- 类别: B（producer 语义污染） 级别: P2
- 页面/路由: 全部 gantt 实例（grid 默认宽 320 < 列宽 600 常驻横向可滚）
- 证据: use-gantt-scroll.ts 旧实现 grid/timeline 两来源同签名回调 → gantt.tsx:210 无条件 store.setScrollLeft；windowing（timescale/cellgrid）与 zoom 中心锚定语义均为 timeline 值
- 修复: producer 回调第三参 source（'grid'|'timeline'），gantt.tsx 仅 timeline 来源写 store.scrollLeft；契约测试红（旧 2 参签名下第三参 undefined）→ 绿
- 归属: renderer

## 观察项（不立案）

- 挂载居中在 perf-scale（500 任务）同样生效（mount 后 scrollLeft=3923 精确居中），拖拽提交后 3923 保持 ✓
- gantt-states 首实例 scroll 500 落定 318 = 内容宽 1400 − 视口 1082 的合法钳制（多实例变体页）
- zoom 显式路径：缩放后 scrollLeft 随内容宽度按比例落位（非归零）✓
- 键盘编辑/undo 同经 updateTask → hook 守卫覆盖（无独立 UI 驱动路径，记录性观察）
- gantt-states loading 变体：序列审查未对 loading 分支做专门读数（该页 2 序列为多实例计数 + 首实例滚动钳制）；loading→ready 的挂载居中路径由组件级挂载契约（gantt-mount-timing）与 hook 守卫共同覆盖，登记为覆盖说明而非独立读数
