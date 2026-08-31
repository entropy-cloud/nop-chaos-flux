# R2 第 6 轮递归扩展发现（round-06-g4，收敛终判轮）

> 组号: G4（mobile / scheduling） · 轮次: Round 06（收敛终判轮，最严格价值判据） · 审查日期: 2026-08-29 · agent: general（fresh session，只读审查）
> 输入: `dispatch-shared-prefix.md`（12 视角 + 条目格式 + 去重边界，全部强制生效）+ `dispatch-recursive-extension.md`（盲区与去重规则）+ `dedup-baseline.md` §1–§4 + `round-01.md`（Grep `[G4-` 定位精读 14 条）+ `round-02.md` G4 段 / `round-02-compact.md` 全文（10 条）+ `round-03.md` G4 段 / `round-03-compact.md` 全文（8 条）+ `round-04.md` Grep `[G4-` 定位精读（5 条 + 归并备忘）+ `round-05-g4.md` 全文精读（2 条 + 防复核弃报留档清单）。基线: 全审查累积 269 条，其中 G4 组 39 条（14+10+8+5+2）。
> 立案判据（本轮专属）: 仅接受 ① 前 5 轮所有方法面（标准 12 视角、可见性类名缺陷、交互模型死路、ID 直出/守卫矩阵、CSS 变体消费反查、disabled 门禁全类反查）均未触及的**全新根因**；② 通过真实用户影响检验；③ 与 269 条逐根因比对为全新。已立根因复述、已弃报候选翻案（无新事实）、零散细节一律不立案。

---

## 发现清单（HIGH 0 / MEDIUM 0 / LOW 0，共 0 条）

**零发现。** 本轮未发现满足终判立案判据的新问题。

---

## 弃报留档（本轮新增，防后续轮次重复提问）

以下候选经真实用户影响检验或价值判据后弃报，后续轮次不得翻案（除非有前轮未掌握的新事实）：

- **calendar-print.css 两处死覆盖层选择器**（`.nop-batch-scheduler-overlay` / `.nop-timezone-selector`，calendar-print.css:9-10 与 calendar.css:170/340 均有定义、无任何组件发射对应类名）: 死 CSS 且仅影响打印隐藏不存在的元素，零用户可见影响——与 [G4-R5-视角3-01] 的"死规则致承诺能力失效"不同（彼处有 documented 变体契约落空，此处无任何文档承诺该覆盖层存在），不满足用户影响检验。真实表面（drag-ghost/type-selector/confirm-overlay）的打印隐藏均已接线生效。
- **kanban PNG 导出工具零 UI 消费方**（`kanban-export.ts:19` `exportBoardToPng` 仅经 `kanban/index.ts:31` 导出，kanban-toolbar 与 board 内无任何调用点）: 能力经包出口暴露给宿主、无内置入口，属"宿主自行接线的工具函数"而非 UI 缺陷；且若按"无错误反馈"报案则与 [G4-R2-视角5-02]（calendar exportError 从不渲染）同根因。不在 dedup §2 已登记 16 项之列，不入 C2 段，仅留档。
- **kanban-toolbar undo/redo/history 三个 icon-only 按钮仅有 `title` 无 `aria-label`**（kanban-toolbar.tsx:42/51/59）: `title` 提供 accessible name（HTML-AAM），AG Grid 等参照系统 icon 工具钮普遍仅用 title；经真实用户影响检验——读屏用户可获得按钮名称，sighted 用户有原生 tooltip，无可感知交互障碍，低于门槛。
- **calendar-cross-day-lines path:hover 装饰性悬停**（calendar.css:84 对连线 path 的 hover 变色，path 非交互元素）: 纯装饰增强，无交互承诺落空；其 `#94a3b8` 兜底 hex 归并 R1 [G4-视角7-01] 包级硬编码根因，不重复。
- **use-calendar-export 的英文兜底错误串**（'Failed to generate PNG image' 等，use-calendar-export.ts:57/69）: 该状态的可视化缺失已是 [G4-R2-视角5-02] 立案根因（exportError 从不渲染），直出原始 message 亦是 [G4-R3-视角5-01]/[G5-R2-视角5-02] 已立根因，均为已立根因复述，不另立。
- **gantt-editor 默认表单面**: Label+htmlFor 五字段齐备、DialogFooter cancel(outline)→save(default) 顺序正确、undo command 落栈、自定义 editorRegion 的 onSave 修复注释在位——包内正确基线，无缺口。

---

## 去重自检声明

