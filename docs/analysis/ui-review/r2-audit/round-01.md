# R2 第 1 轮初扫发现（round-01）

> 轮次: Round 01（初扫，全目标分组 7 组） · 审查日期: 2026-08-28 · worktree `nop-chaos-flux-ui-review` HEAD `0f183874a`
> 派发机制: opencode `task` / subagent_type=general × 7（每 fresh session），提示词 = `r2-audit/dispatch-shared-prefix.md`（skill 共享提示词前缀 + 第 1 轮 12 视角正文 + 附录 A 条目格式）
> session 证据链: G1 ses_fb7ada2c7ffegwRYcJM1aN43Nl · G2 ses_fb7ad91b9ffeGbIEThoci4jZK7 · G3 ses_fb79569c4ffeGgPGwO0Binp4tq · G4 ses_fb7ad6994ffeoDPKpvui3C4D4N · G5 ses_fb7ad4f86ffev5mC8joAQ3viH6 · G6 ses_fb7ad3248ffecmOr5tbnPWp50z · G7 ses_fb7ad0fc4ffe8zC2vgFZwdTaR5
> 主 agent 完整性检查: 127/127 条通过六要素程序化校验（≥8 行 / 证据片段 / 严重程度 / 行业惯例 / 具体修复方向 / 复核状态字段）+ HIGH 条目逐条人工抽读（证据↔结论逻辑链成立）
> 跨组去重预注（正式合并/驳回记录落 review.md）: [G7-视角2-01] 与 [G1-视角2-01] 同根因（`variant:"primary"` 不被 ui Button 支持——前者是 schema 使用面实例清单，后者是 renderer 契约缺陷本体），复核阶段合并裁定

## 覆盖率清单（14 renderer 包 + 62 ui 模块 + 19 页）

| 组  | 目标                                 | 发现                                 | 覆盖与口径                                                                                                                                                                                                                                                                                                                           |
| --- | ------------------------------------ | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| G1  | basic / content / layout             | HIGH 3 / MEDIUM 8 / LOW 4，共 15 条  | basic 28/28 非 test 文件；content 38/38（含 diff-view 子目录；test-support 不入审）；layout 16/16。静态代码审查（无浏览器运行时）；[G1-视角2-01] cva 未匹配回退经 node 实测（cva 0.7.1）。                                                                                                                                           |
| G2  | form / form-advanced                 | HIGH 0 / MEDIUM 13 / LOW 6，共 19 条 | form 50/50 非 test 文件；form-advanced 65/65。i18n 键完整性经脚本核对（139 键全可解析）；2 条静态语义推断（G2 高置信项）标注复核阶段 Playwright 确认。                                                                                                                                                                               |
| G3  | data / dashboard / pivot             | HIGH 1 / MEDIUM 16 / LOW 9，共 26 条 | data 80（28 个 JSX 渲染文件全读 + 52 个逻辑文件 grep 筛查）；dashboard 13（6 渲染文件全读 + 7 逻辑 grep）；pivot 8（3 全读 + 5 grep）。纯静态审查；G3-视角4-01 与 G3-视角5-01 两条高置信推断标注复核阶段用运行时快照确认。                                                                                                           |
| G4  | mobile / scheduling                  | HIGH 0 / MEDIUM 8 / LOW 6，共 14 条  | mobile 12/12 非 test 文件；scheduling 91/91（gantt 28 / kanban 28 / calendar 26 / barcode-input 14 / shared 1 / 根级 5，含 5 个 CSS；UI 承载文件逐文件通读，纯逻辑文件经全量枚举+定向 grep 确认无 UI 表面）。纯静态审查。                                                                                                            |
| G5  | ai / graph / map / industrial+editor | HIGH 1 / MEDIUM 8 / LOW 9，共 18 条  | ai 66/66（视觉面 21 文件全读，45 个逻辑文件 grep 确认零 JSX/className 输出）；graph 11/11；map 12/12；industrial 120/120（视觉面 8 文件全读，symbols 抽读，纯逻辑 grep 复核）。静态口径声明：graph/map/industrial（含 src/editor/ scada-editor-canvas）因 leafer/OpenLayers/xyflow 运行时依赖按静态口径，沿 R0 先例；ai 按源码口径。 |
| G6  | @nop-chaos/ui 62 模块                | HIGH 0 / MEDIUM 8 / LOW 8，共 16 条  | 62/62 非 test 模块全部扫描（theme-contract 仅存在 test 文件，已在组文件注明归并说明）；视角 12/12 覆盖，视角 1/2/5/12 零发现附核对说明。只读静态审查；令牌核对以 theme-tokens/tailwind-preset/ui styles live 值为准。                                                                                                                |
| G7  | playground 19 页                     | HIGH 1 / MEDIUM 13 / LOW 5，共 19 条 | 19/19 schema 全扫，无未扫页；sundial 5 页按视角 11/12 验收必查（视角 12 结论：无"默认组件堆叠"模板感违规）。静态口径：schema 推理渲染形态，关键结论经 renderer/运行时/CSS 源码核实。                                                                                                                                                 |

汇总: HIGH 6 / MEDIUM 74 / LOW 47，共 **127 条**。

静态口径声明汇总: G5 的 graph/map/industrial（含 editor）+ G7 全部 schema 页按静态口径（leafer/canvas 运行时依赖、schema 天然静态，沿 R0 先例）；其余组为源码静态审查（无浏览器运行时验证），其中 G2/G3 各 2 条高置信静态推断已标注复核阶段做运行时确认。

---

## G1 — basic / content / layout（HIGH 3 / MEDIUM 8 / LOW 4，共 15 条）

### [G1-视角2-01] `variant: "primary"` 未被 ui Button 支持，主操作按钮渲染为透明无背景

- **文件**: `packages/flux-renderers-basic/src/button.tsx:65,265-277`；`packages/flux-renderers-basic/src/basic-renderer-definitions.ts:228-243`
- **证据片段**:
  ```tsx
  // button.tsx:65 — 仅类型断言，无 'primary' → 'default' 的运行时归一化
  const variant = (props.props.variant ?? 'default') as ButtonVariant;
  // button.tsx:265-272 — variant 原样透传给 cva 驱动的 ui Button
  <Button
    ref={buttonRef}
    variant={variant}
    size={size}
  ```
  ```ts
  // basic-renderer-definitions.ts:230-238 — propContract union 只有 6 个合法值，无 'primary'
  anyOf: [
    { kind: 'literal', value: 'default' },
    { kind: 'literal', value: 'destructive' },
    { kind: 'literal', value: 'outline' },
    ...
  ]
  ```
- **严重程度**: HIGH
- **现状**: 项目自身架构文档 `docs/architecture/styling-system.md` §"Dialog / Form Action Button Convention" 明确规定主操作按钮写 `"variant": "primary"`（示例 JSON line 604/610），且仓库 8 处演示 schema（`apps/playground/src/complex-pages/page-schemas/standard-crud.json` 等，"新增"/"保存"按钮）都在使用 `variant: "primary"`。但 `ButtonSchema.variant` 合法值不含 `primary`，ui Button cva 变体表也无该键；已实测 `cva` 对未匹配 variant 只返回基类（`border-transparent bg-clip-padding`，无 bg/text/hover 类）——按钮渲染为透明背景、无 hover 反馈的裸文字。
- **行业惯例**: shadcn/ui / Ant Design / MUI 中 primary（主操作）按钮一律有最强视觉权重（实底色 + hover 态）；本项目文档亦将其定为强制约定。当前实际输出违反三者及项目自身规范。
- **用户影响**: 复杂页面的"新增""保存"等主操作显示为与普通文本几乎无异的裸文字，用户无法识别主操作、无法获得 hover 可按反馈；在高频 CRUD 主路径上直接破坏主路径清晰度（视角 11 的"主操作与次操作视觉权重相同/更弱"实害形态）。
- **建议**: 二选一做代码级修复：① 在 `button.tsx:65` 处做运行时归一化 `const v = variant === 'primary' ? 'default' : variant`（兼容文档约定）；② 扩展 ui `buttonVariants` 增加 `primary` 键（`'bg-primary text-primary-foreground [a]:hover:bg-primary/80'`，与 default 同体）并同步 `ButtonSchema.variant` 与 propContract union。推荐 ②，同时修正 `styling-system.md` 与 propContract 的口径差。
- **复核状态**: 未复核

---

### [G1-视角3-02] Button `href` 锚点路径下 disabled/loading 完全不生效：仍可导航、无任何禁用视觉

- **文件**: `packages/flux-renderers-basic/src/button.tsx:211-227,245-263`
- **证据片段**:
  ```tsx
  const handleClick = async (event: React.MouseEvent) => {
    if (effectiveDisabled) return;          // 仅跳过 action，未 preventDefault
    ...
  };
  const button = renderAsAnchor ? (
    <a
      ref={anchorRef}
      href={href}                            // disabled 时 href 仍在
      target={props.props.target}
      {...commonProps}                       // 无 aria-disabled / 无禁用样式
      onClick={(event) => void handleClick(event)}
  ```
- **严重程度**: HIGH
- **现状**: 配置了 `href` 的按钮在 `disabled: true` 或 `loading: true` 时：① `<a>` 无 `aria-disabled`、无 `pointer-events-none`/`opacity` 类，视觉上与可用状态完全相同；② 点击时 `handleClick` 只是提前 return，浏览器默认锚点导航照常发生——"禁用"按钮仍会跳转；loading 态同样可点击（重复导航）。同仓库 `flux-renderers-content/src/link.tsx:38-69` 对 disabled 的处理是正确基线（`preventDefault` + `href={disabled ? undefined : href}` + `aria-disabled` + `pointer-events-none opacity-60`）。
- **行业惯例**: Ant Design Button（`disabled` 阻断一切交互并置灰）、shadcn/ui Button（`disabled:pointer-events-none disabled:opacity-50`）、HTML 语义（`aria-disabled` + 移除可点击目标）均要求禁用链接/按钮不可激活且有视觉指示。
- **用户影响**: 作者显式禁用的链接按钮（典型场景：无权限时禁用"查看详情"、提交中禁用跳转）外观正常，用户点击后页面意外跳转——操作未被阻断，属于功能缺陷；表单提交中误点还会中断当前流程。
- **建议**: 在 `button.tsx` 锚点分支复用 link.tsx 模式：`href={effectiveDisabled ? undefined : href}`、`aria-disabled={effectiveDisabled || undefined}`、className 追加 `effectiveDisabled && 'pointer-events-none opacity-50'`，并补一条 disabled+href 的回归测试（`__tests__/button-href*.test.tsx` 目前无 disabled 用例）。
- **复核状态**: 未复核

---

### [G1-视角3-03] button-group `selectionMode` 选中态无任何视觉指示

- **文件**: `packages/flux-renderers-layout/src/button-group-renderer.tsx:110-134`
- **证据片段**:
  ```tsx
  <Button
    key={key}
    type="button"
    variant={variant as never}        // 选中后 variant 不变
    size={size as never}
    disabled={disabled}
    data-testid={`${props.meta.testid ?? 'button-group'}-item-${key}`}
    data-slot="button-group-item"
    data-item-index={index}
    data-item-key={key}
    data-selected={selected || undefined}   // 仅落 data 属性
    aria-pressed={selectionMode !== 'none' ? selected : undefined}
    onClick={() => handleClick(item, index, disabled)}
  ```
- **严重程度**: HIGH
- **现状**: `selectionMode: 'single' | 'multiple'` 是该组件的核心能力，点击后 `data-selected` / `aria-pressed` 确实更新，但：① 按钮的 `variant`/`className` 不随 `selected` 变化；② 全仓 grep 证实没有任何 CSS 规则匹配 `button-group-item` 的 `[data-selected]`（ui `button.tsx` 基类无 `data-selected` 分支；`flux-renderers-layout/src/styles.css` 无相关规则；仅 `flux-renderers-graph` 有自己的 `data-selected` 规则，不相干）。选中与未选中像素级相同。
- **行业惯例**: shadcn/ui ToggleGroup 选中项为 `data-[state=on]:bg-accent data-[state=on]:text-accent-foreground`；Ant Design Radio.Button / Checkbox.Button 选中态有明确的实底/描边差异；MUI ToggleButton 选中为 `ToggleButton-selected` 实底。
- **用户影响**: 用户点选"单选/多选"项后界面毫无反馈，无法得知当前选中集合（onChange 数据层在变，视觉层全盲）；这是"控件都能点但用户不知道发生了什么"的交互缺陷，且 selectionMode 一旦配置即处于高频交互路径。
- **建议**: 在 `button-group-renderer.tsx` 给选中项追加视觉类，如 `selected && groupVariant !== 'default' ? 'bg-primary/10 text-primary border-primary' : selected ? 'opacity-80' : undefined`；或按 shadcn 惯例统一为 `data-[selected]:bg-accent data-[selected]:text-accent-foreground` 写入 ui Button 基类（同时惠及其他 `data-selected` 使用方）。二选一后补 DOM 断言测试（`getComputedStyle` 验证选中项背景色变化）。
- **复核状态**: 未复核

---

### [G1-视角5-04] image / markdown 加载态为纯文本"加载中"，无 Spinner，与包内其他加载模式不一致

- **文件**: `packages/flux-renderers-content/src/image.tsx:177-192`；`packages/flux-renderers-content/src/markdown.tsx:69-80`
- **证据片段**:
  ```tsx
  // image.tsx:186-191
  className={cn(
    'nop-image nop-image-loading inline-flex items-center justify-center bg-muted text-xs text-muted-foreground',
    props.meta.className,
  )}
  >
    <span data-slot="image-loading">{t('flux.common.loading')}</span>
  ```
  ```tsx
  // markdown.tsx:76-79
  className={cn('nop-markdown', props.meta.className)}
  >
    {t('flux.common.loading')}
  ```
- **严重程度**: MEDIUM
- **现状**: 图片 fetcher 加载与远程 markdown 拉取期间只渲染灰底小字"加载中"，无 Spinner、无 role="status"。同批对照：`flux-renderers-basic/src/dynamic-renderer.tsx:264-267` 用 `<Spinner className="size-4" />` + 文本 + `role="status" aria-live="polite"`；`spinner.tsx`、`button.tsx:181-182` 也以 Spinner 为基线。
- **行业惯例**: Ant Design（Spin 包裹图片/内容）、MUI（CircularProgress）、shadcn/ui 生态（Spinner/Skeleton）均为旋转指示器 + 可选文案；纯文本 loading 被视为未完成态。
- **用户影响**: 弱网下图片/远程文档区域长时间只有一行静态小字，与相邻使用 Spinner 的加载区（如 dynamic-renderer）视觉语言不一致，用户难以判断"正在加载"还是"占位文案"。
- **建议**: 两处均改为 `<div role="status" aria-live="polite" className="... flex items-center gap-2"><Spinner className="size-4" aria-hidden="true" /><span>{t('flux.common.loading')}</span></div>`（从 `@nop-chaos/ui` 引入 `Spinner`），对齐 dynamic-renderer 模式。
- **复核状态**: 未复核

---

### [G1-视角5-05] dynamic-renderer / markdown 加载失败态为无样式纯文本，无 destructive 语义色与图标

- **文件**: `packages/flux-renderers-basic/src/dynamic-renderer.tsx:226-238`；`packages/flux-renderers-content/src/markdown.tsx:86-95`
- **证据片段**:
  ```tsx
  // dynamic-renderer.tsx:228-236
  <div
    className={cn('nop-dynamic-renderer', props.meta.className)}
    data-error=""
    ...
  >
    {t('flux.dynamicRenderer.error')}
    {visibleState.error instanceof Error ? visibleState.error.message : String(visibleState.error)}
  </div>
  ```
  ```tsx
  // markdown.tsx:94
  {
    fetchError ? t('flux.common.loadFailed') : hasEmpty ? emptyContent : null;
  }
  ```
- **严重程度**: MEDIUM
- **现状**: 远程 schema 加载失败与 markdown 拉取失败都渲染为一行继承前景色的普通文本（dynamic-renderer 还把 i18n 文案与原始 error message 直接字符串拼接），无红色/destructive 色、无警告图标、无 Alert 容器；`data-error` 属性已落 DOM 但无任何样式消费。对照同包 `alert-renderer.tsx:16-21` 已有完整错误语义样式（`bg-destructive/10 text-destructive border-destructive` + CircleAlertIcon）。
- **行业惯例**: Ant Design Result/Alert 错误态（红色图标 + 语义色）、shadcn/ui Alert `variant="destructive"`、MUI Alert `severity="error"` 均以语义色 + 图标呈现加载失败。
- **用户影响**: 用户提交页面后看到一段与正文混排的普通文字（含裸露的 error message），不知道操作已失败、也不知道可以重试；错误被"静默化"，属产品完成度缺口。
- **建议**: 复用 `@nop-chaos/ui` 的 `Alert` + `variant="destructive"`（或最低限度 `className="text-sm text-destructive"`）渲染失败态，错误正文用 `{message}` 单独成行；markdown.tsx 失败分支同样套用；两处补 `role="alert"`。
- **复核状态**: 未复核

---

### [G1-视角8-06] carousel 指示点按钮仅 8×8px，触摸目标过小

- **文件**: `packages/flux-renderers-content/src/carousel.tsx:305-317`
- **证据片段**:
  ```tsx
  <Button
    key={toSlideKey(item, index)}
    variant="ghost"
    data-slot="carousel-indicator"
    data-index={index}
    data-active={index === activeIndex ? 'true' : undefined}
    aria-label={t('flux.carousel.goToSlide', { index: index + 1 })}
    onClick={() => api?.scrollTo(index)}
    className={cn(
      'h-2 w-2 rounded-full p-0',
      index === activeIndex ? 'bg-primary' : 'bg-muted-foreground/30',
    )}
  />
  ```
- **严重程度**: MEDIUM
- **现状**: 指示点按钮实际可点区域 8×8px（`h-2 w-2 p-0`），低于项目自身 `icon-xs`（24px）最低档，也低于 WCAG 2.5.8 的 24px 最小目标建议。carousel 是移动端高频组件，`useIsMobile` 已在该包普遍使用，说明移动触达是明确场景。去重基线误报 #4 豁免的是 `icon-xs/icon-sm`（24px+）档位，8px 不在豁免范围。
- **行业惯例**: shadcn/ui carousel 演示的指示点虽小但一般外包 ≥16-24px 点击层；Ant Design carousel dot 有更大热区；MUI MobileStepper dot ≥8px 视觉但建议外包按钮 40px。业界共识：视觉小、热区大。
- **用户影响**: 手机上用户点指示点跳转幻灯片时频繁点空/误触相邻元素，多滑场景下需依赖滑动手势而指示点形同虚设。
- **建议**: 保留 8px 视觉圆点但扩大热区：外层改为 `relative h-6 w-6`（或给 Button 加 `h-6 w-6 p-0` + 内部 `span className="h-2 w-2 rounded-full ..."` 承担视觉），使可点区域 ≥24px。
- **复核状态**: 未复核

---

### [G1-视角1-07] diff 头部"上一文件/下一文件"按钮用文本字符 ↑/↓ 而非 lucide 图标

- **文件**: `packages/flux-renderers-content/src/diff-view/components/diff-header.tsx:44-67`
- **证据片段**:
  ```tsx
  <Button
    variant="ghost"
    className="nop-diff-nav-prev"
    disabled={!hasPrevFile}
    onClick={onPrevFile}
    aria-label={t('flux.diff.prevFile')}
    title={t('flux.diff.prevFile')}
  >
    ↑
  </Button>
  ...
    ↓
  ```
- **严重程度**: MEDIUM
- **现状**: 多文件 diff 头部的文件导航按钮以裸文本箭头字符 `↑` `↓` 作为图标。同仓库全部其他导航/关闭/展开语义均使用 lucide 组件（wizard `ChevronLeftIcon/ChevronRightIcon`、collapse `ChevronDownIcon`、alert `XIcon`、tabs/dropdown 同族）；文本字符与 lucide 线性图标在字重、尺寸、平台字体渲染上不一致（不同 OS fallback 字体形态不同）。且"上/下一个文件"语义惯例是水平 ChevronLeft/Right（与 wizard 一致），垂直箭头在此处方向语义也不匹配。
- **行业惯例**: shadcn/ui / Ant Design / GitHub diff 头部的文件导航均用图标字体族内一致的 Chevron/Arrow 图标；不以正文 Unicode 箭头充当图标。
- **用户影响**: 用户在 diff 场景看到与其他组件不同源、渲染不一致的"字符箭头"按钮，跨平台形态漂移；与 wizard 等同语义导航（上一步/下一步用水平 Chevron）方向语言互相矛盾。
- **建议**: 替换为 `import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'` 并渲染 `<ChevronLeftIcon className="size-4" />` / `<ChevronRightIcon className="size-4" />`（保留 aria-label），与 wizard 导航图标语言对齐。
- **复核状态**: 未复核

---

### [G1-视角7-08] diff 三栏导航栏硬编码 `bg-gray-50`，覆盖了包内已定义的 `--nop-diff-nav-bg` 令牌

- **文件**: `packages/flux-renderers-content/src/diff-view/components/diff-three-column-view.tsx:97`；`packages/flux-renderers-content/src/diff-view/diff-view.css:530-537`
- **证据片段**:
  ```tsx
  // diff-three-column-view.tsx:97
  <div className="nop-diff-three-col-nav flex items-center gap-2 px-2 py-1 border-b bg-gray-50">
  ```
  ```css
  /* diff-view.css:530-537 — 令牌已定义且已被类选择器应用，但被 utilities 层的 bg-gray-50 覆盖 */
  .nop-diff-three-col-nav {
    ...
    background: var(--nop-diff-nav-bg);
    border-bottom: 1px solid var(--nop-diff-nav-border);
  }
  ```
- **严重程度**: MEDIUM
- **现状**: 包内 diff-view.css 头部声明"All color values use variables; no hardcoded oklch outside defs"并为该导航栏定义了 `--nop-diff-nav-bg`，但 TSX 同时追加了 Tailwind 调色板类 `bg-gray-50`。Tailwind utilities 层优先级高于组件层规则，令牌值实际被死代码化；`gray-50` 是固定浅灰，宿主切深色主题时该条保持亮色，与周边 `--nop-diff-*` 变量驱动的区域形成断裂。这也是三包 grep 中唯一一处生产代码硬编码 Tailwind 调色板类。
- **行业惯例**: shadcn/ui 及本项目 styling 契约均要求语义表面色走设计令牌（`bg-muted` / CSS 变量）；Tailwind 官方亦将 `slate/gray-*` 定位为需谨慎的主题耦合色。
- **用户影响**: 暗色宿主下三栏冲突导航条突兀发亮，用户可见明显的明暗断裂；同时宿主通过覆盖 `--nop-diff-nav-bg` 定制导航条颜色时不会生效（静默失效）。
- **建议**: 删除 TSX 上的 `bg-gray-50`（CSS 侧 `var(--nop-diff-nav-bg)` 已就位），或若需要更明显的底色则改用语义类 `bg-muted/40`，与 alert info 层一致。
- **复核状态**: 未复核

---

### [G1-视角7-09] progress success/warning/danger 变体色用 oklch 字面量而非语义令牌，与 alert/badge 的令牌路径不一致

- **文件**: `packages/flux-renderers-content/src/styles.css:18-31`
- **证据片段**:

  ```css
  .nop-progress[data-variant='success'] [data-slot='progress-indicator'] {
    background-color: oklch(72% 0.17 152);
  }

  .nop-progress[data-variant='warning'] [data-slot='progress-indicator'] {
    background-color: oklch(75% 0.18 70);
  }

  .nop-progress[data-variant='danger'] [data-slot='progress-indicator'] {
    background-color: oklch(58% 0.22 27);
  }
  ```

- **严重程度**: MEDIUM
- **现状**: 三个语义状态变体直接写死 oklch 字面量。同包 `alert-renderer.tsx:16-21` 的同名语义走令牌（`bg-success-bg text-success border-success` / `bg-warning-*` / `bg-destructive`），timeline 点也走 `bg-success/bg-warning/bg-destructive`；`packages/ui` badge 的 success/warning 变体同样令牌化。progress 成为唯一一个自造状态色的语义色消费方，宿主主题覆盖 `--success`/`--warning`/`--destructive` 对其无效。
- **行业惯例**: shadcn/ui 语义状态色一律经 CSS 变量（`--color-success` 等）中转；本项目 `theme-compatibility.md` 明确"package CSS 优先读共享 CSS 变量而非硬编码色值（package-owned visuals）"。
- **用户影响**: 同一页面中成功态的 alert 绿色与成功态的 progress 绿色不是同一个绿（字面量 vs 令牌，值可漂移）；宿主换主题/暗色下 progress 状态色不跟随，状态语义色出现跨组件不一致。
- **建议**: 改为 `background-color: hsl(var(--success))` / `hsl(var(--warning))` / `hsl(var(--destructive))`（若令牌为 HSL 片段格式，则按 `@nop-chaos/tailwind-preset` 的映射惯例包装），并删除三段字面量。
- **复核状态**: 未复核

---

### [G1-视角4-10] text maxLineToggle 展开按钮把文字塞进 20px icon-xs 按钮，文字溢出按钮边界

- **文件**: `packages/flux-renderers-basic/src/text.tsx:158-174`
- **证据片段**:
  ```tsx
  <Button
    type="button"
    variant="ghost"
    size="icon-xs"
    data-slot="text-maxline-toggle"
    className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-primary"
    aria-expanded={expanded}
    aria-controls={toggleId}
    ...
  >
    {expanded ? t('flux.common.collapse') : t('flux.common.expand')}
  </Button>
  ```
- **严重程度**: MEDIUM
- **现状**: `size="icon-xs"`（24px）又被 `h-5 w-5` 覆盖为 20×20px，而按钮内容是完整文字"展开"/"收起"（中文两字 ≈28px 宽，英文 Expand/Collapse 更宽）。Button 基类有 `whitespace-nowrap` 且无 `overflow-hidden`，文字必然水平溢出 20px 方框、与正文/相邻元素重叠；点击热区与视觉框也严重不符。同文件 `TextCopyButton`（line 86-97）同尺寸下放的是 12px 图标，是 icon-xs 的正确用法，证明该按钮是误用模式。
- **行业惯例**: shadcn/ui `size="icon"` 系列约定 icon-only；文字型展开/收起用 `size="xs"` 文本按钮或 icon+ChevronDown/Up 组合（Ant Design Typography 展开动作为文字链接 `size-*`）。
- **用户影响**: 长文本折叠场景中"展开"两个字叠压在正文上、按钮框内居中错乱，用户看不清可点区域、易误点正文。
- **建议**: 移除 `size="icon-xs"` 与 `h-5 w-5`，改 `size="xs" variant="ghost"` 纯文字按钮（`h-6 px-2 text-xs`），或保留 icon-xs 尺寸但内容改为 `ChevronDownIcon/ChevronUpIcon className="size-3"` 并把文字放入 `aria-label`/Tooltip。
- **复核状态**: 未复核

---

### [G1-视角10-11] wizard 提交中按钮仅文字"提交中"，无 Spinner，偏离 button loading 统一模式

- **文件**: `packages/flux-renderers-layout/src/wizard-renderer.tsx:584-600`
- **证据片段**:
  ```tsx
  <Button
    type="button"
    size="sm"
    data-testid="wizard-next"
    data-slot="wizard-next-button"
    data-committing={lifecycle.committing || undefined}
    onClick={commitStep}
    disabled={lifecycle.committing}
  >
    {lifecycle.committing ? <span>{t('flux.wizard.committing')}</span> : null}
    {!lifecycle.committing ? (
      <span>{isLastStep ? finishLabel : nextLabel}</span>
    ) : null}
  ```
- **严重程度**: MEDIUM
- **现状**: 步骤提交（典型为表单保存/远端调用，耗时可超 2s）期间下一步按钮文字切换为"提交中"并 disabled，但没有旋转指示器。基础包 ButtonRenderer 的 loading 模式是 `<Spinner data-icon="inline-start" />` 替换左侧图标位（button.tsx:181-185），dynamic-renderer 亦用 Spinner；wizard 自成一体。另按钮宽度在"下一步 →"与"提交中"间变化导致布局跳动。
- **行业惯例**: Ant Design Button `loading`、shadcn/ui 生态 Spinner-in-button、MUI LoadingButton 均为按钮内旋转图标 + 保留/替换文字，且提交反馈统一走 Spinner 语言。
- **用户影响**: 长提交时用户只见静态文字变化，与站内其他 loading 按钮形态不一致，弱体验下不易确认"操作正在进行"；按钮宽度抖动会造成相邻元素位移。
- **建议**: committing 分支渲染 `<Spinner className="size-3.5" data-icon="inline-start" aria-hidden="true" />` + 文案（文案可保留），并给按钮加固定 `min-w`（如 `min-w-20`）抑制宽度跳动；从 `@nop-chaos/ui` 引入 `Spinner`。
- **复核状态**: 未复核

---

### [G1-视角9-12] scope-debug 默认标题与折叠提示为硬编码英文，未走 i18n

- **文件**: `packages/flux-renderers-basic/src/scope-debug.tsx:88-101`
- **证据片段**:
  ```tsx
  const title =
    typeof props.props.title === 'string' && props.props.title.length > 0
      ? props.props.title
      : 'Scope Debug';
  ...
  const scopeText = useScopeSelector((scopeData) => stringifyDebugValue(scopeData), Object.is, {
    enabled: shouldSubscribe,
    fallback: 'Expand to inspect scope.',
    paths: dataPaths,
  });
  ```
- **严重程度**: LOW
- **现状**: 未提供 `title` 时默认标题为硬编码 `'Scope Debug'`；折叠态 JSON 区显示硬编码英文 `'Expand to inspect scope.'`。同文件其余 UI 文案（调试/展开/收起）均已走 `t()`。这是 ma5-ux [视角9-02]（content 组件硬编码英文 fallback，已修复）的同类根因新实例——按去重基线 §1 规则属"新发现"。
- **行业惯例**: 该仓库自身基线即"用户可见文案必须经 `t()`"（`@nop-chaos/flux-i18n`，同包 button/page/text/alert 全部如此）。
- **用户影响**: 非英文宿主环境挂载 scope-debug 时出现英文残留文案；因 scope-debug 是调试面（category: advanced），影响面小。
- **建议**: 新增 i18n 键（如 `flux.scopeDebug.defaultTitle` / `flux.scopeDebug.expandHint`）并替换两处字面量，与同文件 `t('flux.scopeDebug.debug')` 的既有用法对齐。
- **复核状态**: 未复核

---

### [G1-视角10-13] 复制失败反馈不一致：json-view 静默失败，text 走 toast.error

- **文件**: `packages/flux-renderers-content/src/json-view.tsx:54-71,88-94`；对照 `packages/flux-renderers-basic/src/text.tsx:68-79`
- **证据片段**:
  ```tsx
  // json-view.tsx:68-70 — 失败分支为空
  } catch {
    // clipboard unavailable — copy is best-effort
  }
  ...
  <Button type="button" variant="outline" size="xs" onClick={() => void handleCopy()}>
    {copied ? t('flux.common.copied') : t('flux.common.copy')}
  </Button>
  ```
  ```tsx
  // text.tsx:75-78 — 同语义操作的既有基线
  toast.success(t('flux.common.copied'));
  ...
  toast.error(t('flux.common.copyFailed'));
  ```
