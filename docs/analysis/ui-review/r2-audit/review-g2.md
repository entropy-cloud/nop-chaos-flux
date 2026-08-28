# R2 全量 UI 一致性审查 — G2 组独立复核报告（review-g2）

- 复核人: 独立复核子 agent（G2 组，与发现 agent 非 session）
- 复核日期: 2026-08-29
- 复核基线: `git rev-parse HEAD` = `0f183874a25f942c234b9806b1546c6f37ee5a85`（与全部 8 轮发现落盘基线一致，代码无漂移）
- 复核对象: G2 组 38 条（HIGH 3 / MEDIUM 27 / LOW 8，来自 R1–R8）
- 复核方法: 先按条目 Grep/Read 定位 live code 独立判断问题存在性与严重度，再与发现结论对比输出判定；发现结论未作为事实来源
- 判定三值: 保留 / 降级（附新严重度+理由）/ 驳回（附理由）

---

## ① 复核概要

| 判定 | 条数                                 | 说明                               |
| ---- | ------------------------------------ | ---------------------------------- |
| 保留 | **38**（HIGH 3 / MEDIUM 27 / LOW 8） | 严重度分布与原判完全一致，零升降级 |
| 降级 | 0                                    | —                                  |
| 驳回 | 0                                    | —                                  |

- **证据-结论逻辑链**: 38 条全部通过。每条的证据片段均在 live code 中逐行核实存在且支撑结论；无"证据不能支撑结论"的驳回项。
- **证据精度修正 4 处**（不改变判定与严重度，仅修正条目内的技术细节，供修复阶段参考）:
  1. [G2-视角4-03]: "三形态 h-9/h-8/h-9" 中移动端触发钮实为 **h-8**（ui `Button` default size = `h-8`，button.tsx:24），非 h-9。实际不一致为：桌面可搜索 `ComboboxInput`（Input default h-9=36px）vs 桌面非可搜索 `ComboboxTrigger`（硬编码 h-8=32px）vs 移动触发钮（h-8）。**桌面可搜索/非可搜索并排 4px 高差的核心缺陷成立**，修复方向应改为"三形态统一到同一高度 token"。
  2. [G2-视角8-01]: `size="sm"` 实为 **h-7 + px-2.5**（28px，button.tsx:26），非条目所述 "h-8 + px-3"。`size="icon-sm"` = size-7（28px 方形）。二者高度相同，差异是**胶囊形（横向 padding、图标-only 内容）vs 方形**——行操作控件几何不一致的核心缺陷成立。
  3. [G2-R3-视角3-02]: 机制叙述有细节偏差——同步 effect 依赖数组不含 `presentation.interactive`，字段转 disabled 时 effect **不重跑**，编辑器停留在可编辑态（"未关闭"），而非字面上的"判不等后被重新打开"；当 value/readOnly 变化触发 effect 重跑时才发生主动 `setEditable(true)` 回写。**用户可见缺陷（disabled 后富文本仍可输入、无置灰、随提交持久化）与修复方向（同步条件改用合并口径 + 依赖补全）均成立**。
  4. [G2-R5-视角4-01]: 失效面比该条报告的**更宽**——复核发现 `FieldFrame` 的 `field-control` div（field-frame.tsx:262 `aria-invalid={showError || undefined}`）对**全部 wrap:true 字段**（input 全家族、date 族、markdown-editor、editor、全部复合字段）无差别注入且位于 DOM 前序，`querySelector('[aria-invalid="true"]')` 会先命中该不可聚焦 div；即该条声称"聚焦正常的 input 组"很可能同样失效（radio-group/checkbox-group/button-group-select/select 无 FieldFrame 包装，不受此层影响）。**缺陷本体成立、方向加重，MEDIUM 维持**；建议修复时按该条方案②的两段式查询 + 运行时断言确认全量失效面。
- **HIGH 3 条**: 全部逐项复核通过（见 ④），维持 HIGH。
- **去重**: 5 个"新实例/引根"条目的引根均核实存在、修复面互不覆盖（见 ③）；无 dedup §1 已修复项复述、§2 缺口表象混入、§3 误报模式、§4 边界违规。
- **scope-conflict**: 38 条中无一条带 `[scope-conflict]` 标记；ARIA/键盘类条目归属核验见 ⑤。

