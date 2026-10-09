# 动态交互状态专项审查提示词（Interaction-State Audit Prompt）

> Created: 2026-10-07。动因：多轮 UI 审查（代码普查 / 静态截图走查）全部通过后，用户仍报告五项"一眼可见"的交互缺陷（gantt 拖拽后滚动归零、画布插入节点后居中跳靠左、"+"按钮错位、calendar 假移动反馈、摘要卡边界不可辨）。根因是既有审查的证据形态全部是**静态状态**，没有任何一轮对"交互前-中-后的状态连续性"做过对账。本提示词补这一维。

## 0. 定位与分工

| 文档                                                   | 管什么                                                                  | 不管什么                           |
| ------------------------------------------------------ | ----------------------------------------------------------------------- | ---------------------------------- |
| `docs/references/ui-interaction-review-checklist.md`   | 通用交互质量原则基线（主任务优先 / 上下文连续 / 控件就近 / P0–P3 分级） | 不提供可执行取证协议               |
| `docs/skills/ux-design-pattern-audit-prompt.md`        | 静态视觉/交互**一致性**（多轮递归模式扫描）                             | 不管单页动态行为                   |
| `docs/skills/visual-page-quality-inspection-prompt.md` | 渲染面**静态**走查（A–H 维度评分卡、双主题双视口）                      | 不管交互过程态                     |
| **本文**                                               | **交互前-中-后的状态连续性与反馈真实性**                                | 不重复静态一致性、不做视觉风格评审 |

## 0.5 覆盖语义（2026-10-09 补，防"audited"语义窄化）

本提示词产出的"audited"仅指**交互状态审计覆盖**，不等于"页面质量全绿"。designer/demo 家族页与用户主路径页在收口前应完成三 pass 覆盖矩阵：

| pass         | 方法                                       | 覆盖什么                           |
| ------------ | ------------------------------------------ | ---------------------------------- |
| 交互状态     | 本文件                                     | 交互前-中-后状态连续性与反馈真实性 |
| 页面视觉质量 | `visual-page-quality-inspection-prompt.md` | 渲染面布局/层级/间距/双主题        |
| 一致性门禁   | `pnpm check:audit-ui-consistency-gaps`     | 字面色/图标/类名一致性             |

未覆盖的 pass 必须在台账/roadmap 显式标注"未跑"或写明豁免理由；既有视觉走查基线（如 R2-1b）先于页面重构时视为**过时维度**，须增量复跑。禁止用单一 pass 的 audited 语义覆盖全部质量语义。

## 1. 使用方式

把本文整段作为指令交给一个 fresh 审查 session（或子 agent），附目标页面清单。审查必须**真实驱动浏览器**（Playwright / browser-use），禁止只读代码下结论、禁止只截静态图定案。执行前先读本文件全文与目标页路由。

## 2. 审查对象：七类交互过程态缺陷

**A. 视图状态跳变（view-state discontinuity）**
非滚动/非缩放意图的交互改变了视口状态。
已坐实案例：gantt 拖拽 bar 提交后横向滚动跳回 0（2026-10-07 用户报告）；flow-designer 钉钉审批流/Action 编排插入节点后画布从整体居中跳为靠左。
违反信号：交互前后 scrollLeft/scrollTop/zoom/viewport transform/选中集发生了用户没有要求的改变。

**B. 控件几何锚定错误（affordance misplacement）**
浮标、插入按钮、菜单、落点指示等中间态控件定位错位、被裁剪、锚点失效。
已坐实案例：钉钉审批流与 Action 编排节点间"+"插入按钮位置明显不对。
违反信号：控件实际 boundingRect 与其逻辑锚（节点间隙中点、指针位置、锚元素边缘）可见偏离。
**比例失调变体（2026-10-09 补）**：锚定几何正确（±2px 通过）但控件尺寸与锚间隙之比明显偏离同族参考（如小卡配大间隙使"+"按钮观感悬空）——按 B 类变体立案（通常 P2/P3，归属设计配置/令牌），取证 = 同族参考的尺寸/间隙比对照。