- **严重程度**: LOW
- **现状**: 同为"复制到剪贴板"语义操作：text 的复制按钮失败时 `toast.error(t('flux.common.copyFailed'))`，成功时 toast + 图标切换；json-view 成功时按钮文字变"已复制"，失败时什么都不发生（按钮停在"复制"）。此外 text 用 `copyToClipboard()` 工具（含 execCommand 降级），json-view 直接 `navigator.clipboard`，非安全上下文下必然失败且无降级。
- **行业惯例**: Ant Design message.error / shadcn sonner toast error——剪贴板被拒（权限/HTTP）必须有失败反馈；同一产品内同语义操作的反馈模式应一致。
- **用户影响**: 用户在 JSON 视图点"复制"后按钮无变化，无法区分"已复制"与"复制失败"，在粘贴落空后才察觉，属次要路径上的反馈缺失。
- **建议**: json-view 改用 `@nop-chaos/flux-renderers-basic` 已导出的 `copyToClipboard()`（或直接引入该工具），失败分支 `toast.error(t('flux.common.copyFailed'))`、成功分支保留按钮态切换，与 text 对齐。
- **复核状态**: 未复核

---

### [G1-视角8-14] page 侧栏拖拽把手无键盘操作路径（role="separator" 不可聚焦）[scope-conflict]

- **文件**: `packages/flux-renderers-basic/src/page.tsx:152-167`
- **证据片段**:
  ```tsx
  <div
    data-slot="page-aside-resize-handle"
    role="separator"
    aria-orientation="vertical"
    aria-label={t('flux.page.asideResize')}
    className={cn(
      'absolute top-0 bottom-0 w-1 cursor-col-resize bg-transparent hover:bg-border transition-colors',
      asidePosition === 'right' ? 'left-0 -ml-1' : 'right-0 -mr-1',
    )}
    style={{ touchAction: 'none' }}
    onPointerDown={handleResizePointerDown}
  ```
- **严重程度**: LOW
- **现状**: 可拖拽侧栏把手是 `role="separator"` 的交互分隔条（ARIA 规范中可交互 separator 应可聚焦并支持方向键），当前仅 Pointer 事件驱动：无 `tabIndex`、无 `onKeyDown`（ArrowLeft/Right 调整宽度）、无 focus 态样式。鼠标/触摸用户可用；键盘用户无法调整侧栏宽度。
- **行业惯例**: shadcn/ui Resizable（react-resizable-panels）把手自带 `tabIndex` + 方向键 resize + focus ring；Ant Design 布局分割同类。
- **用户影响**: 键盘用户无法使用 resize 能力（仅影响次要布局微调，不阻断任何内容访问——侧栏内容本身仍可达），故按边界表标 `[scope-conflict]`：主要影响是交互模式缺口，兼涉 WCAG 2.1.1。
- **建议**: 把手补 `tabIndex={0}` + `onKeyDown`（ArrowUp/Down 或 Left/Right 以 ±16px 调 `asideWidth`，Home/End 到 min/max），并追加 `focus-visible:ring-2 focus-visible:ring-ring` 样式。
- **复核状态**: 未复核

---

### [G1-视角10-15] `info` 语义级颜色跨组件不一致：timeline 用 `bg-info` 彩色点，alert/badge/status 均作中性灰处理

- **文件**: `packages/flux-renderers-layout/src/timeline-renderer.tsx:23-30`；对照 `packages/flux-renderers-content/src/alert-renderer.tsx:16-21`、`packages/flux-renderers-content/src/status.tsx:8-21`、`packages/flux-renderers-basic/src/badge.tsx:8-15`
- **证据片段**:
  ```tsx
  // timeline-renderer.tsx:23-30
  const LEVEL_DOT_CLASS: Record<TimelineItemLevel, string> = {
    default: 'bg-muted-foreground',
    primary: 'bg-primary',
    success: 'bg-success',
    warning: 'bg-warning',
    error: 'bg-destructive',
    info: 'bg-info',
  };
  ```
  ```tsx
  // alert-renderer.tsx:17 — info → 中性 muted；status.tsx:15 / badge.tsx 同样把 info 映射为 secondary
  info: 'bg-muted/40 text-foreground border-border',
  ```
- **严重程度**: LOW
- **现状**: 同一 schema 词汇 `info` 级：timeline 事件点渲染为 `bg-info` 主题蓝点，alert 渲染为灰底中性条，badge/status 渲染为 secondary 灰徽标。项目内 4 个消费方 3:1 分裂；且 `badgeContracts` 描述写"Maps to bg-{level} tokens"（basic-renderer-contracts.ts:195）但 info 并未映射到 bg-info，契约描述与实现也不符。success/warning/error 三级在各组件间是令牌一致的，唯独 info 分裂。
- **行业惯例**: Ant Design 全家（Tag/Alert/Badge/Timeline）的 info 一律为蓝色系（processing）；三套均不同时按项目内一致性最高者——当前 3:1 的中性灰是多数派，timeline 为偏差方。
- **用户影响**: 用户在告警条里学到"灰色 = 提示级"，在时间线里却看到同词汇渲染成蓝色点，语义色认知需要按组件重新记忆；跨组件语义色一致性被破坏。
- **建议**: 二选一对齐：① timeline `info: 'bg-info'` 改为 `info: 'bg-muted-foreground'`（并入多数派中性处理）；② 反向统一 alert/status/badge 的 info 走 `bg-info`/info 令牌族。推荐 ①（改动面最小且符合 badgeContracts 描述的修正方向），并在 `docs/architecture/variant-vocabulary.md` 固化 info 映射口径。
- **复核状态**: 未复核

---

## 转 C2 候选（去重基线 §2 规则：能力缺口/声明未实现，不计入发现）

1. **tabs `closable` / `draggable` / `addable`**：`schemas.ts:124-161` 带注释声明（"amis closable/draggable/addable"），`basic-renderer-definitions.ts:581-583` 已注册为 designer 可编辑 props，但 `tabs.tsx` 全文不消费这三个字段——作者勾选后无任何效果（可关闭页签/拖拽排序/新增页签 UI 完全不存在）。
2. **dialog `draggable` / `allowFullscreen`**：`schemas.ts:76-79` 与 `surface-renderer-definitions.ts:191-192` 已声明并暴露给 designer，渲染链消费方 `flux-react/dialog-host.tsx` 仅消费 `resizable`（line 455），`draggable` / `allowFullscreen` 全仓 grep 无实现（`__tests__/audit-family-regressions.test.tsx:287-289` 仅断言字段声明存在）。

## 本组明确核对过且不构成发现的高频疑点（防复核重复提问）

- `container.tsx` / `flex.tsx` 的 `div+role="button"+tabIndex={0}`+Enter/Space —— 误报对照 #6 模式，且键盘激活已实现。
- alert 关闭按钮 ghost `size-6` icon-only + aria-label —— 符合基线（icon-xs/sm 豁免族 + 已有可访问名）。
- cards 可选中卡片的 `aria-pressed` 强制（ui Card primitive 升 role=button）—— 代码内已注明 CR P2-1 裁决，属既定决策。
- carousel 字幕渐变 `from-black/60 text-white` —— 图片上文字保护性 scrim，行业有意惯例，非语义色硬编码。
- qrcode 前景/背景 `#000000/#ffffff` —— QR 规范功能性默认值，schema 可覆盖，非主题色逃逸。
- content 包非 test 生产代码 grep 中文/英文硬编码 —— 零命中（ma5-ux 修复保持有效）；三包生产代码硬编码 Tailwind 调色板类仅发现 [G1-视角7-08] 一处。

## G2 — form / form-advanced（HIGH 0 / MEDIUM 13 / LOW 6，共 19 条）

### [G2-视角1-01] input-time 清除按钮使用文本字符 ✕ 而非 XIcon

- **文件**: `packages/flux-renderers-form/src/renderers/input-time-renderer.tsx:216-228`
- **证据片段**:
  ```tsx
  {
    clearable && inputValue && presentation.interactive ? (
      <Button
        type="button"
        size="icon-xs"
        variant="ghost"
        aria-label={t('flux.common.clear')}
        data-testid="time-clear"
        className="absolute right-1"
        onClick={() => handlers.onChange(undefined)}
      >
        ✕
      </Button>
    ) : null;
  }
  ```
- **严重程度**: MEDIUM
- **现状**: input-time（非 stepper 形态）的清除按钮直接渲染 Unicode 字符 `✕`（U+2715）作为图标内容；同仓库所有其他清除/移除控件（input.tsx:195、textarea-renderer.tsx:160、date-field-control.tsx:364/380、date-range-renderer.tsx:414/430、icon-picker.tsx:272、picker-renderer.tsx:473、upload-field.tsx:561 等）一律使用 lucide `<XIcon />`。
- **行业惯例**: shadcn/ui、Ant Design 全部使用矢量图标组件（X/close icon）而非文本字形；文本字形无法继承 `currentColor` 描边风格，且与 lucide 的 2px 圆头描边视觉不一致。
- **用户影响**: 同一表单里 date 字段的清除按钮是 lucide 细描边 X，time 字段旁边却是一个笔画更粗、字形迥异的 ✕ 字符；在未安装该字形的系统/字体栈上还可能回退为方框（tofu）。用户会注意到同语义操作的图标"长得不一样"。
- **建议**: 将 `✕` 替换为 `<XIcon className="pointer-events-none" />`（与 `input.tsx:195` 清除按钮写法一致），必要时补 `size-3.5` 对齐同级控件。
- **复核状态**: 未复核

### [G2-视角3-01] transfer 全选 Checkbox 的 indeterminate 用裸 data 属性传递，半选/全选视觉恒错

- **文件**: `packages/flux-renderers-form-advanced/src/transfer-renderer.tsx:369-378`
- **证据片段**:
  ```tsx
  {
    props.checkAllEnabled && props.onToggleAll && (
      <Checkbox
        checked={props.allChecked}
        data-indeterminate={props.someChecked && !props.allChecked}
        disabled={props.interactionDisabled || props.options.length === 0}
        onCheckedChange={() => props.onToggleAll?.()}
        data-slot="transfer-toggle-all"
        aria-label={
          props.checkAllLabel || t('flux.transfer.selectAll', { defaultValue: 'Select all' })
        }
      />
    );
  }
  ```
- **严重程度**: MEDIUM
- **现状**: 半选状态通过 `data-indeterminate={boolean}` 裸属性传递，而非 ui Checkbox 的 `indeterminate` prop（对照 `checkbox-group-renderer.tsx:148`、`tree-option-list.tsx:125` 均走 prop）。当表达式为 `false` 时 React 会渲染 `data-indeterminate="false"`；而 ui Checkbox 的样式类 `data-indeterminate:bg-primary data-indeterminate:border-primary` 及指示器逻辑 `data-indeterminate:[&>[data-check-icon]]:hidden`（`packages/ui/src/components/ui/checkbox.tsx:18,28`）是 presence 匹配，`"false"` 同样命中。Base UI 根组件仅在 `indeterminate` prop 为真时自产该属性，不会清除手工传入的 `data-indeterminate="false"`。结果是该全选框**无论何种状态都渲染为 primary 底 + MinusIcon 的半选外观**。
- **行业惯例**: shadcn/ui Checkbox 提供 `checked="indeterminate"` / indeterminate prop；Ant Design Checkbox 的 `indeterminate` 为受控 prop，半选态只在部分选中时出现。
- **用户影响**: transfer 候选区/已选区的表头全选框永远显示"半选"（减号）外观：全选后看似"未全选"，全不选时看似"已部分选"。用户无法从表头读出真实全选状态，只能逐行核对选项，属持续性状态误导。
- **建议**: 删除 `data-indeterminate` 属性，改为传入 `indeterminate={props.someChecked && !props.allChecked}`（与 `checkbox-group-renderer.tsx:148` 同款），让 Base UI 按状态自产属性。
- **复核状态**: 未复核

### [G2-视角4-01] input-number 同时配置 suffix 与 stepper（默认开）时二者视觉重叠

- **文件**: `packages/flux-renderers-form/src/renderers/input-number-renderer.tsx:239-243,262-300`
- **证据片段**:
  ```tsx
          style={{
            ...(prefix ? { paddingLeft: '2rem' } : {}),
            ...(suffix ? { paddingRight: '2rem' } : {}),
            ...(showStepper ? { paddingRight: '4rem' } : {}),
          }}
  ...
          {suffix ? (
            <span data-slot="suffix" className="pointer-events-none absolute right-3 text-sm text-muted-foreground">
              {suffix}
            </span>
          ) : null}
          {showStepper ? (
            <span data-slot="stepper" className="absolute right-1 flex flex-col">
  ```
- **严重程度**: MEDIUM
- **现状**: suffix 装饰锚定在 `right-3`（右缘 12px），stepper 容器锚定在 `right-1` 且宽 `w-6`（占据右缘 4–28px 区间），两者同为垂直居中，水平区间 [12,12+w] 与 [4,28] 重叠；suffix 又是 `pointer-events-none`，无法点击也不会让位。`showStepper` 默认开启（`showStepper !== false`），因此任何带 suffix（如 `%`、`元`、`kg`）的 input-number 都会出现单位文本与上下箭头按钮叠压。另外 `paddingRight` 两次 spread，suffix 的 2rem 恒被 stepper 的 4rem 覆盖，说明两槽位从未被同时设计过。
- **行业惯例**: Ant Design InputNumber 的 suffix 渲染在 `suffix` 独立槽位，与内嵌 stepper（`upHandler/downHandler`）互斥让位；shadcn InputGroup 通过 addon 槽位顺序排列 suffix 与按钮，不使用同锚点 absolute。
- **用户影响**: 带单位的数字字段（配置成本极低的常用形态）中，单位字符直接压在 stepper 箭头上，文字与图标互相穿插，既看不清单位也点不准按钮。
- **建议**: 二者共存时给 suffix 追加 `right-8`（避开 stepper 区间），或当 `suffix && showStepper` 同时成立时将 suffix 渲染进 InputGroup addon 槽（参照 `input.tsx` InputGroupFieldControl 的 `suffix` 路径）。
- **复核状态**: 未复核

### [G2-视角4-02] checkbox-group 的 maxSelected/minSelected 限制无任何用户可见反馈

- **文件**: `packages/flux-renderers-form/src/renderers/checkbox-group-renderer.tsx:79-103,158-195`
- **证据片段**:
  ```tsx
      if (nextChecked) {
        if (maxSelected !== undefined && selectedValues.length >= maxSelected) {
          return;
        }
        commit([...selectedValues, option.value]);
      } else {
        if (minSelected !== undefined && selectedValues.length - 1 < minSelected) {
          return;
        }
        commit(selectedValues.filter((candidate: unknown) => !Object.is(candidate, option.value)));
      }
  ...
          const cappedDisabled = !checked && maxReached;
          const effectiveOptionDisabled = groupDisabled || optionDisabled || cappedDisabled;
          const disabledTip = optionDisabled ? option.disabledTip : undefined;
  ```
- **严重程度**: MEDIUM
- **现状**: 达到 `maxSelected` 后未选中的选项被静默置灰（`cappedDisabled`），但 `disabledTip`/`title` 只处理 `option.disabled` 的场景，max 截断的禁用没有任何说明；处于 `minSelected` 下限时取消勾选则是点击无任何反应（静默 return）。两处限制均无计数提示、无 hint 文案。
- **行业惯例**: Ant Design Checkbox.Group 配合 max 场景的标准做法是给出计数（`已选 n/m`）或在禁用项上以 tooltip 说明原因；MUI Checkbox 组禁用Reason同理。无理由的灰化被普遍视为状态指示缺陷。
- **用户影响**: 用户勾满上限后，剩余选项突然变灰且不知道原因（"是坏了吗？"）；到达下限的表单里点取消勾选毫无反应，像控件失灵。
- **建议**: 给 max 截断的禁用项同样输出 `title`（复用 `disabledTip` 通道，如 `t('flux.form.maxSelectedReached', { max })`）；或在组头部渲染 `selectedCount/maxSelected` 计数；minSelected 拦截时用既有 `role="alert"` 错误槽输出一条一次性提示。
- **复核状态**: 未复核

### [G2-视角4-03] select 渲染器三种形态触发控件高度不一致（h-9 / h-8 / h-9）

- **文件**: `packages/flux-renderers-form/src/renderers/input-choice-renderers.tsx:379-401`
- **证据片段**:
  ```tsx
          ) : searchable ? (
            <ComboboxInput
              {...controlProps}
              className="w-full"
              placeholder={loadingWithRemote ? loadingText : (searchPlaceholder ?? triggerPlaceholder)}
              showClear={clearable}
              disabled={comboboxFrozen}
            />
          ) : (
            <div className="flex w-full items-center gap-1">
              <ComboboxTrigger
                {...controlProps}
                className="flex-1 h-8 rounded-lg border border-input bg-transparent px-2.5 pr-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive data-placeholder:text-muted-foreground"
  ```
- **严重程度**: LOW
- **现状**: 同一个 `select` 渲染器：searchable 形态走 `ComboboxInput`（ui Input 默认 `data-[size=default]:h-9` = 36px），非 searchable 形态的 `ComboboxTrigger` 硬编码 `h-8`（32px），移动端 `SelectMobileTrigger` 是 Button 默认 h-9（36px）。同一表单里一个可搜索、一个不可搜索的两个 select 并排时高度差 4px。
- **行业惯例**: 同一组件族在不同 modifier 下保持同一控件几何是基线要求（Ant Design Select 可搜索与否高度一致；shadcn SelectTrigger 单一 size 体系）。
- **用户影响**: 并排字段左右高度不齐，表单网格的基线被打破；对齐敏感的用户会直接察觉"这两个下拉不一样高"。
- **建议**: 将 `ComboboxTrigger` 的 `h-8` 改为与 ComboboxInput 相同的高度体系（去掉 `h-8` 用默认 h-9，或给 ComboboxInput 显式 `data-size="sm"`），三形态统一为同一 token。
- **复核状态**: 未复核

### [G2-视角4-04] picker 触发器 placeholder 无弱化样式，清除按钮空值时也常驻（禁用态）

- **文件**: `packages/flux-renderers-form-advanced/src/picker-renderer.tsx:449-474`
- **证据片段**:
  ```tsx
      <Button
        ref={triggerRef}
        type="button"
        variant="outline"
        size="sm"
        data-slot="picker-trigger"
        disabled={interactionDisabled}
        onClick={openDialog}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="truncate" data-testid="picker-selected-label" data-slot="picker-selected-label">
          {selectedLabel}
        </span>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        data-slot="picker-clear"
        disabled={interactionDisabled || selectedValues.length === 0}
  ```
- **严重程度**: LOW
- **现状**: 未选择时 `selectedLabel` 回退为 `t('flux.picker.placeholder')`（"Not selected"/未选择），但该 span 与真实选中值使用同一无差别样式（无 `text-muted-foreground`），placeholder 看起来像一个已选值；旁边的清除 X 在空值时仍渲染（仅 disabled），而同仓 date/date-range/input/input-textare 的清除控件均只在有值时出现（如 `date-field-control.tsx:370`、`input.tsx:278-279`）。
- **行业惯例**: shadcn/ui Select 的 placeholder 用 `data-placeholder:text-muted-foreground` 弱化；Ant Design Select 的 clear 图标仅在 hover 且有值时出现。
- **用户影响**: 首次使用 picker 的用户分不清"还没选"和"选了个叫『未选择』的值"；常驻的灰色 X 则暗示"有东西可清"。
- **建议**: 给 selectedLabel span 按是否有值切换 `text-muted-foreground`（参照 `select-mobile-renderer.tsx:153-158` 的既有做法）；将清除按钮改为 `selectedValues.length > 0` 时才渲染。
- **复核状态**: 未复核

### [G2-视角5-01] 上传进行中仅文本"上传中"，无 Spinner，违反本仓 Loading 约定

- **文件**: `packages/flux-renderers-form-advanced/src/upload-field.tsx:536-574`
- **证据片段**:
  ```tsx
                {entry.status === 'pending' ? (
                  <>
                    <span
                      className="ml-auto text-xs text-muted-foreground"
                      data-slot="upload-pending"
                    >
                      {t('flux.form.uploading')}
                    </span>
  ```
- **严重程度**: MEDIUM
- **现状**: 上传 pending 行的加载指示是纯文本"上传中"，没有 Spinner；本仓所有其他 async 加载（select/radio/checkbox-group 加载、tree 远程搜索 `tree-controls.tsx:199-200`、detail-view 打开/确认 `detail-surface.tsx:96`）统一使用 `<Spinner className="size-4" />` + 文案。上传恰是典型的长耗时操作。
- **行业惯例**: Ant Design Upload 的 uploading 条目带进度/旋转指示；shadcn 生态约定 spinner 图标 + sr-only 文案。纯静态文本不能传达"正在进行"。
- **用户影响**: 大文件上传时列表行看起来像"卡住的静态文字"，用户无法区分"上传中"与"忘点了"；与站内其他加载样式不一致也削弱了可信度。
- **建议**: 在 `data-slot="upload-pending"` 前加入 `<Spinner className="size-4" aria-hidden="true" />`（对齐 `tree-controls.tsx:199`），文案保留。
- **复核状态**: 未复核

### [G2-视角5-02] 超限文件被 maxSize/maxFiles 拒绝或截断时无任何界面反馈

- **文件**: `packages/flux-renderers-form-advanced/src/upload-field.tsx:314-356`
- **证据片段**:
  ```tsx
    function rejectFile(file: File, reason: string) {
      const payload = {
        type: 'reject',
        file: { name: file.name, size: file.size, type: file.type },
        reason,
      };
      void props.events.onReject?.(payload, eventCtx(payload));
    }
  ...
        } else if (maxFiles) {
          const remaining = Math.max(0, maxFiles - committedItems().length);
          selected = selected.slice(0, remaining);
        }
  ```
- **严重程度**: MEDIUM
- **现状**: 超过 `maxSize` 的文件走 `rejectFile`，只向 schema 的 `onReject` 事件分发 payload，组件自身不渲染任何提示；`maxFiles` 截断更是完全静默（多选时多出的文件直接丢弃）。若 schema 未挂 onReject（默认情况），用户选了 5 个文件只有 3 个出现，无任何解释。
- **行业惯例**: Ant Design Upload 对超限文件会插入 `status: 'error'` 的条目（内置 beforeUpload 拒绝提示）；MUI/CVS 类上传器同样以列表内错误条目回显。
- **用户影响**: 用户会认为"选了但没传上"或"网站坏了"，反复重选；多选场景下静默丢文件接近数据丢失体验。
- **建议**: 复用既有 error 条目通道：为被拒文件 `setItems(prev => [...prev, { status: 'error', id, name, message: t('flux.form.fileTooLarge') }])`；maxFiles 截断时同样插入一条 `t('flux.form.maxFilesReached', { max })` 错误条目（文案键需新增）。
- **复核状态**: 未复核

### [G2-视角5-03] form autoLoad/loadAction 拉数期间无任何 loading 指示，值到达即静默覆盖

- **文件**: `packages/flux-renderers-form/src/renderers/form-load-action.ts:40-105`（渲染面 `form.tsx:296-307,476-513`）
- **证据片段**:
  ```tsx
  void loadAction(undefined, {
    scope: loadLifecycleScopeRef.current,
    form: loadOwnedFormRef.current,
    signal: controller.signal,
  }).then((result) => {
    if (loadRequestIdRef.current !== requestId) {
      return;
    }
    if (result.ok && !result.cancelled && result.data != null) {
      loadOwnedFormRef.current.setValues(result.data as Record<string, unknown>);
    }
  });
  ```
- **严重程度**: MEDIUM
- **现状**: form 的 `loadAction`/`autoLoad` 发起后，表单壳层不渲染任何 loading 态（无 skeleton、无 spinner、不禁用字段）；字段以空值立即可编辑，响应返回后 `setValues` 直接覆盖。对照同仓字段级加载（select options 加载显示 Spinner、禁用控件），form 级加载是可见性缺口。
- **行业惯例**: Ant Design Form + 初始异步数据的惯例是 `Form loading`/skeleton 或至少禁用提交；AG Grid 等数据面均要求 loading 指示。耗时>2s 的数据加载无指示属于明显缺口。
- **用户影响**: 打开编辑表单时字段全空，用户开始手工填写，几秒后远程值到达把已输内容覆盖——既困惑又丢输入。用户不知道"表单正在初始化"。
- **建议**: 在 form runtime 暴露 loading 状态（loadAction in-flight 置位），FormRenderer 据此在 `data-slot="form-body"` 上叠加 `opacity-60 pointer-events-none` + `Spinner`（或 skeleton），加载完成后解除；至少在覆盖前对 dirty 字段跳过写入。
- **复核状态**: 未复核

### [G2-视角5-04] radio-group / checkbox-group 选项源为空时渲染空白，与 select 的空态提示不一致

- **文件**: `packages/flux-renderers-form/src/renderers/checkbox-group-renderer.tsx:117-201`（同类 `input-choice-renderers.tsx:575-624`）
- **证据片段**:
  ```tsx
        data-slot="checkbox-group-wrapper"
        data-mobile-stack={mobileStack ? 'true' : undefined}
        role="group"
        aria-label={groupLabel}
        aria-describedby={errorMessage ? errorId : undefined}
      >
        {loading ? (
          <span data-slot="checkbox-group-loading" role="status" aria-live="polite">
  ```
- **严重程度**: LOW
- **现状**: options 为空且不在 loading 时，radio-group/checkbox-group（及 button-group-select）渲染一个空壳容器，无任何空态文案；而 select 同场景有 `ComboboxEmpty`（"No results found"）兜底，transfer/tree/picker 也各有 Empty 提示。动态 options 源返回空数组时用户只看到"什么都没有"。
- **行业惯例**: Ant Design Radio/Checkbox 空组虽也不提示，但本项目 select 族已确立"空数据必须有有意义提示"的内部基线，跨组件应一致（视角 5/10 的对比基线）。
- **用户影响**: 表单里出现一块无任何内容的空白区域，用户以为是渲染错误或权限问题。
- **建议**: 三组选型控件在 `!loading && options.length === 0` 时复用 `t('flux.common.noResults')` 渲染一行 `text-sm text-muted-foreground` 占位（与 select 移动端 `select-mobile-renderer.tsx:244-245` 的空态同款）。
- **复核状态**: 未复核

### [G2-视角6-01] 移动端 select 多选 bottom sheet 无确认/完成按钮，showCloseButton=false 且仅靠点遮罩收起

- **文件**: `packages/flux-renderers-form/src/renderers/select-mobile-renderer.tsx:187-259`
- **证据片段**:
  ```tsx
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="nop-safe-bottom max-h-[80vh] gap-0"
        data-testid="select-mobile-sheet"
      >
        <SheetHeader className="nop-hairline nop-hairline-bottom">
          <SheetTitle className="truncate">{props.ariaLabel}</SheetTitle>
  ```
- **严重程度**: MEDIUM
- **现状**: 单选点选即关（`toggleMobileOption` 内 `setSheetOpen(false)`）没有问题；但 `multiple` 时勾选后 sheet 保持打开且没有任何"完成/确定"按钮，也没有右上/标题栏关闭 X（`showCloseButton={false}`），唯一的退出方式是点遮罩/ESC。用户不知道"选完了怎么收"。
- **行业惯例**: 移动端多选 bottom sheet 的标准结构（Vant Popup+Checkbox、Ant Design Mobile、iOS 风格 picker）都提供显式"确定/完成"动作；纯靠遮罩收起仅用于单选或浏览型面板。
- **用户影响**: 手机上多选完的用户会寻找确认按钮而找不到，最终试探性点击遮罩，不确定选择是否已保存；首次使用流畅度受挫。
- **建议**: `multiple` 时在 `SheetHeader` 右侧或选项区底部渲染 `<Button size="sm">完成</Button>`（onClick `props.setSheetOpen(false)`），或恢复 `SheetContent` 默认关闭按钮；保留遮罩关闭作为次要路径。
- **复核状态**: 未复核

### [G2-视角6-02] picker 对话框取消按钮用 ghost，违反本项目对话框按钮约定且与同包 detail 弹层不一致

- **文件**: `packages/flux-renderers-form-advanced/src/picker-dropdown.tsx:68-81`
- **证据片段**:
  ```tsx
        <DialogFooter>
          <Button type="button" variant="ghost" size="sm" onClick={props.onCancel}>
            {t('flux.common.cancel', { defaultValue: 'Cancel' })}
          </Button>
          <Button
            type="button"
            size="sm"
            data-slot="picker-confirm"
            disabled={props.confirmDisabled}
            onClick={props.onConfirm}
          >
  ```
- **严重程度**: MEDIUM
- **现状**: 取消= `ghost size-sm`、确认=默认 `size-sm`。本项目 `docs/architecture/styling-system.md` "Dialog / Form Action Button Convention" 明确规定次操作（取消）用 `outline`，且同包 `detail-view/detail-surface.tsx:87` 的取消按钮正是 `variant="outline"`（默认尺寸）。同为弹层 footer，两个组件两种规范。
- **行业惯例**: shadcn/ui DialogFooter 惯例 `[outline 取消, default 确认]`；Ant Design Modal 同为次要=outline/default 描边款。ghost 无边框用于行内次级操作，不用于对话框 footer 主次对。
- **用户影响**: 用户在 picker 弹窗与 detail 弹窗间切换时，同位置的"取消"一个有边框一个没有，主次按钮的视觉配对关系（描边 vs 实底）被打破，降低对"哪个是确认"的识别速度。
- **建议**: 将取消按钮改为 `variant="outline"` 并去掉 `size="sm"`（与 `detail-surface.tsx:87` 完全同款），确认按钮同步去掉 `size="sm"` 保持 footer 内两键等高。
- **复核状态**: 未复核

### [G2-视角7-01] select 搜索命中高亮使用硬编码 bg-yellow-200/dark:bg-yellow-800，未走设计令牌

- **文件**: `packages/flux-renderers-form/src/renderers/select-combobox-lists.tsx:16-33`
- **证据片段**:

  ```tsx
  function highlightText(text: string, query: string): ReactNode {
    if (!query) {
      return text;
    }

    const escapedQuery = escapeRegex(query);
    const parts = text.split(new RegExp(`(${escapedQuery})`, 'gi'));

    return parts.map((part) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={part} className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">
  ```

- **严重程度**: LOW
- **现状**: 下拉选项搜索命中高亮硬编码 Tailwind 原色 `bg-yellow-200 dark:bg-yellow-800`。默认主题下可用，但宿主换主题（本项目主题契约：CSS 变量 + 宿主可覆盖）时高亮色不跟随；两包范围 grep 仅此一处硬编码调色板类。
- **行业惯例**: Ant Design 提供 `token.highlight`；shadcn 生态惯用 `bg-accent`/`bg-primary/15` 等语义 token 做命中标记。硬编码 yellow 仅在浏览器原生 `<mark>` 默认样式中是"事实标准"。
- **用户影响**: 使用定制品牌主题的宿主里，下拉高亮仍是突兀的固定黄色，与周边强调色脱节；暗色模式下 `yellow-800` 亦可能与自定义暗色面板对比度失配。
- **建议**: 改为令牌化写法 `bg-warning/30 dark:bg-warning/20 text-foreground` 或 `bg-accent text-accent-foreground`（`<mark>` 默认粗体可保留），随主题变量联动。
- **复核状态**: 未复核