---

## ② 逐条复核清单（38 行全覆盖）

判定列：✅=保留（严重度不变）。

### Round 01（19 条）

| #   | 条目                                                    | 文件:行号（复核定位）                                                   | 原判   | 判定                | 复核理由（独立核实要点）                                                                                                                                                                                     |
| --- | ------------------------------------------------------- | ----------------------------------------------------------------------- | ------ | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | [G2-视角1-01] input-time 清除钮用文本 ✕                 | input-time-renderer.tsx:216-228                                         | MEDIUM | ✅ 保留             | :226 确为字面 `✕`；对照 input.tsx:195、textarea:160、date-range:414/430、period:255、select-mobile:182、date-field-control:364/380、picker:473 全部 `<XIcon>`，同语义双图标体系成立                          |
| 2   | [G2-视角3-01] transfer 全选 indeterminate 裸 data 属性  | transfer-renderer.tsx:369-378；ui/checkbox.tsx:18,28                    | MEDIUM | ✅ 保留             | :372 `data-indeterminate={boolean}`；React 对 data-\* 渲染 `="false"`；checkbox.tsx 样式/指示器均为 presence 匹配，`"false"` 命中 → 全选框恒呈半选外观；对照 checkbox-group:148 走 `indeterminate` prop 正确 |
| 3   | [G2-视角4-01] input-number suffix 与 stepper 重叠       | input-number-renderer.tsx:239-243,262-300                               | MEDIUM | ✅ 保留             | suffix right-3 与 stepper 容器 right-1(w-6) 锚定区间重叠；paddingRight 两次 spread 后者覆盖前者（:240-242）；`showStepper !== false` 默认开（:57）                                                           |
| 4   | [G2-视角4-02] checkbox-group max/min 静默               | checkbox-group-renderer.tsx:79-103,158-195                              | MEDIUM | ✅ 保留             | :80-88 静默 return；:161-163 `cappedDisabled` 无 tip（disabledTip 仅 optionDisabled）；无任何计数呈现                                                                                                        |
| 5   | [G2-视角4-03] select 三形态高度不一致                   | input-choice-renderers.tsx:379-401                                      | LOW    | ✅ 保留（证据修正） | 桌面 h-9（Input default）vs h-8（ComboboxTrigger :391 硬编码）成立；移动触发钮实为 h-8（Button default），条目"h-9"有误；核心不一致仍在，LOW 恰当                                                            |
| 6   | [G2-视角4-04] picker placeholder 无弱化+清除钮常驻      | picker-renderer.tsx:449-474                                             | LOW    | ✅ 保留             | :162/:168 placeholder 回退确认；trigger span 无 muted 切换；清除钮 `disabled` 而非不渲染（:469）；对照 input.tsx:278-279 有值才显示                                                                          |
| 7   | [G2-视角5-01] 上传 pending 无 Spinner                   | upload-field.tsx:536-574                                                | MEDIUM | ✅ 保留             | :546-551 纯文本；本仓 Spinner 基线核实（checkbox-group:136、select-mobile:217、detail-surface:96、tree-option-list:115）                                                                                     |
| 8   | [G2-视角5-02] 超限静默拒绝/截断                         | upload-field.tsx:314-356                                                | MEDIUM | ✅ 保留             | rejectFile 仅派发事件（:314-321）；maxFiles 截断完全静默（:353-356）；无条目级错误通道复用                                                                                                                   |
| 9   | [G2-视角5-03] form autoLoad 无 loading                  | form-load-action.ts:40-105；form.tsx:296-307,476-513                    | MEDIUM | ✅ 保留             | loadAction 全文无 loading 状态暴露；form.tsx 渲染面无 skeleton/spinner/禁用；:65 `setValues` 直接覆盖                                                                                                        |
| 10  | [G2-视角5-04] radio/checkbox-group 空态空白             | checkbox-group-renderer.tsx:117-201；input-choice-renderers.tsx:575-624 | LOW    | ✅ 保留             | 三个选型渲染器均无空态分支；对照 select `ComboboxEmpty`（:404）、input-table "No items"（:365-370）、picker Empty（picker-option-list:17-25）成立                                                            |
| 11  | [G2-视角6-01] 移动 select 多选 sheet 无确认             | select-mobile-renderer.tsx:187-259                                      | MEDIUM | ✅ 保留             | :192 `showCloseButton={false}`；sheet 全文无确认/完成钮；toggleMobileOption 仅单选 `setSheetOpen(false)`（input-choice-renderers:247-250），多选保持打开                                                     |
| 12  | [G2-视角6-02] picker 取消钮 ghost                       | picker-dropdown.tsx:68-81                                               | MEDIUM | ✅ 保留             | :69 `variant="ghost" size="sm"`；同包 detail-surface.tsx:87 取消钮 `variant="outline"`，双规范并存成立                                                                                                       |
| 13  | [G2-视角7-01] 搜索高亮硬编码黄                          | select-combobox-lists.tsx:16-33                                         | LOW    | ✅ 保留             | :26 逐字确认；两包全量调色板类 grep 仅此一处                                                                                                                                                                 |
| 14  | [G2-视角8-01] array-editor/key-value 行操作钮 size="sm" | array-editor.tsx:144-192；key-value.tsx:207-255                         | LOW    | ✅ 保留（证据修正） | size="sm"（h-7 px-2.5）放图标-only vs combo:182/193/207、input-table `icon-sm` 方形；胶囊 vs 方形不一致成立，数值描述有误（h-7 px-2.5 而非 h-8 px-3）                                                        |
| 15  | [G2-视角9-01] picker 多选 listbox 空壳                  | picker-option-list.tsx:27-54                                            | MEDIUM | ✅ 保留             | :30 `role="listbox"`，:34-49 行内无任何 `role="option"`/`aria-selected`；对照 icon-picker 修复后 `role="option"`（icon-picker.tsx:230）成立，属 ma5-ux [视角3-02] 同类新实例（不同组件，允许报）             |
| 16  | [G2-视角9-02] 四控件校验文案硬编码英文                  | combo:613-614；input-table:466-467；transfer:487；picker:552            | MEDIUM | ✅ 保留             | 四处英文模板串逐字确认                                                                                                                                                                                       |
| 17  | [G2-视角9-03] array-editor/key-value i18n 硬编码        | array-editor.tsx:82,102-103,150,182；key-value.tsx:213,229,246          | MEDIUM | ✅ 保留             | `Item ${index+1}` placeholder 用户可见；:182 中英混排；对照 combo:185 `t('flux.form.moveUp',{defaultValue})` 正确示范                                                                                        |
| 18  | [G2-视角10-01] array-field Add 缺 PlusIcon              | composite-field/array-field.tsx:546-550                                 | MEDIUM | ✅ 保留             | :547-549 纯文本；array-editor:594 / key-value:622 / combo:564 / input-table:413 均有 `<PlusIcon>`（grep 全量核实），引根 ma5-ux [视角1-01] 存在且修复面不同组件                                              |
| 19  | [G2-视角10-02] array-field 移除纯文本                   | composite-field/array-field.tsx:153-164                                 | LOW    | ✅ 保留             | :153-164 ghost+文本无图标；对照 combo:204-216 ghost icon-sm+Trash2Icon+hover:text-destructive                                                                                                                |

