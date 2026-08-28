# 09 ui 实现代码检查报告

- 检查日期：2026-08-20
- 范围：packages/ui/src/ 全部 76 个源文件（排除 `*.test.*` 与 `__tests__/`），共 8018 行；交互复杂组件（dialog/drawer/sheet/select/combobox/command/tabs/popover/tooltip/scroll-area/slider/carousel/sidebar 族/chart/calendar/field/use-dialog-drag/wrap-surface-tab-focus/use-global-z-index 及全部 hooks）逐行精读，其余组件 grep 扫描 + 抽读
- 结论概览：P0 x0 / P1 x2 / P2 x5 / P3 x10 + 一句话总评：包整体质量高（无定时器泄漏、无 BEM、chart 注入有消毒、监听器清理普遍到位），主要风险集中在 i18n 回退链路的死代码化与 drawer resize 的 window 监听器泄漏，以及 focus-trap 补丁覆盖不完整（Sheet/AlertDialog 未打）。

维度覆盖：D1 正确性、D3 React19 实践与泄漏、D4 样式契约、D5 错误处理、D6 性能、D7 i18n、D8 结构。

## P0 缺陷

无。未发现"输入 → 路径 → 错误结果"可在主线配置下稳定复现的 P0 级缺陷。

## P1 隐患

### F-01 [D1/D7] i18n 回退命中判断被 bridge 剥前缀行为击穿：内置英文回退表在集成态是死代码，缺失 key 时用户看到剥前缀的残键

位置：`packages/ui/src/lib/i18n.ts:48-54`（消费侧）+ `packages/flux-i18n/src/i18n.ts:40-48`（bridge 注入侧）

```ts
// packages/ui/src/lib/i18n.ts
export function t(key: string) {
  const translated = getUiI18nBridge().getter?.(key);
  if (translated && translated !== key) {
    // <-- 未命中判断
    return translated;
  }
  return messages[key] ?? key; // <-- 内置英文回退表
}

// packages/flux-i18n/src/i18n.ts
export function normalizeTranslationKey(key: string): string {
  return key.startsWith(`${FLUX_NAMESPACE}.`) ? key.slice(FLUX_NAMESPACE.length + 1) : key;
}
function bindUiI18n(instance: i18n | null): void {
  getUiI18nBridge().getter = instance
    ? (key: string) => instance.t(normalizeTranslationKey(key)) // 缺失时返回剥前缀 key
    : null;
}
```

推理链：ui 侧以 `translated !== key` 判定"未命中"；但真实 bridge 对 `flux.common.close` 调 `instance.t('common.close')`，key 缺失时 i18next 返回 `'common.close'`（剥前缀后的 key），恒不等于原 key `'flux.common.close'` → 恒判命中。后果：

1. **回退表死代码**：只要 flux-i18n 初始化过（本仓所有 app 均如此），`messages` 表 100% 不可达。当前 22 个 key 已在 `packages/flux-i18n/src/locales/en-US.ts`/`zh-CN.ts` 全量复制（breadcrumb/carousel/common/dialog/drawer/page/pagination/sheet/sidebar 各节逐一核对），因此**今天用户看不到错文案**——但这是靠三处手工同步维持的假象，且已出现漂移：`flux.dialog.moveDialogInstructions`（dialog.tsx:205 消费）只存在于 flux-i18n locale，ui 本地表没有。
2. **缺失 key 输出残键**：条件 = ui 引入新 `t('flux.x.y')` 而 flux-i18n locale 未同步 → 用户看到 `"x.y"`（剥前缀）而非英文回退或完整 key，aria-label / sr-only 文案同样中招。
3. **测试前提错误**：`packages/flux-i18n/src/i18n-contract.test.ts:69-74`（"falls back to ui local defaults when flux i18n has no matching key"）断言 `flux.sidebar.toggle → 'Toggle Sidebar'`，实际该 key 存在于 en-US.ts:401，测试经由 locale 命中而非回退表通过——给了错误的信心。ui 侧 `lib/i18n.test.ts:10` 用 `setI18nGetter((key) => key)` 模拟的 getter 契约（"返回原 key"）与真实 bridge 行为不符。
4. **影响面（t() 消费组件）**：dialog、drawer、sheet、breadcrumb、pagination、carousel、sidebar-layout（sidebar-layout.tsx:61-62,135）。