### [G2-视角8-01] array-editor / key-value 行操作按钮 size="sm" 放图标，与 combo/input-table/condition 的 icon-sm 方形规范不一致

- **文件**: `packages/flux-renderers-form-advanced/src/array-editor.tsx:144-192`（同构 `key-value.tsx:207-255`）
- **证据片段**:
  ```tsx
  <Button
    type="button"
    variant="ghost"
    size="sm"
    data-slot="array-editor-move-up"
    disabled={disabled || !canMoveUp}
    aria-label={`Move up ${labelBase}`}
    onClick={() => {
      if (readOnly || !canMoveUp) {
        return;
      }
      onMoveUp(index);
    }}
  >
    <ChevronUpIcon className="size-4" />
  </Button>
  ```
- **严重程度**: LOW
- **现状**: 同为"上移/下移/删除"三个 ghost 图标按钮，array-editor 与 key-value 用 `size="sm"`（h-8 + px-3 横向 padding，内容仅一个图标 → 视觉上左右留白很宽的胶囊按钮），而 combo-renderer（:179-216）、input-table-row（:207-244）、condition-item/group 用 `size="icon-sm"`（32px 方形）。同一 composite 家族里行操作控件几何不一致。
- **行业惯例**: 图标-only 按钮应用方形 size（shadcn `size="icon"` 族；本项目 dedup 基线亦登记 icon-xs/icon-sm 为行级操作规范尺寸）。
- **用户影响**: array-editor/key-value 的行尾操作按钮明显比 combo/input-table 的"胖"，同屏出现两种行操作密度；横向 padding 造成点击目标与视觉图形错位观感。
- **建议**: 将这三处 `size="sm"` 改为 `size="icon-sm"`（与 `input-table-row.tsx:209-235` 完全同款），保留现有 aria-label。
- **复核状态**: 未复核

### [G2-视角9-01] picker 多选选项列表 `<ul role="listbox">` 但子项无 `role="option"`，listbox 语义空壳

- **文件**: `packages/flux-renderers-form-advanced/src/picker-option-list.tsx:27-54`
- **证据片段**:
  ```tsx
  if (multiple) {
    return (
      <div className="max-h-72 min-h-32 overflow-y-auto rounded border border-border">
        <ul role="listbox" aria-multiselectable="true">
          {filteredOptions.map((option) => {
            const checked = pending.has(option.value);
            return (
              <li key={String(option.value)}>
                <Label
                  className={cn(
                    'flex cursor-pointer items-center gap-2 px-3 py-2 text-sm font-normal hover:bg-accent',
  ```
- **严重程度**: MEDIUM
- **现状**: 容器声明 `role="listbox" aria-multiselectable`，但列表行是 `<li><Label><Checkbox>…` 结构，没有任何元素带 `role="option"` / `aria-selected`。辅助技术读到"一个没有选项的列表框"。这正是 ma5-ux [视角3-02] 在 icon-picker 修复过的同类问题（icon-picker.tsx:215-232 现已 `role="listbox"` + 子项 `role="option"`+`aria-selected`），picker 多选列表是同根因新实例。单选形态用 RadioGroup（自带 radio 语义）无此问题。
- **行业惯例**: ARIA APG listbox 模式要求每个可选项为 `role="option"` 且携带 `aria-selected`；shadcn Select/Combobox 的选项层均由 Radix/Base UI 自动注入 option 语义。
- **用户影响**: 屏幕阅读器用户在 picker 对话框里听到"列表框，0 个选项"，无法按选项导航/获知选中态；触发的困惑是功能级的。
- **建议**: 参照 `icon-picker.tsx:227-242`：给每行可点击元素（Label 或行容器）加 `role="option"` + `aria-selected={checked}` + `aria-disabled`，并给 `<ul>` 补 `aria-label`；或直接复用 ui ComboboxList/ComboboxItem 的既有语义。
- **复核状态**: 未复核

### [G2-视角9-02] combo / input-table / transfer / picker 内置校验文案硬编码英文，未走 i18n（同包 condition-builder 已示范正确做法）

- **文件**: `packages/flux-renderers-form-advanced/src/combo-renderer.tsx:606-627`（同根因实例：`input-table-renderer.tsx:459-480`、`transfer-renderer.tsx:484-489`、`picker-renderer.tsx:547-556`）
- **证据片段**:
  ```tsx
  rules.push({
    kind: 'minItems',
    value,
    message:
      value <= 1
        ? `${schema.label ?? schema.name ?? 'Field'} requires at least one item`
        : `${schema.label ?? schema.name ?? 'Field'} requires at least ${value} items`,
  });
  ```
- **严重程度**: MEDIUM
- **现状**: 这四个选择/复合控件的 required/minItems/maxItems 内置消息为英文模板字符串拼接；同包 condition-builder（`condition-builder.tsx:80-82` `t('conditionBuilder.requiredMessage', { label })`）、tag-list/array-editor/key-value（`t('validation.required', { label })`）均已走 i18n。zh-CN 环境下用户会看到"部门 requires at least 2 items"这类中英混排校验错误。
- **行业惯例**: 低代码平台的内置校验文案必须随语言包走（Ant Design Form 内置规则全部经 locale）；本项目 flux-i18n 目录已具备 `validation.*` 命名空间。
- **用户影响**: 中文表单提交时弹出英文校验错误，用户直接感知"产品没做完"；错误信息是校验链路里可见度最高的文案。
- **建议**: 在 `flux-i18n/locales` 增加 `validation.minItems/maxItems`（带 `{{label}}`/`{{value}}` 插值）与 `validation.required` 复用，将四处 message 改为 `t('validation.minItems', { label, value })` 形态。
- **复核状态**: 未复核

### [G2-视角9-03] array-editor / key-value 的行标签、占位符与 aria-label 硬编码英文（含中英混排与用户可见 placeholder）

- **文件**: `packages/flux-renderers-form-advanced/src/array-editor.tsx:82-103,150-182`（同根因实例：`key-value.tsx:213-246,544-554`）
- **证据片段**:
  ```tsx
    const labelBase = itemLabel ? `${itemLabel} ${index + 1}` : `Item ${index + 1}`;
  ...
          placeholder={itemLabel ? `${itemLabel} ${index + 1}` : `Item ${index + 1}`}
          aria-label={itemLabel ? `${itemLabel} ${index + 1}` : `Item ${index + 1}`}
  ...
          aria-label={`Move up ${labelBase}`}
  ```
  （key-value.tsx:246 `${t('flux.form.remove')} entry ${index + 1}`、:544 ``t('validation.required', { label: `Entry ${Number(match[1]) + 1} key` })``）
- **严重程度**: MEDIUM
- **现状**: 无 `itemLabel` 时输入框 placeholder 显示硬编码英文"Item 1"（用户可见，非 aria-only）；上移/下移 aria-label 硬编码英文；key-value 的删除 aria-label 是译名+英文混排（zh-CN 读作"移除 entry 1"），key/value 必填校验标签硬编码"Entry 1 key"。同包 combo/input-table 的同语义按钮已用 `t('flux.form.moveUp', { defaultValue })`（combo-renderer.tsx:185-211），属同类 i18n 漏网新实例（dedup §1 允许报告）。
- **行业惯例**: 所有面向用户/辅助技术的默认文案走 i18n（Ant Design Transfer 的"第 {{index}} 项"即经 locale）；placeholder 属高可见文案。
- **用户影响**: 中文表单里 array-editor 空行显示"Item 1"，校验错误出现"Entry 1 key 不能为空"；读屏用户听到中英夹杂的按钮名。产品完成度缺口直接可见。
- **建议**: 新增/复用键：`flux.form.itemPlaceholder`（`{{index}}`）、`flux.form.entryLabel`；moveUp/moveDown/remove 统一改 `t('flux.form.moveUp', { defaultValue })` 并以 index 插值；key-value 校验 label 改 `t('flux.form.keyEntry', { index })` 拼接。
- **复核状态**: 未复核

### [G2-视角10-01] array-field 的 Add 按钮缺 PlusIcon（ma5-ux 同类问题在未修复路径上的新实例）

- **文件**: `packages/flux-renderers-form-advanced/src/composite-field/array-field.tsx:546-550`
- **证据片段**:
  ```tsx
  {
    addable && !readOnly && !presentation.effectiveDisabled && (
      <WrappedFieldAction variant="outline" size="sm" onClick={handleAdd}>
        {t('flux.form.addItem')}
      </WrappedFieldAction>
    );
  }
  ```
- **严重程度**: MEDIUM
- **现状**: 同包所有复合编辑器的 Add 按钮均带 `<PlusIcon className="size-4" />`（array-editor.tsx:594、key-value.tsx:622、combo-renderer.tsx:564、input-table-renderer.tsx:413，ma5-ux [视角1-01] 修复点即前两者）；唯 array-field 纯文本"添加项"无图标。dedup 基线明确"同类根因的新实例算新发现"。
- **行业惯例**: 视角 10 基线"新增 = ghost/outline + PlusIcon"；Ant Design 动态增减表单项的添加按钮均带 + 图标。
- **用户影响**: 同一表单里 array-editor 的添加按钮有 + 而 array-field 没有，"这是新增入口"的视觉信号弱一档；跨组件一致性破坏。
- **建议**: `<WrappedFieldAction variant="outline" size="sm" onClick={handleAdd}><PlusIcon className="size-4" />{t('flux.form.addItem')}</WrappedFieldAction>`，与 array-editor.tsx:592-596 同款（注意 flex 对齐 gap）。
- **复核状态**: 未复核

### [G2-视角10-02] array-field 的移除操作用纯文本按钮，偏离复合家族"行级删除 = ghost + Trash2Icon"约定

- **文件**: `packages/flux-renderers-form-advanced/src/composite-field/array-field.tsx:153-164`
- **证据片段**:
  ```tsx
  {
    removable && (
      <WrappedFieldAction
        variant="ghost"
        size="sm"
        className="mt-1 hover:text-destructive"
        disabled={removeBlocked}
        onClick={() => !removeBlocked && onRemove(index)}
        aria-label={t('flux.form.remove')}
      >
        {t('flux.form.remove')}
      </WrappedFieldAction>
    );
  }
  ```
- **严重程度**: LOW
- **现状**: 同为"删除一行/一项"操作：combo（combo-renderer.tsx:204-216）、input-table（input-table-row.tsx:232-244）、array-editor（array-editor.tsx:176-192）、key-value（key-value.tsx:239-255）均为 ghost + Trash2Icon + hover 变红；array-field 独用文本"移除"按钮（无图标、无 hover:text-destructive 之外的视觉警示，仅 `mt-1` 下挂）。
- **行业惯例**: 本仓视角 10 基线"行级删除 = ghost + Trash2Icon + 可选确认"；Ant Design 动态列表删除同样以图标为主。
- **用户影响**: 同一表单两种删除范式（图标 / 文字），破坏"同语义同图标"预期；文本按钮占宽更大，也改变了条目动作区的对齐节奏。
- **建议**: 改为 `<WrappedFieldAction variant="ghost" size="icon-sm" className="hover:text-destructive" aria-label={t('flux.form.remove')}><Trash2Icon className="size-4" /></WrappedFieldAction>`，与 combo-renderer.tsx:204-216 同款。
- **复核状态**: 未复核

---

## 转义与归属说明

- **`[scope-conflict]` 条目**: 无。所有发现均以用户可见视觉/交互为主影响归属；视角 9 三条均为 ARIA/i18n 的 UX 可见面，未涉及维度 09-12 建模契约。
- **转 C2 候选**: 无。本组未撞见 dedup-baseline §2 已登记 16 项能力缺口的新表象。
- **误报自查**: 已按 dedup §3 排除——`value-input.tsx:397-420` 的 `opacity-0` NativeSelect 作多选添加触发器（标准模式，未报）、各处 `ml-auto` 对齐（未报）、行级 ghost 删除/`hover:text-destructive`（未报）、`icon-xs/icon-sm` 小尺寸按钮（未报）、截断类 `truncate`（均有可读全文途径，未报）、`div+role="button"+tabIndex`（未报）。

## 覆盖记录

- flux-renderers-form：50/50 非测试文件全覆盖（36 个 tsx/UI 组件逐行通读；definitions/index/form-definition/form-rules/form-init-action/form-lifecycle-helpers/hidden-field-policy-schema/input-contracts/input-shared/input-choice-utils/date-utils/date-presets/date-renderer-definitions/use-dict-options/use-select-remote-search/mobile-touch-utils/field-utils\_\*/shared/index/schemas.ts/form-renderers.css 为纯逻辑/样式契约文件，经 grep（图标/颜色/aria/i18n/按钮变体/loading）扫描 + 定向抽查，无用户可见 UI 发现；hidden-renderer.tsx 渲染隐藏 input，无可见 UI）。
- flux-renderers-form-advanced：65/65 非测试文件全覆盖（24 个 UI 组件逐行通读；tree-control-controllers/tree-control-sources/tree-options/composite-field 逻辑件/variant-field controller 族/detail-view 逻辑件/option-normalize/key-value-normalizer/picker-helpers/editor-schemas/upload-schemas/id-utils/operators/types/utils/projected-\* 等纯逻辑文件经同套 grep 扫描 + 定向抽查）。

## G3 — data / dashboard / pivot（HIGH 1 / MEDIUM 16 / LOW 9，共 26 条）

### [G3-视角3-01] 表格列宽拖拽手柄可键盘聚焦但无 focus-visible ring

- **文件**: `packages/flux-renderers-data/src/table-renderer/table-header-row.tsx:153-163`
- **证据片段**:
  ```tsx
  const resizeHandleProps = {
    'data-slot': 'table-column-resize-handle' as const,
    'aria-label': t('flux.table.resizeColumn'),
    role: 'separator' as const,
    'aria-orientation': 'vertical' as const,
    tabIndex: 0,
    onPointerDown: resizeStart,
    onKeyDown: resizeKeyDown,
    className:
      'absolute right-0 top-0 h-full w-1 cursor-col-resize select-none hover:bg-primary/40',
    style: { touchAction: 'none' },
  };
  ```
- **严重程度**: MEDIUM
- **现状**: 列宽调整手柄是 `tabIndex=0` 的可聚焦元素（支持 ArrowLeft/ArrowRight 键盘调宽），className 只有 `hover:bg-primary/40`，没有任何 `focus-visible:ring-*` / `focus-visible:outline-*` 声明。
- **行业惯例**: shadcn/ui 全部可交互元素基类含 `focus-visible:ring-[3px] focus-visible:ring-ring/50`（本项目 `packages/ui/src/components/ui/button.tsx` 同款）；AG Grid 列边缘拖拽手柄键盘聚焦时有明确高亮。
- **用户影响**: 键盘用户 Tab 到手柄后屏幕上看不到任何焦点指示，不知道焦点在哪、也无法确认 ArrowLeft/Right 操作会作用于哪一列；真实使用中会反复丢焦点。
- **建议**: 在 className 追加 `focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:bg-primary/60`（与同文件 header 交互元素的 ring 令牌一致）。
- **复核状态**: 未复核

### [G3-视角3-02] 行拖拽排序手柄可键盘聚焦但无 focus-visible ring

- **文件**: `packages/flux-renderers-data/src/table-renderer/table-body-row-rendering.tsx:241-246`（配合 `use-row-drag-sort.ts:226-248`）
- **证据片段**:
  ```tsx
  <span
    {...dragHandleProps}
    className="inline-flex h-6 w-6 items-center justify-center rounded hover:bg-accent"
  >
    <GripVerticalIcon className="size-4" />
  </span>
  ```
  ```ts
  role: 'button' as const,
  tabIndex: 0,
  'aria-label': t('flux.table.dragToReorder'),
  ```
- **严重程度**: MEDIUM
- **现状**: 拖拽手柄是 `role="button"` + `tabIndex=0` + ArrowUp/Down 键盘重排（H6 已实现键盘操作链路），但视觉 className 只有 `hover:bg-accent`，缺 focus-visible ring。
- **行业惯例**: shadcn/ui 可交互基类均有 `focus-visible:ring-*`；MUI DataGrid 行拖拽手柄（GridDragIcon）聚焦时显示焦点环。
- **用户影响**: 键盘用户能 Tab 到手柄并用方向键移动行，但全程看不到焦点位置，无法确认当前操作的是哪一行的手柄；键盘重排功能事实上不可用。
- **建议**: className 追加 `focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none`。
- **复核状态**: 未复核

### [G3-视角3-03] 独立 pagination renderer 禁用态按钮无视觉禁用样式

- **文件**: `packages/flux-renderers-data/src/pagination-renderer.tsx:238-249, 312-324`
- **证据片段**:
  ```tsx
  <PaginationPrevious
    data-testid="pagination-prev"
    aria-disabled={!canGoPrev}
    data-disabled={!canGoPrev || undefined}
    onClick={(event) => {
      event.preventDefault();
      if (canGoPrev) {
        handlePageChange(clampedCurrentPage - 1);
      }
    }}
  />
  ```
- **严重程度**: MEDIUM
- **现状**: 首页时"上一页"、末页时"下一页"只设置了 `aria-disabled` / `data-disabled` 语义属性，点击在 JS 里被 guard，但没有加任何 `opacity-50` / `pointer-events-none` 类，视觉上与可用状态完全相同。同包 `table-pagination-bar.tsx:82-84` 和 `crud-renderer-toolbar.tsx:128-135` 的禁用分页按钮都有 `pointer-events-none opacity-50`。
- **行业惯例**: Ant Design Pagination 禁用项呈半透明置灰；shadcn/ui 分页在消费侧普遍加 `aria-disabled + opacity-50 pointer-events-none`。
- **用户影响**: 用户在第一页看到"上一页"箭头与可用状态无异，点击无任何反应也无视觉反馈，会误以为按钮坏了；同一项目其它表格分页又是灰色的，体验不一致。
- **建议**: 与 TablePaginationBar 对齐：`className={cn(!canGoPrev && 'pointer-events-none opacity-50')}`（PaginationNext 同理）。
- **复核状态**: 未复核

### [G3-视角3-04] dashboard 编辑画布面板与画布体 tabIndex=0 无 focus-visible ring

- **文件**: `packages/flux-renderers-dashboard/src/editor/editor-canvas.tsx:197-232`
- **证据片段**:
  ```tsx
  <div
    data-slot="dashboard-editor-canvas-body"
    role="region"
    aria-label="Dashboard editing canvas"
    className="relative"
    style={{ width: '100%', height: Math.max(canvasHeight, 120) }}
    tabIndex={0}
    onKeyDown={handleKeyDown}
  >
  ```
  ```tsx
  data-selected={selected ? 'true' : undefined}
  role="button"
  tabIndex={0}
  aria-label={`Dashboard panel ${panel.id}`}
  className={cn(
    'group absolute flex min-h-0 flex-col overflow-hidden rounded-xl border bg-card shadow-sm',
    selected ? 'border-primary ring-2 ring-primary/60' : 'border-border hover:border-primary/50',
  )}
  ```
- **严重程度**: MEDIUM
- **现状**: 画布体与面板都是 `tabIndex=0` 的可聚焦元素（面板还承担选中/删除快捷键入口），className 只有 hover/selected 态，无 `focus-visible:*`。
- **行业惯例**: shadcn/ui 基类 focus-visible ring；本项目其它 `tabIndex=0` 自定义元素（table row、tree item、list item）全部补了 `focus-visible:ring-2 focus-visible:ring-ring`。
- **用户影响**: 键盘用户在编辑器里 Tab 时完全看不到焦点落在哪个面板上；Delete 删除、⌘Z 撤销作用对象不明，容易误删。
- **建议**: 画布体与面板 className 追加 `focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none`（面板可加 `focus-visible:border-primary`）。
- **复核状态**: 未复核

### [G3-视角2-01] dashboard 编辑器头部 Save 主操作用 outline 变体，视觉权重低于模式切换按钮

- **文件**: `packages/flux-renderers-dashboard/src/editor/dashboard-editor-renderer.tsx:239-292`
- **证据片段**:
  ```tsx
  <Button type="button" variant="outline" size="sm" data-testid="editor-save"
    disabled={!session.dirty}
    onClick={() => { const result = core.commit(); ... }}
  >
    <Save className="size-3.5" />
    {t('flux.dashboard.editor.save')}
  </Button>
  <div className="ml-auto">
    <Button type="button" variant={mode === 'edit' ? 'default' : 'outline'} size="sm" ...>
  ```
- **严重程度**: LOW
- **现状**: 编辑器的第一主操作"保存"固定 `variant="outline"`，而右侧的 edit/preview 模式切换按钮在 edit 模式下是 `variant="default"`（实心主色），视觉权重高于 Save。
- **行业惯例**: shadcn/ui workbench / Ant Design Pro 工具栏中，主操作（保存/发布）用 default/primary 实心，模式切换、撤销等次操作用 outline/ghost。
- **用户影响**: 首次使用编辑器的用户扫一眼头部，注意力先落在模式切换按钮上，改完布局后容易找不到/忽略保存入口（尽管有 disabled-until-dirty 的正确逻辑）。
- **建议**: Save 改为 `variant="default"`；模式切换改为 `variant="outline"`（或用 ToggleGroup 语义表达当前模式）。
- **复核状态**: 未复核

### [G3-视角2-02] 行级快速编辑保存条按钮顺序违反项目 [secondary, primary] 约定

- **文件**: `packages/flux-renderers-data/src/table-renderer/use-row-quick-edit-draft.tsx:272-291`
- **证据片段**:
  ```tsx
  <Button
    type="button"
    variant="default"
    size="sm"
    disabled={!rowDraft.isRowDirty || rowDraft.saving}
    onClick={() => void rowDraft.runSave()}
  >
    {t('flux.common.save')}
  </Button>
  <Button
    type="button"
    variant="outline"
    size="sm"
    disabled={rowDraft.saving}
    onClick={rowDraft.cancelEditing}
  >
    {t('flux.common.cancel')}
  </Button>
  ```
- **严重程度**: MEDIUM
- **现状**: 行内快速编辑的保存条渲染为 [保存(default 实心)] [取消(outline)]，主操作在左、次操作在右。同包 `table-quick-edit-cell.tsx:162-171` 的 dialog footer 是 [关闭(outline)] [保存(default)]，符合顺序；`docs/architecture/styling-system.md` "Dialog / Form Action Button Convention" 明文规定 actions MUST be `[secondary, primary]`。
- **行业惯例**: shadcn/ui AlertDialog / Ant Design Modal 均为 [取消][主操作] 左次右主；本项目自有文档亦如此规定。
- **用户影响**: 同一"保存/取消"语义对，在单元格 dialog 里是取消在左、在行保存条里是保存在左，肌肉记忆错乱，密集编辑场景容易点错按钮。
- **建议**: 交换两个 Button 的渲染顺序为 [取消(outline)] [保存(default)]。
- **复核状态**: 未复核

### [G3-视角4-01] 表头列筛选的关键词搜索 Input 内嵌在 DropdownMenuContent 中

- **文件**: `packages/flux-renderers-data/src/table-renderer/table-header-row.tsx:256-281`
- **证据片段**:
  ```tsx
  <DropdownMenuContent>
    {isSearchable && column.name ? (
      <div className="p-2">
        {searchableRegion ? (
          asReactNode(searchableRegion.render())
        ) : (
          <Input
            value={currentKeyword}
            aria-label={...}
            placeholder={...}
            onChange={(event) => onSearch(column.name!, event.target.value)}
          />
        )}
      </div>
    ) : null}
  ```
- **严重程度**: MEDIUM
- **现状**: 列关键词搜索把 `<Input>` 直接放进 `DropdownMenuContent`。Radix DropdownMenu 的 content 会对按键做菜单导航/typeahead 拦截（可打印字符跳焦点、Space/Enter 触发菜单项），文本输入嵌在里面是已知冲突场景。shadcn 官方 DataTable 的 checkbox 筛选用 DropdownMenu 是官方模式，但带输入框的筛选一律走 Popover。
- **行业惯例**: Ant Design 表格筛选 dropdown（`filterDropdown`）规范载体是 Popover/自定义浮层；shadcn/ui DataTable 的 filter+search 组合同样用 Popover。
- **用户影响**: 用户点开列筛选输入关键词时，部分按键（空格、字母）可能被菜单 typeahead/导航劫持导致输入异常或焦点跳出；即使宿主版本恰好未触发，该模式也偏离了两个参照系统的标准做法。
- **建议**: 将 filter/search 浮层从 DropdownMenu 换成 `Popover`+`PopoverContent`（保留内部 DropdownMenuCheckboxItem 的视觉样式或改用 Checkbox 列表），触发按钮保持现样式。
- **复核状态**: 未复核

### [G3-视角4-02] 表头列搜索输入无清除按钮

- **文件**: `packages/flux-renderers-data/src/table-renderer/table-header-row.tsx:262-278`
- **证据片段**:
  ```tsx
  <Input
    value={currentKeyword}
    aria-label={
      columnLabelText
        ? `${t('flux.table.search')} ${columnLabelText}`
        : t('flux.table.search')
    }
    placeholder={...}
    onChange={(event) => onSearch(column.name!, event.target.value)}
  />
  ```
- **严重程度**: LOW
- **现状**: 列关键词搜索是普通 `Input`，无 `type="search"`、无清除（×）按钮，也没有 "clear" 操作项；清除筛选只能通过下方"清除筛选"按钮整体清除。
- **行业惯例**: Ant Design filter search、shadcn/ui 搜索输入普遍提供一键清除（XIcon 或 `type="search"` 原生清除）。
- **用户影响**: 输错关键词想快速清空重来时，只能全选删除或点"清除筛选"把同列已勾选的 checkbox 筛选一起清掉，多一步且破坏已选状态。
- **建议**: 在 Input 右侧追加 `size="icon-xs" variant="ghost"` 清除按钮（XIcon + `aria-label=t('flux.common.clear')`），点击调 `onSearch(column.name, '')`。
- **复核状态**: 未复核

### [G3-视角5-01] 行级快速编辑保存条单元格没有对应表头列，导致整表列错位

- **文件**: `packages/flux-renderers-data/src/table-renderer/table-body-row-rendering.tsx:548-556`（对照 `table-renderer.tsx:377-381`、`table-renderer/table-header-row.tsx:389-453`）
- **证据片段**:
  ```tsx
  {
    rowDraftEnabled ? (
      <TableCell
        key="__row_save_bar__"
        data-slot="table-row-save-bar-cell"
        className="w-32 whitespace-nowrap"
      >
        <RowQuickEditSaveBar rowDraft={rowDraft} />
      </TableCell>
    ) : null;
  }
  ```
  ```tsx
  const columnCount =
    (nestedHeadersActive ? leafBodyColumns : mainColumns).length +
    (schemaProps.rowSelection ? 1 : 0) +
    (showExpandColumn ? 1 : 0) +
    (schemaProps.draggable ? 1 : 0);
  ```
- **严重程度**: HIGH
- **现状**: 启用行级快速编辑（inline quickEdit + quickSaveAction/quickSaveItemAction）时，每个数据行在列之后追加一个 `__row_save_bar__` 单元格；但表头行没有对应 `<th>`，colgroup（`table-renderer.tsx:332-345`）没有对应 `<col>`，`columnCount`（空行 colSpan 用）也没有计入。表格只要有 quickEdit 列 + 行保存动作，表头 N 列对正文 N+1 列，永久错位，与编辑与否无关（保存条未激活时该单元格也渲染，只是内容为空）。
- **行业惯例**: AG Grid / Ant Design Table 中任何 body 额外列都必须有配对的 header 列定义；固定列宽表格（colgroup + fixed layout）头/体列数不一致会直接产生视觉断裂。
- **用户影响**: 配置了行级快速编辑的 CRUD 表格整列错位、出现一条无表头的孤儿列，用户看到的列标题与列数据对不上，是主路径（表格编辑）上的功能性缺陷。
- **建议**: 三选一：① 在 `table-header-row.tsx` 的 rowSelection/expand 列旁为 rowDraft 场景渲染空 `<th data-slot="table-row-save-bar-head">`，colgroup 与 columnCount 同步 +1；② 把保存条改为覆盖在行尾的 absolute 浮层（不占列）；③ 在 header 也追加一个空标题列并允许隐藏。推荐 ①，改动最小且保持列对齐契约。
- **复核状态**: 未复核

### [G3-视角5-02] 无限滚动加载状态为纯文本，无 Spinner 组件

- **文件**: `packages/flux-renderers-data/src/crud-infinite-scroll-area.tsx:26-41`、`packages/flux-renderers-data/src/list-renderer.tsx:467-473`
- **证据片段**:
  ```tsx
  <div data-slot="crud-infinite-status" role="status" aria-live="polite">
    {loadDataOnce
      ? t('flux.crud.loadedAll', { count: filteredRowCount })
      : atLastPage
        ? t('flux.crud.noMoreData')
        : infiniteState.error
          ? t('flux.crud.loadFailed')
          : infiniteState.loading
            ? t('flux.crud.loadingMore')
            : ''}
  </div>
  ```
  ```tsx
  <div className="nop-list-infinite px-3 py-2 text-sm text-muted-foreground" data-slot="list-infinite">
    <div data-slot="list-infinite-status">{infiniteStatus}</div>
  ```
- **严重程度**: MEDIUM
- **现状**: CRUD 与 list 的"加载中"状态都只渲染一行文本（`loadingMore`），无任何 Spinner。同包 table loading overlay（`Spinner`）、chart loading（`Spinner`）、pivot loading（`Spinner`）都用 Spinner 组件。
- **行业惯例**: Ant Design List `loadMore`、无限滚动列表（Vant List loading）均显示旋转指示器 + 文案。
- **用户影响**: 大数据量加载超过 1s 时用户只看到静止文字，无法区分"在加载"还是"卡住了"；与同包其它 loading 形态不一致。
- **建议**: loading 分支在文本前加 `<Spinner className="size-4" aria-hidden="true" />`（flex items-center gap-2），对齐 `table-loading-overlay.tsx` 的组合。
- **复核状态**: 未复核

### [G3-视角5-03] list 无限滚动加载失败无重试入口（CRUD 有，行为不一致）

- **文件**: `packages/flux-renderers-data/src/list-renderer.tsx:405-413`（对照 `crud-infinite-scroll-area.tsx:50-82`）
- **证据片段**:
  ```tsx
  const infiniteStatus = infiniteActive
    ? pagination.hasMore
      ? infiniteState.error
        ? t('flux.list.loadFailed')
        : infiniteState.loading
          ? t('flux.list.loadingMore')
          : ''
      : t('flux.list.noMore')
    : '';
  ```
- **严重程度**: MEDIUM
- **现状**: list 无限滚动出错后仅渲染 `loadFailed` 文本，没有重试按钮，且 sentinel 已停止触发（错误态未恢复），用户只能刷新整页。同包 CRUD 无限滚动在错误态渲染 `Retry` 按钮（`crud-infinite-scroll-area.tsx:50-82`）并支持 `onRetry`。
- **行业惯例**: Ant Design List/Vant List 的加载失败均提供"重新加载"动作。
- **用户影响**: 网络抖动后 list 数据断流且永远停在该状态，用户不知道也无法恢复；而同样场景在 CRUD 里可以一键重试，同一项目行为分裂。
- **建议**: 在 `list-infinite-status` 旁复制 CRUD 的错误分支：`error` 时渲染 `<Button variant="outline" size="sm" onClick={重调 handleLoadMore}>`（文案复用 `flux.common.retry`）。
- **复核状态**: 未复核