### Round 02（8 条）

| #   | 条目                                                                     | 文件:行号（复核定位）                                                               | 原判     | 判定             | 复核理由                                                                                                                                                                                 |
| --- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- | -------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 20  | **[G2-R2-视角3-01] input-time steppers 完全不接 disabled/readOnly 门禁** | input-time-renderer.tsx:142-189；stepper-button.tsx:11-25；field-handlers.tsx:87-91 | **HIGH** | ✅ **保留 HIGH** | 详见 ④-A                                                                                                                                                                                 |
| 21  | [G2-R2-视角4-01] select 移动多选沿用圆形指示器                           | select-mobile-renderer.tsx:30-84                                                    | MEDIUM   | ✅ 保留          | :75 恒 `rounded-full`；ctx.multiple 传入未消费；对照 tree-option-list:122-131 multiple→方块 Checkbox，同包双语言成立                                                                     |
| 22  | [G2-R2-视角4-02] composite 家族 maxItems 静默禁用                        | array-editor:569；combo:330,560；input-table:149,409                                | MEDIUM   | ✅ 保留          | 三处 `disabled={...atMaxItems}` 均无 tip/计数；transfer 计数对照（:380-382）成立；key-value:412/600 同型残留已在 R7 弃报留档并入同批                                                     |
| 23  | [G2-R2-视角5-01] 单选上传在飞覆盖                                        | upload-field.tsx:350-356,267-273                                                    | MEDIUM   | ✅ 保留          | :352 `setItems([])` 不 abort（abort 仅卸载路径）；:267 单选 `[item]` 整值覆盖；后完成者写值 → UI（B）与提交值（A）错配链路成立                                                           |
| 24  | [G2-R2-视角6-01] tree-select 选中后无关闭路径                            | tree-controls.tsx:394-416,435-454                                                   | MEDIUM   | ✅ 保留          | 桌面 Popover 无受控 open；`setSheetOpen(false)` 全文仅经 `onOpenChange`（grep 核实，无选中关闭）；移动 sheet `showCloseButton={false}` 且无确认钮；与 #11 同病成立（独立组件，允许并列） |
| 25  | [G2-R2-视角5-02] 失败条目永久滞留                                        | upload-field.tsx:532-574,578-589                                                    | LOW      | ✅ 保留          | error 分支仅红字无操作（:564-571）；清空钮 `existing.length > 0 && interactive`（:578）——只失败无成功时错误行不可移除，闭环缺失成立                                                      |
| 26  | [G2-R2-视角8-01] 步进点击目标 20px/16px                                  | stepper-button.tsx:16-22；input-number-renderer.tsx:267-299                         | LOW      | ✅ 保留          | `size-5 p-0` 覆盖 icon-xs(24px)→20px；input-number `h-4`(16px)；低于 dedup §3-4 豁免下限（24px），非误报模式                                                                             |
| 27  | [G2-R2-视角10-01] 两套富文本工具栏规范                                   | markdown-editor-renderer.tsx:236-248；editor-renderer.tsx:409-434                   | LOW      | ✅ 保留          | md: outline+size-8(32px)；editor: ghost+手写 border+h-7(28px)；同语义工具栏双规格成立；aria-pressed 差异（插入式 vs 持久态）合理性已被条目自认，判 LOW 恰当                              |

