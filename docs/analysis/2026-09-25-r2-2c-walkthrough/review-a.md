# [review-a] R2-2c 批三（ai + scheduling 18 卡 + dashboard-editor A9-122）独立复核（复核 agent A，第三跑）

- **日期**: 2026-09-25 ｜ **口径**: 检查提示词阶段 3（独立取证在先、与原发现比对在后）
- **复核人**: plan 498 Phase 2 独立复核 agent A（fresh session，与走查执行者无共享上下文）
- **跑次说明**: 本文件为第三跑产物。第一跑因限流中断、第二跑因内容安全误判中断；`_tmp/r2-2c-review/` 下的 ra-_.mjs/ra-_.json 为前跑遗留探针半成品——本轮结论**全部基于本轮重新执行的探针与截图**，ra-\* 数据仅作交叉参照，未直接采信其数值下判定。
- **环境**: dev server `http://127.0.0.1:4175`（curl 200）；Playwright chromium；dark 一律显式 `document.documentElement.setAttribute('data-mode','dark')`；`page.evaluate` 全部传真函数；对比度数值判读走 PNG 像素采样（方法同 `_tmp/r2-2b-probes/w5-png.mjs`）
- **范围**: P1 ×3 全查（calendar C4-83、calendar A3-84、dashboard-editor A9-122）+ P2 ×6 全查（ai-prompts E4-45、ai-sender C1-41、ai-tool-call B1-47、barcode-input C2-81、gantt C4-86、gantt A8-87）+ P3 抽样 ×4（ai-tool-call B4-48、ai-bubble E2-01、kanban A6-88[必查]、calendar F4-85），共 13 项。owner-doc drift 复核（ai + scheduling 18 控件对照 `docs/components/<type>/design.md`）见 §drift。
- **产物**: 探针 `ra3-*.mjs` → JSON `ra3-*.json`、截图 `ra3/<control>/`（均在 `_tmp/r2-2c-review/`，与前跑 ra-\* 前缀区隔）
- **禁改清单遵守**: cards/、ledger.md、packages/ 源码、docs/components/、interactions.mjs 只读。

## §0 汇总表

（判定随复核增量回填；最后一行为总裁决）

| #   | 发现 id      | 控件             | 原判级             | 独立取证结果                                                                                                                                                                                                                                            | 结论                                        | 备注                                                                |
| --- | ------------ | ---------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------- |
| 1   | R2-2c-C4-83  | calendar         | P1                 | 弹层内 calRect w:480、60 格 cellW 全 13px、事件块 12×43px minWidth 0、docOverX 0 无横滚兜底                                                                                                                                                             | **保留 P1**                                 | 三跑数据与原卡一致                                                  |
| 2   | R2-2c-A3-84  | calendar         | P1                 | 周视图事件块 61×2px（computed height 2px / minHeight 0px / overflow hidden）×2                                                                                                                                                                          | **保留 P1**                                 | hitTest 中心点可达但目标 2px，视觉不可见成立                        |
| 3   | R2-2c-C4-86  | gantt            | P2                 | grid computed 320px（flex 0 1 auto）恒定、弹层右缘 920，条 x:806/1006/1286、今日线 x:966 均离屏                                                                                                                                                         | **保留 P2**                                 | 数值与原卡一致                                                      |
| 4   | R2-2c-A8-87  | gantt            | P2                 | 点击条后焦点落 **gantt-grid-row TR**（非 dialog-header）；ArrowDown 行选择 g1→g2 正常；header 聚焦 ArrowRight 弹层才 +16px（header-scoped 证明）；demo 页 ArrowRight 同样不动日期；Enter 在弹层内打开「编辑任务」表单（截图坐实）                       | **驳回**                                    | 原卡三项承重前提（焦点被劫/宿主抢占/仅剩鼠标一条路）全被证伪；见 §4 |
| 5   | R2-2c-F4-85  | calendar         | P3                 | 事件文本 `shiftMorning shift` 复现；状态行「正在查看day视图」+ 周表头 EN（Mon/Tue）+ 按钮 zh（今日/月/周/日）复现                                                                                                                                       | **保留 P3**                                 | 同页中英混排与裸拼接均再现                                          |
| 6   | R2-2c-A9-122 | dashboard-editor | P1                 | mount 即 dirty（fiber 实证 dirty:true/canUndo:false、props 引用恒异）；保存点击 ×3 零存储写入零反馈；commit 本身 ok:true；events.onSave **是函数**（fiber 实证）→ 原「非函数静默 return」断点证伪，真断点为 `${event.serialized}` payload→args 桥接断链 | **保留 P1（根因②改判）**                    | 见 §6                                                               |
| 7   | R2-2c-E4-45  | ai-prompts       | P2                 | 卡 480×32、flex row、label y128 vs desc y132 同行、badge 无右对齐空间                                                                                                                                                                                   | **保留 P2**                                 | 见 §7                                                               |
| 8   | R2-2c-C1-41  | ai-sender        | P2                 | 4 行 clientH38/scrollH96/rectH40、min-h-[40px]+resize-none（L216）                                                                                                                                                                                      | **保留 P2**                                 | 见 §8                                                               |
| 9   | R2-2c-B1-47  | ai-tool-call     | P2                 | PNG 像素采样（无遮罩重拍）light **2.59:1** / dark **1.83:1**                                                                                                                                                                                            | **保留 P2**                                 | 首轮误采 modal 遮罩调暗区，已修正                                   |
| 10  | R2-2c-C2-81  | barcode-input    | P2                 | 错误 div x:1134 w:85 与字段同行、mt-1 失效、group 918→833                                                                                                                                                                                               | **保留 P2**                                 | 见 §12                                                              |
| 11  | R2-2c-B4-48  | ai-tool-call     | P3                 | 规则命中且赢得级联（matches=true、无竞争规则）；`--primary` 为 HSL 分量裸值 "217 89% 53%" → var() 替换后计算值非法 → 回退继承                                                                                                                           | **保留 P3（根因改判）**                     | 原「规则未命中/死通道」证伪；修复方向改判，见 §10                   |
| 12  | R2-2c-E2-01  | ai-bubble        | P3                 | ul list-style none + padding 21px + ::marker 死规则（styles.css L330-341）                                                                                                                                                                              | **保留 P3**                                 | 见 §11                                                              |
| 13  | R2-2c-A6-88  | kanban           | P2 [needs-confirm] | 弹层内拖到卡片上**落位成功**（同列重排 DOM 实证）；空列/列体落点在**弹层与 demo 页双双失败**（drop:0/dragend:1）→ 列级 drop target 全局失效、宿主冲突假说证伪                                                                                           | **保留 P2（根因改判，needs-confirm 解除）** | 见 §13                                                              |

