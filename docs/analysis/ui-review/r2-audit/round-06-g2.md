# R2 第 6 轮递归扩展发现（round-06-g2，收敛终判轮）

> 组号: G2（form / form-advanced） · 轮次: Round 06（收敛终判轮，最严格价值判据） · 审查日期: 2026-08-29 · agent: general（fresh session，只读审查） · HEAD `0f183874a`
> 派发机制: 提示词 = `dispatch-shared-prefix.md` + `dispatch-recursive-extension.md`；输入清单 = `round-01.md`（Grep `\[G2-` 精读 19 条）、`round-02-compact.md`（全文 8 条）、`round-03-compact.md`（全文 3 条）、`round-04.md`（Grep `\[G2-` 精读 3 条）、`round-05-g2.md`（全文精读，含"核对过不立案"清单）；累积已知发现 269 条（G2 组 35 条）
> 终判口径: 仅立案"前 5 轮所有方法面都未触及的全新根因 + 真实用户影响检验 + 与 269 条逐根因比对全新"；已有根因复述、同根因可合并实例、纯视觉偏好、零散细节一律弃报并留档（见"弃报留档"节）。

---

## 发现（HIGH 1 / MEDIUM 0 / LOW 0，共 1 条）

### [G2-R6-视角6-01] detail-view / detail-field 草稿弹层无脏态守卫：X 钮、ESC、点击遮罩三条通道均静默 dispose 草稿表单，多字段编辑不可恢复丢失

- **文件**: `packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx:516-518,547-556`；`packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx:347-355`（同接线）；`packages/flux-renderers-form-advanced/src/detail-view/detail-surface.tsx:124-128,156-160`（Dialog/Drawer 关闭透传）；`packages/flux-renderers-form-advanced/src/detail-view/detail-draft-controller.ts:132-145`（dispose 实现点）；`packages/ui/src/components/ui/dialog.tsx:45-49`（`closeOnOutsideClick = true` 默认值）
- **证据片段**:
  ```tsx
  // detail-view.tsx:516-518 — 弹层的全部关闭请求（含 ESC/遮罩/X 钮）都汇入 handleCancel
  function handleCancel() {
    closeDraft();
  }
  // detail-surface.tsx:157-160 — 未传 closeOnOutsideClick（ui 默认 true），未做任何脏态拦截
  <Dialog
    open={props.open}
    onOpenChange={(next) => {
      if (!next) props.onClose();
    }}
  >
  // detail-draft-controller.ts:142-143 — 关闭即销毁草稿运行时，用户输入不可恢复
  draftFormRef.current?.dispose();
  assignDraftForm(undefined);
  ```
- **严重程度**: HIGH
- **现状**: detail-view / detail-field 的工作模式是"点编辑钮 → transformIn 生成草稿表单 → Dialog/Drawer 内多字段编辑 → 确认提交或取消放弃"。弹层内容区是完整的字段编辑表单，底部配 Cancel（放弃）/ Confirm（提交）双钮——即组件自身语义已把"放弃草稿"定义为需要**显式**点击的操作。但 `ui Dialog` 的 `closeOnOutsideClick` 默认 `true`（dialog.tsx:49）且 `DialogContent` 默认渲染右上角 X 关闭钮（`showCloseButton = true`）、ESC 关闭为 Base UI 原语默认，DetailSurface 的 Dialog/Drawer 三条关闭通道全部不透传任何脏态判断，一律直达 `handleCancel → closeDraft → draftForm.dispose()`。`open` 虽为受控 prop，但 `onOpenChange(false)` 无条件转发关闭，受控形态形同虚设。grass 状态无从感知（`readDetailDraftValues(draftForm)` 与 `buildDetailDraftInitialValues` 快照的比对能力现成却未使用）。R4 曾将 detail-draft-controller 的 dispose 链复核为"竞态正确"（sequencer 防陈旧写入）——该结论从竞态面证实了 dispose 的不可恢复性，恰好加重本条的后果量级。
- **行业惯例**: 多字段草稿弹层的关闭守卫是三套参照系统的共同惯例：GitHub（评论/issue 编辑框 ESC/外点弹"未保存更改"确认）、Linear/Notion（模态编辑一律 dirty-check 拦截）；Ant Design 官方 FAQ 给出 `Modal.confirm` 未保存确认模式，并在文档中提示表单类弹层应处理 `maskClosable`/ESC 的误触关闭；Base UI/Radix 社区对 form-in-dialog 的标准做法是在受控 `onOpenChange` 中检查 dirty 后拒绝关闭或转确认（shadcn 生态 dialog-form 示例同）。仅"弹层可被 ESC/外点关闭"本身是平台默认（AntD maskClosable 默认 true 同），但**无 dirty 信号、无确认、dispose 不可恢复**三者叠加在多字段草稿表面，已越过平台默认语义的范围。
- **用户影响**: 用户打开"编辑地址/编辑明细"弹层（detail 系组件的唯一用途、高频路径），填了五六 个字段后按 ESC 想临时回看底层表单、或拖动对话框时指针滑出后点了遮罩、或误点右上角 X——全部输入瞬间清空，无任何提示、无撤销途径，重开弹层回到 transformIn 的原始值。按升级规则（MEDIUM 出现在高频交互路径 → HIGH）与判级表（数据丢失风险、破坏性操作无确认）定 HIGH。真实用户影响检验：多字段编辑 + ESC/误点遮罩均为正常使用中的高频组合，非构造场景。
- **建议**: 三步代码级修复（均为现成能力接线，不引入新原语）：① `DetailSurface` 对非 `readOnly` 草稿模式透传 `closeOnOutsideClick={false}`（ui Dialog 已有该 prop，dialog.tsx:49，一行接线）——遮罩误触这一最高频通道直接消除，Drawer 同理处理遮罩层；② detail-view/detail-field 在 `onOpenChange(next === false)` 分支加脏态守卫：`readDetailDraftValues(draftForm)` 与打开时的 `buildDetailDraftInitialValues` 快照浅比较，dirty 时保持 `open=true` 并复用 `DetailDraftFooter` 的按钮语言弹行内确认（"放弃未保存的修改？"）；③ 顺带把 DialogContent 的 X 钮在草稿模式下隐藏（`showCloseButton={props.readOnly}`）或令其走同一守卫。补一条回归断言："草稿 dirty 状态下按 ESC → 弹层保持打开且出现确认提示；clean 状态下 ESC 直接关闭"。
- **复核状态**: 未复核

