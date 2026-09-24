# R2-2c 控件族走查批三汇总（summary）

> Date: 2026-09-25 ｜ Owner plan: `docs/plans/498-visual-quality-r2-2c-ai-scheduling-host-canvas-walkthrough-plan.md`
> 口径: `docs/skills/visual-page-quality-inspection-prompt.md` ｜ 截图: `_tmp/visual-inspection-2026-09-25/r2-2c/`（不入库，dark 全部真 data-mode 自采）
> 产物: cards/×34 ｜ review-a.md + review-b.md（独立复核）｜ interactions.mjs 扩面 25 键 + flow-designer 既有键扩展合并（注册表共 120）｜ 深挖并入复核轮

## 1. 评分卡（34 控件，按波分组；总评口径 pass=无 P0–P2 / warn=仅 P3 / fail=有 P0–P2；被复核驳回的锚不计入该卡锚集）

**wave1 ai 前半（7）**：ai-attachments **pass**（6 族引用）｜ ai-bubble 有风险 ｜ ai-chat 有风险 ｜ ai-citations **pass**（4 族引用，Popover dark 亮底 ai 系首个形态实例）｜ ai-conversations 有风险 ｜ ai-feedback **pass**（dark primary 4.2:1 边缘实例）｜ ai-message-list **pass**（5 族引用）
**wave2 ai 后半（7）**：ai-prompts fail（P2 E4-45）｜ ai-sender fail（P2 C1-41）｜ ai-suggestions 有风险 ｜ ai-token-usage **pass**｜ ai-tool-call fail（P2 B1-47）｜ ai-voice-input **pass**｜ ai-welcome **pass**
**wave3 scheduling（4）**：barcode-input fail（P2 C2-81）｜ calendar fail（P1 C4-83、P1 A3-84）｜ gantt fail（P2 C4-86；A8-87 复核驳回，无剩余影响）｜ kanban fail（P2 A6-88）
**wave4 可视化宿主（6）**：dashboard 有风险 ｜ dashboard-editor fail（P1 A9-122、P2 G7-123）｜ graph 有风险 ｜ map 有风险 ｜ pivot-table **pass**（4 项 R2-1c 维持不改判；C6 DPR2 达标可作修复参照）｜ three-canvas **pass**（4 项 R2-1c 维持）
**wave5 设计器/编辑器宿主（10）**：designer-canvas 有风险 ｜ designer-edge-row **pass**｜ designer-field 有风险（载体零渲染点）｜ designer-node-card 有风险 ｜ designer-page fail（P2 C2-154）｜ designer-palette **pass**（G2-01 维持）｜ scada-canvas **pass**（3 族维持）｜ scada-editor-canvas **pass**（G7-01 逐值复现维持）｜ spreadsheet-page fail（P2 A9-156）｜ word-editor-page 有风险

分布：**fail 10 ｜ 有风险 11 ｜ pass 13**（`compute-batch.cjs` 同源复算 + 驳回锚剔除口径——gantt 的 A8-87 驳回后仍由 C4-86 P2 锚保持 fail；unique 39、P1×3/P2×10/P3×26 与本表一致）。

## 2. 发现台账

严格口径 **39 条正式条目**（唯一 id）：**P0 ×0 ｜ P1 ×3 ｜ P2 ×10 ｜ P3 ×26**（含 2 条复核驳回 A8-87/G2-128，判级按卡面口径计）。归族：**systemic 5 ｜ local 19 ｜ watch-only 15**。watch-only 15 条全部登记 `docs/audits/visual-quality-r2/watch-pool.md`（2026-09-25 追加行，grep 计数回读验证）。

## 3. 独立复核（两路 fresh agent，共 23 判定；review-a 为第三跑——前两跑分别因账户限流与内容安全误判中断，增量写盘完成后）