## §1 [R2-2c-C4-83] calendar 月视图 480px 载体塌缩 — 保留 P1

**独立取证**（`ra3-1-sched.mjs` → `ra3-1-sched.json`；截图 `ra3/calendar/ra3-month-default-light-1280.png`）:

- 弹层开 · 月视图默认：calRect `{w:480}`、dlgRect 560 宽；`cellCount:60`（30 日 × 2 资源）、前 8 格宽度全 **13px**；两条事件块 rect `{w:12, h:43}`、`minWidth:"0px"`，文本 `shiftMorning shift` / `maintenanceMaintenance`。
- `docOverX:0`——无横向滚动兜底，与原卡「不溢出但塌缩」镜像缺陷判断一致。
- 事件块 12px 宽 < 24px 目标下限（WCAG 2.5.8），标题不可读；与前跑 ra-sched.json 及原卡探针数值三方一致。

**根因核对**: 月视图按整月固定列数等分容器宽，事件块无 min-width、容器无最少可读宽约束——修复方向（`calendar-month-view.tsx` 最小列宽/横滚兜底）维持。

**结论**: **保留 P1**。

## §2 [R2-2c-A3-84] calendar 周视图零时长事件 61×2px — 保留 P1

**独立取证**（同 `ra3-1-sched.json`；截图 `ra3/calendar/ra3-week-scrolled-light-1280.png`）:

- 周视图两条事件块 computed `height:"2px"`、`minHeight:"0px"`、`overflow:"hidden"`、rect 均 `{w:61, h:2}`；`tabIndex:"0"` 存在但目标物理高度仅 2px。
- 补充精度修正：在事件块几何中心做 `elementFromPoint` 命中测试**可以**命中事件本体（`hitIsEvent:true`）——即 2px 目标在程序化居中点击下可达；原卡「事件不可点」的表述过强，但人手点击 2px 高目标实际不可行，且白字在 2px 裁剪下完全不可见（overflow hidden + 高度 2px）——视觉不可见 + WCAG 2.5.8 目标尺寸违例的 P1 定级不变（`start==end` 无时刻事件是排班域常见输入，fixture 两条事件全中）。

**结论**: **保留 P1**（表述修正：不是「命中不可达」，是「目标 2px 不可用」）。

## §3 [R2-2c-C4-86] gantt 网格固定 320px 弹层内时间线失衡 — 保留 P2

**独立取证**（`ra3-1-sched.mjs` gantt 段；截图 `ra3/gantt/ra3-default-light-1280.png`）:

