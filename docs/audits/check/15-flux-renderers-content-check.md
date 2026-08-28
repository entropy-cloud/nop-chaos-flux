# 15 flux-renderers-content 实现代码检查报告

- 检查日期：2026-08-20
- 范围：`packages/flux-renderers-content/src/` 非测试源文件 39 个 / 5562 行（排除 `*.test.*`、`__tests__/`；`test-support.ts`/`test-support-runtime.tsx` 测试基建已核实被 `tsconfig.build.json` exclude、不入 dist）。全部 39 个源文件逐一精读；跨包核实了 flux-core `isSafeNavigationUrl`、flux-compiler `actionValue` 编译路径、flux-react region `scope+bindings` 语义、flux-i18n key 覆盖。
- 已知跨包线索核实：01 号 F-01（`isSafeNavigationUrl` 前导空白/控制字符绕过）在本包消费点 `link.tsx` **真实可达**（见 F-01，归因 root cause 在 flux-core）；image/audio/video 的 `src` 属资源加载而非导航，`javascript:` 在现代浏览器 `<img>/<audio>/<video>` src 中不会执行，**无需**同类 href 守卫（详见结论 F-01 末段与检查记录）。
- 结论概览：**P0 x0 / P1 x3 / P2 x5 / P3 x10**。总评：渲染器契约（props/meta/regions/events/helpers、标准 hooks、`data-slot`/`nop-*` marker、无 BEM、`t()` 全量 i18n、无 `as any`/`@ts-ignore`/非空断言）整体合规；html/markdown 的 DOMPurify 安全门禁实现正确；定时器/监听器/objectURL 全量清理无泄漏。问题集中在两处：link 的 URL 守卫继承 flux-core 缺陷（安全），diff-view 家族的 split 视图语义/折叠模型/列表全量重算（正确性与性能）。

## P0 缺陷

无。未发现无条件即触发的错误行为。P1 均需特定输入条件（数据绑定注入畸形 URL / split 视图或大文件列表场景 / 带 reaction 的 hunk 展开）。

## P1 隐患

### F-01 link `href` XSS 守卫被前导空白/控制字符绕过（消费 01 号 F-01，root cause 在 flux-core）

- 位置：`packages/flux-renderers-content/src/link.tsx:29-34`（消费点）；`src/sanitize.ts:4`（re-export）；root cause `packages/flux-core/src/utils/url.ts:23-29`
- 摘录（本包消费姿势）：

```ts
const href =
  typeof slotProps.href === 'string' &&
  slotProps.href.length > 0 &&
  isSafeNavigationUrl(slotProps.href)
    ? slotProps.href
    : undefined;
```

```ts
// flux-core/src/utils/url.ts
export function isSafeNavigationUrl(url: string): boolean {
  const match = /^([a-z][a-z0-9+.-]*):/i.exec(url);
  if (!match) {
    return true; // ← 前导空白/内嵌 \t\r\n 时不匹配 → 判"无 scheme"→ 安全
  }
  return SAFE_NAVIGATION_SCHEMES.has(match[1].toLowerCase() + ':');
}
```

