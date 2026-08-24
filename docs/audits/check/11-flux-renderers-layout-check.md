# 11 flux-renderers-layout 实现代码检查报告

- 检查日期：2026-08-20
- 范围：`packages/flux-renderers-layout/src/` 15 个源文件（不含 `*.test.*` 与 `__tests__`），共 3907 行，全部精读；另精读 `src/styles.css`（36 行，包内 marker 基线 CSS）。交叉验证了 flux-compiler（schema-definition 分类管线）、flux-react（`resolveGap`/`unwrapBooleanLiteral`/`unwrapPreservedLiteral`/`useStatusPathPublication`/status-path）、flux-formula（`compileNode` preserve-literal 语义）、ui（`useBreakpoints`/`useIsMobile`/`resolveLucideIcon`/`Collapsible`/`ButtonGroup`）、flux-i18n（locale keys）及 flux-renderers-basic `tabs.tsx`（样式契约校准）。
- 结论概览：P0 x0 / P1 x4 / P2 x3 / P3 x9。总评：包整体架构质量较高（状态分层、scope 三态 ownership、i18n、a11y、事件 dispatch-ctx 均按契约落地，无监听器/定时器泄漏，无 `as any`/`@ts-ignore`/硬编码中文），但 steps 的连接线在两种朝向下均有确定性布局缺陷、timeline 默认外观被图标兜底污染、wizard 自定义 actions 步骤是死路；D4 样式契约上 collapse trigger 与 wizard 内部 slot 的硬编码视觉类与文档化契约（marker-only）冲突，是本包最需要裁决的债务线。

严重级别定义：P0 需 输入→路径→错误结果 推理链（确定性缺陷）；P1 特定条件+后果；P2 契约/风险；P3 提示。

---

## P0 缺陷

无。

## P1 隐患

### F-01 steps 水平连接线绝对定位无定位上下文，逃逸出步骤条（D1）

`steps-renderer.tsx:237-251`

```tsx
<li
  ...
  className={cn(
    'flex',
    orientation === 'vertical'
      ? 'flex-row gap-3 pb-6 last:pb-0'
      : 'flex-1 flex-col items-center text-center',   // ← 无 relative
  )}
>
  {orientation === 'horizontal' && index > 0 && (
    <span
      aria-hidden="true"
      data-slot="steps-connector"
      className={cn('absolute top-3 h-px w-full', ...)}
      style={{ transform: 'translateX(-50%)', width: '100%', left: '50%' }}
    />
  )}
```

- 推理链：输入 = `steps`（默认 `orientation: 'horizontal'`）且 ≥2 个 item → connector span 使用 `absolute` + `top-3` + `left: 50%` + `width: 100%`，但其定位上下文应是所在 `<li>`；`<li>` 的 className 只有 `flex-1 flex-col items-center text-center`，没有 `relative`；兄弟指示器 Button 上的 `relative z-10` 不构成上下文（connector 是其兄弟而非子节点）。全仓核查：包内 `styles.css` 只给 `.nop-steps[data-orientation]` 设 flex 流，无 `position`；`flux-react/default-spacing.css`、theme-tokens、playground 均无针对 `[data-slot="steps-item"]`/`.nop-steps` 的定位规则。→ 错误结果：connector 相对最近的定位祖先（若无则 initial containing block/页面）定位，`left: 50%`+`w-full` 取错误容器的宽度，所有 index>0 的 connector 叠放在同一错误位置（如页首 12px 处的横贯线），而非步骤圆点之间。水平朝向（默认值）下 ≥2 步骤必现。
- 影响：默认配置下 steps 视觉装饰线错位/叠影，是确定性视觉缺陷；测试（`steps-renderer.test.tsx`/`steps-a11y.test.tsx`）无 connector 断言，未被发现。
- 修复方向：给 `<li>` 加 `relative`（或把 connector 改为 flex 布局内的 in-flow 分隔元素），并补一条 connector 定位断言测试。

### F-02 steps 垂直连接线参与 flex 流，推移指示器且分段断裂（D1）

`steps-renderer.tsx:252-260`（配合 `:230-235` 的 li 布局）

