# R2 第 5 轮递归扩展发现（round-05-g2，收敛确认轮）

> 组号: G2（form / form-advanced） · 轮次: Round 05（收敛确认轮） · 审查日期: 2026-08-28 · agent: general（fresh session，只读审查） · HEAD `0f183874a`
> 派发机制: 提示词 = `dispatch-shared-prefix.md` + `dispatch-recursive-extension.md`；前轮输入按压缩策略：round-01 全文 / round-04 全文 / round-02-compact / round-03-compact（累积 253 条已知发现）
> 盲区覆盖说明（派发指定残余面 2 项）:
> ① **验证错误提示与提交拦截的组合** — 已完整覆盖：两包全部 56 处 `aria-invalid` / `role="alert"` / `errorId` 通道逐一矩阵核对（控件级 vs 容器级）；`form.tsx` 提交失败后"聚焦首个错误字段"链路精读；`flux-runtime` 提交流（重入守卫、hiddenFields 排除、submitAttempted/touched 置位、submittingDelay 默认 0）交叉核实；`FieldFrame`（`wrap: true` 渲染器的错误 chrome 提供方）注入路径逐行核对。产出 [G2-R5-视角4-01]。
> ② **conditional 可见性切换时的焦点保留** — 已完整覆盖：`visible=false` 卸载策略（`node-renderer-resolved.tsx:414-422`，return null + notifyFieldHidden）、`useHiddenFieldPolicy` 注册链、`fieldset` collapse 路径（keepMounted + display:none）。结论：字段因可见性表达式翻转而消失时焦点释放为 body，与 Ant Design Form.Item hidden / Radix Collapsible 行为一致，属行业通行为，单独不达报告门槛；但其与校验提交的组合（折叠区内字段校验失败 → 错误不可见的静默拦截）成立，产出 [G2-R5-视角4-02]。
> 收敛判定: 本轮为收敛确认轮，按派发"价值收敛判据"从严执行——仅报告上述 2 条有明确用户影响的新根因；其余核查面均归入"核对过不立案"（见下）。G2 组 R1→R5 趋势 19 → 8 → 3 → 3 → 2，残余面已闭合，**建议 G2 组审查结束**。

---

## 发现（HIGH 0 / MEDIUM 2 / LOW 0，共 2 条）

### [G2-R5-视角4-01] 提交失败后的"聚焦首个错误字段"辅助对容器型 aria-invalid 控件静默失效：radio-group / button-group-select / 全部 wrap 复合字段的错误无法成为焦点目标

- **文件**: `packages/flux-renderers-form/src/renderers/form.tsx:328-344`（消费方）；`packages/flux-renderers-form/src/renderers/input-choice-renderers.tsx:588-616`；`packages/flux-renderers-form/src/renderers/button-group-select-renderer.tsx:95-124`；`packages/flux-react/src/field-frame.tsx:189-207,257-263`（注入源）
- **证据片段**:
  ```tsx
  // form.tsx:332-336 — 提交停止后在表单内找第一个 aria-invalid 元素并聚焦
  requestAnimationFrame(() => {
    const firstInvalid = sectionRef.current?.querySelector('[aria-invalid="true"]');
    if (firstInvalid instanceof HTMLElement) {
      firstInvalid.focus();
  ```
  ```tsx
  // input-choice-renderers.tsx:596-598 — aria-invalid 落在 RadioGroup 容器 div 上
  aria-invalid={presentation.showError ? true : undefined}
  aria-describedby={errorMessage ? errorId : undefined}
  // :609-613 — 可聚焦的 RadioGroupItem 不携带 aria-invalid
  <RadioGroupItem
    value={option.value}
    aria-label={option.label}
    disabled={loading || presentation.effectiveDisabled}
  ```
  ```tsx
  // button-group-select-renderer.tsx:100 — 同模式：aria-invalid 在 ButtonGroup 容器，:110-123 的选项 Button 不携带
  ```
  ```tsx
  // field-frame.tsx:262 与 :196 — wrap:true 复合字段（combo/input-table/transfer/picker/array-editor/key-value 等）的
  // 数组级错误 aria-invalid 注入到 field-control div 与渲染器根 div（均无 tabIndex，不可聚焦）
  aria-invalid={showError || undefined}
  ```