- review-a（ai + scheduling 域，P1×3 + P2×6 全查 + P3 抽样×4）：**12 保留 / 1 驳回（gantt A8-87 三项承重前提全部证伪：焦点落 grid-row 非 dialog-header、弹层方向键移动为 header-scoped、Enter 打开编辑表单即键盘替代——WCAG 2.5.7 满足）**；根因实质修正 3 处——①A9-122 根因②换位：events.onSave 为函数（fiber 实证），真断点 = `${event.serialized}` payload→动作参数桥接断链；②B4-48 根因改判：playground `--primary` 为 HSL 分量裸值，`var(--primary, fallback)` 替换后计算值非法回退继承，fallback 永不生效；③A6-88 根因改判：弹层内 card-target 落位成功，列级 drop target（use-kanban-dnd L153-178）全宿主失效，needs-confirm 解除。
- review-b（宿主/画布域，P2×3 全查 + P3 抽样×7）：**9 保留 / 1 驳回（graph G2-128："拖拽驻留"实为 viewport pan，源码 `nodesDraggable={false}` 与 owner-doc 只读定位一致，提请的 R2-1c 改判不成立）**；根因修正 2 处——A9-156（原"首键未 seed"证伪，真凶 inline-controls.tsx L27 `input.select()` 全选播种字符被替换，慢键入仍复现=确定性缺陷）、G7-123（收敛为 editor-inspector.tsx L27 非响应式 `core.getState()` 快照）。
- 覆盖：P1 3/3 全复核；P2 10/10 全查；合计 23 判定 = 3 P1 + 10 P2 + 10 P3 抽样（P3 地板 ≥9 满足）。
- **watch 先例复检裁定**：R2-1b-G1-01 维持 systemic（`borderColorSelected` 门控源码锚实证）、G2-01 维持；**R2-1b-G6-01 反转**——wave5 卡「已消失/已修复」记录系探针前置 undo 假阳性，review-b 全链路验证复现原始 bug，G6-01 恢复 open（两卡已加反转标注）。R2-1c 页单元维持 14 项（C6-01/C1-01/B3-01/C2-01/B5-01/A3-01/E1-01 等）、G3-01 修复确认。
- 方法学沉淀：Playwright evaluate 闭包陷阱三度复现；渐变/oklab 底 DOM 合成失真为系统性方法风险，像素采样为唯一可靠口径；pdnd（pointer-based dnd）列级 target 与卡片级 target 行为分叉是新排查模式。

## 4. 族归并（与 R2-1a–d/R2-2a/R2-2b 已裁定族去重合并）

1. **【既有族扩面】G7 属性面板双向同步族（R2-3 候选，本批主审查维度）**：dashboard-editor G7-123（inspector 非响应式快照，review-b 行级定位）+ scada-editor G7-01 逐值复现维持 + designer-page G7 写路径断（R2-1b-G7-01 维持）——修复面集中在编辑器 state→inspector 订阅层。
2. **【既有族扩面】lab 载体与环境基建族（R2-2a 新登记）**：ai-chat A5-02/ai-conversations A9-03（fixture 未接线/空态无引导）、kanban A9-90（onAddCard 未接静默 no-op）、dashboard-editor G4-125 空画布零引导——fixture/宿主接线面。
3. **【既有族实例】i18n zh-CN 回退（R2-2a-F4-11 族）**：ai 7/7 卡、scheduling 全卡、barcode 校验文案等（批准/拒绝/已批准/发送/用量未上报/上一页/移动任务对话框）——引用不另立。
4. **【既有族实例】dark 平价/对比度族（R2-4）**：ai-feedback dark primary 4.2:1 边缘、ai-sender dark 发送钮 3.26:1、gantt `--secondary-foreground` 2.06–2.89:1、kanban dark 钮边界、barcode B5-01 徽章 dark ≈1.2:1、B4-48 `--primary` 分量裸值 × fallback 写法（**新根因形态：同写法处建议全查**）。
5. **【新 systemic 实例】响应式断点/固定宽度族（R2-3c 候选扩面）**：calendar C4-83（月视图 480px 容器 30 列压 12px，P1）+ gantt C4-86（网格固定 320px 弹层内时间线 154px，P2）——与 R2-1a #2 窄视口族的渲染器侧根因同域（容器自适应契约缺失）。
6. **【新单点 systemic】dashboard-editor 拖拽反馈族候选**：A6-124 palette 落点零反馈（→R2-3 拖拽反馈契约，与 R2-1a A6 族同域）。
7. **【既有族扩面】A3 小目标**：calendar A3-84（周视图零时长事件 61×2px，P1 升格证据——零时长事件的渲染下限契约缺失）。
8. **【R2-1b watch 先例反转】**：G6-01 恢复 open（见 §3）；R2-1d 卡勘误提请（gantt A8 措辞、kanban A6 pass 适用范围）按 Rule 21 记录于 review-a，不改写 R2-1d 历史卡。
9. **【归并裁定】scope-debug 面板家族**：ai-message-list/ai-chat 无新实例；data-source C1-85 极值实例（R2-2b）仍是该修复面最重案例。

