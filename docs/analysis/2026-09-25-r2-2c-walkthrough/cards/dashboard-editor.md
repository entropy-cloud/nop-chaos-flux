# [card] control:dashboard-editor

- **批次**: R2-2c ｜ **台账状态**: carded ｜ **日期**: 2026-09-25
- **路由**: `#/dashboard-demo` ｜ **载体**: 域 demo 页（Dashboard Editor：WorkbenchShell palette+canvas+inspector 三段壳层 + editor-core 会话；dashboard 渲染器经 Preview 态承载，运行面见同目录 dashboard 卡）
- **矩阵裁剪**: full（matrixReason：G1–G8 全走；G5 缩放/平移 n/a——编辑器无缩放控件（与 R2-1c 口径一致）；弹层开态不可达（页面无弹层载体，探针 role=dialog/popover 全 0）；loading/error 无异步源；glass 按波次口径省略）
- 本页实际裁掉的状态：弹层打开（无载体）、G5 缩放、loading/error、glass 皮肤

## 1. 截图清单

| 状态                    | light                                                                                    | dark（真 data-mode）                                                                    |
| ----------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| 默认 1280×800           | `_tmp/visual-inspection-2026-09-25/r2-2c/dashboard-editor/editor-default-light-1280.png` | `_tmp/visual-inspection-2026-09-25/r2-2c/dashboard-editor/editor-default-dark-1280.png` |
| 默认 ~800 宽            | `_tmp/visual-inspection-2026-09-25/r2-2c/dashboard-editor/editor-default-light-800.png`  | `_tmp/visual-inspection-2026-09-25/r2-2c/dashboard-editor/editor-default-dark-800.png`  |
| hover（面板强制 hover） | `editor-panel-hover-light-1280.png`                                                      | —                                                                                       |
| 选中态（G1：ring+手柄） | `editor-select-light-1280.png`、`editor-select-hover-light-1280.png`（⊗ hover 显形）     | —                                                                                       |
| 拖拽进行中（A6/G3）     | `editor-dragmid-light-1280.png`                                                          | —                                                                                       |
| palette 拖放落位后      | `editor-postdrop-light-1280.png`                                                         | —                                                                                       |
| G7 inspector 改名后     | `editor-g7-renamed-light-1280.png`                                                       | —                                                                                       |
| undo×3 回退后（G6）     | `editor-after-undo3-light-1280.png`                                                      | —                                                                                       |
| 空画布（G4）            | `editor-empty-light-1280.png`                                                            | —                                                                                       |

## 2. A–H 维度勾选表

- A 交互：A1 pass（palette hover accent、面板 hover border primary/50 实测变色）A2 pass（面板 focus ring shadow 实测；canvas body focus-visible 类在——程序态 focus 不触发属正常启发式）A3 warn（resize 手柄 12×12、workbench 分栏手柄 4×560、表列手柄 4×39.5 = R2-1a-A3 族命中引用）A4 pass（undo/redo/delete 正确 disabled）A5 pass A6 **fail(R2-2c-A6-124)**（palette 拖拽无落点反馈维持 + 拖拽中被拖面板可被完全遮挡）A7 n/a（无弹层载体）A8 **warn(R2-2c-A8-126)**（inspector 数值输入提供非拖拽替代 pass；但键盘选择通道死：聚焦≠选中）A9 **fail(R2-2c-A9-122)**
- B 颜色：B1 pass（headerTitle 20.01:1 / inspectorHint 7.46:1；dark 15–17:1）B2 pass B3 pass B4 pass B5 pass（dark 全量平价、白块 0）B6 pass（选中 ring primary、destructive hover）
- C 布局：C1 fail（面板内容溢出 = chart/table/stat 溢出族，见 dashboard 卡/editor §4）C2 **warn（维持 R2-1c-C2-01**：选中+hover ⊗ 仍压数值末位，截图 `editor-select-hover-light-1280.png`）C3 pass（三段壳层 218/528/278 分区清晰）C4 pass（800 视口 inspector 自动折叠 0px、palette 238、docOverX 0——较 R2-1c "壳层不折叠" 有改进；palette 未折叠致画布仅 352px，挤但可用，窄视口族台账已收）C5 pass（canvas overflow-auto 单滚动条）C6 n/a
- D 间隔：D1 pass（壳层 gap 12px 栅格）D2–D8 pass/n-a
- E 排布：E1 pass E2 pass（保存/预览层级正确）E3 pass E4 pass E5 pass E6 **fail(R2-2c-G4-125)**（空编辑画布零引导，归 G4）
- F 一致性：F1 pass（与 flow/report 设计器同为三段 workbench）F2 pass（左右栏宽 218/278 落 220/280 档）F3 pass F4 warn（zh-CN chrome = R2-2a-F4-11 族引用）F5 n/a
- G 设计器：G1 pass（选中框 border rgb(28,110,242)+ring、八向手柄 12×12、与 hover 态可区分）G2 **warn(R2-2c-G2-127)**（面板 cursor auto、palette cursor pointer——可拖 surfaces 无 grab 光标）G3 **fail(R2-2c-A6-124 同条)**（palette dragover 无吸附线/drop 高亮；pointer 拖拽面板跟手 ✓ 无独立 ghost——直接操纵模式可接受，落格吸附实测 ±0px）G4 **fail(R2-2c-G4-125)** G5 n/a（无缩放控件）G6 pass（undo/redo 3 步回退/重做实测：面板数 5→4→5、位置还原 346）G7 **fail(R2-2c-G7-123)**（inspector→canvas 标题生效但输入框回显旧值；canvas→inspector 选中同步正常；NumberInput 拖后不刷新）G8 pass（dark 画布内容可读 15:1+）
- H 弹层：n/a（全列）

