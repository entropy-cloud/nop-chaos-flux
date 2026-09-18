# 视觉质量深水区普查：AI / 3D / 设计器 / 文档 / 编辑器 / 横切主题

> 核查日期: 2026-09-15
> 基线: master @ 6fec8497e（full-green：unit 74/74 tasks、e2e 1472 passed / 0 failed / 43 skipped）
> 调研方式: 5 路并行只读探查（AI 组件 / 3D+SCADA / flow+report+spreadsheet / word+print+debugger+code-editor / 横切主题+基础渲染器），全部结论带 live repo 文件级证据
> 目的: 为「视觉质量深度修复路线图」（`docs/backlog/visual-quality-roadmap.md`，mission `missions/visual-quality.json`）提供证据基座；每个 work item 执行时仍须在本文基础上做**逐项深挖研究报告**并由独立子 agent 核实
> 与既有工作的边界: ui-review 专题（对标+一致性审查+复刻）已全部 done，其 P2/P3 未修池（169+87 条）与 D2-closure 14 项 open candidates 在本报告 §8 纳管；本报告聚焦 ui-review 之后的**显示效果深水区**（组件本身的视觉/交互完成度）

---

## 0. 结论先行

用户体感"AI 组件、3D 设计器、各类设计器显示效果明显不够好"经普查**成立**，且不是零散小问题，而是五类系统性模式：

| #   | 系统性模式                                 | 典型证据                                                                                                                                                                                                                                                      |
| --- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1  | **声明了但没实现的视觉能力（死配置）**     | AI 气泡 `data-shape`/`data-placement` 无任何 CSS 消费；3D `castShadow` schema 支持但 `shadowMap` 从未启用；3D `onObjectHover` 无 pointermove 监听；print 吸附辅助线 `canvas-math.ts` 算出后被画布丢弃；scada `background.grid` validate 接受但 runtime 不消费 |
| P2  | **浅色硬编码、dark 零适配**                | spreadsheet `canvas-styles.css` 29 处 hex；flow 节点钉钉系 hex 写死；debugger 全暗色玻璃风不接令牌；graph/map/dashboard/pivot/scheduling 五包 styles.css 零 dark 规则；运行时主题切换缺失（playground `main.tsx` 硬编码 classic/light）                       |
| P3  | **核心交互缺失（对标同类产品的可见差距）** | flow 无框选/多选默认关/无对齐吸附辅助线/无边中点插入；print 无多选/方向键微移/undo 面板；code-editor 无查找替换/括号自动闭合/活动行高亮；gantt 无关键路径高亮；calendar 月视图非 6 周网格                                                                     |
| P4  | **视觉正确性 bug（含 1 个 open bug）**     | ai-chat 流式 chunk 在流结束时一次性渲染、光标全程不可见（bug 166，open）；3D 相机初始 aspect 兜底 800/600、容器高度写死 400px；print 旋转元素按未旋转 AABB 排版、printDate 跨页漂移                                                                           |
| P5  | **视觉质量无回归守护、债务只登记不消化**   | AI/3D/三设计器 e2e 全部只断言 DOM/行为，无视觉断言；一致性豁免基线两周内 399/116/30 → 413/121/32 膨胀；169 P2 + 87 P3 候选池零立项；audit-followups 08-11 批约 30 条 + 08-28 批 16 条零处置                                                                   |

改进候选与路线图 work item 的映射见 §9。

---

## 1. AI 会话组件域（packages/flux-renderers-ai）

规模：约 6400 行渲染代码，14 个渲染器（ai-chat 582 行、ai-bubble 族 1100+ 行、ai-citations/ai-tool-call/ai-attachments 各 400–520 行、tiptap-sender 446 行等）。样式主体为 Tailwind + `@nop-chaos/ui` + 包内 `styles.css`（406 行，光标/波形/markdown 排版/avatar/dark 双轨），`.nop-*` 标记类 + `[data-slot]` 契约健康。

**已修（不需要再立项）**：bug 134（工具卡/推理面板展开死）、135（混排消息遮蔽）、159（timestamp 非法值崩树）、142、144（14 渲染器无视 meta.disabled）、164/165、0824 audit 的 dark media 轨与 feedback 重挂载丢状态。

**未修/缺口（按影响排序）**：