修复方向：bridge 侧对未命中显式返回 `null`/原 key（如 `instance.exists(stripped) ? instance.t(stripped) : key`），或 ui 侧改判断 `translated !== normalizeTranslationKey(key)`；同时明确回退表与 locale 的单一事实源（建议 locale 为准、ui 表只保 standalone 场景），修正两条测试的前提。

### F-02 [D3/D1] useDrawerResize：drag 进行中卸载时 window pointermove/pointerup 监听器永久泄漏

位置：`packages/ui/src/components/ui/drawer.tsx:271-304`

```ts
const handleMove = (moveEvent: PointerEvent) => { ... setSize(next); };
const handleUp = (event: PointerEvent) => {
  dragStateRef.current = null;
  window.removeEventListener('pointermove', handleMove);
  window.removeEventListener('pointerup', handleUp);
  ...
};
window.addEventListener('pointermove', handleMove);   // :300
window.addEventListener('pointerup', handleUp);       // :301
```

条件与后果：拖拽 resize 手柄过程中 Drawer 被程序化关闭/卸载（如 `open=false` 触发 Portal 卸载、父组件条件渲染移除）→ `handleUp` 永不执行 → 两个 window 级监听器泄漏；闭包持有 `dragStateRef`（内含 `target: HTMLElement`，detached popup DOM 被强引用）与 `setSize`（指向已卸载组件的 updater）。每次"打开→拖拽→关闭"循环都会累积一对监听器，pointermove 在整窗移动时持续空跑（React 19 对卸载后 setState 静默 no-op，不报警，泄漏更隐蔽）。对照：同仓 `use-dialog-drag.ts:218-232` 专门写了 unmount 清理（注释标 P1-2，body user-select 恢复 + 移除监听器），drawer 的 resize controller 漏掉了同样处理，属修复不彻底。

修复方向：在 `useDrawerResize` 内加 `useEffect` 卸载清理（保存 handleMove/handleUp 到 ref，unmount 时 removeEventListener），与 use-dialog-drag 对齐；补一条"mid-drag unmount 不残留监听器"回归测试。

## P2 风险

### F-03 [D7] 多处用户可见/可听文案硬编码英文，绕过 t()：CommandDialog、SidebarRail、toolbar 四组控件、Spinner

位置与摘录：

```tsx
// packages/ui/src/components/ui/command.tsx:23-24
title = 'Command Palette',
description = 'Search for a command to run...',

// packages/ui/src/components/ui/sidebar-layout.tsx:148-151  (SidebarRail)
aria-label="Toggle Sidebar"
title="Toggle Sidebar"        // 同文件 SidebarTrigger:135 已用 t('flux.sidebar.toggle')，双标

// packages/ui/src/components/toolbar/undo-redo-controls.tsx / clipboard-controls.tsx /
//    alignment-controls.tsx / text-format-controls.tsx
aria-label="Undo" / "Redo" / "Copy" / "Cut" / "Paste" / "Clear" / "Align Left" / "Bold" ...

// packages/ui/src/components/ui/spinner.tsx
role="status" aria-label="Loading"
```

问题：包内已有 `t()` 通道且 flux-i18n locale 已备好 `toolbar.undo/redo/copy/cut...`（en-US.ts:405+、zh-CN.ts 对应节），这些组件却硬编码英文。影响：zh-CN 环境下 Command Palette 的 sr-only 标题/描述、侧栏 rail 的 tooltip、工具栏按钮的读屏播报、Spinner 状态播报均为英文，与 dialog/drawer/pagination 等已 i18n 的组件不一致。修复方向：统一走 `t('flux.*')`，在 flux-i18n locale 补齐缺失 key（toolbar 系列、common.loading、command palette 键）。