---

## 去重自检（与全部 269 条按根因比对 + dedup-baseline §1-§4）

- **[G2-R6-视角6-01]**:
  - vs **[G2-视角6-01] / [G2-R2-视角6-01]**（select/tree-select 移动 sheet 缺确认/关闭钮）：方向相反——彼为"用户想完成操作却没有关闭/确认通道"，本为"关闭过于轻易且不可逆销毁草稿"；根因不同（关闭 affordance 缺失 vs 关闭通道无脏态守卫），修复互不覆盖。
  - vs **[G2-视角6-02]**（picker 对话框取消钮 ghost 样式）：纯按钮 variant 样式 vs 关闭语义与数据安全，不同根因。
  - vs **[G2-R4-视角5-01]**（editor 聚焦窗口外部值丢弃）：外部值同步机制 vs 弹层关闭路径销毁，机制、组件、修复面均不同。
  - vs **[G7-R2-视角11-02]**（form-wizard 收集数据不上送）：schema 动作接线缺陷 vs 弹层关闭语义缺陷，不同。
  - vs **R4"异步竞态面复核通过"**（round-04.md:314 将 detail-draft-controller 的 dispose 链列为正确）：彼仅判**竞态正确性**（sequencer 防陈旧写入），未审视关闭语义；本条是全新方法面（弹层脏关闭守卫），且 R4 结论中"dispose 即销毁"恰为本条"不可恢复"定级的依据，不构成重复。
  - dedup §1（ma5-ux 6 条已修复项）：无交集；§2（已登记缺口 16 项）：G-A~G-M/G3-余 均不含"未保存更改守卫"，非能力缺口表象；§3（误报对照 8 条）：不涉 opacity-0 trigger / ml-auto / ghost 按钮 / icon 尺寸 / 截断 / role=button div / destructive 按钮 / transition-all；§4（维度 09-12、全量 WCAG）：不涉（aria/焦点语义未改动，纯关闭路径数据安全问题）。
  - 真实用户影响检验：通过（见条目内）。

## 弃报留档（本轮核查过、经终判口径不立案的候选，防复核重复提问）