- 本轮**零立案**，无需逐条比对；上述弃报留档候选已逐项注明与既有条目的根因关系（死 CSS 家族 / [G4-R2-视角5-02] / [G4-R3-视角5-01] / [G4-视角7-01]），无一符合终判"全新根因"要件。
- dedup-baseline §1（ma5-ux 6 条已修复）、§2（16 项已登记缺口）、§3（8 条误报对照）、§4（维度 09-12/20 边界）全程生效，本轮未撞见需 `[scope-conflict]` 标记的两可条目。
- R5"防复核"节 9 项弃报留档（依赖线绘制无目标高亮、link aria 内部 id、依赖线重复创建、swipe-cell 先开后禁用、swipe-cell×滚动、定时器边界、calendar-header 切换组、gantt 分栏把手、焦点陷阱）本轮复读确认维持原判，未翻案。

## 本轮检查范围（逐文件）

前 5 轮已系统覆盖的面（drop-target 栈/确认链/gantt 键盘路径、barcode 五条写值通道守卫矩阵、swipe-cell×列表滚动、countdown/notice-bar 定时器边界、gantt 依赖线交互、缩放锚定/Fit/键盘拖拽会话、变体样式消费反查、disabled 门禁全类反查、calendar 三视图能力分裂）本轮只做收敛确认，不再重复精读。本轮**新增精读**的是前 5 轮文件清单中未见逐文件结论的残余文件：

**scheduling 包**（10 文件全文精读）:

- `calendar/utils/calendar-print.css` 全文（打印面）
- `gantt/gantt-editor.tsx` 全文（编辑对话框表单面）
- `barcode-input/hooks/use-barcode-torch.ts` 全文 + `barcode-input/barcode-scanner-overlay.tsx` 全文复读（torch/队列面板/离线条/Escape/焦点陷阱/live region 全链）
- `kanban/utils/kanban-export.ts` 全文 + 消费方反查（grep `exportBoardToPng|boardDataToJson`）
- `calendar/hooks/use-calendar-export.ts` 全文（exportError 写入路径）
- `calendar/hooks/use-calendar-virtualizer.ts` 全文（虚拟化空白行风险）
- `calendar/utils/calendar-cross-day-lines.ts` 全文 + calendar.css 连线规则对照
- `calendar/hooks/use-calendar-ownership.ts` 全文（受控/scope 归属，纯逻辑面确认无 UX 表面）
- `kanban/components/kanban-toolbar.tsx` 全文（undo/redo/history/搜索钮残余面）
- `calendar/calendar.tsx:34,416-455`（print css 接线与 `.nop-calendar` 作用域类生产方确认）

**mobile 包**（全量 12 文件以定向 grep 闭合）: `addEventListener|window\.|document\.` 全包反查——swipe-cell window pointerdown capture（:162-163 有成对 removeEventListener）、notice-bar root 级 mouseenter/focusin（绑定于组件根元素生命周期）、matchMedia（:72-76）均有清理路径；`infinite-scroll-test-support.tsx`/`test-support.ts` 为测试支撑工具，无用户表面。

## 本轮检查方法

1. **残余文件穷举法**: 以 R5 检查范围的 12+91 文件清单为基线，对其中前 5 轮未留下逐文件结论的文件逐一全文精读（上节 10 个 scheduling 文件），每个文件按 12 视角 + 已立根因清单双轴核对。
2. **接线反查**: print CSS 的 import 链与作用域类生产方（沿 R5 变体消费反查方法面）、kanban 导出工具的消费方、calendar exportError 的渲染消费方，逐链路 grep 至生产/消费两端闭合。
3. **全局副作用面反查**（本轮新尝试的方法面）: mobile 包全量 `addEventListener/window/document` 命中逐条核对清理路径——全部有成对清理或绑定在组件根生命周期，无泄漏、无跨实例污染。
4. **收敛确认**: R5 判定收敛的三项盲区与 9 项弃报留档复读，确认无新事实可翻案。

## 结论

**G4 组审查收敛，终判零发现。** 本轮对前 5 轮未覆盖的残余文件面（打印 CSS、gantt 编辑对话框、barcode torch/队列链、kanban/calendar 导出工具、虚拟化、跨日线、ownership、工具栏残余钮）做了最后一遍穷举式精读与三项接线反查，全部候选均因"已立根因复述 / 零用户可见影响 / 低于真实用户影响检验"弃报留档（6 项，见弃报留档节）。G4 组趋势 14 → 10 → 8 → 5 → 2 → **0**，与前轮"递归增益收敛"判断一致并最终归零确认。**G4 组累积发现维持 39 条（HIGH 0 / MEDIUM 26 / LOW 13，以复核阶段合并裁定为准），无新增。建议 G4 组正式关闭，不再派发后续轮次。**

> 静态口径声明: 本轮为纯源码静态审查（无浏览器运行时验证）；零立案结论不依赖运行时推理，全部基于生产/消费两端的 grep 闭合事实。