## 3. 发现条目

### [R2-2c-A9-122] 保存链路静默失效：mount 即 dirty + 点击保存零效果（无持久化、无反馈、dirty 永不清除）

- **页面/路由**: `#/dashboard-demo`（编辑态，页头"保存"钮；demo 页自述"保存后布局持久化到 localStorage，刷新页面自动还原"）
- **主题/视口/状态**: light / 1280 / mount 初始态 + 实改一行后点击保存
- **截图**: `_tmp/visual-inspection-2026-09-25/r2-2c/dashboard-editor/editor-default-light-1280.png`（撤销/重做/删除灰、保存高亮可点的矛盾初始态）
- **目视描述**: 页面加载后未做任何修改，"保存"即为可用态（撤销/重做/删除均禁用）；点击"保存"后按钮状态、localStorage、json-view 面板均无任何变化，也无 toast/报错。
- **程序化证据**:
  - 探针: `_tmp/r2-2c-probes/w4-editor-save-followup.mjs`、`w4-editor-save-followup2.mjs`（Storage.prototype.setItem 埋点 + console/pageerror 监听 + 两轮保存点击）
  - 输出: mount 态 `{saveDisabled:false, undoDisabled:true}`（无改动即 dirty）；方向键实改后点击保存 → `{storageCalls:[], persisted:null, saveDisabled:false, jsonViewText:""}`，二次点击同结果；`errors:[]` 零控制台输出。源码坐实双断点：① `dashboard-domain-adapter.ts` `diffDashboardDocument` 对 `props/source` 等对象字段用 `Object.is` 比较（L70），editor-core `cloneDocument`（structuredClone）使 committed/working 的 props 恒为不同引用 → diff 恒非 null → dirty 恒真；② 保存事件链 `dashboard-editor-renderer.tsx` `dispatchEventRef` 对非函数 onSave 静默 return（L128-130），commit 结果与失败均无用户可见反馈。
- **对照基准**: 检查提示词 A9（交互后反馈可见，非静默更新）/A4（disabled 语义）；editor-core 契约（dirty=committed/working diff）。
- **严重程度**: P1（保存是设计器高频主路径；P2 级"反馈缺失"落在保存主路径升 P1——用户改动后无法持久化，刷新即丢，且全程无任何提示）
- **用户影响**: 用户编辑布局后点保存，以为已保存（无报错），刷新后布局丢失；"保存"钮恒亮也使其失去"有未保存改动"的提示价值。注意：R2-1c 页单元走查期间曾观察到 localStorage 被写入（当时保存链路可用），本波实测失效——属回归或近域改动波及，建议修复时先定位引入点。
- **修复方向**: ① `diffDashboardDocument` 对对象值字段改深比较（或 diff 在 clone 前取引用、clone 后仅比较序列化值），使 mount 即 dirty 消失、commit 后 dirty→false；② `dashboard-editor-renderer.tsx` 的 onSave 派发失败（非函数/ action 报错）时经 `onError` 或 `env.notify` 上报，commit 失败同样要有可见反馈；③ 补"保存→localStorage 写入→刷新还原"回归测试（现有 `dashboard-editor-renderer.test.tsx` 未覆盖真实持久化链）。
- **归族**: local → R2-4 批（editor+adapter 双根因、单组件域）
- **复核状态**: 已复核（保留 P1，根因②实质改判，review-a 2026-09-25）：根因①坐实（editor-core L59-60 双 structuredClone × adapter L63 Object.is → mount 即 dirty、commit 后 dirty 恒真，fiber 实证）；根因②证伪——events.onSave 是函数，真断点 = `${event.serialized}` payload→动作参数桥接断链（persist 零写入、setValue 零效果）；宿主 dashboardDemo:persist 静默类型守卫 + demo 页 Saved Layout 面板 DOM 缺失为放大器

