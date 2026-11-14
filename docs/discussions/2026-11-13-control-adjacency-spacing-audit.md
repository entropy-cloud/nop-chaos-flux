# 控件贴合 / 间距问题专项分析报告

- 日期：2026-11-13
- 触发：用户在 `ai-knowledge-chat` 页发现发送箭头与上方输入框零间隔。
- 方法：DOM 实测根因定位 → 共享渲染器修复 → 编写程序化扫描器（46 页全量，检测可交互元素间 <2px 贴合与 >6px×6px 重叠）→ 767 条原始命中过滤 → 逐条 DOM/截图裁决 → 修复与复核。
- 扫描器：`_tmp/ui-audit-2026-11-12/scan-spacing.mjs`（可复用为回归探针）；原始数据 `spacing-scan.json`。

## 一、用户报告问题的根因与修复

**现象**：ai-knowledge-chat 右下角发送箭头紧贴输入框，无间隔。

**根因**（共享渲染器，非页面级）：`packages/flux-renderers-ai/src/renderers/ai-sender.tsx` 的根节点 `nop-ai-sender` 是普通 block div，两个子块（`ai-sender-input` 的 textarea 与 `ai-sender-actions` 的动作行）之间没有任何垂直 gap——实测 textarea bottom=756px、按钮 top=756px，严丝合缝。该渲染器被全部 ai-\* 页面（知识库对话、工单台、HITL 等）共用，属于系统性缺陷而非单页问题。

**修复**：根节点加 `flex flex-col gap-2`（两个分支都改）。复核：`gapPx=8`，flux-renderers-ai 859 测试全绿。

## 二、全页扫描结果（46 页）

| 指标                  | 数值                 |
| --------------------- | -------------------- |
| 扫描页面              | 46（A/B/C 三层全集） |
| 原始命中（贴合+重叠） | 767                  |
| 过滤后真实缺陷        | 3（修复 3）          |
| 判定为按设计/误报     | 其余全部             |

**噪音构成**（为什么 767→3）：592 条 button-button 贴合是表格相邻行的行内按钮（行高=按钮高的正常密度形态）；设计器画布的 Edge 标签/连接端口与节点包围盒相交是图布局的正常几何；面板集群（button-group/tablist）内控件贴合是有意设计。

## 三、真实缺陷明细（全部已修复）

### 1. ai-sender 零间距（共享渲染器）✅

见上节。影响面：所有 ai-\* 页面。

### 2. sundial-detail sticky 页脚硬切断行 ✅

- 实测：最后一行子任务控件（y753-777）与固定动作行"移到列表/移到垃圾箱"（y742-774）重叠。
- 裁决：sticky 页脚 + 实底背景属正常滚动形态，但被切行在页脚边缘**硬切断**缺乏视觉过渡，不符合滚动收尾规范。
- 修复：页脚顶部加 22px 渐隐（`::before` + `linear-gradient`），被裁行向上淡出。截图复核干净。

### 3. word-editor 工具栏控件重叠 ✅

- 实测：高亮颜色 input（x515-543）与左对齐按钮（x520-544）互相重叠。
- 修复：轮次代理调整布局（复核 gap 7px，无重叠）。7px 偏紧但在合格线内，列入观察清单。

## 四、判定为"按设计"的命中（附证据，防返修）

| 命中                                                         | 裁决证据                                                                                                                                    |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| mall-sku-picker 轮播指示点 × SKU 按钮                        | SKU 区是 `nop-floating-panel repl-mall-panel-lift`（fixed、不透明白底、bottom 64px）半屏面板，浮层压页面内容是移动电商标准形态              |
| spreadsheet / report-designer Sheet1 tab × 行头/列头         | tab 是网格下方的独立不透明条，行头滚动穿越其下与 sticky-bar 模式一致，截图无视觉冲突                                                        |
| antdpro-list / mes / mall-distribution 行内按钮 × 主题切换器 | 主题切换器是 fixed 浮层（`bg-card/90 + backdrop-blur + shadow` 半透明卡），内容滚经其下为浮层 chrome 固有形态，且仅滚动到特定位置时短暂同屏 |
| 调试器 FAB × 侧栏导航末项                                    | 复核时 aside 已有 `pb-14` 让出停靠带（nav 滚动区止于 y844，FAB 位于 y848+），无碰撞                                                         |
| wms-pda 数量 input × 增/减 stepper 按钮                      | input-stepper 内嵌模式（增上半/减下半），非缺陷                                                                                             |
| flow/taskflow/bisheng Edge 标签 × 节点包围盒                 | 图布局中边标签位于连线中点，与节点包围盒几何相交不可避免；第五波已提升标签对比度                                                            |

## 五、根因归纳与防复发

1. **共享渲染器的布局缺口是系统性风险**（ai-sender 案例）：一处 flex 缺失 → 全部 ai 页面同病。防复发建议：把 `nop-ai-sender` 的 flex/gap 契约写入 `docs/architecture/renderer-markers-and-selectors.md` 或 quick-reference。
2. **扫描器可固化**：`scan-spacing.mjs` 的启发式（贴合 <2px / 重叠 >6px²、排除 button-group/tablist/行内密度）可作为 e2e 探针纳入 `tests/e2e/`，配合白名单（浮层 chrome、画布 Edge）做棘轮门禁；当前以 `_tmp/` 工具形态保留，未注册为门禁（避免误报噪音进入 CI）。
3. **观察清单**：word-editor 工具栏 7px 间距偏紧；antdpro-detail funnel 首载 0 柱已修但同族 line chart 动画未逐一排查（Bar/Pie 已确定性渲染）。

## 六、验证

- playground 569 / flux-renderers-ai 859 测试全绿；`pnpm check` exit 0。
- 修复复核均为程序化 DOM 实测（gap 像素值、矩形比较），非截图目测。

## 七、门禁固化（2026-11-14 执行）

第五节的方案已落地为正式 e2e 门禁：

- **Spec**：`tests/e2e/control-adjacency-baseline.spec.ts`（28 路由 = 25 桌面 + 3 移动画布，结构对齐 `a11y-axe-baseline.spec.ts` 先例）。
- **规则**：overlap（双向重叠 >6px²）一律计缺陷；touch（贴合 <2px）仅当最近公共祖先为 flex/grid 且 gap<4px 时计缺陷——精确命中 ai-sender 类 bug，表格行密度天然排除。
- **基线**：`tests/e2e/__fixtures__/adjacency-baseline.json`（28 路由 × 67 签名，29 命中，棘轮语义：新增/超量失败、回落提示收紧）。重建：`ADJACENCY_REGENERATE=1 npx playwright test control-adjacency-baseline --grep regenerate`。
- **chrome 排除**：调试器 FAB（`.nop-debugger-launcher`）、主题切换器、侧栏导航不属产品面，出扫描域。
- **稳定性**：连续 3 轮全绿（28/28）；阴性验证成立——注入 `gap:0` 后扫描可捕获（before 8px / after 0px）。
- 首轮发现的抖动根因是 chrome 间歇进扫描区，排除后消除；另修复一处 `page.evaluate` 序列化丢闭包的问题（elementKey 内联）。