### Round 03（3 条）

| #   | 条目                                                 | 文件:行号（复核定位）                                  | 原判     | 判定                | 复核理由                                                                                                                                                                                     |
| --- | ---------------------------------------------------- | ------------------------------------------------------ | -------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 28  | **[G2-R3-视角3-01] period 快捷钮不接 disabled 门禁** | period-renderers.tsx:230-244；field-handlers.tsx:87-91 | **HIGH** | ✅ **保留 HIGH**    | 详见 ④-B                                                                                                                                                                                     |
| 29  | [G2-R3-视角3-02] editor disabled 同步漏算            | editor-renderer.tsx:256,293,328-334,392,395            | MEDIUM   | ✅ 保留（机制修正） | :256 合并口径 / :332-334 仅 readOnly 双口径确认；缺陷真实（disabled 迁移后 contenteditable 保持可输入、无置灰），机制细节修正见 ①；data-readonly(:392)/工具栏门控(:395) 用合并口径的对照成立 |
| 30  | [G2-R3-视角4-01] editor 链接动作三重缺陷             | editor-renderer.tsx:108-122                            | MEDIUM   | ✅ 保留             | :114-122 逐字确认：dismiss→unsetLink（取消即破坏）、window.prompt、非白名单静默忽略；三重叠加 MEDIUM 恰当（破坏可经 undo 找回，未达 HIGH）                                                   |

### Round 04（3 条）

