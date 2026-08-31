# R2 第 2 轮递归扩展发现（round-02）

> 轮次: Round 02（递归扩展，盲区清单：兄弟实例 / 跨组件组合 / disabled·empty·loading·error 边缘态 / 响应式移动端） · 审查日期: 2026-08-28 · HEAD `0f183874a`
> 派发机制: opencode `task` / general × 7（fresh session）；提示词 = `dispatch-shared-prefix.md` + `dispatch-recursive-extension.md`（含 round-01 全文读取指令）
> session 证据链: G1 ses_fb7845572ffeNshf5cme20bOGY · G2 ses_fb77478ccffeGY6hIox95KyUtG · G3 ses_fb7843526ffeEh6bAaCYP3Qy6Z · G4 ses_fb784227dffebzPpcgfGNBPyBw · G5 ses_fb7840c82ffeLnEFMV792qh6b9 · G6 ses_fb783f759ffeVSbjyP2IpxRQ38 · G7 ses_fb783e1acffex2GcAWe54JQhQK
> 主 agent 完整性检查: 63/63 条通过六要素程序化校验
> 主 agent 轮间去重校验（根因比对，合并/丢弃留档；正式记录落 review.md）: 与 round-01 127 条逐根因比对——**零完全重复**；下列条目为"已立根因的新实例"，保留为独立条目并打共性标记（Phase 5 同根因聚合 + 复核阶段合并裁定）：[G1-R2-视角3-02]←[G1-视角3-03]（状态属性无样式消费）、[G1-R2-视角5-01]←[G1-视角5-05]（失败态无语义色）、[G2-R2-视角4-02]←R1 checkbox-group maxSelected（上限静默禁用）、[G3-R2-视角8-01]（hover-only 不可达删除钮）、[G4-R2-视角9-01]←kanban（role=button 嵌套真实按钮）、[G5-R2-视角8-01]←[G4-视角8-02]（20px hover-only）、[G7-R2-视角10-01]←[G7-视角10-08]（删除钮样式分裂）；另 G2"去重备忘"4 处同根因槽位并入 [G1-视角5-05] 修复批次（未另立条目）

## 覆盖率与发现汇总

| 组  | 目标                                 | 发现                                | 覆盖与口径                                                                                                                                                                                                                                          | session                                                                                                                            |
| --- | ------------------------------------ | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| G1  | basic / content / layout             | HIGH 0 / MEDIUM 6 / LOW 0，共 6 条  | 三包 82 个非 test 文件全覆盖；盲区清单逐项深挖（兄弟实例全量 grep 零新命中已归并、边缘态、响应式）；关键结论经全仓 CSS grep 验证样式消费方。                                                                                                        | ses_fb7845572ffeNshf5cme20bOGY                                                                                                     |
| G2  | form / form-advanced                 | HIGH 1 / MEDIUM 4 / LOW 3，共 8 条  | 两包 114 个非 test 文件全覆盖；10 组模式 grep 全扫 + 26 个边缘态 UI 文件逐行通读；4 项同根因增量落"去重备忘"未另立条目。视角3-01/5-01 含异步时序推断，标注复核阶段运行时确认。                                                                      | ses_fb77478ccffeGY6hIox95KyUtG（首派 ses_fb7844663ffedAN6VXGBPQJ51b 因速率限制失败，按 Failure Path audit-subagent 重试 1 次成功） |
| G3  | data / dashboard / pivot             | HIGH 0 / MEDIUM 5 / LOW 4，共 9 条  | 21 个 data UI 承载文件 + dashboard/pivot 渲染文件精读，纯逻辑文件定向 grep 复查；盲区（组合场景/maxSelection 三通道/响应式全链路）逐项深挖；Base UI closeOnClick 默认值经 node_modules 源码核实。7 条标注为 round-01 已报根因的兄弟实例供复核合并。 | ses_fb7843526ffeEh6bAaCYP3Qy6Z                                                                                                     |
| G4  | mobile / scheduling                  | HIGH 0 / MEDIUM 7 / LOW 3，共 10 条 | mobile 10/10 全读；scheduling 24 个 UI 承载文件二次通读 + 5 个包 CSS 全文核对；关键结论以全仓 grep 静态事实闭合（drop-target CSS 缺失、focus 规则零命中、exportError 零渲染点）。                                                                   | ses_fb784227dffebzPpcgfGNBPyBw                                                                                                     |
| G5  | ai / graph / map / industrial+editor | HIGH 0 / MEDIUM 7 / LOW 7，共 14 条 | ai 视觉面全量复核 + graph/map/industrial UI 承载文件全读；逻辑面定向 grep 验证（aborted 消费、data-mode CSS、toolbox status 规则）；静态口径声明同 R1（graph/map/industrial）。                                                                     | ses_fb7840c82ffeLnEFMV792qh6b9                                                                                                     |
| G6  | @nop-chaos/ui 62 模块                | HIGH 1 / MEDIUM 3 / LOW 2，共 6 条  | 62/62 模块全覆盖；焦点环/把手/i18n 家族兄弟实例全量 grep + 浮层族组合场景通读 + 边缘态类串对齐 + 暗色 token 双源 grep；与 round-01 127 条逐条根因去重。                                                                                             | ses_fb783f759ffeVSbjyP2IpxRQ38                                                                                                     |
| G7  | playground 19 页                     | HIGH 1 / MEDIUM 8 / LOW 1，共 10 条 | 19/19 schema 全量复读（静态口径）；渲染形态结论经 showcase-env/mock-backend/link/tree-options/dialog-host/complex-pages.test 等运行时源码交叉核实；去重自检丢弃 6 项候选（记录在组文件）。                                                          | ses_fb783e1acffex2GcAWe54JQhQK                                                                                                     |

汇总: HIGH 3 / MEDIUM 40 / LOW 20，共 **63 条**。累积（R1+R2）: **190 条**。低于 2000 行压缩阈值（R1 3165 行 + R2 约 1500 行，第 3 轮起若累积超 2000 行发现文本按 skill 启用压缩摘要策略——本注释指发现条目正文，轮文件本身保持全文）。

---

## G1 — basic / content / layout（HIGH 0 / MEDIUM 6 / LOW 0，共 6 条）

### [G1-R2-视角2-01] button `href` 锚点分支完全丢失按钮视觉：variant/size 失效，渲染为 UA 默认超链接

- **文件**: `packages/flux-renderers-basic/src/button.tsx:189-193,245-263`
- **证据片段**:
  ```tsx
  const buttonClass = cn(
    props.meta.className,          // 仅 schema className + block/min-h，无任何按钮 chrome 类
    block && 'w-full',
    mobileTouchTarget && 'min-h-11',
  );
  ...
  const button = renderAsAnchor ? (
    <a
      ref={anchorRef}
      href={href}
      target={props.props.target}
      {...commonProps}             // className=buttonClass —— 无 cva 生成类
  ```
- **严重程度**: MEDIUM
- **现状**: 配置 `href` 后按钮改走裸 `<a>` 分支，只继承 `meta.className`/`block`/`min-h-11`，不经过 ui `Button` 的 `buttonVariants({ variant, size })`——`variant: "destructive" | "outline" | "default"` 与 `size` 在锚点形态下全部静默失效，最终是浏览器默认样式的蓝字下划线链接（无背景、无边框、无圆角、无 hover 态）。ui `buttonVariants` 的 `default` 变体甚至专门写了 `[a]:hover:bg-primary/80`，说明按钮 chrome 本预期覆盖锚点形态。round-01 [G1-视角3-02] 只报了该分支的 disabled 交互缺陷；"按钮 chrome 整体缺失"是另一根因（样式层缺类，非交互层），未被覆盖。
- **行业惯例**: Ant Design Button 传 `href` 时渲染 `<a>` 且完整保留按钮外观与 variant 配色；shadcn/ui Button `asChild` 组合 `<a>` 同样保留全部按钮样式。同语义控件（导航按钮）不应因是否带 href 而变成两套视觉。
- **用户影响**: 同一工具栏里三个按钮若有一个配了 href（如"查看文档""打开详情"），用户看到的是一条与上下按钮风格完全割裂的裸链接——无底色、无内边距、高度塌缩（除非 schema 手工补类）；配置了 `variant: "destructive"` 的 href 按钮同样不显示红色语义，作者意图静默丢失。
- **建议**: 锚点分支复用 cva 类串：`className={cn(buttonVariants({ variant, size }), buttonClass)}`（ui 已导出 `buttonVariants` 时直接引入），或改用 Base UI `render` 组合：`<Button render={<a href={href} target={...} />}>` 让 ui Button 生成锚点并自动带全量 chrome；同时给该分支补 `aria-disabled`/`pointer-events-none opacity-50`（与 round-01 [G1-视角3-02] 的修复一并落地）。
- **复核状态**: 未复核

---

### [G1-R2-视角3-01] collapse 触发器 disabled 项无任何视觉禁用区分，且 hover 反馈照常出现

- **文件**: `packages/flux-renderers-layout/src/collapse-renderer.tsx:206-233`
- **证据片段**:
  ```tsx
  <CollapsibleTrigger
    data-slot="collapse-trigger"
    data-tone={toneValue}
    disabled={disabled}            // 仅传原生 disabled，无任何配套视觉类
    onClick={() => handleToggle(key, disabled)}
    className={cn(
      'flex w-full items-center justify-between rounded-lg border border-border px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-muted',
      isOpen && 'bg-muted',
    )}
  >
  ```
- **严重程度**: MEDIUM
- **现状**: item `disabled: true` 时触发器只拿到原生 `disabled` 属性，className 无任何 `disabled:` 变体类：① 禁用项与可用项像素级相同（无置灰）；② `hover:bg-muted` 对 disabled 按钮依然生效（CSS `:hover` 命中原生 disabled 元素），悬停仍出现"可点"反馈。同包 steps-renderer.tsx:276 对 disabled 指示器有 `opacity-50 cursor-not-allowed`，ui tabs trigger（`packages/ui/src/components/ui/tabs.tsx:56`）带 `disabled:pointer-events-none disabled:opacity-50`——同仓两处既有基线均未在此复用。collapsible.tsx 是 Base UI 原语直出（无样式兜底），渲染器是唯一补样式的机会。
- **行业惯例**: Ant Design Collapse 禁用面板头呈灰色且无 hover 反馈；shadcn/ui 生态所有可交互基类统一 `disabled:opacity-50 disabled:pointer-events-none`。
- **用户影响**: 配置了禁用折叠项的页面里，用户点击禁用头毫无反应、悬停却照常高亮——"看起来能点、点了没反应、悬停还鼓励你点"，只能反复尝试后判定控件坏了；与同页 steps 的置灰禁用形成两套禁用语言。
- **建议**: 触发器 className 追加 `disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent`（与 steps-renderer.tsx:276 同族）；或在包内抽一个共享的 `collapsibleTriggerVariants` 供后续 tone 化时继续复用。
- **复核状态**: 未复核

---

### [G1-R2-视角3-02] button `active`（aria-pressed 按压态）仅落 data-active/aria-pressed，全仓无任何样式消费 [G1-视角3-03 同类新实例]

- **文件**: `packages/flux-renderers-basic/src/button.tsx:229-237`；`packages/ui/src/components/ui/button.tsx:7`（基类）
- **证据片段**:
  ```tsx
  const commonProps = {
    className: buttonClass,
    ...
    'data-active': active ? 'true' : undefined,
    'aria-pressed': active ? true : undefined,
    ...
  };
  ```
  ```ts
  // ui button.tsx 基类（grep 证实）: 有 aria-expanded:*/aria-invalid:*/disabled:*
  // 分支，无任何 aria-pressed:*/data-active:* 分支；全仓 CSS grep 无 button[data-active] 规则
  ```
- **严重程度**: MEDIUM
- **现状**: schema `active: true`（持久高亮/按压按钮，典型如分段工具栏的当前项）渲染时只输出 `data-active="true"` 与 `aria-pressed="true"` 两个属性：读屏用户能听到按压态，视觉层零变化。这是 round-01 [G1-视角3-03]（button-group `data-selected` 无视觉）的同根因新实例——"选中/按压状态以 data 属性落 DOM 但无样式消费方"；且属性名不同（`data-active`/`aria-pressed` vs `data-selected`），round-01 建议的 `data-[selected]:` 修复**不会**覆盖本处，须单独修（按递归指令"修一处必须查全类"上报）。ui Button 基类已有 `aria-expanded:` 先例，补 `aria-pressed:` 与既有词汇对齐。
- **行业惯例**: shadcn/ui Toggle 以 `data-[state=on]:bg-accent data-[state=on]:text-accent-foreground` 表达按压态；Ant Design Button 的 `ghost`/pressed 态有明确视觉。aria-pressed 工具按钮在两大体系中一律有可见差异。
- **用户影响**: 分组工具栏里"当前生效项"与普通按钮外观完全一致，用户无法从界面读出当前激活的是哪一项，只能靠点击后业务结果反推；读屏与视觉用户获得的信息不一致。
- **建议**: ui Button 基类追加 `aria-pressed:bg-primary/10 aria-pressed:text-primary aria-pressed:border-primary/40`（与既有 `aria-expanded:` 同位），或最低限度在 button.tsx 的 `buttonClass` 追加 `active && 'border-primary bg-primary/10 text-primary hover:bg-primary/20'`；同时将 button-group 的 `data-selected` 一并收敛到同一按压态视觉（呼应 [G1-视角3-03] 的合并裁定）。
- **复核状态**: 未复核

---

### [G1-R2-视角5-01] audio/video/image/qrcode 失败态与空态同为 muted 灰字，无 destructive 语义 [G1-视角5-05 同类新实例]

- **文件**: `packages/flux-renderers-content/src/audio.tsx:47-49`；`video.tsx:57-59`；`image.tsx:203-209`；`qrcode.tsx:82-88`
- **证据片段**:
  ```tsx
  // audio.tsx:47-49（video.tsx:57-59 同构）—— errored 与空 src 同一样式
  <figcaption data-slot="audio-fallback" aria-live="polite" className="text-xs text-muted-foreground">
    {errored ? t('flux.common.loadFailed') : t('flux.common.noSource')}
  </figcaption>
  // image.tsx:208 —— 失败分支显示 alt 或「暂无数据」，无 loadFailed、无错误语义
  <span data-slot="image-fallback">{alt || t('flux.common.noData')}</span>
  // qrcode.tsx:85-87 —— 失败/空值同为 bg-muted + muted 灰字
  className="flex items-center justify-center rounded-md bg-muted text-xs text-muted-foreground"
    {failed ? t('flux.common.loadFailed') : t('flux.common.noValue')}
  ```
- **严重程度**: MEDIUM
- **现状**: 四个媒体/内容组件的加载失败态全部渲染为 `text-xs text-muted-foreground` 的灰字，与"未配置源"的空态在视觉上完全不可区分（qrcode 更是同一容器同一分支仅换文案）；image 失败分支甚至不显示 loadFailed，而是显示 alt 文本或"暂无数据"，用户没有任何途径得知"加载失败了"。同包 alert-renderer.tsx:20 的 error 语义是 `bg-destructive/10 text-destructive border-destructive`；round-01 [G1-视角5-05] 已对 dynamic-renderer/markdown 的同根因（错误态无语义色）立项——本条为其在媒体组件族上的新实例，按 dedup §1"同类根因新实例算新发现"上报。
- **行业惯例**: Ant Design Image/Upload 失败态有红色图标+说明；shadcn/ui 生态错误态走 `variant="destructive"`；错误与空态在所有主流组件库中都是两套视觉语言。
- **用户影响**: 媒体 URL 配错（或权限失效）时，用户看到与"没配置"一模一样的灰色占位——无法区分是源坏了还是本来就没有，运营/作者排障时也只能盲猜；错误被彻底静默化。
- **建议**: 四处失败分支（`data-state="error"`）统一加 `text-destructive`（最低限度），文案改用/保留 `t('flux.common.loadFailed')`；image 失败分支不再回退 `alt || noData`，改为 `t('flux.common.loadFailed')` + `text-destructive`；与 [G1-视角5-05] 的 Alert destructive 方案对齐后可一并抽取共享的错误态节点。
- **复核状态**: 未复核

---

### [G1-R2-视角8-01] steps 水平连接线 absolute 定位缺少 relative 包含块，连接线脱离步骤项渲染

- **文件**: `packages/flux-renderers-layout/src/steps-renderer.tsx:230-251`；`packages/flux-renderers-layout/src/styles.css:13-17`
- **证据片段**:
  ```tsx
  // steps-renderer.tsx:230-235 —— li 无 relative
  className={cn(
    'flex',
    orientation === 'vertical'
      ? 'flex-row gap-3 pb-6 last:pb-0'
      : 'flex-1 flex-col items-center text-center',
  )}
  // steps-renderer.tsx:237-251 —— 连接线为 absolute，依赖祖先定位
  <span
    aria-hidden="true"
    data-slot="steps-connector"
    className={cn('absolute top-3 h-px w-full', ...)}
    style={{ transform: 'translateX(-50%)', width: '100%', left: '50%' }}
  ```
  ```css
  /* styles.css:13-17 —— 仅 display:flex，无 position；全仓 grep 无任何
     .nop-steps / steps-item / steps-connector 的 position 规则 */
  .nop-steps[data-orientation='horizontal'] {
    display: flex;
    flex-direction: row;
    align-items: flex-start;
  }
  ```
- **严重程度**: MEDIUM
- **现状**: 水平模式下每一步的连接线是 `absolute top-3 left-1/2 w-full -translate-x-1/2` 的绝对定位元素，但 `li` 与 `.nop-steps` 根均未建立 `position: relative`，包 CSS 与全仓也找不到任何补偿规则——连接线的包含块回退到最近的已定位祖先（无则初始包含块/视口宽块）。结果：连接线不渲染在两颗步骤圆点之间，而是横跨整个定位祖先宽度、落在祖先顶部 12px 处；多步骤时所有连接线互相重叠为一条贯穿线，步骤间的进度线语义（finish 段 primary / wait 段 border 的颜色区分）完全丢失。垂直模式的连接线为 in-flow（`ml-[15px] w-px self-stretch`）不受影响。
- **行业惯例**: Ant Design Steps 的连接线是定位项内的 `::before` 边界线；MUI StepConnector 挂在 `position: relative` 的 Step root 内。绝对定位连接线必须以步骤项自身为包含块是三个参照系统的共同前提。
- **用户影响**: 任何水平 steps 的页面上都会出现一条位置错乱、横贯容器的细线（视觉上像渲染残渣），而步骤圆点之间没有进度线；"哪些步骤已完成"只能靠圆点颜色推断，进度语义大打折扣。steps 是流程展示型组件的显性视觉骨架，缺陷在每次水平使用中必然复现。
- **建议**: 最小修复——水平分支给 `li` 补 `relative`：`'relative flex-1 flex-col items-center text-center'`；或彻底去掉 absolute，改为 in-flow 负 margin 线（`mx-[-50%] mt-3 h-px`）避免再依赖包含块。修复后补一条 `getComputedStyle` 断言（连接线宽度≈步骤间距而非祖先宽度）。
- **复核状态**: 未复核

---

### [G1-R2-视角8-02] diff-view 窄容器/移动端降级不完整：cross-file 固定 240px 侧栏无适配，split 移动端堆叠被内联 grid 打断

- **文件**: `packages/flux-renderers-content/src/diff-view/components/diff-file-list.tsx:86`；`diff-view/diff-view-renderer.tsx:152-159,534`；`diff-view/diff-view.css:583-594`
- **证据片段**:
  ```tsx
  // diff-file-list.tsx:86 —— 内联固定宽 240px，无任何断点处理
  <div className="nop-diff-file-list" ... style={{ width: 240, display: 'flex', ... }}>
  // diff-view-renderer.tsx:152-155 —— split 外层 grid 为内联样式，内联优先级高于媒体查询
  const viewTransitionStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: viewType === 'split' ? '1fr 1fr' : '1fr',
  ```
  ```css
  /* diff-view.css:583-594 —— <640px 仅改内层 display，外层内联 grid 列定义无法被覆盖 */
  @media (max-width: 640px) {
    .nop-diff-view[data-view='split'] .nop-diff-split-view { display: block; }
    .nop-diff-view[data-view='split'] .nop-diff-split-pane { width: 100%; }
  ```
- **严重程度**: MEDIUM
- **现状**: 两处窄容器缺陷：① cross-file 布局（`diff-view-renderer.tsx:534` `flexDirection: 'row'`）固定塞入 240px 文件侧栏，`diff-view.css` 全文（grep 证实）没有任何针对 `.nop-diff-file-list` / `.nop-diff-view-cross-file` 的媒体查询或折叠机制——375px 视口下 diff 内容区仅剩约 135px；② split 视图的 <640px 堆叠规则只改了内层 `.nop-diff-split-view { display: block }`，但外层 `grid-template-columns: '1fr 1fr'` 是**内联样式**（`viewTransitionStyle`），媒体查询无法覆盖，且堆叠后的 `.nop-diff-split-view` 作为 grid item 自动落入第 1 列（无 `grid-column: 1 / -1`）——"堆叠"结果实际是新旧两栏被压进左半格、右半格留白。同包 cards/tabs/grid 均已用 `useIsMobile()` 做运行时分支，diff-view 是该包唯一零视口适配的多栏组件。
- **行业惯例**: GitHub PR diff 在窄容器自动从 split 回退 unified（断点约 1000px）；review 工具（Gerrit/Phabricator 移动端）均隐藏或抽屉化文件树。移动端堆叠布局必须同时调整容器的列定义，仅改子项 display 是无效堆叠。
- **用户影响**: 手机/窄卡片里打开多文件 diff：左侧 240px 侧栏挤占后代码区每行只剩几个字符（未开 wrapLines 时横向截断）；split 视图在 <640px 下"看似堆叠、实为半宽"，新旧两栏挤在左半屏，右半屏空白——多文件代码审查场景在移动端基本不可用。
- **建议**: ① cross-file 模式用 `useIsMobile()`（ui 已导出）：移动端把 DiffFileList 收进 Sheet/下拉选择器，或 `flexDirection: 'column'` 让文件列表折叠为顶部横向滚动条；② split 堆叠修复：去掉内联 `gridTemplateColumns` 改为类（`grid` + `data-view` 选择器），或媒体查询内给 `.nop-diff-split-view` 补 `grid-column: 1 / -1` 使堆叠内容跨满两列；③ three-column 已有 `1fr !important` 生效，可作内部一致性参照。
- **复核状态**: 未复核

---

## 汇总

| 严重程度 | 数量 | 条目                                                       |
| -------- | ---- | ---------------------------------------------------------- |
| HIGH     | 0    | —                                                          |
| MEDIUM   | 6    | 视角2-01、视角3-01、视角3-02、视角5-01、视角8-01、视角8-02 |
| LOW      | 0    | —                                                          |

## 视角覆盖说明（12 视角）

- 视角 1（图标语义）: grep 全量文本字符/图标名——零新发现（diff-header ↑/↓ 已在 round-01）。
- 视角 2（按钮样式）: 发现 视角2-01。
- 视角 3（状态指示）: 发现 视角3-01、视角3-02；steps/tabs/wizard/dropdown-button/cards 的交互态核对通过。
- 视角 4（表单交互）: 本组无表单字段控件；text 复制/展开按钮已由 round-01 覆盖——零新发现。
- 视角 5（Loading/空态）: 发现 视角5-01；steps/timeline/cards/carousel 空态、dynamic-renderer/button Spinner 基线核对通过。
- 视角 6（对话框/弹出层）: image preview/aside Sheet/close 按钮核对通过（dialog/drawer host 在 flux-react，不属本组）——零新发现。
- 视角 7（颜色令牌）: grep 复核——除 round-01 已报 bg-gray-50 与 progress oklch 外零新命中。
- 视角 8（间距/对齐/响应式）: 发现 视角8-01、视角8-02。
- 视角 9（ARIA 语义 UX 面）: steps 指示器 aria-label、timeline data-clickable+outline、cards aria-pressed、qrcode role=img 核对通过——零新发现。
- 视角 10（跨组件一致性）: button active 与 button-group selected 同类归并说明见视角3-02；wizard 按钮序符合 [secondary, primary] 约定——无独立新条目。
- 视角 11（产品完成度）: 各组件空态/主路径核对通过——零新发现。
- 视角 12（视觉原创性）: 本组为原语层组件，无页面级堆叠问题——零发现。