### [R2-2c-G7-123] inspector 与画布状态不同步：NumberInput 外部变更不回显、标题输入框编辑后回显旧值

- **页面/路由**: `#/dashboard-demo`（编辑态，右侧 inspector）
- **主题/视口/状态**: light / 1280 / 选中+拖拽后、标题编辑后
- **截图**: `_tmp/visual-inspection-2026-09-25/r2-2c/dashboard-editor/editor-dragmid-light-1280.png`（面板已拖至 x3，inspector X/Y 仍显示 0/0）
- **目视描述**: 拖拽面板到新格后，inspector 的 X/Y 输入框仍显示拖拽前坐标；把标题改为 "Renamed Chart" 后画布面板标题立即更新，但标题输入框自身回显旧值 "Chart"。
- **程序化证据**:
  - 探针: `_tmp/r2-2c-probes/w4-dashboard-editor.mjs` g7/g3 段
  - 输出: `g7InspectorToCanvas: {g7Before:"Chart", canvasTitle:"Renamed Chart", inspectorValue:"Chart"}`；`g3DragMid` 面板 left 362→480（x0→x3）同帧 inspector `X:0 Y:0`。反向选中同步正常：`g7CanvasToInspector {inspectorId:"table-orders", inspectorTitle:"Orders"}`。源码坐实：`editor-inspector.tsx` NumberInput `const [draft,setDraft]=useState(String(value))`（L194）仅播种一次、onBlur 才重同步——外部（拖拽/undo）变更永不回显；标题受控输入回显旧值指向同一"inspector 快照不随会话 revision 刷新"的呈现层缺口。
- **对照基准**: 检查提示词 G7（属性面板与画布双向同步——本控件主审查维度）；NN/g 直接操作（增量可逆+状态一致）。
- **严重程度**: P2（G7 主维度 fail；inspector 显示值与画布实际状态矛盾，用户按旧坐标二次编辑会踩空）
- **用户影响**: 拖拽/撤销后按 inspector 数值微调时起点错误；标题编辑后不确定是否生效（画布生效、输入框像被回滚）。
- **修复方向**: `editor-inspector.tsx` NumberInput 删除 draft 本地态或补 `useEffect(()=>setDraft(String(value)),[value])`（保留 composing 期不打断）；标题/类型/source 同样核对受控链；补"拖拽后 inspector X/Y 等于新格坐标"回归断言。
- **归族**: local → R2-4 批
- **复核状态**: 已复核（保留 P2，根因收敛，review-b 2026-09-25）：收敛为 editor-inspector.tsx L27 非响应式 `core.getState()` 快照（标题回弹 = 受控输入 props 不刷新被 React 还原；NumberInput 实际行号 L183 非 L194）

### [R2-2c-A6-124] palette 拖拽落点零反馈（维持 R2-1c-A6-01）+ pointer 拖拽中被拖面板可被重叠面板完全遮挡（新实例）

- **页面/路由**: `#/dashboard-demo`（编辑态画布）
- **主题/视口/状态**: light / 1280 / palette HTML5 dragover 中 + 面板 pointer 拖拽中
- **截图**: `_tmp/visual-inspection-2026-09-25/r2-2c/dashboard-editor/editor-dragmid-light-1280.png`（kpi-revenue 拖至 kpi-orders 格后完全不可见，原格空出）、`editor-postdrop-light-1280.png`
- **目视描述**: palette 项拖向画布全程无 drop-target 高亮/插入指示；拖动既有面板时面板本体跟手（直接操纵），但当目标格被占用时被拖面板被压在占用面板之下，拖拽过程中"物体消失"。
- **程序化证据**:
  - 探针: `w4-dashboard-editor.mjs` paletteDrop/g3DragMid 段（DataTransfer 合成 dragstart/dragover/drop + 拖拽中 DOM 扫描）
  - 输出: dragover 中 canvas className 不变（无高亮类）、专用指示元素 0；drop 本身成功（面板数 4→5，first-fit 落位，[G3-R4-视角11-01] 修复在位）；`g3DragMid {left:480, top:398.5}` 与 kpi-orders（x480）同格——被拖面板渲染序在前被完全遮挡，无 z 提升/ghost。