### [G3-视角5-04] chart 与 tree 空状态无样式，与 list/pivot 的居中 muted 空态不一致

- **文件**: `packages/flux-renderers-data/src/chart-renderer.tsx:567-568`、`packages/flux-renderers-data/src/tree-renderer.tsx:557-559`
- **证据片段**:
  ```tsx
  {isEmpty ? (
    <div data-slot="chart-empty">{emptyContent}</div>
  ) : (
  ```
  ```tsx
  {
    hasRendererSlotContent(emptyContent) ? <div data-slot="tree-empty">{emptyContent}</div> : null;
  }
  ```
- **严重程度**: MEDIUM
- **现状**: chart 空态容器无任何 className（chart 根容器高 400px，fallback 文本 `noData` 以默认字号/默认色出现在左上角）；tree 无数据分支同样是无样式裸 div。对照同包 `pivot-renderer.tsx:231-236`（`flex items-center justify-center text-sm text-muted-foreground`）、`list-renderer.tsx:397`（`px-3 py-3 text-sm text-muted-foreground`）、tree 的搜索无结果分支（`px-2 py-1.5 text-sm text-muted-foreground`）均有统一空态样式。
- **行业惯例**: Ant Design Empty / shadcn Empty 组件：空状态居中、用 muted 文字；本项目 pivot 已是正确样板。
- **用户影响**: 图表数据为空时用户在 400px 高的大画布左上角看到一行不起眼的小字，像是渲染残缺；与 pivot/list 空态观感割裂。
- **建议**: `chart-empty` 加 `flex h-full w-full items-center justify-center text-sm text-muted-foreground`；`tree-empty`（no-data 分支）加 `px-2 py-1.5 text-sm text-muted-foreground`（与同文件搜索空态分支一致）。
- **复核状态**: 未复核

### [G3-视角5-05] dashboard 运行态空布局渲染完全空白，无默认空态提示

- **文件**: `packages/flux-renderers-dashboard/src/dashboard-renderer.tsx:82-95`
- **证据片段**:
  ```tsx
  if (panels.length === 0) {
    const emptyContent = regions.empty ? asReactNode(regions.empty.render()) : null;
    return (
      <div
        className={cn('nop-dashboard', props.meta.className)}
        ...
        data-empty=""
      >
        {emptyContent}
      </div>
    );
  }
  ```
- **严重程度**: MEDIUM
- **现状**: `panels` 为空且未配置 empty region 时渲染空 div。同包其它数据组件全部有默认空态 fallback（table `t('flux.table.noData')`、list/tree/chart `t('flux.common.noData')`、pivot 同样三段 fallback），唯 dashboard 缺省为空白。
- **行业惯例**: Ant Design Pro 空仪表盘/空图表均显示 Empty 占位；本项目内部一致性基准即"空态必有 noData 提示"。
- **用户影响**: schema 配置错误或数据未到导致 0 面板时，用户看到一整块空白区域，无法区分"加载中/配置错误/确实为空"。
- **建议**: `emptyContent` 增加 fallback：`regions.empty ? render : <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">{t('flux.common.noData')}</div>`。
- **复核状态**: 未复核

### [G3-视角5-06] 表格空态在虚拟化与非虚拟化路径下布局不一致

- **文件**: `packages/flux-renderers-data/src/table-renderer/table-body-rows.tsx:202-207` 与 `392-406`
- **证据片段**:
  ```tsx
  // 非虚拟化
  <TableRow data-slot="table-empty-row">
    <TableCell colSpan={columnCount} data-slot="table-empty-cell">
      {emptyContent}
    </TableCell>
  </TableRow>
  ```
  ```tsx
  // 虚拟化
  <TableCell colSpan={columnCount} data-slot="table-empty-cell">
    <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {emptyContent}
    </div>
  </TableCell>
  ```
- **严重程度**: LOW
- **现状**: 同一 `emptyContent`，虚拟化路径强制 200px 高并垂直居中，非虚拟化路径贴顶左对齐；数据量跨过 `virtualThreshold` 前后同一表格空态样式会跳变。
- **行业惯例**: AG Grid / Ant Design Table 空态在任意模式下均呈同一居中样式。
- **用户影响**: 仅在动态切换虚拟化阈值的边缘场景可见，属视觉细节不一致。
- **建议**: 将 200px 居中容器提取为共享空态节点，两个分支复用。
- **复核状态**: 未复核

### [G3-视角5-07] dashboard-editor 会话未就绪占位为孤立省略号

- **文件**: `packages/flux-renderers-dashboard/src/editor/dashboard-editor-renderer.tsx:205-207`
- **证据片段**:
  ```tsx
  if (!core) {
    return <div className="h-full min-h-0 p-6 text-muted-foreground">…</div>;
  }
  ```
- **严重程度**: LOW
- **现状**: editor-core 会话在 mount effect 中创建，首帧 `core === null` 时渲染一个字面量 "…" 字符，无 Spinner、无文案。
- **行业惯例**: shadcn/ui 加载占位用 `Skeleton`/`Spinner`；本项目 loading 基线为 Spinner 组件。
- **用户影响**: 仅首帧短暂闪现，影响轻微，但"…"既非加载指示也非文案。
- **建议**: 换成 `<Spinner className="size-4" />` 或 ui `Skeleton` 占位。
- **复核状态**: 未复核

### [G3-视角7-01] stat-tile 涨跌语义色硬编码 emerald/red，未用 success/destructive 令牌

- **文件**: `packages/flux-renderers-data/src/stat-tile-renderer.tsx:148-152`
- **证据片段**:
  ```tsx
  const STATUS_TEXT_CLASS: Record<StatTileStatus, string> = {
    up: 'text-emerald-600 dark:text-emerald-500',
    down: 'text-red-600 dark:text-red-500',
    neutral: 'text-muted-foreground',
  };
  ```
- **严重程度**: MEDIUM
- **现状**: up/down 语义色直接用 Tailwind 调色板硬编码并手写 dark 变体。同一包内 `sparkline-renderer.tsx:18-22` 对同语义（up=success、down=destructive）正确使用 `hsl(var(--success))` / `hsl(var(--destructive))`；主题层 `--success` 令牌在 `packages/theme-tokens/src/styles.css:122` 已发布。
- **行业惯例**: shadcn/ui 语义状态一律走 `--success/--destructive` 等 CSS 变量；本项目 `styling-system.md`/`theme-compatibility.md` 规定包自有视觉读取 CSS 变量。
- **用户影响**: 宿主换主题/调色板时 stat-tile 的涨跌色不跟随（与 sparkline 同屏并排时绿色明显不一致），dark 模式依赖手写变体难以保证与令牌一致。
- **建议**: 改为 `up: 'text-success', down: 'text-destructive', neutral: 'text-muted-foreground'`（`text-success` 由 tailwind-preset `success: 'hsl(var(--success))'` 提供）。
- **复核状态**: 未复核

### [G3-视角7-02] 图表标记点默认色硬编码十六进制 '#ef4444'

- **文件**: `packages/flux-renderers-data/src/chart-renderer.tsx:305-327`
- **证据片段**:
  ```tsx
  return (
    <circle
      cx={dotProps.cx}
      cy={dotProps.cy}
      r={4}
      fill={markers.color ?? '#ef4444'}
      stroke="none"
    />
  );
  ```
- **严重程度**: LOW
- **现状**: SPC 越限标记点默认色为字面量 `#ef4444`；同文件其它默认色（band、brush、reference line）均走 `hsl(var(--chart-*))` 令牌，markers.color 仅在 schema 显式配置时可覆盖默认。
- **行业惯例**: shadcn/ui chart 体系全部经 CSS 变量；red-500 语义应为 `--destructive`。
- **用户影响**: 宿主主题重定义 destructive 色时标记点不跟随；属次要色阶不一致（默认值仍为红色，语义未错）。
- **建议**: fallback 改为 `hsl(var(--destructive))`。
- **复核状态**: 未复核

### [G3-视角8-01] dashboard 运行态画布按固定 1200px 计算面板坐标，容器却为 100% 宽

- **文件**: `packages/flux-renderers-dashboard/src/dashboard-renderer.tsx:80, 109-138`
- **证据片段**:
  ```tsx
  const panels = sanitizePanels(rawPanels, { cols: layout.cols });
  const canvasWidth = 1200;
  ...
      <div
        data-slot="dashboard-canvas"
        className="relative"
        style={{ width: '100%', minWidth: 320, height: Math.max(height, 120) }}
      >
        {panels.map((panel) => {
          const rect = panelToPixels(panel, {
            cols: layout.cols, rowHeight: layout.rowHeight, gap: layout.gap, canvasWidth,
          });
  ```
- **严重程度**: MEDIUM
- **现状**: 面板 left/width 由硬编码 `canvasWidth = 1200` 换算成像素绝对定位，外层容器 `width: '100%'` 且无 overflow 滚动。编辑态画布（`editor-canvas.tsx:39-56`）用 ResizeObserver 实测宽度，两个形态不同构。
- **行业惯例**: 栅格仪表盘（Grafana/AntD Dashboard）运行态按容器实际宽度换算列宽或提供横向滚动；编辑/运行坐标模型一致是本项目自己在 renderer 注释中声明的设计目标（"编辑/运行同构零转换"）。
- **用户影响**: 容器窄于 1200px（笔记本分屏、内嵌卡片）时右侧面板溢出容器、被后续内容遮挡或互相重叠；宽于 1200px 时右侧留大片死区。
- **建议**: 运行态复用 `useCanvasWidth`（editor-canvas 已实现）把实测宽度传入 `panelToPixels`，或给 `dashboard-canvas` 加 `overflow-x-auto` + 固定 1200px 内宽。
- **复核状态**: 未复核

### [G3-视角9-01] dashboard 编辑器多处可见文案与 aria-label 硬编码英文，未走 i18n

- **文件**: `packages/flux-renderers-dashboard/src/editor/editor-inspector.tsx:45-117`、`packages/flux-renderers-dashboard/src/editor/editor-palette.tsx:20-25`、`packages/flux-renderers-dashboard/src/editor/editor-canvas.tsx:200,222,241`、`packages/flux-renderers-dashboard/src/editor/dashboard-editor-renderer.tsx:339,346`
- **证据片段**:
  ```tsx
  <InspectorField label="Id">...
  <InspectorField label="Type">...
  <InspectorField label="Title">...
  <InspectorField label="Source (data expression)">...
  <InspectorField label="Props (JSON)">...
  ```
  ```tsx
  aria-label="Dashboard editing canvas"
  aria-label={`Dashboard panel ${panel.id}`}
  leftLabel="Collapse panel palette"
  rightLabel="Collapse inspector"
  ```
- **严重程度**: MEDIUM
- **现状**: 同一文件/同一编辑器内，header/palette 标题/inspector 按钮均已用 `t('flux.dashboard.editor.*')`，但 inspector 字段标签（Id/Type/Title/X/Y/W/H/Source (data expression)/Props (JSON)）、palette 类型名（Chart/Table/Stat Tile/Iframe/HTML/Text）、canvas region aria-label、WorkbenchShell 折叠标签均为字面量英文。`renderer-markers-and-selectors.md` 明确 canvas 类 wrapper 的 aria-label "resolved via i18n key, not hardcoded"。
- **行业惯例**: ma5-ux [视角9-02] 同类问题（硬编码英文 fallback）在本项目已判定为缺陷并修复（audio/video 改 `t()`）；Ant Design 全部编辑器文案走 locale。
- **用户影响**: 非英文 locale 下编辑器界面中英混排；读屏用户听到的 region/控件名与界面语言不一致。属于已知根因（i18n 硬编码）的新实例。
- **建议**: 新增 `flux.dashboard.editor.fieldId/fieldType/...` 与 `paletteChart` 等 i18n key，palette 类型表改为 `{ type, labelKey }`，aria-label 与 leftLabel/rightLabel 全部改 `t()`。
- **复核状态**: 未复核

### [G3-视角9-02] 面板移除按钮 aria-label 暴露内部 panel id，可读名无意义

- **文件**: `packages/flux-renderers-dashboard/src/editor/editor-canvas.tsx:239-252`
- **证据片段**:
  ```tsx
  <button
    type="button"
    aria-label={`Remove ${panel.id}`}
    className="flex size-5 items-center justify-center rounded-full border border-border bg-background text-muted-foreground hover:text-destructive"
    onClick={(event) => {
      event.stopPropagation();
      core.update((doc) => ({ panels: doc.panels.filter((p) => p.id !== panel.id) }));
  ```
- **严重程度**: LOW
- **现状**: 移除按钮的 accessible name 是 `Remove panel-3` 这类自增内部 id；面板明明有 `title` 字段可用于人读标识。
- **行业惯例**: shadcn/ui 惯例 icon-only 按钮的 aria-label 使用业务可读名；同类编辑器（Grafana 面板菜单）读出的是面板标题。
- **用户影响**: 读屏用户在多面板画布中听到一串 "Remove panel-1/panel-2" 无法分辨目标；目视用户无影响。
- **建议**: `aria-label={\`${t('flux.dashboard.editor.delete')} ${panel.title || panel.id}\`}`（label 本身走 i18n，见 [G3-视角9-01]）。
- **复核状态**: 未复核

### [G3-视角9-03] tree 声明 aria-multiselectable 但组件无任何多选行为 [scope-conflict]

- **文件**: `packages/flux-renderers-data/src/tree-renderer.tsx:549-572`（对照 `packages/flux-renderers-data/src/schemas.ts:244`）
- **证据片段**:
  ```tsx
  <div
    ref={rootRef}
    className={cn('nop-tree', props.meta.className)}
    ...
    role="tree"
    aria-label={treeLabel}
    aria-multiselectable={multiple || undefined}
  >
  ```
  另外 treeitem 的选中态实为焦点态：`aria-selected={isTabbable}`（`tree-renderer.tsx:277`）。
- **严重程度**: MEDIUM
- **现状**: schema 暴露 `multiple` prop（definitions 亦注册），renderer 据此输出 `aria-multiselectable="true"`；但组件只有 `activeNodeId`（roving focus），没有选择集合、没有 checkbox、没有 onSelectionChange 事件，`aria-selected` 直接绑定"是否为当前焦点项"。
- **行业惯例**: WAI-ARIA tree pattern 要求 `aria-selected` 反映真实选择集；Ant Design Tree `multiple`/`checkable` 提供真实多选交互。
- **用户影响**: 读屏用户听到"可多选列表"却找不到任何多选手段；`aria-selected` 随焦点移动导致"已选中"播报失真。主要影响为 AT 语义失真 + 能力缺失，两可故标 [scope-conflict]。
- **建议**: 短期：`multiple` 未实现选择集前不要输出 `aria-multiselectable`，`aria-selected` 改为绑定真实选择状态（或固定 false + 仅 focus 高亮）；长期：实现选择集与 `onSelectionChange`。
- **复核状态**: 未复核

### [G3-视角9-04] 独立 sparkline 组件整体 aria-hidden，趋势信息对读屏完全不可达

- **文件**: `packages/flux-renderers-data/src/sparkline-renderer.tsx:80-89`（对照 `chart-renderer.tsx:588-596`）
- **证据片段**:
  ```tsx
  <svg
    data-slot={isEmpty ? 'sparkline-empty' : 'sparkline-canvas'}
    ...
    role="img"
    aria-hidden="true"
    className="shrink-0"
  >
  ```
- **严重程度**: LOW
- **现状**: `role="img"` 与 `aria-hidden="true"` 并存导致元素对 AT 完全隐藏，且组件无任何文本替代（趋势方向仅经颜色/data-status 表达）。同包 chart renderer 为图表提供了 sr-only 数据摘要列表（`chart-data-equivalent`）。
- **行业惯例**: 数据可视化对 AT 提供文本等价物（chart-renderer 已是本项目内部基准）；纯装饰图才整体 aria-hidden。
- **用户影响**: 读屏用户无法获知迷你趋势图的走向/状态；目视用户无感知。属 ARIA 语义的 UX 可见部分，未达全量 WCAG 深度。
- **建议**: 去掉 `aria-hidden`，保留 `role="img"` 并补 `aria-label`（如 `${t('flux.common.trend')} ${status}`），或复用 chart 的 sr-only 摘要模式。
- **复核状态**: 未复核

### [G3-视角10-01] 同包存在三种分页 UI 形态

- **文件**: `packages/flux-renderers-data/src/table-renderer/table-pagination-bar.tsx:78-148`、`packages/flux-renderers-data/src/crud-renderer-toolbar.tsx:121-156`、`packages/flux-renderers-data/src/crud-list-pagination.tsx:16-48`
- **证据片段**:
  ```tsx
  // TablePaginationBar：页码窗口 + 省略号 + 每页条数 + 区间文案
  <PaginationPrevious ... className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'} />
  ...<PaginationLink onClick={(event) => onPageChange(page, event)} isActive={page === currentPage}>...
  // CrudToolbarBlocks pagination：仅 上一页 / "第 x / y 页" / 下一页
  <span className="text-sm text-muted-foreground">
    {t('flux.pagination.page', { current: pagination.currentPage, total: ... })}
  </span>
  // CrudListPagination：首页/上一页/"第 x / y 页"/下一页/末页，无页码、无每页条数
  <PaginationFirst onClick={() => onPageChange(1)} ... />
  ```
- **严重程度**: MEDIUM
- **现状**: 表格内置分页 = 数字页码 + 省略号 + page-size 下拉 + "1-10 共 100" 区间文案；crud toolbar 分页块 = 仅有 prev/next + "第 x/y 页"；crud list 分页 = first/prev/next/last + "第 x/y 页"。三种形态交互能力与视觉均不同，且可出现在同一个 CRUD surface 的不同位置。
- **行业惯例**: Ant Design CRUD 体系（Table/List）统一一套 Pagination；AG Grid 统一分页栏。审查标准明确"本项目内部不同组件做法不一……一律报跨组件不一致"。
- **用户影响**: 用户从表格翻页（点数字/改页大小）切到卡片/列表视图翻页（只有首末/前后箭头、不能改页大小、不能跳页），操作方式突变，学习成本翻倍。
- **建议**: CrudToolbarBlocks 与 CrudListPagination 收敛到 TablePaginationBar 的能力集（至少共享"数字页码 + page-size"形态）；如需紧凑形态，做成同一组件的 `size` 变体而非三个独立实现。
- **复核状态**: 未复核

### [G3-视角4-03] inspector JSON 编辑器 Apply 对非法 JSON 静默失败，无任何错误反馈

- **文件**: `packages/flux-renderers-dashboard/src/editor/editor-inspector.tsx:185-202`
- **证据片段**:
  ```tsx
  <Button type="button" variant="default" size="sm" data-testid="inspector-props-apply"
    onClick={() => {
      if (draft === null) return;
      try {
        const parsed = draft.trim() === '' ? undefined : (JSON.parse(draft) as SchemaValue);
        onChange(parsed);
        setDraft(null);
      } catch {
        // invalid JSON: keep draft, do not touch the panel
      }
    }}
  >
  ```
- **严重程度**: MEDIUM
- **现状**: `JSON.parse` 失败时仅吞掉异常保留草稿，界面无错误文案、无红框、无 toast；Apply 按钮点击后毫无反应。
- **行业惯例**: 所有 JSON 编辑器（VS Code、Grafana、Ant Design Form 校验）对非法输入给出即时错误提示；shadcn/ui 表单错误用 destructive 文案 + `aria-invalid`。
- **用户影响**: 用户粘贴带注释/尾逗号的 JSON 点 Apply，按钮无响应也无解释，会反复点击并认为保存功能坏了；不知道错在哪一行。
- **建议**: catch 分支 set 一条错误状态，在 Textarea 下方渲染 `<p className="text-xs text-destructive">{t('flux.dashboard.editor.invalidJson')}</p>` 并给 Textarea 加 `aria-invalid`。
- **复核状态**: 未复核

### [G3-视角11-01] dashboard 面板引用未注册类型时渲染空卡片壳，无任何提示

- **文件**: `packages/flux-renderers-dashboard/src/dashboard-renderer.tsx:97-105`
- **证据片段**:
  ```tsx
  const renderPanelContent = (panel: DashboardPanelSchema): React.ReactNode => {
    if (!runtime.registry.has(panel.type)) {
      console.warn(`[dashboard] panel "${panel.id}" type "${panel.type}" is not registered, skipped`);
      return null;
    }
  ```
- **严重程度**: LOW
- **现状**: 面板类型未注册时内容返回 null，但面板壳（边框卡片 + 标题栏）照常渲染，仅 console.warn；用户界面呈现"有标题的空白卡片"。
- **行业惯例**: Grafana 对无法加载的面板显示面板内错误占位（"Panel not found"）而非空壳。
- **用户影响**: schema 笔误或宿主未注册类型时，用户看到空白卡片无法自诊断，误以为数据为空。属"看起来完整实际发虚"的低频实例。
- **建议**: 未注册时渲染 `<div className="flex h-full items-center justify-center text-xs text-muted-foreground">{t('flux.dashboard.panelTypeMissing', { type: panel.type })}</div>`。
- **复核状态**: 未复核

### [G3-视角11-02] heatmap 单元格无数值提示手段

- **文件**: `packages/flux-renderers-data/src/chart-heatmap.tsx:99-113`
- **证据片段**:
  ```tsx
  <rect
    key={`heatmap-cell-${cell.x}-${cell.y}`}
    data-cell-x={String(grid.xLabels[cell.x])}
    data-cell-y={String(grid.yLabels[cell.y])}
    data-cell-value={String(cell.value)}
    ...
    fill="hsl(var(--chart-1))"
    fillOpacity={cell.opacity}
  />
  ```
- **严重程度**: LOW
- **现状**: 单元格数值只编码为 `data-cell-value` 属性与颜色透明度，无 `<title>`、无 tooltip、无 hover 态；数值对人完全不可读（仅色深渐变）。同文件其它 chart 类型（line/bar/pie/scatter）都有 `ChartTooltip`。
- **行业惯例**: ECharts/Ant Design heatmap 均在 hover tooltip 中展示 x/y/value。
- **用户影响**: 用户只能比较色深猜测数值大小，无法读取任何具体值；与同包其它图表的交互能力不一致。
- **建议**: 为每个 `<rect>` 补 `<title>{`${x} / ${y}: ${value}`}</title>`（最小改法），或将 HeatmapGrid 包进带 `ChartTooltip` 的容器。
- **复核状态**: 未复核

---

## 统计与转 C2 候选

- **发现计数**: HIGH 1 / MEDIUM 16 / LOW 9（共 26 条）
  - HIGH：[G3-视角5-01]
  - MEDIUM：[G3-视角3-01] [G3-视角3-02] [G3-视角3-03] [G3-视角3-04] [G3-视角2-02] [G3-视角4-01] [G3-视角4-03] [G3-视角5-02] [G3-视角5-03] [G3-视角5-04] [G3-视角5-05] [G3-视角7-01] [G3-视角8-01] [G3-视角9-01] [G3-视角9-03] [G3-视角10-01]
  - LOW：[G3-视角2-01] [G3-视角4-02] [G3-视角5-06] [G3-视角5-07] [G3-视角7-02] [G3-视角9-02] [G3-视角9-04] [G3-视角11-01] [G3-视角11-02]
- **转 C2 候选**: 无（本轮未撞见 dedup-baseline §2 已登记缺口的表象；分页/筛选/保存条等均为已实现能力的一致性问题，不属 G-A~G-M 任一登记项）。

## G4 — mobile / scheduling（HIGH 0 / MEDIUM 8 / LOW 6，共 14 条）

### [G4-视角1-01] scheduling 包多处方向/缩放/新增/清除控件用文本字符替代 lucide 图标，且同包内图标化程度不一致

- **文件**: `packages/flux-renderers-scheduling/src/gantt/gantt-header.tsx:56-57`；`packages/flux-renderers-scheduling/src/calendar/components/calendar-header.tsx:47-72`；`packages/flux-renderers-scheduling/src/gantt/gantt-grid.tsx:148-158`；`packages/flux-renderers-scheduling/src/gantt/gantt-links.tsx:110-120`；`packages/flux-renderers-scheduling/src/barcode-input/barcode-input.tsx:300-309`；`packages/flux-i18n/src/locales/en-US.ts:1100-1101`
- **证据片段**:

  ```tsx
  // gantt-header.tsx:56-57 — 缩放按钮是纯文本字符，无图标无 aria-label
  <Button variant="ghost" size="sm" onClick={handleZoomOut}>−</Button>
  <Button variant="ghost" size="sm" onClick={handleZoomIn}>+</Button>

  // calendar-header.tsx:54,71 — 前后导航用文本字符 ‹ ›（有 aria-label）
  aria-label={t('scheduling.previous')}
  >
    ‹
  </Button>

  // gantt-links.tsx:119 — 连线删除按钮用 &times; 文本实体
  &times;

  // barcode-input.tsx:308 — 清除按钮用文本 ×，而同排扫码按钮用 lucide ScanLine
  <span className="pointer-events-none text-muted-foreground">×</span>

  // i18n en-US.ts:1100-1101 — 新增按钮的 "+" 是 i18n 字符串里的文本字符
  addColumn: '+ Add Column',
  addCard: '+ Add Card',
  ```

- **严重程度**: MEDIUM
- **现状**: 同一包内，kanban 工具栏用 lucide `Undo2/Redo2/History`、kanban 列头用 `ChevronDown/ChevronRight`、barcode 扫码按钮用 `ScanLine`，而 gantt 缩放用 `+/−`、calendar 前后导航用 `‹ ›`、gantt 连线删除用 `&times;`、barcode 清除用文本 `×`、kanban 新增卡片/列的 `+` 是 i18n 文本字符。同一"方向/缩放/删除/新增"语义在不同组件间图标化程度不一致，且 gantt 缩放两个 icon-only 按钮连 `aria-label`/`title` 都没有。
- **行业惯例**: shadcn/ui 与 Ant Design 的分页/轮播/日历导航一律用 ChevronLeft/ChevronRight 图标；AntD Pagination、MUI Pagination 的缩放类操作用 ZoomIn/ZoomOut 或 Plus/Minus 图标；AG Grid 工具面板全部 lucide 类图标。共享前缀视角 1 明确：删除=XIcon（非文本字符 ×）、新增=PlusIcon。
- **用户影响**: 用户在 gantt 工具栏看到两个孤立的"+/−"文本按钮，无 tooltip、无读屏名称，首次使用需猜测是缩放；与同产品 kanban 工具栏（图标+title）形成明显的完成度落差。读屏用户遇到裸 `+`/`−` 按钮会被朗读为"plus/minus"或空按钮，无法得知是缩放操作。
- **建议**: gantt 缩放改 `<PlusIcon />`/`<MinusIcon />` 并补 `aria-label={t('scheduling.gantt.zoomIn'/'zoomOut')}`；calendar 前后导航改 `ChevronLeftIcon`/`ChevronRightIcon`；gantt 连线删除与 barcode 清除改 `<XIcon className="size-3" />`；kanban 新增按钮在渲染层追加 `<PlusIcon className="size-3.5" />`（i18n 文本去除 `+ ` 前缀，参照 ma5-ux [视角1-01] 已修复的 array-editor/key-value 先例）。
- **复核状态**: 未复核

### [G4-视角3-01] gantt 树形任务展开/折叠指示符恒为文本 ">"，不随展开状态变化

- **文件**: `packages/flux-renderers-scheduling/src/gantt/gantt-grid.tsx:148-158`
- **证据片段**:
  ```tsx
  <Button
    variant="ghost"
    size="sm"
    aria-expanded={store.isOpen(task.id)}
    aria-label={
      store.isOpen(task.id)
        ? t('scheduling.gantt.collapseTask', { text: task.text })
        : t('scheduling.gantt.expandTask', { text: task.text })
    }
    className="w-4 h-4 p-0 text-gray-400 hover:text-gray-700 text-xs"
    onClick={(e) => {
      e.stopPropagation();
      handleToggle(task.id);
    }}
  >
    {'>'}
  </Button>
  ```
- **严重程度**: MEDIUM
- **现状**: 展开与折叠两种状态下按钮内容恒为字面字符 `>`，仅 aria 属性变化；无旋转、无换向、无 +/- 区分，且按钮仅 16×16px。
- **行业惯例**: 树形展开指示符必须可视化区分状态：shadcn/ui Collapsible/Tree 用 `ChevronRight`（折叠）→ `ChevronDown`（展开）；Ant Design Table 树形展示同规则；同包 kanban-column-header.tsx:137 已正确使用 `{collapsed ? <ChevronRight/> : <ChevronDown/>}`。
- **用户影响**: 用户展开一个父任务后，网格里所有可点指示符看起来完全一样，无法从视觉上分辨哪些分支已展开、哪些折叠，管理 10+ 行的任务树时只能靠缩进猜测层级状态；与同产品 kanban 的折叠交互（chevron 换向）行为不一致。
- **建议**: 按状态渲染 `{store.isOpen(task.id) ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}`，尺寸提升至 `size="icon-xs"`（24px）并保留现有 aria-label。
- **复核状态**: 未复核

### [G4-视角4-01] kanban 搜索输入无清除按钮，与同屏标签筛选器的"清除"能力不对称

- **文件**: `packages/flux-renderers-scheduling/src/kanban/components/kanban-toolbar.tsx:27-35`
- **证据片段**:
  ```tsx
  <Input
    id="kanban-search"
    type="text"
    value={filterText}
    onChange={(e) => onFilterChange(e.target.value)}
    placeholder={t('scheduling.kanban.searchCards')}
    aria-label={t('scheduling.kanban.searchCards')}
    className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 w-48"
  />
  ```
- **严重程度**: LOW
- **现状**: 搜索框无 clear/× 按钮；用户清空筛选只能全选删除。同看板的标签筛选条（kanban-tag-filter.tsx:50-59）在选中态提供"清除"按钮——同一 surface 两种筛选机制一种可一键清除、一种不能。
- **行业惯例**: Ant Design Input `allowClear`、shadcn/ui 搜索 combobox 的 X 清除钮、MUI InputAdornment clear 均为搜索框标配。
- **用户影响**: 用户想重置看板时，清除标签一键完成，清除关键词却要精确选中 48px 宽输入框内的文本再删除；键盘不熟练的用户常以"刷新页面"收尾。影响轻微（键入覆盖即可绕过），故 LOW。
- **建议**: 输入非空时在 Input 尾部渲染 ghost `icon-xs` 按钮 + `<XIcon />`，`aria-label={t('flux.common.clear')}`，onClick 置空 `filterText`。
- **复核状态**: 未复核

### [G4-视角5-01] gantt 默认空状态渲染完全空白的 div，与 kanban/calendar 的空态提示不一致

- **文件**: `packages/flux-renderers-scheduling/src/gantt/gantt.tsx:476-484`（对照 `kanban-board.tsx:546-550`、`calendar/calendar.tsx:428-435`）
- **证据片段**:

  ```tsx
  // gantt.tsx — 无 regions.empty 时返回一个空 div，无任何文案/图标
  return (
    <div data-slot="gantt" data-testid={meta.testid || undefined} data-cid={meta.cid || undefined} className={cn('nop-gantt', meta.className)} />
  );

  // kanban-board.tsx — 默认空态有文案
  <div ... className={cn('nop-kanban nop-kanban-empty flex items-center justify-center py-12 text-gray-400 text-sm', meta.className)}>
    {t('flux.common.noData')}
  </div>

  // calendar.tsx — 默认空态有图标 + 文案
  <CalendarIcon className="text-4xl mb-4 opacity-30" />
  <p className="text-sm">{t('scheduling.noScheduleData')}</p>
  ```