## 5. R2-4 首批族终裁输入第三轮刷新（Decision）

> 合并 R2-1a/R2-2a/R2-2b/本批台账；终裁已在 plan 500（active）立项时登记：dark 平价/对比度族 = R2-4 首批。

1. **dark 平价/对比度族（plan 500 执行中）**：≈50 面 + 本批新增实例（B4-48 fallback 写法根因形态建议并入 plan 500 Phase 2 执行清单；gantt `--secondary-foreground`、ai-feedback/--primary 边缘等作为复检载体增量）。
2. **R2-3 候选族排序更新（供字母批引用）**：①弹层 actions 左对齐（R2-3b = plan 499 active）；②schema 声明静默失效族（≥9 例）；③**响应式断点/固定宽度族（本批 calendar/gantt P1+P2 升格，与窄视口族合并为 R2-3c 主修复面的证据增强）**；④窄视口 flex/固定壳层；⑤lab 载体与环境基建；⑥G7 编辑器同步族（本批 G7-123 行级定位后修复面收敛，候选 R2-3d）。
3. **R2-4 后续字母批输入**：ai 侧 local 散项（ai-bubble E2-01、ai-sender C1-41/C2-43/D7-44、ai-prompts E4-45、ai-suggestions A7-46、ai-tool-call B1-47/B6-49〔B4-48 另见 §5.1 dark 族路由〕）、scheduling local（barcode C2-81/A9-82、calendar F4-85、kanban A6-88/A5-89）、host local（dashboard-editor A9-122/G7-123/G4-125、designer-page C2-154、spreadsheet A9-156）合计 19 条（17 条列示 + B4-48 见 §5.1 + 卡面 grep 兜底）。

## 6. 健康面（复核确认的正向基线）

ai 渲染链路 lab 载体面整体健康：流式中间态全链（data-streaming+aria-busy+光标+停止钮）、HITL 批准恰好一次、abort 终态、javascript: URL 安全门、scroll-to-bottom 闭环全过；lab 载体不复现 R2-1d demo 页侧栏冻结（scope 通知修复佐证）；kanban 键盘拖拽全链路（Space→Arrow→Space，onCardMove 触发、列计数迁移）；pull-refresh/swipe-cell 状态机维持全过；echarts 16 canvas DPR 全达标；pivot-table 四域唯一 matchDpr2 达标（可作 dark 修复参照）；three-canvas 相机 orbit 功能正常；plan490 H1 阶梯在 prompts 弹层 560 档复检命中。

## 7. Quick Wins（<30min）

1. `var(--primary, fallback)` 写法全查修正（分量裸值约定下 fallback 永不生效，grep 全仓同写法）。
2. calendar 零时长事件最小渲染尺寸（min-height 2px→≥8px + min-width，P1 修复面单点）。
3. editor-inspector G7-123：`core.getState()` 改订阅（单点收 dashboard-editor 双向同步）。
4. spreadsheet inline-controls `input.select()` 条件化（有 seed 时跳过全选，收 A9-156）。
5. kanban 列级 drop target 接线（use-kanban-dnd L153-178 恢复列容器参与，收 A6-88/A5-89）。

## 8. 最大影响修复 Top 3

1. **dashboard-editor 保存链路（A9-122 P1，双断点已行级定位）**——编辑器核心闭环（dirty 判定 + payload→动作参数桥接），demo 页保存功能恢复。
2. **calendar/gantt 容器自适应（C4-83 P1 + C4-86 P2）**——scheduling 双控件的窄容器渲染契约，弹层内月视图/时间线可用性恢复。
3. **G7 编辑器同步族（G7-123 行级定位 + scada/designer 维持实例）**——inspector 订阅化单点修复收全编辑器域。