**C. 反馈语义失真（假反馈，affordance-outcome mismatch）**
界面给出成功/失败反馈，但数据与视图没有对应变化（或变化没有反馈）。
已坐实案例：calendar 拖拽事件 → 确认"排班已更新" → 事件纹丝未动（demo schema `onEventChange` 只派发 `showToast`，events 是模块级静态常量，无任何数据回写）。
违反信号：任何成功类提示（toast/message/文案）找不到对应的数据或视图变化。

**D. 交互实体不可辨识（boundary/legibility deficiency）**
可交互实体的边界或状态区分度不足，用户无法辨别"这是什么、能不能点、选没选中"。
已坐实案例：节点/边摘要卡常态 `border border-border/60`（60% 透明度灰，接近不可见）、edge-row 常态 `border-transparent`、缺失节点渲染为裸 div 无占位。
违反信号：实体与背景边界对比不足；常态/悬停/选中/激活态差异肉眼不可分。

**E. 标准交互能力缺失或不可发现（interaction parity gap）**
同类产品标配的交互缺失；或已实现但入口不可发现，用户感知为"没有这个功能"。
已坐实案例：calendar 已实现"长按 500ms 拖选单元格创建事件"（`use-calendar-drag-create.ts`），但无任何引导暗示，用户感知为"没有框选功能"。
违反信号：画布/日历/表格类页面缺框选、拖拽、键盘等惯例交互；或有交互但 3 秒内无法从 UI 发现入口。

**F. 家族能力接线不齐（shared-shell capability wiring gap / 契约符合性漂移）**
同一共享壳/共享契约（如 `WorkbenchShell`）宣称统一能力，但部分家族宿主没接线或**半接线**——挂了文案键/label 却没传 handler——造成同族设计器能力不一致。这类问题**可静态检测**，却因为"组件统一"已验收而无人对账"宿主接线 parity"。
已坐实案例：scada-editor 与 dashboard-editor 都渲染了 `WorkbenchShell` 左右侧板并接了 resize，但都没接 collapsed 契约（`leftCollapsed`/`onLeftToggle` 一族）；dashboard 还把 collapse 文案键挂在了 rail 的 aria-label 上（`dashboard-editor-renderer.tsx`），是典型的半接线信号。对照 flow/report/word 三家族 collapsed + resize 全套。
违反信号：同一共享组件的不同宿主 props 子集存在非 family-mapping 声明的差异；i18n 文案键已注册但对应交互 props 未接线；owner doc 契约条款（"家族不得重写/必须沿用"）与宿主实况不符。
取证方法：**共享组件消费方清单程序化枚举 + props 对账矩阵**（源码静态扫描即可定位），再对可疑宿主跑运行时序列确认体验差距；守卫固化进 `scripts/check-designer-conformance.mjs` 门禁族。

**G. 反馈通道污染（feedback-channel pollution，2026-10-09 补）**
用户通知通道出现与用户动作无映射的信息：调试输出、宿主内部拒绝、info/debug 级 dump、重复/陈旧反馈。与 C 类的区别：C 是"承诺了但没发生"（假反馈），G 是"没承诺但弹出来了"（噪声）——内容可以是真的，出现在用户通道即缺陷。
已坐实案例：tree 模式每次快照变更 `notify` 全量布局 JSON（"[flow-designer tree-layout] {…}"，`designer-page-body.tsx` 调试遗留，2026-10-09 plan 557 修复——IS-4 审查读数中反复出现却因无类可立而漏报）；切换 tree tab 即弹 "Tree host input rejected: tree-host-epoch-required"（IS-taskflow-designer-004，宿主握手噪声，watch 在案）。
违反信号：sonner toast 全量枚举（§5 模板已采集）中存在无法映射到"本次会话用户动作或合法异步业务事件"的条目；同一动作触发重复反馈；info/debug 级条目出现在用户通道。
取证方法：**toast 全量枚举 + 逐条动作映射**（§6 反馈通道映射序列；V7 判定）；静态辅助——对目标页 render 路径 grep `env.notify`/`.notify(`/`console.(log|debug)`/`*-debug` 模块与 testid（每批必做，秒级），凡把内部状态 dump 进用户通道的调用即 G 类候选，测试钉住为零的 emit 调用优先怀疑。

## 3. 判定基准：七条状态不变量