- dlgRect `{x:360, w:560}`（右缘 920）；gridRect `{w:320, computedWidth:"320px", flex:"0 1 auto"}`——固定宽、无比例收缩。
- 三条任务条 x:806/1006/1286：Design review 806 起尚可见一段（右缘溢出），Implementation/QA pass 整条离屏；今日线 `{x:966}` 离屏。`docOverX:0`（滚动在 timeline 容器内为有意，但初始视口分配失衡）。
- 与原卡（grid 320/scale 154、bars 806/1006/1286、today 966）逐值一致；scaleRect 本轮选择器未命中（原卡 154 与本轮可见区 920-720=200 同量级，不影响结论）。

**结论**: **保留 P2**。修复方向维持（网格比例上限 + 初始视口对齐今日）。

## §4 [R2-2c-A8-87] gantt 键盘移动失效——**驳回**（三项承重前提全被证伪）

**独立取证**（`ra3-1-sched.mjs` kb 段 + `ra3-1b-gantt-kb.mjs` → `ra3-1b-gantt-kb.json`；截图 `ra3/gantt/ra3-after-kb-light-1280.png`、`ra3/gantt/ra3-lab-enter-editor-light.png`）:

1. **「点击任务条后焦点落在 dialog-header」证伪**: 弹层内真实点击任务条后 `activeElement = TR[data-task-id=gantt-grid-row]`（demo 页同测 `TR|1`）——焦点落在网格行并被保持；连续多步键盘操作期间 active 始终是 TR。原卡依据的 `focusAfterClick:"dialog-header"` 未复现（两轮独立探针均为 grid-row）。
2. **「方向键被宿主拖框语义占用」证伪**: dialog.tsx 的方向键移动监听绑定在 **DialogHeader 元素**（`packages/ui/src/components/ui/dialog.tsx` L248-298 `handleKeyDown` 挂 header div，L297 `tabIndex` 仅 header），非全局捕获。决定性实验：聚焦 grid 行按 ArrowRight → 弹层 transform 不变；聚焦 dialog-header 按 ArrowRight → transform `translate(-50%, 0px)` → `translate(-50%, 0px) translate(16px, 0px)`——宿主移动语义只在 header 聚焦时接管，不抢网格按键。
3. **「键盘用户仅剩纯鼠标拖拽一条路」证伪**: 聚焦行按 **Enter 在弹层内打开「编辑任务」表单**（名称/开始/结束/工期/进度 全键盘可编辑，截图 `ra3-lab-enter-editor-light.png` 坐实；demo 页 Enter 后同样出现 5 个输入框）——非拖拽替代路径在弹层宿主完整可用（WCAG 2.5.7 满足）。源码侧 `useGanttKeyboard` Enter 分支 → `onOpenEditor`（`use-gantt-keyboard.ts` L95-102 → `gantt.tsx` L313 `onOpenEditor: openEditor`）。
4. **方向键「+1 日」不是本渲染器的键盘契约**: `use-gantt-keyboard.ts` L84-93 ArrowRight 语义为**树展开/折叠**（无子任务即 no-op），ArrowDown/Up 为行选择（本轮实测 g1→g2 生效，弹层宿主内正常）。键盘日期修改走 Enter→编辑器。demo 页 ArrowRight 同样不移动日期（`ra3-1b` demoAfterArrowRight gridText 与 before 一致）——「宿主冲突」的差异因子不存在，原卡对 R2-1d demo A8 pass（「键盘空格/方向键移动任务」）的解读同样失准（该 pass 描述的「方向键移动任务」实为行选择+Enter 编辑器，建议主 session 顺手更正 R2-1d gantt 卡该处措辞）。

**结论**: **驳回**。原发现的三项承重证据（焦点被劫至 header、宿主全局抢占方向键、弹层内无键盘替代）全部被本轮独立取证否定；「ArrowRight 不位移日期」是渲染器既定导航契约（行选择/展开 + Enter 编辑），且替代路径完整。若需保留观察，应改写为 watch：「gantt 条 Space 仅 select，`handleBarKeyAction` 的 move-up/move-down/resize-left/right 四分支（`gantt.tsx` L233-297）在 `gantt-bars.tsx` L79-95 无任何键盘触发点（死接线）」——属增强项非缺陷，不构成 P2。

## §5 [R2-2c-F4-85] calendar 事件文本裸拼接 + 中英混排 — 保留 P3

**独立取证**（`ra3-1-sched.mjs` + `ra3-1b-gantt-kb.mjs`；截图 `ra3/calendar/ra3-day-view-status-light.png`）:

- 事件块 DOM 文本 `shiftMorning shift` / `maintenanceMaintenance`——type 裸键与标题无分隔拼接复现。
- 日视图状态行：`正在查看day视图，2026-09-24，2 个事件今日September 24, 2026月周日Thursday, September 24...`——「正在查看day视图」view 值未翻译；弹层按钮 `今日/月/周/日/关闭` 全 zh 而周表头 `Mon/Tue/Wed/Thu/Fri/Sat/Sun` 全 EN——同屏混排复现。