1. **bug 166（open）流式渲染失效**：`ai-chat.tsx:501` context useMemo 以 messages 数组引用为 dep，流式期间引用不变 → 消费端 bail-out，内容在流结束时一次性出现，打字光标（`styles.css:5-22` 的 ▍ blink）全程不可见。这是"AI 组件显示效果不好"的最直接单点。
2. **气泡视觉层缺失**：`ai-bubble/index.tsx:135-136` 输出 `data-shape`/`data-placement`，但包内 `styles.css` 与 playground styles.css 均无任何 `[data-placement]`/`[data-shape]` 规则——气泡无底色/圆角/阴影，用户消息不右对齐（仅 `styles.css:312` 有 `:has(avatar)` 的行布局）。属性是死的。
3. **AI e2e 零视觉断言**：19 个 `tests/e2e/ai-*.spec` 基本只断言 DOM/行为/data 属性；计算样式断言仅 ai-widgets-demo.spec.ts:241-266 一处；无任何截图/视觉回归。
4. **交互细节缺失**：`scrollToBottom`（`use-auto-scroll.ts:42`）无消费者（无"滚动到底部"悬浮按钮）；气泡级复制/重试操作条未默认挂载（`index.tsx:192` 仅 UserMessageActions）；无图片 lightbox（`image.tsx`）；无时间分组/日期分隔；无消息进入动画（对比文档 `docs/analysis/2026-08-23-ai-widgets-vs-tiny-robot-comparison.md` G12）。
5. **代码高亮粗糙**：`markdown.tsx:126-153` lowlight ~37 语言压缩到 4 个语义 token 色；复制按钮常驻无 hover 语义（:267）。

---

## 2. 3D 渲染域（packages/flux-renderers-3d）

schema 面完整（camera/5 类灯光/fog/模型 url XOR primitive/绑定 transform tween·spring·step/关键帧 clip/事件 click·hover·ready·error，`schemas.ts:37-185`），引擎 OrbitControls+damping、TweenRegistry、GLTF AnimationMixer 齐。I0–I4 roadmap 全 done。**问题集中在"schema 声明与渲染实现脱节"**：

1. **伪 hover**：`engine/scene-manager.ts:494-531` 只监听 pointerdown/pointerup，无 pointermove——`onObjectHover` 只在按下/抬起瞬间发射；全包无 emissive/highlight，悬停无任何视觉反馈。
2. **阴影死配置**：`schemas.ts:114` 声明 `castShadow`，但 renderer 仅 `{antialias,alpha}`（:109），全包无 `shadowMap.enabled`，mesh 未设 castShadow/receiveShadow → 阴影永不渲染。
3. **容器尺寸残留硬编码**：resize 链路已存在（`renderer/hooks/use-scene-manager.ts:47-50` 有 ResizeObserver → `manager.resize()` → `resizeToContainer()`，scene-manager.ts:563-571），camera aspect 800/600（scene-manager.ts:146）仅为初始兜底；真正的残留问题是容器高度写死 400px（three-canvas.tsx:98），嵌入布局时高度不可配置。
4. **AI 生成链路零出口**：`ai/schema-generator.ts`（generateFromPrompt + 校验修复回路）全仓无消费方，renderer-definitions.ts:38-42 全部 `editorType:'code'` 手写 JSON，无演示页。
5. **观感基础件缺失**：无 gizmo/GridHelper/坐标轴/后处理/天空盒（design-renderer.md:227 明示 v5 砍除）；模型加载无进度（model-loader.ts:15 不接 onProgress，loading 态仅文本）；错误态仅埋点无内建 UI；相机控制无 UI 控件。
6. **hook 级可用但未暴露**：state/event 触发 clip、spring/step tween、onObjectHover 均无演示页消费。
7. e2e 仅 `three-canvas-perf.spec.ts`（ready/像素非零/fps≥5），无 pick/hover/绑定视觉正确性/resize 断言。

---

## 3. 工业 SCADA 域（packages/flux-renderers-industrial）

渲染栈 leafer App；图元 24 个（base 10 + group + device 4 + instrument 4 + sensor-control 4 + pipe-junction，`symbols/register-builtin.ts:36-61`）；数据可视化链路健康（value→fill/几何穿透、dashOffset 流动、状态机+报警色 revert、pan/zoom 光标锚缩放）；e2e 较厚（547 行 scada-demo + perf + 像素探测）。

缺口：