```tsx
{
  orientation === 'vertical' && index > 0 && (
    <span
      aria-hidden="true"
      data-slot="steps-connector"
      className={cn(
        'ml-[15px] w-px self-stretch',
        status === 'finish' ? 'bg-primary' : 'bg-border',
      )}
    />
  );
}
```

- 推理链：输入 = `orientation: 'vertical'` 且 ≥2 个 item → 垂直 connector 是 `<li class="flex flex-row gap-3 pb-6">` 的**首个 in-flow 子元素**，占据 `ml-[15px](15px) + w-px(1px) + gap-3(12px) = 28px` 的横向空间 → 错误结果其一：index>0 的步骤指示器按钮（`size-7`=28px）被右推 28px，与 index 0 的指示器（x=0）纵向不对齐；其二：连线位于 x≈15.5px，而按钮中心已被推至 x=42px，连线不再对准圆点中心（`ml-[15px]` 的取值暴露了作者假设按钮在 x=0..28、中心 14px——即假设 connector 不占流空间）；其三：`self-stretch` 只拉伸到 li 的 content-box 高度，上个 item 的 `pb-6`(24px) padding 内无连线，时间轴分段断裂。
- 影响：垂直 steps（≥2 步）指示器错位 + 连线断裂，确定性视觉缺陷，无测试覆盖。
- 修复方向：connector 改 `absolute`（配合 li `relative`）或负 margin 让其脱离流；统一两种朝向的连线实现并补测试。

### F-03 timeline 圆点恒渲染兜底 Circle 图标，默认外观被污染（D1/D2）

`timeline-renderer.tsx:251-253, 325-327`；根因在 `packages/ui/src/lib/icon-utils.ts:283-294`

```tsx
const IconComp = resolveLucideIcon(item.icon) as
  | React.ComponentType<Record<string, unknown>>
  | null;
...
{IconComp ? (
  <IconComp className="size-3 text-white" strokeWidth={2} aria-hidden="true" />
) : null}
```

- 推理链：输入 = `items: [{ time, title, detail }]`（未声明 `icon`，最常见用法）→ `resolveLucideIcon(undefined)` 中 `normalizeIconName(undefined)` 返回 `undefined`，函数**永不返回 null**，空/未知名一律兜底返回 `Circle` 图标 → `IconComp ? ... : null` 的判空分支是死代码，条件恒真 → 错误结果：每个未声明 icon 的事件圆点（`size-3` 彩色圆）内都叠绘一个 `size-3 text-white` 的白色 Circle 描边图形，默认时间线外观被污染。同包 `dropdown-button-renderer.tsx:49-52` 用 `iconName ? resolveLucideIcon(...) : null` 正确做了存在性门控，timeline 遗漏。
- 影响：默认路径（无 icon）视觉确定性缺陷；显式写错 icon 名也只是静默换成 Circle（无警告）。timeline 测试无 icon 相关断言。
- 修复方向：仿 dropdown-button 先门控 `typeof item.icon === 'string' && item.icon.length > 0` 再 resolve；（可选）在 ui 层为未知 icon 名提供 dev 告警或 `resolveLucideIconStrict`。

### F-04 wizard step `actions` 区域整体替换页脚后无任何推进途径（D1/D2 契约）

`wizard-renderer.tsx:589-594, 651-687`；对照 `docs/components/wizard/design.md` §7

```tsx
const currentActionsRegion = currentStep ? ... : undefined;
const hasStepActions = Boolean(currentActionsRegion);
...
{hasStepActions ? (
  <div data-slot="wizard-step-actions-region">
    {asReactNode(currentActionsRegion?.render() as RendererRenderOutput)}
  </div>
) : (
  <>{/* 默认 Prev / Next(commitStep) 按钮 */}</>
)}
```

