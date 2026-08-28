# R2 第 5 轮递归扩展发现（round-05-g1）— G1 收敛确认轮

> 组号: G1（basic / content / layout） · 轮次: Round 05（收敛确认轮，从严判据） · 审查日期: 2026-08-28 · agent: general（fresh session，只读审查） · HEAD `0f183874a`（与 R1–R4 同基线）
> 派发机制: 提示词 = `dispatch-shared-prefix.md` + `dispatch-recursive-extension.md` + 指定残余盲区（纯展示组件的响应式行为 / cards×selection 剩余组合 / qrcode·audio·video 播放控制边缘态）
> 输入: round-01 全文 + round-04 全文 + round-02-compact + round-03-compact（累积 253 条）；dedup-baseline §1–§4 与 R4"防复核清单"全部生效
> 本轮性质: 收敛确认——按价值收敛判据从严，低价值/机械重复/无明确用户影响的候选一律弃报（弃报留档见文末）

## 发现汇总

共 **1 条**（HIGH 0 / MEDIUM 1 / LOW 0）。G1 组收敛趋势: 15 → 6 → 2 → 5 → **1**。

---

### [G1-R5-视角8-01] markdown 渲染容器无溢出契约：GFM 表格与代码块在窄容器/移动端撑破布局，同仓两个 markdown 消费面均有 overflow 基线而本组件缺失

- **文件**: `packages/flux-renderers-content/src/markdown.tsx:107-119`（渲染容器）、`:116`（remarkGfm 启用）；对照内部基线 `packages/ui/src/components/ui/json-viewer.tsx:64`、`packages/flux-renderers-form/src/renderers/markdown-editor-renderer.tsx:291`
- **证据片段**:
  ```tsx
  // markdown.tsx:107-119 —— 容器仅 nop-markdown 标记类，无任何 overflow 处理
  return (
    <div
      ...
      className={cn('nop-markdown', props.meta.className)}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={rehypePlugins}>
        {source}
      </ReactMarkdown>
    </div>
  );
  ```
  ```tsx
  // 同仓基线 1：ui JsonViewer 为宽内容提供 overflow-auto（json-viewer.tsx:64）
  <div className="overflow-auto min-h-[300px] max-h-[calc(100vh-200px)]">
  // 同仓基线 2：form 包 markdown 编辑器预览区同样 overflow-auto（markdown-editor-renderer.tsx:291）
  className="nop-markdown-editor-preview rounded-md border border-border bg-muted/30 p-3 text-sm overflow-auto"
  ```
- **严重程度**: MEDIUM
- **现状**: markdown 渲染器显式启用 `remarkGfm`（表格为受支持特性），但输出链路上没有任何溢出处理：① 容器 div 仅 `nop-markdown` 标记类，无 `overflow-x-auto`；② 全仓 grep 证实 `.nop-markdown` 零 CSS 规则（`packages/flux-renderers-content/src/styles.css` 仅 separator/progress/diff 规则；`apps/playground/src/styles.css` 无 markdown/prose/table 相关样式）；③ react-markdown 将 GFM 表格/围栏代码块映射为裸 `<table>`/`<pre>` 元素，无 typography 插件、无滚动包裹。浏览器默认样式下 `pre`（`white-space: pre`）与多列 `<table>` 的 min-content 宽度超过容器时直接视觉溢出：在页面级被 overflow 裁剪的宿主布局中表格右侧列不可达，在无裁剪的宿主布局中触发整页横向滚动。对照组：同一内容形态在 ui JsonViewer 与 form 包 markdown-editor 预览区均已确立"宽内容必须有 overflow 滚动容器"的内部基线，唯独立渲染的 markdown 组件缺位。
- **行业惯例**: GitHub / Notion / Ant Design Markdown 渲染等一切主流 markdown 呈现面对表格与代码块均提供横向滚动容器（GitHub 以 `.markdown-body` 内 `overflow-x: auto` 包裹 table/pre；shadcn/ui 生态 markdown 集成的 typography 样式同样为 pre/table 加 overflow-x-auto）；内容宽度超过视口时"块内滚动"而非"撑破页面"是移动端内容呈现的通行契约。
- **用户影响**: 作者插入一张 5 列 GFM 表格或一段长代码行（两者都是 markdown 核心用法），手机端或窄分栏容器中表格右侧列被裁剪不可见，或代码行横向溢出与相邻内容叠压/把页面撑出横向滚动条——用户需滚动整个页面（而非表格区域）才能读到内容，且页面其余部分被推出视口。真实使用必现（移动端是该包明确支持的场景：cards/carousel 均接 `useIsMobile`），通过真实用户影响检验。
- **建议**: ① 最小改法——`markdown.tsx:114` 容器 className 追加 `overflow-x-auto`（与 markdown-editor 预览区同款，对整个 markdown 块生效）；② 或更精细的包级 CSS——在 `styles.css` 补 `.nop-markdown pre, .nop-markdown table { overflow-x: auto; display: block; }`（table 需配 `max-width: 100%`），仅宽块滚动、标题/正文不受影响。推荐 ①（一行、无新增标记层）；修复后补一条"宽 GFM 表格容器出现横向滚动且页面根无横向溢出"的断言。
- **复核状态**: 未复核

---

## 去重自检（与全部 253 条按根因比对）

