# 10 flux-renderers-basic 实现代码检查报告

- 检查日期：2026-08-20
- 范围：`packages/flux-renderers-basic/src/` 非测试源文件 27 个 / 4461 行（排除 `*.test.*`、`__tests__/`；含 `test-support.tsx` 测试基建 33 行，已核实被 `tsconfig.build.json` exclude、不入 dist）。两个已知线索（基线失败用例 surface-event-ctx、flux-core 01-F-01 `isSafeNavigationUrl` 消费面）均已核实并归因。
- 结论概览：P0 x0 / P1 x2 / P2 x3 / P3 x9 —— 整体实现质量高：渲染器契约（props/meta/regions/events/helpers + 标准 hooks）逐项合规，布局根节点 marker-only 红线已被测试锁定且实现干净，定时器/监听器全量清理，i18n 全量走 `t()`；两条 P1 分别是基线失败用例的 root cause（本包 `use-surface-renderer.ts` 受控关闭拆除路径，而非 flux-react dialog-host 门控）与 flux-core URL 守卫绕过在本包 `<a href>` 上的真实暴露面。

## P0 缺陷

无。未发现无条件即触发的错误行为。两条 P1 均需特定输入条件（字面量 `open:true` 的受控 surface + X 关闭；数据绑定注入带前导空白/控制字符的 `javascript:` URL）。

## P1 隐患

### F-01 基线偏离 2 归因：受控 surface X 关闭对字面量 `open:true` 不可逆拆除（root cause 在本包，dialog-host 门控排除）

- 位置：`packages/flux-renderers-basic/src/use-surface-renderer.ts:198-231`（`handleSurfaceOpenChange`），配合 `:499-510`（userClosed 复位 effect）
- 失败用例：`src/__tests__/surface-event-ctx.test.tsx:51-110`（"resolves the same ${surfaceId} in dialog onConfirm and onClose action args"，`[data-testid="surface-confirm-submit"]` 找不到）
- 摘录：

```ts
void eventHandlers.onClose?.(payload, eventCtx(payload));
// Plan 459 fix: controlled dialog X / outside / Esc — also tear down the
// surface and sync the controlled scope variable so the schema's
// next open intent (setValue(openPath, true)) can flip false→true.
surfaceRuntime?.close(id);
if (controlledOpen !== undefined) {
  setUserClosed(true);
  const rawOpen = (templateNode.schema as { open?: unknown } | undefined)?.open;
  const openPath = extractControlledOpenPath(rawOpen);
  if (openPath) {
    node.scope.update(openPath, false);
  }
}
```

- 证据链（输入 → 路径 → 错误结果）：
  1. **confirm 字段到达 entry**（05 号 F-08 疑点一排除）：`surface-renderer-definitions.ts:118` 声明 `{ key: 'confirm', kind: 'prop' }` → 编译进 propsProgram → `resolvedProps.confirm = true` → `use-surface-renderer.ts:233-239` `surfacePayload = { ...resolvedProps, __handleOpenChange }` → `entry.surface.confirm` → `flux-react/src/dialog-host.tsx:273-281` `resolveConfirmButtons({ confirm: surface.surface.confirm, ... })` 读到 `true`，`:369-377` 渲染 `surface-confirm-submit`。
  2. **actions 未误判非空**（疑点二排除）：`use-surface-renderer.ts:250` `actionsNode = regions.actions?.templateNode ?? resolvedProps.actions`；测试 schema 未声明 `actions`，region 字段被编译器从 props 包中抽出 → `undefined` → `hasExplicitActions = Boolean(undefined) = false`。
  3. 测试开局正常：`getByRole('dialog')`（:85）通过、`[data-slot="dialog-close"]` 找到（:89-91）、X 点击后 `/close-<surfaceId>` 请求发出（:93-100 通过）——entry 存在期间 confirm 按钮确实在 DOM（第 1 条用例 `defaultOpen:true` 走同一 confirm 门控且基线通过，进一步证明门控无缺陷）。
  4. **错误结果**：X 点击 → `dialog-host.tsx:210-217` `handleClose` → `__handleOpenChange(false)` → 本文件 `handleSurfaceOpenChange`：派发 onClose 后 `surfaceRuntime.close(id)` **同步移除 entry** → `dialog-host.tsx:161-163` DialogHost 渲染 null → dialog 整体卸载 → `:103` `getByTestId('surface-confirm-submit')` 抛错（基线 00 号记录"页面 body 只剩空 page-body"与此吻合）。
  5. **为何字面量 `open:true` 特殊**：`extractControlledOpenPath(true)` 返回 `undefined`（非字符串），scope 变量写回被跳过；`controlledOpen` 恒为 `true`，`:499-510` 的 userClosed 复位依赖 `false→true` 翻转，永不触发 → surface 永久死亡（schema 声明 open，渲染器却永久关闭且无法重开，直到整树重挂载）。对照 `surface-controlled-x-close.test.tsx`（全部用 `open:'${isOpen}'` 表达式）——表达式路径的拆除+重开已被测试锁定为正确设计，字面量路径是该设计的退化分支。