- 推理链（输入 → 路径 → 错误结果）：输入 `href: "${row.url}"` 数据绑定（`link.tsx:25-28` 注释明示 "href may be data-bound (`${item.link}`)"），外部数据返回 `" javascript:alert(document.cookie)"` 或 `"java\tscript:alert(1)"` → 正则 `^([a-z][a-z0-9+.-]*):/i` 因首字符非字母（或 scheme 中含 `\t`）不匹配 → `isSafeNavigationUrl` 返回 `true`（视为相对路径）→ `href` 原样写入 `<a href>`（`link.tsx:60`）→ 按 WHATWG URL 规范，浏览器解析前剥离首尾 C0 控制字符/空格并移除所有 `\t\n\r` → 点击时以 `javascript:` scheme 在**当前页面上下文**执行脚本（XSS，可窃取会话、伪造操作）。
- 暴露面核实：本包 link 与 10 号已核实的 `flux-renderers-basic/button.tsx:245-250` 是同一守卫的两个消费点，消费姿势本身均符合契约（不安全时降级为无 href 锚点）；`link.test.tsx:104-144` 覆盖精确 scheme（`javascript:`/`vbscript:`）但**无前导空白/控制字符用例**（测试缺口与缺陷同步，与 button 同形）。
- image/audio/video `src` 守卫需求结论：三者 `src` 仅作资源加载（非导航），`javascript:` URL 在 `<img>/<audio>/<video>` 的 `src` 中不执行脚本（浏览器按资源请求处理并失败），现代浏览器均无此攻击面；image fetcher 返回的 URL 同理流入 `<img src>`。无需为它们引入 `isSafeNavigationUrl`。html/markdown 的 XSS 面由 DOMPurify 门禁覆盖（`sanitize.ts:41-44`），DOMPurify 自身对控制字符变体处理正确，不受本缺陷影响。
- 影响：数据绑定 href 注入畸形 `javascript:` URL 时点击执行任意脚本。
- 修复方向：root fix 归 flux-core（01-F-01：匹配前 `trim()` 并剥离 `\t\r\n` 后再判 scheme）；本包消费姿势无需改动，建议在 `link.test.tsx` 补空白/控制字符回归用例（与 10 号对 button 的建议对齐）。

### F-02 diff-view split 双栏渲染完全相同的行集合，右栏行号恒取 old 侧编号

- 位置：`packages/flux-renderers-content/src/diff-view/components/diff-split-view.tsx:70-99`；`diff-line.tsx:33-50`；佐证 `diff-view.css:181-186`（无按侧过滤规则）
- 摘录：

```tsx
// diff-split-view.tsx —— 两个 pane 传入的是同一 hunk、同一 lines，无 side 过滤
{file.hunks.map((hunk, hunkIdx) => (
  <DiffHunkComponent key={hunk.header} hunk={hunk} ... />  // old pane
))}
...
{file.hunks.map((hunk, hunkIdx) => (
  <DiffHunkComponent key={hunk.header} hunk={hunk} ... />  // new pane，同数据
))}
```

```tsx
// diff-line.tsx —— split 模式（isUnified=false）只渲染一个 gutter，值取 oldLineNum
<span data-slot="diff-gutter" data-diff-gutter="old" className="nop-diff-gutter">
  {oldLineNum ?? ''}
</span>
```

- 特定条件与后果：任何 `viewType: 'split'`（schema 默认值，`content-renderer-definitions.ts:514`）渲染即触发，无需特殊输入：
  1. **两栏内容相同**：`DiffHunkComponent`/`DiffLineComponent` 无 side 概念，old pane 与 new pane 渲染同一 `hunk.lines` 全集——added 行（带 `nop-diff-line-add` 绿底与内容）原样出现在"旧版本"栏，deleted 行原样出现在"新版本"栏。与 `docs/components/diff-view/design.md`（"split=并排分栏，左侧 old 版本/右侧 new 版本"）的语义不符；split 视图实际是"unified 视图画两遍"。
  2. **右栏行号错误**：split 模式单 gutter 固定取 `oldLineNum`——new pane 中 context 行显示的是 old 侧行号，add 行（`oldLineNum` 为 undefined）gutter 为空，**新侧行号在 split 模式下永远不显示**。
  3. 测试只断言 new pane 存在 add 行（`diff-view/__tests__/diff-view-renderer.test.tsx:124-131`），未断言 old pane 不含 add 行/行号正确性——缺陷与测试缺口同步。
- 影响：split 视图（默认视图）对用户呈现错误的双栏对照与错误行号；依赖 `lineNumber` 的 `onLineClick` payload 在 new 侧行号语义失真。
- 修复方向：为 `DiffLineComponent`/`DiffHunkComponent` 引入 `side: 'old' | 'new'` 概念——old pane 仅渲染 context+delete（gutter 取 `oldLineNum`），new pane 仅渲染 context+add（gutter 取 `newLineNum`），未渲染侽数据保留用于对齐（或按行配对补空行占位保持两栏垂直对齐）；补 old/new pane 内容与行号的断言用例。