- **对照基准**: NN/g 拖放 UX（落位必须有清晰 drop-target 反馈、拖拽对象必须始终可见）；检查提示词 A6/G3；R2-1c-A6-01（palette ghost/drop 反馈缺失，页单元已裁定——palette 路径维持）。
- **严重程度**: P3（落位功能本身可靠；反馈缺失与瞬时遮挡不阻断但损伤可信度）
- **用户影响**: palette 拖入时无法预判落点；拖动既有面板经过占用格时面板"不见了"，松手后才知道去了哪。
- **修复方向**: editor-canvas `handleDragOver` 按指针网格坐标计算预览落格并给该格加 `ring-2 ring-primary/40` 高亮（复用 `clientToGrid`）；`startDrag` 给被拖面板 `z-index: 20` + `opacity-90`（或半透明 ghost 克隆）。
- **归族**: systemic → R2-3 批（设计器拖拽反馈族，与 R2-1c-A6-01 同族合并跟踪；遮挡子项 local）
- **复核状态**: 未复核

### [R2-2c-G4-125] 空编辑画布零引导：面板删空后画布只剩灰色空板（Preview 空态反而有"暂无面板"）

- **页面/路由**: `#/dashboard-demo`（编辑态，删除全部面板后）
- **主题/视口/状态**: light / 1280 / 空画布
- **截图**: `_tmp/visual-inspection-2026-09-25/r2-2c/dashboard-editor/editor-empty-light-1280.png`（对照 `dashboard/dashboard-preview-empty-light-1280.png` 有"暂无面板"）
- **目视描述**: 编辑画布删空后是一片灰色空区域，无任何"从左侧添加面板/拖拽到此"的引导；同页 Preview 空态有居中"暂无面板"提示。
- **程序化证据**:
  - 探针: `w4-dashboard-editor.mjs` session-3 段
  - 输出: `g4Empty {panelCount:0, innerText:"", childElementCount:0}`（canvas-body 完全空）；同会话 `previewEmptyState {emptyText:"暂无面板", emptyVisible:true}`。
- **对照基准**: 检查提示词 G4（空画布/空模板态有引导，不是一片空白）、E6（空态有任务引导）。R2-1c 页单元 G4 记 pass（口径为 Preview/运行空态），编辑画布空态为未覆盖面，本条为新实例非翻案。
- **严重程度**: P3（首次使用/清空后路径；palette 就在旁边，任务可继续）
- **用户影响**: 新会话或删空后用户面对空灰板无下一步指引，尤其键盘/读屏用户无任何可聚焦提示。
- **修复方向**: `editor-canvas.tsx` 在 `working.panels.length===0` 时渲染居中空态块（复用 `flux.dashboard.empty` 文案 + "从左侧面板添加"指引，`pointer-events-none` 避免干扰 drop）。
- **归族**: local → R2-4 批
- **复核状态**: 未复核

### [R2-2c-A8-126] 键盘选择通道死：面板可聚焦但聚焦≠选中，方向键移动/Delete 快捷键键盘用户不可达

- **页面/路由**: `#/dashboard-demo`（编辑态画布）
- **主题/视口/状态**: light / 1280 / 面板 focus 态
- **截图**: 复用 `editor-select-light-1280.png`（pointer 选择态对照——focus 单独存在时无任何视觉态）
- **目视描述**: Tab 聚焦面板后无选中框；此时按方向键/Delete 均无效果。
- **程序化证据**:
  - 探针: `w4-editor-save-followup2.mjs` keyboardMove 段
  - 输出: `keyboardMove {focused:true, focusedStill:true, selected:null, left0:346→left2:346}`——focus 成立、`data-selected` 不成立、两次 ArrowRight 位置不变。源码：selection 仅 `startDrag`（pointerdown）与 header/palette 路径写入；`handleKeyDown` 方向键/Delete 均要求 `selection.length>0`。
- **对照基准**: WCAG 2.5.7（拖拽功能须有单指针替代——inspector 数值输入已提供替代，故非 P 级违例）；检查提示词 A8；`role="button"` 面板 Enter/Space 无行为（角色契约缺口）。
- **严重程度**: P3（替代路径存在、任务可达；键盘流完整性缺口）
- **用户影响**: 键盘用户无法选中/移动/删除面板，快捷键形同虚设；读屏用户听到"按钮"角色但激活无响应。
- **修复方向**: `editor-canvas.tsx` 面板 `onFocus` 同步 `core.setSelection([panel.id])`（或 onKeyDown Enter/Space 切换选中），使既有键盘移动/Delete 链路可达。
- **归族**: watch-only → 台账（A8 替代路径已在，键盘增强项）
- **复核状态**: 未复核