1. **date-range shortcuts/presets 未接 `presentation.interactive` 门禁**（`date-range-renderer.tsx:374-402`，按钮无 disabled）：实测不可达旁路——Popover 受控 `open={open && presentation.interactive}`（:275），字段转禁用瞬间弹层即关闭，弹层内按钮无点击窗口；且 R4 已对两包全部 `handlers.onChange` 调用点做过全量门禁回溯。属 R3/R4 已闭合方法面的复核确认，非新发现。
2. **tag-list 空 `tags` 渲染空白 div**：与 [G2-视角5-04]（radio/checkbox-group 选项源空渲染空白）同根因，收敛轮不另立；修复该条时应把 tag-list 并入同批次。
3. **select-combobox-lists 高亮 `bg-yellow-200 dark:bg-yellow-800`**（:26）：即 [G2-视角7-01] 已立案原文，零新增信息。
4. **remote search / dict / 草稿 open-confirm 竞态面**：R4 已全量复核通过（AbortController/代际守卫/sequencer），本轮逐点确认无变化。
5. **variant-field 变体切换**：readOnly/disabled 正确隐藏选择器（variant-field-view.tsx:110-112）；Select/Tabs 键盘行为委托 Base UI 原语；变体切换的值保留语义为 controller 专项契约（variant-field-unmount/matching 测试覆盖），无用户可见缺陷。
6. **input.tsx 全量门禁/aria 面**：密码揭示 `disabled={!presentation.interactive}`（:313）、clearable 门禁（:279）、counter、aria-invalid/describedby 全链在位，无缺口。
7. **picker-dropdown 选择弹层外点丢弃 pending 选择集**：轻量"先选后确认"语义（非多字段输入草稿），Ant Design Transfer/Modal 选择弹层同为先选后确认、关闭即弃，属行业通行为，低于报告门槛。与本轮已立案条目的本质区别：丢弃物是**可零成本重做的选择**，而非逐字键入的多字段内容。
8. **detail-view 触发钮/确认钮 loading 态、Drawer 显式关闭钮、draftError role=status 通道**：逐一核对在位，质量良好，无缺口。

## 检查范围（本轮读取文件清单）

- **前 5 轮未触及方法面定向深挖**（全文精读）：`flux-renderers-form-advanced/src/detail-view/detail-view.tsx`、`detail-surface.tsx`、`detail-draft-controller.ts`、`detail-field.tsx`（:320-434 段 + 关闭接线段）；`flux-renderers-form/src/renderers/use-select-remote-search.ts`（全文）；`flux-renderers-form-advanced/src/tag-list.tsx`（全文）；`flux-renderers-form-advanced/src/variant-field/variant-field-view.tsx`（全文）；`flux-renderers-form/src/renderers/select-combobox-lists.tsx`（全文）；`flux-renderers-form/src/renderers/date-range-renderer.tsx`（:180-480）；`flux-renderers-form/src/renderers/input.tsx`（门禁/aria/交互面 grep 逐命中核读）。
- **交叉核实**：`packages/ui/src/components/ui/dialog.tsx`（全文，closeOnOutsideClick/showCloseButton 默认值与 onOpenChange 透传链）。
- **对照面 grep**：`docs/analysis/ui-review/r2-audit/` 全目录 `dirty|未保存|unsaved|outside|丢弃|草稿|draft`（68 命中逐一定性，证实"弹层脏关闭守卫"从未立案）；`packages/flux-renderers-form-advanced/src` Dialog/Sheet/Drawer 全量使用点（弹层承载面枚举：picker-dropdown 选择弹层 / tree-controls 移动 sheet / detail 系草稿弹层）。

## 检查方法

1. **未触及方法面枚举**：从 R5 收敛声明反推已覆盖面（disabled 门禁族、async 竞态、maxItems、聚焦辅助、折叠校验、步进、富文本、period、移动 sheet、tree-select 关闭、错误通道、可见性焦点），列出残余方法面：弹层关闭语义/脏态守卫、异步选项源状态、reorder/tag 类轻交互、variant 切换、date-range presets 门禁复核、input 基础控件面——逐一深挖。
2. **关闭通道全链跟读**：从 ui 原语默认值（closeOnOutsideClick/showCloseButton/ESC）→ DetailSurface 透传 → handleCancel/closeDraft/dispose 逐层核对，确认"受控 open 形态下 onOpenChange 无条件放行关闭"的完整证据链。
3. **弹层承载面枚举**：grep 两包全部 Dialog/Sheet/Drawer 使用点，逐一定性承载物（选择集 vs 多字段草稿），确立本条发现的精确边界（仅 detail 系草稿弹层达标，picker/tree sheet 属行业通行为）。
4. **终判去重**：269 条逐根因比对 + r2-audit 全目录关键词 grep 双通道，确认零先例。

## 结论

新发现 **1 条**（HIGH 1 / MEDIUM 0 / LOW 0：视角6-01，全新根因，出自前 5 轮全部方法面均未触及的"弹层脏关闭守卫"面）。G2 组累计（R1-R6）：35 + 1 = **36 条**；全审累计 269 + 1 = **270 条**。其余候选经终判口径全部弃报并留档（8 项，见上）。**G2 组收敛终判：除上述 1 条外，未发现其他新的高价值问题。审查结束。**