- 推理链：输入 = 中间步骤声明 `actions` 区域（schemas.ts:14 "Step-level action region (replaces default Next/Prev footer)"，fieldRules 已接线 region 提取）→ 渲染时该步骤的 Prev/Next 页脚被整体替换，`commitStep`/`goToStep` 只由默认按钮触发；wizard 全文只**消费** `useCurrentComponentRegistry()`（解析 `formId`），从未注册任何 component handle → `component:next/prev/goToStep/commitStep`（design.md §7 "推荐支持"）均不存在；步骤切换交互态是 local `useState`，`statusPath` 只读，scope 写入无法移动步骤 → 错误结果：该步骤成为死路——区域内的按钮可派发任意 action，但没有任何 action 能推进/提交向导，用户被卡住且无任何报错。
- 影响：一个已接线、已文档化的 schema 特性在中间步骤上必然产生不可用流程；无测试覆盖（全仓 grep 无 `actionsRegionKey` 用例）。
- 修复方向：实现 design.md §7 的 component handles（至少 `component:next`/`component:commitStep`），或在 schema/文档明确 `actions` 仅建议用于最后一步并在中间步骤渲染时保留默认 Next。

## P2 风险

### F-05 collapse trigger/content 硬编码完整视觉类，与 2026-08-16 文档化 marker-only 契约冲突（D4）

`collapse-renderer.tsx:211-214, 226-232, 235`；契约出处 `docs/architecture/styling-system.md` §"Collapse 语义 trigger marker 契约（2026-08-16）"

```tsx
<CollapsibleTrigger
  ...
  className={cn(
    'flex w-full items-center justify-between rounded-lg border border-border px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-muted',
    isOpen && 'bg-muted',
  )}
>
...
<CollapsibleContent data-slot="collapse-content">
  <div className="px-4 py-3 text-sm">{bodyContent}</div>
</CollapsibleContent>
```

- 问题：契约原文"**渲染器只发 marker，视觉全部归宿主 CSS**"，且要求宿主通过 `data-tone`/`data-slot="collapse-tone-bar|collapse-count|collapse-leading"` 等 marker 定制。当前实现 marker 已齐，但 trigger 携带整套硬编码 chrome（边框、圆角、`px-4 py-3`、`hover:bg-muted`、选中 `bg-muted`），content 也带 `px-4 py-3 text-sm`。宿主若按契约从 CSS 侧定制视觉，会与这些内联 Tailwind 类互相打架（Tailwind utilities 优先级高，宿主需逐条覆盖）。tone-bar 的 `size-0.5 self-stretch` 是契约表格中明示的"当前值"，属已注册例外，不计入。
- 影响：契约/治理风险——schema 作者与宿主看不到这些隐式样式，主题定制成本高；与文档直接矛盾，需裁决（要么改代码收敛为 marker + 包级 CSS 基线，要么修订契约注册现状）。
- 修复方向：trigger/content 视觉迁入包级 CSS（参照本包 `styles.css` 与 `flux-react/default-spacing.css` 的 `@layer base` 模式）或 shadcn 组件，代码只留 marker + schema 通道；至少应在契约文档登记该偏差。

### F-06 wizard 内部 slot 硬编码布局/视觉类，且无 schema 覆写通道（D4）

`wizard-step-body.tsx:63`；`wizard-renderer.tsx:612-615, 626, 647-650`

```tsx
// wizard-step-body.tsx:63
<div data-slot="wizard-step-body" ... className="flex flex-col gap-4">

// wizard-renderer.tsx:612-615
<ol className={cn(mode === 'vertical' ? 'flex flex-col gap-1' : 'flex flex-wrap items-center gap-1')}>

// wizard-renderer.tsx:626, 647-650
<div ref={bodyRegionRef} data-slot="wizard-body-region" className="mt-4" />
<div data-slot="wizard-actions" className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3">
```

- 问题：wizard 在 layout-selection-guide 中属布局/流程类渲染器；本包 `styles.css` 头注自述"Layout renderers emit marker classes only; renderer roots stay marker-only"。root（`nop-wizard`）确实 marker-only，但 step body 的 `flex flex-col gap-4`、nav `ol` 的 `flex flex-col gap-1`、footer 的 `mt-4 flex items-center justify-between gap-2 border-t pt-3` 都是作者不可见、不可覆写的隐式布局——`WizardSchema` 没有 `bodyClassName`/`actionsClassName` 等对应 prop（styling-system.md "Per-Slot ClassName Props" 模式）。这正是契约文档中"Bad: renderer injects invisible hardcoded layout"示例的实例。校准：同层级的 tabs（flux-renderers-basic）把 chrome 全部委托给 shadcn Tabs 组件、自身零硬编码视觉类。
- 影响：宿主/主题无法按 schema 调整 wizard 步骤体间距与页脚布局，只能靠 CSS 覆盖 Tailwind utilities；契约红线（布局渲染器禁硬编码 gap-_/flex/p-_）在本包主渲染器上失守。
- 修复方向：为 WizardSchema 增加 per-slot className props 并把默认间距移到包级 `@layer base` CSS（styles.css 已有该机制），或按 tabs 模式改用 ui 组件承载 chrome。