## 转 C2 候选（dedup §2 规则，不计入发现）

无。本轮未撞见已登记 16 项能力缺口的新表象（tabs closable/draggable/addable 与 dialog draggable 的表象已在 round-01 转 C2，未重复申报）。

## 明确核对过且不构成发现的疑点（防复核重复提问）

- `container.tsx`/`flex.tsx` 可点击 div（round-01 已按误报 #6 弃报，本轮复核维持）。
- 可点击 Card（card.tsx 单卡）缺 focus ring —— 根因归并 round-01 [G6-视角3-02]（ui Card 基类），cards-renderer 已自带 ring 类，不重复上报。
- icon.tsx 未知图标名静默回退 Circle —— 根因归并 round-01 [G7-视角1-02]（icon-utils fallback 机制）。
- image/button 锚点的键盘焦点仅 UA 默认 outline —— 沿 [G7-视角3-15] "存在默认指示 → LOW" 先例，低于报告门槛。
- qrcode `#000000/#ffffff`、carousel 字幕 `from-black/60`、timeline 图标 `text-white` —— round-01 已核对为功能性/保护性默认值。
- wizard 提交中无 Spinner —— round-01 [G1-视角10-11] 已报，未重复。

## G2 — form / form-advanced（HIGH 1 / MEDIUM 4 / LOW 3，共 8 条）

### [G2-R2-视角3-01] input-time 的 steppers 形态完全不接入 disabled/readOnly 门禁：禁用字段仍可步进改值且无任何禁用视觉

- **文件**: `packages/flux-renderers-form/src/renderers/input-time-renderer.tsx:142-189`；`packages/flux-renderers-form/src/renderers/date/stepper-button.tsx:11-25`
- **证据片段**:
  ```tsx
  // input-time-renderer.tsx:142-159 — steppers 分支没有任何 interactive/disabled 判定
  if (steppers) {
    // Sundial-style stepper layout: [hour -/+] HH : MM [+/- minute].
    const displayValue = storedValue ? ... : undefined;
    return (
      <div className={cn('nop-input-time', 'flex items-center gap-1', ...)} data-steppers="true">
        <div className="flex flex-col">
          <StepperButton direction="up" label={...} testid={...} onClick={stepHourUp} />
          <StepperButton direction="down" label={...} testid={...} onClick={stepHourDown} />
  ```
  ```tsx
  // stepper-button.tsx:14-25 — 组件本身不接受 disabled prop
  <Button type="button" size="icon-xs" variant="ghost" aria-label={label} ... onClick={onClick}>
  ```
- **严重程度**: HIGH
- **现状**: 非 stepper 形态的 `<Input>` 正确传了 `disabled={presentation.effectiveDisabled}`/`readOnly`（line 203-204），但 `steppers === true` 分支的 4 个 StepperButton（时/分 ±）既不传 `disabled` 也没有 `presentation.interactive` 守卫；`stepField → commitDate → handlers.onChange` 链路无任何拦截。`steppers: true` 的 input-time 在 `disabled` 或 `readOnly` 下：4 个按钮外观正常可点，点击即改写"已锁定"的字段值并写入表单状态。同包 `input-number-renderer.tsx:276` 的 stepper 按钮有 `disabled={!presentation.interactive}`、`commitStep`（:123-126）还有二次守卫——同一表单里数字步进字段会正确禁用、时间步进字段不会。另 StepperButton 为 ui Button 的 size/icon-xs 基类，禁用态视觉本可免费获得，但该分支从未使用。
- **行业惯例**: Ant Design `TimePicker`/`InputNumber` 禁用后全部交互入口（输入、步进、清除）统一阻断并置灰；shadcn/ui 禁用控件由原生 `disabled` + `disabled:opacity-50` 契约保证。任何次要交互通道（步进器/键盘）都不得绕过主控件的禁用态。
- **用户影响**: 只读表单（查看态/无权限态）里的 steppers 时间字段，用户点击 +/- 即可"改掉"本应锁定的值并随表单提交持久化——权限边界在 UI 层被无声击穿；且按钮外观与可用态完全相同，禁用语义对用户零提示。判定说明：与 round-01 [G1-视角3-02]（disabled 锚点仍可导航，HIGH）同类功能缺陷；其配置面（steppers+disabled）较窄，但后果是静默数据变更，维持 HIGH。
- **建议**: 在 steppers 分支为每个 StepperButton 增加 `disabled` 透传（StepperButton 增加可选 `disabled?: boolean` prop 并传给内部 Button）：`<StepperButton ... disabled={!presentation.interactive} />`；同时在 `stepField` 入口加 `if (!presentation.interactive) return;` 二次守卫（对齐 `input-number-renderer.tsx` 的双层模式）；容器补 `data-disabled`/`aria-disabled` 与 `opacity-60` 禁用视觉。
- **复核状态**: 未复核

---

### [G2-R2-视角4-01] select 移动端 bottom sheet 多选选项行沿用单选圆形指示器，与同包 tree-select 移动多选的方块 Checkbox 两套语言

- **文件**: `packages/flux-renderers-form/src/renderers/select-mobile-renderer.tsx:30-84`
- **证据片段**:
  ```tsx
  export function renderMobileOptionRow(
    option: ChoiceOption,
    index: number,
    ctx: {
      multiple: boolean;          // ← 传入后全文未使用
      selected: boolean;
      ...
    },
  ) {
    ...
    <span aria-hidden="true"
      className={cn(
        'flex size-5 shrink-0 items-center justify-center rounded-full border',   // 恒为圆形
        ctx.selected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40',
      )}
    >
      {ctx.selected ? <CheckIcon className="size-3.5" /> : null}
    </span>
  ```
- **严重程度**: MEDIUM
- **现状**: `multiple` 参数被传入 `renderMobileOptionRow` 的 ctx 但从未被读取，选项行恒渲染圆形（radio 语义）指示器。同一表单里：桌面端多选 select 是 `ComboboxChips`（chip 形态，input-choice-renderers.tsx:366-378），tree-select 移动端 sheet 的多选行是方块 `Checkbox`（tree-option-list.tsx:122-131，`props.multiple` 决定渲染 Checkbox），而 select 移动端多选却是圆形单选样式。同一"移动端多选选择器"语义在两个组件里呈现两种控件隐喻。
- **行业惯例**: Ant Design Mobile / Vant 的多选列表一律方块 Checkbox、单选才是圆形 radio；iOS 系统多选虽用圆形勾选，但与同屏他组件（本项目 tree-select 已用方块）不一致时，按审查口径应报跨组件不一致。
- **用户影响**: 手机上打开多选下拉，用户看到的是与"单选"完全相同的圆形列表，无法预先判断可否多选，只能多点几个试出来；从 tree-select 多选（方块）切到 select 多选（圆形）需要重新学习"这里的圆圈可以勾多个"。
- **建议**: 在 `renderMobileOptionRow` 中按 `ctx.multiple` 切换指示器：多选渲染 `rounded-[4px]`（或直接复用 ui `Checkbox` 的视觉规格 `size-5 rounded-*`），单选保留 `rounded-full`；参照 `tree-option-list.tsx:122-131` 的 multiple 分支写法。
- **复核状态**: 未复核

---

### [G2-R2-视角4-02] composite 家族（array-editor / combo / input-table）到达 maxItems 后 Add 按钮静默禁用，无计数无提示——checkbox-group maxSelected 缺陷的同根因兄弟实例

- **文件**: `packages/flux-renderers-form-advanced/src/array-editor.tsx:564-596`；`packages/flux-renderers-form-advanced/src/combo-renderer.tsx:554-560`；`packages/flux-renderers-form-advanced/src/input-table-renderer.tsx:403-416`
- **证据片段**:
  ```tsx
  // array-editor.tsx:569-575 — atMaxItems 只体现为 disabled，无任何说明
  <Button
    ref={addButtonRef}
    type="button"
    variant="outline"
    size="sm"
    disabled={presentation.effectiveDisabled || presentation.readOnly || atMaxItems}
    onClick={() => {
      if (presentation.readOnly || atMaxItems) { return; }
  ```
  ```tsx
  // combo-renderer.tsx:330 / input-table-renderer.tsx:409 — 同款
  const atMaxItems = maxItems !== undefined && itemsArray.length >= maxItems;
  ... disabled={atMaxItems}
  ```
- **严重程度**: MEDIUM
- **现状**: 三个复合编辑器在达到 `maxItems` 后把"添加"按钮置灰，但：① 无 `title`/`disabledTip`/辅助文案说明原因；② 无 `n/max` 计数显示（对照 transfer 两个 pane 的表头都有 `（{options.length}/{totalCount}）` 计数，transfer-renderer.tsx:380-382）；③ 按钮与普通禁用（无权限/只读）视觉完全无法区分。round-01 [G2-视角4-02] 已报 checkbox-group 的 maxSelected/minSelected 静默限制；本条为同根因在 composite 家族的新实例（修一处必须查全类）。
- **行业惯例**: Ant Design Form.List 配合 max 的惯例是展示 `已达上限` 文案或计数；MUI 表单限额场景普遍给出 `n/max` 指示。无理由灰化与"点了没反应"被同等视为状态指示缺陷。
- **用户影响**: 用户录入到上限后想继续添加，Add 按钮无解释地灰掉——不知道是"到上限了"还是"没权限"还是"组件坏了"；因看不到 `3/3` 这类计数，也无法预期还差多少。
- **建议**: 三处 Add 按钮在 `atMaxItems` 时追加 `title={t('flux.form.maxItemsReached', { max: maxItems })}`（新增 i18n 键）；并在按钮文案内联计数 `{t('flux.form.addItem')} ({items.length}/{maxItems})`（仅声明了 maxItems 时），与 transfer 的计数惯例对齐。
- **复核状态**: 未复核

---

### [G2-R2-视角5-01] 单选上传进行中二次选择文件：在飞上传未中止，晚完成的被废弃文件静默覆盖字段值，UI 与提交值不一致

- **文件**: `packages/flux-renderers-form-advanced/src/upload-field.tsx:350-356,267-273`
- **证据片段**:
  ```tsx
  // handleFiles — 单选模式仅清空 items 列表，不 abort 仍在飞的上传
  if (!multiple) {
    selected = selected.slice(0, 1);
    setItems([]);            // A 的 pending 行消失，但 A 的 AbortController 仍在跑
  } else if (maxFiles) { ... }
  ```
  ```tsx
  // performUpload 成功分支 — 单选无条件以本次结果覆盖字段值
  const successItems = multiple ? [...committedItems(), item] : [item];
  setItems((prev) => prev.map((entry) => entry.id === id ? { status: 'done', ... } : entry));
  commitItems(successItems);   // [item] 直接整值写入
  ```
- **严重程度**: MEDIUM
- **现状**: `multiple=false` 时选择文件 A（上传中）→ 用户再次点上传选了 B：A 的 pending 行被 `setItems([])` 移除，但 A 的 AbortController 未被取消（只有组件卸载才批量 abort，:164-170）。若 B 先完成（值为 B，列表显示 B done），随后 A 完成，`commitItems([A])` 把**已被用户废弃的 A 的 URL** 整值写入字段——UI 列表显示的是 B，实际提交值是 A。上传触发按钮在上传中也保持可点（无 loading 禁用），该路径对弱网用户完全可达。
- **行业惯例**: Ant Design Upload 单文件模式在 `beforeUpload` 替换文件时会中止/忽略前一次上传；shadcn 生态上传器以"最后一次选择为准"实现（替换即 abort）。字段值与可见列表一致是上传控件的基本契约。
- **用户影响**: 慢网络下替换文件的表单（如头像/附件）最终提交的是用户以为已放弃的旧文件；界面无任何提示，用户发现问题时数据已错。属静默数据错配，因需"上传中二次选择"这一并发时序触发，判 MEDIUM。
- **建议**: 在 `handleFiles` 的单选分支移除旧条目前，遍历 `abortControllersRef.current` 对仍 pending 的条目 `controller.abort()`（复用 `cancelUpload(id)`）；`performUpload` 已有 `controller.signal.aborted` 检查（:251-254），abort 后即不会 commit。可另在上传 pending 期间对触发按钮加 `disabled={pending.length > 0 && !multiple}` 防误操作。
- **复核状态**: 未复核

---

### [G2-R2-视角6-01] tree-select 选中后弹层无任何关闭路径：桌面 popover 单选不关闭、移动 sheet 无关闭钮也无确认钮（select 移动 sheet 缺陷的同病兄弟）

- **文件**: `packages/flux-renderers-form-advanced/src/tree-controls.tsx:394-416,435-454`
- **证据片段**:
  ```tsx
  // 桌面 popover — 未接 onOpenChange 联动选中，TreeOptionList onChange 也不关闭
  <Popover>
    <PopoverTrigger render={<Button ... /> } />
    <PopoverContent align="start">
      <div className="max-h-[60vh] overflow-y-auto" data-slot="tree-select-popover-options">
        {treeOptionListElement}
      </div>
    </PopoverContent>
  </Popover>
  ...
  // 移动 sheet — showCloseButton={false} 且无"完成"动作，仅能点遮罩退出
  <SheetContent side="bottom" showCloseButton={false} className="nop-safe-bottom max-h-[80vh] gap-0" ...>
    <SheetHeader className="nop-hairline nop-hairline-bottom">
      <SheetTitle className="truncate">{fieldLabel}</SheetTitle>
    </SheetHeader>
  ```
- **严重程度**: MEDIUM
- **现状**: 全文 `setSheetOpen(false)` 只出现在遮罩驱动的 `onOpenChange`；`TreeOptionList.onChange → handlers.onChange` 选中后不关闭任何弹层。桌面端即使单选（treeMode 非 multiple）选完节点，popover 仍驻留，用户必须点外部区域才能收起；移动端 sheet 既无 X（`showCloseButton={false}`）也无"完成/确定"按钮，多选场景选完后与 round-01 [G2-视角6-01]（select 移动 sheet，MEDIUM）完全同病——同一表单包内两个移动选择器同一缺陷。
- **行业惯例**: Ant Design TreeSelect 单选选中即收起、多选提供显式收起动作；shadcn/ui Popover 选择器惯例单选 auto-close。移动 bottom sheet 必须有显式退出动作（同 [G2-视角6-01] 引 Vant/AntD Mobile 先例）。
- **用户影响**: 桌面用户选完节点后弹层挡住后续字段，需额外一次外部点击；移动用户在 sheet 里选完找不到"怎么收"，不确定选择是否已生效，最终试探遮罩。选择结果与弹层状态脱节降低对"已选中"的确认感。
- **建议**: 桌面 popover 将其改为受控 open，并在 `TreeOptionList` 的 onChange 回调里对 `!multiple` 场景关闭 popover（多选保留驻留）；移动 sheet 参照 [G2-视角6-01] 的修复：SheetHeader 右侧加 `<Button size="sm">{t('flux.common.confirm')}</Button>`（onClick `setSheetOpen(false)`），或恢复默认关闭按钮。
- **复核状态**: 未复核

---

### [G2-R2-视角5-02] 上传失败条目永久滞留列表：无移除钮、无重试，且"清空"按钮仅在存在成功项时渲染，失败行无法消失

- **文件**: `packages/flux-renderers-form-advanced/src/upload-field.tsx:532-574,578-589`
- **证据片段**:
  ```tsx
  {items.map((entry) => {
    if (entry.status === 'done') { return null; }
    return (
      <li ... data-item-status={entry.status}>
        <span className="truncate">{entry.name}</span>
        {entry.status === 'pending' ? (
          <> ... <Button ... onClick={() => cancelUpload(entry.id)}><XIcon /></Button> </>
        ) : (
          <span className="ml-auto text-xs text-destructive" data-slot="upload-error">
            {entry.message}            {/* 仅红字，无任何操作 */}
          </span>
        )}
      </li>
  ...
  {existing.length > 0 && interactive ? (   // 清空钮：仅当有成功项
    <Button ... onClick={clearAll}>{t('flux.form.clear')}</Button>
  ) : null}
  ```
- **严重程度**: LOW
- **现状**: `status: 'error'` 的条目渲染后没有取消/移除按钮（cancel 钮只在 pending 分支），也没有重试入口；底部"清空"按钮渲染条件是 `existing.length > 0`（成功项存在），因此"只失败过一次、没有成功文件"的字段里，红色错误行永久滞留且无法移除——除非之后再成功上传一个文件。与 round-01 [G2-视角5-01]（pending 缺 Spinner）/[G2-视角5-02]（静默拒绝）根因不同：本条是失败态自身的交互闭环缺失。
- **行业惯例**: Ant Design Upload 失败条目带删除图标与"重新上传"；shadcn 生态错误行惯例是可 dismiss。错误状态必须是用户可退出 state，而不是终态铭牌。
- **用户影响**: 用户上传失败后，错误行一直挂在字段里无法清掉；修正网络问题重新选择文件前，旧错误行与新上传行混排，视觉噪音累积，且无法针对性"重试这一条"。
- **建议**: 为 error 分支补与 pending 分支同款的 `icon-sm` ghost 移除钮（`onClick={() => setItems(prev => prev.filter(e => e.id !== entry.id))}`，`aria-label={t('flux.form.removeItem', { name: entry.name })}`）；渲染条件放宽为 `items.length > 0` 时也可用清空；可选：错误行加 RotateCwIcon 重试钮（复用 `performUpload` 需保留原 File 引用，成本较高，可不做）。
- **复核状态**: 未复核

---

### [G2-R2-视角8-01] 步进类控件点击目标低于 24px 豁免基线：input-time StepperButton 实际 20×20px、input-number stepper 仅 16px 高

- **文件**: `packages/flux-renderers-form/src/renderers/date/stepper-button.tsx:16-22`；`packages/flux-renderers-form/src/renderers/input-number-renderer.tsx:267-299`
- **证据片段**:
  ```tsx
  // stepper-button.tsx — size="icon-xs"(24px) 被 size-5 覆盖为 20px
  <Button type="button" size="icon-xs" variant="ghost" aria-label={label} ...
    className="size-5 p-0" onClick={onClick}>
  ```
  ```tsx
  // input-number-renderer.tsx:275,290 — 步进钮 h-4(16px) w-6
  className = 'h-4 w-6 rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground';
  ```
- **严重程度**: LOW
- **现状**: dedup 基线误报 #4 的豁免下限是 icon-xs/icon-sm（24px+）；本仓两处步进控件低于该下限：StepperButton（input-time steppers 形态与 date-field-control 时间步进共用）把 `size="icon-xs"` 显式覆盖为 `size-5`（20×20px）；input-number 的上下步进钮各 `h-4`（16px 高、24px 宽），垂直堆叠后两个可点区仅隔 0 间距。input-number 的 `showStepper` 默认开启，即默认形态就携带 16px 高的步进钮。
- **行业惯例**: Ant Design InputNumber 内嵌 stepper 命中区 ≥18-20px 且有 padding 缓冲；Vant Stepper 按钮 28px；业界共识"视觉小、热区大"，16px 裸热区属偏小。
- **用户影响**: 触屏用户调时间/调数量时需要精确命中 16-20px 的小按钮，误触相邻的反向步进钮会直接抵消操作；桌面影响轻微。因输入框键入是替代路径（input-number）/步进是次要形态（input-time），判 LOW。
- **建议**: StepperButton 改用 `className="size-6 p-0"`（24px，恢复 icon-xs 名义尺寸）或外层 `relative h-6 w-6` 包一层扩热区；input-number 步进钮 `h-4 w-6` 改 `h-5 w-7`（20×28px）并在容器加 `gap-0.5`，避免 16px 高的双钮紧贴。
- **复核状态**: 未复核

---

### [G2-R2-视角10-01] 同组两套富文本格式工具栏按钮样式规范不一致：markdown-editor 用 outline/size-8，editor 用 ghost 加描边/h-7

- **文件**: `packages/flux-renderers-form/src/renderers/markdown-editor-renderer.tsx:236-248`；`packages/flux-renderers-form-advanced/src/editor-renderer.tsx:409-434`
- **证据片段**:
  ```tsx
  // markdown-editor-renderer.tsx — outline、32px 方钮
  <Button key={action.id} type="button" variant="outline" size="sm" title={...} aria-label={...}
    data-testid={`md-toolbar-${action.id}`}
    className="size-8 p-0" onClick={() => runToolbarAction(action)}>
  ```
  ```tsx
  // editor-renderer.tsx — ghost + 手动描边、28px 钮、active 用 bg-accent
  <Button key={id} type="button" variant="ghost" size="sm" title={title} aria-label={title}
    aria-pressed={active ? true : undefined} ... data-active={active ? '' : undefined}
    className={cn('h-7 min-w-7 items-center justify-center border border-border px-1.5',
      active && 'bg-accent text-accent-foreground', disabled && 'opacity-40')} ...>
  ```
- **严重程度**: LOW
- **现状**: 两个包各有一套"富文本格式"工具栏（同为 bold/italic/list/link 等语义），按钮几何与 variant 两套：outline + `size-8`（32px）vs ghost+手动 border + `h-7`（28px）。editor 侧因 mark 有持久态做了 `aria-pressed`/active 高亮，markdown 侧是插入式语法无持久态——行为差异合理，但同一语义操作族的按钮视觉规格、尺寸、边框实现均不同（一个靠 variant、一个靠手写 border 类模拟 outline），跨组件一致性缺口。
- **行业惯例**: shadcn/ui 生态富文本工具栏（如 Tiptap 官方示例）统一 ghost icon 钮 + `aria-pressed` 表达 active；同产品内多编辑器共用同一 toolbar 按钮规格（Ant Design 与其 Bang 助手亦统一）。
- **用户影响**: 同一表单里先后使用 markdown 字段与富文本 editor 字段时，格式工具栏的按钮大小（32px vs 28px）、边框样式（variant outline vs 手写 border）肉眼可见地不同，工具栏肌肉记忆（按钮位置随尺寸变化）轻微漂移。属次要路径视觉细节，判 LOW。
- **建议**: 二选一对齐：① markdown-editor 工具栏改 `variant="ghost"` + `h-7 min-w-7 border border-border px-1.5`（与 editor 完全同款）；② 抽一个共享的 `ToolbarToggleButton` 规格（ghost + border + `h-7`）供两处引用。保留 editor 的 `aria-pressed` 差异（语义不同）。
- **复核状态**: 未复核

---

## 去重备忘（同根因合并项，不另立条目；供汇总/修复阶段归并）