- **严重程度**: MEDIUM
- **现状**: gantt 在 `tasks` 为空且未声明 `regions.empty` 时渲染零内容容器；kanban 显示"暂无数据"文案；calendar 显示图标+"暂无排班数据"。三个调度组件三种空态标准，其中一种是空白。
- **行业惯例**: AG Grid 空数据显示 `No Rows To Show` 覆盖层；Ant Design Table/Table 系 `empty` 默认文案；shared 前缀视角 5：空数据渲染须有意义提示（非空白）。
- **用户影响**: 首次接入 gantt 或数据源返回空数组时，页面出现一片空白区域——用户无法区分"加载失败""无数据""组件坏了"，也无法得知应通过什么操作添加第一条任务；在深色页面背景上空白区域甚至难以察觉组件已挂载。
- **建议**: 对齐 calendar 模式：`<div className="flex flex-col items-center justify-center py-16 text-muted-foreground"><GanttIcon/chart 图标 className="text-4xl mb-4 opacity-30" /><p className="text-sm">{t('flux.common.noData')}</p></div>`；同时保留 `regions.empty` 覆盖通道。
- **复核状态**: 未复核

### [G4-视角5-02] countdown 缺少 time/targetTime 配置时静默渲染不可见空元素

- **文件**: `packages/flux-renderers-mobile/src/countdown.tsx:208-222`
- **证据片段**:

  ```tsx
  const hasTimeConfig =
    typeof slotProps.time === 'number' || typeof slotProps.targetTime === 'number';

  if (!hasTimeConfig) {
    return (
      <span
        className={cn('nop-countdown tabular-nums', props.meta.className)}
        ...
        data-finished="true"
        aria-live="off"
      />
    );
  }
  ```

- **严重程度**: LOW
- **现状**: schema 未提供 `time`/`targetTime` 时，组件渲染一个无任何内容、零尺寸的空 `<span>`（对比：notice-bar 无文本时返回 `null`，Vant Countdown 的 time 有默认值恒可渲染）。
- **行业惯例**: Vant Countdown 无 time 时渲染 `00:00:00`；Ant Design Statistic.Countdown 缺省走默认值。共享前缀视角 5/11：不可见空壳属"发虚"表面。
- **用户影响**: schema 作者漏配时间字段时页面上什么都不显示也无任何报错线索，调试时难以定位"组件去哪了"。属配置错误的边缘路径，故 LOW。
- **建议**: 无时间配置时渲染 `00:00:00` 占位（`formatCountdown(0, format)`），或在 DEV 模式 `console.warn` 提示缺失字段；不要输出空白标记节点。
- **复核状态**: 未复核

### [G4-视角5-03] kanban 卡片标签/成员溢出计数 "+N" 无任何提示手段，隐藏信息不可恢复

- **文件**: `packages/flux-renderers-scheduling/src/kanban/components/kanban-card-tags.tsx:56-59,80-82`
- **证据片段**:
  ```tsx
  {tags.length > maxVisibleTags && (
    <span className="text-[10px] text-gray-400">+{tags.length - maxVisibleTags}</span>
  )}
  ...
  {members.length > maxVisibleMembers && (
    <span className="text-[10px] text-gray-400 ml-1">+{members.length - maxVisibleMembers}</span>
  )}
  ```
- **严重程度**: LOW
- **现状**: 超过 3 个的标签/成员折叠为裸文本 `+N`，无 `title`、无 Tooltip、无展开通道；被隐藏的标签名与成员名在卡片上完全不可获得。可见成员头像有 `title={member.name}`，溢出计数却没有。
- **行业惯例**: 去重基线误报 #5 允许截断，但要求"截断致信息丢失且无 Tooltip 才报"——本条即该例外：MUI AvatarGroup 溢出 `+N` 有 Tooltip 列出隐藏成员；Ant Design Tag 溢出配合 Tooltip/Popover。
- **用户影响**: 成员分配 5 人时第 4、5 人是谁无从得知；标签筛选场景下用户看不到卡片完整标签集合，无法理解"为什么这张卡没被筛出来"。信息静默丢失，故按误报 #5 例外条款报告。
- **建议**: 为 `+N` span 补 `title={hiddenTags.map(t=>t.text).join(', ')}`（成员同理），或改用 ui `Tooltip` 包裹；成本最低的修复是原生 title 属性。
- **复核状态**: 未复核

### [G4-视角6-01] kanban 新增列内联表单"确认"在左、"取消"在右，违反项目自身 action 顺序规范

- **文件**: `packages/flux-renderers-scheduling/src/kanban/components/kanban-column-adder.tsx:51-68`
- **证据片段**:
  ```tsx
  <Button variant="ghost" size="sm" type="button" onClick={onConfirm}
    className="text-xs text-blue-600 hover:text-blue-800 px-1"
  >
    {t('flux.common.confirm')}
  </Button>
  <Button variant="ghost" size="sm" type="button" onClick={onCancel}
    className="text-xs text-gray-500 hover:text-gray-700 px-1"
  >
    {t('flux.common.cancel')}
  </Button>
  ```
- **严重程度**: MEDIUM
- **现状**: 主操作"确认"（蓝色）位于左位、"取消"位于右位。项目规范 `docs/architecture/styling-system.md` "Dialog / Form Action Button Convention" 明文：actions MUST be `[secondary, primary]`，即取消在左、确认在右（Ant Design/shadcn Dialog/macOS HIG 一致）。gantt 编辑对话框（gantt-editor.tsx:117-118）遵循了该顺序，同包内两种顺序并存。
- **行业惯例**: Ant Design Modal 默认 `[取消, 确定]`；shadcn/ui Dialog footer 惯例 cancel 左、action 右；本项目文档已锁定该规则。
- **用户影响**: 习惯"最右侧是确认"的用户在快速添加列时会点到左一位的"确认"或误把右侧"取消"当确认，导致列名丢失需重输；新增列是看板高频路径，肌肉记忆错位每次输入都会发生。通过真实用户影响检验（操作结果与预期相反且可复现）。
- **建议**: 调换两个按钮的 JSX 顺序为 `[取消, 确认]`；确认按钮可同时提升为 `size="sm"`（default variant）以建立主次层级，与 gantt-editor 的对话框按钮结构对齐。
- **复核状态**: 未复核

### [G4-视角7-01] scheduling 包硬编码语义色（red/blue 调色板类 + 裸 hex/rgba），与同包 CSS 令牌基线并存，主题适配断裂

- **文件**: 多处（代表性证据 `kanban/kanban-column.tsx:207-209`、`kanban/kanban-card.tsx:114`、`gantt/gantt-grid.tsx:130-133`、`gantt/hooks/use-gantt-drag.ts:36-39`、`gantt/hooks/use-gantt-link-draw.ts:48-52`、`gantt/components/baseline-bars.tsx:42-43,56,65`、`kanban/components/kanban-toolbar.tsx:34`）
- **证据片段**:
  ```tsx
  // kanban-column.tsx — WIP 超限用硬编码 red-*
  'nop-kanban-column flex flex-col bg-gray-50 rounded-lg border border-gray-200 ...',
  wipWarning && 'border-red-400',
  // kanban-card.tsx:114 — 删除 hover 硬编码 red
  className="h-5 w-5 p-0 text-gray-400 hover:text-red-500"
  // gantt-grid.tsx:131-132 — 选中/hover 硬编码 blue
  'border-b border-gray-100 hover:bg-blue-50/50',
  selectedTaskId === task.id && 'bg-blue-50',
  ```
  ```ts
  // use-gantt-drag.ts:38 — 拖放指示线裸 hex
  el.style.cssText = 'position:fixed;height:2px;background:#3b82f6;...';
  // use-gantt-link-draw.ts:49 — 连线预览裸 hex
  tempLine.setAttribute('stroke', '#3b82f6');
  // baseline-bars.tsx:56 — 偏差线裸 hex
  stroke={deviationDays > 0 ? '#ef4444' : '#f59e0b'}
  ```
- **严重程度**: MEDIUM
- **现状**: 同一包内两套颜色来源并存：`kanban.css`/`gantt.css`/`calendar.css` 已用 `var(--color-border)`/`var(--color-primary)`/`var(--color-destructive)` 令牌（如 `.nop-kanban-link-delete-btn` 用 `--color-destructive`、`.nop-gantt-bar-task` 用 `--color-primary`），而 TSX 内联类与 JS 注入样式大量使用 `red-400/500/100/600`、`blue-50/400/500/600`、`gray-*` 及 `#3b82f6/#ef4444/#f59e0b/rgba(156,163,175,*)` 字面量。红=破坏性/警告、蓝=主要/信息的语义色未令牌化。注：G-I"暗色回归"为已登记缺口，本条仅就"语义色应使用设计令牌"的静态事实报告，不重复申报暗色能力。
- **行业惯例**: shadcn/ui 语义色一律 `text-destructive`/`bg-primary`/`ring-ring` 令牌；共享前缀视角 7：语义状态色（warning/success/danger）应令牌化，本项目 `styling-system.md` STY2 锁定 Tailwind v4 令牌路径。
- **用户影响**: 宿主通过 CSS 变量换肤（或切换暗色）时，CSS 令牌驱动的部分随之变化，而 WIP 红色告警、卡片选中蓝、拖放指示线、基线偏差色维持原样——同一界面出现"一半跟随主题、一半钉死"的割裂视觉；高对比主题下 `#3b82f6` 指示线与令牌化背景可能失去对比关系。用户在切换主题后立刻可见，故通过影响检验。
- **建议**: TSX 类名改令牌：`border-red-400→border-destructive`、`bg-red-50→bg-destructive/10`、`text-red-600→text-destructive`、`bg-blue-50→bg-primary/10`、`ring-blue-400→ring-ring`、`hover:bg-gray-100→hover:bg-muted`；JS 注入样式改读 CSS 变量 `var(--color-primary)`/`var(--color-destructive)`（SVG 属性可用 `var()`），与同包 `gantt.css` 的既有用法对齐。
- **复核状态**: 未复核

### [G4-视角8-01] gantt 连线创建/删除命中区 8~20px 且 hover-only，触摸与触控板场景不可发现

- **文件**: `packages/flux-renderers-scheduling/src/gantt/gantt-bars.tsx:148-157,199-208`；`packages/flux-renderers-scheduling/src/gantt/gantt-links.tsx:95-121`
- **证据片段**:
  ```tsx
  // gantt-bars.tsx — 连线手柄 8px (w-2 h-2) 且仅 hover 显现
  <div
    data-slot="gantt-bar-link-handle"
    data-handle-side="start"
    className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 w-2 h-2 rounded-full bg-white border border-blue-400 opacity-0 group-hover:opacity-100 cursor-crosshair"
  />
  // gantt-links.tsx — 连线删除按钮 20px (w-5 h-5) 且仅 hover 渲染
  {isHovered && (
    <foreignObject ... width={20} height={20}>
      <div className="flex items-center justify-center w-5 h-5 nop-gantt-link-delete-btn ..." />
  ```
- **严重程度**: LOW
- **现状**: 连线手柄 8×8px、删除按钮 20×20px、里程碑菱形 12×12px，全部 `opacity-0 group-hover:opacity-100` ——无 hover 的设备（触摸屏）上永久不可见不可点；鼠标用户也需精确命中 8px 圆点。
- **行业惯例**: 去重基线误报 #4 允许 icon-xs 24px 的密集表格场景；8px 低于该基准过半。MS Project/dhtmlxGantt 连线手柄约 12-16px 并在拖拽接近时放大命中区；Gpon/TeamGantt 删除入口悬停时以 ≥24px 呈现。gantt 属桌面优先组件（键盘补齐在 calendar 有而连线无），故 LOW。
- **用户影响**: 触屏笔记本用户在 gantt 上无法建立/删除任务依赖（手柄永不出现），鼠标用户删除连线需先悬停细线再精确点击 20px 小圆钮，误点率高；"看不见所以不知道能连线"也使依赖功能发现率低。
- **建议**: 手柄提升至 `w-3 h-3`（12px）外加 `p-1` 扩展命中区（视觉 12px/命中 20px+）；`foreignObject` 提升为 24×24；为触屏增加长按 bar 呼出"创建依赖"的替代入口，或如 calendar 键盘拖拽一样补 `startKeyboardLink` 的键盘绑定（hook 已导出该 API 但未接线）。
- **复核状态**: 未复核

### [G4-视角8-02] kanban 卡片删除按钮 20px 且 hover-only，触摸设备上不可见不可达

- **文件**: `packages/flux-renderers-scheduling/src/kanban/kanban-card.tsx:107-118`
- **证据片段**:
  ```tsx
  <div className="nop-kanban-card-actions absolute top-1 right-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
    <Button
      variant="ghost"
      size="sm"
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        removeFn();
      }}
      aria-label={t('scheduling.kanban.removeCardLabel')}
      className="h-5 w-5 p-0 text-gray-400 hover:text-red-500"
    >
      <X className="w-3 h-3" />
    </Button>
  </div>
  ```
- **严重程度**: LOW
- **现状**: 删除按钮固定 20×20px（h-5 w-5），低于去重基线认可的最小 icon-xs 24px；且默认 `opacity-0`，依赖 `group-hover`/`group-focus-within` 显现——触摸设备既无 hover 也难以聚焦，删除入口永久不可见（键盘 Delete 键仍是可用通道）。
- **行业惯例**: 误报 #4 基准 icon-xs=24px；Trello 移动端以滑动/长按菜单替代 hover 删除；Ant Design Tag closable 常显。kanban 目前是桌面向组件、且删除有 undo 兜底，故 LOW。
- **用户影响**: 平板上看板用户点击卡片右上角找不到任何删除控件，也无法发现 Delete 键可用，只能求助文档；桌面用户首次也需扫过卡片才能发现 hover 后才浮现的小按钮。
- **建议**: 尺寸提升至 `size="icon-xs"`（24px）；或为触摸设备增加 `@media (hover: none) { opacity: 1 }` 常显回退（对齐 mobile 包 `nop-haptic` 的设备自适应思路）。
- **复核状态**: 未复核

### [G4-视角9-01] kanban 卡片与列头 `role="button"` 内嵌套真实 `<button>`，形成交互元素嵌套

- **文件**: `packages/flux-renderers-scheduling/src/kanban/kanban-card.tsx:62-73,105-121`；`packages/flux-renderers-scheduling/src/kanban/kanban-column-header.tsx:80-94,111-139`
- **证据片段**:
  ```tsx
  // kanban-card.tsx — 容器是 role="button"（sharedAttributes）
  const sharedAttributes = {
    ...
    role: 'button',
    tabIndex,
    'aria-label': cardLabel,
    onClick: clickFn,
    onKeyDown: handleKeyDown,
  };
  return (
    <div ref={cardRef} {...sharedAttributes} className={cardClass}>
      <div className="nop-kanban-card-actions ...">
        <Button ... onClick={(e) => { e.stopPropagation(); removeFn(); }} aria-label={...}>
          <X className="w-3 h-3" />
        </Button>
      </div>
  ```
- **严重程度**: MEDIUM
- **现状**: 卡片整体与列头整体声明为 `role="button"`，内部又渲染真实 `<button>`（删除、拖拽手柄、折叠）。去重基线误报 #6 允许"div+role=button+tabIndex"模式本身，本条报的是**嵌套**：button 内含 button，读屏会朗读"button, button"，且多数 AT 在嵌套结构下只暴露外层，内层删除按钮不可达。列头 role=button 同时承载 onColumnClick 语义也使"点击列头做什么"对读屏用户不可知。
- **行业惯例**: ARIA 规范禁止 interactive 元素嵌套（ARIA in HTML：`role="button"` 后代不得含 button/link）；Trello 卡片容器为 `role="listitem"` 内独立 link/按钮；shadcn 所有复合组件外层容器均无 role=button。
- **用户影响**: 读屏用户聚焦卡片听到两次"按钮"播报，无法区分"打开卡片"与"删除卡片"；实际遍历中删除按钮可能被跳过，只能靠 Delete 键（同样无提示）。属用户可感知的语义混乱，非纯 WCAG 条款问题。
- **建议**: 卡片容器去掉 `role="button"`，改 `role="listitem"`（配合视角9-02），标题区单独包一层 `<button>` 承担 onCardClick，删除按钮保持独立 button；列头同理：拖拽手柄/折叠按钮已是独立 button，仅列头标题文本包 `<button>` 承担 onColumnClick。
- **复核状态**: 未复核

### [G4-视角9-02] kanban `role="list"` 直接子项为 `role="button"`，缺少 `role="listitem"` 结构层

- **文件**: `packages/flux-renderers-scheduling/src/kanban/kanban-column.tsx:243-309`
- **证据片段**:
  ```tsx
  // 虚拟化路径：list 的直接子项是 role="none" 包装层 + 卡片按钮
  <div ref={cardContainerRef} role="list" style={{ height: totalSize, position: 'relative' }}>
    {virtualItems.map((virtualItem) => (
      <div key={card.id} role="none" style={{...}}>
        <KanbanCard ... />   {/* 卡片根是 role="button" */}
      </div>
    ))}
  </div>
  // 非虚拟化路径：卡片按钮直接挂在 list 下
  <div ref={cardContainerRef} role="list" className="space-y-2">
    {displayCards.map((card, idx) => (
      <React.Fragment key={card.id}> <KanbanCard ... /> ...
  ```
- **严重程度**: MEDIUM
- **现状**: 列体容器声明 `role="list"`，但其子项（无论经 `role="none"` 包装还是直接）都是 `role="button"` 的卡片，没有任何 `role="listitem"`。ARIA 要求 list 的子元素为 listitem；部分读屏在子项不合规时直接丢弃 list 语义，卡片间失去"列表 N 项"的导航与计数。
- **行业惯例**: ARIA Authoring Practices：`list > listitem`；共享前缀视角 9 明列"列表项 role=listitem"。AG Grid 行、Trello 列卡片均为 listitem 结构。
- **用户影响**: 读屏用户在列内无法用列表快捷键浏览卡片、听不到"共 N 张卡"，只能逐 Tab 碰；列表语义名存实亡。属可感知的导航能力缺失。
- **建议**: 虚拟化路径把 `role="none"` 包装层改为 `role="listitem"`（并在其内去掉卡片根的 `role="button"`，见视角9-01）；非虚拟化路径给每个卡片包一层或直接令卡片根为 `role="listitem"`，卡内主点击用真实 button 承载。
- **复核状态**: 未复核

### [G4-视角10-01] Loading 骨架三种实现并存：手写 animate-pulse div、ui Skeleton、手写 border-circle spinner

- **文件**: `packages/flux-renderers-scheduling/src/kanban/kanban-board.tsx:532-538`（对照 `gantt/gantt.tsx:467-472`、`barcode-input/barcode-scanner-overlay.tsx:255-260`）
- **证据片段**:

  ```tsx
  // kanban-board.tsx — 手写灰块 animate-pulse
  <div data-slot="kanban" ... className={cn('nop-kanban flex gap-4 p-4 animate-pulse', meta.className)}>
    {[1, 2, 3].map((i) => (
      <div key={i} className="nop-kanban-skeleton bg-gray-100 rounded-lg min-w-[280px] h-64" />
    ))}
  </div>

  // gantt.tsx / calendar.tsx — ui Skeleton 组件
  <div className="flex gap-2 p-2"><Skeleton className="h-8 w-32" /><Skeleton className="h-8 w-24" /></div>
  <Skeleton className="flex-1 m-2" />

  // barcode-scanner-overlay.tsx:257 — 手写 border-circle spinner
  <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
  ```

- **严重程度**: LOW
- **现状**: 同包三个 loading 面三种写法：kanban 手写 pulse 灰块（`bg-gray-100` 硬编码，且包 CSS `.nop-kanban-skeleton` 已定义 `var(--color-muted)` 造成双源）、gantt/calendar 用 ui `Skeleton`、barcode overlay 手写 spinner（mobile 包同类场景用 ui `Spinner`）。
- **行业惯例**: 共享前缀视角 10 基线：Loading=Spinner 组件；骨架统一用 shadcn `Skeleton`（ui 已导出）。
- **用户影响**: 用户跨 kanban→gantt→扫码界面看到的加载动效节奏与明暗不一致；kanban 骨架灰块在暗色主题下因 `bg-gray-100` 硬编码刺眼（与视角7-01 同根因的加载面表现）。影响轻微，故 LOW。
- **建议**: kanban 改用 ui `Skeleton`（`<Skeleton className="min-w-[280px] h-64 rounded-lg" />`，删除 `.nop-kanban-skeleton` 双源定义）；barcode overlay 改用 ui `Spinner className="size-8 text-white"`（对齐 mobile pull-refresh/infinite-scroll 用法）。
- **复核状态**: 未复核

### [G4-视角11-01] calendar 月视图溢出指示 "+N more" 呈可点击样式但无任何点击行为，被隐藏事件不可达

- **文件**: `packages/flux-renderers-scheduling/src/calendar/components/calendar-month-view.tsx:265-274`
- **证据片段**:
  ```tsx
  {
    dayEvents
      .filter((pe) => pe.overflowCount)
      .map((pe) => (
        <div
          key={`overflow-${dateStr}`}
          data-slot="calendar-event-overflow"
          className="absolute bottom-0 left-0 right-0 text-[10px] text-muted-foreground text-center cursor-pointer hover:underline"
          style={{ bottom: 0 }}
        >
          +{pe.overflowCount} {t('scheduling.calendar.more')}
        </div>
      ));
  }
  ```
- **严重程度**: MEDIUM
- **现状**: 溢出条渲染 `cursor-pointer` + `hover:underline`（强可点击暗示），但元素无 onClick、无 role、无 aria-label——点击无任何反应；同格被 `maxConcurrent` 折叠的事件没有任何查看通道。
- **行业惯例**: FullCalendar 的 "+N more" 点击打开 day popover；Ant Design Calendar 点击 "+N" 展开当日全部日程。共享前缀视角 11："功能入口与后续关键动作缺流程连接"、"看起来可点击实际无功能"应报告。
- **用户影响**: 用户看到"+2 more"会自然点击，结果毫无反应——既不知道隐藏的 2 个日程是什么，也没有任何提示说明为何无响应；排班冲突排查场景下关键信息（被折叠的日程）永久不可达，用户只能切周/日视图人工翻找。属可复现的交互障碍，通过真实用户影响检验。
- **建议**: 最小修复：移除 `cursor-pointer hover:underline` 消除虚假可供性，并补 `title={hiddenTitles.join('、')}`；完整修复：点击打开 Popover（ui 已有 `Popover`）渲染当日全部事件列表，`role="button"` + `aria-label={t('scheduling.calendar.more', ...)}` + `tabIndex={0}`。
- **复核状态**: 未复核

---

## 汇总

| 严重程度 | 数量 | 编号                                                                            |
| -------- | ---- | ------------------------------------------------------------------------------- |
| HIGH     | 0    | —                                                                               |
| MEDIUM   | 8    | 视角1-01、视角3-01、视角5-01、视角6-01、视角7-01、视角9-01、视角9-02、视角11-01 |
| LOW      | 6    | 视角4-01、视角5-02、视角5-03、视角8-01、视角8-02、视角10-01                     |

## 转 C2 候选（不计入发现）

1. **calendar "+N more" 的完整修复（当日 popover/切换日视图）**依赖日视图联动能力，若汇总阶段判定为能力建设而非一致性修复，建议并入 G-C（多视图联动）候选，关联本文件视角11-01。
2. **gantt 连线创建的触屏替代入口 / 键盘连线绑定**（`startKeyboardLink`/`completeKeyboardLink` 已在 `use-gantt-link-draw.ts` 导出但无 UI 接线）：键盘触达框架属 G-B2（已登记缺口）范围，本组仅登记其 gantt 连线场景实例。
3. **swipe-cell 键盘等价操作**：`swipe-cell.tsx:213-217` 注释明确"键盘开启 affordance 与 open 态播报刻意不加，责任转移给消费方"——该决策与 G-B2 相关，如后续要求移动端组件键盘可达，需 C2 层面重开。

## 未报告的边界情况备忘

- mobile 包 pull-refresh 的 pulling/loosing 态无 Vant 式箭头图标（文本反馈已存在，真实用户影响检验不通过 → 弃报）。
- kanban 工具栏 undo/redo/history 仅 `title` 无 `aria-label`（title 已提供可访问名称 → 弃报）。
- 包 CSS 与 TSX 硬编码类对同一属性的重复定义（如 `.nop-kanban-column` 与 `bg-gray-50`）涉及维度 10（marker 视觉样式归属），按边界排除不报；仅其用户可见后果已并入视角7-01。

## G5 — ai / graph / map / industrial+editor（HIGH 1 / MEDIUM 8 / LOW 9，共 18 条）

### [G5-视角1-01] ai-conversations 重命名/删除按钮使用文本字符 ✎/× 而非 lucide 图标

- **文件**: `packages/flux-renderers-ai/src/renderers/ai-conversations.tsx:124-151`
- **证据片段**:
  ```tsx
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    data-slot="ai-conversations-rename"
                    aria-label={t('flux.ai.renameConversation')}
                    disabled={disabled}
                    ...
                  >
                    ✎
                  </Button>
                  ...
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    data-slot="ai-conversations-delete"
                    aria-label={t('flux.ai.deleteConversation')}
                    ...
                  >
                    ×
                  </Button>
  ```
- **严重程度**: MEDIUM
- **现状**: 会话列表的行级重命名按钮渲染字面字符 `✎`、删除按钮渲染字面字符 `×`，均无 lucide 图标。同包 `user-edit.tsx:123` 编辑入口已用 `<Pencil>` 图标、`ai-attachments.tsx:319` 移除附件用 `<X>` 图标，同语义操作在包内已存在图标化实现。
- **行业惯例**: shadcn/ui 与 Ant Design 均以图标渲染行级操作（Pencil=编辑、Trash2/X=删除/移除）；本项目共享前缀明确「删除=Trash2Icon/XIcon（非文本字符 ×）」；且与 dedup-baseline §1 [视角1-01]（array-editor/key-value Add 按钮文本字符问题）同类根因的新实例，按基线规则应报。
- **用户影响**: 会话列表中 `✎`/`×` 在部分字体下降级为纯文本或等宽字符，与同页面其他图标化按钮（如附件 X、消息编辑 Pencil）视觉语言割裂；`×` 更常见语义是"关闭/移除条目"，与"删除整个会话"的破坏性含义不匹配，用户易误解点击后果。
- **建议**: `ai-conversations.tsx:136` 改为 `<Pencil className="h-3.5 w-3.5" />`（lucide-react，与 user-edit.tsx 同名图标）；`:150` 改为 `<Trash2 className="h-3.5 w-3.5" />`（删除语义优先 Trash2；若坚持"移除"语义则 `<X className="h-3.5 w-3.5" />` 与 ai-attachments 对齐）。
- **复核状态**: 未复核

### [G5-视角1-02] graph 搜索清除按钮使用文本字符 × 而非 XIcon

- **文件**: `packages/flux-renderers-graph/src/graph-renderer.tsx:588-598`
- **证据片段**:
  ```tsx
  <Button
    variant="ghost"
    size="sm"
    aria-label={t('flux.graph.clearSearch')}
    onClick={clearSearch}
    className="h-8 px-2"
  >
    ×
  </Button>
  ```
- **严重程度**: LOW
- **现状**: 搜索框的清除动作渲染字面字符 `×`，无图标。与 ai-attachments 移除按钮（lucide `X`）同语义不同实现。
- **行业惯例**: 搜索输入清除按钮行业标准为 X 图标（shadcn/ui 表单清除、Ant Design Input allowClear 均为 ×形 SVG 图标而非文本字符）；本项目共享前缀「删除/清除=Trash2Icon/XIcon（非文本字符 ×）」。
- **用户影响**: 低频路径（graph 搜索框内），文本 × 在不同字体/缩放下粗细与图标不一致，清除目标视觉语义弱于图标；用户不被告知时多数仍能猜到用途，故降为 LOW。
- **建议**: 改为 `<XIcon className="h-4 w-4" />`（lucide-react `X`），与 ai-attachments.tsx:319 的移除按钮图标统一。
- **复核状态**: 未复核

### [G5-视角1-03] 分支切换器 prev/next 使用文本字符 ‹/› 而非 Chevron 图标

- **文件**: `packages/flux-renderers-ai/src/renderers/ai-bubble/index.tsx:231-257`
- **证据片段**:
  ```tsx
  <Button
    type="button"
    variant="ghost"
    size="sm"
    data-slot="ai-bubble-branch-prev"
    aria-label={t('flux.ai.branchPrevious')}
    disabled={count <= 1}
    onClick={() => go(-1)}
    className="h-6 px-1"
  >
    ‹
  </Button>
  ```
- **严重程度**: LOW
- **现状**: 消息分支 prev/next 按钮渲染 `‹`/`›` 字符。同包内展开/折叠（ai-tool-call.tsx:161、reasoning.tsx:61）方向切换一律用 lucide `ChevronDown`/`ChevronRight`，无一处使用文本箭头字符。
- **行业惯例**: 分页/轮播/分支切换的方向控制在 shadcn/ui（Carousel、Pagination）与 Ant Design（Pagination）中均为 ChevronLeft/ChevronRight 图标；文本 `‹›` 不属于任何主流图标体系。
- **用户影响**: 边缘功能（host 提供 branches 数据时才渲染）；文本箭头与包内 Chevron 体系不一致，视觉重量偏轻、点击热区感知弱。通过真实用户影响检验：功能可用、语义可猜，评 LOW。
- **建议**: `ai-bubble/index.tsx:241` 改 `<ChevronLeft className="h-3.5 w-3.5" />`，`:256` 改 `<ChevronRight className="h-3.5 w-3.5" />`，与同包 ai-tool-call/reasoning 的 Chevron 尺寸规范（h-3.5 w-3.5）一致。
- **复核状态**: 未复核

### [G5-视角1-04] scada 编辑器工具箱对齐/分布/层级/缩放按钮使用生僻 Unicode 字形，与 graph 控制组 lucide 图标跨包不一致

- **文件**: `packages/flux-renderers-industrial/src/editor/toolbox/toolbox-panel.tsx:174-190`
- **证据片段**:
  ```tsx
        {btn('⌅L', () => handleAlign('left'), !canAlign, t('industrial.scada.editor.toolbox.alignLeft'), 'toolbox-btn-align-left')}
        {btn('⌅R', () => handleAlign('right'), !canAlign, t('industrial.scada.editor.toolbox.alignRight'), 'toolbox-btn-align-right')}
        {btn('⌅H', () => handleAlign('hcenter'), !canAlign, t('industrial.scada.editor.toolbox.alignHCenter'), 'toolbox-btn-align-hcenter')}
        ...
        {btn('↔', () => handleDistribute('horizontal'), !canDistribute, t('industrial.scada.editor.toolbox.distributeH'), 'toolbox-btn-distribute-h')}
        {btn('⤒', () => handleZOrder('toTop'), !hasSelection, t('industrial.scada.editor.toolbox.toTop'), 'toolbox-btn-to-top')}
        {btn('⤓', () => handleZOrder('toBottom'), !hasSelection, t('industrial.scada.editor.toolbox.toBottom'), 'toolbox-btn-to-bottom')}
  ```