**结论**: **保留 P3**（裸拼接 + 混排两半均独立复现；归族 R2-4 / R2-2a-F4-11 族维持）。

## §6 [R2-2c-A9-122] dashboard-editor 保存链路静默失效 — 保留 P1（根因①坐实、根因②证伪换位）

**独立取证**（`ra3-2-dash.mjs`、`ra3-2b-dash.mjs`、`ra3-2c-dash.mjs`、`ra3-2d/2e/2f/2g-dash.mjs` → 各 ra3-2\*.json；截图 `ra3/dashboard-editor/ra3-mount-light-1280.png`、`ra3-after-save1-light-1280.png`、`ra3e-after-save-light.png`）:

1. **矛盾初始态复现**: mount 零改动时 `saveDisabled:false` 而 `undo/redo/deleteDisabled:true`（截图坐实）；fiber 侧 `core.getState().dirty === true` 且 `canUndo:false`。
2. **三次保存点击零效果复现**: mount 保存、palette 加板后保存（panelCount 4→5、undo 解禁——实改动成立）、再保存——`Storage.prototype.setItem` 埋点 `storageCalls: [] ×3`、`localStorage.getItem('flux-dashboard-layout')` 恒 null、无 toast、console/pageerror 零输出。
3. **根因①（mount 即 dirty + dirty 永不清除）行级坐实**: `sameFirstPanelRef:false`、`samePropsRef:false`——editor-core.ts L59-60 对 initialDocument 各做一次 `structuredClone` → working/committed 的 `props`/`source` 对象字段恒为不同引用；`dashboard-domain-adapter.ts` L63 `Object.is(old[key], panel[key])` 对这些对象字段恒 false → 恒产生 phantom patch → `diff !== null` → dirty 恒真。且 commit 成功后 `committed = cloneDocument(working)`（editor-core.ts L130）引用仍不同 → `dirtyAfterCommit:true`——**commit 后 dirty 也不清除**，保存钮永不回灰。
4. **commit 本身健康**: fiber 取到 core 后直接 `core.commit()` → `{ok:true, serializedLen:778}`，validate `{ok:true}`——序列化/校验无故障。
5. **根因②（原卡：dispatchEventRef 对非函数 onSave 静默 return，L128-130）证伪**: 从 save 按钮 fiber 上溯，`DashboardEditorRenderer` pendingProps `events = { onSave: function }`——宿主 onSave 编译链路完好，非函数守卫不是本次断点。
6. **真实断点下探（新根因方向）**: 手动调用 `events.onSave({type:'dashboard-editor:save', serialized:'SENTINEL'})` → 调用不抛错、返回对象（action 程序确实跑了），但 `localStorage` 依旧零写入；UI 保存后 panelCount 保持 5（`layout` prop 未被 setValue 更新——若 setValue 写入了 undefined，layout 变更会触发会话重建、面板清零）。即：**保存事件程序的 `${event.serialized}` 参数求值没有到达宿主动作**——`dashboardDemo:persist` 的 invoke 带 `typeof serialized === 'string'` 守卫，非字符串时静默返回 `{ok:true}`（`apps/playground/src/pages/dashboard-demo.tsx` L122-133），setValue 侧同样无效果且无任何诊断。对照组：同页 `dashboardDemo:back`（无参数宿主动作）经 Back 按钮触发正常（hash 变 `#/`）——宿主 actionScope 通道本身健康，断点在「自定义渲染器事件 payload → 动作 args 事件绑定」桥接（`dashboard-editor-renderer.tsx` L126-133 createNormalizedActionEvent + `node-renderer-resolved.tsx` L247-275 events 包装 + action-core 参数求值的组合路径），精确断点行建议修复时以 action 程序 args 求值上下文为主线排查。
7. **附带观察（同根因放大器）**: demo 页「Saved Layout (dashboard-editor:save → host persist)」panel + json-view 在 DOM 中完全缺失（`[data-slot="json-view"]` 不存在、全页无 "Saved Layout" 文本，滚动后仍无）——demo 自述的第三个反馈通道也不在位，保存失败因此更不可察觉。

**结论**: **保留 P1**。用户可见症状（mount 即 dirty、保存零效果零反馈、刷新丢布局、保存钮失去提示价值）全部复现且为保存主路径；原根因①坐实，原根因②修正为「事件 payload→args 桥接断链 + 宿主 persist invoke 静默守卫」，修复面从「renderer 单点」扩为「renderer diff 深比较 + 事件参数桥接 + 宿主 persist 显式失败反馈」三处。修复方向维持原卡 ①③，② 改按上述断点执行。

## §7 [R2-2c-E4-45] ai-prompts 提示词卡内部排布塌缩 — 保留 P2