1. **错误提示无语义色（与 [G1-视角5-05] 同根因，按递归去重规则合并）**——form 包自身已确立错误样式基线（`form-renderers.css:10-13,67-71` 给 select/radio-group/checkbox-group 的 error 槽 `hsl(var(--destructive))`；`flux-react/default-spacing.css:138-141` 给 field-error 令牌色），但同类槽位未覆盖：`button-group-select-renderer.tsx:125-129`（button-group-select-error）、`tree-controls.tsx:187-190`（input-tree-source-error）、`tree-controls.tsx:455-458`（tree-select-source-error）三个选项源错误 span、以及 `detail-surface.tsx:82-86`（DetailDraftFooter 错误段落，detail-view/detail-field 共用，无任何 CSS 命中其 data-slot）。修复 [G1-视角5-05] 时应同批"查全类"补齐这 4 处。
2. **i18n 硬编码（与 [G2-视角9-02]/[G2-视角9-03] 同根因）**——`input-table-renderer.tsx:361` `aria-label="row actions"` 为字面英文，属已报根因的增量实例，随该条修复一并处理。
3. **transfer pane 搜索 Input 仅有 placeholder 无 aria-label**——低价值（placeholder 普遍即可发现），未达发现门槛，弃报。
4. **input-number 键盘步进经核实已有 `presentation.interactive` 门禁**（`commitStep`，input-number-renderer.tsx:123-126）——为防复核误报登记：该控件键盘通道无 [视角3-01] 类缺陷，缺陷仅在 input-time steppers 分支。

## 汇总

| 严重程度 | 数量 | 条目                                   |
| -------- | ---- | -------------------------------------- |
| HIGH     | 1    | 视角3-01                               |
| MEDIUM   | 4    | 视角4-01、视角4-02、视角5-01、视角6-01 |
| LOW      | 3    | 视角5-02、视角8-01、视角10-01          |

共 **8 条**（HIGH 1 / MEDIUM 4 / LOW 3）。转 C2 候选：无（本轮未撞见 dedup-baseline §2 已登记 16 项缺口的新表象；input-date 移动端无专属形态已知悉为 G3-余，未报）。

## G3 — data / dashboard / pivot（HIGH 0 / MEDIUM 5 / LOW 4，共 9 条）

### [G3-R2-视角3-01] 行点击勾选（toggleOnRowClick）无键盘等价路径，Enter/Space 对该行为完全无效

- **文件**: `packages/flux-renderers-data/src/table-renderer/table-body-row-rendering.tsx:113-114,175-215,230-233`
- **证据片段**:
  ```tsx
  // 鼠标 click 路径有 toggle 分支（:180-186）
  if (toggleOnRowClick && !isClickOnInput(event)) {
    const atMax = isAtMaxSelection === true && !isSelected;
    if (!atMax) { onSelectRow(rowKey, !isSelected); toggled = true; }
  }
  ...
  // 键盘 Enter/Space 路径（:201-215）只处理 onRowClick 与 expandRowByClick，无 toggle 分支
  const handleRowKeyDown = (event: React.KeyboardEvent<HTMLTableRowElement>) => {
    if (!isRowClickable || (event.key !== 'Enter' && event.key !== ' ')) { return; }
    event.preventDefault();
    if (hasRowClickHandler) { void parentProps.events.onRowClick?.(event, { scope: rowScope }); }
    if (expandRowByClick) { onToggleExpand(rowKey); }
  };
  ```
- **严重程度**: MEDIUM
- **现状**: 行的键盘可交互性由 `isRowClickable`（= onRowClick || expandRowByClick || toggleOnRowClick，:114）统一决定：`tabIndex=0`、`data-interactive`、`cursor-pointer`、focus ring（:230-233）。鼠标点击行可触发勾选，但 `handleRowKeyDown` 没有对应分支：①配置了 `toggleOnRowClick` 但没有 onRowClick/expandable 的表格，行获得焦点与可点击视觉后按 Enter/Space 仅被 `preventDefault` 吞掉，毫无反应；②三者并存时 Enter/Space 只触发其中两个行为、漏掉勾选，同一"行激活"手势在指针/键盘两个通道产生不同结果。
- **行业惯例**: WAI-ARIA 与 AG Grid/Ant Design 的行选择惯例是键盘激活与鼠标点击行为对齐（row focus + Enter 等价于 click）；shadcn 生态所有 `role` 交互面均保证 Enter/Space 与 onClick 同效果。
- **用户影响**: 键盘用户 Tab 到"点击行可勾选"的行上按 Enter/Space，界面毫无反馈（勾选状态不动），只能再 Tab 进 checkbox 列逐个操作；对纯 toggleOnRowClick 表格则表现为"焦点在这行但按什么都没用"，用户会认为键盘操作失灵。
- **建议**: 在 `handleRowKeyDown` 补齐与 `handleRowClick` 相同的三通道分支（含 `isAtMaxSelection` guard）：`if (toggleOnRowClick) { const atMax = ...; if (!atMax) onSelectRow(rowKey, !isSelected); }`，并与 mouse 路径同样尊重 `isClickOnInput` 的语义（键盘路径无 target 控件冲突，可直接执行）。
- **复核状态**: 未复核

---

### [G3-R2-视角4-01] rowSelection maxSelectionLength 达上限后全链路静默禁用，无计数、无原因说明

- **文件**: `packages/flux-renderers-data/src/table-renderer/use-table-selection.ts:138-143,259-261`；`packages/flux-renderers-data/src/table-renderer/table-body-row-rendering.tsx:171-173`；`packages/flux-renderers-data/src/table-renderer.tsx:606`
- **证据片段**:
  ````ts
  // use-table-selection.ts:259-261 — 达上限后勾选请求静默 return
  if (checked && maxSelectionLength && baseSet.size >= maxSelectionLength) {
    return;
  }
  ```tsx
  // table-body-row-rendering.tsx:171-173 — 未选中行 checkbox 直接置灰，无 title/hint
  const rowCheckboxDisabled =
    (isRowCheckable ? !isRowCheckable(rowKey) : false) ||
    (isAtMaxSelection === true && !isSelected);
  ```tsx
  // table-renderer.tsx:606 — 表头全选框同样静默禁用
  selectAllDisabled={isAtMaxSelection && !allSelected}
  ````
- **严重程度**: MEDIUM
- **现状**: `maxSelectionLength` 生效后：①未选中行的 checkbox 无提示置灰（无 `title`、无 tooltip、无计数）；②表头全选框被禁用；③`toggleOnRowClick` 点行选中也静默无效（`atMax` 分支直接跳过，:181-185）。表格任何位置都不渲染"已选 n/上限 m"信息，`selectionCount` 只发布到 `$crud` scope 供 host 使用，组件自身零呈现。**根因关系**: 与 round-01 [G2-视角4-02]（checkbox-group maxSelected 静默置灰无反馈）同根因的表格侧新实例，按"修一处必须查全类"报出，复核时可合并。
- **行业惯例**: Ant Design Table 配合 max 场景的惯例是展示 `已选 n/m` 计数或在禁用项上说明原因；AG Grid 无上限时不存在该态，有上限的封装（如企业表格）均带计数提示。
- **用户影响**: 批量操作场景（批量删除/导出）勾满上限后，剩余行突然全部变灰且无解释，用户不知道"是数据问题、权限问题还是选满了"；点行勾选无反应时更像是控件坏了。CRUD 批量路径高频，感知明显。
- **建议**: 最小修复：在 `data-slot="table-row-selection"` 相关容器（或表头 selection 列）渲染 `selectedRowKeys.size`/`maxSelectionLength` 计数（`t('flux.table.selectionCount', { count, max })`，需新增 i18n 键）；同时给 max 截断禁用的 checkbox 传 `title={t('flux.table.maxSelectionReached', { max })}`（复用 disabled 通道，参照 G2-视角4-02 建议同款做法）。
- **复核状态**: 未复核

---

### [G3-R2-视角4-02] dashboard 编辑器 Inspector 全部字段 Label 未与控件关联（无 htmlFor/id/aria-label）

- **文件**: `packages/flux-renderers-dashboard/src/editor/editor-inspector.tsx:45-117,122-129`
- **证据片段**:
  ```tsx
  function InspectorField({ label, children }: { label: string; children: React.ReactNode }) {
    return (
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        {children}
      </div>
    );
  }
  ...
  <InspectorField label="X">
    <NumberInput testId="inspector-x" value={selectedPanel.x} onChange={...} />
  </InspectorField>
  ```
- **严重程度**: MEDIUM
- **现状**: Inspector 的 9 类字段（Id/Type/Title/X/Y/W/H/Source/Props）统一经 `InspectorField` 渲染：`<Label>` 不带 `htmlFor`，内部 `Input`/`NativeSelect`/`Textarea`/`NumberInput` 均无 `id` 也无 `aria-label`（只有面向测试的 `data-testid`）。点击标签不聚焦控件；读屏用户在面板中听到的是一连串无名"可编辑文本/组合框"。单选的 X/Y/W/H 四个数字框之间尤其无法区分。**根因关系**: 与 round-01 [G5-视角4-01]（scada inspector-field Label 无 htmlFor，MEDIUM）同根因同形态，属同型编辑器面板的兄弟实例；round-01 G3 组仅报了该面板的 i18n 问题（[G3-视角9-01]），未覆盖标签关联。
- **行业惯例**: shadcn/ui 表单模式 `<Label htmlFor>` + 控件 `id`；本项目 flux-renderers-form FieldFrame 以 Label+htmlFor/controlId 关联为既定契约；共享前缀视角 4 明列"标签可点击（Label+htmlFor）"。
- **用户影响**: 编辑面板是 dashboard 编辑器高频操作面：读屏用户无法得知每个输入框的用途（"编辑文本""组合框"连读）；鼠标用户点击"标题"标签也不会聚焦输入框，与系统内表单行为不一致。
- **建议**: `InspectorField` 接受/生成稳定 `id`（如 `useId()`），`<Label htmlFor={id}>` + 子控件透传 `id`；`NumberInput` 与各 Input 增加 `id` 透传即可（ui Label/Input 均已支持，无需改 ui 层）。
- **复核状态**: 未复核

---

### [G3-R2-视角4-03] Inspector 数字输入清空即写 0，面板坐标/尺寸瞬间跳零

- **文件**: `packages/flux-renderers-dashboard/src/editor/editor-inspector.tsx:131-155`
- **证据片段**:
  ```tsx
  function NumberInput({ value, onChange, testId }: { value: number; onChange: (value: number) => void; testId: string }) {
    const [draft, setDraft] = useState(String(value));
    ...
      onChange={(event) => {
        setDraft(event.target.value);
        const parsed = Number(event.target.value);
        if (Number.isFinite(parsed)) onChange(parsed);
      }}
      onBlur={() => setDraft(String(effectiveValue))}
  ```
- **严重程度**: LOW
- **现状**: `Number('') === 0` 且 `Number.isFinite(0)` 为真：用户全选删除 X（或 W/H）准备输入新值的瞬间，`onChange(0)` 已写入 editor-core 会话——面板立刻跳到 x=0（或宽度坍缩为 1 格），undo 栈多一条 0 值记录。`onBlur` 的 `setDraft(String(effectiveValue))` 只恢复显示草稿，不能撤销已提交的 0。**根因关系**: 与 round-01 [G5-视角4-03]（scada 属性面板 number 清空即写 0，LOW）同根因新实例；本实例额外造成画布面板可见跳位。
- **行业惯例**: Figma/DevTools 类属性面板允许输入中间态为空，blur 或合法值才提交（同 G5-视角4-03 引用）。
- **用户影响**: "选中面板 → 删掉 X 值 → 输入新坐标"是属性面板常规手势，中途面板跳走干扰定位且污染 undo 历史；可撤销，故 LOW。
- **建议**: `onChange` 改为 `const raw = event.target.value; setDraft(raw); if (raw !== '' && Number.isFinite(Number(raw))) onChange(Number(raw));`；`onBlur` 时若 draft 为空则回填当前值（现有逻辑已做一半）。
- **复核状态**: 未复核

---

### [G3-R2-视角6-01] 列设置下拉中"上移/下移"点击即关闭菜单，重排 N 列需重开 N 次菜单

- **文件**: `packages/flux-renderers-data/src/table-renderer.tsx:443-485`（Base UI 默认值核实: `@base-ui/react@1.3.0 esm/menu/item/MenuItem.js:25` `closeOnClick = true`）
- **证据片段**:
  ```tsx
  <DropdownMenuContent>
    {columnSettingsItems.map(({ key, label, orderedIndex, visible }) => (
      <div key={key} data-slot="table-column-settings-item">
        <DropdownMenuCheckboxItem checked={visible} onCheckedChange={(checked) => toggleColumn(key, checked)}>
          {label}
        </DropdownMenuCheckboxItem>
        <div className="flex gap-1 px-1.5 pb-1" data-slot="table-column-settings-actions">
          <DropdownMenuItem aria-label={`${t('flux.table.moveUp')} ${label}`}
            disabled={orderedIndex === 0} onClick={() => moveColumn(key, 'up')}>
            {t('flux.table.moveUp')}
          </DropdownMenuItem>
          <DropdownMenuItem ... onClick={() => moveColumn(key, 'down')}>{t('flux.table.moveDown')}</DropdownMenuItem>
  ```
- **严重程度**: MEDIUM
- **现状**: 列设置 overlay 形态把"上移/下移"实现为 `DropdownMenuItem`。ui `dropdown-menu.tsx`（:106-127）未传 `closeOnClick={false}`，Base UI `MenuItem` 默认 `closeOnClick = true`——每次点击"上移/下移"菜单立即关闭。要把某列从末尾移到首位，用户需要"开菜单 → 点上移 → 菜单关 → 再开菜单 → 再点上移"循环 N 次，每次重开还要重新滚动/定位目标列。同一菜单里的可见性 checkbox（`MenuCheckboxItem` 默认 `closeOnClick = false`）却保持打开——同一个弹层内两类操作一开一关，行为自相矛盾。同文件的 inline 形态（:488-543）用普通 Button 无此问题，两种形态行为也不一致。
- **行业惯例**: Ant Design 列设置用常驻面板/Popover 承载连续的显示/排序操作；shadcn 数据表列显隐用 Popover+Checkbox。菜单（一次性命令语义）内嵌"可重复执行"的排序动作且逐次关闭是反模式；Base UI 自身的 `closeOnClick={false}` 即为该场景提供的标准出口。
- **用户影响**: 调整多列顺序（把"操作"列移到最左、按业务重排 5+ 列）变成高频开关菜单的机械劳动，且菜单关闭后丢失滚动位置；用户还会因 checkbox 不关、按钮关的不一致而困惑操作是否已生效。
- **建议**: 给两个 `DropdownMenuItem` 传 `closeOnClick={false}`（Base UI 原生支持，与同菜单 CheckboxItem 行为对齐）；或在 `DropdownMenuContent` 上保留默认、仅对 move 两项单独关闭关闭行为。若有条件，中期将 overlay 形态改为 `Popover` 面板承载"显隐 + 排序"连续操作。
- **复核状态**: 未复核

---

### [G3-R2-视角8-01] dashboard 编辑器面板删除按钮 hover-only 且 display:none，触摸设备不可见不可达

- **文件**: `packages/flux-renderers-dashboard/src/editor/editor-canvas.tsx:233-253`
- **证据片段**:
  ```tsx
  {selected && (
    <>
      <div
        data-slot="dashboard-editor-panel-remove"
        className="absolute right-1 top-1 z-10 hidden group-hover:flex"
      >
        <button type="button" aria-label={`Remove ${panel.id}`}
          className="flex size-5 items-center justify-center rounded-full border border-border bg-background text-muted-foreground hover:text-destructive"
          onClick={(event) => { ...core.update((doc) => ({ panels: doc.panels.filter(...) })); }}
  ```
- **严重程度**: LOW
- **现状**: 删除按钮（20px，size-5）仅在面板被选中且 `group-hover` 时显现；外层 `hidden`（display:none）意味着：①触摸设备无 hover——选中面板后删除按钮永不出现，触屏平板无法删除面板；②键盘 Tab 永远到不了该按钮（display:none 移出 tab 序），键盘用户唯一的删除通道是焦点面板后按 Delete 键——该快捷键无任何界面提示。**根因关系**: 与 round-01 [G4-视角8-02]（kanban 卡片删除按钮 hover-only，LOW）同根因新实例；本实例多了 display:none 导致的键盘不可达加重项。
- **行业惯例**: Grafana 面板菜单选中即常显入口；误报 #4 豁免基准为 icon-xs 24px，此处 20px 且 hover-only 双重不符。触屏可用的编辑器（Trello/Figma）对破坏性入口提供常显或长按替代。
- **用户影响**: 平板上使用 dashboard 编辑器的用户选中面板后找不到删除手段；桌面新用户也不知道 Delete 键可删（界面上无提示），只能发现 hover 后浮现的小圆钮。
- **建议**: 外层类改为 `hidden group-hover:flex group-focus-within:flex`，并在 `@media (hover: none)` 下直接 `flex` 常显（对齐 mobile 基线的设备自适应思路）；按钮尺寸提升到 `size-6`（24px）；aria-label 同步 i18n 并改用面板 title（见 [G3-视角9-02] 已报）。
- **复核状态**: 未复核

---

### [G3-R2-视角9-01] pivot-table 画布包装层无 role/aria-label，违反画布表面 a11y 契约（同型渲染器不一致）

- **文件**: `packages/flux-renderers-pivot/src/pivot-renderer.tsx:254-257`（交互注入: `packages/flux-renderers-pivot/src/pivot-events.ts` `attachPivotEvents`）
- **证据片段**:
  ```tsx
  return (
    <div {...commonProps} style={{ height }}>
      <div ref={containerRef} data-slot="pivot-canvas" className="nop-pivot-canvas" />
    </div>
  );
  // commonProps 仅有 data-testid / data-cid / data-slot / className，无 role / aria-label
  ```
- **严重程度**: MEDIUM
- **现状**: VTable 以 canvas 绘制整个透视表并经 `attachPivotEvents` 向实例挂载点击等交互事件——这是一个"第三方引擎画在普通 div 上、可交互"的画布表面，包装层只有 `data-slot="pivot-canvas"`，无 `role`、无 `aria-label`。`docs/architecture/renderer-markers-and-selectors.md`「Canvas / scene-graph interaction surfaces」明确要求此类包装层暴露 `role="application"` + i18n 化 `aria-label`，且"Same-type renderers must apply the contract consistently"。同仓 scada-canvas（`role="application"` + i18n label）是正确基线；**根因关系**: 与 round-01 [G5-视角9-01]（map viewport 缺 role/aria-label，MEDIUM）同契约同根因，pivot 是该契约在 G3 范围内的漏网实例。数据内容层面，同包 chart 已提供 sr-only 数据摘要（`chart-data-equivalent`），pivot 无任何等价物。
- **行业惯例**: 本项目成文契约即为标准（markers 文档 + docs/bugs/78 HCAX-2 沉淀）；AG Grid canvas 模式提供 `aria-role="grid"` 化的可访问结构。
- **用户影响**: 读屏用户进入透视表区域得到一块无名、无角色的普通内容，无法得知此处是可交互数据网格；与 chart（有 role=img + sr-only 摘要）、scada（有 application 语义）行为割裂。
- **建议**: `pivot-renderer.tsx:256` 包装层加 `role="application"` + `aria-label={t('flux.pivot.canvasLabel')}`（en-US/zh-CN 新增键，如 "Interactive pivot table"）；沿 docs/bugs/78 的 `getAttribute` 断言模式补一条 DOM 契约测试。
- **复核状态**: 未复核

---

### [G3-R2-视角10-01] 表格单元格 copyable 复制失败零反馈（成功/失败双通道只剩一个）

- **文件**: `packages/flux-renderers-data/src/table-renderer/table-cell-chrome.tsx:83-105`
- **证据片段**:
  ```tsx
  const onClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    const result = await copyToClipboard(value);
    if (result.success) {
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 1500);
    }
  };
  ...
  <Button ... aria-label={copied ? t('flux.table.copied') : t('flux.table.copy')}>
  ```
- **严重程度**: LOW
- **现状**: `copyToClipboard` 失败（权限拒绝/非安全上下文降级链全部失效）时 `result.success === false` 分支为空：按钮停留"复制"态、无 toast、无图标变化，用户无法区分"已复制"与"复制失败"。**根因关系**: 与 round-01 [G1-视角10-13]（json-view 复制失败静默 vs text 走 `toast.error`，LOW）同根因新实例；表格单元格是复制操作更高频的场景，此处不报则 G1 修复后该类仍漏。
- **行业惯例**: Ant Design message.error / sonner toast.error——剪贴板被拒必须有失败反馈；同产品内同语义操作反馈模式应一致（视角 10 基线）。
- **用户影响**: 用户在受限环境（iframe 无 clipboard 权限、HTTP 站点）点复制，粘贴落空后才察觉失败；与 text 组件的"复制失败会弹错误"经验相矛盾。因 `copyToClipboard` 含 execCommand 降级、失败概率低，评 LOW。
- **建议**: 失败分支补 `toast.error(t('flux.common.copyFailed'))`（`@nop-chaos/ui` 已导出 toast，参照 `flux-renderers-basic/text.tsx:75-78` 同款），成功分支保持现有按钮态切换。
- **复核状态**: 未复核

---

### [G3-R2-视角10-02] 树表懒加载 spinner 为包内唯一手写实现，偏离本包统一的 ui Spinner 基线

- **文件**: `packages/flux-renderers-data/src/table-renderer/table-body-row-rendering.tsx:371-372`
- **证据片段**:
  ```tsx
  {lazyState?.loading ? (
    <span className="size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
  ) : lazyState?.error ? (
    <ChevronRightIcon className="size-3 text-destructive" />
  ```
- **严重程度**: LOW
- **现状**: 树表子节点懒加载期间，展开按钮内的加载指示是手写 CSS 边框圆环。同包其余全部 loading 均用 ui `Spinner`：table-loading-overlay（size-6）、chart（size-4）、quick-edit 单元格（size-4 ×4 处）、行保存条（size-4），pivot 包同样用 Spinner——经 grep 核实这是三个目标包中唯一一处手写 spinner。**根因关系**: 与 round-01 [G4-视角10-01]（scheduling 包三种 loading 实现并存，LOW）同根因（"Loading=Spinner 组件"基线偏离）的 data 包新实例。
- **行业惯例**: 共享前缀视角 5/10 基线：Loading=Spinner 组件；shadcn 生态统一 loader 图标族。
- **用户影响**: 手写圆环与 ui Spinner（Loader2 图形）在 20px 按钮内线宽/旋转节奏肉眼可辨地不同，树表加载动效与其余表格 loading 形态不一致；影响轻微。
- **建议**: 替换为 `<Spinner className="size-3" aria-hidden="true" />`（`@nop-chaos/ui` Spinner，已在本文件邻近代码多次使用），删除手写 span。
- **复核状态**: 未复核

---

## 统计

- **发现计数**: HIGH 0 / MEDIUM 5 / LOW 4，共 **9 条**
  - MEDIUM: [G3-R2-视角3-01] [G3-R2-视角4-01] [G3-R2-视角4-02] [G3-R2-视角6-01] [G3-R2-视角9-01]
  - LOW: [G3-R2-视角4-03] [G3-R2-视角8-01] [G3-R2-视角10-01] [G3-R2-视角10-02]

## 转义与归属说明

- **`[scope-conflict]` 条目**: 无。[G3-R2-视角9-01] 按主要影响归属 UX 可见的画布命名/语义缺失（沿 G5-视角9-01 归属先例），未深入全量 WCAG。
- **与 round-01 同根因的兄弟实例标注**: 视角4-01 ↔ [G2-视角4-02]；视角4-02 ↔ [G5-视角4-01]；视角4-03 ↔ [G5-视角4-03]；视角8-01 ↔ [G4-视角8-02]；视角9-01 ↔ [G5-视角9-01]；视角10-01 ↔ [G1-视角10-13]；视角10-02 ↔ [G4-视角10-01]。均属 dedup-baseline §1"同类根因新实例"与递归扩展盲区 1（修一处必须查全类）的申报范围，合并与否由复核阶段裁定。
- **误报自查（dedup §3）**: 行级 ghost 删除/icon-sm 图标按钮（未报）、`ml-auto` 对齐（未报）、列设置/筛选的 DropdownMenuCheckboxItem 默认不关菜单为 Base UI 标准行为（未报）、pivot `FALLBACK_THEME_TOKENS` 为 token 解析失败的兜底且存在令牌化主路径（未报）、stat-tile 内联 sparkline `aria-hidden` 与 [G3-视角9-04] 同根因（未重复报）。