- 影响：受控字面量 `open:true` 的 dialog/drawer X/Esc/外点关闭后永久不可重开；基线失败用例长期红。
- 修复方向：`handleSurfaceOpenChange` 受控分支在 `extractControlledOpenPath` 无路径（schema `open` 为静态字面量）时，**不拆除 entry**（仅派发 onClose，保持挂载以匹配测试编码的"受控 dialog 关闭后仍可确认"契约），或抑制关闭入口（`showCloseButton` 语义降级）；若产品裁定维持拆除，则需同步修订该测试契约并登记。若实施修复，补一条字面量 `open:true` + X 关闭 + confirm 可达的回归用例。

### F-02 `isSafeNavigationUrl` 前导空白/控制字符绕过在本包 `<a href>` 上真实可达（消费 01 号 F-01）

- 位置：`packages/flux-renderers-basic/src/button.tsx:245-250`（消费点）；root cause 在 `packages/flux-core/src/utils/url.ts:23-29`
- 摘录（本包消费姿势）：

```ts
const rawHref = props.props.href;
const href =
  typeof rawHref === 'string' && rawHref.length > 0
    ? isSafeNavigationUrl(rawHref)
      ? rawHref
      : undefined
    : undefined;
```

- 推理链：输入 `href = " javascript:alert(1)"`（前导空格）或 `"java\tscript:alert(1)"`（内嵌制表符）→ flux-core 正则 `/^([a-z][a-z0-9+.-]*):/i` 不匹配 → 一律判"安全"（视为相对路径）→ `href` 原样渲染到 `<a>` → 浏览器解析 URL 前先剥离 ASCII 空白/`\t\r\n` → 点击时按 `javascript:` scheme 执行脚本。
- 暴露面核实：本包 `button.href` 支持 `${}` 数据绑定（注释明示 "href may be data-bound (`${item.link}`)"），攻击面正是守卫为之设计的场景——外部数据（API 返回、用户输入回显）注入畸形 URL。本包 `button-href-safety.test.tsx` 覆盖了精确 scheme（`javascript:`/混合大小写/`vbscript:`/`blob:`/`file:`）但无前导空白/控制字符用例（测试缺口与缺陷同步）。`text` 渲染器无 href；markdown/XSS 面在本包不存在（全源码 0 处 `dangerouslySetInnerHTML`，文本经 React 文本节点渲染天然转义）。
- 纠正线索：本包**没有** `link.tsx`——link 渲染器位于 `flux-renderers-content/src/link.tsx`（01 号审计已核对其消费方式）。
- 修复方向：root fix 归 flux-core（匹配前 `trim()` + 剥离 `\t\r\n`，01-F-01）；本包消费姿势本身符合契约（不安全时降级为无 href 锚点），建议在 `button-href-safety.test.tsx` 补空白/控制字符回归用例。

## P2 风险

### F-03 button `href` 分支绕过 `@nop-chaos/ui` Button：裸 `<a>` 丢失全部控件语义

- 位置：`packages/flux-renderers-basic/src/button.tsx:252-263`
- 摘录：

```tsx
const button = renderAsAnchor ? (
  <a
    ref={anchorRef}
    href={href}
    target={props.props.target}
    {...commonProps}
    onClick={(event) => void handleClick(event)}
  >
```

- 问题：(1) 违反 AGENTS "NEVER use raw HTML elements when `@nop-chaos/ui` provides a component"——ui `Button` 基于 `@base-ui/react/button`（`ButtonPrimitive.Props`，base-ui 通用支持 `render` 组合，本文件 `TooltipTrigger render={button}` 已在用同族 API），可写 `<Button render={<a href/>} variant size>`；(2) `variant`/`size`/cva 基线（含 `nop-haptic` 按压反馈）全部丢失，`buttonClass` 仅剩 `meta.className + w-full + min-h-11`，同 schema 下有无 href 视觉断层；(3) `effectiveDisabled`（loading/countDown 激活）只靠 `handleClick` 早退——锚点无 `aria-disabled`、仍可聚焦、回车仍触发 click、无禁用样式；(4) 提供 `target="_blank"` 但未补 `rel="noopener noreferrer"`（现代浏览器隐含 noopener，属防御纵深缺位）。
- 影响：href 按钮在 loading/countDown 期间对键盘/读屏用户表现为可用的死按钮；视觉契约断裂。
- 修复方向：改用 `<Button render={<a .../>}>` 保留控件语义，补 `aria-disabled={effectiveDisabled || undefined}` 与条件 `rel`。`button-href.test.tsx` 锁定"渲染为 link 角色"，不锁定样式/无障碍，修复无测试冲突。