### F-07 wizard 步骤守卫 action 抛错被静默吞掉，导航无反馈中止（D5）

`wizard-renderer.tsx:263-265`（对照 `:450-469` commitStep 的 catch）

```tsx
    } catch {
      return false;
    }
```

- 问题：`runStepTransitionGuards` 中 `beforeLeave`/`beforeEnter` 的 dispatch 若 throw（如 action 内部 ajax 失败、表达式错误），catch 后直接 `return false` 中止导航——不设置 `stepError`、不派发 `onStepError`、不 console。注释引 C5.1 P2-1"never leak an unhandled rejection"只解决了未处理 rejection，却把错误变成了完全静默。同文件 `commitStep` 的 catch 会 `setLifecycle({lastCommitStatus:'error', stepError})` 并派发 `onStepError(reason:'commit-threw')`——两个 catch 的错误呈报策略不对称。
- 影响：特定条件（守卫 action 抛错）+ 后果：用户点击"下一步"毫无反应、无任何错误提示，排障困难；守卫返回 `{ok:false}` 是正常的阻塞语义，但"抛错"与"阻塞"对用户不可区分。
- 修复方向：guard catch 至少 `console.warn`/`console.error`（带 step key），理想情况下并入 lifecycle 错误面（`stepError` + `onStepError(reason:'guard-threw')`），注意保持"守卫失败不算 commit 失败"的状态语义。

## P3 提示

### F-08 wizard step `disabled` 注释宣称 expression，实际为 literal-only（D2 文档一致性）

`schemas.ts:19` `/** Step disabled (expression) ... */` 与实现不符：`layout-renderer-definitions.ts:42` fieldRules 声明 `disabled: 'literal'` → 编译器包成 `{__nopPreserveLiteral, value}` envelope（node-compiler-helpers.ts:360-375），flux-formula `compileNode`（compile-node.ts:48-57）对 envelope 一律 static 不求值 → `"disabled": "${scope.locked}"` 原样字符串经 `unwrapBooleanLiteral`（`'${...}' === true` → false）恒为"未禁用"，静默失效。literal 语义本身是测试锁定的契约（`__tests__/wizard-boolean-literal-compile-through.test.ts`），问题只在注释。相邻的 `visible` 未声明 fieldRule、经 `expressionCompiler.compileValue` 求值（node-compiler.ts:305-353），是真支持表达式——同一对象上两个字段一个能一个不能，注释还都写 expression，极易踩坑。修复方向：改注释为 literal，或如需表达式再显式设计（勿悄悄改 kind）。

### F-09 button-group 选中态 seed-only 且无 valueOwnership 三态（D2 一致性）

`button-group-renderer.tsx:57-59`：`useState(() => toKeyArray(schemaProps.value ?? defaultValue))` 只读一次，运行时 `value` 变化不联动（propContract 描述已明示"NOT reactive"，属文档化行为）；但同包 steps/collapse/timeline 均实现 `valueOwnership: local/controlled/scope` 三态，button-group 是唯一缺失者，schema 作者按兄弟组件直觉绑定 `value: "${scope.tab}"` 会落空。另注意 single 模式点击已选中项是**取消选择**（`:69` `next = selectedSet.has(key) ? [] : [key]`，toggle 语义，value 变 null），与常见单选组语义不同。修复方向：至少在 flux-guide 标注差异；长期对齐三态 ownership。

### F-10 steps 点击当前步骤重复派发 onChange（D1/D6）

`steps-renderer.tsx:189-204`：`handleClick` 未过滤 `isCurrent`，点击当前步骤仍 `props.events.onChange?.(...)` 一次（local setValue 同值不重渲染，但事件照派）。若 schema 的 onChange 挂了 loadData 等副作用，重复点击当前步骤会重复触发。修复方向：`if (index === currentIndex) return;`（或文档化该语义）。