- **严重程度**: MEDIUM
- **现状**: 8 个对齐按钮用 `⌅`+字母组合（⌅L/⌅R/⌅H/⌅T/⌅B/⌅V）、分布用 `↔`/`↕`、层级用 `⤒`/`↑`/`↓`/`⤓`、缩放用 `+`/`−`。`⌅`（BOTTOM HALF SEGMENT? 实为 U+2305）与 `⤒`/`⤓` 属生僻符号，字形依赖系统字体回退。同项目 graph 包的同类控制组（`graph-renderer.tsx:606-631`）缩放/适配用 lucide `ZoomIn`/`ZoomOut`/`Maximize` 图标。
- **行业惯例**: 画布编辑器（Figma、Excalidraw、AG Grid 列工具栏）对齐/分布/层级一律用图标库语义图标（如 lucide `AlignStartVertical`、`AlignCenterHorizontal`、`BringToFront`、`SendToBack`、`ArrowUpToLine`/`ArrowDownToLine`）；Ant Design 无此场景，shadcn/ui 生态以 lucide 为唯一图标源。本项目共享前缀视角 1 要求同语义操作跨组件图标一致。
- **用户影响**: SCADA 编辑器是主要 surface；`⌅L`/`⤒`/`⤓` 无法自解释（tooltip 是唯一线索，触屏无 tooltip），与 graph 缩放按钮的 lucide 图标形成明显的跨包视觉语言割裂；不同系统字体下 `⌅` 可能渲染为豆腐块。
- **建议**: 对齐五向改 `AlignStartVertical`/`AlignEndVertical`/`AlignCenterVertical`/`AlignStartHorizontal`/`AlignEndHorizontal` + `AlignCenterHorizontal`（lucide-react）；分布改 `AlignHorizontalDistributeCenter`/`AlignVerticalDistributeCenter`；层级改 `ChevronsUp`（toTop）/`ChevronUp`/`ChevronDown`/`ChevronsDown`（toBottom）；缩放改 `ZoomIn`/`ZoomOut` 与 graph-renderer.tsx:613/622 统一。
- **复核状态**: 未复核

### [G5-视角1-05] ai-voice-input 使用手绘内联 SVG 麦克风而非 lucide MicIcon

- **文件**: `packages/flux-renderers-ai/src/renderers/ai-voice-input.tsx:316-334`
- **证据片段**:
  ```tsx
  function MicIcon(): React.ReactElement {
    return (
      <svg
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        ...
      >
        <rect x="9" y="2" width="6" height="12" rx="3" />
        <path d="M5 11a7 7 0 0 0 14 0" />
        <line x1="12" y1="18" x2="12" y2="22" />
      </svg>
    );
  }
  ```
- **严重程度**: LOW
- **现状**: 手写内联 SVG 复刻 lucide Mic 路径。同文件包内其余所有图标（ai-attachments 的 Paperclip/X/Loader2/TriangleAlert、ai-bubble 的 Bot/User、ai-tool-call 的 Check/Ban 等）均为 lucide-react 导入，唯独此处绕过图标库。
- **行业惯例**: lucide-react 是本项目唯一图标源（styling-system.md Dependency Profile: `lucide-react - Icon library`）；shadcn/ui 组件不内联手绘 SVG。
- **用户影响**: 视觉上与 lucide Mic 几乎一致，用户难察觉差异；影响在于维护/主题一致性（strokeWidth/尺寸体系脱管），属实现一致性缺口而非可见缺陷，按真实用户影响检验降为 LOW。
- **建议**: 删除本地 `MicIcon` 函数，改为 `import { Mic } from 'lucide-react'` 并渲染 `<Mic className="h-4 w-4" aria-hidden="true" />`。
- **复核状态**: 未复核

### [G5-视角2-01] 用户消息编辑的取消按钮复用 "Stop"（停止）文案，与同包取消语义不一致

- **文件**: `packages/flux-renderers-ai/src/renderers/ai-bubble/user-edit.tsx:100-108`
- **证据片段**:
  ```tsx
  <div className="flex justify-end gap-2">
    <Button size="sm" variant="ghost" data-slot="ai-bubble-edit-cancel" onClick={cancelEdit}>
      {t('flux.ai.stop')}
    </Button>
    <Button size="sm" data-slot="ai-bubble-edit-submit" onClick={() => void resubmit()}>
      <Check className="h-3 w-3" />
      {t('flux.ai.send')}
    </Button>
  </div>
  ```
- **严重程度**: MEDIUM
- **现状**: 编辑态的取消动作（cancelEdit，恢复原消息）标签用 `flux.ai.stop`（en: "Stop" / zh: "停止"）。i18n 表中已有 `flux.common.cancel`（en: "Cancel" / zh: "取消"）未被使用；同文件确认按钮亦与 ai-sender 提交按钮（无图标纯文案 Send）不一致（此处 Check+Send）。
- **行业惯例**: shadcn/ui Dialog 与 Ant Design 表单的放弃修改动作一律为 Cancel/取消；"Stop/停止"专属中断进行中的流式请求（ai-sender.tsx:131 的 Stop 按钮即此语义）。同一词表内 Stop 与 Cancel 混用违反"同一语义操作同一文案"。
- **用户影响**: 用户在编辑消息时看到"停止"按钮：既可能理解为"取消编辑"也可能理解为"停止生成"，与上方流式场景的 Stop（中断请求）语义直接冲突；中文"停止"同样歧义。属于高频交互路径（编辑重发）上的文案误导。
- **建议**: `user-edit.tsx:102` 改为 `{t('flux.common.cancel')}`；若要保留操作按钮排布约定，variant 可保持 ghost 或改 outline（与 styling-system.md Dialog 约定对齐），确认按钮 `:104-107` 去掉 Check 图标或改用 `t('flux.common.confirm')` 类确认文案，与 ai-sender 的纯文案 Send 风格统一。
- **复核状态**: 未复核

### [G5-视角3-01] 流式响应期间发送框 textarea 整体禁用，用户无法预输入下一条消息

- **文件**: `packages/flux-renderers-ai/src/renderers/ai-sender.tsx:190-207`
- **证据片段**:
  ```tsx
      <div data-slot="ai-sender-input" className="relative">
        <Textarea
          ref={inputRef}
          value={draft}
          placeholder={props.placeholder ?? t('flux.ai.placeholder')}
          aria-label={props.placeholder ?? t('flux.ai.messageInput')}
          disabled={loading || disabled}
          rows={1}
  ```
- **严重程度**: MEDIUM
- **现状**: `loading`（引擎 isProcessing，含整个流式生成期）直接禁用输入框。主流 AI 对话产品在生成期间保持输入框可编辑，仅禁用发送。
- **行业惯例**: ChatGPT/Claude/Gemini 及 Ant Design X、vercel/ai 聊天模板均在 streaming 中保持 textarea 可输入（提交按钮 disabled）；MUI/AntD 长任务输入惯例同样是"输入不因处理中而锁死"。
- **用户影响**: 长回答流式期间（可达数十秒）用户想先打好下一条消息被完全阻止，textarea 呈灰态且已草稿内容不可修改——正常使用中必然撞上并可感知的交互收窄。
- **建议**: `ai-sender.tsx:196` 改为 `disabled={disabled}`，保持仅提交按钮（`:139` 已有 `disabled={loading || ...}`）与 `commit()` 的 isProcessing 守卫（`:88`）兜底防流中提交；富文本路径 `:169` 同步改为 `disabled={disabled}` 并将 loading 仅传给提交控制。
- **复核状态**: 未复核

### [G5-视角4-01] scada 属性面板 Label 未与控件关联（无 htmlFor/id），Switch 标签不可点击

- **文件**: `packages/flux-renderers-industrial/src/editor/inspector/inspector-field.tsx:38-66`
- **证据片段**:
  ```tsx
    if (widget === 'switch') {
      return (
        <div className="flex items-center gap-2">
          <Switch checked={Boolean(value)} onCheckedChange={(v) => onChange(v)} />
          <Label className="text-xs">{t(label)}</Label>
          {errorEl}
        </div>
      );
    }
  ...
    return (
      <div>
        <Label className="text-xs">{t(label)}</Label>
        <Input
          type={inputType}
          className="text-xs"
  ```
- **严重程度**: MEDIUM
- **现状**: 三类字段（switch/select/text-number）的 `<Label>` 均未携带 `htmlFor`，控件也无 `id`。切换类字段点击标签不切换开关，点击标签不聚焦输入框。同项目 flux-renderers-form 的 FieldFrame 以 Label+htmlFor/controlId 关联为既定契约。
- **行业惯例**: shadcn/ui Switch 表单模式为 `<Label htmlFor="x">` + `<Switch id="x">`（标签可点击切换）；Ant Design Form Item 自动 label htmlFor 关联。共享前缀视角 4 明确「checkbox/radio/switch 标签可点击（Label+htmlFor）」。
- **用户影响**: 属性面板是编辑器高频操作面；点击标签无任何反应（尤其 Switch 场景用户预期整行可点），与系统内表单（flux-form）行为不一致；精细小控件（Switch 28px 宽）的可点热区未按惯例扩展到标签。
- **建议**: 为每字段生成稳定 `id`（如 `inspector-${field.key}`），`<Label htmlFor={id}>` + `<Switch id={id}>` / `<Input id={id}>` / `<NativeSelect id={id}>`；`ui/label.tsx` 已是标准 shadcn Label，支持 htmlFor 透传，无需改 UI 层。
- **复核状态**: 未复核

### [G5-视角4-02] ai-sender 字数计数悬浮在 textarea 内容区右下，长文本与计数重叠

- **文件**: `packages/flux-renderers-ai/src/renderers/ai-sender.tsx:208-218`
- **证据片段**:
  ```tsx
  {
    props.showWordLimit && typeof maxLength === 'number' ? (
      <span
        data-slot="ai-sender-count"
        className={cn(
          'absolute bottom-1 right-2 text-xs',
          overLimit ? 'text-destructive' : 'text-muted-foreground',
        )}
      >
        {draft.length}/{maxLength}
      </span>
    ) : null;
  }
  ```
- **严重程度**: LOW
- **现状**: 计数 `absolute bottom-1 right-2` 悬浮于 `relative` 的输入容器内、textarea 之上，无底色/遮挡保护；textarea `rows={1}`、`min-h-[40px]`，单行输入接近满宽时文字延伸至右下计数正下方。
- **行业惯例**: Ant Design TextArea showCount 与 Element Plus 字数统计均在输入框**外部**（右下外沿）或带背景的浮层内，不与内容同层重叠。
- **用户影响**: 接近 maxLength 的长文本场景（该功能本身就为限长而设）文字与 `123/500` 相互压盖、无法读清；出现频率受限长场景，评 LOW。
- **建议**: 计数移出输入容器：容器改 `pb-5`，计数改 `static mt-1 self-end`（或外层 flex-col），或给计数加 `bg-background/90 rounded px-1` 保证可读。
- **复核状态**: 未复核

### [G5-视角4-03] 属性面板 number 输入清空即写 0，图元坐标跳零

- **文件**: `packages/flux-renderers-industrial/src/editor/inspector/inspector-field.tsx:80-87`
- **证据片段**:
  ```tsx
        value={String(value ?? '')}
        onChange={(e) => {
          if (isNumeric) {
            onChange(Number(e.target.value));
          } else {
            onChange(e.target.value);
          }
        }}
  ```
- **严重程度**: LOW
- **现状**: number 输入框清空时 `Number('') === 0` 立即写 working copy——用户全选删除 x 坐标的瞬间图元跳到 x=0，且 undo 栈多一条 0 值记录；输入 `12.5` 的中间态（`1`、`12.`）也逐字符写库。
- **行业惯例**: 编辑器属性面板（Figma、Chrome DevTools）number 输入允许临时空态，失焦或合法值才提交；至少 `Number.isFinite` 校验后才写。
- **用户影响**: 整理坐标时"选中→删除→输入新值"是常规手势，中途画布元素跳走干扰定位；可感知且必然复现，但可撤销，评 LOW。
- **建议**: `onChange` 中 `const n = Number(e.target.value); if (e.target.value !== '' && Number.isFinite(n)) onChange(n);` 并配 `onBlur` 时对空值回填当前值（或保留 draft 直到 blur）。
- **复核状态**: 未复核

### [G5-视角5-01] scada-canvas 默认 loading 态渲染空白区域，无 Spinner/文案，与同包 editor 及 map/ai 的 loading 模式不一致

- **文件**: `packages/flux-renderers-industrial/src/renderer/scada-canvas.tsx:332-333`（配套 `packages/flux-renderers-industrial/src/styles.css:14-19`）
- **证据片段**:
  ```tsx
        {effectiveStatus === 'loading' ? (
          asReactNode(loading?.render()) ?? <div data-slot="scada-canvas-loading" className="nop-scada-canvas-loading" />
        ) : effectiveStatus === 'error' ? (
  ```
  ```css
  .nop-scada-canvas .nop-scada-canvas-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
  }
  ```
- **严重程度**: MEDIUM
- **现状**: 未提供 loading region 时的 fallback 是**空 div**——CSS 只做居中容器，内部零内容、零动画。同包 scada-editor-canvas.tsx:384-388 fallback 至少渲染 i18n 文案（纯文本，无 Spinner）；map-renderer.tsx:368-373 与 ai-bubble/renderers/loading.tsx 均为 `Spinner`+文案。
- **行业惯例**: 耗时>2s 的画布初始化（OL 懒加载/leafer 构建）必须有可见 loading 指示（Spinner 组件优先，共享前缀视角 5：loading 渲染逻辑是否有 Spinner 组件）。空白画布区用户无法区分"加载中"与"白屏故障"。
- **用户影响**: 首次进入含 scada-canvas 页面时出现一块空白方框直至引擎 ready——非设计师用户会判断为页面坏了；与同项目 map/ai 的 Spinner 模式肉眼可见地不一致。
- **建议**: `scada-canvas.tsx:333` fallback 改为 `<div data-slot="scada-canvas-loading" className="nop-scada-canvas-loading"><Spinner className="size-4" /><span>{t('flux.common.loading')}</span></div>`（`@nop-chaos/ui` Spinner，与 map-renderer.tsx:369-372 同构）；editor 的纯文本 loading（scada-editor-canvas.tsx:385-387）同步补 Spinner 保持同包一致。
- **复核状态**: 未复核

### [G5-视角5-02] ai-conversations 空列表无任何提示内容

- **文件**: `packages/flux-renderers-ai/src/renderers/ai-conversations.tsx:70-157`
- **证据片段**:
  ```tsx
      <ul data-slot="ai-conversations-list" className="flex flex-col gap-1">
        {conversations.map((conv) => {
          ...
        })}
      </ul>
    </aside>
  ```
- **严重程度**: LOW
- **现状**: `conversations` 为空数组时组件仅渲染 header 的"New conversation"按钮 + 空 `<ul>`，列表区完全空白。同包 ai-message-list 空态有 emptyState region/i18n（ai-chat.tsx:520-526 `selectConversation`）、graph/map 空态有 `flux.common.noData`。
- **行业惯例**: 列表类组件空态应显示有意义提示（shadcn/ui Empty、Ant Design Empty；共享前缀视角 5：空数据渲染是否有有意义提示（非空白/空串））。
- **用户影响**: 首次打开会话侧栏只见一个按钮和空面板，与同包其他 surface 的空态规范不齐；有 New 按钮兜底故非阻断，评 LOW。
- **建议**: `conversations.length === 0` 时在 `<ul>` 位置渲染 `<div data-slot="ai-conversations-empty" className="px-2 py-4 text-xs text-muted-foreground">{t('flux.ai.selectConversation')}</div>`（复用既有 i18n key）。
- **复核状态**: 未复核

### [G5-视角6-01] 工具箱导入弹窗取消按钮 variant=ghost，偏离项目 Dialog 按钮约定（outline）

- **文件**: `packages/flux-renderers-industrial/src/editor/toolbox/toolbox-panel.tsx:231-238`
- **证据片段**:
  ```tsx
  <DialogFooter>
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setImportOpen(false)}
      data-slot="scada-editor-toolbox-cancel"
    >
      {t('industrial.scada.editor.toolbox.cancel')}
    </Button>
    <Button
      size="sm"
      onClick={handleImportConfirm}
      disabled={!importText.trim()}
      data-slot="scada-editor-toolbox-confirm"
    >
      {t('industrial.scada.editor.toolbox.confirmImport')}
    </Button>
  </DialogFooter>
  ```
- **严重程度**: LOW
- **现状**: 取消=ghost、确认=default，顺序正确（左次右主）。项目 styling-system.md「Dialog / Form Action Button Convention」明确规定次操作/关闭使用 `outline`/`destructive` variant。
- **行业惯例**: shadcn/ui Dialog 默认 Cancel 为 `outline`；本项目自己的成文约定同向。ghost 属于无边框行级操作形态，用于弹窗 footer 次按钮偏离成文约定。
- **用户影响**: 用户影响轻微（ghost 仍可点、位置正确），属约定执行偏差而非交互障碍；与同包内其它弹窗（当前唯一 Dialog）无内部对照，评 LOW。
- **建议**: `toolbox-panel.tsx:232` 改 `variant="outline"`；若 ghost 是有意为之，应回写 styling-system.md 约定表，二选一消除成文约定与实现的漂移。
- **复核状态**: 未复核

### [G5-视角7-01] scada-canvas 运行时错误文案硬编码 #dc2626，同包 editor 同语义用 --nop-danger 令牌

- **文件**: `packages/flux-renderers-industrial/src/styles.css:21-29`
- **证据片段**:
  ```css
  .nop-scada-canvas .nop-scada-canvas-error {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 1rem;
    color: #dc2626;
    font-size: 0.875rem;
  }
  ```
- **严重程度**: LOW
- **现状**: 运行时画布错误文字用裸 hex。同包 editor 错误样式（`editor/styles.css:76-85`）用 `color: var(--nop-danger, #dc2626)`；ai 包错误横幅用 Tailwind `text-destructive` 令牌（error.tsx:21）。同语义（错误文字红）三种实现，唯此处不可主题化。
- **行业惯例**: theme-compatibility.md Renderer Ownership Rules：「reading CSS variables instead of hardcoded colors where visuals are package-owned」；shadcn 生态错误色一律走 `--destructive` 语义令牌。
- **用户影响**: 暗色/定制主题宿主下错误文案保持亮红常量色，可能与宿主 destructive 色不一致；触发场景为配置错误等低频路径，评 LOW。
- **建议**: `src/styles.css:27` 改 `color: var(--nop-danger, hsl(var(--destructive), #dc2626));`，与 editor/styles.css:82 的令牌链路对齐。
- **复核状态**: 未复核

### [G5-视角9-01] map 画布 viewport 缺 role="application"/aria-label，违反画布包装层 a11y 契约且与 scada 同型渲染器不一致

- **文件**: `packages/flux-renderers-map/src/map-renderer.tsx:365-367`
- **证据片段**:
  ```tsx
  {
    mapVisible ? (
      <div ref={containerRef} data-slot="map-viewport" className="h-full w-full" />
    ) : null;
  }
  ```
- **严重程度**: MEDIUM
- **现状**: OpenLayers 画布挂载点是普通 div，无 `role`/`aria-label`（OL 自身亦不注入）。同项目画布类渲染器已按契约实施：scada-canvas.tsx:326-327 `role="application" aria-label={t('industrial.scada.canvasLabel')}`、scada-editor-canvas.tsx:286-287 同型。`renderer-markers-and-selectors.md`「Canvas / scene-graph interaction surfaces」节明确规定：包装第三方 scene-graph/canvas 引擎的 div 必须显式暴露 `role="application"` + i18n 化 `aria-label`（docs/bugs/78 HCAX-2 沉淀），且「Same-type renderers must apply the contract consistently」。
- **行业惯例**: 地图类组件（Mapbox GL、Leaflet 惯例）对外层容器提供可识别的 application/region 语义与可读名称；本项目的成文契约即为标准。
- **用户影响**: 读屏用户进入地图区域得到的是无名可依的普通流内容，无法得知此处是可交互地图（click/hover 均有行为）；同一产品内 SCADA 画布有名、地图无名，体验不一致。
- **建议**: `map-renderer.tsx:366` 加 `role="application"` 与 `aria-label={t('flux.map.mapLabel')}`（en-US/zh-CN 新增 key，如 "Interactive map"），并补 `data-slot` 断言级 e2e（沿 docs/bugs/78 的 `getAttribute` 断言模式）。
- **复核状态**: 未复核

### [G5-视角9-02] graph 节点键盘不可达（tabIndex/role 均未下发），画布 wrapper 亦无 role="application"

- **文件**: `packages/flux-renderers-graph/src/xyflow-canvas.tsx:92-93`（关联 `graph-renderer.tsx:107-112`）
- **证据片段**:
  ```tsx
    return (
      <div className="nop-graph-viewport" data-slot="graph-viewport">
        <ReactFlowProvider>
  ```
  ```tsx
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
  ```
- **严重程度**: LOW
- **现状**: `elementsSelectable/nodesDraggable=false` 使 xyflow 对节点判定 `isFocusable=false`（xyflow 源码：非 focusable 节点不下发 tabIndex/role），节点点击选中（graph-renderer 的 onNodeClick→syncSelection）与双击事件成为鼠标专用；`.nop-graph-viewport` 包装层无 `role="application"`/`aria-label`，也不满足 markers 文档画布包装契约。graph 的搜索框 Enter 循环（handleSearchKeyDown）提供了部分键盘选中路径，故非完全不可达。
- **行业惯例**: markers 文档画布契约（同 G5-视角9-01 引用）；AG Grid/x6/React Flow 官方示例均保持节点可聚焦或提供等价键盘路径。
- **用户影响**: 纯键盘用户仅能经搜索间接选中节点，无法 Tab 遍历/Enter 选中任意节点；画布区域对读屏不可识别。有搜索替代路径且 graph 常为辅助展示，评 LOW。
- **建议**: `xyflow-canvas.tsx:93` 包装层加 `role="application"` + i18n aria-label（key 对齐 `flux.graph.*` 族新增 `canvasLabel`）；节点层在 `graph-node.tsx` 根 div 补 `role="button"` + `tabIndex={0}` + Enter/Space 触发 `onNodeClick`（或按 markers 文档在 wrapper 层统一处理）。
- **复核状态**: 未复核

### [G5-视角10-01] 会话删除一键直达、无确认且不可逆（删除整段持久化对话）

- **文件**: `packages/flux-renderers-ai/src/renderers/ai-conversations.tsx:138-151`（控制链路 `adapters/use-conversation.ts:61` `deleteConversation` 无确认层）
- **证据片段**:
  ```tsx
  <Button
    type="button"
    variant="ghost"
    size="sm"
    data-slot="ai-conversations-delete"
    aria-label={t('flux.ai.deleteConversation')}
    disabled={disabled}
    onClick={() => {
      const payload = { type: 'ai:conversation-delete', id: conv.id };
      void props.events.onItemDelete?.(payload, dispatchCtx(payload));
    }}
  >
    ×
  </Button>
  ```
- **严重程度**: HIGH
- **现状**: hover 出现的 `×` 单击即派发删除事件；默认控制器实现（useConversation.deleteConversation → storage 持久层）无确认、无撤销、删除活跃会话仅做选中修正。共享前缀视角 10 允许"行级=ghost+可选确认"，但该惯例针对行内条目移除；此处删除对象是**整段持久化对话**（数据承载实体，非列表行），且图标 `×` 常规语义是"移出列表/关闭"而非销毁数据。
- **行业惯例**: ChatGPT/Claude/Poe 的会话删除均为显式确认（二次确认弹层或"点击再次确认"）；Ant Design Popconfirm 用于破坏性行操作。HIGH 判级依据共享前缀：「不可逆破坏性后果、破坏性操作无确认」。
- **用户影响**: 误触（触屏/快速点击）即永久丢失整段对话历史，无任何挽回入口；用户不被告知时必然在误删发生后才察觉——满足 HIGH 的真实影响检验。高频路径（会话管理）上的不可逆操作。
- **建议**: 最小修复：删除按钮 onClick 改为二次确认（`window.confirm` 不达标，用 AlertDialog：`<AlertDialogAction>`/`<AlertDialogCancel>`，确认键文案 `t('flux.ai.deleteConversation')`、确认钮 `variant="destructive"`）；图标按 G5-视角1-01 改 Trash2 强化破坏性暗示。若产品裁定 host 全权负责确认，需在 renderer 契约注释与 flux-guide 中显式声明该责任边界。
- **复核状态**: 未复核

### [G5-视角11-01] ai-bubble 无任何出厂容器视觉：shape/placement 模式形同虚设，用户/AI 消息默认无视觉区分

- **文件**: `packages/flux-renderers-ai/src/renderers/ai-bubble/index.tsx:130-149`（配套 `packages/flux-renderers-ai/src/styles.css` 全文无 `[data-slot='ai-bubble']` 容器规则）
- **证据片段**:
  ```tsx
    <article
      className={cn('nop-ai-bubble', props.className)}
      data-slot="ai-bubble"
      data-role={renderMessage.role}
      data-placement={effectivePlacement}
      data-shape={shape}
      data-streaming={isStreaming ? '' : undefined}
      data-error={isError ? '' : undefined}
      ...
    >
  ```
- **严重程度**: MEDIUM
- **现状**: bubble 容器发布 `data-role`/`data-placement`/`data-shape`（默认 `'rounded'`）标记，但包内 `styles.css`（含 dist 唯一样式出口，package.json exports `./styles.css`）只有 markdown 排版/头像/光标/波形规则，无任何 `[data-slot='ai-bubble']` 背景、圆角、左右对齐规则；全仓 grep 确认无其他 CSS 命中。默认 `ai-chat`（showAvatar=false、无 host CSS）下用户与助手消息均为同底色平铺文本，`shape` 三档与 `placement` 左右分布零视觉差异。
- **行业惯例**: 对话 UI（ChatGPT、Ant Design X Bubble、vercel/ai 模板）默认即区分角色气泡（用户右对齐+异色底）；schema 暴露 `shape: 'corner'|'rounded'|'none'` 且默认 `rounded` 即承诺了出厂视觉。按共享前缀 AI-safe 检验：默认安全堆叠导致无法识别信息层级，可报。
- **用户影响**: 开箱即用的 ai-chat 中用户无法凭视觉分辨"哪句是我说的、哪句是 AI 回的"（仅文字内容可推断），主路径信息层级缺失；与同包 markdown/头像的完整出厂样式形成"半成品"反差。
- **建议**: 在 `styles.css` 补容器基线：`[data-slot='ai-bubble'][data-placement='end'] { align-self/ margin-left:auto }` 类布局 + `[data-role='user']` 用 `hsl(var(--primary)/0.08)` 底、assistant 用 `hsl(var(--muted))` 底，`[data-shape='rounded']` 配 `border-radius: 12px`、`'none'` 显式 0；保持 host CSS 可覆盖（令牌优先、字面回退沿 D2 双轨模式）。
- **复核状态**: 未复核

---

## 汇总

| 严重程度 | 数量 | 条目                                                                                        |
| -------- | ---- | ------------------------------------------------------------------------------------------- |
| HIGH     | 1    | G5-视角10-01                                                                                |
| MEDIUM   | 8    | G5-视角1-01、视角1-04、视角2-01、视角3-01、视角4-01、视角5-01、视角9-01、视角11-01          |
| LOW      | 9    | G5-视角1-02、视角1-03、视角1-05、视角4-02、视角4-03、视角5-02、视角6-01、视角7-01、视角9-02 |

## 转 C2 候选（不计入发现）

- 无条目落入 dedup-baseline §2 已登记缺口 16 项的表象。附带观察（供 Phase 5 ⑤ G-I 暗色抽查承接，非本轮发现）：`flux-renderers-industrial/src/editor/styles.css` 全部面板底色走 `var(--nop-surface, #ffffff)` 系光面 fallback，宿主未定义 `--nop-*` 时 SCADA 编辑器面板在暗色主题下保持亮底；该现象属 G-I「暗色回归 + 运行时主题切换」抽查范畴。

## G6 — @nop-chaos/ui 62 模块（HIGH 0 / MEDIUM 8 / LOW 8，共 16 条）

### [G6-视角3-01] InputGroupAddon 键盘可达（tabIndex=0）但无可见 focus-visible 焦点态

- **文件**: `packages/ui/src/components/ui/input-group.tsx:43-69`（样式定义 24-41）
- **证据片段**:
  ```tsx
  <div
    role="group"
    tabIndex={0}
    data-slot="input-group-addon"
    data-align={align}
    className={cn('nop-input-group ',inputGroupAddonVariants({ align }), className)}
    onClick={(e) => {
      if ((e.target as HTMLElement).closest('button')) { return; }
      e.currentTarget.parentElement?.querySelector('input')?.focus();
    }}
    onKeyDown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') { ... }
  ```
- **严重程度**: MEDIUM
- **现状**: InputGroupAddon 是可 Tab 聚焦的可交互元素（`tabIndex={0}` + Enter/Space 触发聚焦内部 input），但 `inputGroupAddonVariants`（24-41 行）不含任何 `focus-visible:*` 类；InputGroup 容器的 ring 仅在 `has-[[data-slot=input-group-control]:focus-visible]`（内部控件聚焦）时出现，addon 自身聚焦时全无视觉指示。
- **行业惯例**: shadcn/ui 一切 tabIndex 可达交互面均有可见焦点（本仓 `item.tsx:35` 的 `focus-visible:ring-[3px] focus-visible:ring-ring/50`、`button.tsx:7` 的 `focus-visible:ring-3`）。
- **用户影响**: 键盘用户 Tab 进入带前缀图标/按钮的输入组时，addon 聚焦与 input 聚焦在视觉上无法区分，不知道当前焦点落在哪、按 Enter 会发生什么。
- **建议**: 在 `inputGroupAddonVariants` 基类追加 `focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50`（与 `input.tsx:16` 同规格）。
- **复核状态**: 未复核

### [G6-视角3-02] 可点击 Card（role="button"）无 focus-visible ring

- **文件**: `packages/ui/src/components/ui/card.tsx:12-36`
- **证据片段**:
  ```tsx
  const isInteractive = typeof onClick === 'function';
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(
        'nop-card group/card flex flex-col gap-4 overflow-hidden rounded-xl bg-card py-4 ... ring-1 ring-foreground/10 ...',
        isInteractive && 'nop-haptic',
        className,
      )}
      {...(isInteractive
        ? { role: 'button', tabIndex: 0, onClick, onKeyDown: ... }
        : null)}
  ```
- **严重程度**: MEDIUM
- **现状**: 传入 `onClick` 时 Card 升级为 `role="button"` + `tabIndex={0}` + Enter/Space 触发，但根类串（18 行）没有任何 `focus-visible:*` 类；`nop-haptic` 只提供 `:active` 透明度反馈。
- **行业惯例**: shadcn/ui 可聚焦元素统一 `focus-visible:ring-3 focus-visible:ring-ring/50`（`button.tsx:7`）；本仓同类卡片式可点元素 `Item`（`item.tsx:35`）也带完整 focus-visible ring。
- **用户影响**: 键盘用户在卡片列表中 Tab 时，焦点落在可点击卡片上无任何可见指示，无法确认当前将触发哪张卡片。
- **建议**: `isInteractive` 分支追加 `focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50`（可经 `cn` 条件段注入，非交互态不引入）。
- **复核状态**: 未复核