- **严重程度**: MEDIUM
- **现状**: form 在提交被校验拦截后提供"焦点跳转到第一个错误字段"的辅助（键盘用户校验反馈的核心通道）。但 `querySelector('[aria-invalid="true"]')` 的命中面覆盖了三类**不可聚焦**的容器：① radio-group（aria-invalid 在 RadioGroup div，ui `radio-group.tsx` 根无 tabIndex；讽刺的是 ui `RadioGroupItem` 基类已内置 `aria-invalid:border-destructive aria-invalid:ring-3` 样式却从未收到该属性）；② button-group-select（aria-invalid 在 ButtonGroup div，选项 Button 不携带）；③ 所有 `wrap: true` 复合字段的数组级错误（FieldFrame 把 aria-invalid 注入到渲染器根 div / field-control div，内部可聚焦 input 不继承）。`HTMLElement.focus()` 对无 tabindex 的 div 是规范定义的静默 no-op——对照可用组：input/textarea/number/date/time/select 的 aria-invalid 都在可聚焦控件本身，聚焦正常工作。结果是同一表单里"提交后焦点跳到错误字段"行为按控件类型随机成立/失效。
- **行业惯例**: shadcn/ui 表单校验惯例（react-hook-form + shadcn Form）是错误态落在**可聚焦控件**上并 `setFocus` 到字段；Ant Design Form `validateFields` 失败后 `focusToFirstError` 聚焦到具体控件。错误焦点目标是控件而非容器，是三套参照系统的一致行为。
- **用户影响**: 键盘用户在含 radio-group / button-group-select / 复合字段的表单按 Enter 提交，校验失败时焦点原地不动：若错误字段在视口外（长表单常态），界面呈现"点了提交毫无反应"，唯一的错误指示是读屏的 role=alert 播报与视口外的红字；同样表单换成 input 字段则焦点正确跳转——用户与作者都无法预测该辅助何时生效。通过真实用户影响检验（键盘提交 + 错误在视口外是常态组合，非构造场景）。
- **建议**: 两端修复：① 渲染器端（最小改）——radio-group / button-group-select 把 `aria-invalid={presentation.showError ? true : undefined}` 下发到每个可聚焦选项（`RadioGroupItem`/选项 `Button`，前者样式已就位零成本）；② form.tsx 端（兜底）——查询改两段式：先 `[aria-invalid="true"]:is(input, textarea, select, button, [tabindex])`，未命中再退 `[aria-invalid="true"] :is(input, textarea, select, button, [tabindex])`（容器内首个可聚焦后代），使 FieldFrame 包装的复合字段错误也能落到内部 input。补一条"radio-group 校验失败 → document.activeElement 位于该组选项内"的回归断言。
- **复核状态**: 未复核

---

### [G2-R5-视角4-02] collapsible fieldset 折叠区内的字段照常参与校验并拦截提交，但错误提示渲染在 display:none 区内不可见：提交静默失败且无展开引导

- **文件**: `packages/flux-renderers-form/src/renderers/fieldset.tsx:33-37,83-92`；组合面 `packages/flux-renderers-form/src/renderers/form.tsx:319-349`；对照隐藏策略 `packages/flux-react/src/node-renderer-resolved.tsx:414-422`
- **证据片段**:
  ```tsx
  // fieldset.tsx:33-34 — 折叠 = 纯 CSS display:none，子字段保持挂载
  const bodyStyle = collapsed
    ? { display: 'none', ...fieldsetGap.style }
    : ...
  // :84-90 — keepMounted：折叠期间子字段仍注册、仍校验
  <CollapsibleContent
    keepMounted
    id={`${props.meta.cid}-body`}
  ```
  ```tsx
  // node-renderer-resolved.tsx:414-418 — "隐藏字段排除校验"策略只认 schema visible/hidden，不认折叠态
  const isFieldHidden = Boolean(!finalResolvedMeta.visible || finalResolvedMeta.hidden);
  hiddenOwner.notifyFieldHidden(fieldName, isFieldHidden);
  ```