### F-11 grid/responsive 对"数字字符串"输入静默降级（D1 输入校验）

`grid-renderer.tsx:21-26, 76-77`：`resolveColumnCount` 只认 `typeof columns === 'number'`；`"columns": "3"`（表达式求值成字符串或作者手误）落入 string 分支被原样写入 `gridTemplateColumns = "3"`（非法 CSS 被浏览器忽略）→ 静默退化为单列。`responsive-renderer.tsx:29-38`：`min/max` 传 `"900"`（数字字符串）时 `BREAKPOINT_WIDTHS['900']` 为 undefined → 该 variant 被当作**无界默认树**，与"min/max 支持任意 px"的文档预期相悖。修复方向：对 `/^\d+$/` 字符串做 `Number()` 归一，或 dev 告警。

### F-12 timeline 图标硬编码 `text-white`（D4）

`timeline-renderer.tsx:326`：`<IconComp className="size-3 text-white" ...>`——白色非设计 token（`primary-foreground`/`foreground`），浅色圆点 level（如 `bg-muted-foreground` 配白图标在浅主题下对比度尚可，但宿主改 level 底色后不可控）。修复方向：改 `text-primary-foreground` 或随 level 映射；与 F-03 一并处理。

### F-13 responsive 全不匹配时回退渲染 variant 0（D1 语义未定义）

`responsive-renderer.tsx:91-94`：所有 variant 都带 bounds 且当前视口全不匹配时，`defaultIndex === -1` → `activeIndex = 0`，渲染第一个**本身不匹配**的变体树。quick-reference 文档只定义了"无命中渲染第一个无 bounds 变体"，未定义此回退。修复方向：文档化该行为，或全部带 bounds 且不匹配时渲染空/显式 `data-unmatched`。

### F-14 wizard 种子 value 可落在隐藏步骤上（D1 边界，suspect）

`wizard-renderer.tsx:85-103`：初始解析 `findStepIndexByKey` 不做 `isStepVisible` 过滤（导航路径 `computeCanGoTo` 会过滤）。`value` 指向 `visible:false` 步骤时：当前步为隐藏步，nav 无对应高亮项，`isLastStep`（对比 `lastVisibleStepIndex`）判定与当前步错位，在其上 commit 会照常派发 `wizard:step-commit`。属作者配置错误但渲染器未防御。修复方向：初始化时对不可见目标回退到最近可见步（与 C5.1 P1-3 精神一致）；标记 suspect 因可能存在"种子到隐藏步再由 beforeEnter 决定"的预期用法。

### F-15 collapse 所有 item body 始终 eager 渲染（D6）

`collapse-renderer.tsx:175-177`：`bodyRegion.render()` 对每个 item 无条件调用（含折叠中的面板），CollapsibleContent 常驻 DOM。tabs/wizard 均提供 `mountOnEnter`/`unmountOnExit` 懒挂载，collapse 没有——重内容（表格/图表）多面板场景全量挂载。修复方向：对齐 tabs 的 activated-once 模式或提供同名字段。

### F-16 类型逃逸与图标静默兜底（D8）

`button-group-renderer.tsx:120-121`、`dropdown-button-renderer.tsx:136-137`：`variant={variant as never}` / `size={size as never}` 绕过 cva 类型约束，schema 传入非法 variant（如 "primary"）无编译期/运行期反馈，渲染异常样式。`dropdown-button-renderer.tsx:45-52`：无效 icon 名经 `resolveLucideIcon` 静默兜底为 Circle（ui 层语义），触发按钮显示错误图标而非告警。修复方向：收敛为受控字面量联合 + dev 校验；icon 用 `resolveLucideIconStrict` 或 dev 告警。

---

## 检查过程记录