**独立取证**（`ra3-3-ai.mjs` prompts 段 → `ra3-3-ai.json`；截图 `ra3/ai-prompts/ra3-dialog-open-light-1280.png`）:

- 三张 `ai-prompts-item` 卡 rect 全部 480×32；computed `display:flex / flex-direction:row`；item 1 label y:128 vs description y:132（`sameLine:true`，4px 偏移即 `mt-1` 在行布局中的残留）——label 与 description 同行、badge 未见右对齐（本轮 fixture badgeRect 为 null，前跑 ra-ai.json 曾测得 badgeRect 与 desc 同排，方向一致）。
- 源码核对：`ai-prompts.tsx` L74-100——Button（ui button.tsx 基类 `inline-flex`）直接包裹 `div(标签行)` + `p(description mt-1)`，二者作为 flex item 进入同一 row；`text-left` 加在 Button 上对 flex item 无效；badge 的 `ml-auto` 在 shrink-to-fit 内层 div 中无可分配空间。三重意图失效与原卡机制描述一致。

**结论**: **保留 P2**（信息层级错乱坐实；修复方向维持：Button 补 `w-full flex-col items-stretch` 或单层 `flex flex-col` 容器包裹）。

## §8 [R2-2c-C1-41] ai-sender 多行草稿固定 40px 不长高 — 保留 P2

**独立取证**（`ra3-3-ai.mjs` senderGrow 段；截图 `ra3/ai-sender/ra3-multiline-4line-light-1280.png`）:

- 实打 4 行（Shift+Enter）：`clientH:38 / scrollH:96 / rectH:40`、value 4 行齐全、`min-height:40px` + `resize-none`（`ai-sender.tsx` L216 坐实），无任何 auto-grow 逻辑——4 行内容只显末两行。
- 数值与原卡（38/96/40）逐值一致。

**结论**: **保留 P2**。修复方向维持（onInput 自动长高封顶或 rows 随内容增长）。

## §9 [R2-2c-B1-47] ai-tool-call 批准钮白字对比度不足 — 保留 P2

**独立取证**（`ra3-3e-hitl.mjs` 干净无遮罩截图 + `ra3-3d-png.mjs` PNG 像素采样 → `ra3-3e-hitl.json`/`ra3-3d-png.json`；截图 `ra3/ai-tool-call/ra3-approve-clean-light.png`、`ra3-approve-clean-dark.png`）:

- 方法说明：前一轮采样误用弹层开启态截图——modal 遮罩+backdrop-blur 压暗了页面上的 HITL 卡（采样读数 11,56,41 即被遮罩调暗的绿），已重拍无遮罩同态截图后采样。
- PNG 像素采样（66×28 按钮区 1320 px，主色簇 1031 px）：light bg `rgb(16,183,127)` + 白字 → **2.59:1**；dark（真 data-mode）bg `rgb(38,217,157)` + 白字 → **1.83:1**。与原卡数值（2.59 / 1.83）逐值一致。
- 源码坐实：`ai-tool-call.tsx` L243 `className="bg-success hover:bg-success/90 text-white"`。

**结论**: **保留 P2**（双主题均 < 4.5:1、dark 近 P1 线；修复方向维持：`text-success-foreground` 或调深 `--success`，两主题各验 4.5:1）。

## §10 [R2-2c-B4-48] JSON 参数语法高亮失效 — 保留 P3（根因改判：规则命中但 var() 替换失效）

**独立取证**（`ra3-3-ai.mjs` toolArgs/tokRules/tokMatch 段、`ra3-3b-tok.mjs` 级联取证、`ra3-3c-tokvar.mjs` 变量值取证）:

- `.tok-key`/`.tok-str` computed color 全部 `rgb(33,53,71)`（继承前景），light/dark 同象——症状与原卡一致。
- **原卡机制（"规则未命中渲染树/死通道"）证伪**：级联取证显示 `.nop-ai-tool-call .tok-key { color: var(--primary, hsl(221 83% 53%)) }` 存在于注入样式表中、**命中且赢得级联**（span.matches=true、无任何更高优先级 color 规则竞争）。
- **真根因**：`--primary` 在 playground 上是 Tailwind v3 式 **HSL 分量裸值**（`getComputedStyle` 实测 `--primary: "217 89% 53%"`，root 与 span 同值）——`var(--primary, hsl(…))` 替换后声明变为 `color: 217 89% 53%`，在计算值阶段非法 → 整体回退为继承色。CSS 的 fallback 仅在 `--primary` **未定义**时生效，定义了但值非法不触发 fallback——高亮因此必死。原卡修复方向（查注入/选择器命中）会白查。
- **修复方向（改判）**：`styles.css` 的 `.tok-*` 颜色改用与宿主令牌约定匹配的写法——`hsl(var(--primary) / 1)`（分量约定）或引入完整色值令牌（`--ai-md-primary` 已有先例，见 `[data-slot="ai-bubble-markdown"] .tok-key { color: var(--ai-md-primary) }` 同表规则），并同步核查 `.tok-str/.tok-bool` 与 ai-sender tiptap 通道。