### F-04 [D1/可达性] CommandDialog 把 sr-only 可聚焦 drag-toolbar 渲染在 Portal 之外：对话框关闭时也常驻 Tab 序

位置：`packages/ui/src/components/ui/command.tsx:36-49` + `dialog.tsx:278-281`

```tsx
<Dialog {...props}>
  <DialogHeader className="sr-only">     {/* 在 Root 内、DialogContent(Portal) 外 */}
    <DialogTitle>{title}</DialogTitle>
    ...
// dialog.tsx DialogHeader（dragContext.enabled 默认 true，因 CommandDialog 未传 draggable）
role={dragContext.enabled ? 'toolbar' : undefined}
tabIndex={dragContext.enabled ? 0 : undefined}
```

问题：DialogHeader 是普通 div，作为 `DialogPrimitive.Root` 的直接子节点**原地渲染**（不进 Portal，不随 open 卸载）；又因 `draggable` 默认 true 获得 `role="toolbar"` + `tabIndex={0}`。后果：使用 CommandDialog 的页面**常驻一个视觉不可见（sr-only）但可 Tab 聚焦的 toolbar**——键盘用户 Tab 会落入隐形元素，方向键还会触发对话框位移逻辑；同时 Title/Description 位于 popup 之外，aria 挂接依赖全局 id，结构偏离 shadcn 参考实现（header 应在 DialogContent 内）。修复方向：把 sr-only header 移入 DialogContent（对齐 shadcn），或 CommandDialog 显式 `draggable={false}`。

### F-05 [D1] 消费者 style prop 整体覆盖内部 zIndex/--gap：Sheet、AlertDialog、NavigationMenuPositioner、ToggleGroup 的 prop 合并契约不一致

位置：

```tsx
// packages/ui/src/components/ui/sheet.tsx:65-66（alert-dialog.tsx:57-58、navigation-menu.tsx:112-113 同型）
style={{ zIndex }}
{...props}                      // props.style 在后，整体替换 {zIndex}

// packages/ui/src/components/ui/toggle-group.tsx:48-53
style={{ '--gap': spacing } as React.CSSProperties}
{...props}                      // 消费者 style 覆盖后 gap-[--spacing(var(--gap))] 失效
```

对照正确写法（包内已有）：`dialog.tsx:190-194` 把 `...props.style` 合并进内部对象；`popover.tsx:34` / `tooltip.tsx:40` / `hover-card.tsx` / `dropdown-menu.tsx:30` 用 `style={{ zIndex, ...style }}`。条件与后果：消费者给这些组件传 `style`（例如 `style={{ left: 0 }}` 调位置）→ zIndex 静默丢失 → 浮层落入错误堆叠层级（低于后开的 overlay）；ToggleGroup 传 style → spacing 静默失效。修复方向：四处统一改为合并式（`{ zIndex, ...style }` / `{ '--gap': spacing, ...style }`）。

### F-05b（并入上条统计为 P2 一项的补充证据）Sheet 消费者 className 上的 zIndex 依赖同理

sheet.tsx 的 `style={{ zIndex }}` 被 `{...props}` 覆盖后，SheetOverlay 经 `SheetZIndexContext` 拿到的仍是 hook 值不受影响，只有 Popup 层丢失——即遮罩在上、面板在下的错序 stacking。结论同上，修复合并式写法即同时解决。

### F-06 [D1/可达性] wrapSurfaceTabFocus 补丁只覆盖 Dialog/Drawer：Sheet 与 AlertDialog 建立在同一个 @base-ui/react dialog 原语上，疑似同样存在 focus 逃逸路径（suspect）