### [R2-2c-G2-127] 可拖 surface 无拖拽光标可供性：画布面板 cursor auto、palette 项 cursor-grab 被 Button 基类覆盖为 pointer

- **页面/路由**: `#/dashboard-demo`（编辑态，画布面板与 palette 项）
- **主题/视口/状态**: light / 1280 / hover
- **截图**: `_tmp/visual-inspection-2026-09-25/r2-2c/dashboard-editor/editor-panel-hover-light-1280.png`
- **目视描述**: 悬停可拖面板光标为默认箭头；palette 项显示手型（点击语义）而非抓取手（拖拽语义）。
- **程序化证据**:
  - 探针: `w4-dashboard-editor.mjs` editStructural/g2 段
  - 输出: `panelCursor:"auto"`、`paletteBtnCursor:"pointer"`（palette className 含 `cursor-grab`，被 Button 基类 cursor-pointer 合并覆盖）。
- **对照基准**: 检查提示词 G2（可拖元素 hover 有 cursor 变化）；watch-pool R2-1b-G2-01（flow palette 无 grab 光标，同族）。
- **严重程度**: P3
- **用户影响**: 可拖拽性完全靠尝试发现；与 flow-designer 同族问题。
- **修复方向**: editor-canvas 面板 className 加 `cursor-grab`（拖拽中 `cursor-grabbing`）；palette 按钮将 `cursor-grab` 放在 cn 合并末位或 Button 透传 className 优先。
- **归族**: watch-only → 台账（并入 R2-1b-G2-01 拖拽光标族）
- **复核状态**: 未复核

## 4. R2-1c 页单元裁定复检对照（本波现状）

| R2-1c 条目                               | 现状（2026-09-25）                                                                       | 结论                                              |
| ---------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------- |
| R2-1c-G3-01 落位吸附原点+重叠（P2）      | palette drop first-fit 落空位（`findFreePosition` 在位）、pointer drop 按指针网格吸附    | **已修复**（[G3-R4-视角11-01]），关案             |
| R2-1c-A6-01 拖拽无 ghost/drop 反馈（P2） | palette 路径无反馈仍在 → 本波 R2-2c-A6-124 维持并扩面（遮挡子项）                        | **维持+扩面**                                     |
| R2-1c-C2-01 删除钮压数值（P3）           | ⊗ 改为 hover 显形但压字依旧（`editor-select-hover-light-1280.png`：⊗ 压 "1284300" 末位） | **维持**（P3，local，R2-4）                       |
| R2-1c-C4 壳层 800 不折叠（warn）         | inspector 800 下自动折叠（0px）、docOverX 0                                              | **改善**（画布 352px 仍挤，窄视口族台账继续跟踪） |
| R2-1c-E2-01 全宽 Back primary（P3）      | 页面级元素，未改                                                                         | **维持**（页单元台账）                            |

## 5. 已知族命中（引用，不另立项）

- i18n zh-CN 回退（R2-2a-F4-11 族）：`仪表盘面板 Revenue` aria、撤销/重做/删除/保存/预览 chrome 全中文。
- A3 小目标族（R2-1a-A3-01/02 族）：resize 手柄 12×12、workbench 分栏手柄 4×560、表列宽手柄 4×39.5（探针命中清单在 out-w4-dashboard-editor.json）。
- chip 遮挡族：调试 chip `选 0` 压 hero 左上（页级，引用）。
- 宿主 dark 残留（`--popover` dark 亮底族）：页脚 classic/light 宿主选择器 dark 下亮底。

## 6. 交互键（上报主 session 合并）

`dashboard-demo` 现无注册键（interactions.mjs 无该 id，不涉及覆盖），上报新键与扩展建议：

```json
{
  "dashboard-demo": [
    { "action": "waitFor", "selector": "[data-testid=\"bi-dashboard\"]", "ms": 800 },
    { "action": "click", "selector": "[data-testid=\"editor-mode-toggle\"]" },
    { "action": "waitFor", "selector": "[data-slot=\"dashboard-panel\"]" },
    { "action": "waitFor", "ms": 600 }
  ]
}
```

扩展建议（主 session 酌情合并为第二条链或加长链）：选中态 `{click:[data-slot=dashboard-editor-panel]} → waitFor [data-slot=dashboard-editor-resize-handle]`。

## 7. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `dashboard-editor`（control）→ carded；
  R2-2c-A9-122 → local（R2-4）、G7-123 → local（R2-4）、A6-124 → systemic（R2-3 拖拽反馈族）、G4-125/A8-126/G2-127 → watch；归族后 → digested。