| #   | 条目                                                 | 文件:行号（复核定位）                                 | 原判   | 判定    | 复核理由                                                                                                                                                                                                                                        |
| --- | ---------------------------------------------------- | ----------------------------------------------------- | ------ | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 31  | [G2-R4-视角3-01] upload 完成写入/取消钮不接 disabled | upload-field.tsx:248-279,552-562；对照 :469,:516,:578 | MEDIUM | ✅ 保留 | 完成路径仅查 mountedRef/aborted（:248-254）后 commitItems（:273）；同步通道三门禁（:469/:516/:578）与异步通道缺失对照成立；取消钮无 disabled（:552-562）。与 HIGH 两条的区分（无用户主动点击绕过、写入源为用户先前发起的任务）成立，MEDIUM 恰当 |
| 32  | [G2-R4-视角5-01] editor 聚焦窗口外部值丢弃           | editor-renderer.tsx:326-352,298-309                   | MEDIUM | ✅ 保留 | :338-340 `isFocused` 直接 return 无暂存；deps（:352）不含焦点，失焦不重跑；:307-308 后续击键以陈旧内容回写——静默数据丢失链路完整                                                                                                                |
| 33  | [G2-R4-视角5-02] maxFiles 余量不含在飞               | upload-field.tsx:350-368,209-211,267                  | MEDIUM | ✅ 保留 | :354 基数=committedItems（仅已提交）；pending 不占额；:267 完成追加不复查——并发窗口上限失效成立                                                                                                                                                 |

### Round 05（2 条）

| #   | 条目                                                      | 文件:行号（复核定位）                                                                                                                       | 原判   | 判定                  | 复核理由                                                                                                                                                                                                                                                                             |
| --- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------ | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 34  | [G2-R5-视角4-01] 聚焦首错辅助对容器型 aria-invalid 失效   | form.tsx:332-343；input-choice-renderers.tsx:596,609-613；button-group-select:100-123；field-frame.tsx:196,257-263；ui/radio-group.tsx:6-16 | MEDIUM | ✅ 保留（失效面修正） | form.tsx querySelector+focus 确认；RadioGroup/ButtonGroup 容器带 aria-invalid、可聚焦子项不带（ui RadioGroupItem 的 aria-invalid 样式闲置确认）；FieldFrame field-control div 注入确认，且复核发现该 div 覆盖全部 wrap:true 字段——**失效面比原报告更宽**（见 ①-4），缺陷加重而非削弱 |
| 35  | [G2-R5-视角4-02] 折叠 fieldset 内字段照常校验且错误不可见 | fieldset.tsx:33-37,83-92；node-renderer-resolved.tsx:407-420；form-runtime-submit-flow.ts:166-185                                           | MEDIUM | ✅ 保留               | 折叠=display:none+keepMounted（:33-37,:85）；hidden 判定只认 visible/hidden（:407），折叠态不在内；hiddenFields 过滤仅消费 notifyFieldHidden（:166-185）——第三隐藏形态漏网成立；提交静默拦截+错误不可见+focus/scroll no-op 链路完整                                                  |

### Round 06（1 条）

| #   | 条目                                           | 文件:行号（复核定位）                                                                                                                           | 原判     | 判定             | 复核理由 |
| --- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ---------------- | -------- |
| 36  | **[G2-R6-视角6-01] detail 草稿弹层无脏态守卫** | detail-view.tsx:516-518,547-574；detail-field.tsx:347-355；detail-surface.tsx:118-171；detail-draft-controller.ts:132-145；ui/dialog.tsx:49,121 | **HIGH** | ✅ **保留 HIGH** | 详见 ④-C |

### Round 07（2 条）

| #   | 条目                                                     | 文件:行号（复核定位）                                    | 原判   | 判定    | 复核理由                                                                                                                                                                                                                                                                                  |
| --- | -------------------------------------------------------- | -------------------------------------------------------- | ------ | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 37  | [G2-R7-视角9-01] icon-picker 200+ Tab 停留点、无键盘漫游 | icon-picker.tsx:213-244；对照 tree-option-list.tsx:89-91 | MEDIUM | ✅ 保留 | 容器 role="listbox"（:215）+ 200 个独立可聚焦 Button role="option"（:227-241），无 roving/onKeyDown/activedescendant；同包 roving 基线（tree-option-list :89-91 `tabIndex={focused?0:-1}`+onKeyDown）确认；ma5-ux 两项修复（语义/焦点环）在位、根因不同，引根 [G4-R3-视角9-01] 成立       |
| 38  | [G2-R7-视角4-01] condition-group addGroup 通道绕过上限   | condition-group.tsx:161-168,186,411-437                  | MEDIUM | ✅ 保留 | handleAddGroup 无检查（:161-168）；atMaxItems 按 children 计（分组亦为 children，:186/:201-223 嵌套渲染确认）；addCondition 达上限隐藏（:413）而 addGroup 仅 `canNest`（:426）——同计数双钮行为矛盾+上限静默突破成立；与 R2-4-02（反馈缺失）/R4-5-02（异步计数）根因确实不同，修复互不覆盖 |