位置：`packages/ui/src/components/ui/wrap-surface-tab-focus.ts:13-20`（注释说明 C1.1 a11y-focus-trap 失败路径，`@base-ui/react 1.3.0` 真实浏览器中 guard cycle 可让焦点逃逸）+ `sheet.tsx:58`（Popup 无 onKeyDown 包装）+ `alert-dialog.tsx:50`（同）。

推理：补丁针对的是 Base UI Dialog Popup 的上游缺陷；Sheet 直接 `import { Dialog as SheetPrimitive } from '@base-ui/react/dialog'`（sheet.tsx:2），AlertDialog 为同族 modal，均未挂 `wrapSurfaceTabFocus`。若上游缺陷复现，Sheet/AlertDialog 内 Tab 可逃逸到 body/页面 chrome。因未在本环境实测上游行为，标 suspect。修复方向：为 SheetContent / AlertDialogContent 的 Popup 同样挂 `wrapSurfaceTabFocus`（成本一行），或注明上游已修复的版本依据。

### F-07 [D1/可达性] wrapSurfaceTabFocus 的可聚焦元素探测有两处偏差：offsetParent 过滤剔除 fixed 定位元素；selector 缺 [contenteditable]/summary 等（suspect）

位置：`packages/ui/src/components/ui/wrap-surface-tab-focus.ts:3-10,27-28`

```ts
const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'a[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');
const focusables = candidates.filter((element) => element.offsetParent !== null);
```

条件与后果：对话框内含 `position: fixed` 的可聚焦后代（如固定式 footer 按钮）时，`offsetParent` 对 fixed 元素返回 null → 被当作不可见剔除 → wrap 边界计算错位，最后一个真实可聚焦处 Tab 不 wrap，焦点逃逸——恰好复现该函数要修的 bug。selector 未覆盖 `[contenteditable]:not([contenteditable="false"])`、`summary`、`audio[controls]` 等同样导致边界提前。因依赖特定 DOM 形态，标 suspect。修复方向：可见性判断改用 `checkVisibility()`（或 `getClientRects().length`），selector 补全；不排序 positive tabindex 属次要。

## P3 提示

### F-08 [D1] Dialog draggable 默认 true 时静默丢弃消费者 onPointerDown

`dialog.tsx:195`：`onPointerDown={draggable ? handlePointerDown : props.onPointerDown}`——draggable 且消费者传 onPointerDown 时（两者都真）消费者回调被丢弃而非组合（onKeyDown 是组合的，:196-199）。修复方向：组合调用两者。

### F-09 [D3] useDialogDrag 移除监听器的身份漂移（罕见）

`use-dialog-drag.ts:121-123` 用 `stopDragRef.current` 移除，`handlePointerDown:187-189` 添加的也是当时的 `stopDragRef.current`；若 drag 期间 `baseTransform` prop 变化导致 stopDrag 重建，`removeEventListener` 对旧引用 no-op。unmount 清理（:218-232）兜底，故仅 drag 中途参数变化时残留到卸载。修复方向：统一保存添加时的引用。

### F-10 [D7/可达性] aria-hidden 与 sr-only 文案自相矛盾（两处）

`pagination.tsx:135-146` PaginationEllipsis、`breadcrumb.tsx:81-93` BreadcrumbEllipsis：根元素 `aria-hidden`（breadcrumb 显式、pagination 隐式未标但 shadcn 同型）内放 `<span className="sr-only">{t(...)}</span>`——aria-hidden 子树对 AT 完全隐藏，sr-only 文案永不播报，i18n 调用形同虚设。修复方向：去掉 aria-hidden 或去掉 sr-only，二选一。

### F-11 [可达性] 拖拽语义小瑕疵：DialogHeader role=toolbar 声明 horizontal 但支持四向箭头；Drawer resize 手柄键盘不可达