### F-03 DiffFileList 每次点击文件都对全部文件重算 dmp 字符级 diff（主线程阻塞，最坏 N×1s）

- 位置：`packages/flux-renderers-content/src/diff-view/components/diff-file-list.tsx:31-44`（entries memo 依赖含 `visitedSet`）；`:58-68`（handleSelect 同时写 visitedSet）
- 摘录：

```tsx
const entries = useMemo<FileEntryData[]>(() => {
  return files.map((file, index) => {
    const diffFile = computeDiffFile(file.oldContent ?? '', file.newContent ?? '');
    const stats = computeDiffStats(diffFile);
    ...
  });
}, [files, visitedSet]);   // ← visitedSet 仅影响 visited 标记，却触发全量 diff 重算
```

- 特定条件与后果：跨文件模式（`files` 非空）下**每次点击任一文件**（`handleSelect` → `setVisitedSet` 新 Set）→ `entries` memo 失效 → 对**每个**文件重新执行 `computeDiffFile`（diff-match-patch `diff_main` 默认 `Diff_Timeout = 1.0s`，已核实 `node_modules/diff-match-patch/index.js:98-103`，加上 `diff_cleanupSemantic` 开销）+ `computeDiffStats`。100 个文件的大 diff（代码评审典型场景）单次点击最坏阻塞主线程近百秒；即使常规规模，每次点击也重复付出全部文件的 diff 成本（active 文件在 `SingleFileDiff` 内还要再算一次，重复劳动）。`visited` 标记本可用 `visitedSet.has(index)` 在渲染期读取而无需进 memo 依赖。
- 影响：跨文件 diff 视图交互（点击切换文件）卡顿乃至页面冻结，文件数×内容体积越大越严重。
- 修复方向：将 diff 统计与 visited 解耦——`entries`（含 stats）仅依赖 `files`；`visited` 作为独立 memo/渲染期读取（`visited: visitedSet.has(index)`）或把 visited 移入 `FileListItem` 自身 state/独立 memo；`computeDiffFile` 结果可再按文件做 `useMemo` 缓存避免与 `SingleFileDiff` 重复计算。

## P2 风险

### F-04 image `fetcher` 按普通 prop 声明，未走 `actionValue: true` 契约（模板被求值时机错误）

- 位置：`packages/flux-renderers-content/src/content-renderer-definitions.ts:149`（`{ key: 'fetcher', kind: 'prop' }`，无 `propContracts.fetcher`）；对照 `packages/flux-renderers-data/src/data-renderer-definitions.ts:35-49`（`quickSaveAction` 等均为 `shape: { kind: 'schema-definition', fieldRules: {}, actionValue: true }`）
- 摘录（flux-compiler 编译差异，`node-compiler.ts:300-337` + `node-compiler-helpers.ts:586-590`）：

```ts
// actionValue: true 时 —— action 字面量被原子保留，dispatch 时才求值
if (match.shape.actionValue) {
  return { __nopPreserveLiteral: true, value: target };
}
// 普通 prop 时 —— 整个 ActionSchema 进入 expressionCompiler.compileValue
compiledPropEntries[key] = expressionCompiler.compileValue(classifiedValue, ...);
```

- 问题：`fetcher` 是"renderer 派发的 ActionSchema prop"（与 `quickSaveAction`/`loadAction`/`uploadAction` 同族，`docs/architecture/renderer-runtime.md` 明确该族走 `actionValue: true`），但此处按普通 prop 编译——action 内嵌的 `${}` 模板（如 `args.url: "/api/img/${fileId}"`、action 级 `when: "${canFetch}"`）会被 propsProgram 在**节点解析期**（render 时对 node scope）求值，而非 **dispatch 期**按 action 语义求值；求值后的对象再交给 `helpers.dispatch(fetcher, { signal })`（`image.tsx:43`）二次编译。静态 fetcher（无表达式）走 static fast path 不受影响；含表达式的 fetcher 语义依赖"求值时机恰好相同"这一巧合，且 action 的 `when`/条件字段被提前物化后失去 action 编译器的布尔规约路径。
- 影响：含模板表达式的 image fetcher 存在双重求值/求值时机偏移风险（dispatch-only 绑定不可用、`when` 提前固化）；与家族契约不一致，工具链（inspector/shape 校验）也拿不到 action 语义标注。[suspect：静态 fetcher 无实际用户可见差异]
- 修复方向：为 image 定义补 `propContracts: { fetcher: { shape: { kind: 'schema-definition', fieldRules: {}, actionValue: true }, ... } }`，对齐 data 包家族模式；补一条"fetcher 含 `${}` 模板 + dispatch 期 scope"用例锁定求值时机。