1. **I17 视觉重设计已 done（勘误）**：`roadmap-industrial-hmi.md:90` 显示 I17 已于 2026-08-06 经 closure audit approved 完成（"画面画乱"4 类经 I17.1–I17.3 落地；:30 为立项登记行，勿引用为未完成证据）。本域的真实改进面是 **I17 之后仍存在的残余视觉问题**，需研究报告逐项核实后立项，不得默认 I17 范围内问题仍未修。
2. `background.grid` validate 接受但 runtime 不消费（08-04.md:574 watch-only）——又一个死配置。
3. 图元库规模与报警/趋势组件不足：无趋势图/历史曲线、无报警表格/摘要组件（对比 Ignition/组态王）。
4. 曾有画布收窄布局缺陷（08-08.md:301"声明 960/渲染 302"），修复后需视觉回归守护（目前无）。

---

## 4. Flow Designer 域（flow-designer-core / flow-designer-renderers）

core 图引擎完整（history/selection/viewport/transactions、undo-redo），渲染基于 @xyflow/react 12（MiniMap/Controls/Background/端口重连/dingflow 树模式/ELK 布局/键盘快捷键）。design.md:490 自认"仍是第一阶段 MVP"。

缺口（按影响）：

1. **选择体系残缺**：flow-designer 两包内无框选（`selectionOnDrag`/`onSelectionDrag` 零命中；flux-renderers-graph 的 `xyflow-canvas.tsx` 已有使用先例可参照，不属 flow-designer 包）；`flow-designer-core/src/core/config.ts:36` `multiSelect:false` 默认关；xyflow 交互层只跟踪单节点/单边（`use-xyflow-interactions.ts:165-190` lastSelectionRef）。
2. **无对齐/分布/吸附辅助线**（grep 零命中）；无边中点插入（designer-xyflow-edge.tsx 无 midpoint）；节点尺寸为静态假值 180×60（bugs/11 `measured` 假数据）。
3. **浅色硬编码**：节点色写死钉钉系 hex（`designer-node-appearance.ts:24-39` `#576a95/#ff943e/#3296fa`）；`designer-theme.css`（61 行）大量 `rgba(255,255,255,…)` 玻璃拟态，无任何 dark 变体。
4. utility shim 机制性风险（bugs/12）：schema 写 `bg-blue-50` 等类因 shim 缺失静默不生效，靠手工逐类补。
5. 审计缺口：`createDesignerStoreAdapter`/`selectAllNodes`/`copySelection`/`pasteClipboard` 零直接测试（07-27 ma43 审计 FDC-GAP-01/04）；flow-ui spec 截图仅存档无比对。

---

## 5. Spreadsheet / Report Designer 域

**Spreadsheet**（core ~4k 行 62 命令 + renderers ~7.2k 行 DOM 表格/虚拟化/冻结/填充柄/查找替换/批注）完成度最高，但：

- `canvas-styles.css`（894 行）29 处浅色 hex 写死（`#1a1a1a/#ffffff/#0f9d58/#1a73e8/#e3f2fd` 等，29-30/80/205/606-678 行），零 dark 变体；
- 单元格值无类型区分（`value?: unknown`，types.ts:50），数字/日期/文本同渲染；
- 无条件格式/筛选仅显隐行（design.md:349-352 自认第一阶段）。

**Report Designer**：语义层仅 ~2.3k 行；画布直接复用 spreadsheet-renderers 且**写死 30 行×10 列**（`report-spreadsheet-canvas.tsx:26-27`）；`TemplateCodecAdapter` 仅抛错占位（`report-designer-core/src/adapters.ts:157-167`，hucre 对比报告已论证引入路径）；无报表带区/分组头/分页语义；fallback 壳只渲染文本摘要（`fallbacks.tsx:57-71`）。

两域 e2e 极薄（report 2 个 spec、spreadsheet 1 个），无 dark、无响应式视觉断言。

---

## 6. Word / Print / Debugger / 代码与富文本编辑器域