**结论**: **保留 P3**（症状与判级不变；根因与修复方向按本轮证据改判）。

## §11 [R2-2c-E2-01] ai-bubble 列表标记不渲染 — 保留 P3

**独立取证**（`ra3-3-ai.mjs` bubbleList 段；截图 `ra3/ai-bubble/ra3-default-light-1280.png`）:

- markdown 无序列表 computed `list-style-type:"none"`、`padding-left:"21px"`（=1.5em 恢复规则生效）、`::marker content:"normal"`（marker 不存在）、2 li（item one/two）——列表仅剩缩进无圆点。
- 源码核对：`flux-renderers-ai/src/styles.css` L330-334 恢复了 margin/padding 但未恢复 `list-style-type`；L338-341 的 `li::marker` 着色为死规则；L343-345 `.task-list-item` 豁免在位。与原卡机制一致（原卡行号 L345-347 系 marker 规则，实际 L338-341，微移不误）。

**结论**: **保留 P3**。修复方向维持（ul/ol 补 `list-style-type: revert`，保留 task-list 豁免）。

## §12 [R2-2c-C2-81] barcode-input 错误文案内联挤占字段行右端 — 保留 P2

**独立取证**（`ra3-3-ai.mjs` barcode 段；截图 `ra3/barcode-input/ra3-required-error-light-1280.png`）:

- 空值提交后：`.nop-barcode-input` host `flex/row`；错误 div（含「不能为空」的唯一命中元素）rect `{x:1134, y:271, w:85, h:32}`、`display:block`、`margin-top:4px`（为文档流下方设计、行布局中失效）、color `rgb(239,67,67)`；input-group 918→**833px** 被挤短——错误与字段同排、压成 85px 竖条。
- 源码坐实：`barcode-input.tsx` L339 `[data-slot="barcode-validation-error"]` div 与 input-group 同为根 flex-row 的子项，`mt-1` 设计失效；L290 `displayError = validationError ?? formError?.message`；L309 `aria-describedby={validationError ? errorId : undefined}` 确实只覆盖渲染器自身 validationError（A9-82 的源码引用同证）。
- 数值与原卡（x:1134/w:85、group 833）逐值一致。

**结论**: **保留 P2**（修复方向维持：根容器 flex-col 或错误 div 包全宽行；A9-82 的 displayError 统一接 aria/边框属同批修复面，本轮抽样不重复判）。

## §13 [R2-2c-A6-88] kanban 指针拖拽落位失败 — 保留 P2（needs-confirm 解除；根因改判：列级 drop target 全局失效，非弹层宿主缺陷）

**独立取证**（`ra3-4-kanban.mjs`、`ra3-4b-kanban.mjs`、`ra3-4c-kanban.mjs`、`ra3-4d-kanban.mjs` → 各 ra3-4\*.json；截图 `ra3/kanban/ra3-after-drop1-light.png`、`ra3b-after-carddrop-light.png`、`ra3c-demoColBody.png`、`ra3d-demo-nonempty-colbody.png`）:

1. **弹层内拖入空列失败复现**（3 种方式）：16 步快拖、40 步慢拖（含 40ms 停顿）、Playwright `dragAndDrop` API（CDP drag 事件通道）——Done 列落位全部失败（`drop:0/dragend:1`、probeMove 0、列计数不变、列边框无高亮）。原症状真实。
2. **「模拟器伪影」假说证伪**：原生拖拽事件在弹层内完整流动（dragstart 1 / dragover 15–72 / dragenter 6–8 / dragend 1），dragover target 命中 `nop-kanban-column-empty`（正确元素）；连专用 drag 事件通道也失败——非 headless 输入模拟局限。
3. **「弹层宿主指针冲突」假说证伪（关键改判）**：弹层内**拖到既有卡片上落位成功**——drop:1、Card Alpha 落到 Card Beta 之后（`To Do: Card Beta, Card Alpha`，DOM 实测）。若如原修复方向猜测的 dialog-host `setPointerCapture`/`preventDefault` 互斥，card-target 落位也会一起死。dialog 拖拽指针逻辑仅在 dialog-header 内触发（`use-dialog-drag.ts` L167 header 守卫），与卡片 DnD 无交集。
4. **「demo 页同款 mouse 流可落位 → 差异因子为弹层宿主」证伪**：demo 页复测——落点为列体（评审中空列、非空列末卡下方 12–24px）时 `drop:0/dragend:1` 全失败（与弹层一致）；原卡引用的 demo 成功证据实为**落在既有卡片上**（card-target），demo 页从未测过空列/列体落点。
5. **根因定位（新）**：kanban 的 pdnd 集成中只有 **card 级 drop target**（`use-kanban-dnd.ts` L122-150 `kanban-card-target`）参与落位；**column 级 drop target**（同文件 L153-178 `kanban-column`，经 `kanban-column.tsx` L125-135 挂到 columnRef）在两种宿主下都不生效——dragover 已到达列内正确元素但不触发其 preventDefault/engagement，`onDragEnter` 高亮（L169-171）因此永不出现。落点不在卡片上时（空列、列尾空隙）鼠标拖拽必然回弹。