### Round 08（0 条）

零发现轮，无复核对象。其 6 项弃报留档（input-number 受控键入中间态等）经抽查定性合理（第 1 项"静态不可定案"判断成立——React 受控 number input 中间态确需运行时取证）。

---

## ③ 去重记录

**引根/新实例条目核验（5 个，全部通过）**：

| 条目             | 引根                                                                | 引根存在性                                                    | 修复面互不覆盖                                                                |
| ---------------- | ------------------------------------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| [G2-视角10-01]   | ma5-ux [视角1-01]（array-editor/key-value Add 缺 PlusIcon，已修复） | ✅ array-editor:594、key-value:622 均有 PlusIcon              | ✅ 引根组件已修复，本条是 array-field 独立组件                                |
| [G2-R3-视角3-01] | [G2-R2-视角3-01]（input-time steppers）                             | ✅ 保留条目 #20                                               | ✅ input-time steppers 分支 vs period-renderers 快捷钮，不同文件不同修复点    |
| [G2-R4-视角3-01] | disabled 门禁族（#20/#28/#29）                                      | ✅                                                            | ✅ 前三条为同步控件/状态同步，本条为异步完成回调写入，upload-field 独立修复点 |
| [G2-R7-视角9-01] | [G4-R3-视角9-01]（calendar gridcell Tab 淹没）                      | 引根属他组，本组核实其存在性以 R4 文本 + icon-picker 现状为据 | ✅ calendar scheduling 包 vs icon-picker form-advanced 包                     |
| [G2-R7-视角4-01] | [G2-R2-视角4-02]（上限反馈缺失）+ [G2-R4-视角5-02]（异步计数基准）  | ✅ 均为保留条目 #22/#33                                       | ✅ 彼加计数提示/修并发基数，本条补 addGroup 渲染门禁+handler 防御             |

**dedup-baseline §1–§4 核验**：

- §1（ma5-ux 已修复 6 条）：38 条无一直接复述。涉 icon-picker 的 #37 与已修复的 [视角3-01]/[视角3-02] 根因不同（键盘漫游模型 vs focus ring vs 语义声明），且修复后在位状态已核实（icon-picker.tsx:215/:230/:227 ghost Button）。涉 i18n/Add 按钮的 #16/#17/#18 均为"同类根因新实例"且引根不同组件——§1 明示允许。
- §2（16 项登记缺口）：无表象混入。重点核查 #37 vs G-B2（键盘导航框架）：G-B2 指 chord/peek/多选/重排的**应用级框架**，单组件 listbox 的 roving/activedescendant 属 ARIA APG 组件级模式且同包 tree-option-list 已实现（非能力缺失），界线成立。
- §3（8 条误报对照）：无踩线。重点核查 #26（步进 16-20px）：报的是**低于豁免下限**的尺寸，非豁免的 icon-xs(24px) 本身；#12（picker 取消 ghost）：报的是**对话框 footer 主次对**场景，非 §3-3 豁免的"行级/次要操作 ghost"；#9/#11 无 opacity-0 trigger / ml-auto / 截断类误报。
- §4（维度 09-12、全量 WCAG）：38 条均以用户可见视觉/交互为准，无 RendererComponentProps 契约、marker 样式、原生 HTML 替代、field metadata 建模类条目；ARIA 类条目（#15/#34/#37）仅涉键盘/读屏用户任务完成的 UX 面（见 ⑤）。

**轮内/轮间去重抽查**：R3 去重备忘 2 项（select-mobile 孤儿 option、condition-group 隐藏分支）与 R2 去重备忘 4 处均为"并入既有条目修复批次"的登记，未计入 38 条，处置正确；R6/R7/R8 弃报留档 15+7+6 项抽查（tag-list 空态、key-value maxItems、date-range presets 门禁不可达、input-table aria-label）定性合理，无应立未立。