- **严重程度**: MEDIUM
- **现状**: 本仓已建立"隐藏字段不参与校验"的正确策略（`visible=false` → 卸载 + `notifyFieldHidden` 排除，`form-runtime-submit-flow.ts:166-185` 按 hiddenFields 过滤）。但 collapsible fieldset 的折叠是**第三种隐藏形态**：子字段保持挂载（keepMounted）、保持注册、`meta.visible` 仍为 true，于是照常被 `buildSubmitTouchedState` 标记 touched、照常校验；折叠仅是 `display:none`。当唯一（或首个）校验失败字段位于折叠区内时：提交被拦截、`onValidateError` 走默认无操作、错误 span（role=alert）渲染在 display:none 子树内视觉不可见、form.tsx 的聚焦辅助 `focus()` 对 display:none 元素静默 no-op（`scrollToFirstError` 的 scrollIntoView 同样无效）。用户视角：点击提交，按钮看起来毫无反应。
- **行业惯例**: Ant Design Form 放在收起 Collapse 中的字段同样会校验失败且不可见——但 Ant Design 官方 demo/文档明确此为反模式并要求 `forceRender` 配合手动展开处理；shadcn/ui 生态分步表单（多步向导）惯例是只挂载当前步。本项目自身已用 hidden-policy 表达了"看不见的字段不该拦提交"的产品意图，折叠态是该意图的漏网形态。至少需要"有错误在折叠区内"的用户可见信号。
- **用户影响**: 长表单用折叠 fieldset 分组（该组件的核心用途），用户收起了某个分组后点提交：若该分组内有必填/格式错误，表单永久无法提交且界面零反馈——用户会反复点击提交、检查可见字段、最终认为网站坏了；不知道需要展开某个分组才能看到红字。通过真实用户影响检验。
- **建议**: 最小改法（信号层）：fieldset 订阅 body 内字段的 `fieldStates`（或提交后在 form.tsx 聚焦逻辑中检测 `firstInvalid?.closest('fieldset[data-collapsed]')`），给 legend 追加错误徽标——`data-has-invalid` + `<CircleAlertIcon className="size-3.5 text-destructive" />`，提示"该分组内有 N 项错误"；完整改法（行为层）：提交校验失败且失败字段位于折叠区时自动展开该 fieldset 再聚焦（fieldset 暴露受控 expand handle 或监听自定义事件）。任一方案落地后补"折叠区含错误字段 → 提交后 legend 出现错误指示"断言。
- **复核状态**: 未复核

---

## 去重自检（与全部 253 条按根因比对）

- **[G2-R5-视角4-01]**: G2 前四轮（33 条）无任何"提交后焦点辅助"条目；与 [G2-视角4-03]（select 三形态高度不一致）、[G2-R2-视角3-01]/[G2-R3-视角3-01]/[G2-R4-视角3-01]（disabled 门禁族）、[G2-视角9-02]（校验文案 i18n）根因均不同——本条根因是"aria-invalid 落点不可聚焦导致 focus 辅助失效"。ui RadioGroupItem 自带 aria-invalid 样式的事实进一步确认是接线缺失而非能力缺失，不落入 dedup §2 已登记缺口。
- **[G2-R5-视角4-02]**: 与 [G2-视角5-03]（autoLoad 无 loading、值覆盖）不同（彼为加载反馈缺失，本为折叠态校验反馈缺失）；与 [G3-R3-视角4-03]（列全部隐藏成空壳）同属"上下文被隐藏吞掉状态"表现族但机制不同（彼为列设置无保护，本为折叠区校验通道断裂）；与 [G1-R4-视角5-02]（miss 值渲染空 span）同族"静默无反馈"但分属不同包与机制。fieldset 在 G2 前四轮从未被报告。
- 两发现在去重基线 §1-§4 检查下均成立：非 ma5-ux 已修复项、非 §2 已登记 16 项缺口表象、非 §3 误报对照 8 条（不涉 opacity-0 trigger / ml-auto / ghost / icon-xs / 截断 / role=button div / destructive 按钮 / transition-all）、不涉维度 09-12 与全量 WCAG（role=alert 通道已存在且正确，本条只涉视觉/焦点可达性）。

## 本轮核对过且不构成发现的疑点（防复核重复提问）