1. **前置文档**：通读 `docs/architecture/styling-system.md`（Renderer Styling Contract、Marker 命名、2026-08-16 collapse 契约、Per-Slot ClassName）、`docs/architecture/layout-selection-guide.md`（组件分类：wizard/collapse 辅助与交互式布局）、`docs/references/quick-reference.md`（RendererComponentProps 契约、hooks、responsive 语义）；读 `package.json`（deps：flux-core/flux-i18n/flux-react/ui；build 经 tsc + copy styles.css）。
2. **全量精读**：15 个源文件 3907 行逐行读完（index.ts / wizard-renderer / wizard-step-body / wizard-step-helpers / grid-renderer / collapse-renderer / button-group-renderer / dropdown-button-renderer / steps-renderer / timeline-renderer / responsive-renderer / process-display-definitions / layout-renderer-definitions / schemas / test-support），另读 `src/styles.css`、`tsconfig.build.json`（test-support 已被 build exclude，全仓通用模式，不构成 finding）。
3. **模式扫描**（grep 全部通过、结果干净）：`as any`/`@ts-ignore`/`@ts-expect-error` = 0；非空断言 = 0；硬编码中文 = 0（文案全部经 `t()`）；catch 共 2 处（wizard:263 见 F-07、wizard:450 处理完备）；addEventListener/ResizeObserver/IntersectionObserver/setInterval = 0（仅 dropdown-button setTimeout，unmount cleanup 于 :81-87 完备，D3 无泄漏）；`as never`/`as unknown` 计 20 处（多数为合法 resolved-props 桥接，风险项归入 F-16）。
4. **D1 专项**：wizard 步骤跳转链（computeCanGoTo 线性门/高水位/隐藏步跳过、commit 期导航锁 P1-03 的 stale-closure 时序、isLastStep 以 lastVisibleStepIndex 收口 C5.1 P1-3——均验证正确）；pagination 本包不存在（在 flux-renderers-data）；steps/timeline/collapse 的 value 解析链与 clamp/回退差异逐条核对（timeline 显式不回退首项，与 steps 回退 0 不同，注释已声明为 adjudication v2）。发现项：F-01/F-02（connector）、F-03（icon 兜底）、F-04（actions 死路）、F-10、F-11、F-13、F-14。
5. **D2/D4 专项**：逐渲染器核对 className 输出——responsive/grid/button-group root 均 marker + schema 通道（合规）；steps/timeline 判定为自样式展示 widget 型（root 流布局在包级 CSS，内部 chrome 属 widget 设计，合规，报告总评已说明分类张力）；collapse/wizard 违例项 F-05/F-06；与 flux-renderers-basic `tabs.tsx`（chrome 全委托 ui 组件、零自写视觉类）校准。数据读取契约全包合规：一律 `props.props/meta/regions/events/helpers` + 标准 hooks（useScopeSelector/useRenderScope/useCurrentComponentRegistry），无直接 store 访问、无私有 context。
6. **D7 专项**：核对 `flux.wizard.previous/next/complete/committing/noSteps/stepNav/validationFailed/commitFailed`、`flux.steps.step`、`flux.common.noData` 在 `flux-i18n/src/locales/zh-CN.ts` 与 `en-US.ts` 双侧齐全。
7. **交叉验证（反误报）**：flux-compiler `node-compiler.ts:305-353` + `node-compiler-helpers.ts:284-404`（schema-definition 分类：fieldRules 外字段经 `expressionCompiler.compileValue` 求值 → wizard step `visible` 表达式**可用**，未误报）；flux-formula `compile/compile-node.ts:48-57`（envelope 静态化 → disabled 表达式**不可用**，F-08 成立）；ui `use-breakpoints.ts`（空 query 走 matchMedia('') 但 responsive 循环已跳过无界项，无问题）、`use-mobile.ts`、`icon-utils.ts:243-294`（F-03 根因确认）、`collapsible.tsx`/`button-group.tsx`（props 透传与 marker 重复无害）；flux-react `status-path.ts`（`scope.parent ?? scope` 与 pagination/tree 同范式）、`resolve-gap.ts`、`preserve-literal.ts`；wizard design.md §5/§7/§10（F-04、F-08 依据）；测试目录核查确认 F-01~F-04 均无既有覆盖、collapse/wizard 硬编码类未被测试锁定（重构不破坏现有测试）。
8. **D6 专项**：wizard 默认仅挂载当前步体（mountOnEnter/unmountOnExit 语义正确）；collapse 全量挂载（F-15）；regions 每渲染重算是框架标准模式，不另立 finding。