### [G6-视角3-03] Drawer 拖拽缩放把手仅指针可达，键盘用户无法调整大小

- **文件**: `packages/ui/src/components/ui/drawer.tsx:183-195`（对照 `resizable.tsx:21-39`）
- **证据片段**:
  ```tsx
  <div
    data-slot="drawer-resize-handle"
    data-direction={direction}
    className={handleClassName}
    onPointerDown={resizeController.onPointerDown}
    role="separator"
    aria-orientation={direction === 'left' || direction === 'right' ? 'vertical' : 'horizontal'}
    aria-label={t('flux.drawer.resize')}
  />
  ```
- **严重程度**: MEDIUM
- **现状**: 自定义把手只绑定 `onPointerDown` 拖拽（`useDrawerResize`），无 `tabIndex`、无键盘步进；而同包 `ResizableHandle`（react-resizable-panels Separator）自带方向键调整。同为"可拖动分隔面"语义，交互可达性不一致。
- **行业惯例**: WAI-ARIA separator（可交互形态）要求 focusable + 方向键步进；shadcn/ui `ResizableHandle` 键盘可操作。
- **用户影响**: 键盘/AT 用户能打开 Drawer 却只能接受默认宽度（`w-3/4` / `sm:max-w-sm`），无法把侧栏收窄让出内容空间——交互能力因输入方式而异。
- **建议**: 把手补 `tabIndex={0}` + focus-visible ring + 方向键步进（Arrow 步进 16px、Shift×3，步长参照 `dialog.tsx:238` 的拖拽键盘约定），复用 `useDrawerResize` 的 setSize 通道。
- **复核状态**: 未复核

### [G6-视角4-01] Input 默认高度 36px，与同排 Select/Button/InputGroup 的 32px 体系错位

- **文件**: `packages/ui/src/components/ui/input.tsx:17`（对照 `select.tsx:45`、`button.tsx:24`、`input-group.tsx:16`、`native-select.tsx:23`）
- **证据片段**:
  ```tsx
  // input.tsx
  'data-[size=default]:h-9 data-[size=default]:px-3',
  // select.tsx SelectTrigger
  '... data-placeholder:text-muted-foreground data-[size=default]:h-8 data-[size=sm]:h-7 ...',
  // button.tsx
  default: 'h-8 gap-1.5 px-2.5 ...',
  ```
- **严重程度**: MEDIUM
- **现状**: `Input` default 档 `h-9`（36px）；`SelectTrigger` default `h-8`（32px）、`Button` default `h-8`、`InputGroup` 容器 `h-8`、`NativeSelect` `h-8`。全仓表单控件的 default 高度基线是 32px，独立 `Input` 是唯一 36px 的例外（`InputGroupInput` 被压回容器 32px 体系内）。
- **行业惯例**: Ant Design / MUI 同排输入类控件统一高度；按本项目审查口径"内部做法不一无论行业惯例一律报跨组件不一致"。
- **用户影响**: 表单行/筛选栏中 `Input` 与 `Select`、按钮并排时出现 4px 高度差，控件顶/底基线错位，密集表单与 `ButtonGroup` 包裹场景尤其可见。
- **建议**: 将 `Input` default 改为 `h-8`（对齐 32px 基线，与 InputGroup 内嵌形态一致）；如需 36px 档位，新增 `size="lg"` 并全仓对齐引用点。
- **复核状态**: 未复核

### [G6-视角4-02] NativeSelect 与 SelectTrigger 的 xs 档高度不一致（24px vs 28px）

- **文件**: `packages/ui/src/components/ui/native-select.tsx:23`（对照 `select.tsx:45`）
- **证据片段**:
  ```tsx
  // native-select.tsx
  '... data-[size=sm]:h-7 data-[size=sm]:rounded-[min(var(--radius-md),10px)] data-[size=sm]:py-0.5
       data-[size=xs]:h-6 data-[size=xs]:rounded-md data-[size=xs]:py-0 data-[size=xs]:text-xs ...',
  // select.tsx SelectTrigger
  '... data-[size=sm]:h-7 data-[size=sm]:rounded-[min(var(--radius-md),10px)] data-[size=xs]:h-7 ...',
  ```
- **严重程度**: LOW
- **现状**: 两套下拉选择控件在 default（32px）/sm（28px）档完全对齐，唯独 xs 档 `NativeSelect` 为 `h-6`（24px）而 `SelectTrigger` 为 `h-7`（28px）。
- **行业惯例**: 同语义控件（下拉选择）同尺寸档应同高（AntD Select 单一尺寸体系；shadcn size 档跨控件对齐）。
- **用户影响**: 同一工具栏/筛选区混用两种 select 的 xs 档时高度差 4px，按钮组拼接（ButtonGroup 内嵌 select）时圆角/高度接缝可见。
- **建议**: `NativeSelect` xs 改 `h-7`，`text-xs` 可保留（与 `Button` xs 的 `h-6 text-xs` 不冲突，因 select 不参与按钮组拼接）。
- **复核状态**: 未复核

### [G6-视角6-01] AlertDialogAction 点击不关闭弹窗，与 AlertDialogCancel 行为不对称

- **文件**: `packages/ui/src/components/ui/alert-dialog.tsx:136-155`
- **证据片段**:

  ```tsx
  function AlertDialogAction({ className, ...props }: React.ComponentProps<typeof Button>) {
    return <Button data-slot="alert-dialog-action" className={cn(className)} {...props} />;
  }

  function AlertDialogCancel({ ... }) {
    return (
      <AlertDialogPrimitive.Close
        data-slot="alert-dialog-cancel"
        className={cn(className)}
        render={<Button variant={variant} size={size} />}
        {...props}
      />
    );
  }
  ```

- **严重程度**: MEDIUM
- **现状**: `AlertDialogCancel` 经 `AlertDialogPrimitive.Close` 包裹（点击即关），而 `AlertDialogAction` 是裸 `Button`，未接 `AlertDialogPrimitive.Action/Close`——确认按钮点击后弹窗保持打开，关闭责任被转嫁给每个调用方自行实现。
- **行业惯例**: shadcn/ui `AlertDialogAction` 基于 `AlertDialogPrimitive.Action`，点击即关闭；Ant Design Modal 确认键默认触发并关闭。
- **用户影响**: 调用方只写 `<AlertDialogAction>确定</AlertDialogAction>` 时出现"点确定没反应"的死路（用户可 Esc/取消兜底，故非 HIGH）；不同调用方自行补 onClose 会导致确认行为漂移。
- **建议**: 改为 `render={<Button />}` 包裹 `AlertDialogPrimitive.Action`（保持 variant 默认 `default`），恢复"点击即关 + 可被 onClick 阻断"的标准语义。
- **复核状态**: 未复核

### [G6-视角7-01] Badge success/warning 变体硬编码 emerald/amber 调色板，未使用既有 --success/--warning 令牌

- **文件**: `packages/ui/src/components/ui/badge.tsx:19-20`（令牌对照 `packages/theme-tokens/src/styles.css:122-129、182-189`）
- **证据片段**:
  ```tsx
  success: 'bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
  warning: 'bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
  // theme-tokens 已有完整明暗两套：
  // --success: 160 84% 39%;  --warning: 38 92% 50%;  （数值即 emerald-500 / amber-500）
  ```
- **严重程度**: LOW
- **现状**: `success`/`warning` 属语义状态色，却直接写死 Tailwind 调色板类；theme-tokens 已把 `--success`/`--warning`（含 success-bg/warning-bg）建为跨主题公共令牌，且数值与所用色板一致。
- **行业惯例**: shadcn/ui Badge 状态色由语义令牌驱动；本项目 `flux-guide/14-theming.md` 亦将 success/warning 列为公共令牌。
- **用户影响**: 默认主题下视觉零差异；但宿主为品牌适配覆盖 `--success`/`--warning` 时，Badge 状态色不跟随，与其它走令牌的成功/告警指示形成双套色。
- **建议**: 改为令牌化 `bg-success/15 text-success dark:bg-success/20`（warning 同理），并确认 `tailwind-preset` 已暴露 `success`/`warning` 颜色工具族。
- **复核状态**: 未复核

### [G6-视角7-02] 弹层遮罩双令牌并存：Dialog 用 --dialog-overlay-bg（70% 黑），Sheet/Drawer/AlertDialog 用 --surface-overlay（40%）

- **文件**: `packages/ui/src/components/ui/dialog.tsx:98`（对照 `sheet.tsx:34`、`drawer.tsx:107`、`alert-dialog.tsx:29`；令牌值 `packages/theme-tokens/src/styles.css:68、104`）
- **证据片段**:
  ```tsx
  // dialog.tsx DialogOverlay
  'isolate bg-[var(--dialog-overlay-bg)] duration-100 supports-backdrop-filter:backdrop-blur-xs ...',
  // alert-dialog.tsx / drawer.tsx / sheet.tsx
  'fixed inset-0 isolate bg-surface-overlay duration-100 ...',
  // styles.css:  --surface-overlay: rgba(15, 23, 42, 0.4);  --dialog-overlay-bg: rgb(0 0 0 / 0.7);
  ```
- **严重程度**: MEDIUM
- **现状**: 同一"模态遮罩"语义拆成两个令牌且取值差异显著（纯黑 70% vs 蓝灰 40%）；`theme-contract.test.tsx:49-56` 把该分叉固化为断言。宿主覆盖 `--surface-overlay` 无法影响 Dialog 遮罩，反之亦然。
- **行业惯例**: 同一组件体系遮罩统一一档：AntD Modal/Drawer 共用 Mask 令牌；shadcn Dialog/Sheet 共用 `bg-black/80`。
- **用户影响**: 同屏先后打开 Sheet 与 Dialog（或 AlertDialog）时，背景遮罩深浅、色相发生明显跳变，模态层级感不一致。
- **建议**: 统一读 `--surface-overlay`（将 `--dialog-overlay-bg` 收敛为其别名以兼容既有宿主覆盖）；若 Dialog 特深遮罩是有意设计，需在 theme-tokens 注明理由并放宽 theme-contract 断言。
- **复核状态**: 未复核

### [G6-视角8-01] 三个浮层内建关闭按钮留白不一致（Sheet 12px，Dialog/Drawer 8px）

- **文件**: `packages/ui/src/components/ui/sheet.tsx:72`（对照 `dialog.tsx:212`、`drawer.tsx:204`）
- **证据片段**:
  ```tsx
  // sheet.tsx
  render={<Button variant="ghost" className="absolute top-3 right-3" size="icon-sm" />}
  // dialog.tsx
  render={<Button variant="ghost" className="absolute top-2 right-2" size="icon-sm" />}
  // drawer.tsx
  className="absolute top-2 right-2 z-30"
  ```
- **严重程度**: LOW
- **现状**: 三族浮层（Sheet/Dialog/Drawer）的内建 X 关闭钮同为 `variant="ghost" size="icon-sm"`，但定位偏移为 `top-3 right-3`（12px）与 `top-2 right-2`（8px）两派。
- **行业惯例**: 同族浮层关闭钮位置统一（AntD Drawer/Modal 同值；shadcn Dialog/Sheet 均 `top-4 right-4`）。
- **用户影响**: 从 Sheet 切换到 Dialog/Drawer 时关闭钮位置轻移 4px，属于低频但可感知的微顿挫；不影响操作成功率。
- **建议**: 三处统一为 `top-2 right-2`（多数派），或在浮层族共享一个 `surfaceCloseButtonClassName` 常量防再分叉。
- **复核状态**: 未复核

### [G6-视角9-01] SidebarRail aria-label/title 硬编码英文 "Toggle Sidebar"（同文件其余文案已走 t()）

- **文件**: `packages/ui/src/components/ui/sidebar-layout.tsx:148-151`（对照同文件 135 行）
- **证据片段**:
  ```tsx
  <button
    type="button"
    data-sidebar="rail"
    data-slot="sidebar-rail"
    aria-label="Toggle Sidebar"
    tabIndex={-1}
    onClick={toggleSidebar}
    title="Toggle Sidebar"
  ```
- **严重程度**: MEDIUM
- **现状**: `aria-label` 与 `title` 均为硬编码英文；同文件 `SidebarTrigger`（135 行）与移动端 SheetHeader（61-62 行）已用 `t('flux.sidebar.toggle')` / `t('flux.sidebar.title')`，同模块内 i18n 双轨。
- **行业惯例**: 本仓浮层/侧栏文案契约走 `lib/i18n` 的 `t()`（dialog/pagination/carousel 等模块均如此）。
- **用户影响**: `title` 是浏览器原生 tooltip，鼠标悬停侧栏边缘热区时可见英文 "Toggle Sidebar"，本地化产品下直接可见；SR 用户听到英文名。属 ma5-ux 视角9-02（硬编码英文 fallback）同根因新实例，按去重基线 §1 规则上报。
- **建议**: `aria-label`/`title` 统一改 `t('flux.sidebar.toggle')`（可加 `flux.sidebar.railToggle` 细分键）。
- **复核状态**: 未复核

### [G6-视角9-02] CommandDialog 默认 title/description 硬编码英文，未走 t()

- **文件**: `packages/ui/src/components/ui/command.tsx:23-24`（渲染于 38-41 行）
- **证据片段**:
  ```tsx
  function CommandDialog({
    title = 'Command Palette',
    description = 'Search for a command to run...',
    ...
  }) {
    return (
      <Dialog {...props}>
        <DialogHeader className="sr-only">
          <DialogTitle>{title}</DialogTitle>
  ```
- **严重程度**: LOW
- **现状**: 命令面板的 DialogTitle/Description 默认值为英文字面量，作为 sr-only 可访问名/描述未走 `t()`；本模块其余部分无文案，包内 `breadcrumb/pagination/dialog` 等均已令牌化。
- **行业惯例**: 本仓浮层文案契约 `t()`（`dialog.tsx:205/215`、`carousel.tsx:133/199` 等）。
- **用户影响**: 局限为 SR 用户在本地化界面听到英文弹窗名与提示；可见用户不受影响。属 ma5-ux 视角9-02 同根因新实例。
- **建议**: 默认值改 `t('flux.command.title')` / `t('flux.command.description')`（新增 i18n 键），保留 prop 覆盖能力。
- **复核状态**: 未复核

### [G6-视角9-03] Spinner aria-label="Loading" 硬编码英文

- **文件**: `packages/ui/src/components/ui/spinner.tsx:4-13`
- **证据片段**:
  ```tsx
  function Spinner({ className, ...props }: React.ComponentProps<'svg'>) {
    return (
      <Loader2Icon
        role="status"
        aria-label="Loading"
        className={cn('nop-spinner ', 'size-4 animate-spin', className)}
        {...props}
      />
    );
  }
  ```
- **严重程度**: LOW
- **现状**: 全仓通用 loading 指示组件的可访问名为英文字面量，未走 `t()`；包内 `i18n.ts` 已提供 `t` 且 `dialog/carousel/drawer` 等在用。
- **行业惯例**: 本仓 i18n 契约；loading 播报文案应随宿主语言。
- **用户影响**: 所有依赖 Spinner 的加载场景对 SR 用户播报英文 "Loading"。属 ma5-ux 视角9-02 同根因新实例。
- **建议**: 改 `aria-label={t('flux.common.loading')}`（新增键），并允许 props 覆盖。
- **复核状态**: 未复核

### [G6-视角9-04] ChartContainer 图表面无 role/aria-label 锚点

- **文件**: `packages/ui/src/components/ui/chart.tsx:83-101`
- **证据片段**:
  ```tsx
  <div
    data-slot="chart"
    data-chart={chartId}
    className={cn('nop-chart ',
      "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground ...",
      className,
    )}
    {...props}
  >
    <ChartStyle id={chartId} config={config} />
    <RechartsPrimitive.ResponsiveContainer initialDimension={initialDimension}>
  ```
- **严重程度**: LOW
- **现状**: 图表容器对外仅暴露 `data-slot`/`data-chart`；内部 recharts svg 无可访问名，模块也未提供 `role="img"` 或 label 透传约定，图表对辅助技术是无名图形区。
- **行业惯例**: 图表容器按 WAI 图表模式提供 `role="img"` + `aria-label`（AG Grid 图表/Scheduler 图表面板均有名）。
- **用户影响**: SR 用户遇到无名 graphic，无法得知图表主题；不影响鼠标/键盘主路径，故 LOW。
- **建议**: ChartContainer 增加 `role="img"` 与 `aria-label`/`aria-labelledby` prop 透传（默认不注入以保持兼容），并在 chart renderer 接入文档中标注。
- **复核状态**: 未复核

### [G6-视角9-05] 可拖拽 DialogHeader 对 SR 语义暴露为 role="toolbar"

- **文件**: `packages/ui/src/components/ui/dialog.tsx:265-291`
- **证据片段**:
  ```tsx
  <div
    data-slot="dialog-header"
    ...
    role={dragContext.enabled ? 'toolbar' : undefined}
    aria-orientation={dragContext.enabled ? 'horizontal' : undefined}
    tabIndex={dragContext.enabled ? 0 : undefined}
    onKeyDown={handleKeyDown}
    {...restProps}
  >
  ```
- **严重程度**: LOW
- **现状**: `draggable`（默认 true）时 DialogHeader 获得 `role="toolbar"`，但其内没有任何 menuitem/button 子控件——toolbar 只承载"方向键移动对话框"这一行为，sr-only 说明挂在 header 内部。
- **行业惯例**: WAI-ARIA toolbar pattern 期望聚合一组工具控件；可聚焦拖拽把手更贴近 `role="separator"`（focusable 形态）或无 role + 说明文本。
- **用户影响**: SR 用户听到"工具栏"却找不到任何工具项，且方向键行为（移动窗口）与工具栏预期不符，产生语义困惑。
- **建议**: 改为 `role="separator"`（focusable 形态，配 `aria-label` = t('flux.dialog.moveDialog')），或移除 role 仅保留 `tabIndex` + sr-only 说明。
- **复核状态**: 未复核

### [G6-视角10-01] 菜单族勾选指示位置分裂：Menubar 左置，DropdownMenu/ContextMenu/Select/Combobox 右置

- **文件**: `packages/ui/src/components/ui/menubar.tsx:114、120`（对照 `dropdown-menu.tsx:195、202`、`context-menu.tsx:161、167`、`select.tsx:117、127`、`combobox.tsx:133、141`）
- **证据片段**:
  ```tsx
  // menubar.tsx MenubarCheckboxItem —— 指示器左置
  'relative flex cursor-default items-center gap-1.5 rounded-md py-1 pr-1.5 pl-7 ...',
  <span className="pointer-events-none absolute left-1.5 flex size-4 items-center justify-center ...">
  // dropdown-menu.tsx / context-menu.tsx / select.tsx / combobox.tsx —— 指示器右置
  "relative flex w-full cursor-default items-center gap-2 rounded-md py-1 pr-8 pl-1.5 ...",
  <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center" />
  ```
- **严重程度**: MEDIUM
- **现状**: 五个菜单族模块的 checkbox/radio 选中指示（CheckIcon）位置两派：`Menubar*` 左置（`pl-7` + `left-1.5`），其余四模块右置（`pr-8` + `right-2`）。shadcn/ui 上游菜单族统一左置，本项目多数派为右置。
- **行业惯例**: shadcn/ui / AntD 内部菜单勾选列位置各自统一；按本项目口径"内部做法不一无论行业惯例一律报跨组件不一致"。
- **用户影响**: 从顶部 Menubar 勾选项切到任意下拉/右键菜单时，勾选标记从条目列首跳到列尾，视觉扫描路径断裂，密集菜单（视图切换、列筛选）下更明显。
- **建议**: 以多数派右置为准收敛 Menubar（`pr-8` + 指示器 `right-2`）；若选左置则需同步改 dropdown/context/select/combobox 四模块（改动面更大，不推荐本轮做）。
- **复核状态**: 未复核

### [G6-视角11-01] Item size="sm" 与 default 变体类串完全相同，尺寸变体发虚

- **文件**: `packages/ui/src/components/ui/item.tsx:43-47`
- **证据片段**:
  ```tsx
  size: {
    default: 'gap-2.5 px-3 py-2.5',
    sm: 'gap-2.5 px-3 py-2.5',
    xs: 'gap-2 px-2.5 py-2 in-data-[slot=dropdown-menu-content]:p-0',
  },
  ```
- **严重程度**: LOW
- **现状**: `Item` 的 `size="sm"` 与 `default` 逐字相同（`ItemMedia`/`ItemContent` 等 slot 的 `group-data-[size=sm]/item:*` 钩子也仅覆盖 image 档），仅 `xs` 有效——类型层承诺三档、视觉层只有两档。
- **行业惯例**: 尺寸变体应有可见差（shadcn Button sm `h-7` vs default `h-8`；AntD SizeType 三档均有差）。
- **用户影响**: 调用方传 `size="sm"` 期望紧凑排布但渲染无任何变化——"看起来支持、实际无效"的发虚 API，问题在消费侧才暴露。
- **建议**: 为 sm 定义介于两档之间的样式（如 `gap-2 px-3 py-2 text-xs`），或在类型层移除 `'sm'` 档避免误导。
- **复核状态**: 未复核

---

## 视角覆盖与零发现说明

- **视角 1（图标语义）**: grep 全部 lucide 图标引用（68 处）逐一定位：关闭=XIcon（dialog/sheet/drawer/combobox clear/chip remove 统一）、展开/折叠=ChevronDown↔ChevronUp（accordion）、首/末页=ChevronsLeft/Right + 前/后=ChevronLeft/Right（pagination）、日历=ChevronLeft/Right/Down（calendar）、toast 五态图标（CircleCheck/Info/TriangleAlert/OctagonX/Loader2）语义正确。**零发现**。
- **视角 2（按钮样式）**: 语义操作组（确认/取消：`AlertDialogCancel` outline + `AlertDialogAction` default；关闭 X=ghost icon-sm 三族一致；菜单 destructive 变体五模块一致 `data-[variant=destructive]:text-destructive`）。**零发现**。
- **视角 5（Loading/空状态）**: `Spinner`（role=status，见视角9-03 的 i18n 条）、`Skeleton`、`SidebarMenuSkeleton` 就绪；`Empty` 组件族、`CommandEmpty`、`ComboboxEmpty`（`group-data-empty` 显隐）提供有意义空态插槽。**零新发现**（空态文案由消费侧注入，基座无空白兜底问题）。
- **视角 12（视觉原创性/反模板化）**: 基座为原语层，无页面级排版堆叠问题；未见"AI-safe 默认堆叠"类缺陷。**零发现**。
- 视角 3/4/6/7/8/9/10/11 发现见上清单。

## 转 C2 候选（dedup §2 已登记缺口的表象，不计入发现）

1. **G-I（暗色回归）**: `sonner.tsx:31` `theme={props.theme ?? 'light'}` 默认主题硬编码 light，暗色宿主下 toast 面板走 light 配色（仅当宿主未传 theme 时）。
2. **G-I（暗色回归）**: `json-viewer.tsx:29-33` 走 react-json-view-lite `defaultStyles`（base.css:2 直接 bundle 其 dist CSS），白底硬编码样式，暗色主题下 JSON 树呈白块；建议纳入 R2 Phase 5 暗色抽查产出。

## 覆盖率声明

- 扫描模块数：**62/62**，无未扫模块。`*.test.*`（accordion.test / alert-dialog.test / badge.test / button-group.test / button.test / card.test / carousel.test / chart.test / checkbox.test / dialog.test / drawer.test / dropdown-menu.test / field.test / input.test / native-select.test / overlay-zindex.test / popover.test / radio-group.test / select.test / separator.test / sheet.test / sidebar-context.test / sonner-strict-mode.test / sonner.test / switch.test / table.test / tabs.test / textarea.test / theme-contract.test）按口径不在范围。

## G7 — playground 19 页（HIGH 1 / MEDIUM 13 / LOW 5，共 19 条）

### [G7-视角2-01] 8 处 `variant:"primary"` 为非法 Button variant，主操作按钮渲染为无背景文本按钮

- **文件**: `apps/playground/src/complex-pages/page-schemas/standard-crud.json:47,160,319`；`master-detail.json:280`；`approval-tasks.json:152`；`complex-form.json:151`；`combo-editor.json:71`；`business-document.json:125`
- **证据片段**:
  ```json
  // standard-crud.json:43-48（toolbar 新增）；:157-162（新增对话框"保存"）；:316-321（编辑对话框"保存"）同样写法
  "toolbar": [
    {
      "type": "button",
      "label": "新增",
      "variant": "primary",
  ```
  ```ts
  // packages/flux-renderers-basic/src/schemas.ts:241 —— schema 类型里没有 "primary"
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  // packages/flux-renderers-basic/src/button.tsx:65 —— 原样透传，无归一化
  const variant = (props.props.variant ?? 'default') as ButtonVariant;
  // cva 0.7.1 dist/index.mjs:26-28 —— 未命中值取 undefined，不回落 defaultVariants
  const variantKey = falsyToString(variantProp) || falsyToString(defaultVariantProp);
  return variants[variant][variantKey]; // 'primary' → undefined → 该轴无任何类
  ```
- **严重程度**: HIGH
- **现状**: `docs/architecture/variant-vocabulary.md:75` 明确 `button.variant: "primary"` 非法（应使用 `"default"`，项目自身校验会报 `invalid-property-value`）。上述 8 处 JSON 不受 TS 类型约束，运行时 cva 对未命中值不产生任何背景/边框/hover 类，按钮只剩基类（`border-transparent`+`text-sm`+focus ring）。受影响的是各页**主操作**：新增用户、新增/编辑对话框"保存"、审批"通过"、复杂表单"保存"、保存联系人、提交采购单。同页对比：`取消` 是有边框的 outline 按钮，`保存` 反而是无背景纯文本——视觉权重倒挂。
- **行业惯例**: shadcn/ui Dialog/AlertDialog 的确认钮为 filled primary（`bg-primary text-primary-foreground`）；Ant Design Modal 的 `okButton` 默认 `type="primary"` 实心钮。主确认操作在操作区必须是视觉权重最高的元素。
- **用户影响**: 打开"新增用户"对话框，"保存"看起来像一段普通文字而非可点按钮，主操作无法辨识；表单主路径（保存/提交/通过）的引导完全失效。非设计师用户首次遇到必然迟疑"哪里是确认"。通过真实用户影响检验。
- **建议**: 将 8 处 `"variant": "primary"` 改为 `"variant": "default"`（与 `master-detail.json:232-237` 的"新增"及 sundial 页已正确使用的 `"variant": "default"` 对齐）；或按 `variant-vocabulary.md` 的迁移表改为 `intent: "primary"`（待 intent 落地后）。同时建议给 playground 的 JSON schema 增加 shape-validation 提示的消费出口（编译期 warning 目前对 demo 作者不可见）。
- **复核状态**: 未复核

### [G7-视角1-02] `icon:"tray"` 在 lucide-react 中不存在，渲染为 Circle 占位图标

- **文件**: `sundial-workbench.json:199-204,232-237`；`sundial-detail.json:425-430`；`sundial-todo-dialog.json:184-189`；`sundial-settings.json:287-292,335-340`
- **证据片段**:
  ```json
  // sundial-workbench.json:198-215 —— 侧边栏"列表"导航（选中/未选中两份均用 tray）
  {
    "type": "icon",
    "icon": "tray",
    "size": 18,
    "color": "#ea7a2a"
  },
  { "type": "text", "text": "列表", "className": "text-sm text-[#0d0d0d]" },
  ```
  ```ts
  // packages/ui/src/lib/icon-utils.ts:283-294 —— 未命中回落 Circle
  const key = toLucideKey(normalizedIconName); // 'tray' → 'Tray'
  return (
    (icons as Record<string, LucideIconComponent>)[key] ??
    (Circle as unknown as LucideIconComponent)
  );
  ```
- **严重程度**: MEDIUM
- **现状**: 安装的 `lucide-react@1.17.0` 无 `Tray` 导出（`rg "\bTray\b" dist/cjs/lucide-react.js` 零命中）。`normalizeIconName`/`ICON_ALIAS_MAP` 也没有 `tray` 的映射，于是 5 处"列表/收件箱"语义位置全部渲染成 `Circle`——一个空心圆环，出现在 workbench 侧边栏导航、详情页"列表"字段行、新建待办对话框"列表"字段行、设置页"数据"分区导航上。
- **行业惯例**: Ant Design 用 `InboxOutlined`、shadcn 生态惯用 lucide `Inbox`（本仓库 alias map 已有 `'schedule': 'calendar-clock'` 这类同名校正先例）。图标名失效时应显式换用存在且语义匹配的图标，而不是静默落到通用占位圆。
- **用户影响**: 侧边栏第二项"列表"左侧是一个无意义圆圈，与相邻 `layers`/`bar-chart-3` 的具象图形形成刺眼反差；用户无法靠图标辨识"列表/收件箱"入口，且 4 页重复出现同一错位图标。
- **建议**: 将 `"icon": "tray"` 改为 `"icon": "inbox"`（lucide `Inbox` 存在且本 schema 其他位置已使用，如 `sundial-settings.json:193`），或在 `packages/ui/src/lib/icon-utils.ts` 的 `ICON_ALIAS_MAP` 增加 `tray: 'inbox'` 兜底。
- **复核状态**: 未复核

### [G7-视角11-03] 新建待办主路径断链："添加"仅关对话框，无提交、无落库、无任何反馈

- **文件**: `sundial-workbench.json:1715-1724`；`sundial-todo-dialog.json:309-318`
- **证据片段**:
  ```json
  // sundial-workbench.json:1715-1724 —— 表单 actions 的主按钮
  {
    "type": "button",
    "label": "添加",
    "variant": "default",
    "className": "sd-btn sd-btn-default",
    "testid": "sundial-workbench-todo-submit",
    "onClick": { "action": "closeSurface" }
  }
  ```
- **严重程度**: MEDIUM
- **现状**: 两张页面的"新建待办"对话框里，用户填完标题/备注后点"添加"，动作链只有 `closeSurface`——没有 `submitForm`、没有 ajax、没有 toast，输入内容直接丢弃，看板列表也无变化（看板本身为静态行）。同族页面里设置页"保存"有 ajax+成功提示、详情页"移到列表"有 ajax+toast，唯独两条新建路径是纯关闭。
- **行业惯例**: Ant Design/ shadcn 模式下，对话框主按钮要么执行提交（成功后 toast+列表刷新），要么明确标注为演示占位。对比本仓库 `sundial-settings.json:1006-1008` 的 `"保存成功（已写入演示后端）"` 诚实占位写法。
- **用户影响**: 待办应用的第一主操作是"添加待办"；用户输入后点添加，对话框关了但列表没变、没有任何确认——"我刚才添加的东西去哪了？"。首用用户必然重复尝试。通过真实用户影响检验。
- **建议**: 为"添加"补最小闭环：`onClick` 改为 `[{action:"ajax", args:{url:"/r/Sundial__updateTodoItem"...}}, {action:"showToast", args:{message:"已添加（demo）"}}, {action:"closeSurface"}]`；或在按钮 label/对话框描述中显式标注"演示：不会保存"。
- **复核状态**: 未复核

### [G7-视角11-04] workbench 侧边栏「列表/分析」导航切换后主内容区无任何变化