**结论**: **保留 P2**（判级按原卡条件句第一支：「渲染器缺陷、鼠标用户不可用、键盘可替代」——但缺陷面从「弹层集成」改判为「渲染器列级 drop target 全局失效」：空列/列尾落点在任何宿主都不可拖入，R2-1d demo A6 的 pass 口径（卡间落位）应并记此缺口）。修复方向改判：不再查 dialog-host 指针冲突，直接排查 `registerColumn` 的 `dropTargetForElements` 为何不参与 pdnd 落位判定（注册时机/canDrop/pdnd 版本内嵌套 target 规则），验收 = 弹层与页面两宿主内「拖入空列 + 目标列高亮」同时成立。

## §drift owner-doc 复核小节（ai 14 + scheduling 4 + dashboard-editor）

**owner doc 归档登记**: ai 14 控件在 `docs/components/` 下**无逐控件 design.md**——owner doc 为**包级** `docs/components/flux-renderers-ai/design.md`（另有 renderers.md / product-spec.md / engine.md）。非 owner-doc-missing（有 owner 文档，仅粒度为包级），登记为粒度备注，不新建。scheduling 4 控件（barcode-input/calendar/gantt/kanban 各自有目录）与 dashboard-editor 均有独立 design.md。

逐条对照本轮正式发现 + live code 确认后，drift 确认 **3 条硬 drift + 1 条跨复核勘误**：

| id   | 控件/文档                                                       | drift 内容                                                                                                                                                                                                                                                                                                                                                                                                              | 证据                                                                      | 建议                                                                                                                                               |
| ---- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| DA-1 | kanban/design.md                                                | **L254 明文契约被实现违反**："空列时，column 容器本身始终是有效的 drop target，确保卡片可拖入无卡片的列"——实测空列/列体落点在 demo 页与弹层宿主**双双落位失败**（drop:0/dragend:1，A6-88 本轮改判根因）。另 **L319** 记 `data-drop-target="true"` 为拖拽悬停列标记、`kanban.css` L144 有消费规则，但 **kanban 组件层无任何 tsx 设置该属性**（grep 0 命中）——文档化的高亮机制在生产者侧即断链，与实测"目标列零高亮"互证  | kanban/design.md L254/L319-330；use-kanban-dnd.ts L153-178；本轮 §13 探针 | 修复 A6-88 列级 drop target 后补「空列鼠标拖入」回归用例；L319 的 data-drop-target 契约与实现二选一对齐（实现缺失则 doc 标注未实现）               |
| DA-2 | gantt/design.md                                                 | **L281 onTaskEdit 契约行记录了实际死接线的键盘通道**：文档将"键盘日期编辑 move-up/move-down/resize-left/resize-right——2-19 契约裁决"列为既有事件通道；实测 `gantt.tsx` L233-297 有四动作处理分支，但 `gantt-bars.tsx` L79-95 键盘处理只可能派发 `select`（Space）/Enter——**无任何按键能触发 move/resize**，键盘日期编辑在任何宿主均不可达（A8-87 驳回后的残余观察）                                                     | gantt/design.md L281；gantt-bars.tsx L79-95；本轮 §4 探针                 | 二选一：实现补按键触发（如 Alt+方向键派发四动作，兑现 L281 契约），或 doc L281 注明"键盘触发点未接线，仅事件契约在位"（对齐 §12.9 的 future 口径） |
| DA-3 | flux-renderers-ai/design.md（包级，覆盖 ai 14 控件）            | **L84 "JSON 高亮 ✅ 已交付" 与 L451 "tool-call JSON 高亮与 markdown token 同一语义调色板（theme var 驱动）" 在宿主令牌约定下不成立**：`flux-renderers-ai/src/styles.css` 的 `.tok-*` 用 `var(--primary, hsl(…))` 消费，playground `--primary` 为 HSL 分量裸值 → 计算值阶段非法 → 高亮整体失效（B4-48 本轮改判根因）；markdown 侧 `--ai-md-primary`（完整色值）正常——"同一调色板且 theme var 驱动"仅在 markdown 半边成立 | flux-renderers-ai/design.md L84/L451/L667；ra3-3b/ra3-3c 取证             | 修复 B4-48 后 doc 无需改（契约是对的）；若选择保留 `var(--primary,…)` 写法则需同步改 doc 并声明令牌约定前提                                        |
| DA-4 | dashboard-editor/design.md L80-84（对 review-b D-3 注记的勘误） | review-b 在 L82 插入的现状注记写"双断点：adapter `Object.is` 引用比较 + **onSave 派发静默 return**"——本轮 fiber 实证 `events.onSave` **是函数**（宿主编译链路完好），真断点为 `${event.serialized}` payload→args 桥接断链 + 宿主 persist invoke 的静默守卫（本轮 §6）。注记中"勿依赖 demo 页保存行为"的警示仍有效，仅根因表述需按 review-a §6 更正                                                                      | dashboard-editor/design.md L82 注记；ra3-2c-dash.json                     | 主 session 回写台账时按本表更正 D-3 注记中的第二断点表述；其余维持 review-b 结论                                                                   |