`dialog.tsx:278-279`：`role="toolbar"` + `aria-orientation="horizontal"`，但 `handleKeyDown`（:238-259）同时处理 ArrowUp/ArrowDown。`drawer.tsx:184-194`：resize 手柄 `role="separator"` 有 aria-label 但无 tabIndex、无键盘事件，纯指针操作（对照 dialog 拖拽支持方向键+Home）。修复方向：orientation 改 vertical/移除；resize 手柄加 tabIndex + 方向键调整尺寸。

### F-12 [D8/正确性] 组件 props 类型与实际 DOM 不匹配（三处）

- `empty.tsx:68-77` EmptyDescription 声明 `React.ComponentProps<'p'>` 却渲染 `<div>`；
- `kbd.tsx`（KbdGroup）声明 `React.ComponentProps<'div'>` 却渲染 `<kbd>`，且 Kbd 嵌 Kbd 形成嵌套 kbd；
- `input-group.tsx:43-69` InputGroupAddon `role="group"` + `tabIndex={0}`（非交互元素进 Tab 序），点击/回车固定 `querySelector('input')`——组内只有 Textarea 时（InputGroupTextarea 存在）聚焦失效。

修复方向：类型对齐实际元素；addon 聚焦目标改为 `[data-slot="input-group-control"]`。

### F-13 [D5] json-viewer：`as never` 类型逃生 + YAML 序列化失败静默吞掉

`json-viewer.tsx:31` `shouldExpandNode={shouldExpandNode as never}`（绕过库类型）；`:48-52` `stringify` 失败 catch 后返回 `''`，YAML 视图静默空白无任何提示。修复方向：失败时渲染回退文案/降级 JSON 视图；cast 收窄为最小断言并注释原因。

### F-14 [D1] Slider 非数组 value/defaultValue 时按 `[min, max]` 渲染两个 thumb

`slider.tsx:16`：`Array.isArray(value) ? value : Array.isArray(defaultValue) ? defaultValue : [min, max]`——传单数值 `value={50}` 时渲染 2 个 Thumb 而原语按单值语义工作；shadcn 参考实现为 `[value ?? defaultValue]`。当前仓内无单数值消费者（已核对），故为潜伏偏差。修复方向：fallback 改 `[value ?? defaultValue ?? min]` 语义。

### F-15 [D4] `nop-* ` marker（带尾随空格）铺满所有内部 slot；ui Table 的 `nop-table` 与渲染器根 marker 词汇重叠

如 `dialog.tsx` 7 处 `'nop-dialog '`（overlay/content/header/body/footer/title/description 全带），combobox/command/pagination/drawer 等同型。协议上 nop-\* 是"渲染器根身份"，内部区域应由 data-slot 表达（data-slot 已齐全）；虽是包内有意的 CSS 作用域约定，但与 renderer-markers-and-selectors.md 的 root-marker-only 规则形成词汇混淆——flux table 渲染器根 marker 也是 `nop-table`，host CSS `.nop-table` 会同时命中两族。修复方向：确认该约定后写入 styling 文档，或收敛为组件级单一根 marker + data-slot。尾随空格（`'nop-dialog '`）无害但建议清理。

### F-16 [D1/D4] 杂项：SidebarProvider 受控模式仍写 cookie；Toaster 主题硬编码 light

`sidebar-context.tsx:53-63`：受控（传 onOpenChange）时 `setOpen` 仍执行 `document.cookie = ...`（无 SameSite，浏览器默认 Lax）；副作用藏在回调里。`sonner.tsx:31`：`theme={props.theme ?? 'light'}` 硬编码，暗色宿主下 toast 图标/结构样式仍按 light 生成（颜色已被 CSS 变量接管，风险有限）。修复方向：受控模式跳过 cookie 或提取到 effect；Toaster 主题接受注入或跟随 `dark` class。

### F-17 [D3/React19] 轻微不一致：forwardRef 与 ref-as-prop 混用；无谓包装回调