- **文件**: `sundial-workbench.json:184-308`（导航 onClick），`:824-1665`（主内容仅绑定 activeView）
- **证据片段**:
  ```json
  // sundial-workbench.json:190-197 —— "列表"导航只改 activeSection
  "visible": "${activeSection === 'lists'}",
  "onClick": { "action": "setValue", "args": { "path": "activeSection", "value": "lists" } },
  // sundial-workbench.json:826-827 —— 主内容三个看板全部只依赖 activeView
  "testid": "sundial-board-default",
  "visible": "${activeView === 'all' || activeView === 'today' || activeView === 'scheduled'}",
  ```
- **严重程度**: MEDIUM
- **现状**: 侧边栏第一组导航（工作台/列表/分析）点击后只有高亮态移动（`sd-nav-selected` 成对 visible 互换），主内容区的全部 visible 条件只引用 `activeView`（`sundial-board-default`、`sundial-board-completed`、`sundial-board-trash`），没有任何 `activeSection === 'lists' | 'analytics'` 的内容分支。切到"分析"后页面停留在原看板。
- **行业惯例**: 导航项切换必须带来内容区变化或明确的"建设中"占位（Ant Pro / shadcn dashboard 模板均如此）；同一产品内（本组 sundial-settings.json 五个分区都有对应 panel 并可切换）标准应一致。
- **用户影响**: 用户点"分析"，高亮移走但画面纹丝不动——要么以为点击失效反复点击，要么以为数据加载卡死。导航是撒谎的。通过真实用户影响检验。
- **建议**: 为 lists/analytics 补可见内容分支（哪怕复用 `Sundial__lists`/`Sundial__summary` 数据源的只读卡片），或将这两个导航项标注"即将推出"badge（参照 `sundial-settings.json:844-846` 的 `sd-badge-warning` 写法）并禁用点击。
- **复核状态**: 未复核

### [G7-视角11-05] 任务详情对话框内容静态：点任意任务行都打开同一条"撰写季度复盘报告"

- **文件**: `sundial-workbench.json:1730-1760`（对话框），`:995-1016,1083-1097,1224-1238,1365-1379,1442-1456`（各行 onClick 写入不同 activeTaskId）
- **证据片段**:
  ```json
  // sundial-workbench.json:1754-1759 —— 对话框标题为写死文案
  {
    "type": "text",
    "text": "撰写季度复盘报告",
    "className": "text-sm font-medium text-[#0d0d0d]",
    "testid": "sundial-detail-title-text"
  }
  ```
- **严重程度**: MEDIUM
- **现状**: 五个分区的每条任务行 onClick 都认真写入各自的 `activeTaskId`（1/2/3/4/5/6/10），但对话框正文的标题与备注是硬编码文案，不引用 `${activeTaskId}` 或任何数据源。点"预约牙医检查"打开的详情仍显示"撰写季度复盘报告 / 包含数据复盘和 OKR 回顾两部分"。
- **行业惯例**: 列表行→详情是"选择→展示所选"契约（AG Grid/Ant 均如此）；详情内容至少应回显所点行的 title/subtitle。同组 `sundial-detail.json:1256` 的子任务对话框已用三元表达式按 `activeSubtask` 切换标题，本应沿用同一做法。
- **用户影响**: 用户点"预约牙医检查"，弹出的却是"撰写季度复盘报告"——所见与所选不符，用户会怀疑点错了行或系统错乱。通过真实用户影响检验。
- **建议**: 将对话框标题/备注改为按 `activeTaskId` 的三元表达式（照抄 `sundial-detail.json:1254-1259` 模式），或在 openDialog args 里携带行数据并用 `${$slot.record.title}` 回显。
- **复核状态**: 未复核

### [G7-视角3-06] 已完成任务自相矛盾：标题划线删除线 + 圆圈 checkbox 未勾选

- **文件**: `sundial-workbench.json:1100-1121,1543-1578`；`sundial-detail.json:720-731`
- **证据片段**:
  ```json
  // sundial-workbench.json:1100-1115 —— checkbox 无 value，标题却是 line-through
  { "type": "checkbox", "name": "t2", "className": "sd-checkbox", "testid": "sundial-cb-t2", "shape": "circle" },
  { "type": "container", "className": "flex-1 min-w-0", "body": [
    { "type": "text", "text": "给项目经理回电话",
      "className": "text-sm font-medium text-[#636363] line-through truncate" },
  ```
- **严重程度**: MEDIUM
- **现状**: workbench"今天"分区第 1 行、已完成看板 2 行、detail 页子任务第 3 行的标题都带 `line-through`（完成态），但其 circle checkbox 均未声明初始勾选值，首屏渲染为空圈。同时这些 checkbox 勾选后也没有任何联动（标题不会加删除线、计数不变），勾选状态与行视觉完全脱钩。
- **行业惯例**: Todo 应用（TickTick/Things/滴答清单）完成态 = 勾选框选中 + 文本划线，两者必须同时成立；空圈+划线是明确的渲染矛盾。
- **用户影响**: 用户看到划线任务配一个空圈，第一反应是"这个任务到底完成没完成"；去勾选它，页面又毫无反应，形成双重困惑。通过真实用户影响检验。
- **建议**: 给这些 checkbox 补初始值（form `data` 中 `t2/t7/t8/d-s3: true`，或 schema `value: true`）；联动样式受 G-F（选中态 schema 表达）能力所限，可在条目上以成对 visible 表达勾选/未勾选两种文案样式，或注明受 G-F 约束待 P 系列回写。
- **复核状态**: 未复核

### [G7-视角10-07] sundial 破坏性操作无确认：子任务硬删除与"移到垃圾箱"立即执行

- **文件**: `sundial-detail.json:601-627,766-791,905-937`；`sundial-workbench.json:2173-2201`
- **证据片段**:
  ```json
  // sundial-detail.json:604-626 —— 子任务删除：ajax 硬删 + toast，无 confirmText
  "onClick": [
    { "action": "ajax", "args": { "url": "/r/Sundial__deleteSubtask", "method": "post", "data": { "id": 1 } } },
    { "action": "setValue", "args": { "path": "subtaskDeleted1", "value": true } },
    { "action": "showToast", "args": { "message": "子任务已删除" } }
  ]
  ```
- **严重程度**: MEDIUM
- **现状**: `deleteSundialSubtask` 在会话内存库中物理删除（`showcase-env.ts:599-609`），schema 未提供确认或撤销；"移到垃圾箱/垃圾桶"同样一键直达。对照同仓库企业页：standard-crud 行删/批删（`standard-crud.json:340,184`）、master-detail 明细删除（`master-detail.json:222`）都有 `confirmText`，确认桥 `confirmBridge` 在 env 中可用，补确认零成本。
- **行业惯例**: AG Grid/Ant Design 行内破坏性操作 = 二次确认或可撤销 toast；本仓库视角 10 基线亦为"删除确认流程"统一。
- **用户影响**: 手滑点中 12px 间距内的 trash 图标按钮，子任务立即消失且无法找回（mock 库已删）；与用户在同仓库其他页面建立的"删除必确认"预期相悖。判定说明：按判级"破坏性操作无确认"属 HIGH，因目标为演示页低频路径降级为 MEDIUM。
- **建议**: 为 `Sundial__deleteSubtask` 与移入垃圾箱的 ajax 动作补 `"confirmText": "确认删除该子任务？"` / `"确认移到垃圾箱？"`（与 `standard-crud.json:333-343` 同构）。
- **复核状态**: 未复核

### [G7-视角10-08] 行级"删除"按钮样式不一致：standard-crud 为 destructive，master-detail 为默认实心主色

- **文件**: `standard-crud.json:328-344`；`master-detail.json:211-227`
- **证据片段**:
  ```json
  // standard-crud.json:329-332 —— destructive 语义明确
  { "type": "button", "label": "删除", "variant": "destructive", "testid": "btn-delete", ... }
  // master-detail.json:212-215 —— 同语义无 variant，落 default（实心主色）
  {
    "label": "删除",
    "testid": "btn-delete-item",
  ```
- **严重程度**: MEDIUM
- **现状**: 两张页面的表格行内"删除"是同一语义操作：standard-crud 用 `destructive`（浅红底红字），master-detail 未声明 variant 落 `default`（实心 `bg-primary` 白字）。删除在 master-detail 里反而长得像主操作按钮。
- **行业惯例**: Ant Design Table `danger`/`Popconfirm` 删除为红色系；shadcn 数据表格行删除用 destructive 或 ghost+红色图标。同语义操作跨页 variant 必须一致。
- **用户影响**: 从用户管理页走到订单明细页，"删除"从红色变成主色实心钮，用户对"这个按钮会不会直接删数据"的风险感知被削弱。通过真实用户影响检验。
- **建议**: `master-detail.json:211-227` 的删除按钮补 `"variant": "destructive"`，与 standard-crud 对齐。
- **复核状态**: 未复核

### [G7-视角10-09] sundial 对话框操作区模式不统一：确定/确认混用、单按钮与双按钮并存

- **文件**: `sundial-detail.json:162-183`（取消+确认）；`sundial-workbench.json:1833-1854,1921-1942,2049-2070`（取消+确定）；`:2146-2167`（取消+确认）；`sundial-todo-dialog.json:119-130,254-265`（仅"确定"）
- **证据片段**:
  ```json
  // sundial-workbench.json:1844-1853 —— 日期选择器用"确定"
  { "type": "button", "label": "取消", ... },
  { "type": "button", "label": "确定", "variant": "default", "testid": "sundial-taskdetail-date-submit", ... }
  // sundial-workbench.json:2157-2166 —— 同一对话框内"移到列表"选择器用"确认"
  { "type": "button", "label": "取消", ... },
  { "type": "button", "label": "确认", "variant": "default", "testid": "sundial-taskdetail-move-submit", ... }
  ```
- **严重程度**: MEDIUM
- **现状**: 同语义的"选择器提交"按钮在 sundial 五页内三种形态：detail 页全部"确认"；workbench 任务详情的日期/重复/列表用"确定"、移到列表用"确认"；todo-dialog 页的日期/列表选择器干脆只有"确定"无"取消"（关闭只能靠外部点击，而该页对话框又常以 `closeOnOutsideClick:false` 出现，用户对关闭路径无稳定预期）。
- **行业惯例**: shadcn/ui、Ant Design 对同一产品内同语义确认钮文案唯一（OK/确定二选一）；模态选择器标配 [取消, 确定] 双钮。企业页 14 张全部统一为"取消(outline)+保存(primary)"，sundial 族内部反而分裂。
- **用户影响**: 同一个"任务详情"对话框里连开两个选择器，按钮一会儿叫"确定"一会儿叫"确认"；在 todo-dialog 页的选择器里找不到取消。文案与结构的不一致让用户在相同操作上重新学习。通过真实用户影响检验。
- **建议**: sundial 五页统一确认钮文案（建议"确定"），补齐 `sundial-todo-dialog.json` 两个选择器的"取消"ghost 钮（照抄 `sundial-detail.json:162-172`）。
- **复核状态**: 未复核

### [G7-视角4-10] settings「保存」提示"已写入演示后端"，但连接信息输入值不在保存范围

- **文件**: `sundial-settings.json:940-990`（URL/key 输入），`:992-1011`（保存按钮）
- **证据片段**:
  ```json
  // sundial-settings.json:998-1009 —— includeScope 只含 mode
  "onClick": [
    { "action": "ajax",
      "args": { "url": "/r/Sundial__updateSettings", "method": "post", "includeScope": ["mode"] },
      "messages": { "success": "保存成功（已写入演示后端）" } }
  ]
  ```
- **严重程度**: MEDIUM
- **现状**: 同一卡片里有三个可编辑输入：Supabase 项目 URL（`name: "supabase-url"`）、anon 公钥（`name: "supabase-key"`）和上方同步方式单选。保存只提交 `mode`；后端 `Sundial__updateSettings` 也仅消费 mode（`showcase-env.ts:610-619`）。用户改完 URL 点保存，收到"保存成功（已写入演示后端）"，但 URL/key 从未持久化——刷新即回显写死的 `value`。
- **行业惯例**: 表单保存的成功提示必须覆盖用户可编辑的全部字段；不支持保存的字段应 disabled 并注明（Ant Design Form / shadcn settings 模板惯例）。
- **用户影响**: 用户填入自己的项目 URL，保存成功提示使其相信已生效；重新进入页面发现恢复默认值，产生"保存丢了"的信任问题。通过真实用户影响检验。
- **建议**: 最小修复：把 URL/key 两个输入加 `"disabled": true` 并在说明文案标注"演示只读"；或将 `includeScope` 扩为三个字段并让 mock 端回写（与提示语一致）。
- **复核状态**: 未复核

### [G7-视角6-11] 「anon 公钥」旁的 eye 图标为纯展示，无显隐切换且不可点

- **文件**: `sundial-settings.json:964-983`
- **证据片段**:
  ```json
  // sundial-settings.json:977-982 —— eye 是裸 icon 节点，父 flex 无 onClick
  {
    "type": "icon",
    "icon": "eye",
    "size": 14,
    "color": "#636363"
  }
  ```
- **严重程度**: MEDIUM
- **现状**: 密钥输入框右侧一枚 `eye` 图标，既无 onClick，也不随输入框联动。行业内 input 右侧 eye = 显隐/查看切换是强约定；而此处它只是一张贴着的静态图形（flex 渲染器未加 onClick 时无 `role="button"`、无 cursor-pointer——`sundial-replica.css` 也未对它定义 hover）。
- **行业惯例**: Ant Design `Input.Password`、shadcn 表单密钥输入的 eye 皆为可切换按钮；不可交互的装饰不应使用 eye 图标。
- **用户影响**: 用户点击 eye 想查看/隐藏已渲染的完整 JWT，点击无任何反应——像坏掉的按钮。且该输入框实际一直以明文展示完整密钥，用户以为 eye 已是"明文态"却无法切回。通过真实用户影响检验。
- **建议**: 删除该 eye 节点；或将其所在 flex 行加 onClick + setValue 切换输入框 `inputType`（若 schema 支持）/替换为"复制"图标等真实可执行动作。
- **复核状态**: 未复核

### [G7-视角11-12] 同步状态卡不随同步方式联动：切到「本地模式」仍显示"已连接 Supabase / 上次同步 刚刚"

- **文件**: `sundial-settings.json:1017-1109`（状态卡，无 mode 绑定），`:580-933`（模式切换），`:1459-1466`（数据分区静态文案）
- **证据片段**:
  ```json
  // sundial-settings.json:1034-1048 —— 状态卡文案全部写死
  { "type": "text", "text": "已连接", "className": "text-xs font-semibold text-[#0d0d0d]" },
  ...
  { "type": "text", "text": "Supabase", "className": "sd-badge sd-badge-info" }
  ```
- **严重程度**: MEDIUM
- **现状**: "同步方式"三选一是活交互（setValue mode + 保存写库），但其下"同步状态"卡片的连接状态、待同步条数、上次同步时间全是硬编码，visible 也不引用 `mode`。用户切到"本地模式"并保存成功后，页面下方仍然宣告"已连接 Supabase、上次同步：刚刚"。数据分区"上次同步：本地模式：不适用"又是另一套静态口径，两区互相矛盾。
- **行业惯例**: 设置页状态区必须与设置项联动或显式标注快照时间（macOS 系统设置/Supabase Dashboard 模式）。
- **用户影响**: 用户明明选了本地优先，界面仍声称连着云——同一屏内自相矛盾的状态会让用户怀疑切换是否生效。通过真实用户影响检验。
- **建议**: 状态卡加 `"visible": "${mode === 'supabase'}"` 并为 local 模式补一张"本地模式 · 未启用同步"的对应卡片（成对 visible 写法与本页导航行一致）；或将其文案改为不含具体状态的通用说明。
- **复核状态**: 未复核

### [G7-视角11-13] detail 页「清除」按钮清错状态：清的是底部演示卡字段，行内日期徽标不变且 toast 谎报成功

- **文件**: `sundial-detail.json:206-229`（清除按钮），`:200-204`（行内日期徽标），`:1218-1224`（被清的 demo-date 输入）
- **证据片段**:
  ```json
  // sundial-detail.json:208-227 —— 按钮清 path "demo-date"，与所在行无关
  { "type": "button", "label": "清除", "variant": "ghost", "className": "sd-btn sd-btn-ghost ml-auto",
    "testid": "sundial-detail-clear-date",
    "onClick": [
      { "action": "setValue", "args": { "path": "demo-date", "value": "" } },
      { "action": "showToast", "args": { "message": "日期已清除" } }
    ] }
  // 同文件 :200-204 —— 行内徽标显示的是 pickedDateLabel，未被清除
  { "type": "text", "text": "${pickedDateLabel || '8/18'}", "className": "sd-badge sd-badge-warning" }
  ```
- **严重程度**: MEDIUM
- **现状**: 日期字段行的"清除"按钮位于 `pickedDateLabel` 徽标同一行，点击后：徽标仍是"8/18"、选择器状态 `pickedDateTime/pickedDateLabel` 原样，真正被清空的是页面底部"现有组件替代"演示卡的 `input-date(name: demo-date)`，同时 toast 宣告"日期已清除"。
- **行业惯例**: 操作按钮作用于其所在行的可见数据；操作反馈与实际效果必须一致（Ant Design 行内操作模式）。
- **用户影响**: 用户点"清除"，toast 说成功，行内日期纹丝不动——操作失效+虚假确认，用户会反复点击。判定说明：属功能缺陷（HIGH 档），因复刻演示页低频路径降级为 MEDIUM。
- **建议**: onClick 改为 `[{setValue pickedDateTime ""}, {setValue pickedDateLabel ""}, {showToast "日期已清除"}]`；若意图是清底部演示卡，应把按钮移到该卡片内。
- **复核状态**: 未复核

### [G7-视角11-14] 「添加子任务…」输入框无提交路径：回车与按钮均无效

- **文件**: `sundial-detail.json:797-803`
- **证据片段**:
  ```json
  // sundial-detail.json:797-803 —— 裸 input-text，不在任何 form 内，无回车提交、无添加按钮
  {
    "type": "input-text",
    "name": "subtask-add",
    "className": "sd-input",
    "placeholder": "添加子任务…",
    "testid": "sundial-detail-subtask-add"
  }
  ```
- **严重程度**: MEDIUM
- **现状**: 该输入直接放在卡片 container 里（非 form 子节点），页面未提供任何提交动作链；输入文字后回车/失焦均无效果，也不清空。与上方三条子任务的"打开详情/删除"俱全的交互形成落差。
- **行业惯例**: "添加条目"输入必须有一条提交路径（Enter 提交或伴随添加按钮，TodoMVC/TickTick 惯例）；不可用的输入应改为 disabled 占位或注明演示。
- **用户影响**: placeholder 明确邀请输入（"添加子任务…"），用户输入后无任何反应，输入内容成为幽灵文本。通过真实用户影响检验。
- **建议**: 包一层 form 并在 `onSubmitEnter`/actions 中接 `Sundial__updateTodoItem`（追加子任务）+toast；或把 placeholder 改为"添加子任务（演示不可用）"并 disabled。
- **复核状态**: 未复核

### [G7-视角3-15] sundial 全部自定义可点击行无设计系统 focus-visible ring，仅剩浏览器默认描边

- **文件**: `apps/playground/src/sundial-replica/sundial-replica.css:238-279,513-539`；`sundial-workbench.json:119,999,1081`（sd-nav-row/sd-task-row 等）
- **证据片段**:
  ```css
  /* sundial-replica.css:238-251 —— 只有 hover，无 :focus-visible */
  .sd-nav-row {
    /* ...padding/radius... */
    cursor: pointer;
  }
  .sd-nav-row:hover {
    background: var(--sd-row-hover);
  }
  ```
  ```tsx
  // packages/flux-renderers-basic/src/flex.tsx:104-117 —— 可点击 flex 是 div[role=button][tabindex=0]，无 ring 类
  <div ... role="button" tabIndex={0} onClick={handleClick} onKeyDown={handleKeyDown}>
  ```
- **严重程度**: LOW
- **现状**: `sd-nav-row`/`sd-task-row`/`sd-field-row`/`sd-choice-row` 四类行经 flex 渲染器获得键盘焦点能力（tabIndex=0），但复刻 CSS 只定义了 hover/cursor，未定义任何 `:focus-visible` 样式，也不像 ui Button 那样带 `focus-visible:ring-3 ring-ring/50`。键盘用户的焦点指示只剩 UA 默认 outline，与整套 sd 视觉语言脱节。
- **行业惯例**: shadcn/ui 全组件统一 `focus-visible:ring-*`；WAI-ARIA APG 要求自定义可交互行有清晰焦点指示。
- **用户影响**: 键盘 Tab 巡航 sundial 页面时，焦点框是浏览器默认细线，在深浅交错的卡片上时隐时现，无法与其他页面的 ring 视觉对齐。真实用户影响有限（存在默认指示）→ LOW。
- **建议**: 在 `sundial-replica.css` 为四类行补 `.sd-nav-row:focus-visible, .sd-task-row:focus-visible, ... { outline: none; box-shadow: 0 0 0 3px rgba(234,122,42,.35); }`（品牌橙 ring）。
- **复核状态**: 未复核

### [G7-视角1-16] 同页术语混用：「垃圾箱」与「垃圾桶」交替出现

- **文件**: `sundial-workbench.json:688,1617,2175,2198`；`sundial-detail.json:907`
- **证据片段**:
  ```json
  // sundial-workbench.json:687-689 —— 侧边导航叫"垃圾箱"
  { "type": "text", "text": "垃圾箱", "className": "text-xs text-[#0d0d0d]" }
  // sundial-workbench.json:1616-1618 —— 同页看板标题叫"垃圾桶"
  { "type": "text", "text": "垃圾桶", "className": "text-xl font-semibold text-[#0d0d0d]" }
  // sundial-workbench.json:2174-2175 按钮叫"移到垃圾桶"，:2196-2198 toast 却说"已移到垃圾箱"
  ```
- **严重程度**: LOW
- **现状**: 同一概念在同一页面四种叫法混用：导航"垃圾箱"、看板标题"垃圾桶"、对话框按钮"移到垃圾桶"、操作 toast"已移到垃圾箱"；detail 页按钮又是"移到垃圾箱"。
- **行业惯例**: 术语表一致性是本地化基础要求（Ant Design locale 规范）；同一实体在一个产品内应唯一命名。
- **用户影响**: 用户点"移到垃圾桶"后 toast 说进了"垃圾箱"，需要在侧边栏找"垃圾箱"入口——虽能对上号，但每一步都在做名词翻译。影响轻微 → LOW。
- **建议**: 全组统一为"垃圾箱"（与导航及多数 toast 一致），替换 `:1617`、`:2175` 两处。
- **复核状态**: 未复核

### [G7-视角4-17] tree-crud 过滤状态回显原始 ID（"当前过滤：d1"）而非树节点标签

- **文件**: `tree-crud.json:48-53`
- **证据片段**:
  ```json
  {
    "type": "text",
    "text": "当前过滤：${treeFilter?.deptId ? treeFilter.deptId : \"全部部门\"}",
    "className": "text-xs text-muted-foreground mt-2",
    "testid": "tree-crud-filter-report"
  }
  ```
- **严重程度**: LOW
- **现状**: `input-tree` 的 `labelField: "label"`（部门名称），`valueField: "value"`（d1/d2…）。选中"研发部"后，回显行输出的是 value（d1），用户无从知道 d1 对应哪个部门。
- **行业惯例**: 筛选回显用人类可读标签（Ant Design Tree selectshowSearch 展示 title；shadcn Combobox 回显 label）。schema 侧可用表达式映射或直接回显所点节点 label。
- **用户影响**: 用户选完部门看到"当前过滤：d1"，无法确认筛选是否命中预期，只能再点回树对答案。影响限于这行辅助文案 → LOW。
- **建议**: 在 `Dept__tree` 返回项上加 `label` 透传并把回显表达式改为按 deptId 查 label（如 `${deptTree?.items?.find(i => i.value === treeFilter?.deptId)?.label ?? '全部部门'}`）。
- **复核状态**: 未复核

### [G7-视角1-18] 子任务区头「chevron-down」为静态装饰，无折叠能力却暗示可折叠

- **文件**: `sundial-detail.json:525-544`
- **证据片段**:
  ```json
  {
    "type": "flex",
    "direction": "row",
    "gap": 6,
    "className": "items-center mt-1",
    "testid": "sundial-detail-subtasks-header",
    "body": [
      { "type": "icon", "icon": "chevron-down", "size": 14, "color": "#636363" },
      { "type": "text", "text": "子任务", "className": "text-xs font-semibold text-[#636363]" }
    ]
  }
  ```
- **严重程度**: LOW
- **现状**: 区头左侧一枚 chevron-down（行业语义：可折叠/已展开），但该 flex 无 onClick，图标不随折叠旋转。同页同文件里其他 chevron/right 图标都挂在真按钮上（`:573-596` 打开子任务详情），唯独区头是死图标。且 flux 已有 `collapse` 渲染器带 tone/count/leading 契约（styling-system.md 末节），此处未用。
- **行业惯例**: chevron 图标必须绑定展开/收起状态（shadcn Collapsible、Ant Collapse 模式）；纯展示区头不应使用方向指示图标。
- **用户影响**: 用户点击"子任务"区头期待折叠，无反应。点击目标 14px 偏小、失败感轻微 → LOW。
- **建议**: 去掉 chevron-down 图标；或整行换成 `type:"collapse"` 单 item（`tone/count` 已有现成契约，`sundial-workbench.json:981-1059` 已示范）。
- **复核状态**: 未复核

### [G7-视角11-19] 导航/视图切换高频弹 toast，反馈噪音

- **文件**: `sundial-workbench.json:328-341,412-425,496-509,580-593,664-677`（视图切换 toast）；`sundial-settings.json:79-93,175-188,271-284,367-380,463-476`（分区切换 toast）
- **证据片段**:
  ```json
  // sundial-workbench.json:328-342 —— 每次点"全部"视图都 toast
  "onClick": [
    { "action": "setValue", "args": { "path": "activeView", "value": "all" } },
    { "action": "showToast", "args": { "message": "视图：全部" } }
  ],
  ```
- **严重程度**: LOW
- **现状**: workbench 5 个视图行、settings 5 个分区行（每行两份、共 20 处 onClick）都在状态切换之外追加 `showToast("视图：今天"/"打开设置：同步")`。切换结果已由高亮与内容变化充分表达，toast 属冗余反馈；连续切换时 toast 队列刷屏。
- **行业惯例**: 导航/切换类操作不用 toast 反馈（Ant Design Menu、shadcn Tabs 均无）；toast 留给异步结果。
- **用户影响**: 用户连续切换 3 个视图，右上角连弹 3 条"视图：X"，遮蔽后续可能的真正重要通知。影响轻微 → LOW。
- **建议**: 删除这 20 处 `{action:"showToast"}` 分支，保留 setValue 即可（高亮+内容已是反馈）。
- **复核状态**: 未复核

---

## 视角覆盖与扫描台账（19/19 页全扫，无未扫页）

| #   | 页面                | 检查要点（视角）                                                                                                                       |
| --- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | standard-crud       | 2/10（新增/删除 variant、批量删除确认）、4（queryForm clearable/placeholder）、5（crud 内建空态）、6（新增/编辑对话框按钮序）→ 发现 01 |
| 2   | master-detail       | 2/10（行删无 variant、新增 default、quickSaveItem 手动保存列）、5（三个 table 均有 empty）、11（未选订单引导文案）→ 发现 08            |
| 3   | dashboard           | 7（6 色硬编码 hex+class 成对，判定为有意装饰不报）、5（empty 均有）、8（wrap 布局）、12（KPI 卡非模板化）                              |
| 4   | advanced-query      | 4（6 个筛选器 clearable/placeholder）、10（filterTogglable 与其他 crud 页一致）                                                        |
| 5   | approval-tasks      | 6（审批对话框按钮序、驳回=destructive+确认、非 pending 只读态文案）→ 发现 01（通过钮）                                                 |
| 6   | form-wizard         | 4（步骤校验 required）、11（完成后状态回显文案）、10（alert 提示与主按钮衔接）                                                         |
| 7   | complex-form        | 4（级联禁用+placeholder、条件必填）、2（保存 disabled=!agreed）→ 发现 01（保存钮）                                                     |
| 8   | combo-editor        | 4（combo 增删排序）、2（保存钮）→ 发现 01（保存钮）                                                                                    |
| 9   | tree-crud           | 4（树单选筛选）、11（过滤回显）→ 发现 17                                                                                               |
| 10  | inline-edit-table   | 4/5（quickEdit 行级草稿与 SaveBar，经 renderer 源码核实存在）、10（alert 说明与实际交互一致）                                          |
| 11  | detail-subtables    | 5（5 个 table empty 全覆盖）、10（tabs 分区与卡片分区标题模式一致）                                                                    |
| 12  | business-document   | 4（input-table 行内计算）、2（提交钮）→ 发现 01（提交钮）                                                                              |
| 13  | dynamic-tabs        | 6/5（mountOnEnter 懒加载、远程 tab loading 由 dynamic-renderer 承担）                                                                  |
| 14  | crud-views-export   | 10（表格/卡片双视图一致性）、11（导出后下载链路完整：报告+link）                                                                       |
| 15  | sundial-workbench   | 11/12 验收 + 1/3/10（nav 图标、选中态、破坏性操作、对话框）→ 发现 02/03/04/05/06/07/09/15/16/19                                        |
| 16  | sundial-detail      | 11/12 验收 + 1/6/10（tray 图标、选择器对话框、清除按钮、子任务增删）→ 发现 02/06/07/09/13/14/18                                        |
| 17  | sundial-analytics   | 11/12 验收 + 5/9（chart 空态/loading 由 renderer 保证 role=img+aria；onClick 有键盘路径）、7（复刻品牌色有意硬编码不报）               |
| 18  | sundial-settings    | 11/12 验收 + 4/6（保存范围、eye 图标、状态联动、分区导航）→ 发现 02/09/10/11/12/19                                                     |
| 19  | sundial-todo-dialog | 11/12 验收 + 6（受控 open、取消路径、选择器单按钮）→ 发现 02/03/09                                                                     |

## 转 C2 候选（已登记缺口表象，不计入发现）

1. **G-H（移动端主组件族）**：`sundial-workbench.json:14-49` 移动端 variant 为声明式 stub——标题 + 一只空 `sd-card`（`text:""`），文案宣称"由底部导航替代"但无底部导航。属 P8 Non-Goal/移动组件族缺口的表象，不作为一致性发现。
2. **G-F（hover/选中态 schema 表达）**：`sundial-settings.json`、`sundial-workbench.json` 全部导航/选择行采用"选中/未选中两份 schema 成对 visible"手写状态；完成态样式（划线）无法与 checkbox 联动（发现 06 的联动半边）。原语落地后可消除大量重复。
3. **G-E（高密度排版/语义色状态/chip）**：sundial 五页大量手写 `sd-mono`、hex 徽标色、chip 排版（如 `sundial-analytics.json:465-563` 压力图例四色手工排列），本可由语义色状态/chip 原语承载。
4. **variant:primary 防复发**：发现 01 的根因之一是 JSON schema 不经 TS 类型检查、编译期 `invalid-property-value` warning 对 demo 作者不可见——建议 P 系列（intent 落地 / playground 校验提示消费）一并承接。