## 转 C2 候选（dedup §2 规则，不计入发现）

1. **G-B2（键盘导航框架）相邻**: dashboard 编辑器面板缺键盘移动/缩放路径（画布快捷键仅 Delete/undo/redo/duplicate；表格列宽手柄已有 ArrowLeft/Right 先例可参照），属"键盘重排"能力范畴，不作为一致性发现。
2. **G-I（暗色回归）顺带观察**: `pivot-option.ts` `resolveDesignTokens` 仅监听 `documentElement` 的 `class` 属性变化（`.dark` 切换可跟随），宿主经 CSS 变量覆盖主题（非 class）时 pivot 主题不重解析——属运行时主题切换能力范畴（G-I 已登记），本轮仅记录。

## 本轮核对过且不构成发现的疑点（防复核重复提问）

- 列筛选 dropdown 的多选 checkbox 不关菜单：Base UI `MenuCheckboxItem` 默认 `closeOnClick=false`，行为正确（与视角6-01 的 MenuItem 形成对照）。
- `table-pagination-bar` / `crud-renderer-toolbar` / `crud-list-pagination` 的禁用分页按钮均有 `pointer-events-none opacity-50`（round-01 视角3-03 仅独立 pagination renderer 缺失，无新实例）。
- responsive expand 模式（responsive.ts / table-expanded-row.tsx）：隐藏列在展开区带标签+值渲染、`nop-safe-bottom`/`nop-hairline` 已用，无发现。
- quick-edit dialog footer 顺序为 [关闭(outline), 保存(default)]，符合项目约定（round-01 视角2-02 引用的正确基线即此处）。
- CRUD filterToggle 折叠条：`activeFilterCount` 有文案反馈、chevron 有 `aria-expanded` + 旋转态，无发现。
- CrudListPagination 在空数据时仍显示"第 1 / 1 页"而表格分页栏空数据时隐藏——属 round-01 [G3-视角10-01]（三种分页实现并存）同根因表象，未重复报。

## 覆盖记录

- **flux-renderers-data**（87 非 test 文件）: 本轮精读 21 个 UI 承载文件（table-renderer.tsx、table-body-row-rendering / table-body-rows / table-header-row / table-quick-edit-cell / table-cell-chrome / table-cell-popover / table-summary-row / table-loading-overlay / table-pagination-bar / table-expanded-row / use-row-quick-edit-draft / use-table-selection / use-row-drag-sort / fixed-columns / responsive / use-auto-fill-height / crud-renderer / crud-renderer-toolbar / crud-list-pagination / crud-infinite-scroll-area / list-renderer / tree-renderer / tree-search / chart-renderer / statistics / stat-tile / sparkline / data-source / pagination-renderer / use-infinite-scroll / use-crud-filter-toggle），其余纯逻辑文件（_-state / _-load / _-ownership / _-delegate / _-schema-builders / table-data / combine-cells / column-_ / use-table-\* / pivot 之外 hooks）经 grep 定向复查（spinner/focus-visible/tabIndex/hardcode 色/aria/empty 分支）无新 UI 表面。
- **flux-renderers-dashboard**（13 非 test 文件）: 8 个渲染/UI 文件全读（dashboard-renderer / dashboard-editor-renderer / editor-canvas / editor-inspector / editor-palette + styles.css），其余 5 个纯逻辑文件 grep 复核。
- **flux-renderers-pivot**（7 非 test 文件）: pivot-renderer.tsx / pivot-option.ts / styles.css 全读，schemas/events/definitions grep 复核。
- **依赖源码核实**: `@base-ui/react@1.3.0`（MenuItem `closeOnClick` 默认 true / MenuCheckboxItem 默认 false），用于 [G3-R2-视角6-01] 结论支撑。

## G4 — mobile / scheduling（HIGH 0 / MEDIUM 7 / LOW 3，共 10 条）

### [G4-R2-视角1-01] 里程碑连线的两个 link handle 因缺少 `group` 祖先类永久不可见（与 R1 视角8-01 根因不同）

- **文件**: `packages/flux-renderers-scheduling/src/gantt/gantt-bars.tsx:120-157`（对照任务条分支 `:172-208`）
- **证据片段**:
  ```tsx
  // 里程碑分支（:127）根元素 className 无 `group`：
  className="absolute cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400"
  ...
  // 但内部 handle（:151/:156）依赖 group-hover：
  <div
    data-slot="gantt-bar-link-handle"
    data-handle-side="start"
    className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 w-2 h-2 rounded-full bg-white border border-blue-400 opacity-0 group-hover:opacity-100 cursor-crosshair"
  />
  // 任务条分支（:173）有 `group`，handle 可随 hover 出现
  'absolute rounded-sm group cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400',
  ```
- **严重程度**: LOW
- **现状**: 里程碑条根元素未携带 Tailwind `group` 类，其内部两个连线手柄的 `group-hover:opacity-100` 永远不会命中任何祖先，`opacity-0` 恒成立——悬停也不出现（handle 因未设 `pointer-events-none` 仍可盲点命中，但视觉上永不存在）。任务条分支有 `group`，同文件内两种 bar 类型行为分裂。R1 [G4-视角8-01] 报的是"handle 8px 且仅 hover 显现"的尺寸/模式问题；本条根因是里程碑分支**类名缺失导致可见性逻辑整体失效**，属实现 bug 而非设计取舍。
- **行业惯例**: dhtmlxGantt / MS Project 的里程碑依赖创建点在 hover 时与任务条同等可见；同一组件内同型 affordance 不应因条目类型而失效。
- **用户影响**: 用户把鼠标悬停在里程碑上永远不会出现连线入口，无法得知里程碑可以建立依赖（任务条却可以）——同看板里两种条目的能力看起来不一致；知道要连线的用户也只能对着里程碑左右侧空白盲点。
- **建议**: 里程碑分支根元素 className 补 `group`（`"absolute group cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400"`），与任务条分支对齐；补一条 DOM 断言（milestone hover 后 handle 计算样式 opacity → 1）。
- **复核状态**: 未复核

---

### [G4-R2-视角3-01] calendar 拖拽悬停目标零视觉反馈：`data-drop-target`/`drag-ok`/`drag-conflict` 在 calendar.css 无任何对应规则

- **文件**: `packages/flux-renderers-scheduling/src/calendar/calendar.tsx:362-386`（对照 `packages/flux-renderers-scheduling/src/calendar/calendar.css` 全文 404 行无命中、`packages/flux-renderers-scheduling/src/kanban/kanban.css:144-146` 有实现）
- **证据片段**:
  ```tsx
  // calendar.tsx:378-385 — 拖拽时给目标单元格写类与属性
  const el = container.querySelector(
    `[data-slot="calendar-cell"][data-date="${targetDate}"][data-resource="${targetResource}"]`,
  );
  if (el) {
    el.setAttribute('data-drop-target', 'true');
    const isValid =
      targetDate !== sourceEvent?.start.split('T')[0] || targetResource !== sourceEvent?.resourceId;
    el.setAttribute('data-drop-valid', String(isValid));
    el.classList.add(isValid ? 'drag-ok' : 'drag-conflict');
    el.classList.remove(isValid ? 'drag-conflict' : 'drag-ok');
  }
  ```
  ```css
  /* kanban.css:144-146 — 同包 kanban 为同名属性提供了样式，calendar.css 没有 */
  .nop-kanban [data-drop-target='true'] {
    box-shadow: 0 0 0 2px var(--color-primary);
  }
  ```
- **严重程度**: MEDIUM
- **现状**: 全仓 grep 证实 `drag-ok`/`drag-conflict`/`data-drop-target`/`data-drop-valid` 在 calendar.css（及任何生产 CSS）中零规则命中——日历拖拽期间除跟随鼠标的浮动 ghost 外，目标单元格没有任何高亮，合法目标与冲突目标（`drag-conflict`）视觉完全相同。同包 kanban 的同名属性有完整样式，证明该机制在 calendar 侧只写了状态、没接视觉。
- **行业惯例**: FullCalendar 拖拽时目标日格有高亮描边；Ant Design Calendar/AG Grid 拖拽目标位均有 drop indicator，非法目标以红色区分。拖放操作的"当前会落在哪里 + 是否合法"必须有即时视觉反馈。
- **用户影响**: 拖动日程时用户看不到任何落点指示，只能松手后靠确认对话框文案才知道拖到了哪格；排班冲突（拖到已有同时段日程的资源）在拖拽过程中毫无警示，确认弹窗是唯一的失败发现点，拖放变成"盲投+事后对账"。
- **建议**: 在 `calendar.css` 补齐与 kanban 同构的规则：`.nop-calendar [data-slot='calendar-cell'][data-drop-target='true'] { box-shadow: inset 0 0 0 2px var(--color-primary); }`，`.nop-calendar [data-slot='calendar-cell'].drag-conflict { box-shadow: inset 0 0 0 2px var(--color-destructive); background-color: color-mix(in srgb, var(--color-destructive) 8%, transparent); }`（drag-ok 可复用 primary 描边）。
- **复核状态**: 未复核

---

### [G4-R2-视角3-02] gantt 时间线任务条的选中态无任何视觉指示（网格行有高亮、条形无）

- **文件**: `packages/flux-renderers-scheduling/src/gantt/gantt-bars.tsx:162-186`；对照 `packages/flux-renderers-scheduling/src/gantt/gantt-grid.tsx:128-133`、`packages/flux-renderers-scheduling/src/gantt/gantt.tsx:285-288`、`gantt/gantt.css` 全文无 `[aria-selected]`/`[data-selected]` 规则
- **证据片段**:
  ```tsx
  // gantt-bars.tsx:172-176 — bar 根类串不含任何 selected/aria-selected 分支
  className={cn(
    'absolute rounded-sm group cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400',
    isProject ? 'nop-gantt-bar-project' : 'nop-gantt-bar-task',
    taskBarClassName,
  )}
  // gantt-grid.tsx:130-133 — 左侧网格行有选中高亮
  className={cn(
    'border-b border-gray-100 hover:bg-blue-50/50',
    selectedTaskId === task.id && 'bg-blue-50',
  )}
  ```
- **严重程度**: MEDIUM
- **现状**: 选中任务时左侧网格行渲染 `bg-blue-50`，但时间线上的 bar（`store.selectedTaskId` 的另一半映射手）没有任何选中样式，gantt-bars.tsx 根本不读 selectedTaskId，gantt.css 也无 `[aria-selected]` 规则。键盘路径上对 bar 按 Space（`handleBarKeyAction(taskId,'select')`）后，时间线内零反馈；网格与时间线是两个独立滚动容器，用户聚焦在 bar 上时左侧行高亮很可能根本不在视口内。
- **行业惯例**: MS Project / dhtmlxGantt 选中任务时网格行与时间线条形同步高亮（描边/加深）；shadcn 生态选中态要求 `data-selected` 有视觉分支（G1-视角3-03 button-group 同类问题已判为 HIGH 的模式基线）。
- **用户影响**: 用户在时间线里点击或对 bar 按 Space"选中"后看不到任何变化，以为点击无效而反复点击；密集多任务场景下无法确认当前操作对象是哪条任务，后续 Delete/Enter（删除/编辑）作用目标不明。
- **建议**: bar 根元素透传选中态并加样式：`aria-selected={selected || undefined}` + `selected && 'ring-2 ring-offset-1 ring-[color:var(--color-primary)] brightness-110'`（或 gantt.css 增加 `.nop-gantt [data-slot='gantt-bar'][aria-selected='true']` 规则），与网格行 `bg-blue-50` 的语义对齐。
- **复核状态**: 未复核

---

### [G4-R2-视角3-03] scheduling 自定义 roving-focus 元素零设计系统 focus 指示，且与 gantt 的 focus ring 双轨并存

- **文件**: `packages/flux-renderers-scheduling/src/kanban/kanban-card.tsx:99-106`；`packages/flux-renderers-scheduling/src/calendar/components/calendar-month-view.tsx:236-242`；`packages/flux-renderers-scheduling/src/calendar/components/calendar-event-block.tsx:107-112`（对照同包 `gantt/gantt-bars.tsx:127,173` 有 `focus:ring-2`）
- **证据片段**:
  ```tsx
  // kanban-card.tsx:103,106 — roving tabbable 卡片根，无 focus-visible 类
  : cn('nop-kanban-card group relative bg-white rounded-lg border border-gray-200 p-3', className);
  return (
    <div ref={cardRef} {...sharedAttributes} className={cardClass}>
  // calendar-month-view.tsx:236-238 — 方向键导航的 gridcell，无 focus 类
  className={cn(
    'flex-1 min-w-0 relative border-r last:border-r-0',
    today && 'bg-blue-50 ring-2 ring-inset ring-blue-400 font-semibold',
  ```
- **严重程度**: LOW
- **现状**: kanban 卡片（方向键 roving 导航）、calendar 月视图单元格（roving + 方向键）、calendar 事件块（role=button tabIndex=0）都是一等键盘导航目标，但 TSX 无任何 `focus-visible:*` 类，且全部包 CSS（kanban/gantt/calendar/barcode/styles 共 5 个文件）grep `focus` 零命中——键盘焦点指示只剩 UA 默认描边。同包 gantt 的 bars/separator 却写了 `focus:ring-2 focus:ring-blue-400`，包内双轨。与 [G7-视角3-15]（sundial 行，LOW）同类根因的跨包新实例。
- **行业惯例**: shadcn/ui 全部可聚焦元素统一 `focus-visible:ring-3 focus-visible:ring-ring/50`；WAI-ARIA APG 要求 roving tabindex 网格有清晰焦点指示（AG Grid 单元格导航焦点环）。
- **用户影响**: 键盘用户在看板上方向键巡卡、在日历上方向键巡格时，焦点位置只剩浏览器细线描边，在深浅交错背景上时隐时现，与同屏 gantt 的蓝色 ring 观感不一致；影响为键盘巡航体验，鼠标路径不受影响。
- **建议**: 三处根元素追加 `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1`（calendar cell 可用 `focus-visible:ring-inset`），或下沉为包 CSS 的 `[data-slot='kanban-card']:focus-visible` / `[data-slot='calendar-cell']:focus-visible` 规则，与 gantt 既有 ring 统一为同一令牌（`ring-ring` 替代硬编码 blue）。
- **复核状态**: 未复核

---

### [G4-R2-视角4-01] 扫码校验失败的错误提示渲染在全屏扫描浮层之下，扫描过程中用户零反馈

- **文件**: `packages/flux-renderers-scheduling/src/barcode-input/barcode-input.tsx:173-187,326-328`；`packages/flux-renderers-scheduling/src/barcode-input/barcode-scanner-overlay.tsx:245-249`
- **证据片段**:
  ```tsx
  // barcode-input.tsx:176-180 — 校验失败仅 setState，浮层保持打开
  const error = validateScanResult(val);
  if (error) {
    setValidationError(error);
    return;
  }
  ...
  // barcode-input.tsx:326-327 — 错误渲染在页面流内（浮层之下）
  {displayError && (
    <div id={errorId} data-slot="barcode-validation-error" className="text-xs text-destructive mt-1">{displayError}</div>
  )}
  // barcode-scanner-overlay.tsx:245-249 — 全屏 Portal 浮层压在其上
  className={cn(
    'fixed inset-0 z-50 flex flex-col',
    'bg-black/80 backdrop-blur-sm',
  ```
- **严重程度**: MEDIUM
- **现状**: 非批量单次/连续模式下，扫到不满足 required/minLength/maxLength/pattern 的条码时：`handleScanResult` 只写 `validationError` 后 return，扫描浮层不关闭、浮层内也不显示任何信息；错误文案渲染在被 `fixed inset-0 z-50` Portal 浮层完全遮住的页面流里。叠加非批量模式的防重触窗口（`dedupe: !batchMode`），用户立刻重扫同一码也不会再触发 `onScan`——在浮层里反复扫码、毫无反应，关闭浮层后才看得见红字。
- **行业惯例**: 移动扫码组件（Vant Scan 区域实践、Zebra/条码枪表单场景）对被拒条码在扫描界面内即时给出视觉+蜂鸣/振动反馈；错误展示不允许被进行中的采集界面遮蔽（Ant Design Form 校验错误与输入控件同层可见）。
- **用户影响**: 扫码入库/核销场景中，用户扫了不符合规则的码后摄像头画面毫无变化，会认为是"没扫上"而反复对准重扫（且因 dedupe 不再派发），最终只能关闭浮层才发现红色错误——主路径上的采集-校验闭环断裂。
- **建议**: 校验失败时在浮层内呈现结果：给 `BarcodeScannerOverlay` 增加 `scanRejectedMessage` 透传（复用浮层内 `data-slot="barcode-scanner-status-text"` 的位置以 destructive 色展示），或校验失败分支直接调用浮层内现成的错误通道（`onScanError` 已有浮层内 error 展示位）；连续模式下同时清除该条码的 dedupe 记录以允许重扫。
- **复核状态**: 未复核

---

### [G4-R2-视角5-01] pull-refresh 刷新失败静默回弹：无错误文案、无重试，与同包 infinite-scroll 的错误态双标

- **文件**: `packages/flux-renderers-mobile/src/pull-refresh.tsx:146-170`（对照同包 `infinite-scroll.tsx:253-267`）
- **证据片段**:
  ```tsx
  void Promise.resolve()
    .then(() => props.events.onRefresh?.(refreshPayload, { ... }))
    .then(() => {
      if (!isMountedRef.current) return;
      statusRef.current = 'success';
      setStatus('success');
      ...
    })
    .catch(() => {
      if (!isMountedRef.current) return;
      statusRef.current = 'normal';   // 失败 → 静默回 normal，无任何用户可见反馈
      setStatus('normal');
    });
  ```
- **严重程度**: MEDIUM
- **现状**: `onRefresh` 动作链 reject（典型：弱网下拉刷新的 ajax 失败）时，指示器从"加载中..."直接无声弹回静止态——没有失败文案、没有 toast、没有重试入口，renderer 也未暴露任何失败事件/状态位供宿主呈现。对照同包 infinite-scroll：`error` 态渲染错误文案 + 重试 Button；对照 Vant PullRefresh：提供 `error` prop，失败后指示器显示"刷新失败，请重试"并支持点击重试。
- **行业惯例**: Vant PullRefresh `error` 态 + 点击重试；antd-mobile PullToRefresh 惯例为失败时 toast。共享前缀视角 5：错误边缘态必须有有意义反馈；同项目内同语义操作（移动端下拉刷新 vs 上拉加载）反馈模式应一致。
- **用户影响**: 弱网下拉刷新失败后，界面看起来像"什么都没发生"，用户无法区分"刷新失败"与"已刷新但无新数据"，可能带着过期数据继续操作；同页面 infinite-scroll 有失败重试而 pull-refresh 没有，用户在上拉/下拉两个方向遇到的网络故障得到完全不同的对待。
- **建议**: 仿照 infinite-scroll 增加 error 终态：`.catch` 分支置 `statusRef.current = 'error'` 并渲染 `t('flux.mobile.pullRefresh.error')`（新增键，如"刷新失败，请重试"）于指示器，点击指示器重新触发 `onRefresh`；schema 增加 `errorText` 与可选 `onRefreshError` 事件，保持与 `InfiniteScrollSchema.errorText` 命名对齐。
- **复核状态**: 未复核

---

### [G4-R2-视角5-02] calendar PNG 导出的 `exportError` 状态已备但从未渲染，导出全程亦无 busy 指示

- **文件**: `packages/flux-renderers-scheduling/src/calendar/hooks/use-calendar-export.ts:12-15,67-78`；`packages/flux-renderers-scheduling/src/calendar/calendar.tsx:83,226-236`
- **证据片段**:
  ```ts
  // use-calendar-export.ts:67-75 — 失败写入 exportError 后 throw
  } catch (err) {
    if ((err as DOMException)?.name === 'AbortError') return;
    const msg = err instanceof Error ? err.message : String(err) || 'PNG export failed';
    setExportError(msg);
    throw err;
  }
  // calendar.tsx:229-231 — 注释声称"错误也会经 exportError 在 UI 呈现"
  // (errors are also presented in-UI via
  // exportError).
  // 全仓 grep：exportError / clearExportError 无任何渲染点（仅 hook 返回值与该注释）
  ```
- **严重程度**: MEDIUM
- **现状**: hook 维护 `exportError`/`clearExportError` 并在失败时写入，calendar.tsx 解构了 `calendarExport` 但从未读取这两个字段，也没有任何容器渲染它们——注释所述"in-UI 呈现"不存在。同时导出期间（html2canvas 对大日历耗时可达数秒，`exportingRef` 忙闸在组件侧无任何对应 UI）没有 Spinner/禁用/进度提示。R1 [G3-视角5-07]（dashboard "…"占位）与 [G1-视角5-05]（加载失败纯文本）确认了本仓"异步操作必须有可见状态"的基线。
- **行业惯例**: 前端"导出图片/PDF"长任务（html2canvas、jsPDF 类）标配 busy 指示 + 失败 toast/内联错误（Ant Design `message.loading`→`error` 模式）；声明了错误状态却无消费方属明显完成度缺口。
- **用户影响**: 宿主经 `component:exportPNG` reaction/handle 接出"导出图片"按钮的场景中，用户点击后数秒无任何反馈，失败时界面毫无动静——既不知道在导出，也不知道失败了，会反复点击。
- **建议**: calendar.tsx 渲染导出状态：导出中在 `nop-calendar` 角落叠加 `<Spinner className="size-4" />`（或 header 区禁用导出入口），`exportError` 非空时渲染 `<div role="alert" className="text-xs text-destructive px-4 py-1">{exportError}</div>` 并在下次导出/手动关闭时调 `clearExportError()`。
- **复核状态**: 未复核

---

### [G4-R2-视角8-01] gantt 任务条边缘 6px 拖拽缩放热区无任何可见 affordance 与光标提示

- **文件**: `packages/flux-renderers-scheduling/src/gantt/gantt-bars.tsx:62-70,172-176`
- **证据片段**:
  ```tsx
  // gantt-bars.tsx:63-69 — pointerdown 时按 6px 边缘带判定 move/resize
  const barRect = barEl.getBoundingClientRect();
  const x = e.clientX - barRect.left;
  const edgeThreshold = 6;
  let mode: 'move' | 'resize-start' | 'resize-end';
  if (x < edgeThreshold) mode = 'resize-start';
  else if (x > barRect.width - edgeThreshold) mode = 'resize-end';
  else mode = 'move';
  // :172-173 — 整条 bar 统一 cursor-pointer，边缘无 ew-resize 光标、无手柄图形
  'absolute rounded-sm group cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400',
  ```