---

## ④ 高风险逐项复核详情（HIGH 3 条）

### A. [G2-R2-视角3-01] input-time steppers 不接 disabled/readOnly 门禁 — **保留 HIGH**

**复核过程**：

1. 独立读 `input-time-renderer.tsx` 全文：非 stepper 分支 `<Input>` 正确传 `disabled={presentation.effectiveDisabled}`（:203）、`readOnly`（:204）；`steppers === true` 分支（:142-189）返回的 4 个 `StepperButton`（时/分 ±）**无任何 disabled 透传、无 `presentation.interactive` 守卫**。
2. 读 `stepper-button.tsx` 全文：props 仅 `direction/label/onClick/testid`，组件**不接受 disabled prop**（:4-9），内部 ui Button 无 disabled（:14-22）。
3. 追写入链：`stepHourUp/stepMinuteUp → stepField → commitDate → handlers.onChange`（:97-99,:123-140），途中无任何拦截。
4. 读 handler 层 `field-handlers.tsx`：`createFieldHandlers.onChange` 仅拦 `readOnly`（:88-90），disabled 直通 `setValue → currentForm.setValue`（:200-225）——disabled 通道在框架层也无兜底。
5. 对照核实：`input-number-renderer.tsx` 同为步进控件却有双层门禁——按钮 `disabled={!presentation.interactive}`（:276,:291）+ `commitStep` 入口守卫（:124-127），证明"steppers 形态必须有门禁"是本包既有契约，input-time 是漏网。
6. 严重度独立判定：禁用（无权限/只读）字段呈现 4 个外观正常、可点击即改值的按钮，改值随提交持久化且对用户零提示——属"权限边界在 UI 层被无声击穿"的功能缺陷，符合判级表 HIGH（用户交互障碍/静默数据变更）；与 G1 disabled 锚点 HIGH 先例一致。配置面（`steppers: true` + disabled）虽窄，但缺陷是"锁定语义完全失效"而非"体验瑕疵"，且降级判据（"极低频路径"）不适用于权限绕过类缺陷——**维持 HIGH**。

**结论**：证据链完整（组件、链路、handler、对照四面均核实），HIGH 恰当。

### B. [G2-R3-视角3-01] period 快捷钮不接 disabled 门禁 — **保留 HIGH**

**复核过程**：

1. 独立读 `period-renderers.tsx`：快捷按钮渲染（:232-243）**无 disabled、无 interactive 判定**，onClick 直达 `applyShortcut`；同一组件内清除按钮正确消费 `interactive`（:246 `clearable && hasValue && interactive`），输入控件经 PeriodPicker 传 `interactive`（:181,:200,:220）——门禁是本组件既有契约，唯独快捷钮漏接。
2. 追写入链：`applyShortcut → commitSingle/commitRange → handlers.onChange`（:120-149），handler 层仅拦 readOnly（field-handlers.tsx:88-90，已核实），disabled 放行写入表单状态。
3. 与 #20 的关系核验：组件不同（input-time vs period 三个渲染器）、绕过面不同（steppers vs shortcuts）、修复点独立——同根因新实例成立，不构成重复。
4. 严重度独立判定：灰显锁定字段被静默改写并随提交持久化，同 #20 的权限击穿性质；快捷区间是 period 字段的常规配置面，触发门槛低于 steppers——**维持 HIGH**。

**结论**：证据链完整，HIGH 恰当；修复建议（disabled 透传 + applyShortcut 入口守卫，对齐 input-number 双层模式）与 #20 同批验收为宜。

### C. [G2-R6-视角6-01] detail 草稿弹层无脏态守卫 — **保留 HIGH**

**复核过程**：