### F-05 hunk 展开在 setState updater 内派发事件副作用（StrictMode 双派发）

- 位置：`packages/flux-renderers-content/src/diff-view/components/diff-hunk.tsx:38-44`
- 摘录：

```tsx
const toggleExpand = useCallback(() => {
  setIsHidden((prev) => {
    const next = !prev;
    onHunkExpand?.(hunkIndex, !next); // ← 副作用写在 updater 内
    return next;
  });
}, [hunkIndex, onHunkExpand]);
```

- 问题：React 要求 state updater 为纯函数；开发态 StrictMode 会双调用 updater，`onHunkExpand`（经 `diff-view-renderer.tsx:384-391` 派发 `events.onHunkExpand` → 完整 action dispatch）会被**执行两次**——若 action 有副作用（`setValue`/`ajax`），dev 环境下重复触发；生产态虽只调用一次，但依赖的是实现巧合而非契约。
- 影响：dev/StrictMode 下 hunk 展开事件 action 双派发；违反 React 19 updater 纯函数纪律。
- 修复方向：把派发移出 updater——先读当前态计算 `next`，`setIsHidden(next)` 后再 `onHunkExpand?.(hunkIndex, !next)`（或用单个布尔 state 的函数式外的局部变量）。

### F-06 `computeDiffFile` 永远产出单个巨型 hunk：默认折叠阈值会藏起整个 diff（含变更行）

- 位置：`packages/flux-renderers-content/src/diff-view/model/diff-parse.ts:180-248`（context 行无条件入 hunk、仅循环结束 flush 一次）；`diff-hunk.tsx:31-36`（折叠判定按单 hunk 的 context 行数）
- 摘录：

```ts
for (const [op, text] of diffs) {
  if (op === 0) {
    for (const line of textLines) {
      currentHunkLines.push({ type: 'context', ... }); // 无 context 窗口切分
    }
  } ...
}
flushHunk(); // 循环外仅一次 → 恒为单 hunk
```

```tsx
const [isHidden, setIsHidden] = useState(() => {
  ...
  const contextLines = hunk.lines.filter((l) => l.type === 'context').length;
  return contextLines > defaultCollapsedLines;   // 默认阈值 10
});
```

- 问题：真实 diff 工具按 context 窗口（通常 3 行）切分 hunk；此处全文件 context+变更行进**一个** hunk。后果：任何"未变更行 > 10"的 diff（绝大多数真实文件）在默认 `defaultCollapsedLines: 10`（`diff-view-renderer.tsx:219`）下**整体折叠**——包括 add/delete 变更行全部藏在一个按钮后，按钮文案还只标注 context 行数（"N unchanged lines"语义失真）；`expandAll/collapseAll` 与 `onHunkExpand` 的"hunk"粒度退化为"整个文件"，hunk header `@@ -1,N +1,N @@` 恒覆盖全文件。
- 影响：diff 视图默认呈现为一个折叠块，变更内容不可见，需手动展开；hunk 级交互语义失真。
- 修复方向：在 `computeDiffFile` 中实现 context 窗口切分（如变更行前后各保留 N 行 context，超长 context run 切分为独立 hunk 或折叠占位），与 `defaultCollapsedLines` 的"长 context run 折叠"语义对齐。

### F-07 媒体/图片族事件透传契约缺口：原生事件对象被丢弃