- **严重程度**: LOW
- **现状**: 拖动 vs 缩放的判定完全隐藏在按下后的 6px 边缘带里：bar 两端没有渲染任何缩放手柄图形，hover 时也不切换 `cursor-ew-resize`（全程 `cursor-pointer`）。12px 宽的里程碑一半区域是缩放带。R1 [G4-视角8-01] 报的是连线手柄的尺寸/hover-only 问题；本条是同组件内另一交互（bar 自身缩放）的 affordance 缺失，此前未覆盖。
- **行业惯例**: dhtmlxGantt / MS Project / Google Charts gantt 的任务条两端在 hover 时显示 `ew-resize` 光标（通常还有竖条手柄高亮）；"看不见的拖拽分区"被普遍视为可发现性缺陷。
- **用户影响**: 用户无法得知任务条可以拖边改期，绝大多数人只会整条拖动或双击进编辑器改日期；误入 6px 边缘带时出现"想拖动却变成缩放"的意外结果，且无从预判。
- **建议**: 为 bar 增加分区光标与边缘提示：在 bar 内渲染两个 `w-1.5 absolute inset-y-0 left-0/right-0 cursor-ew-resize hover:bg-white/30 rounded` 的边缘指示层（仅 hover 显现，对齐既有 `group-hover` 用法），bar 根移除全局 `cursor-pointer` 改由分支控制（中部 `cursor-grab`、边缘 `cursor-ew-resize`）。
- **复核状态**: 未复核

---

### [G4-R2-视角9-01] notice-bar 绑定 onClick 时 `role="button"` 容器内嵌真实关闭 Button（kanban 同病兄弟实例）

- **文件**: `packages/flux-renderers-mobile/src/notice-bar.tsx:235-241,284-301`
- **证据片段**:
  ```tsx
  // :235-241 — onClick 存在时整条 bar 升格为 role="button" + tabIndex=0
  const interactiveProps = hasClick
    ? { role: 'button' as const, tabIndex: 0 as const, onClick: handleClick, onKeyDown: handleKeyDown }
    : { role: 'status' as const };
  return (
    <div {...interactiveProps} ...>
      ...
      // :284-301 — 内部渲染真实 <button>（ui Button 关闭钮）
      {closable ? (
        <Button type="button" variant="ghost" size="icon-sm" data-slot="notice-bar-close" ... >
  ```
- **严重程度**: MEDIUM
- **现状**: `closable + onClick` 同时配置时，公告条根元素是 `role="button"`，其内又渲染真实 `<button>`（关闭），形成 interactive 嵌套——读屏会播报"按钮，按钮"，多数 AT 只暴露外层语义，内层关闭钮在漫游中可能不可达；Enter/Space 在焦点位于根时触发 onClick 而非关闭，语义进一步混淆。R1 [G4-视角9-01] 已判定 kanban 卡片的同类嵌套为 MEDIUM，本条是其跨包兄弟实例（mobile 包此前未覆盖）。
- **行业惯例**: ARIA in HTML 禁止 `role="button"` 后代包含 button/link；Vant NoticeBar 的可点击公告条根节点不带 button 角色、关闭与点击动作各自独立成控件；shadcn 复合组件不在容器上叠 button 语义。
- **用户影响**: 读屏用户在可点击公告条上听到嵌套按钮播报，无法可靠定位"关闭"动作；键盘 Tab 顺序中出现"父可激活+子可激活"的双重目标，误按 Enter 触发跳转而非关闭。
- **建议**: 拆层：容器改回 `role="status"`（或无角色），将标题文本区包一层 `<span role="button" tabIndex={0} onClick onKeyDown aria-label={...}>` 承担跳转，关闭 Button 保持独立兄弟节点；或保持容器 button 语义但把关闭钮移出容器外（绝对定位）。
- **复核状态**: 未复核

---

### [G4-R2-视角10-01] calendar 键盘拖拽会话：幽灵卡固定渲染在视口左上角 (0,0)，Enter 确认还会把已移动的事件派发回原日期

- **文件**: `packages/flux-renderers-scheduling/src/calendar/hooks/use-calendar-drag.ts:192-210,222-224`；`packages/flux-renderers-scheduling/src/calendar/calendar.tsx:294-358,506-518`
- **证据片段**:
  ```ts
  // use-calendar-drag.ts:200-209 — 键盘拖拽起点坐标写死 0
  setDragState({
    active: true, sourceEvent: event,
    startX: 0, startY: 0, currentX: 0, currentY: 0,
    targetDate: event.start.split('T')[0] ?? event.start, ...
  });
  // calendar.tsx:506-517 — active 即渲染 fixed ghost，键盘会话中恒在 (0,0)
  {dragSwap.dragState.active && (
    <div className="nop-calendar-drag-ghost"
      style={{ position: 'fixed', left: dragSwap.dragState.currentX, top: dragSwap.dragState.currentY, transform: 'translate(-50%, -50%)' }}>
  // use-calendar-drag.ts:86-99 — Enter → confirmDrop 使用 pendingTargetRef（= 起始时的原日期）再派发一次
  ```
- **严重程度**: MEDIUM
- **现状**: 键盘拖拽（事件上按 Space 抓起 → 方向键移动 → Enter 放下）存在双重缺陷：① `dragState.active` 为真即渲染跟随 `currentX/currentY` 的浮动 ghost，而键盘会话中二者恒为 0——一个蓝色 ghost 卡片固定半悬在视口左上角，全程不动；② 方向键每按一次经 `handleKeyboardMoveEvent` 真实派发 `onEventChange`（宿主即时移动事件），但 `pendingTargetRef` 不更新，Enter 的 `confirmDrop` 会以**起始原日期/原资源**再派发一次 `onEventChange`——宿主按 payload 落库时，整段键盘拖拽的净效果是"改回去"。对照同包 kanban 键盘拖拽（`use-kanban-board-effects.ts:85-122`）：有 `data-keyboard-dragging` 高亮 outline（kanban.css:182）、live region 逐步播报、无回发问题。
- **行业惯例**: 键盘拖拽会话必须有可见"抓起"指示与当前落点（kanban 已是本包内部基准）；确认动作不得撤销用户已确认的中间步骤（Notion/Asana 键盘移动即时提交、Esc 才回滚）。
- **用户影响**: 键盘用户按 Space 后屏幕左上角突然出现一块幽灵色块（看起来像渲染故障），移动过程无落点反馈，按 Enter 后事件又弹回原日期——整条键盘移动日历的路径视觉与结果双重失效（触屏/鼠标路径不受影响，故未升 HIGH）。
- **建议**: ① 键盘会话不渲染指针 ghost：ghost 条件加 `&& dragState.currentX !== 0`，或为键盘会话改用 `data-keyboard-dragging`（复用 kanban 的 outline 方案）标记源事件块；② `moveKeyboardDrag` 同步更新 `pendingTargetRef` 与 `dragState.targetDate/targetResource`（使 Enter 派发落点 = 最后位置、drop-target 高亮跟随），或键盘路径取消 Enter 重复派发（方向键已即时提交，Enter 仅退出会话）。
- **复核状态**: 未复核

---

## 统计

| 严重程度 | 数量 | 编号                                                                  |
| -------- | ---- | --------------------------------------------------------------------- |
| HIGH     | 0    | —                                                                     |
| MEDIUM   | 7    | 视角3-01、视角3-02、视角4-01、视角5-01、视角5-02、视角9-01、视角10-01 |
| LOW      | 3    | 视角1-01、视角3-03、视角8-01                                          |

## 去重自检（与 round-01 按根因比对）

- **视角1-01**（里程碑 handle 永不可见）vs R1 [G4-视角8-01]（连线手柄 8px hover-only）：R1 根因是"设计上 hover-only + 尺寸过小"；本条根因是"里程碑分支缺 `group` 类导致可见性机制整体失效"的实现 bug——不同根因，且 R1 的修复（加大尺寸/触屏回退）不会治愈本条。已在条目内注明区别。
- **视角9-01**（notice-bar 嵌套）vs R1 [G4-视角9-01]（kanban 卡片嵌套）：同根因的跨包兄弟实例，递归扩展指令明确要求"修一处必须查全类"，按新发现报告。
- **视角3-02**（gantt bar 选中态）vs R1 [G1-视角3-03]（button-group 选中态）：同根因类（选中态 data-only 无视觉）在 G4 的未覆盖实例。
- **视角3-03**（focus 指示）vs R1 [G7-视角3-15]：同根因跨包实例（scheduling 此前零覆盖）。
- 其余各条（calendar drop-target CSS、barcode 校验遮蔽、pull-refresh 静默失败、exportError 未渲染、键盘拖拽回退、resize affordance）在 R1 127 条与本包 ma5-ux 6 条中均无同根因条目。

## 转 C2 候选（dedup 基线 §2 规则，不计入发现）

1. **gantt bar 键盘 move/resize 分支未接线**：`handleBarKeyAction` 已实现 `'move-up'|'move-down'|'resize-left'|'resize-right'`（gantt.tsx:225-290），但 `gantt-bars.tsx:77-93` 的 keydown 只映射 Space→select、Enter→editor——键盘改期能力存在于 store/hook 层而无 UI 接线。键盘触达框架属 G-B2（已登记缺口），沿 R1 G4 C2 候选 #2 同口径登记其实例。
2. **swipe-cell 键盘等价操作**：R1 已登记（G-B2），本轮无新表象。

## 误报与边界自查

- `kanban-toolbar` undo/redo 的 `disabled={!canUndo}` 走 ui Button 基类禁用样式 → 不报（R1 备忘一致）。
- `gantt-header` 缩放/`handleZoomToFit` 等纯文本按钮属 R1 [G4-视角1-01] 已报实例 → 不重复。
- scheduling TSX/CSS 硬编码色（kanban-card-tags gray、calendar-header hover:bg-gray-100、week-view bg-blue-50、markers bg-red-400、overlay bg-yellow-600/green-400/red-400、baseline hex、timescale gray）→ 均为 R1 [G4-视角7-01] 已报的包级根因实例，不重复。
- `calendar-month-view` 月视图窄单元格事件标题截断 → 有 `truncate` + 原生 `title` 兜底，按误报 #5 不报。
- barcode 浮层手写 border-spinner → R1 [G4-视角10-01] 已列，不重复。
- `infinite-scroll` 四态（loading/finished/error/disabled）齐备且符合基线 → 零发现。
- notice-bar 包级固定 hsl 调色板（styles.css）为带 `--nop-notice-bar-*` 宿主覆盖通道与暗色变体的既定设计（MA-06/NEW-MM-06 注释锁定）→ 不报。
- dimension 09-12（props 契约/marker 视觉/原生 HTML 替代/field 建模）未涉及；视角 9 条目均限 ARIA 语义/role 的 UX 可见部分。

## 覆盖记录

- flux-renderers-mobile：12 个非 test 源文件中 10 个 UI/逻辑承载文件全读（pull-refresh / infinite-scroll / swipe-cell / notice-bar / countdown / use-touch / schemas / mobile-renderer-definitions / styles.css / index），test-support 两文件沿 G1 口径不入审。
- flux-renderers-scheduling：R1 已逐文件通读 91 文件的基础上，本轮对 24 个 UI 承载文件二次通读（calendar 8 / gantt 11 / kanban 5），并对全部 5 个包 CSS 与共享 use-focus-trap 全文核对；纯逻辑文件（utils/hooks 无 JSX 输出者）经 `tabIndex`/`focus`/`drag-ok`/`exportError`/`aria-label`/硬编码色等定向 grep 复核，未产生新 UI 表面。

## G5 — ai / graph / map / industrial+editor（HIGH 0 / MEDIUM 7 / LOW 7，共 14 条）

### [G5-R2-视角3-01] 流式中断（aborted）态无任何视觉反馈，与错误态（banner+重试）不对称

- **文件**: `packages/flux-renderers-ai/src/renderers/ai-message-list.tsx:87-88`；`packages/flux-renderers-ai/src/engine/create-engine.ts:508-520,570-584`；`packages/flux-renderers-ai/src/styles.css`（全文无 `data-state='aborted'` 规则）
- **证据片段**:
  ```tsx
  // ai-message-list.tsx:87-88 — 仅 error 态有列表级横幅；aborted 无任何承载
  const showListErrorBanner = inError && messages.length > 0 && lastMessage?.role !== 'assistant';
  ```
  ```ts
  // create-engine.ts:508-514 — 零包中断时空 assistant 占位被直接 splice 移除
  function commitOrDropResidue(): void {
    if (assistantIndex < 0) return;
    if (isVacuousAssistantResidue(assistant)) {
      adapter.mutate('messages', (draft) => {
        ...
        draft.messages.splice(assistantIndex, 1);
  ```
- **严重程度**: MEDIUM
- **现状**: 引擎把中断沉淀为 `requestState='aborted'` 并仅在 `ai-chat` 根上落 `data-state="aborted"` 属性，但 renderers 与 styles.css 均无任何消费方（grep 证实）。零包中断（用户在首字节前点停止、宿主 `ai:abort`、会话切换打断）时空 assistant 占位被 `commitOrDropResidue` 移除，界面上只剩一条没有任何回应的用户消息；有部分文本时消息戛然而止也无"已停止"标记。对照：`error` 态有 `ListErrorBanner`（destructive 横幅 + Retry 按钮），中断态零指示。
- **行业惯例**: ChatGPT / Claude 在停止生成后保留部分内容并在消息尾部呈现明确的终止状态（"Stopped"标记或重试入口）；Ant Design X / vercel/ai 聊天模板对 aborted 与 error 一样提供可见的终态反馈。共享前缀视角 3：当前状态（含中断）应有明确视觉指示。
- **用户影响**: 宿主动作或误触停止后，用户看到自己刚发的消息石沉大海——与"请求失败"（有横幅有重试）不同，中断看起来像"发送丢了/卡死了"，无法区分是已停止还是异常；会话切换打断在途请求时，原会话回到一个"没有回答"的悬空提问。
- **建议**: 在 `ai-message-list.tsx` 仿照 `showListErrorBanner` 增加 aborted 分支：`requestState==='aborted' && lastMessage?.role !== 'assistant'` 时渲染 `<div data-slot="ai-message-list-aborted" role="status" className="... text-muted-foreground">{t('flux.ai.stopped')}</div>`（新增 i18n 键，如 en "Generation stopped"）；部分内容场景可在 bubble 侧按 `finishReason === 'abort'` 语义于消息尾部追加同一状态标记；配套补 `[data-slot]` 样式。
- **复核状态**: 未复核

---

### [G5-R2-视角3-02] 工具箱操作回显 span 无样式规则、无 role="status"，失败与成功文案视觉无差

- **文件**: `packages/flux-renderers-industrial/src/editor/toolbox/toolbox-panel.tsx:210-214`（对照 `packages/flux-renderers-industrial/src/editor/styles.css:44-51` 工具箱样式段无 `.nop-scada-editor-toolbox-status` 规则）
- **证据片段**:
  ```tsx
  // toolbox-panel.tsx:210-214 — 所有操作（含导入失败）的唯反馈出口
  {
    statusMessage ? (
      <span className="nop-scada-editor-toolbox-status" data-slot="scada-editor-toolbox-status">
        {statusMessage}
      </span>
    ) : null;
  }
  ```
  ```ts
  // toolbox-panel.tsx:97 — 导入非法配置也只写同一个 span
  flashStatus(ok ? t('...imported') : t('...invalidConfig'));
  ```
- **严重程度**: MEDIUM
- **现状**: 工具箱全部操作反馈（Fit/Center 视口坐标、对齐/分布结果、复制/粘贴计数、undo/redo、导入成功/失败）经 `flashStatus` 写入一个 14px 工具条内的裸 span。grep 全包 CSS 证实 `.nop-scada-editor-toolbox-status` 没有任何样式规则——既非 `.nop-scada-editor-status-bar` 的 11px muted 风格，也无 destructive 色；`invalidConfig` 与 `imported` 渲染完全同款。同时无 `role="status"`/`aria-live`，读屏用户对全部操作结果零感知；span 永不清空、随每次操作覆盖。
- **行业惯例**: shadcn/ui 生态操作反馈用 `role="status"` + muted 样式的行内提示或 toast（本项目 `@nop-chaos/ui` 已导出 `toast()`，flux-renderers-basic/text 复制即用 toast 反馈）；失败反馈需与成功有语义色区分（Ant Design message.error/success）。
- **用户影响**: 导入非法 JSON 后弹窗关闭，唯一的失败指示是工具条右端一行与成功提示长得一样的正文色小字，用户极易漏看，以为导入成功；读屏用户执行删除/对齐/导入后听不到任何结果；视口坐标这类调试信息以默认字号直接挤进工具条，与 12px 按钮行高冲突。
- **建议**: ① 给 span 补 `role="status" aria-live="polite"`；② 在 editor/styles.css 增补规则（muted 12px、`margin-left:auto`、失败态经 `data-variant="error"` 上 `color: var(--nop-danger)`，flashStatus 失败分支落该属性）；③ 失败类反馈（invalidConfig/notVisible/noChange）改用 `toast.error(...)` 或 destructive 着色，与成功区分。
- **复核状态**: 未复核

---

### [G5-R2-视角3-03] 编辑器 preview 态零可见指示，且工具箱/属性面板 mutator 未按 mode 门控仍可改图元

- **文件**: `packages/flux-renderers-industrial/src/editor/scada-editor-canvas.tsx:283,267-271`；`packages/flux-renderers-industrial/src/editor/runtime-mutators.ts:92,254-258`（对照 `editor/styles.css` 全文无 `[data-mode]` 规则）
- **证据片段**:
  ```tsx
  // scada-editor-canvas.tsx:283 — 模式只落 DOM 属性，无任何 UI 消费
  data-mode={props.props.mode ?? 'edit'}
  ...
  // :267-271 — preview 态下 toolbox/palette/inspector 照常全套渲染
  {showLayoutBody
    ? asReactNode(toolbox?.render({ bindings: { selection } })) ?? (
        <EditorToolboxPanel runtime={runtime} selection={selection} onError={handleError} />
      )
  ```
  ```ts
  // runtime-mutators.ts:92 — removeWorkingSymbol 等编辑 mutator 均无 session.mode 检查
  const removeWorkingSymbol = (nodeId: string | string[]) => {
  ```
- **严重程度**: MEDIUM
- **现状**: `component:switchMode('preview')` 切换后引擎侧仅 `editable:false` + 清选区（editor-engine.ts:312-315），但：① 界面上没有任何模式指示——`data-mode` 属性无任何 CSS/组件消费，工具箱、图元库、属性面板、状态栏原样保留；② `removeWorkingSymbol`/`alignSelection`/`copySelection`/inspector 字段写入等 mutator 全部不检查 `session.mode`，preview 态下 Delete/对齐/复制/属性编辑仍直接修改 working copy（仅画布拖拽被冻结）。
- **行业惯例**: 组态/画布编辑器（Figma、Node-RED、WinCC）进入预览/运行模式时或隐藏编辑 chrome、或显示醒目的模式徽标并禁用编辑工具；"只读视图内可静默修改数据"在所有主流编辑器中均视为缺陷。
- **用户影响**: 宿主把编辑器切到预览态后，用户面对的仍是全套编辑工具：在"预览"里点 Delete 或改属性，图元照样被删/被改——既无法从界面得知当前处于预览态，也未得到"预览即只读"的预期保护；"看起来可编辑、实际处于受限模式"正是状态指示完整性缺口，且伴随工作副本被意外篡改的功能风险。
- **建议**: ① 最小修复：状态栏（`scada-editor-status-bar`）按 `session.mode` 渲染模式徽标（edit/preview i18n 文案），并在 CSS 中以 `[data-mode='preview']` 将工具箱编辑类按钮组（删除/对齐/层级/复制粘贴）与 inspector 置 `disabled`/`pointer-events:none`+降透明度；② 行为修复：`runtime-mutators` 的写入口统一加 `if (session.mode === 'preview') return;` 守卫（或 toolbox/inspector 侧按 mode 整体禁用）。
- **复核状态**: 未复核

---

### [G5-R2-视角5-01] ai-attachments 超 maxSize/maxFiles 拒绝静默丢文件，界面零反馈

- **文件**: `packages/flux-renderers-ai/src/renderers/ai-attachments.tsx:100-136`（对照同文件 `AttachmentStatus` :361-383 已具备 error 条目展示通道）
- **证据片段**:
  ```tsx
      if (maxSize !== undefined && file.size > maxSize) {
        tooLarge = true;
        continue;                      // 直接跳过，无条目、无提示
      }
      ...
      if (tooLarge) {
        const errorPayload = { type: 'ai:attachments-error', reason: 'attachment-too-large' };
        void props.events.onError?.(errorPayload, ...);   // 仅派发 schema 事件
      }
  ```
- **严重程度**: MEDIUM
- **现状**: 超限文件被静默 `continue` 丢弃，仅向 schema `onError` 事件派发 payload；组件自身不渲染任何提示（无错误条目、无 toast、无计数）。宿主未接线 `onError`（默认情况）时，用户选 5 个文件可能只有 3 个出现在列表里，无任何解释。同文件 `AttachmentStatus` 已支持在附件条目上渲染 `uploadFailed` 错误态，说明条目级错误展示通道现成、未被复用。这正是 round-01 [G2-视角5-02]（upload-field 超限静默拒绝，MEDIUM）的同类根因新实例。
- **行业惯例**: Ant Design Upload 超限文件插入 `status:'error'` 条目内置提示；MUI/Chakra 上传器对拒绝文件给出逐文件原因。静默丢文件被视为接近数据丢失的体验缺陷。
- **用户影响**: 用户拖入若干截图后部分附件"凭空消失"，会反复重选并怀疑组件坏了；无法得知是大小超限还是数量超限，更不知道上限值是多少。
- **建议**: 复用 `AiAttachment` 模型扩展瞬时错误条目：`setInternalAttachments(prev => [...prev, { id, name: file.name, status: 'error', ... }])` 并在 `AttachmentStatus` 的 error 分支按 reason 区分文案（复用既有 i18n 键 `flux.ai.fileTooLarge` / `flux.ai.tooManyFiles`，当前仅存在于 i18n 表却无 UI 消费）；或最低限度 `toast.error(t('flux.ai.fileTooLarge'))`。
- **复核状态**: 未复核

---

### [G5-R2-视角5-02] map 错误覆盖层用中性灰正文且直接渲染原始 error.message，与全仓错误语义色/文案链路不一致

- **文件**: `packages/flux-renderers-map/src/map-renderer.tsx:174-180,379-388`（样式 `packages/flux-renderers-map/src/styles.css:47-60`）
- **证据片段**:
  ```tsx
  // map-renderer.tsx:177-179 — OL 懒加载失败直接存 error.message（英文异常原文）
  setOlError(
    error instanceof Error ? error.message : t('flux.map.mapLoadFailed'),
  );
  ...
  // :379-388 — 错误层原样输出该字符串
  <div data-slot="map-error">
    <span>{olError ?? geojsonError}</span>
  ```
  ```css
  /* styles.css:47-58 — loading/empty/error 三态共用同一 muted 灰样式 */
  .nop-map [data-slot='map-loading'],
  .nop-map [data-slot='map-empty'],
  .nop-map [data-slot='map-error'] {
    ...
    color: hsl(var(--muted-foreground));
  ```
- **严重程度**: MEDIUM
- **现状**: ① 错误文案与 loading/empty 共用 muted-foreground 灰、无图标、无 destructive 语义——对照本组 `ai-chat-error`（`--destructive`）、`scada-canvas-error`（红）、`scada-editor-error`（`--nop-danger`），map 是唯一不给错误态语义色的 surface；② OL 动态导入失败时把 `error.message`（如 "Failed to fetch dynamically imported module: ..."）直接呈现给用户，替换了现成的本地化文案 `flux.map.mapLoadFailed`。这是 round-01 [G1-视角5-05]（加载失败态无语义色+裸错误信息）的同类根因新实例。
- **行业惯例**: shadcn/ui Alert `variant="destructive"`、Ant Design Result/Alert 错误态一律语义红 + 图标；面向用户的错误文案走 locale，异常原文仅进控制台/监控。
- **用户影响**: 地图区块加载失败时用户看到一行居中灰字（与"加载中""暂无数据"视觉完全相同），意识不到出错；弱网下 CDN 加载失败时显示整句英文模块加载异常，非英文用户完全无法理解。
- **建议**: ① `styles.css` 为 `[data-slot='map-error']` 单列规则：`color: hsl(var(--destructive))`（可加 `bg-destructive/5`），JSX 中补警示图标（`TriangleAlertIcon className="size-4"`）；② `olError` 仅作 `console.error`，UI 统一渲染 `t('flux.map.mapLoadFailed')`（`geojsonError` 同理优先用 `flux.map.loadRegionDataFailed` 族本地化键）。
- **复核状态**: 未复核