### F-04 dynamic-renderer `getLoadActionKey` 有损变更检测：对象 args 折叠为 `[object Object]`，重载漏触发

- 位置：`packages/flux-renderers-basic/src/dynamic-renderer.tsx:35-50`（消费点 `:80`、`:185` effect deps `[loadActionKey, autoLoad, props.helpers]`）
- 摘录：

```ts
const api = args?.api ?? args?.url;
const data = args?.data;
return `${action}|${String(api ?? '')}|${String(data ?? '')}`;
```

- 问题：`loadAction` 的 `${}` 模板被编译进 propsProgram 响应式重解析，但**重载触发以 loadActionKey 为准**：`args.data` 为对象时 `String(data)` 恒为 `'[object Object]'`（内容变化不改变 key）；`args` 中 `api/url/data` 之外的键（headers/params/method…）完全不参与 key。
- 影响：仅 `args.data` 对象内容变化、或仅其它 args 键变化时，已解析的 `loadAction` 变了但 key 不变 → 加载 effect 不重跑 → 旧 schema 持续展示（D1 正确性 + D6 响应式缺口）。
- 修复方向：key 改用稳定序列化（限定深度的 `JSON.stringify` + 键排序），或直接比较解析后 args 的结构化指纹；补一条 "args.data 内容变化触发重载" 回归用例。

### F-05 page 布局渲染器内部 affordance 硬编码视觉类（marker-only 红线灰区违反）

- 位置：`packages/flux-renderers-basic/src/page.tsx:143`（aside）、`:158-161`（resize handle）、`:187`（remark 触发器）
- 摘录：

```tsx
<aside data-slot="page-aside" ... className={cn('relative', slotProps.asideClassName)} ...
  <div data-slot="page-aside-resize-handle" ...
    className={cn(
      'absolute top-0 bottom-0 w-1 cursor-col-resize bg-transparent hover:bg-border transition-colors',
      asidePosition === 'right' ? 'left-0 -ml-1' : 'right-0 -mr-1',
    )}
...
<TooltipTrigger ... className="inline-flex size-4 items-center justify-center align-middle text-muted-foreground hover:text-foreground"
```

- 问题：styling-system 契约规定布局渲染器只发 "marker classes plus explicit schema-authored semantic overrides"，shipped 默认应来自 schema 或包级 CSS 基线。page 根节点与 slot className 路由本身干净（`layout-styling-contract.test.tsx:8-24` 已锁定 root `['nop-page']`），但内部 affordance 在组件代码里硬编码视觉工具类：aside 槽上的 `relative`（布局位）、resize handle 的整套定位/交互/颜色类、remark 图标的尺寸/颜色/hover 类。schema 无法关闭或覆盖 resize handle 的视觉；宿主换主题时这些类不随 token 走（部分走了 `bg-border`/`text-muted-foreground` token，但 `w-1`/`-ml-1` 等裸几何值没有）。
- 影响：主题兼容性/可覆盖性受损；红线的一致性被打开缺口（其它布局渲染器会援引先例）。
- 修复方向：affordance 视觉迁移到 `data-slot` 标记 + 包级 `@layer base` CSS（同 `flux-react/default-spacing.css` 模式），或收纳为 `@nop-chaos/ui` 原语组件；`relative` 可随 resize handle 一起由 CSS 提供。对照：`text.tsx` copy/toggle 按钮的硬编码类属 widget 自带 affordance（text 无布局槽角色），不列违规；`tabs.tsx:326` 移动端滚动条隐藏类中功能性部分（`overflow-x-auto` 等）可接受，但见 F-06。

## P3 提示

### F-06 `nop-scrollbar-hide` 类全仓无定义

- 位置：`packages/flux-renderers-basic/src/tabs.tsx:326`
- 摘录：`'nop-scrollbar-hide overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'`
- 问题：grep 全 packages+apps，`nop-scrollbar-hide` 仅此一处引用、任何 CSS 中无定义；实际隐藏由后两个 arbitrary variant 实现。死类名误导宿主/作者以为存在框架级样式锚点。方向：删除或补 CSS 定义。