- **验证错误通道矩阵（56 处命中逐一定性）**: input/textarea/number/time/date/datetime/date-range/markdown-editor/period/upload/tree-controls/array-editor（条目级）/key-value（条目级）的 aria-invalid 均落在可聚焦控件本身 → 聚焦辅助正常；checkbox-group 落在每个 Checkbox 按钮 → 正常；select 桌面（controlProps 经 ：268 注入 trigger）与移动端（trigger 按钮）→ 正常；radio-group/button-group-select/composite 数组级 → 失效（已报视角4-01）。所有 error span 均 `role="alert"`，errorId ↔ aria-describedby/aria-errormessage 关联链完整，无缺失通道。
- **提交拦截正确性**: 运行时重入守卫（`form-runtime-submit-flow.ts:245-251` `Submit already in progress`）在位，双击提交无重复提交风险；`submitAttempted` 在校验前置位 → 错误按 `showErrorOn: ['touched','submit']` 正确显示；`submittingDelay` 默认 0，focus 副作用无时序竞态（>0 为 opt-in 配置，其下 focus 辅助可能不触发——非默认路径，低于门槛，此处登记备查）。
- **visible=false 可见性切换**: 渲染层 `return null` 卸载 + `notifyFieldHidden` 排除校验 + 值按 `clearValueWhenHidden` 策略处理——闭环正确。焦点在字段消失时释放为 body，与 Ant Design/Radix 同为行业通行为，不立案；"重新显示后恢复焦点"无任何主流框架实现，不构成行业惯例偏离。
- **autoFocus 选择器**（form.tsx:367-369 `input:not([disabled])`）不排除 display:none / 折叠区内元素：首字段被条件隐藏时 autoFocus 静默 no-op。autoFocus 为 opt-in、失效后果是"少了一次便利"而非交互障碍，按本轮从严判据弃报，登记备查供顺带修复（加 `:not([hidden])` 与可见性过滤成本极低）。
- **Enter 提交的角色守卫**（form.tsx:438-441 button/checkbox/switch/radio/contenteditable 豁免）与 R1-R4 结论一致，无新缺口。
- **错误汇总（error summary）缺失**: 仅逐字段展示 + 聚焦辅助，无表单级汇总——属"建议"非"发现"（行业两派并存：antd 无汇总、部分设计系统有），按共享前缀"只报发现不报建议"弃报。

## 检查范围

- `packages/flux-renderers-form/src/`: form.tsx（全文精读）、fieldset.tsx（全文）、field-utils/ 全部 5 文件（field-presentation/field-hidden-policy/field-validation 精读，field-handlers 复核 R4 结论）、checkbox-group-renderer.tsx / button-group-select-renderer.tsx / input-choice-renderers.tsx（错误通道段精读）、form-renderers.css（错误样式段）。
- `packages/flux-renderers-form-advanced/src/`: combo-renderer / input-table-renderer / transfer-renderer / picker-renderer / array-editor / key-value / upload-field / tree-controls（错误通道 grep 矩阵 + wrap 标志核对）。
- 交叉核实: `packages/flux-react/src/field-frame.tsx`（全文）、`node-frame-wrapper.tsx`（全文）、`node-renderer-utils.ts`（wrap 模式解析）、`node-renderer-resolved.tsx`（隐藏策略段）；`packages/flux-runtime/src/form-runtime-submit-flow.ts`（全文）、`form-runtime-submit.ts`（submitAttempted/touched 段）、`form-runtime.ts`（submittingDelay 默认值）；`packages/ui/src/components/ui/radio-group.tsx`、`button-group.tsx`（tabIndex 核对）。

## 检查方法

1. **错误通道全量矩阵**: `aria-invalid|role="alert"|aria-describedby|errorId` 两包全量 grep（56 命中）→ 逐一判定"aria-invalid 落点是否可聚焦"（控件级 ✓ / 容器级 ✗）→ 与 form.tsx 聚焦查询交叉，得出失效控件集合。
2. **提交链路全程跟读**: UI 层（form.tsx subscribe → focus/scroll）→ 运行时层（executeFormSubmit：重入守卫 → touched 置位 → 校验 → hiddenFields 过滤 → finally 复位）逐段核对"拦截发生时用户能看到什么"。
3. **可见性三形态对照**: visible=false（卸载+排除）/ schema hidden（同前）/ fieldset collapse（keepMounted + display:none，无排除）三通道逐一核对校验参与度与反馈可见性，识别第三形态的策略缺口。
4. **wrap 机制反查**: `wrap: true` 定义全量枚举 → NodeFrameWrapper/FieldFrame 注入路径逐行核实 → 确认复合字段错误**有**显示（排除"零反馈"误报）但 aria-invalid 落点在根 div（确立聚焦失效的精确边界）。

## 结论

新发现 **2 条**（HIGH 0 / MEDIUM 2 / LOW 0：视角4-01、视角4-02，均出自派发指定的两个残余盲区面，均为新根因）。G2 组累计（R1-R5）：33 + 2 = **35 条**；全审累计 253 + 2 = **255 条**。两个残余盲区面已按上述方法闭合，其余递归候选（autoFocus 隐藏目标、submittingDelay 非默认路径、焦点恢复、错误汇总）经真实用户影响检验均低于报告门槛并已登记备查。按本轮"价值收敛判据"从严口径：**未再发现其他新的高价值问题。G2 组审查结束。**