- **[G1-R5-视角8-01]**（markdown 溢出）≠ [G1-R2-视角8-02]（diff-view 窄容器降级不完整）：不同组件、不同根因（diff 是侧栏固定宽度适配，markdown 是宽内容无滚动容器）。≠ [G1-视角5-04]/[G1-视角5-05]/[G1-R4-视角5-01]（markdown 加载/失败/空值三态）：前三条均为状态呈现缺陷，本条是**成功渲染路径**的内容几何缺陷，修复互不覆盖。R4"防复核清单"未涉及 markdown 渲染几何，非已弃报项。
- 其余三个指定盲区核查后零新发现（判定依据见下），无机械重复条目。

## 本轮核对过且不构成发现的盲区（收敛判定留档，防复核重复提问）

- **qrcode / audio / video 播放控制与边缘态**（三文件全文精读）：error/empty 回退均有 muted 兜底文案 + `data-state`（样式无 destructive 语义一节已由 [G1-R2-视角5-01] 立案，不重报）；qrcode canvas 有 `role="img"` + aria-label + 失败回退（AUDIT-13 竞态豁免注释在位）；audio/video 走原生 `controls`（播放/进度/音量由 UA 提供，`controls: false` 为作者显式选择的后台媒体形态）；src 变化重置 errored、AbortController 中止链在位。无新根因。
- **cards × selection 剩余组合**（cards-renderer + ui card.tsx + 键盘测试面）：选中态 inline ring 消费（R4 已核）维持；ui Card 原语对 interactive 卡片内建 Enter/Space 键盘激活（card.tsx:28-34），键盘闭环；single/multiple 切换 toggle 语义符合 AntD 惯例；role=button 覆盖 listitem 系 CR P2-1 既定裁决（R1 已登记）。弃报项：空态容器 `role="list"` 含非 listitem 子元素（空列表 + 状态文本，SR 实害可忽略）；数据刷新后 selectedKeys 残留失效键（宿主消费面才可见，行业常见行为）。
- **纯展示组件响应式行为**：timeline 水平模式已有 `overflow-x: auto`（styles.css:29）；steps 窄屏压缩 R4 已判定无独立新害（标题 min-w-0 可换行）；cards/grid 均有 responsive columns 运行时分支 + `data-responsive="narrow"` 标记；grid colSpan clamp、responsive-renderer 回退链 R4 核对通过维持；text.tsx 的 line-clamp 采用 Tailwind v4 动态语法修复（scanner 注释在位）。唯一命中即本条 [G1-R5-视角8-01]。
- **三包终扫 grep**（全量非 test 文件）：硬编码 Tailwind 调色板类仅 [G1-视角7-08] 已立案一处；文本字符图标仅 [G1-视角1-07] 已立案两处；硬编码用户可见英文字符串零命中。
- **弃报留档（低于从严门槛）**：collapse-count 徽标与标题文本无间距（纯 2px 级排版细节）；collapse-tone-bar 无背景色（`data-tone` 为 styling-system.md 文档化宿主 hook，R4 已归档非死属性）；image 失败回退丢失 interactive 供龄（无图可预览，实害可忽略）。

## 检查范围

- `packages/flux-renderers-basic/src/`：page/tabs/text/badge/icon（全文或全文复读）；container/flex/fragment/loop/recurse/scope-debug/dynamic-renderer/button/dialog/drawer 为 R1–R4 已全覆盖组件，本轮经 grep 终扫确认无新增命中。
- `packages/flux-renderers-content/src/`：audio/video/qrcode/image/markdown/json-view/html/empty/alert/link/progress/cards-renderer + ui card.tsx（指定盲区精读）；carousel/status/mapping/spinner/separator/diff-view 全族为 R2/R4 已深读组件，本轮经 grep 终扫 + styles.css 溢出契约反查确认。
- `packages/flux-renderers-layout/src/`：collapse-renderer（全文复读）/grid/responsive（全文复读）；steps/timeline/wizard/wizard-step-nav/dropdown-button/button-group 为 R3/R4 已深读组件，本轮经 styles.css + grep 终扫确认。
- 交叉核实：`packages/ui/src/components/ui/card.tsx`（键盘激活与 role 裁决）、`packages/ui/src/components/ui/json-viewer.tsx`（溢出基线）、`packages/flux-renderers-form/src/renderers/markdown-editor-renderer.tsx`（溢出基线）、`apps/playground/src/styles.css`（全局样式反查）。

## 检查方法

1. **指定盲区逐一对照**：按派发指令的三个残余盲区构建核查矩阵——媒体组件五相位（空值/失败/加载/播放控制/src 切换重试）、cards×selection 四组合（single/multiple × 键盘 × 空态 × 数据刷新）、展示组件响应式（overflow 契约 / 窄容器 / 移动标记）逐项通读源码。
2. **全仓消费/定义反查**：`.nop-markdown`/`nop-html` CSS 定义双向 grep（packages + apps）、调色板类 / 文本字符图标 / 硬编码英文字符串三包全量正则终扫，命中逐条归因到已立案条目或弃报。
3. **内部基线对照**：宽内容溢出以 ui JsonViewer 与 form markdown-editor 预览区为正确基线；空态/加载/失败态以 R1–R4 已立条目为对照，只计新根因。

## 结论

新发现 **1 条**（HIGH 0 / MEDIUM 1 / LOW 0）。累积（R1–R5）: 253 + 1 = **254 条**。G1 组四个指定盲区经本轮逐一闭合，残余命中仅 1 条且有明确用户影响与双重内部基线支撑；其余全部候选经价值收敛判据弃报留档。**G1 组递归已收敛，建议审查结束。**