### F-07 scope-debug 默认标题硬编码英文

- 位置：`packages/flux-renderers-basic/src/scope-debug.tsx:92`
- 摘录：`: 'Scope Debug';`
- 问题：title 缺省回退为字面量英文，未走 `t()`（`flux.scopeDebug` 命名空间其余 key 均存在）。方向：补 `flux.scopeDebug.title` key。其余 i18n 核对全部通过（见检查过程）。

### F-08 container 可点/不可点两分支 ~50 行 JSX 完全重复

- 位置：`packages/flux-renderers-basic/src/container.tsx:60-108` vs `:111-162`
- 问题：仅根节点 props（role/tabIndex/onClick/onKeyDown）不同，header/body/footer 三段 JSX 逐行重复；后续改动易漏一侧。方向：提取 `children` 局部变量或合并根节点 props 对象。

### F-09 loop `evaluateItemData` 闭包重复实现

- 位置：`packages/flux-renderers-basic/src/loop.tsx:82-98` 与 `:109-125`
- 问题：两段 createScope→evaluateCompiled→finally disposeScope 逻辑完全相同（one-shot scope 纪律本身执行正确）。方向：提取局部函数复用。

### F-10 page 以 `footerClassName.includes('fixed')` 嗅探启用键盘偏移

- 位置：`packages/flux-renderers-basic/src/page.tsx:97-98`
- 摘录：`const footerIsFixed = footerClassName.includes('fixed');`
- 问题：子串嗅探——`xxfixed` 误报、`sticky bottom-0` 漏报，且把视觉类字符串当语义开关。方向：显式 schema 布尔 prop（如 `fixedFooter`）。

### F-11 tabs 状态汇总在 value 无命中时谎报 activeIndex:0；重复 value 无守卫

- 位置：`packages/flux-renderers-basic/src/tabs.tsx:195-198`（`Math.max(0, items.findIndex(...))`）
- 问题：value 无命中时 findIndex=-1 被钳为 0，`statusPath` 汇总声称 activeIndex:0（失真）；叠加受控 ownership 不自纠（:176-179 设计如此），受控值指向已删除 item 时无任何面板渲染而状态称 index 0。另 `items` 中重复 `value`/`key` 会造成 React key 冲突与双触发器同时激活，无 dev 警告。方向：无命中时 activeIndex 置 -1/undefined；dev 模式对重复 value 告警。

### F-12 recurse 脱离 loop 上下文静默渲染 null；keyBy 路径语义不一致

- 位置：`packages/flux-renderers-basic/src/recurse.tsx:78-80`；`packages/flux-renderers-basic/src/structural-loop.tsx:54-74`
- 问题：(1) `recurse` 不在 `loop` 体内时直接 `return null`——standalone（自带 items）完全无输出且无 dev 警告，而其 `defaultSchema` 声明了 `items: []`，作者易困惑；(2) `resolveItemKey` 的 `keyBy` 仅识别 `item.` 前缀路径或裸 `item`，其它写法（如 `'data.id'`）静默回退到 `id/key/name/index` 启发式。方向：dev 模式 warning；文档/校验明确 keyBy 支持的路径形态。

### F-13 `useOwnedAxisValue` 'scope' ownership 缺 statePath 时 setValue 静默无效

- 位置：`packages/flux-renderers-basic/src/interaction-owner.ts:45-56`
- 问题：`ownership:'scope'` 且未配 `statePath`（或 `'controlled'`）时 `setValue` 是静默 no-op——misconfiguration 无任何诊断，UI 表现为"点了没反应"。方向：dev 模式 console.warn。

### F-14 text 溢出测量一次性；杂项

- 位置：`packages/flux-renderers-basic/src/text.tsx:124-130`
- 问题：`measureOverflow` 仅在 `resolvedText/maxLineClass` 变化时执行，不监听容器 resize / 字体加载完成——webfont 晚到时 `maxLineToggle` 按钮可能不出现（或该出现时不出现后不复核）。方向：ResizeObserver 或 `document.fonts.ready` 后复测。杂项：(1) `surface-renderer-definitions.ts` 的 dialog/drawer 两个定义缺 `defaultSchema`（其余 13 个定义均有，设计器 palette 一致性）；(2) `package.json` description（"button, input, select, text, image"）与本包实际内容（无 input/select/image）不符。

## 检查过程记录