| #   | 不变量       | 判定问句                                                                                       | 取证读数                                                            |
| --- | ------------ | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| V1  | 滚动位置保持 | 非滚动意图的交互（拖拽提交、确认对话框、行内编辑、数据刷新）前后 scrollLeft/scrollTop 是否不变 | 交互前后 `scrollLeft`/`scrollTop` 数值                              |
| V2  | 视口稳定     | 画布类：数据增删改后 fitView/居中策略是否被静默改变（只允许用户显式触发）                      | viewport transform（translate/scale）、首节点 boundingRect          |
| V3  | 反馈真实     | 每个成功反馈能否指出对应的数据或视图变化                                                       | 数据条数/字段值断言、目标元素文本或几何                             |
| V4  | 中间态正确   | 拖拽 ghost/落点指示/插入按钮/下拉菜单是否与逻辑锚几何一致且不被裁剪                            | 控件 boundingRect vs 锚元素 boundingRect，容器 overflow 边界        |
| V5  | 取消无痕     | Esc / pointercancel / 取消按钮后一切状态是否回到交互前                                         | 前后全量读数 diff 必须为空                                          |
| V6  | 实体可辨     | 可交互实体边界对比度与状态区分度是否可感知                                                     | computedStyle border/background/color，常态 vs hover/选中态读数对比 |
| V7  | 通知通道卫生 | 页面访问+交互期间出现的每条 toast 是否都能映射到用户动作或合法异步业务事件（2026-10-09 补）    | §5 模板 toasts 全量列表 + 逐条动作映射清单；无映射条目即违反        |

## 4. 审查方法：每页五步

1. **枚举可交互面**：程序化枚举页面的按钮、可拖拽元素、滚动容器、画布节点、确认对话框（`page.evaluate` 扫 DOM + 读 schema/路由清单），禁止目测清单。
2. **定义读数集**：为该页每类交互写下"前-后"状态读数脚本（模板见 §5）。滚动容器类必含 V1，画布类必含 V2，反馈链路必含 V3。
3. **驱动真实序列**：逐个执行交互，包括：完整确认链路（确认/取消/Esc 三条路径）、拖拽中间态（拖拽中读 ghost 几何）、取消路径、二次连续交互。
4. **前后 diff 定罪**：读数 diff 违反 V1–V6 之一即立案。**截图只做佐证，定罪必须用程序化读数。** 无法程序化取证的发现降级 watch-only，不进 P0/P1。
5. **归类与归属**：每条 finding 标 A–G 类、P0–P3 级（分级沿用 `ui-interaction-review-checklist.md` §3）、归属四方：demo/schema 接线 | renderer 行为 | 设计系统令牌 | 能力缺口。根因未证实前写"候选链路"，禁止把假设写成结论。

## 5. 读数脚本模板

```js
// 交互前、后各执行一次，diff 定罪；selector 换成目标页的实际容器
() => {
  const sc = document.querySelector('[data-slot="gantt-timeline"]'); // 滚动容器
  const vp = document.querySelector('.react-flow__viewport'); // 画布视口（如有）
  const firstNode = document.querySelector('.react-flow__node');
  return {
    scrollLeft: sc?.scrollLeft ?? null,
    scrollTop: sc?.scrollTop ?? null,
    viewportTransform: vp?.getAttribute('style') ?? null,
    firstNodeRect: firstNode?.getBoundingClientRect().toJSON() ?? null,
    nodeCount: document.querySelectorAll('.react-flow__node').length,
    eventCount: document.querySelectorAll('[data-slot^="calendar-event"]').length,
    toasts: [...document.querySelectorAll('[data-sonner-toast]')].map((e) => e.textContent),
  };
};
```

几何锚定（V4）取证：控件 boundingRect 中心点应落在逻辑锚的期望区间（如"+"按钮中心 = 相邻节点间隙中点 ± 2px）；菜单/下拉 anchor = 触发点 ± 8px 且完全在视口与容器内。

## 6. 必测序列清单（按页面形态）