**Print**（09-13 刚修过"选中框/手柄/标尺全仓无 CSS 不可见"）遗留十项已登记未修（`docs/logs/2026/09-13.md` + branch review §5）：①旋转元素按未旋转 AABB 排版（code-dimensions.md D15-02）②autoGrow 尾片高度（D21-05）③printDate 跨页漂移（D19-03）④PDF JPEG 压缩伪影（export-pdf.ts:68）⑤**吸附辅助线算了不画**（canvas-math.ts:84-89 注释"供画布绘制辅助线"，`print-designer-canvas.tsx:130` 丢弃 `lines` 返回值；Alt 禁用吸附未实现）⑥验证仅按钮时更新/无元素级标红 ⑦设计态 ImageRenderer 忽略 fit ⑧resetPrintElementIdSeq 泄漏 barrel ⑨iframe 打印清理无超时 ⑩诊断消息中文硬编码（88 个 `flux.print.*` i18n 键已备而不用）。对标缺口：无多选/框选、无方向键微移、无图层树、无 undo 栈 UI、标尺无拖动参考线。

**Word**：ribbon 工具栏/大纲/数据集面板完成度高，但自有 CSS 仅 15 行，视觉全托 canvas-editor 默认皮肤；字体/字号硬编码枚举（`toolbar/font-controls.tsx:23-24`，6 字体 16 档，无自定义输入）；无页眉页脚编辑 UI。

**Debugger**：单包 4 tab + 元素拾取 + eval；样式为 506 行注入式 CSS 字符串（`panel/styles-css.ts`），`position:fixed; z-index:9999`，色板全暗色 rgba fallback，不接任何设计令牌——亮色宿主下突兀。

**Code editor**（CodeMirror 6）：无 searchKeymap（查找替换面板）、无 closeBrackets、无 highlightActiveLine（`extensions/base.ts:148-159` grep 零命中）；`code-editor-styles.css:56-90` 暗色 hex fallback 无亮色令牌映射。

**富文本/Markdown**：Tiptap 富文本仅 StarterKit+Link，无 Image/Table/Underline/TextAlign/Highlight/Placeholder 扩展，B/I/S 按钮为文本字母（`editor-renderer.tsx:31-49,235-238`）；markdown 编辑器为固定 `rows=8` 的纯 Textarea（`markdown-editor-renderer.tsx:269`），无编辑/预览滚动同步、无行号高亮。

---

## 7. 横切：主题/令牌/一致性债务

1. **令牌层对称、消费层断裂**：`theme-tokens/src/styles.css` 324 变量、classic/glass × light/dark 四块对称；但 graph/map/dashboard/pivot/scheduling 五包 styles.css 零 dark 规则，dark 全靠变量重定义而大量组件写死浅色（barcode `text-white` 族、gantt-bars `bg-white/blue-400`）；`--success/--warning/--info` 只在主题块、`:root` 无兜底（`apps/playground/src/main.tsx:11-13` 注释自证）；tailwind-preset `darkMode:['class','.dark']`(:139) 与 tokens 的 `data-mode` 触发器不一致，双触发器由各包手写；**运行时主题切换缺失**（main.tsx:14-15 硬编码 classic/light；即 ui-review D2 的 G-I）。
2. **一致性豁免只增不减**：`scripts/audit/find-ui-consistency-gaps.mjs` D2 收口基线 399 实例/116 文件/30 条目，live 复跑 413/121/32（两周 +14/+5/+2）；豁免为路径前缀匹配（scheduling/industrial/3d/form-advanced 整包），这些域新增字面色自动豁免，门禁局部退化；169 P2 + 87 P3 候选池零立项（台账 `docs/analysis/ui-review/r2-audit.md`/`r3-p2-adjudication.md`）。
3. **错误反馈双轨**：raw `error.message` 直出豁免 20+ 处（map/crud/form/wizard/pivot）。
4. **audit-followups 未清**：08-11 批约 30 条（含 timeline inert-but-focusable、button `_blank` 无 rel、dashboard `canvasWidth=1200` 硬编码、page footer 子串嗅探等视觉相关项）；08-28 批 16 P2 + 3 observation 全部 `[ ]`。
5. **基础渲染器残留**：button anchor disabled 失效、table 快速编辑条/拖拽列错位、DrawerBody 无滚动契约、dashboard 画布无方向键移动；scheduling 域 gantt 无关键路径高亮（grep `critical` 零命中）、gantt 任务条选中硬编码 `bg-blue-50`、calendar 月视图为资源时间轴非 6 周网格且无密度视图；~~kanban drop-target 死规则~~（**勘误**：kanban 拖拽悬停高亮链路已接通——发射端 `use-kanban-board-effects.ts:135-136` 在 drag-over 时 set/remove `data-drop-target`、calendar.tsx:369/380 同法，CSS 消费 `kanban.css:144` 在，不构成 confirmed defect，仅留实际视觉/dark 表现核对）；map 无 heatmap/轨迹/围栏；graph 无数据驱动着色 schema 字段（G-K）；mobile 族仅 6 组件 vs Vant 80+（G-H 挂起，需人工裁决是否扩容）。