- 位置：`packages/flux-renderers-content/src/image.tsx:159-164`（click）、`audio.tsx:30-33` / `video.tsx:40-43`（error）
- 摘录：

```tsx
// image.tsx —— handleClick 收到 React MouseEvent 但不透传
function handleClick() {
  if (preview) {
    setPreviewOpen(true);
  }
  void onClick?.(); // ← 无参调用，event 丢弃
}
```

```tsx
// audio.tsx —— onError 同样无参
function handleError() {
  setErrored(true);
  void onLoadError?.(); // ← 原生 error event 丢弃
}
```

- 问题：`docs/architecture/renderer-runtime.md` Event Passthrough Contract 要求 DOM 事件入口"call `props.events.onXxx?.(event)` rather than dropping the event object"（本包 `link.tsx:50`、`card.tsx:28`、`carousel`/`cards`/`diff-view` 均合规且有自定义 payload type）。image 的 `onClick`、audio/video 的 `onLoadError` 把原生事件整体丢弃，schema action 内 `${event...}` 绑定与 `preventDefault` 路径不可用。
- 影响：作者无法在 onClick/onLoadError action 中读取事件信息（坐标/键位/错误详情），与其他渲染器行为不一致。
- 修复方向：`handleClick(event)` 透传 `onClick?.(event)`；`handleError(event)` 透传 `onLoadError?.(event)`；补事件透传断言用例。

### F-08 语法高亮序列化丢弃嵌套 element 子节点（特定语言代码文本丢失）

- 位置：`packages/flux-renderers-content/src/diff-view/adapters/syntax-highlight.ts:57-70`
- 摘录：

```ts
} else if (node.type === 'element') {
  const classes = ...;
  html += `<span class="hl-${classes}">`;
  for (const child of node.children) {
    if (child.type === 'text') {      // ← 嵌套 element 子节点被静默丢弃
      html += escapeHtml(child.value);
    }
  }
  html += '</span>';
}
```

- 问题：lowlight（highlight.js HAST）部分文法产生嵌套 span（如 JS 模板字符串 `subst`、部分 SQL/XML 文法），该手写序列化只append `text` 子节点，嵌套 `element` 子节点的**全部文本内容直接消失**（转义安全无虞，但代码内容缺失）。附注：行级 LRU 缓存仅 50 条（`:42`），大 diff 逐行高亮基本全 miss，缓存形同虚设（性能维度）。
- 影响：启用 `language` 的 diff 视图中，含嵌套 token 的代码行显示时丢字；缓存失效放大同步高亮开销。
- 修复方向：递归序列化 HAST 子树（element 子节点递归拼接，仅拦截 `onerror` 类属性、保留 escapeHtml）；缓存容量按行数需求调大或按 content hash 换为 Map 上限 500+。

## P3 提示

### F-09 audio/video 换源时错误态复位走 commit 后 effect，错误 fallback 闪现一帧

- 位置：`audio.tsx:26-28`、`video.tsx:36-38`。`useEffect(() => setErrored(false), [src])` 在 src 变化的首帧仍以 `errored=true` 渲染 fallback 分支（`<audio>`/`<video>` 元素被卸载），effect 提交后才恢复。同族 image.tsx:90-95 已用 `lastSrcRef` 渲染期复位（家族内两种写法并存）。修复方向：统一为 image 的 render-time 复位模式或 `key={src}` 重建。

### F-10 poster/card/carousel 图片无 onError 回退

- 位置：`audio.tsx:44-46,61-63`、`video.tsx:54-56`、`card.tsx:45-52`、`carousel.tsx:258-264`。poster/封面/轮播图加载失败时显示浏览器碎图标，与 image 渲染器的 fallback 契约不一致。修复方向：复用轻量错误占位（或抽公共 `img` fallback）。

### F-11 `viewType` / `activeFileIndex` schema 变化在挂载后被忽略

- 位置：`diff-view-renderer.tsx:225-226`（`useState(schemaViewType)` 仅初值）、`:479-480`（`useState(clampedIndex)` 仅初值）。数据绑定驱动的 `viewType`/`activeFileIndex` prop 运行期变化不生效（受控 prop 退化为非受控初值）。修复方向：effect 同步或文档明示"仅初始值"语义。