1. **前置阅读**：`docs/references/quick-reference.md`（渲染器契约/字段生命周期/hooks 表）、`docs/architecture/renderer-runtime.md`（props vs meta、事件转发契约、one-shot scope 纪律、boolean 解析基调）、`docs/architecture/styling-system.md`（布局/widget 分类、marker-only 红线、per-slot className 路由）；`package.json`（deps：flux-core/flux-i18n/flux-react/ui；peer：react19/lucide）。
2. **全量精读**：`wc -l` 枚举 27 个非测试源文件（4461 行）逐一精读，重点 `use-surface-renderer.ts`(549)、`basic-renderer-definitions.ts`(576)、`tabs.tsx`(459)、`button.tsx`(292)、`dynamic-renderer.tsx`(282)、`page.tsx`(269)。
3. **线索 1（基线失败用例）**：读 `surface-event-ctx.test.tsx` 全文 + `dialog.tsx`/`drawer.tsx` + `use-surface-renderer.ts` + `flux-react/src/dialog-host.tsx`（`resolveConfirmButtons`:116-130、DialogView confirm 栏 :350-381、DialogHost 空渲染 :161-163）+ `surface-controlled-x-close.test.tsx`（确认表达式型受控的拆除+重开已被测试锁定，字面量路径无覆盖）→ 五步证据链归因（见 F-01），排除 05 号 F-08 提出的两个 dialog-host 侧疑点。
4. **线索 2（URL 守卫）**：读 `flux-core/src/utils/url.ts:23-29` 正则 + `button.tsx:245-250` 消费点 + `button-href-safety.test.tsx` 覆盖清单（无空白/控制字符用例）→ 确认暴露面；纠正"本包 link.tsx"线索（link 在 flux-renderers-content）。
5. **grep 扫描**（非测试源）：`as any`/`@ts-ignore`/`@ts-expect-error`/`dangerouslySetInnerHTML` = 0 命中；空 catch 6 处均在 button.tsx countdown 存储适配器（INV-1 host-adapter 设计、有注释、可接受）；硬编码中文 = 0（仅注释）；`addEventListener/setInterval/setTimeout` 全部有 cleanup（button.tsx:159、text.tsx:62-66、use-fixed-footer-visual-viewport.ts:35-38）；非空断言集中在 tabs/structural-loop 数组索引访问（均有长度守卫）。
6. **契约核对**：直接 store 访问仅 `use-surface-renderer.ts` 经 `useCurrentSurfaceRuntime()` hook 取得的 `SurfaceRuntime.store`（quick-reference 公开 API，合规）；全部渲染器经 `props.props/meta/regions/events/helpers` + 标准 hooks（useRendererRuntime/useRenderScope/useScopeSelector/useCurrentComponentRegistry/useCurrentSurfaceRuntime 等）；事件转发带 `{ event, evaluationBindings, scope }` 第二参（CX-10/bug-83 约定，tabs onChange、surface onClose/onConfirm 均合规）。
7. **D4 红线核对**：`layout-styling-contract.test.tsx` 已锁定 page/container/flex 根 marker-only；手工核对 slot className 路由（page 五槽/container 三槽/tabs 两槽）与语义 prop 显式映射（direction 仅显式时发类）均合规；违规点集中在 page 内部 affordance（F-05）。
8. **D3 React19**：`dynamic-renderer` 的 `'use no memo'` 有注释依据；tabs render-phase `setActivated` 为合法的 adjust-during-render 模式（条件守卫）；page dataPatch 以 WeakSet(scope) 幂等（StrictMode 安全）；`use-surface-renderer` 的 useCallback/useMemo 服务 entry 引用相等性判断，非默认滥用。
9. **D7 i18n**：核对 `flux-i18n/src/locales/zh-CN.ts` 与 `en-US.ts`，本包所用 key（common.loading/confirm/cancel/copied/copyFailed/copyToClipboard/expand/collapse、dynamicRenderer.error、page.asideResize/remark/asideToggle、scopeDebug.\*）均存在；唯一例外 F-07。
10. **ui 侧反误码核对**：`resolveLucideIcon` 永不返回 null（回退 Circle，tabs/icon.tsx 的无守卫渲染安全，副作用是未知图标静默画圆）；ui `Tabs` 存在 `keepMounted/variant/orientation` props；`Button` = base-ui Primitive + cva。
11. **反误报核对**：`test-support.tsx` 被 `tsconfig.build.json` 的 `src/**/test-support*` exclude（不入 dist，非结构问题）；button countdown 从存储恢复时 sync effect（:119）先于 interval effect（:134）按声明序执行，`countDownEndRef` 不会以 0 起跳；`use-surface-renderer` 的 summary `useSyncExternalStore` 双 ref 缓存避免无限循环；loop/recurse `itemData` one-shot scope 全部 try/finally 配对 dispose。