---

### [G5-R2-视角6-01] HITL 审批卡片按钮顺序为 [批准(实心), 驳回(outline)]，违反项目 [secondary, primary] 审批按钮约定

- **文件**: `packages/flux-renderers-ai/src/renderers/ai-tool-call.tsx:221-251`
- **证据片段**:
  ```tsx
        <Button
          type="button"
          size="sm"
          variant="default"
          className="bg-success hover:bg-success/90 text-white"
          data-slot="ai-tool-call-approve"
          ...
        >
          <Check className="h-3.5 w-3.5" />
          {t('flux.ai.approve')}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          data-slot="ai-tool-call-reject"
  ```
- **严重程度**: MEDIUM
- **现状**: 工具调用待审批（HITL pending）卡片的 footer 渲染为批准（实心绿，default variant 覆写 bg-success）在左、驳回（outline）在右。项目 `docs/architecture/styling-system.md` "Dialog / Form Action Button Convention" 明文 `actions MUST be [secondary, primary]`，且同节审批示例即 `[驳回(destructive), 通过(primary)]`——驳回在左、通过在右。ai 会话流是本包核心组合态，该审批对是其中唯一的决策按钮组。
- **行业惯例**: shadcn/ui AlertDialog footer、Ant Design Modal、macOS HIG 一律次操作在左、主操作在最右；本项目自身文档已锁定该顺序并给出了审批场景的标准写法。
- **用户影响**: 习惯"最右侧是确认"的用户在批准工具调用时会点到左一位的"批准"、或把右侧"驳回"当确认——审批结果是方向相反的不可逆决策（放行或拒绝工具执行），点错的代价高于普通取消；与同项目其他审批/确认界面的肌肉记忆直接冲突。
- **建议**: 交换两个 Button 的 JSX 顺序为 `[驳回(outline), 批准(实心)]`；批准键保持现有 success 实心样式，可顺带将驳回改为 `variant="destructive"` 以对齐 styling-system.md 审批示例的语义配色；焦点陷阱初始聚焦目标同步改为交换后的批准键（`querySelector('[data-slot="ai-tool-call-approve"]')` 不受顺序影响，无需改）。
- **复核状态**: 未复核

---

### [G5-R2-视角7-01] graph 节点 warning/success 语义级颜色硬编码 HSL 字面量，同文件 danger 却走 --destructive 令牌

- **文件**: `packages/flux-renderers-graph/src/styles.css:42-52`
- **证据片段**:

  ```css
  .nop-graph-node[data-level='danger'] {
    border-color: hsl(var(--destructive) / 0.55);
  }

  .nop-graph-node[data-level='warning'] {
    border-color: hsl(32 95% 44% / 0.55);
  }

  .nop-graph-node[data-level='success'] {
    border-color: hsl(142 71% 45% / 0.55);
  }
  ```

- **严重程度**: MEDIUM
- **现状**: 同一组语义级边框色里，danger 正确走 `hsl(var(--destructive))`，而 warning/success 写死 HSL 字面量（值恰为默认主题的 --warning/--warning 系色）。主题层 `packages/theme-tokens/src/styles.css` 已发布 `--warning`/`--success` 令牌。这是 round-01 [G3-视角7-01]（stat-tile emerald/red 字面量，MEDIUM）、[G1-视角7-09]（progress oklch 字面量，MEDIUM）同类根因在 graph 包的新实例，且"同文件内一令牌二字面量"的自不一致比跨文件更刺眼。
- **行业惯例**: shadcn/ui 语义状态色一律经 CSS 变量；本项目 `theme-compatibility.md` Renderer Ownership Rules："reading CSS variables instead of hardcoded colors where visuals are package-owned"。
- **用户影响**: 宿主品牌化/暗色主题覆盖 `--warning`/`--success` 时，节点 danger 边框跟随主题而 warning/success 边框保持默认色相，同一画布内三种语义级出现"两套色系"；与同屏消费令牌的 warning/success 组件（badge、alert）色值漂移。
- **建议**: 两处字面量改为 `hsl(var(--warning) / 0.55)` / `hsl(var(--success) / 0.55)`，与上方 danger 行写法完全对齐（token 发布格式为 HSL 片段，无需额外包装）。
- **复核状态**: 未复核

---

### [G5-R2-视角3-04] graph 缩放按钮到达 min/max 边界后仍可点击，静默无效果且无禁用态

- **文件**: `packages/flux-renderers-graph/src/graph-renderer.tsx:203-221,606-623`
- **证据片段**:
  ```ts
    const zoomBy = (factor: number) => {
      const state = store.getState();
      const nextZoom = Math.min(
        maxZoomRef.current,
        Math.max(minZoomRef.current, state.viewport.zoom * factor),
      );
      if (nextZoom === state.viewport.zoom) {
        return;                      // 边界内静默返回，按钮仍呈可用态
      }
  ```
  ```tsx
    <Button variant="ghost" size="icon" aria-label={t('flux.graph.zoomIn')} ... >
      <ZoomIn className="h-4 w-4" />
    </Button>
  ```
- **严重程度**: LOW
- **现状**: 缩放越界时 `zoomBy` 直接 return，两个 zoom 控件不接收任何 disabled/视觉边界信息，点击后画面无变化也无反馈；fit 与缩放状态均未回填按钮 disabled 态。
- **行业惯例**: Figma/Mapbox/GL 地图与 MUI 数字步进器在到达边界时禁用对应按钮（灰化 + pointer-events 关闭）；同包 round-01 [G3-视角3-03] 已确立"越界分页按钮需 pointer-events-none opacity-50"的对齐方向。
- **用户影响**: 用户放大到 2x 上限后继续点"+"没有任何反应，会认为按钮失灵而连点数次；边界状态完全不可感知。影响限于缩放辅助控件，故 LOW。
- **建议**: 从 store viewport 派生 `canZoomIn = viewport.zoom < maxZoom` / `canZoomOut = viewport.zoom > minZoom`，给两个按钮加 `disabled={!canZoomIn}` 等（Base UI Button 自带 `disabled:opacity-50 disabled:pointer-events-none`），点击守卫保留为兜底。
- **复核状态**: 未复核

---

### [G5-R2-视角5-03] ai-message-list 空消息且未配 emptyState region 时渲染空白面板，无默认提示

- **文件**: `packages/flux-renderers-ai/src/renderers/ai-message-list.tsx:102-117`（对照 `packages/flux-renderers-ai/src/renderers/ai-welcome.tsx:22-26` 的定位说明）
- **证据片段**:
  ```tsx
    if (messages.length === 0) {
      return (
        <div
          className={cn('nop-ai-message-list', props.className)}
          data-slot="ai-message-list"
          data-empty=""
          ...
        >
          {props.emptyNode ?? null}
        </div>
      );
    }
  ```
- **严重程度**: LOW
- **现状**: `messages` 为空且宿主未提供 `emptyNode`/`emptyState` region 时渲染一个纯空白容器（仅 role="log" 语义壳）。包内 `ai-welcome` 即为此场景设计，但仅在宿主主动组合进 emptyState region 时出现；`ai-chat` 主路径（engine 有效、新会话 0 消息）同样落入空白。这是 round-01 [G5-视角5-02]（ai-conversations 空列表无提示，LOW）的同类根因新实例，发生在更主要的 chat 面板上。
- **行业惯例**: 共享前缀视角 5：空数据渲染须有意义提示（非空白）；ChatGPT/vercel-ai 模板首屏均有欢迎/引导占位（本项目 ai-welcome 组件即对标物）。
- **用户影响**: 首次打开对话（或新建会话后）面板中部整块空白，只有底部输入框暗示"可以开始"；用户无法区分"加载中/坏了/就是空的"。
- **建议**: `props.emptyNode ?? null` 改为 `props.emptyNode ?? <div data-slot="ai-message-list-empty" className="flex h-full items-center justify-center px-4 text-sm text-muted-foreground">{t('flux.ai.selectConversation')}</div>`（复用既有 i18n 键；宿主仍可用 emptyState region/ai-welcome 完全覆盖默认文案）。
- **复核状态**: 未复核

---

### [G5-R2-视角8-01] 附件缩略图移除按钮 20px 且 hover 才可见（触摸设备不可发现），卡片态移除按钮同为 20px

- **文件**: `packages/flux-renderers-ai/src/renderers/ai-attachments.tsx:306-320`（同根因实例 :340-351 卡片态移除按钮）
- **证据片段**:
  ```tsx
  <Button
    type="button"
    variant="ghost"
    size="sm"
    className="absolute right-0 top-0 h-5 w-5 p-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
    data-slot="ai-attachments-remove"
    aria-label={t('flux.ai.removeFile')}
    disabled={disabled}
    onClick={onRemove}
  >
    <X className="h-3 w-3" />
  </Button>
  ```
- **严重程度**: LOW
- **现状**: 图片缩略图的移除按钮实际尺寸 `h-5 w-5`=20×20px（低于去重基线认可的 icon-xs 24px 下限），且默认 `opacity-0`、仅 `group-hover`/`focus-visible` 显现——触摸设备无 hover，删除入口不可见（键盘 Tab 尚可聚焦）。同文件卡片态移除按钮（:344）同为 20px。这是 round-01 [G4-视角8-02]（kanban 20px hover-only 删除钮，LOW）的同类根因新实例；同包 `ai-tool-call.tsx:154` 展开钮 `h-5 w-5` 为同型可一并收敛。
- **行业惯例**: 去重基线误报 #4 的豁免下限是 icon-xs 24px；Trello/百度网盘类附件缩略图的删除钮为常显或 hover:none 时常显回退 + ≥24px 命中区。
- **用户影响**: 平板/触屏用户长按或点按缩略图找不到任何移除手段（无滑动删除等替代入口），已传错文件无法撤回；桌面用户也需把光标精确移到 20px 角落才能命中。
- **建议**: 尺寸提升至 `size="icon-xs"`（24px，基线内），并给 hover-only 行为补触屏回退：包 CSS 增加 `@media (hover: none) { [data-slot='ai-attachments-remove'] { opacity: 1; } }`；`ai-tool-call.tsx:154` 展开钮同步改 `size="icon-xs"`。
- **复核状态**: 未复核

---

### [G5-R2-视角9-01] graph 布局切换按钮以原始枚举值 "flow"/"hierarchy" 作为可见文案，未走 i18n 且与同簇图标按钮语法不一

- **文件**: `packages/flux-renderers-graph/src/graph-renderer.tsx:633-644`
- **证据片段**:
  ```tsx
  <Button
    variant="ghost"
    size="sm"
    aria-label={t('flux.graph.toggleLayout')}
    data-slot="graph-control-layout"
    onClick={() => store.getState().setLayoutMode(layoutMode === 'flow' ? 'hierarchy' : 'flow')}
    className="h-8 px-2 text-xs"
  >
    {layoutMode}
  </Button>
  ```
- **严重程度**: LOW
- **现状**: 控制簇前三个按钮（ZoomIn/ZoomOut/Maximize）是统一 icon 形态，第四个布局切换按钮却把内部枚举字符串（英文 "flow"/"hierarchy"）直接作为按钮可见文本，任何 locale 下不翻译；同一按钮既当状态显示又当切换触发，无按压态/选中态语法。aria-label 已走 `t('flux.graph.toggleLayout')`，可见文案与可访问名两套口径。
- **行业惯例**: shadcn/ui / Ant Design 工具栏模式切换用图标+Tooltip（如 layout/wand 图标）或带 i18n 文案的 Toggle；内部枚举值不直接暴露为 UI 文案（同组 round-01 [G5-视角1-04] 已确立 scada 工具箱与 graph 控制簇图标语言应对齐）。
- **用户影响**: 非英文用户看到一个语义不明的小写英文单词按钮，需试点才能明白它切换布局；与相邻三个图标按钮的视觉语法断裂，控件簇看起来"没做完"。
- **建议**: 短期：`{layoutMode}` 改 i18n 短标签（新增 `flux.graph.layoutFlow`/`layoutHierarchy`）并以 `aria-pressed`/选中样式表达当前模式；长期：换 `Network`/`GitFork` 类图标 + Tooltip，与同簇 icon 语法统一。
- **复核状态**: 未复核

---

### [G5-R2-视角9-02] 编辑器错误兜底直接渲染原始 error.message，未走运行态画布已有的错误码 i18n 管线

- **文件**: `packages/flux-renderers-industrial/src/editor/scada-editor-canvas.tsx:213-214,390-397`（对照运行态 `packages/flux-renderers-industrial/src/renderer/scada-canvas.tsx:335-339`）
- **证据片段**:
  ```tsx
  // scada-editor-canvas.tsx:213-214 — 直接取 message 展示
    const activeError = parseError ?? errorInfo;
    const errorText = activeError.message;
  ...
  // :393-395 — 原文优先于本地化兜底
    <div data-slot="scada-editor-error" className="nop-scada-editor-error" data-code={errorCode}>
      {errorText || t('industrial.scada.editor.canvasError')}
  ```
  ```tsx
  // scada-canvas.tsx:337 — 运行态同码错误走注册表 + i18n
  {
    resolveErrorText(parseError ?? errorInfo) || t('industrial.scada.canvasError');
  }
  ```
- **严重程度**: LOW
- **现状**: 同一错误体（config-parse/config-invalid 等）在运行态画布经 `useScadaErrorText`（错误码注册表 + i18n，WD-6）解析为本地化文案，而编辑态画布直接渲染 `activeError.message`——config-parse 分支的 message 是英文异常原文（`error.message`），config-invalid 是校验消息英文串拼接；仅当 message 为空才落到本地化兜底键。同包双画布同一错误两套呈现，编辑态还会向用户暴露异常原文。这是 round-01 [G2-视角9-02]/[G3-视角9-01]（内置文案硬编码英文）同根因的新实例。
- **行业惯例**: 面向用户的错误文案统一经 locale/错误码映射（本包运行态 `resolveErrorText` 即既有正确基线）；异常原文只进控制台与监控。
- **用户影响**: 中文环境下 SCADA 编辑器画布因配置解析失败白屏化时，居中显示的是一段英文堆栈式异常文本；同一错误在运行态页面却显示中文文案，宿主内两处观感割裂。
- **建议**: 编辑态错误分支改用与运行态相同的解析链：`{resolveErrorText(activeError) || t('industrial.scada.editor.canvasError')}`（将 `useScadaErrorText`/`scadaEditorErrorI18nKey` 复用到编辑器，`error.message` 移交 `console.warn`/onError 事件 payload）。
- **复核状态**: 未复核

---

### [G5-R2-视角10-01] ai-feedback 复制失败静默吞掉，与同仓"复制失败必须有反馈"基线不一致

- **文件**: `packages/flux-renderers-ai/src/renderers/ai-feedback.tsx:122-137`
- **证据片段**:
  ```tsx
      if (action === 'copy' && message) {
        void copyMessageText(message)
          .then(() => {
            setCopied(true);
            ...
          })
          .catch(() => {
            // swallow: keep the button in its pre-copy state
          });
      }
  ```
- **严重程度**: LOW
- **现状**: `copyMessageText` 在非安全上下文/权限被拒时显式 reject（`navigator.clipboard is not available`），但 `fire('copy')` 的 catch 分支什么都不做：按钮停留"Copy"，无 toast、无文案变化。对照同仓基线：`flux-renderers-basic/src/text.tsx:75-78` 失败走 `toast.error(t('flux.common.copyFailed'))`。这是 round-01 [G1-视角10-13]（json-view 复制失败静默，LOW）的同类根因新实例。不虚报"已复制"这点正确，但失败侧仍缺反馈。
- **行业惯例**: Ant Design message.error / sonner toast error——剪贴板写入被拒必须有失败反馈；同产品内同语义操作反馈模式一致。
- **用户影响**: http 环境或拒绝剪贴板权限时，用户点"Copy"毫无反应，粘贴落空后才意识到失败，无法区分"点错了"与"复制失败"。影响为次要路径反馈缺失，故 LOW。
- **建议**: catch 分支补 `toast.error(t('flux.common.copyFailed'))`（从 `@nop-chaos/ui` 导入 `toast`；i18n 键已存在），与 text.tsx 的既有模式对齐。
- **复核状态**: 未复核

---

### [G5-R2-视角10-02] ai-conversations 新建会话按钮（outline）缺 PlusIcon，偏离本仓"新增 = ghost/outline + PlusIcon"基线

- **文件**: `packages/flux-renderers-ai/src/renderers/ai-conversations.tsx:56-68`
- **证据片段**:
  ```tsx
  <Button
    type="button"
    variant="outline"
    size="sm"
    data-slot="ai-conversations-create"
    disabled={disabled}
    onClick={() => {
      const payload = { type: 'ai:conversation-create' };
      void props.events.onCreate?.(payload, dispatchCtx(payload));
    }}
  >
    {t('flux.ai.newConversation')}
  </Button>
  ```
- **严重程度**: LOW
- **现状**: 会话侧栏第一主操作"新建会话"为纯文本 outline 按钮，无 `<PlusIcon />`。本仓同语义基线：array-editor/key-value/combo/input-table 的 Add 按钮均带 `<PlusIcon className="size-4" />`（ma5-ux [视角1-01] 修复点），round-01 [G2-视角10-01] 已把 array-field 缺 PlusIcon 定为发现。本条为该同根因在 ai 包的新实例（round-01 [G5-视角1-01] 只覆盖了同文件的重命名/删除文本字符按钮，未涉及新建按钮缺图标）。
- **行业惯例**: 共享前缀视角 10 基线"新增 = ghost/outline + PlusIcon"；ChatGPT/Claude 会话侧栏新建按钮均为 + 图标（或图标+文案）。
- **用户影响**: 与全产品其他"新增"入口相比，此处"新建会话"少了"+ "信号，首次扫视侧栏时新建入口的可辨识度弱一档；跨组件同语义操作视觉不一致。
- **建议**: 按钮内容改为 `<PlusIcon className="size-4" />{t('flux.ai.newConversation')}`（从 `lucide-react` 导入 `Plus`；outline variant 保留），与 array-editor.tsx:592-596 同款结构。
- **复核状态**: 未复核

---

## 汇总

| 严重程度 | 数量 | 条目                                                                                        |
| -------- | ---- | ------------------------------------------------------------------------------------------- |
| HIGH     | 0    | —                                                                                           |
| MEDIUM   | 7    | R2-视角3-01、R2-视角3-02、R2-视角3-03、R2-视角5-01、R2-视角5-02、R2-视角6-01、R2-视角7-01   |
| LOW      | 7    | R2-视角3-04、R2-视角5-03、R2-视角8-01、R2-视角9-01、R2-视角9-02、R2-视角10-01、R2-视角10-02 |

共 **14 条**（HIGH 0 / MEDIUM 7 / LOW 7）。

## 去重自检（与 round-01 按根因比对）

- 视角3-01（aborted 反馈）：round-01 仅覆盖 error 态呈现与 streaming 中 textarea 禁用（G5-视角3-01），aborted 终态反馈为全新根因。
- 视角5-01/视角10-01/视角10-02：均为 dedup §1 允许的"同类根因新实例"（分别对照 G2-视角5-02、G1-视角10-13、G2-视角10-01），前轮未在 ai 包报告过对应实例。
- 视角6-01：round-01 [G5-视角6-01] 是导入弹窗 ghost 取消的 variant 问题；本条是 HITL 卡片按钮**顺序**问题，根因不同。
- 视角8-01：round-01 [G4-视角8-02]（mobile/scheduling 组）为 kanban 20px 按钮；ai 包附件移除按钮为跨包新实例。
- 视角7-01 / 视角9-02：对照 G3-视角7-01、G2-视角9-02 的跨包新实例；graph/map/industrial 的样式与文案面 round-01 各仅 1-2 条且未覆盖本次文件。
- 视角3-02 / 视角3-03 / 视角3-04 / 视角5-02 / 视角5-03 / 视角9-01：round-01 G5 未报告过对应组件/对应模式（工具箱状态回显、preview 态、graph 缩放边界、map 错误层、ai-message-list 空态、graph 布局按钮），无根因重合。

## 误报与边界自查（dedup §3/§4）

- HITL 批准键 `bg-success` 覆写、错误横幅 `outline` 重试钮：未按"按钮样式"单独报告（前者是顺序问题的伴随事实，后者属误报 #7 destructive 语境豁免族）。
- ai-feedback `refresh` 动作复用 `flux.ai.retry` 文案、suggestions 溢出 "+N" 无 aria-label：经真实用户影响检验不通过（语义可猜、有 popover 兜底），弃报。
- scada 交互覆盖层 `#1e4fbd` 等画布内状态色：属图元内部装饰色 + 静态口径，未达"宿主主题跟随"报告门槛，未报。
- `ai-chat` connector-missing 错误已有 destructive 样式与 i18n（styles.css:99-104），非发现。
- 无条目落入 dedup-baseline §2 已登记 16 项能力缺口（preview 模式本身已实现，缺口在于状态指示与 mutator 门控，非能力缺失申报）。

## 覆盖记录

- **ai（源码口径）**：视觉面全量复核——ai-chat / ai-message-list / ai-bubble（index + renderers 全部 7 子件 + user-edit）/ ai-tool-call / ai-feedback / ai-suggestions / ai-prompts / ai-welcome / ai-citations / ai-token-usage / ai-conversations / ai-attachments / ai-sender / ai-voice-input / rich-text（template-bar、suggestion-popup）/ styles.css；逻辑面（engine/adapters）定向 grep（aborted、loading、error、disabled、className 输出）确认无未检 UI 表面。round-01 已报条目（文本字符图标、Stop/取消混用、textarea streaming 禁用、气泡出厂视觉、会话删除无确认等）不再重复。
- **graph**：graph-renderer / graph-node / xyflow-canvas / graph-search / graph-store / styles.css 全读；静态口径（xyflow）。
- **map**：map-renderer / map-layer-manager / map-color / use-map-geojson / styles.css 全读；静态口径（OpenLayers）。
- **industrial（含 src/editor/）**：scada-canvas / scada-editor-canvas / toolbox-panel / inspector-panel / inspector-field / editor-palette / editor styles.css + 根 styles.css 全读；symbols 抽读（sensor-control button/switch + interaction-overlay）；runtime-mutators / editor-engine / runtime hooks 定向 grep（mode 门控、disabled、错误链路）；静态口径（leafer）。

## G6 — @nop-chaos/ui 62 模块（HIGH 1 / MEDIUM 3 / LOW 2，共 6 条）

### [G6-R2-视角3-01] 可拖拽 DialogHeader（tabIndex=0，常为弹窗首个 Tab 停留点）无任何 focus-visible 焦点态

- **文件**: `packages/ui/src/components/ui/dialog.tsx:265-291`（类串 269-277，聚焦属性 278-281）
- **证据片段**:
  ```tsx
  <div
    data-slot="dialog-header"
    className={cn('nop-dialog ',
      'relative flex shrink-0 flex-col gap-2 p-4 pb-0',
      draggable && 'cursor-grab select-none',
      className,
    )}
    role={dragContext.enabled ? 'toolbar' : undefined}
    aria-orientation={dragContext.enabled ? 'horizontal' : undefined}
    tabIndex={dragContext.enabled ? 0 : undefined}
    onKeyDown={handleKeyDown}
  ```