### F-12 三栏视图快速切换差异时 flash 高亮类残留

- 位置：`diff-three-column-view.tsx:83-89`。effect cleanup 清掉的是"500ms 后移除 `nop-diff-line-flash`"的定时器，类本身留在元素上——快速连续 prev/next 时旧行 flash 类永不移除。修复方向：cleanup 时先同步 `classList.remove` 再清定时器。

### F-13 `middleContent` 去抖窗口内三栏判定与中栏内容瞬时不一致

- 位置：`diff-view-renderer.tsx:92`（`hasMiddleContent` 读原始 prop）vs `:118-120`（渲染用 `debouncedMid`）。middleContent 刚到达的 150ms 内进入三栏布局但中栏仍为旧值/空。修复方向：判定与渲染统一用去抖后的值。

### F-14 mapping `item` region 渲染不传映射结果，region 内无法引用命中值

- 位置：`mapping.tsx:85-87`（`itemRegion?.render()` 无 bindings），`content-renderer-definitions.ts:366`（region 无 `params`）。[suspect：可能定位为纯静态片段，但 schema 注释"命中项的可选模板区"暗示应能访问命中值] 修复方向：`render({ bindings: { hit, value } })` + `params: ['hit','value']`，或修订注释明确静态语义。

### F-15 qrcode aria-label 内嵌完整编码值

- 位置：`qrcode.tsx:109`（`t('flux.qrcode.ariaLabel', { value: valueStr })`）。长 URL/文本值时读屏播报冗长。修复方向：截断或提供独立 aria 文案 prop。

### F-16 diff-view 死代码与多文件解析只取首个文件

- 位置：`diff-line.tsx:89-114`（`DiffGutter` 无使用且未标 deprecated）、`diff-gutter.tsx:8-12`（`DiffGutterCell` 已标 deprecated）、`diff-file-list.tsx:218-234`（`renderFileListSidebar` 已标 deprecated）、`diff-parse.ts:131-154`（`parseToDiffFile` 对多文件 unified diff 仅取 `raws[0]`，当前仅测试消费）。修复方向：按 `docs/skills/deprecated-feature-cleanup.md` 登记后清理；`parseToDiffFile` 若保留需文档化"仅首文件"。

### F-17 carousel items 身份抖动引发重订阅与疑似多余 change 事件

- 位置：`carousel.tsx:59-85`。effect 依赖 `items`（每次解析的新数组引用），重订阅时立即调用 `onSelect()`（`:78`）——若 embla reInit 后 snap 回 0 而 `lastIndexRef` 非零，会对每次 items 引用变化派发一次 `carousel:change`。[suspect：依赖 props 复用链对数组的引用稳定策略，未实测复现] 修复方向：以 `api` 为订阅主依赖、items 经 ref 读取；立即 `onSelect()` 仅在真实 select 事件时触发。

### F-18 schema 注释/互斥语义与实现不一致（两处小项）

- `schemas.ts:333`：`CarouselItemSchema.image` 注释称"图片/视频地址"，`carousel.tsx:258-264` 仅渲染 `<img>`（视频项将显示破图）。
- `image.tsx:88`：`fetcher` 与 `src` 同时提供时 `src` 被静默忽略（`effectiveSrc = fetcher ? fetcherSrc : src`），schema 注释未声明互斥（对照 diff-view 对 `files` vs `oldContent/newContent` 有 console.warn，`diff-view-renderer.tsx:357-359`）。
- 修复方向：注释改"图片地址"；image 补互斥提示或文档。

### F-19 cards 每卡 scope 在 useState 初始化器内创建（StrictMode dev 首帧 scope 不回收）