`dialog.tsx:108`（forwardRef）vs `textarea.tsx`（ref-as-prop，React 19 风格）；`drawer.tsx:61-65` onOpenChange 恒等式包装无意义；多处 context value 用 useMemo（React Compiler 下冗余但无害，dialog/drawer/sidebar/carousel 均有）。均非缺陷，统一即可。

## 检查过程记录

1. **前置阅读**：`docs/architecture/styling-system.md`、`docs/architecture/renderer-markers-and-selectors.md`（确认 data-slot/no-BEM/root-marker 契约、shadcn 集成边界、mobile helper 类）、`packages/ui/package.json`（依赖为 `@base-ui/react` 而非 radix；peerDeps react 19 / lucide / recharts / sonner）。
2. **枚举**：`find src -type f (ts|tsx) ! -name "*.test.*" ! -path "*__tests__*"` → 76 文件 8018 行（与任务描述一致）。
3. **07 号线索核实**：读 `ui/src/lib/i18n.ts` → grep `setI18nGetter`（仅 export + flux-i18n 测试引用）→ 读 `flux-i18n/src/i18n.ts`（bridge 剥前缀实现）→ 逐 key 比对 `flux-i18n/src/locales/en-US.ts`（breadcrumb:404、carousel:389-393、common:8-11、dialog:361-367、drawer:368-375、pagination:49-60、sheet:378、sidebar:399-402 全覆盖；`moveDialogInstructions` 仅 flux-i18n 有）→ 读两侧测试（`lib/i18n.test.ts`、`i18n-contract.test.ts`）确认测试前提错误 → 结论 F-01。
4. **精读交互组件**：dialog、drawer、sheet、select、combobox、command、tabs、popover、tooltip、scroll-area、slider、radio-group、use-dialog-drag、wrap-surface-tab-focus、use-global-z-index、carousel、calendar、chart、field、input-group、pagination、sidebar-context/layout/menu、alert-dialog、dropdown-menu、context-menu、menubar、navigation-menu、input-otp、avatar、breadcrumb、item、table(+row-class-name)、json-viewer、empty、sonner、card、button、input/textarea/label/checkbox/switch/toggle(-group)、button-group、accordion、alert、badge、aspect-ratio、collapsible、direction、hover-card、kbd、separator、skeleton、spinner、resizable、progress、native-select、toolbar/_、hooks/_（use-mobile、use-breakpoint、use-breakpoints）、lib/\*（icon-utils、focus-target、utils）。
5. **grep 扫描**：`as any/@ts-ignore/@ts-expect-error`（0）；`as never/as unknown`（json-viewer:31、icon-utils:292）；空 catch（4 处，均为 pointer capture best-effort，2 处有注释）；TODO/FIXME（0）；setTimeout/setInterval/requestAnimationFrame（**0 处，全包无自有定时器**）；addEventListener 8 处——sidebar-context/hooks 三件套均正确清理，use-dialog-drag 有 stopDrag+unmount 双清理，drawer.tsx:300-301 无卸载清理（→ F-02）；非空断言（wrap-surface-tab-focus 2 处边界安全、i18n.ts:41 初始化后必然存在）；BEM `__` 类名（0）。
6. **交叉验证**：`overlay-zindex.test.tsx`（确认 z-index 计数器语义按"渲染即取值"设计，portal 型浮层 mount==open，与注释的差异仅存在于 keepMounted 场景，未单列 finding）；`dialog.test.tsx:137-169`（Tab wrap 有回归测试）；Slider 单数值消费全仓 grep（无命中，F-14 降为 P3）；CommandDialog 结构与 dialog.tsx draggable 默认值交叉推导（→ F-04）。
7. **未覆盖/限制**：只读审计，未运行测试与浏览器实测；F-06/F-07 依赖真实浏览器中 Base UI guard 行为与特定 DOM 形态，均标 suspect 待 e2e 验证；`src/index.ts` 导出面（ask-first 受保护）仅核对未审计改动建议。