- **严重程度**: MEDIUM
- **现状**: `draggable`（默认 true）时 DialogHeader 是 `tabIndex={0}` 的可聚焦交互面（方向键/Home 移动对话框），但根类串只有 `cursor-grab select-none`，没有任何 `focus-visible:*` 类。DOM 顺序上 header 位于 DialogBody 之前，是弹窗内**第一个** Tab 停留点；`wrapSurfaceTabFocus` 的焦点环游序列也把它计为首/末节点。round-01 [G6-视角9-05] 报的是其 `role="toolbar"` 语义问题，焦点不可见是同组件未被检出的另一独立缺陷（同族先例：[G6-视角3-01] InputGroupAddon、[G6-视角3-02] Card）。
- **行业惯例**: shadcn/ui 一切 tabIndex 可达交互面统一 `focus-visible:ring-3 focus-visible:ring-ring/50`（本仓 `button.tsx:7`、`item.tsx:35` 同款）；WAI-ARIA 可交互 separator/toolbar 聚焦态必须有可见指示。
- **用户影响**: 键盘用户打开表单弹窗后按 Tab，焦点无声落在标题栏上（屏幕无任何变化），再按 Tab 才到第一个字段；Shift+Tab 回绕时同样"焦点消失"。用户无法得知焦点位置、也无法发现方向键可移动弹窗这一能力。
- **建议**: 在 header 条件类中追加 `draggable && 'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none'`（与 `input.tsx:16` 同规格），或复用 `buttonVariants` 的 focus-visible 段。
- **复核状态**: 未复核

---

### [G6-R2-视角3-02] MenubarTrigger 用 `outline-hidden` 抹掉默认焦点轮廓且无 focus-visible 替代，菜单栏键盘导航焦点不可见

- **文件**: `packages/ui/src/components/ui/menubar.tsx:46-56`（对照 `dropdown-menu.tsx:39-41` 无样式 trigger、`menubar.tsx:92` MenubarItem 有 `focus:bg-accent`）
- **证据片段**:
  ```tsx
  function MenubarTrigger({ className, ...props }: React.ComponentProps<typeof DropdownMenuTrigger>) {
    return (
      <DropdownMenuTrigger
        data-slot="menubar-trigger"
        className={cn('nop-menubar ',
          'flex items-center rounded-sm px-1.5 py-[2px] text-sm font-medium outline-hidden select-none hover:bg-muted aria-expanded:bg-muted',
          className,
        )}
  ```
- **严重程度**: MEDIUM
- **现状**: MenubarTrigger 是原生 `button`（Tab 可达，Base UI Menubar 还支持左右方向键在触发器间移动焦点），类串显式写 `outline-hidden`（等价旧版 outline-none，把浏览器焦点轮廓改为透明），且全串没有任何 `focus-visible:`/`focus:` 替代——`hover:bg-muted` 仅鼠标可见，`aria-expanded:bg-muted` 仅菜单展开时可见。菜单收起状态下键盘 Tab/方向键聚焦触发器时无任何视觉指示。同包其余菜单触发面（DropdownMenuTrigger 无样式类=保留默认轮廓；SubTrigger 有 `focus:bg-accent`）都有可见焦点，Menubar 是唯一被主动抹掉的。
- **行业惯例**: shadcn/ui Menubar 上游 trigger 含 `focus:bg-accent focus-visible:ring-*` 焦点态；本仓 button/toggle/navigation-menu 触发面统一 `focus-visible:ring-3 focus-visible:ring-ring/50`。
- **用户影响**: 顶部菜单栏的键盘用户 Tab 进入后不知道焦点停在哪个菜单（点击 Enter/Space 打开的是"看不见的那个"）；方向键巡览时同样全盲。焦点环家族（视角 3）在菜单栏主入口上的新实例。
- **建议**: 类串补 `focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50`（或最简方案：去掉 `outline-hidden` 恢复默认轮廓），与同文件 MenubarItem 的 `focus:bg-accent` 焦点反馈对齐。
- **复核状态**: 未复核

---

### [G6-R2-视角6-01] DrawerBody 无滚动契约：长内容在 max-h-[80vh]/h-full 抽屉中溢出且不可达，与 DialogBody 的内建滚动不对称

- **文件**: `packages/ui/src/components/ui/drawer.tsx:343-347`（容器 `drawer.tsx:163-178`；对照 `dialog.tsx:294-298`）
- **证据片段**:
  ```tsx
  // drawer.tsx:343-347 — DrawerBody 无 overflow-y-auto / flex-1 / min-h-0
  function DrawerBody({ className, ...props }: React.ComponentProps<'div'>) {
    return (
      <div
        data-slot="drawer-body"
        className={cn('flex flex-col gap-4 p-4', className)}
        {...props}
      />
    );
  }
  // dialog.tsx:296 — 同族 DialogBody 已内建滚动
  ('flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-y-auto px-[var(--dialog-body-padding-x)] py-4');
  ```
- **严重程度**: HIGH
- **现状**: 底部/顶部方向抽屉 popup 限高 `max-h-[80vh]`（`drawer.tsx:166/167`），左右方向为 `h-full`；popup 与 DrawerContent 均无 `overflow-hidden`，DrawerBody 无 `overflow-y-auto`/`flex-1`/`min-h-0`。内容高于限高时 flex 收缩被 min-content 托住，内容溢出面板且全程无滚动条——底部抽屉的 footer 动作区与超限字段不可达。同族 DialogBody（配合 DialogContent `max-h-[calc(100dvh-2rem)]`）已确立"body 负责滚动、header/footer 常驻"的家族契约，Drawer 缺失。真实消费路径已在用：`flux-react/dialog-host.tsx:546`（schema 抽屉面，内容长度任意）与 `detail-view/detail-surface.tsx:142`（详情抽屉）均裸用 DrawerBody 无滚动类。
- **行业惯例**: shadcn/ui Drawer/Sheet 组合内长内容标准做法是 body 区滚动（Radix/Base UI 示例均给内容区 `overflow-y-auto`）；Ant Design Drawer 默认整个 body 可滚。同族浮层滚动行为一致是基线要求。
- **用户影响**: 打开一条内容较长的详情/表单抽屉（移动端 bottom drawer 尤其常见）时，超出 80vh 的字段和底部"保存/关闭"按钮被顶出面板且无法滚动到——操作无法完成；用户也不会意识到需要缩小窗口才能看到剩余内容。
- **建议**: DrawerBody 改为 `'flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4'`（与 DialogBody 同构，保留 p-4 padding）；若需兼容既有单屏用法，可按 `data-direction` 仅对 `top/bottom` 启用 overflow。修复后补一条"超长内容可滚至 footer"的 DOM 断言测试。
- **复核状态**: 未复核

---

### [G6-R2-视角9-01] ComboboxInput 内嵌 trigger/clear 与 ComboboxChip 的移除钮均为 icon-only 无可访问名

- **文件**: `packages/ui/src/components/ui/combobox.tsx:31-42`（ComboboxClear）、`combobox.tsx:56-70`（ComboboxInput 内嵌 trigger+clear）、`combobox.tsx:227-235`（ChipRemove）
- **证据片段**:
  ```tsx
  // combobox.tsx:31-41 — 清除钮：图标即全部内容，无 aria-label / sr-only
  <ComboboxPrimitive.Clear
    data-slot="combobox-clear"
    render={<InputGroupButton variant="ghost" size="icon-xs" />}
    className={cn('nop-combobox ', className)}
    {...props}
  >
    <XIcon className="pointer-events-none" />
  </ComboboxPrimitive.Clear>
  // combobox.tsx:69 — ComboboxInput 内部自渲染 clear，未传名：{showClear && <ComboboxClear disabled={disabled} />}
  // combobox.tsx:228-234 — ChipRemove 同型：<ComboboxPrimitive.ChipRemove render={<Button variant="ghost" size="icon-xs" />} ...><XIcon /></...>
  ```
- **严重程度**: MEDIUM
- **现状**: 三个 icon-only 按钮的可访问名完全依赖消费方补传 `aria-label`：ComboboxInput 的内嵌 clear（line 69）与内嵌 trigger（render 自 ComboboxTrigger，内容仅 ChevronDownIcon）在组件内部组装时均未传名（Base UI 1.3.0 对 Clear/ChipRemove 无默认 aria-label，已核对 node_modules 内部实现）；ComboboxChip 的 ChipRemove 同样无名。本仓消费侧仅 `input-choice-renderers.tsx:399` 一处手动补了 `t('flux.common.clear')`，其余走 `ComboboxInput showClear` / chips 路径的用法全部无名。图标属组件自带、文案属组件职责——组件应自持默认可访问名。
- **行业惯例**: shadcn/ui 生态 icon-only 控件一律带 sr-only 文本或 aria-label（本仓 dialog/sheet/drawer 关闭钮 `<span className="sr-only">{t('...')}</span>` 即仓内基线）；Ant Design Select clear 有内置 `aria-label="clear"`。
- **用户影响**: 读屏用户在多选 chips 或可清空 combobox 中 Tab 到这些按钮时只听到"按钮"，不知道按下去会移除哪一项/清空什么；与同仓其他浮层关闭钮的"有名"体验不一致。
- **建议**: ComboboxClear 默认注入 `aria-label={t('flux.common.clear')}`（保留 props 覆盖）；ComboboxInput 内嵌 trigger 注入 `aria-label={t('flux.common.open')}` 或复用既有打开语义键（无则新增）；ChipRemove 在 ComboboxPrimitive.ChipRemove 上以 render 组合 `aria-label={t('flux.combobox.removeChip')}`（新增键，可带 chip 文本插值）。
- **复核状态**: 未复核

---

### [G6-R2-视角9-02] Dialog 拖拽说明 sr-only 段落从未被 aria-describedby 引用（同 id 重复渲染两份），对辅助技术永久静默

- **文件**: `packages/ui/src/components/ui/dialog.tsx:131,159-167,203-207,284-288`
- **证据片段**:
  ```tsx
  const descriptionId = React.useId(); // line 131
  // line 203-207 — DialogContent 内渲染说明 A
  {
    draggable ? (
      <p id={descriptionId} className="sr-only">
        {t('flux.dialog.moveDialogInstructions')}
      </p>
    ) : null;
  }
  // line 284-288 — DialogHeader 内渲染说明 B（同一个 id）
  <p id={dragContext.descriptionId} className="sr-only">
    {t('flux.dialog.moveDialog')}
  </p>;
  ```
- **严重程度**: LOW
- **现状**: 为"键盘移动对话框"准备了两段 sr-only 说明文案（i18n 已接），但全文件没有任何元素设置 `aria-describedby={descriptionId}`——弹窗 popup、header、触发器都没有引用该 id；两段 `<p>` 还共用同一个 `descriptionId`（重复 DOM id）。结果是：i18n 文案存在但任何 SR 用户永远听不到，键盘移动功能除 role="toolbar" 语义外无任何可用说明（round-01 [G6-视角9-05] 报的是 role 语义错误，本条是说明关联缺失的独立根因）。
- **行业惯例**: WAI-ARIA dialog pattern：操作说明须经 `aria-describedby`/`aria-label` 关联到 dialog 容器后才会被播报；sr-only 文本不关联任何元素即不可达。
- **用户影响**: 读屏用户聚焦 header 后只听到"toolbar"（round-01 已报其语义困惑），听不到"可用方向键移动对话框"的说明；SR-only 功能提示形同虚设。可见用户不受影响，故 LOW。
- **建议**: 二选一：① 在 `DialogPrimitive.Popup` 上加 `aria-describedby={draggable ? descriptionId : undefined}` 并删除 DialogHeader 内重复段落（保留 instructions 段）；② 若放弃 SR 说明路线，删除两段 `<p>` 与 descriptionId，改为 header 的 `aria-label={t('flux.dialog.moveDialog')}`（配合 [G6-视角9-05] 的 role 修正一并处理）。
- **复核状态**: 未复核

---

### [G6-R2-视角10-01] 列表高亮体系分裂：CommandItem 选中态用 bg-muted/text-foreground，Select/Combobox/Dropdown/ContextMenu 全族用 bg-accent

- **文件**: `packages/ui/src/components/ui/command.tsx:139`（对照 `select.tsx:117`、`combobox.tsx:133`、`dropdown-menu.tsx:121`、`context-menu.tsx:100`；令牌值 `packages/theme-tokens/src/styles.css:44-46,141-147,204-207`）
- **证据片段**:
  ```tsx
  // command.tsx:139 — Command 列表项高亮
  "... data-selected:bg-muted data-selected:text-foreground ...",
  // select.tsx:117 / combobox.tsx:133 / dropdown-menu.tsx:121 — 其余全部列表面
  "... focus:bg-accent focus:text-accent-foreground ..."（combobox 为 data-highlighted:bg-accent）
  ```
- **严重程度**: LOW
- **现状**: 同为"弹层内当前项高亮"语义，⌘K 命令面板项用 `bg-muted + text-foreground`，其余四个列表族（select 下拉、combobox 下拉、dropdown/context 菜单）统一 `bg-accent + text-accent-foreground`。默认主题 `--muted` 与 `--accent` 同值（210 40% 96%）故不可见；但项目支持的其余调色板两值分叉（如 `--accent: 217 89% 96%` vs `--muted: 210 40% 96%`，dark 下 217 30% 20% vs 217 33% 18%），非默认主题下命令面板高亮与下拉菜单高亮呈现两套颜色。上游 shadcn CommandItem 为 `data-selected:bg-accent data-selected:text-accent-foreground`，本移植改成了 muted。
- **行业惯例**: shadcn/ui 全部列表/菜单选择面统一 accent 高亮；本项目审查口径"内部做法不一无论行业惯例一律报跨组件不一致"。
- **用户影响**: 使用品牌调色板的宿主中，用户在命令面板与下拉菜单间切换时同一"当前项"概念呈现两种高亮色，键盘巡览的视觉连续性断裂；默认主题用户不可见，故 LOW。
- **建议**: `command.tsx:139` 的 `data-selected:bg-muted data-selected:text-foreground` 改为 `data-selected:bg-accent data-selected:text-accent-foreground`（与上游及全族对齐），连带核对 `data-selected:*:[svg]:text-foreground` 是否需同步为 accent-foreground。
- **复核状态**: 未复核

---

## 去重自检记录

与 round-01 全部 127 条（重点 G6 组 16 条）按根因比对：

- [G6-R2-视角3-01]（DialogHeader 焦点环）≠ [G6-视角9-05]（同组件 role="toolbar" 语义）——根因分别为"无焦点样式"与"role 误用"；同族先例 3-01/3-02 为焦点环根因，本条为其新实例，按 dedup §1 新实例规则上报。
- [G6-R2-视角3-02]（MenubarTrigger）≠ round-1 视角2 零发现结论（按钮 variant/语义分组范畴）——本条为焦点态缺失（视角 3），round-1 视角 3 未覆盖 menubar trigger。
- [G6-R2-视角6-01]（DrawerBody 滚动）≠ [G6-视角3-03]（Drawer 把手键盘可达）——根因分别为 body 滚动契约缺失与 resize 把手键盘操作缺失。
- [G6-R2-视角9-01]（combobox icon-only 无名）≠ [G6-视角9-01/02/03]（SidebarRail/CommandDialog/Spinner 硬编码英文）——本条根因是"无可访问名"，非"文案未 i18n"。
- [G6-R2-视角9-02]（孤儿 sr-only 说明）≠ [G6-视角9-05]——见上。
- [G6-R2-视角10-01]（Command 高亮色）≠ [G6-视角10-01]（菜单族勾选指示位置）——根因分别为高亮令牌分裂与指示器方位分裂。

## 转 C2 候选（dedup §2 已登记缺口的表象，不计入发现）

1. **G-H（移动端组件族，挂起）**: Sheet（bottom）无拖拽把手、无下滑手势关闭，同仓 Drawer（bottom）两者俱备——同 app 内两种 bottom sheet 交互模型不一致；属 G-H 移动端基座能力缺口范畴，R2 不重开。
2. **G-I（暗色回归，沿用 round-01 G6 组 C2 记录）**: `sonner.tsx` `theme ?? 'light'` 默认亮色、`json-viewer.tsx` react-json-view-lite `defaultStyles` 白底——本轮复查未发现新暗色 token 双源实例（全模块调色板类/hex/rgba/oklch grep 仅 badge success/warning 一处，round-01 已报）。

## 本组核对过且不构成发现的疑点（防后续轮次重复提问）

- `breadcrumb.tsx:11` `aria-label="breadcrumb"`、`pagination.tsx:11` `aria-label="pagination"`——shadcn 上游及 WAI-ARIA APG 惯用英文 landmark 名，非本仓 i18n 契约违背的可见实例，不报。
- `Empty` 根类仅 `border-dashed` 无 `border` 宽度类（视觉无边框）——与上游 shadcn empty.tsx 逐字一致，属上游范式，不报。
- `PaginationEllipsis` / `BreadcrumbEllipsis` sr-only 文本位于 `aria-hidden` 容器内不被播报——上游 shadcn 同款，且省略号装饰性静默本身可接受，不报。
- `DialogFooter showCloseButton` 追加在 children 之后（桌面端"关闭"落到主操作右侧）——全仓无消费方开启该开关（grep 仅 `showCloseButton={false}`），无可观测用户影响，不报。
- `input-group.tsx` `InputGroupButton size="sm"`（''）与 `Item size="sm"`（round-01 已报）不同型：sm 委托 Button 默认 h-8，有独立视觉结果，非死档，不报。
- `menubar.tsx:92` MenubarItem 缺 `data-disabled:pointer-events-none`——Base UI Menu.Item disabled 已阻断交互，opacity-50 视觉在位，无可见差异，不报。
- `table-row-class-name.ts` 的 `--table-hover-bg/--table-selected-bg/--surface-hover` 令牌——已在 `theme-tokens/src/styles.css:67,79-86` 全量定义（含暗色），无"悬空变量"，不报。
- `use-dialog-drag.ts` 拖拽越界——`clampOffset` 已做 30px 最小可见区钳制（line 63-88），键盘 Home 可复位，无"拖丢弹窗"风险，不报。
- SheetFooter `flex-col` vs DialogFooter `sm:flex-row`——与各自 shadcn 上游逐字一致，行业惯例优先级判不报。

## 覆盖记录

- 扫描模块数：**62/62 非 test 模块**（含 `direction.tsx`、`wrap-surface-tab-focus.ts`、`use-dialog-drag.ts`、`table-row-class-name.ts`、`sidebar-context.tsx` 等逻辑件）。`*.test.*` 按口径不在范围。
- 方法：全部模块通读或全量 grep 定向复核；针对盲区清单执行——① `tabIndex`/`outline-hidden`/`focus-visible` 全量 grep + 逐交互面核对（兄弟实例）；② 浮层族（dialog/sheet/drawer/alert-dialog/command/popover/combobox/select）组合态逐文件通读（跨组件组合）；③ disabled/aria-invalid/loading/empty 类串逐一比对（边缘态）；④ 调色板类/hex/rgba/oklch/硬编码英文 aria·title 全量 grep（暗色 token 与 i18n）；⑤ `use-dialog-drag.ts`/`wrap-surface-tab-focus.ts` 逻辑件通读（拖拽边界/焦点环游）。Base UI 1.3.0 内部实现按需核对 node_modules（Clear/ChipRemove 默认 aria-label 缺失佐证）。
- 静态口径声明：本轮为源码静态审查（无浏览器运行时验证）；涉及 flex 收缩/溢出的 [G6-R2-视角6-01] 结论基于类串推理 + 消费路径（dialog-host/detail-surface）源码核实，建议复核阶段以运行时快照确认。

## G7 — playground 19 页（HIGH 1 / MEDIUM 8 / LOW 1，共 10 条）

### [G7-R2-视角11-01] 导出下载链接指向 data: URL 且无 download 属性，现代浏览器拦截顶层导航，「点击下载」点击无任何效果

- **文件**: `apps/playground/src/complex-pages/page-schemas/crud-views-export.json:41-48`；`packages/flux-renderers-content/src/link.tsx:56-63`；`apps/playground/src/complex-pages/shared/showcase-env.ts:211-224`；`packages/flux-core/src/utils/url.ts:4-14`
- **证据片段**:
  ```json
  // crud-views-export.json:42-48 —— 页面唯一的文件交付出口
  {
    "type": "link",
    "testid": "export-download",
    "visible": "${exportUrl ? true : false}",
    "href": "${exportUrl}",
    "target": "_blank",
    "label": "点击下载"
  }
  ```
  ```ts
  // showcase-env.ts:219 —— 后端生成的就是 data: URL
  const dataUrl = `data:text/csv;charset=utf-8,${encodeURIComponent('\ufeff' + csv)}`;
  // link.tsx:56-63 —— 渲染为 <a href={dataUrl} target="_blank">，无 download 属性
  <a ... href={disabled ? undefined : href} target={target} rel={rel} ...>
  ```
- **严重程度**: HIGH
- **现状**: 该页主路径为「导出 CSV → 点击下载」。导出成功后 `exportUrl` 是 `data:text/csv` URL（`url.ts:6-8` 注释明确 data: 是本框架"既定的下载链接机制"），link 渲染为 `<a href="data:..." target="_blank">`。但 Chromium（Chrome/Edge，自 v60 起）与 Firefox（自 v59 起）均**拦截顶层 data: URL 导航**——包括 `target="_blank"` 新开标签页，控制台报 "Not allowed to navigate top frame to data URL"；唯一放行通道是 `download` 属性触发的下载，而 `LinkSchema`/`LinkRenderer` 不消费任何 download 属性（全仓 grep 无 download 支持）。既有测试只断言 `link.href` 形态（`complex-pages.test.tsx:152-157`），从未点击链接，故该断链在测试全绿下真实存在。
- **行业惯例**: 文件下载一律用 `download` 属性（同源/blob/data:）或后端真实 URL（Content-Disposition: attachment）；Ant Design/shadcn 生态的导出按钮直接触发浏览器下载而非让用户点第二跳转链接。
- **用户影响**: 用户点「导出 CSV（后台生成）」收到成功 toast 与「已生成 users-xxx.csv（共 N 条）→ 点击下载」，点击「点击下载」后浏览器毫无反应（Chrome/Edge/Firefox）——导出流程在最末一步 100% 断掉，用户以为导出坏了反复重试。通过真实用户影响检验。
- **建议**: 三选一：① `LinkRenderer`/`LinkSchema` 增加 `download` 属性透传（`<a download={slotProps.download ?? true}>`），schema 补 `"download": "users.csv"`；② crud-views-export 改用 button + `URL.createObjectURL`/程序化 `<a download>` click 的 action；③ mock 后端改返回 blob: URL + 保留 download 属性方案。推荐 ①（框架级能力，顺带覆盖所有数据绑定下载链接）。复核阶段建议在 Playwright Chromium 中实际点击验证拦截行为。
- **复核状态**: 未复核

---

### [G7-R2-视角4-01] tree-crud 部门筛选选中后无任何清除/重置路径：clearable 未启用且 radio 模式不可反选，用户被锁死在筛选态