- 位置：`cards-renderer.tsx:125`（`useState(() => helpers.createScope({ item, index }))`）。StrictMode 双渲染丢弃首帧 state，首个 scope 已注册进 runtime `ownedScopeDisposers` 但无 dispose（dev-only 泄漏；生产单渲染无影响）。该模式与 `flux-renderers-data/src/list-renderer.tsx:75` 完全同款（家族级现状，非本包独有），且架构文档要求"owner resources only after commit"。修复方向：家族级统一迁移到 effect 内创建或 ref+commit 模式（跨包事项，建议单独立项）。

## 检查过程记录

1. **基线阅读**：`docs/references/quick-reference.md`、`docs/architecture/renderer-runtime.md`（契约/事件透传/actionValue/reaction 规则）；`package.json`（peerDeps：dompurify/react-markdown 等，deps：qrcode/diff-match-patch/lowlight）。
2. **全量精读 39 个源文件**（根目录 24 个渲染器/定义/索引/样式 + `diff-view/` 15 个：renderer、model×4、components×8、adapters×1、utils、css）。
3. **已知线索核实**：
   - F-01 链路：`flux-core/src/utils/url.ts:23-29` 正则实测语义核对（`^` 锚定 + 无 trim/控制字符剥离）→ `sanitize.ts:4` re-export → `link.tsx:29-34,60` 消费；`link.test.tsx:104-144` 确认无空白/控制字符用例；10 号报告 button.tsx 消费点复核一致。
   - image/audio/video `src`：确认为资源加载非导航（无 `javascript:` 执行面），不需 href 级守卫；fetcher 返回值仅入 `<img src>`。
4. **跨包契约核实**：
   - `actionValue`：`flux-compiler/src/schema-compiler/node-compiler.ts:300-337`、`node-compiler-helpers.ts:562-596`（plain prop vs preserve-literal 路径差异）+ `flux-renderers-data/src/data-renderer-definitions.ts:35-49` 家族对照 → F-04。
   - region `scope+bindings`：`flux-react/src/render-nodes.tsx:262-330`（bindings 触发 fragment scope 创建，scope+bindings 并用为 list-renderer/cards 家族既有模式）→ 不作为本包独立 finding（F-19 仅记 dev 态提示）。
   - `ApiFetcher`/`ApiRequestContext`（`renderer-api.ts:7-50`）与 `ActionContext.signal`（`actions.ts:326`）—— markdown `env.fetcher(..., { signal })` 与 image `dispatch(fetcher, { signal })` 类型契约合法。
   - `resolveRendererSlotContent`/`hasRendererSlotContent`（`render-nodes.tsx:206-251`）用法核对无误。
5. **grep 扫描**（`--exclude="*.test.*" --exclude-dir="__tests__"`）：`as any` 0 处；`@ts-ignore/@ts-expect-error` 0 处；非空断言 0 处；空 catch 全量核对（`qrcode/json-view/markdown/mapping/image/syntax-highlight/diff-inline` 共 8 处，均有降级返回值或注释理由，无静默吞错）；`setInterval/setTimeout` 5 处（carousel/json-view/diff-view×3）与 `addEventListener` 3 组（carousel 容器+matchMedia、diff-view window keydown）清理全量核对无泄漏；`URL.createObjectURL` 0 处；`dangerouslySetInnerHTML` 5 处（html.tsx 经 DOMPurify；diff-view 4 处经 `escapeHtml`/`generateConflictMarkerHtml` 常量，均安全）；非注释中文用户可见字符串 0 处（i18n 全量走 `t()`，key 抽查 `noSource/loadFailed/goToSlide/ariaLabel/collapsedLines/prevDiff/searchFiles/noFilesMatch/statusAdded` 均存在于 en-US/zh-CN locale）。
6. **辅助验证**：`tsconfig.build.json` exclude 覆盖 test-support；`styles.css`/`diff-view.css` 存在且 `@import` 路径有效，CSS 无按 pane 过滤行的规则（F-02 佐证）；diff-match-patch `diff_main` 默认 `Diff_Timeout=1.0s`（node*modules 源码核对，F-03 量化依据）；dmp `diff_linesToChars*` 用法（diff-3way）与 flatten 配对逻辑精读未见错配；`docs/components/diff-view/design.md` split 语义引用（F-02 判据）。
