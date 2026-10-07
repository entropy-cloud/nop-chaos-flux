# IS-1 flow-designer 四 Tab 序列审查证据卡（plan 544 Phase 4）

> 审查方法：docs/skills/interaction-state-audit-prompt.md §4 五步法 / §6 画布类序列。
> 原始读数：sequence-readings.json（16 序列程序化取证，2026-10-07）。
> 分级：docs/references/ui-interaction-review-checklist.md §3。既有种子 001–003 见 ledger.md。

[IS-flow-designer-004] 条件节点"+"按钮被 addCondition overlay 完全遮挡，点击不可达且底层命令具有破坏性

- 类别: B（控件几何锚定/命中冲突） 级别: P1
- 页面/路由: #/flow-designer（钉钉审批流 / Action 编排，tree 模式）
- 复现序列: 1) 切钉钉 Tab 2) 定位条件节点上链式"添加节点"按钮（与"添加分支"overlay 中心 Δ≈2px graph 坐标）3) Playwright 可点性检查：overlay（viewport-portal z 序）拦截全部 pointer events
- 证据: 判别探针 —— `<button aria-label="添加节点">` 点击超时，日志反复报 "添加分支 … from <div class=\"react-flow\_\_viewport-portal\"> subtree intercepts pointer events"；碰撞读数 chainButtonCenterY 776.4 vs branchOverlayCenterY 774.4（Δ2）；旧实现碰撞测试 red（overlap 93px²）
- 深层发现: insertBranchPairInTree（tree-structure.ts:235-264）无条件覆写 source.branches——该按钮若可达会对已有分支的条件节点构成数据丢失路径
- 初步归属: renderer（按钮渲染策略 + 命令守卫缺失）
- 修复: 投影发 `__fdBranchGroupOwner`（split source 标记），分支组 owner 节点不再渲染节点内"+"（addCondition overlay 的 addBranch 为该带唯一入口；尚无分支的新条件节点保留按钮作初始 pair 插入）。先红后绿：碰撞 e2e red（overlap 93）→ green（intersections=[]）。insertBranchPair 覆写守卫登记 watch（见 007）。

[IS-flow-designer-005] 无后继叶子节点（分支腿末端）"+"按钮保持 legacy 锚定，与下方 merge 间隙中点偏差 ~−24px

- 类别: B 级别: P2
- 页面/路由: #/flow-designer 两 tree Tab
- 复现序列: 枚举全部链式按钮 vs 最近下方节点间隙中点（live 读数 offsetFromMid −24 档全部来自 4 枚无后继叶子）
- 证据: sequence-readings.json（钉钉 offsets −6.4/−14.1 screen px 混合档位；叶子按钮 −24 graph px 归因 merge 间隙 120）
- 初步归属: renderer（锚定语义缺口——叶子无 chain edge，无 gap 可派生）
- 裁决: watch-only（登记不修）。理由：叶子按钮下方无子节点，"正确锚点"需产品语义裁决（merge 线中点 / 下方空区固定深度 / 隐藏），非几何事实缺陷；不影响可达性（弱断言"不被裁剪"已绿）。Successor: editor-designer 交互语义批。

[IS-flow-designer-006] 钉钉 Tab add-node 菜单水平锚点单次读数偏左 −132px（Action Tab 正常）

- 类别: B（候选，未复现判别） 级别: P2
- 页面/路由: #/flow-designer（钉钉审批流）
- 复现序列: 点首个"+"按钮 → 读菜单首项 boundingBox：click(538,244) → menu(406,265)；同序列 Action Tab click(538,244) → menu(537,265)
- 证据: sequence-readings.json（单次读数）
- 初步归属: renderer（候选：DropdownMenuPositioner 碰撞规避策略 / 锚定 rect 差异——根因未证实）
- 裁决: watch-only（登记待复现判别）。prompt §9：根因未证实不立案为实锤；菜单仍可用（可绕行）。复判入口：多按钮重复读数 + positioner 策略源码核验。

[IS-flow-designer-007] insertBranchPairInTree 对已有分支节点无条件覆写 branches（数据丢失路径）

- 类别: C 的结构面（防御性契约缺口） 级别: P2
- 页面/路由: 任意 tree 模式（当前 UI 不可达——004 修复后节点内入口在 owner 上隐藏；但 core 命令面公开）
- 证据: tree-structure.ts:235-264 `source.branches = branches` 无已有分支守卫
- 初步归属: renderer/core 命令契约
- 裁决: watch-only（登记不修）。理由：UI 已不可达（004）；core 命令契约加固（branches 已存在时 reject 'constraint'）归 core 契约批，与交互状态轨道边界不同。Successor: flow-designer core 命令契约批。

## 观察项（不立案）

- V5 Esc-cancel：三画布（workflow/钉钉/Action）菜单 Esc 后 viewport/selection/menus 读数全不变 ✓
- V3 保存反馈：workflow Tab 保存钮 disabled-until-dirty（诚实语义）；钉钉/Action Tab 无保存钮（schema 未配）
- 摘要 Tab 卡片/连线行点击选中态读数正常（V6 修复面已覆盖）
- workflow 右键菜单 fit-view 为显式视口操作（V2-legal），Esc 取消路径无痕 ✓