- **文件**: `apps/playground/src/complex-pages/page-schemas/tree-crud.json:36-53`；`packages/flux-renderers-form-advanced/src/tree-controls.tsx:418-430`；`packages/flux-renderers-form-advanced/src/tree-options.ts:169-171`
- **证据片段**:
  ```json
  // tree-crud.json:36-45 —— input-tree 未配置 clearable
  { "type": "input-tree", "name": "deptId", "testid": "tree-crud-tree",
    "options": "${deptTree?.items}", "treeMode": "radio",
    "valueField": "value", "labelField": "label",
    "childrenKey": "children", "placeholder": "选择部门筛选" }
  // :50 —— 回显行只有 deptId 非空时才有意义，无重置入口
  "text": "当前过滤：${treeFilter?.deptId ? treeFilter.deptId : \"全部部门\"}"
  ```
  ```ts
  // tree-options.ts:169-171 —— 单选模式下点击已选中节点不反选，恒返回 candidate
  if (!multiple) {
    return candidate;
  }
  ```
- **严重程度**: MEDIUM
- **现状**: 渲染器本身支持 `clearable: true`（`tree-controls.tsx:418` 在 hasSelection 时渲染清除按钮，onChange 置空），但 schema 未配置。radio（单选）模式的 `toggleTreeSelection` 对已选中节点**不反选**（直接返回 candidate），故弹层内点原节点也无法取消。组合结果：用户一旦点选任何部门，页面右上「当前过滤」变为 d1，唯一能回到「全部部门」的方式是离开页面——筛选器变成单程陷阱。
- **行业惯例**: Ant Design TreeSelect 单选标配 `allowClear`；shadcn Combobox 筛选器提供清空动作；筛选类控件"可施加必须可撤销"是基础交互契约。
- **用户影响**: 用户筛选「研发中心」后想看全部用户，逐一点回树节点、点弹层外、找清除按钮均无效，只能刷新页面；会认为表格坏了或权限受限。通过真实用户影响检验。
- **建议**: 在 `tree-crud.json:44` 的 input-tree 上补 `"clearable": true`（渲染器零改动即出现清除按钮）；可同时在「当前过滤」行追加一个 ghost「重置」按钮（onClick setValue treeFilter.deptId ""）作为兜底路径。
- **复核状态**: 未复核

---

### [G7-R2-视角5-01] master-detail 未选择订单时右侧三个数据面以「暂无日志/暂无收货地址/暂无数据」呈现，空态语义与「请选择左侧订单」引导矛盾

- **文件**: `apps/playground/src/complex-pages/page-schemas/master-detail.json:88-92,325-338,342-360`
- **证据片段**:
  ```json
  // :88-92 —— 标题区分了「未选择」状态
  "text": "${mdFilter?.orderId ? \"订单详情\" : \"请选择左侧订单查看详情\"}"
  // :331 —— 但日志 tab 空态一律宣称“暂无日志”
  "empty": { "type": "text", "text": "暂无日志" },
  // :352 —— 地址卡片同病
  "empty": { "type": "text", "text": "暂无收货地址" },
  ```
- **严重程度**: LOW
- **现状**: 首屏（未选择订单）时 `sendOn: "mdFilter?.orderId"` 阻止了三个数据源请求（`orderLogs`/`orderAddresses` 为 undefined），标题正确引导「请选择左侧订单查看详情」，但同屏的详情字段全渲染「-」占位，订单明细表显示「暂无数据」、操作日志显示「暂无日志」、收货地址显示「暂无收货地址」——三个「暂无」宣称的是"该订单没有数据"，而真实原因是"还没有订单"。空态没有区分「前置条件缺失」与「数据为空」两种状态。同页标题已示范了条件表达式的正确写法，三个数据面未复用。
- **行业惯例**: AG Grid/Ant Design Pro 主从布局在未选中主记录时，从列表区显示"请先选择 X"引导或整块置灰，而不是渲染数据级空态；本项目内 detail-subtables 页用默认选中 o1 规避了同场景。
- **用户影响**: 首次进入页面看到"请选择订单"与四块"暂无/空"内容并排，需要自行推断哪些信息有意义；部分用户会把「暂无日志」误读为系统异常。影响为状态认知偏差，非操作阻断 → LOW。
- **建议**: 两个低成本方向任选：① 仿照 detail-subtables 给 `data.orderId` 一个默认值（如 `"o1"`），首屏即有完整主从数据；② 为 tabs/地址卡片区包一层 `visible: "${mdFilter?.orderId}"`，未选择时整块隐藏只留标题引导行。
- **复核状态**: 未复核

---

### [G7-R2-视角10-01] sundial 族「移到垃圾箱/垃圾桶」按钮样式跨页分裂：detail 页 destructive 红色实底，workbench 对话框内为 ghost 无警示色

- **文件**: `apps/playground/src/complex-pages/page-schemas/sundial-detail.json:905-909`；`apps/playground/src/complex-pages/page-schemas/sundial-workbench.json:2173-2178`
- **证据片段**:
  ```json
  // sundial-detail.json:906-909 —— destructive + danger 类
  { "label": "移到垃圾箱", "variant": "destructive",
    "className": "sd-btn sd-btn-danger flex-1", "testid": "sundial-detail-trash", ... }
  // sundial-workbench.json:2174-2177 —— 同语义动作在任务详情对话框里是 ghost
  { "label": "移到垃圾桶", "variant": "ghost",
    "className": "sd-btn sd-btn-ghost", "testid": "sundial-task-detail-trash", ... }
  ```
- **严重程度**: MEDIUM
- **现状**: 「把任务移入垃圾箱」是同一破坏性语义动作：detail 页底部为 `destructive`（红色实底），workbench 任务详情对话框内为 `ghost`（灰字、无任何警示色，与旁边「移到列表」ghost 视觉等权）。用户从 workbench 详情对话框学会"移到垃圾桶是普通操作"，到 detail 页又变成红色危险按钮；风险感知信号在同一产品内不一致。本条为第 1 轮 [G7-视角10-08]（standard-crud vs master-detail 行级删除样式分裂）的同类兄弟实例（dedup §1"同类根因新实例"规则允许报告），涉及时两个同族页面，修复需一次覆盖。
- **行业惯例**: 视角 10 基线"删除 = destructive 语义色"；Ant Design/iOS HIG 中破坏性动作在所有入口保持同一红色警示，不因入口不同而降级为普通按钮。
- **用户影响**: 在 workbench 对话框中，灰色 ghost 的「移到垃圾桶」与「移到列表」并排且点击即生效（配合第 1 轮已报的无确认问题），用户对破坏性操作的风险识别被削弱；切到 detail 页又需重新学习按钮语义。
- **建议**: `sundial-workbench.json:2176` 改为 `"variant": "destructive"` 并将 className 换为 `sd-btn sd-btn-danger`（与 detail 页 `:908-909` 完全同款）；或两处统一降为 ghost+红色文字（`text-[#d25151]`），二选一后全 sundial 族对齐。
- **复核状态**: 未复核

---

### [G7-R2-视角11-02] form-wizard 第二步收集的「部门」在确认步不回显、提交时不上送，用户选择被静默丢弃

- **文件**: `apps/playground/src/complex-pages/page-schemas/form-wizard.json:61-80,104-131,141-156`
- **证据片段**:
  ```json
  // :61-80 —— step2 用 picker 认真收集部门
  { "type": "picker", "name": "deptId", "label": "部门", "valueKey": "id", "labelKey": "name", ... }
  // :107-129 —— 确认步回显：姓名/邮箱/角色/预算/通知，唯独没有部门
  "text": "姓名：${wizardData.step1.name || \"-\"}",
  "text": "角色：${wizardData.step2.role || \"-\"}",
  ...
  // :146-152 —— onComplete 提交字段同样没有 deptId
  "data": { "name": "...", "email": "...", "role": "...", "budget": "...", "notify": "..." }
  ```
- **严重程度**: MEDIUM
- **现状**: 三步向导的第二步提供部门弹出选择器（可搜索、有列定义，是 step2 交互最重的控件），但确认步信息核对清单不含部门，`onComplete` 提交 payload 也只有 name/email/role/budget/notify。mock 后端 `User__save` 明明支持 `deptId` 入库（`showcase-env.ts:158-171`）。用户"核对信息并提交"时无法看到自己选的部门，提交后该字段无声消失。
- **行业惯例**: 向导确认步必须回显全部已收集字段（Ant Design Steps 演示/shadcn multi-step 表单惯例）；收集后不上送的字段要么不该收集、要么在确认页标注"仅本地保留"。
- **用户影响**: 用户在第二步花精力弹出选择部门，确认页看不到、提交后用户列表里也没有生效——"我选的部门去哪了"。对以展示向导能力为目的的 demo 页，这属于流程闭环缺口。通过真实用户影响检验。
- **建议**: ① 确认步补一行 `"text": "部门：${wizardData.step2.deptId ?? \"-\"}"`（labelKey 回显需按 id 查名，可参照 `sundial-detail.json:1254-1259` 三元/查表模式）；② `onComplete.args.data` 补 `"deptId": "${wizardData.step2.deptId ?? \"\"}"`。
- **复核状态**: 未复核

---

### [G7-R2-视角11-03] master-detail 未选择订单时「新增明细」可点击且报「新增成功」，记录以空 orderId 落库后在界面上永久不可见

- **文件**: `apps/playground/src/complex-pages/page-schemas/master-detail.json:232-259`；`apps/playground/src/complex-pages/shared/showcase-env.ts:300-310`
- **证据片段**:
  ```json
  // master-detail.json:233-241 —— 工具栏「新增明细」无任何 disabled 条件
  "toolbar": [ { "type": "button", "label": "新增明细", "testid": "btn-add-item",
                 "variant": "default", "onClick": { "action": "openDialog", ...
  // :253-259 —— 提交数据携带当前（可能为空的）orderId
  "data": { "sku": "${sku}", "name": "${name}", "qty": "${qty}", "price": "${price}",
            "orderId": "${mdFilter?.orderId}" }
  ```
  ```ts
  // showcase-env.ts:304 —— orderId 为空串时照样入库
  orderId: String(source.orderId ?? body.orderId ?? ''),
  ```
- **严重程度**: MEDIUM
- **现状**: 页面首屏未选择订单（`mdFilter.orderId === ""`），但订单明细 crud 的工具栏「新增明细」始终可点；对话框提交走 ajax 成功链，toast「新增成功」。mock 端以 `orderId: ''` 建记录，而列表查询恒按当前 orderId 过滤（`OrderItem__findPage` line 278-288），这条记录在任何选中状态下都不会再出现——对用户表现为"提交成功但数据消失"。同页标题条件表达式已证明作者知道"未选择"状态的存在，但未给按钮加 `disabled: "${!mdFilter?.orderId}"`。
- **行业惯例**: 依赖上下文对象的"新增子项"动作在宿主未选中时必须禁用或隐藏（Ant Design Pro 主从表/AG Grid context menu 惯例）；成功提示必须与真实持久化效果一致。
- **用户影响**: 用户未选订单直接点「新增明细」（首屏即可触达），填完表单点保存收到成功反馈，表格却仍是空——要么重试要么认为系统坏掉；孤儿数据同时污染会话内存库。判定说明：属功能缺陷（HIGH 档形态），因发生于"未按引导先选订单"的次要路径降级为 MEDIUM。
- **建议**: 给 toolbar 按钮补 `"disabled": "${!mdFilter?.orderId}"`；进一步可在对话框 title 或表单顶部注明所选订单号（如「为 NO-20240701 新增明细」）使提交上下文可见。
- **复核状态**: 未复核

---

### [G7-R2-视角11-04] sundial-detail 子任务详情对话框内容映射错误：点「整理 OKR 回顾」显示「整理发票」，父任务归属文案也指向另一条任务

- **文件**: `apps/playground/src/complex-pages/page-schemas/sundial-detail.json:645-648,1254-1266`
- **证据片段**:
  ```json
  // :646-648 —— 子任务 2 在列表中的标题
  { "type": "text", "text": "整理 OKR 回顾", "className": "text-sm text-[#0d0d0d]" },
  // :1256 —— 对话框标题按 activeSubtask 三元切换，但 #2 映射成了“整理发票”
  "text": "${activeSubtask === 1 ? \"收集销售数据\" : activeSubtask === 2 ? \"整理发票\" : \"撰写结论部分\"}",
  // :1264 —— 固定文案声称父任务是「整理季度报税材料」（那是 workbench 逾期任务 t1）
  "text": "子任务属于\"整理季度报税材料\"，完成后自动计入进度。"
  ```
- **严重程度**: MEDIUM
- **现状**: 子任务详情对话框采用了按 `activeSubtask` 切换标题的三元表达式（第 1 轮 [G7-视角11-05] 曾将其引用为正确范式），但映射数据本身错误：列表中 #2 是「整理 OKR 回顾」，对话框却显示「整理发票」（"发票"属于 workbench 的报税任务素材）；下方固定说明「子任务属于『整理季度报税材料』」与本页父任务「撰写季度复盘报告」直接矛盾。点行 → 所见与所选不符，且解释文案指向另一条任务，双重错位。
- **行业惯例**: 列表行 → 详情的"选择 → 展示所选"契约要求标题与归属描述均与所点行一致（AG Grid/Ant Design 明细抽屉模式）；第 1 轮 [G7-视角11-05] 判定先例同样适用。
- **用户影响**: 用户点「整理 OKR 回顾」的展开箭头，弹窗标题是「整理发票」、说明里父亲是另一条任务——比纯静态详情更迷惑，因为标题明明"会变"却变得不对，用户会怀疑数据错乱。通过真实用户影响检验。
- **建议**: `:1256` 第二分支改为「整理 OKR 回顾」；`:1264` 父任务文案改为「撰写季度复盘报告」（或引入按 activeSubtask 的说明字段）；若三条子任务共用说明，至少使归属名与本页标题一致。
- **复核状态**: 未复核

---

### [G7-R2-视角11-05] sundial-detail「列表」字段行动态值与静态色点标签同屏双显：初始即重复渲染「工作」，切换列表后同一行出现两个不同列表名

- **文件**: `apps/playground/src/complex-pages/page-schemas/sundial-detail.json:418-451`
- **证据片段**:
  ```json
  // :437-450 —— 同一行内：动态值 + 静态色点 + 静态「工作」文字
  { "type": "text", "text": "${list === 'work' ? '工作' : list === 'family' ? '家庭' : '收件箱'}",
    "className": "flex-1" },
  { "type": "text", "text": "", "className": "block w-2.5 h-2.5 rounded-full sd-list-dot-blue" },
  { "type": "text", "text": "工作", "className": "text-xs text-[#0d0d0d]" }
  ```
- **严重程度**: MEDIUM
- **现状**: 字段行的值区由表达式驱动（随 `list` 状态切换），行尾的彩色圆点（写死 `sd-list-dot-blue`）与「工作」文字标签却是静态节点。初始状态行内就渲染两个「工作」；通过「选择列表」对话框切到「家庭」后，行内呈现「家庭 … •工作」——同一行同时宣告两个不同列表。色点颜色也不随列表变化（设置页「列表」分区已示范 blue/orange/green/neutral 四色语义，`sundial-settings.json:1171-1246`）。
- **行业惯例**: Todo 类应用（TickTick/Things）的列表字段行 = 当前列表名 + 对应色点，二者必须同源联动；同一行展示两个互相矛盾的列表名是明确的状态渲染缺陷。
- **用户影响**: 用户改选列表后，行尾仍展示旧列表名与蓝点，无法确认切换是否生效；初见用户则疑惑为何"工作"出现两次。通过真实用户影响检验。
- **建议**: 删除行尾静态「工作」文字节点；色点改按 `list` 切换 className 成对 visible 写法（`list === 'work'` → `sd-list-dot-blue`、`'family'` → `sd-list-dot-orange`、否则 neutral，写法照抄本 schema 旗标行的成对 visible 模式 `:361-400`）。
- **复核状态**: 未复核

---

### [G7-R2-视角11-06] sundial-settings「自建服务器（即将推出）」选项可正常选中且保存成功，「即将推出」徽标与实际行为互相矛盾

- **文件**: `apps/playground/src/complex-pages/page-schemas/sundial-settings.json:842-846,878-884,993-1010`；`apps/playground/src/complex-pages/shared/showcase-env.ts:610-618`
- **证据片段**:
  ```json
  // :843-846 —— 徽标宣称“即将推出”
  { "type": "text", "text": "自建服务器", "className": "text-sm font-medium text-[#0d0d0d]" },
  { "type": "text", "text": "即将推出", "className": "sd-badge sd-badge-warning" }
  // :878-884 —— 但未选中/选中两份节点都可点击，直接写 mode=selfhost
  "onClick": { "action": "setValue", "args": { "path": "mode", "value": "selfhost" } }
  ```
  ```ts
  // showcase-env.ts:612,616 —— mock 把 selfhost 列为合法值并写库返回成功
  const validModes: SundialSettings['mode'][] = ['local', 'supabase', 'selfhost'];
  db.sundialSettings.mode = mode as SundialSettings['mode'];
  ```
- **严重程度**: MEDIUM
- **现状**: 同步方式三选卡中「自建服务器」带「即将推出」warning 徽标，但选中/未选中两份 schema 的 onClick 都照常 `setValue mode=selfhost`，点「保存」后 mock 校验通过并返回成功，页面 toast「保存成功（已写入演示后端）」，且「连接信息」卡（`visible: "${mode !== 'local'}"`）随之展示——徽标宣称不可用，交互与持久化却完全放行。第 1 轮 [G7-视角11-04] 的修复建议（对未实现导航"badge + 禁用点击"）恰好说明本页只做了 badge 一半。
- **行业惯例**: "即将推出/Coming soon" 项应禁用交互（disabled 行 + 视觉降透明，iOS 系统设置/Ant Design Menu 惯例）；可交互项不得携带"不可用"徽标。
- **用户影响**: 用户选「自建服务器」并保存，得到成功确认后进入"即将推出"的功能形态（还看到 Supabase 专属连接字段挂在自建模式下）——徽标与系统行为的矛盾让用户无法判断哪个信号可信。
- **建议**: 两份 selfhost choice-row 补 `"disabled": true`（flex 渲染器支持 onClick 禁用语义时可改用 visible+非交互容器；最低限度移除 onClick 并加 `opacity-60 cursor-not-allowed`）；或去掉「即将推出」徽标、在描述文案改为"演示形态，生产接入待定"使文案与行为一致。
- **复核状态**: 未复核

---

### [G7-R2-视角11-07] sundial-workbench 侧边栏「搜索」输入框无任何消费方：输入不影响任务列表，属死交互

- **文件**: `apps/playground/src/complex-pages/page-schemas/sundial-workbench.json:84-110`
- **证据片段**:
  ```json
  // :94-107 —— 侧边栏搜索框（icon + input-text）
  { "type": "icon", "icon": "search", "size": 14, "color": "#636363" },
  { "type": "input-text", "name": "search",
    "className": "sd-input flex-1", "placeholder": "搜索", "testid": "sundial-search" }
  // 全文件 grep：`"name": "search"` 仅此一处定义；无任何 `${search...}` 表达式消费
  ```
- **严重程度**: MEDIUM
- **现状**: 工作台侧边栏顶部是带放大镜图标的「搜索」输入框，这是 todo 应用最强的功能信号之一。但 schema 内没有任何节点引用 `${search}`（五个 collapse 分区的 visible 只依赖 `activeView`，任务行为纯静态），也没有搜索按钮/回车提交链。用户输入关键词后界面毫无反应。本条是第 1 轮 [G7-视角11-14]（「添加子任务…」输入无提交路径）的同类根因兄弟实例——"邀请输入却无任何效果的输入控件"，但位置在工作台首屏第一控件，可见度远高于前者，故按新实例单独报告。
- **行业惯例**: 搜索框必须存在可感知的过滤行为（实时过滤或提交后过滤 + 无结果态，TodoMVC/TickTick 惯例）；不可用的搜索应以 disabled 呈现或不展示入口。
- **用户影响**: 用户在工作台输入"复盘"，列表纹丝不动，无法区分"搜索坏了"与"没有匹配项"——首屏核心控件的可信度受损。通过真实用户影响检验。
- **建议**: 三选一：① 为每条任务行的 container 补成对 visible（`${!search || task.title.includes(search)}` 风格的表达式，写法与现有成对 visible 一致）；② 把搜索框换成 disabled 占位并去掉放大镜的强暗示；③ 标注"演示未接入"。推荐 ①（filterSundialTasks 已有后端先例，仅 demo 未接）。
- **复核状态**: 未复核

---

## 去重自检记录（与 round-01 按根因比对后丢弃的候选）

- **sundial-analytics 三个 chart onClick 的「聚焦：X」toast、detail/workbench 旗标行「旗标已切换」toast** —— 与 [G7-视角11-19]（状态切换冗余 toast）根因相同，按递归扩展指令第 4 条丢弃，修复时应随 20 处一并清理。
- **sundial 对话框「取消」为 ghost 而非 outline** —— [G7-视角10-09] 的修复建议本身推荐"补齐取消 ghost 钮（照抄 detail 页）"，sundial 族 ghost 取消是其既定复刻风格，不再另报。
- **approval-tasks 非 pending 状态对话框无 footer 取消钮** —— 经 `dialog-host.tsx:252,331` 核实默认 `showCloseButton=true`，标题栏 X 可关闭，不构成交互断链。
- **dashboard 图表行/表格行 flex 无 wrap** —— 第 1 轮扫描台账已对 dashboard 明确执行过「8（wrap 布局）」检查且未立发现，按去重不重复立案。
- **standard-crud 编辑对话框字段缺 placeholder（新增对话框有）** —— 编辑态字段已预填值，placeholder 无实际信息量，真实用户影响检验不通过，弃报。
- **business-document input-table `rowKey: "name"`（可编辑列作主键，重名即键冲突）** —— 需运行时构造重名行才能触发，静态证据不足，留待运行时复核阶段评估。

## 转 C2 候选（dedup-baseline §2 已登记缺口的表象，不计入发现）

1. **G-H（移动端主组件族 / 响应式断点）**：sundial-settings（240px 固定 rail）、sundial-detail（400px 固定卡）、sundial-todo-dialog、sundial-analytics 四页均无移动端 variant 与断点处理，而 sundial-workbench 已有声明式移动 stub——族内响应式覆盖不一致，属已登记缺口 G-H 的表象，不作为一致性发现。
2. **G-F（hover/选中态 schema 表达）**：本轮 3 处新发现（视角11-05 色点、视角11-06 选中卡、视角11-04 标题映射）的根治方案均指向同一原语——状态驱动的 className/内容绑定；原语落地后成对 visible 手写模式可整体退役。

## 本轮检查范围与方法

- **范围**: 19/19 张 schema 全量复读（含本轮 4 张 8 月 28 日有变动的文件），并交叉核对配套运行时证据：`shared/showcase-env.ts`、`shared/mock-backend.ts`、`page-data.ts`、`complex-pages.test.tsx`、`link.tsx`/`sanitize.ts`、`url.ts`、`tree-controls.tsx`/`tree-option-list.tsx`/`tree-options.ts`/`tree-control-controllers.ts`、`dialog-host.tsx`、`sundial-replica.css`（dot 类存在性）。
- **盲区对照**: empty 态（视角5-01）、disabled 配置（视角11-03/11-06）、组合场景 dialog×表单提交（编辑/审批/新增明细对话框逐一走查）、查询区+表格（R1 已查项不重复）、tabs×表格（master-detail/detail-subtables/dynamic-tabs）、跨页一致性剩余面（视角10-01 垃圾箱 variant、对话框按钮族复核）、响应式断点（转 C2 G-H）、error/loading schema 态（确认无 schema 级新实例，均已由 renderer 层 R1 覆盖）。
- **方法**: 逐页通读 + `grep` 交叉验证数据流（`${search}` 消费方、`dependsOn` 语义经 crud-loadaction 测试核实、`OrderItem__save` 空 orderId 落库路径、`toggleTreeSelection` 单选不反选、`isSafeNavigationUrl` data: 白名单与浏览器顶层导航拦截策略比对）。