---

## 8. 视觉回归守护现状

- replica 族（airtable/antdpro/cal/linear/notion/sundial）有 screenshot 存档型 spec，但**基线不入库**（`tests/e2e/artifacts/` gitignored，AGENTS.md 规范）；无 diff 门禁。
- AI（19 spec）、3D（2 测试）、flow（11 spec）、report（2 spec）、spreadsheet（1 spec）均无视觉断言；三起历史视觉回归（bugs/12 utility shim、bugs/13 小地图方斑、bugs/14 Tailwind content scan）全靠实机复现发现。
- AGENTS.md 2026-08-28 政策：快照可用于诊断/评审，**通过判据必须程序化**（page.evaluate/getComputedStyle/readPixels）——视觉回归基建必须在此约束内设计。

---

## 9. 改进候选 → 路线图 work item 映射

| 候选改进（证据章节）                                                         | → roadmap work item                                    |
| ---------------------------------------------------------------------------- | ------------------------------------------------------ |
| 视觉回归守护基建（§8）                                                       | V0                                                     |
| 运行时主题切换/dark 触发器统一/`:root` 兜底令牌（§7.1）                      | V1                                                     |
| AI 流式 bug 166 + 气泡视觉层 + 交互细节 + AI 视觉断言（§1）                  | V2                                                     |
| 3D hover/阴影/容器高度硬编码/加载进度/错误 UI/AI 生成出口/演示补齐（§2）     | V3                                                     |
| SCADA 残余视觉核实 + grid 消费 + 报警/趋势组件裁决（§3）                     | V4                                                     |
| flow 框选/吸附/边中点/节点实测尺寸 + dark（§4）                              | V5                                                     |
| spreadsheet 令牌化 + dark + 值类型视觉（§5）                                 | V6                                                     |
| report 带区语义视觉 + 解硬编码 + codec 裁决（§5）                            | V7                                                     |
| print 遗留①–⑩ + 辅助线渲染 + undo/图层/参考线（§6）                          | V8a                                                    |
| word 字体枚举/页眉页脚 UI 裁决（§6）                                         | V8b                                                    |
| debugger 令牌化 + code-editor 查找替换/括号/活动行（§6）                     | V9                                                     |
| Tiptap 扩展补齐 + markdown 编辑器升级（§6）                                  | V10                                                    |
| gantt 关键路径/calendar 视图/kanban 拖拽视觉核对/dashboard/map/graph（§7.5） | V11a（scheduling 族）/ V11b（dashboard/map/graph）     |
| 一致性债务消化 + 豁免收紧 + followups 处置（§7.2–7.4）                       | V12a（豁免与 followups）/ V12b（P2 池）/ V12c（P3 池） |

## 10. 明确不纳入本路线图（挂起/需人工裁决）

- **G-H 移动端组件族扩容**（6 → Vant 级 80+ 组件）：属组件数量级扩张而非显示质量修复，且 D2 已挂起待人工裁决；
- **公式求值引擎、协同编辑**（spreadsheet/report）：design.md 显式非目标，属新能力立项；
- **hucre 引入落地**：V7 仅做 codec 方向裁决与接口对齐，真实集成涉及新依赖与映射层，走独立 plan；
- **后处理/天空盒等 3D 重观感特性**：design-renderer.md v5 已显式裁除，如需恢复属契约变更，需人工确认；
- **D2-closure 其余 open candidates**：G-I/G-K/#6/#7/#8 已分别映射到 V1/V11/V12；剩余 **G-J（resizable schema 化）、D1 输入池五项（密度档/formatCurrency/语义 pill/download-print·clipboard 宿主通道/筛选 URL 同步/语法搜索）、G-L/G-M 观察项**继续留在 D2 台账（`docs/analysis/ui-review/D2-closure.md` §2.2）按触发条件处置，本路线图不接管、不静默丢弃；
- flux-core 编译内核、公共导出面变更：保护区域，触及走独立 plan + 人工门禁。