- **画布/设计器类**：初始载入视口读数 → 插入节点/删除节点/拖动节点/撤销 → V2 读数不变；"+"按钮 V4 几何；缩放/fit 后选择集保持；右键菜单两条路径。
- **滚动容器类**（表格/甘特/时间线/长列表）：滚动到非零位置读数 → 触发一次数据变更交互（拖拽提交、确认对话框、行内编辑、刷新）→ V1 读数不变；虚拟化/窗口化容器重点测。
- **反馈链路类**：枚举页面全部成功类文案（"已保存/已更新/已创建"）→ 逐个触发 → V3 断言对应变化真实存在。
- **选择/范围类**：框选、范围拖选、shift/meta 加选、Esc 取消（V5）；同时审入口可发现性（E 类）。
- **拖拽类**：ghost 跟手、落点指示出现、pointercancel 恢复（V5）、提交后数据与滚动/视口不变量（V1/V2）。
- **确认对话框类**：确认/取消/Esc 三路径后状态各是什么，全部读数留档。
- **共享壳宿主对账类（F 类专项）**：程序化枚举共享壳（WorkbenchShell 等契约组件）的全部消费方，逐宿主 diff 契约 props（collapsed 一族 / resize 一族 / View-mode 规则）与 owner doc 的 family mapping——凡差异不在 family mapping 声明内的即 finding；同步对账"i18n 键已注册但 props 未接线"的半接线信号。宿主数量少，此对账**每轮必做且以静态扫描为主**。
- **反馈通道映射类（G 类专项，每批必做）**：initScript 单调 toast 记录器（防重渲染吞 toast）全量采集 → 进入页面、最小中性交互（切换/选中/打开面板）、退出 → 逐条映射"哪次用户动作/哪个合法异步业务事件产生它"。无映射条目即 G 类立案；**taskflow-designer 的 004 现役 toast 为已知在案噪声，命中时引用既有行不重复开案**。
- **调试残留静态扫描（G 类辅助，每批必做，秒级）**：对目标页 render 路径 grep `env.notify`/`.notify(`/`console.(log|debug)`/`*-debug` 模块与 testid；凡把内部状态 dump 进用户通道（env.notify/toast）的调用即候选，测试钉住为零的 emit 调用优先怀疑。
- **家族参考对齐类（designer/demo 家族页必做）**：存在同族参考实现（flow-designer 之于 taskflow/report/word 等）时，截图对比 + DOM 结构对比（节点卡解剖：头行/副标题/chrome data-slot；画布间距比例：卡尺寸 vs 间隙；控件布局与缩放控件位）。差异以 **design-debt candidate** 入账（标注"主观观察、需人工裁决"）——本节是 §9 诚实条款的立案出口：主观观察不必读数定罪，但必须显式登记，禁止静默丢弃。既有视觉走查基线（如 visual-quality-r2-roadmap R2-1b）存在时做**增量走查**并引用其发现，不重复立案；基线先于近期重构时必须注明过时维度。

## 7. 输出格式

每批次一张台账，落 `docs/audits/interaction-state/<批次>/`，逐条：

```
[IS-<page>-<seq>] <一句话症状>
- 类别: A|B|C|D|E|F|G    级别: P0|P1|P2|P3
- 页面/路由: #/xxx
- 复现序列: 1) ... 2) ... 3) ...
- 证据: 前读数 {...} → 后读数 {...}（违反 V<n>）；截图路径仅作佐证
- 初步归属: demo 接线 | renderer | 设计系统 | 能力缺口
- 候选根因: ...（未证实须标注）
- 修复建议: ...
```

## 8. 验收与回归纪律

- 每条 P0/P1 修复必须先红后绿：先把复现序列固化为 e2e 测试（断言读数，非截图），红 → 修 → 绿。
- 修复后同探针复测整页；同类问题做类扫描（grep 同模式组件、同 hook 消费方）。
- 可静态检测的子集（如 V4 的几何常量对账、V6 的 border 透明度令牌）评估纳入 `check:audit-ui-consistency-gaps` 门禁；不可静态检测的记录豁免理由。

## 9. 诚实条款

- "感觉不对"必须落到"违反哪条不变量 + 哪个读数变化"，否则不立案。
- 根因未证实的只写候选链路；禁止把假设写成结论。
- 审查发现与修复进展回写 `docs/backlog/interaction-state-quality-roadmap.md` 台账与状态区，不得只留在会话里。