**无 drift 声明**（正式发现与 owner-doc 无冲突/文档无反向承诺）：calendar（design.md 未承诺月视图最小列宽、零时长事件兜底、事件文本格式——C4-83/A3-84/F4-85 均为实现缺口非 doc 冲突）、barcode-input（design.md 未规定 form 校验错误的位置，L369 仅约束 scanner overlay 内镜像）、ai-prompts（doc L81 仅列布局变体清单，未规定卡片内部排布）、ai-sender（doc 无 auto-grow 承诺）、ai-bubble（doc 无列表 marker 承诺）、ai-chat/ai-conversations/ai-suggestions（doc 对 emptyState 引导、宿主未接线事件诊断、popover 关闭时机均无契约表述）、ai-attachments/ai-citations/ai-feedback/ai-message-list/ai-token-usage/ai-voice-input/ai-welcome（本批无正式发现，无对照点）。

## 总裁决

**13 条正式发现复核完成：保留 12 ／驳回 1 ／降级 0**。保留项中 **3 条实质改判根因**（A9-122 第二断点证伪→事件 payload→args 桥接断链；B4-48「规则未命中」证伪→`--primary` 分量约定致 var() 计算值非法；A6-88「弹层宿主冲突」证伪→列级 drop target 全宿主失效、needs-confirm 解除），1 条表述修正（A3-84「命中不可达」→「目标 2px 不可用」）。驳回项：A8-87（焦点被劫/宿主全局抢占/无键盘替代三前提全被独立取证否定，Enter 编辑器为完整非拖拽替代）。

**drift**：硬 drift 3 条（DA-1 kanban 空列 drop target 契约 + data-drop-target 生产者断链；DA-2 gantt L281 键盘日期编辑死接线；DA-3 ai 包 doc JSON 高亮已交付声明不成立）+ 跨复核勘误 1 条（DA-4 更正 review-b D-3 注记中的第二断点表述）；owner doc 粒度备注 1 条（ai 14 控件为包级 design.md，非 missing）；无 drift 声明 12 控件。

**新实例/新根因摘要**（供主 session 回写）：① `${event.serialized}` 事件 payload→动作参数桥接断链（dashboard-editor:save 全链路静默失效的真断点，含宿主 persist invoke 静默守卫放大器与 demo 页 Saved Layout 面板 DOM 缺失旁证）；② pdnd 列级 drop target（`kanban-column`）在两宿主均不参与落位判定、仅 card-target 生效；③ playground `--primary` HSL 分量约定 × `var(--primary, fallback)` 消费写法 = fallback 永不生效的高亮杀手（`.tok-*` 全军覆没，同写法处建议全查）；④ dialog 方向键移动语义为 header-scoped（`use-dialog-drag.ts`/`dialog.tsx`），不与画布类控件键盘冲突——gantt/calendar 键盘观察不应再归因宿主抢占。另建议主 session 顺手更正 R2-1d gantt 卡 A8 pass 的措辞（「方向键移动任务」实为行选择 + Enter 编辑器）与 R2-1d kanban A6 pass 的适用范围注记（卡间落位，不含空列）。

**产物**: 探针 11 个（`ra3-1*.mjs` ×2、`ra3-2*.mjs` ×7、`ra3-3*.mjs` ×4、`ra3-4*.mjs` ×4，含修正版）＋ JSON 14 份＋截图 14 张，全部在 `_tmp/r2-2c-review/`（`ra3-*.json` 与 `ra3/` 目录）。cards/、ledger.md、packages/ 源码、docs/components/、interactions.mjs 未做任何改动（只读）；`_tmp/` 遗留半成品 ra-\* 未清理（属前跑产物，保持原状供追溯）。