1. 读 `detail-view.tsx` 关闭接线：`handleCancel() { closeDraft(); }`（:516-518）；`DetailSurface onClose={handleCancel}`（:555）+ footer Cancel 亦走 handleCancel（:561）——弹层全部关闭请求汇入同一直达销毁的入口。
2. 读 `detail-surface.tsx` 全文：Dialog `onOpenChange={(next) => { if (!next) props.onClose(); }}`（:157-160）与 Drawer（:126-128）**无条件转发关闭**，受控 open 形同虚设；未传 `closeOnOutsideClick`，未做脏态拦截；ESC 关闭为 Base UI 原语默认。detail-field.tsx 同接线（:347-355，onClose={handleCancel}）。
3. 读 ui 原语默认值：`dialog.tsx` Dialog `closeOnOutsideClick = true`（:49）、DialogContent `showCloseButton = true`（:121）——遮罩点击与右上角 X 两条默认通道均开启。
4. 读 `detail-draft-controller.ts` closeDraft（:132-145）：`setOpen(false)` + `draftFormRef.current?.dispose()` + `assignDraftForm(undefined)`——草稿表单运行时直接销毁，用户输入不可恢复。
5. 脏态能力核验：`readDetailDraftValues`（controller :54）与 `buildDetailDraftInitialValues`（:39）均在位，但仅用于 confirm 链路与 revalidation，**关闭路径零比对**（grep 全包核实无 dirty check）。
6. 严重度独立判定：detail-view/detail-field 的唯一用途即"弹层内多字段编辑草稿"，多字段输入 + ESC/误点遮罩/X 钮是正常高频组合；三条通道无提示、无确认、不可恢复销毁——符合判级表 HIGH（数据丢失风险、破坏性操作无确认），且组件自身以 Cancel/Confirm 双钮表达了"放弃需显式操作"的语义，通道绕过与之自相矛盾。R4 对 dispose 链的"竞态正确"结论仅涉并发面，与本条关闭语义面不重叠，不构成重复——**维持 HIGH**。

**结论**：五层证据（组件接线、surface 透传、ui 默认值、dispose 实现、脏态能力未用）全部核实，HIGH 恰当；修复建议三步（closeOnOutsideClick={false} 接线 / onOpenChange 脏态比对 / X 钮同守卫）均为现成能力接线，可行。

---

## ⑤ scope-conflict 裁定

- **38 条中无一条标注 `[scope-conflict]`**。
- ARIA/键盘类条目归属核验（按主要影响裁定）：
  - **#15 [G2-视角9-01]**（picker listbox 空壳）、**#34 [G2-R5-视角4-01]**（聚焦首错失效）、**#37 [G2-R7-视角9-01]**（icon-picker 键盘漫游）：主要影响均为键盘/读屏用户**能否完成选择、能否感知校验结果、能否有效巡航**的任务完成面（视角 9 明确界定的 UX 可见部分），非 WCAG 合规度量（维度 20），不涉 aria 属性全量审计——**归属 G2 恰当，无需改派**。
  - #37 的键盘模型 vs 视角 9 语义声明的边界已由 R7 自查并在本复核 ③ 确认。
- 其余 35 条均为视觉/交互/反馈/数据安全问题，无边界两可情形。

---

## ⑥ 降级/驳回模式复盘

本轮**零降级、零驳回**，无模式可提炼。为后续复核留档三类"保留但修正"的处理先例：

1. **证据数值微误不驳回**（#5 高度数值、#14 尺寸数值）：核心缺陷（并排高差/胶囊 vs 方形）经独立几何核算成立，仅条目内 token 数值有误——以"保留+证据修正"处理，修正内容已写入 ② 判定理由，供修复阶段直接采用正确数值。
2. **机制叙述偏差不驳回**（#29）：用户可见缺陷与修复方向均成立，仅中间态成因描述不精确（effect 不重跑 vs 主动回写）——修正机制描述，判定不变。
3. **失效面与报告不符但方向加重不降级**（#34）：发现矩阵低估了缺陷范围（field-control div 全 wrap 字段注入），缺陷本体与建议修复方案反而更必要——保留原级并在 ①/② 中标注"运行时断言确认全量失效面"的追加验证要求。

**总体结论**：G2 组 38 条（HIGH 3 / MEDIUM 27 / LOW 8）全部通过独立复核，判定 **38 保留 / 0 降级 / 0 驳回**；证据质量、行业惯例引用、真实用户影响检验、修复建议可落地性均达标。HIGH 3 条的"disabled/关闭语义门禁缺失"族证据链尤其扎实，建议修复阶段按 ④ 中批次建议（#20+#28 同批、#36 独立批）推进。
