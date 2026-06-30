# B4.2 date/tree/file 生命周期与边界契约

> Plan Status: completed
> Last Reviewed: 2026-06-26
> Source: `docs/components/amis-bug-driven-improvement-roadmap.md`（Wave B4，工作项 B4.2，P0 锚点），`docs/components/amis-bug-driven-improvements/06-date-fields.md`（D1/D2/D4/D9/D12 + D5/D6/D7），`docs/components/amis-bug-driven-improvements/07-input-tree.md`（TR1-TR6，TR7 DESIGN-ACK-NOT-IMPL），`docs/components/amis-bug-driven-improvements/08-input-file-and-image.md`（U1-U6），`docs/components/input-date/design.md`，`docs/components/date-range/design.md`，`docs/components/input-tree/design.md`，`docs/components/input-file/design.md`
> Mission: amis-bug-driven-improvements
> Work Item: B4.2 date/tree/file 生命周期与边界契约
> Related: 本工作项无前置依赖（roadmap Phases 表 Dependencies: —；Dependency Graph 的 B41→B42 在 Phases 表为 — 时以表为准，故 B4.2 独立）。successor B5.2（tabs/dynamic/chart）依赖 B4.1+B6.1，不依赖 B4.2。

## Purpose

把 roadmap 工作项 B4.2 收口。逐条对照 live repo 裁定并落地 date（8 条：D1/D2/D4/D5/D6/D7/D9/D12）、tree（6 条：TR1-TR6）、file（6 条：U1-U6）共 20 条 in-scope signal。三类工作交织：

- **确认 live 缺陷（必须 Fix，failing-test 先行）**：
  - **D6（range `required` 仅设一端即通过，P1）**——range 值是单 delimited 字符串，`commitRange(start, undefined)` 写 `'2024-06-01,'`（`date-range-renderer.tsx:148-152`），`required` 用 `isEmptyValue`（`validators.ts:36-38,123-125`）判非空 → 一端为空仍通过。须 Fix（range-aware required 校验 OR 归一化）。
  - **D9（input-datetime 时间框 typing 绕过 min/max，P1）**——calendar pick 路径经 disabled matcher 约束（`date-range-renderer.tsx:115`/`date-field-control.tsx:99`），但 `handleTimeChange`（`date-field-control.tsx:141-152`）仅 clamp digit 到 0..23/0..59 后 `commitDate(base)`，**无** `isWithinRange` 检查 → typing 时间使 datetime 越界 `[minDate,maxDate]` 不受检。（对照 `input-time-renderer.tsx:85-95` 有 clamp。）须 Fix。
- **特征缺口（Feature Gap，需裁定）**：
  - **U1（upload lifecycle 状态机，P0）**——本地 `pending|error|done` 状态机存在（`upload-schemas.ts:74-77`，**无** 独立 `uploading`——pending 兼任），transition + `onUploadSuccess`/`onUploadError` 存在（`upload-field.tsx:222-247`），但**无**文档化 lifecycle 契约 + **无** `onChange`-at-pending form 事件（form 值刻意 success 才写）。须裁定：文档化契约 + 是否加独立 `uploading` 状态（推荐 doc-only，pending 兼任 by design）。
  - **U5（deleteAction action-ref，P1）**——移除纯本地（`upload-field.tsx:288-291` filter），**无** backend 通知，schema 无 `deleteAction`（`upload-schemas.ts:29-39`），无 `onDeleteSuccess/Error`（grep 零）。须裁定：实现 deleteAction（镜像 `uploadAction` 桥接，用户点击驱动 pattern #3）OR 显式 non-goal doc。
  - **U6（maxSize 客户端拒绝，P1）**——**无** `maxSize` 字段，`handleFiles`（`upload-field.tsx:253-286`）无 JS 级 size/accept 校验（`accept` 仅透传 native `<input>`），无 `onReject`。须裁定：实现 maxSize + onReject OR non-goal doc。
- **TEST-GAP / DOC-GAP（实现正确，补聚焦锚 + doc）**：D1/D2/D4（format/tz/bound 正确，doc 缺语义契约）、D7（无 leak via immediate-commit，confirm-step absent 是设计差异）、D12（无 doubling，正确）、TR1（空 children 为叶，正确）、TR3（cascade 无重复 parent，正确）、TR4（lazy echo 经 re-render，indeterminate 已测、echo 未测）、TR5（option 不可变，正确）、TR6（valueField remap，正确）、U2（onUploadError 带 server msg，正确但测试刻意跳过断言）、U3（multiple append，正确）、U4（merge existing，正确）。
- **已充分覆盖**：D5（start≤end 经 auto-swap，已测）、TR2（cascade LOCK 全 4 行为已测 + 文档化）。

## Current Baseline

> 来源：2026-06-26 独立 explore 子 agent 对 `packages/flux-renderers-form/src/renderers/`（input-date/date-range/input-datetime/input-tree/input-file）、`date/date-utils.ts`、`date-field-control.tsx`、`packages/flux-renderers-form-advanced/src/`（tree-options/upload-field/upload-schemas）、`packages/flux-runtime/src/validation/validators.ts`、owner doc 的 live-repo 审计。下列 file:line 引用均已核对。

### Date 现状

- **D1（valueFormat vs displayFormat 分离，P0）— TEST-GAP（正确）+ DOC-GAP。** commit 经 `valueFormat`（`date-field-control.tsx:122` `formatDate(toStorageDate(next, utc), valueFormat, options)`），display 经 `displayFormat`（`:98` `formatDate(selected, displayFormat)`，无 options），`selected` 以 `valueFormat` 解析（`:97`）→ 两路解耦。date-range（`date-range-renderer.tsx:59-66,135-136,144`）/input-datetime（`:10-17`）同。**无** 合并 invariant 测试（`input-date.test.tsx:65-79` 仅 display、`:81-103` 仅 commit 且默认 format 相同）。注：token grammar 仅 `YYYY/YY/MM/DD/HH/mm/ss`（`date-utils.ts:40`），amis `valueFormat:"X"`（unix）不可表示。`input-date/design.md` §4 列两字段但**未**声明语义契约。
- **D2（utc 仅影响 commit，P1）— TEST-GAP（正确）+ DOC-GAP。** commit 经 UTC bridge（`date-field-control.tsx:122` `toStorageDate(next, utc)`+`{utc}`），display 故意省 utc option → 本地分量（`:98`），picker 经 `toCalendarDate` 操作本地 wall-clock（`:97`），bridge helpers `date-utils.ts:401-440`。**无** split 测试（`input-date.test.tsx:127-138` 查 utc round-trip 显示但不断言 split）。`input-date/design.md` §4 列 `utc` 但**未**声明「仅影响 commit，display/picker 留本地」。
- **D4（range 一端不变异另一端时间分量，P0）— TEST-GAP（正确）。** `date-range-renderer.tsx:161-177` `setTimeOn`：设 start 时 `commitRange(base, endDate)`（endDate 透传不变）、设 end 时 `commitRange(startDate, base)`（startDate 不变）；`commitRange` 调 `normalizeRange` 可能 swap 但**不**清零时间分量（`date-utils.ts:327-341`）。**无** datetime-range bound-independence 测试（`date-range.test.tsx:235-262` 设两端 native time 但不断言「设 end→start 存活」）。
- **D5（start≤end 保证，P0）— ALREADY-COVERED。** auto-swap（`date-range-renderer.tsx:147` `normalizeRange` 于 `commitRange :143-153`；读时 swap `:95-97`）。测试 `date-range.test.tsx:149-173`（pick end 早于 start→swap）、`:139-147`（反向存储归一）；`date-utils.test.ts:149-162` 直测 `normalizeRange`。
- **D6（range required 验两端，P1）— CONFIRMED-LIVE-DEFECT。** range 值单 delimited 字符串；`commitRange(start, undefined)`→`joinDateRange`=`'2024-06-01,'`（`date-range-renderer.tsx:148-152`）。`required` 用 `isEmptyValue`（`validators.ts:36-38,123-125`：`==null||===''||(Array&&length===0)`）→ `'2024-06-01,'` 非空 → **通过**，即便 end 空。**无** range-aware 两端校验注册。**无**测试。`date-range/design.md` 未提 required-both-bounds。
- **D7（pending 仅 confirm 后提交，P1）— TEST-GAP（无 leak via immediate-commit；confirm-step absent 是设计差异）。** 每次选择/时间变更立即 `commitRange`→`handlers.onChange`（`date-range-renderer.tsx:155-159,161-177`），**无** pending/preview state、**无** confirm 按钮 → 描述的 leak（previewed-but-uncommitted）**不可发生**（显示=已提交值，选择同步写值）。`date-range/design.md` §7 提「临时起止选择态属字段内部交互状态」但**未**定义 confirm-vs-commit 语义。
- **D9（min/max 跨所有 entry path，P1）— CONFIRMED-LIVE-DEFECT。** calendar pick 路径经 disabled matcher 约束（`date-range-renderer.tsx:115`/`date-field-control.tsx:99`）；time-typing `handleTimeChange`（`date-field-control.tsx:141-152`）仅 `clamp(Number(raw),0,23/59)` 后 `commitDate(base)`，**无** `isWithinRange` → input-datetime typing 时间使 datetime 越界不受检。（对照 `input-time-renderer.tsx:85-95` 有 `isWithinRange` clamp minTime/maxTime——缺口特定于 datetime time sub-field。）比较方向本身正确（`date-utils.ts:271-287`）。**无**测试。`input-date/design.md` §4 列 minDate/maxDate 但**未**声明跨 entry path。
- **D12（time sub-field typing 无 doubling，P1）— TEST-GAP（正确）。** `handleTimeChange`（`date-field-control.tsx:141-152`）读 `event.target.value`（整个 `<input type="number">` 值）+ clamp，input controlled `value={String(hour)}`（`:218,:230`）派生自 committed Date → typing `1`→`14` 得 14，非 `1→11`。**无** digit-by-digit 测试（`input-datetime.test.tsx:86-110` 用单次 `fireEvent.change({value:'08'})`）。

### Tree 现状

- **TR1（空 children[] 为叶，P0）— TEST-GAP（正确，incidental 覆盖）+ DOC-GAP。** `tree-options.ts:71-85` `buildTreeOptionMeta`：`rawChildren = toTreeOptionArray(getIn(node, childrenKey))`、`hasRawChildren = rawChildren.length > 0` → 空数组得 `false`→叶（`children:[]`、无 `deferChildren`），叶 checkbox 可选（`:141-166`）。incidental：`tree-values.test.tsx:193,228` 用 `children:[]` 成功选中；`tree-structure.test.tsx:246`。**无** 显式「空数组→叶→可选」断言。`input-tree/design.md` §4 **未**声明空数组为叶。
- **TR2（cascade 契约稳定 LOCK，P0）— ALREADY-COVERED。** `cascade` 仅 multi/checkbox（`tree-control-controllers.ts:371` `cascadeEnabled = Boolean(cascade && multiple)`）；down-propagate `tree-options.ts:222-236`、up-derive incl. indeterminate `:248-271`。测试 `tree-cascade.test.tsx` 全 4 子行为（`:181-232` check-parent-checks-descendants、`:234-274` partial→indeterminate、`:450-489` radio 忽略、`:408-448` cascade-off-default）。`input-tree/design.md:73-87` cascade 语义全面文档化。
- **TR3（cascade 写无重复 parent，P1）— TEST-GAP（正确）。** `cascadeSelectParent`（`tree-options.ts:229-235`）`if (!includesValue(next, candidate)) next.push(candidate)` 去重；`cascadeDeselectParent`（`:243-246`）filter 整组。**无** 反复 toggle 无重复测试。`input-tree/design.md:87` 文档化「仅真翻转值进入数组」。
- **TR4（lazy-init echo race，P1）— TEST-GAP（经 re-render 成立；indeterminate 已测、echo 未测）。** `useTreeLazyChildren` 到达后 immutable merge（`tree-control-controllers.ts:194-240`、`mergeChildOptions` `tree-options.ts:307-347`），form value 数组留 scope，`deriveCheckedState`/`isTreeSelectionChecked` 每渲染对新 option tree 重算 → 初始值引用 deferred 子节点在 children 加载后解析（无 flake reattempt）。测试 `tree-lazy-children.test.tsx:185-236`（seed `data:{tree:['leaf-1']}`→父 mixed after load）覆盖 indeterminate 重算，**未**断言 deferred 子节点本身渲染为 checked + 无 determinism/anti-flake 断言。`input-tree/design.md:137` 覆盖「子到达后 deriveCheckedState 重算」但**未**显式声明 init-value 解析等待/重算 childrenSource。
- **TR5（option 不可变，P1）— TEST-GAP（正确）。** `tree-options.ts` `buildTreeOptionMeta`（`:55-98`）spread 建 meta、`getIn` 只读、不写 `input.node`；`mergeChildOptions`（`:307-347`）`.map()`+`{...entry,children}` 结构共享、`deferChildren` 清在 meta 非 source；cascade helper 返新数组。**无** `Object.freeze()` 测试。
- **TR6（valueField remap，P2）— TEST-GAP（正确）。** `getTreeOptionConfig`（`tree-options.ts:45-53`）解析 `valueField`（默认 `'value'`）、`:65` `getIn(input.node, config.valueField)`、`:63` labelField → `valueField:'code'` 一致解析 build/flatten/cascade。**无** `valueField:'code'` 测试。`input-tree/design.md` §2/§4 列为已实现字段。

### File 现状

- **U1（upload lifecycle 状态机，P0）— FEATURE-GAP（部分）。** 本地 `UploadItemState = pending|error|done`（`upload-schemas.ts:74-77`，**无独立 uploading**——pending 兼任，「Uploading」label 显于 pending `upload-field.tsx:410`）。transition：pending add `:266-271`（upload 前）、done `:222`、error `:239`。事件：`onUploadSuccess` `:226-230`、`onUploadError` `:243-247`；form `onChange`（`commitItems` `:165-169`）**仅 success** 触发（form 值刻意 success 才干净）。**缺**：无 `onChange`-at-pending（带 File info）、无文档化 lifecycle 契约、无独立 uploading。测试 `upload-field.test.tsx:118-202`（success 状态机）、`:204-241`（error）。`input-file/design.md` §7-§8 列事件 + 「上传中局部 pending/result/error」但**未**定义显式状态机 + 保证 payload/顺序契约。
- **U2（onUploadError 带 server msg，P1）— TEST-GAP（正确，测试刻意跳过断言）+ DOC-GAP。** `upload-field.tsx:207-213` 提取 `result.error`（string 或 `.message`）入 thrown Error；`:82-90` `toUploadError` 返 `error.message`；`:243-247` payload `error: toUploadError(error)`（**非** hardcoded；`t('flux.form.uploadFailed')` 仅末路兜底）。传播链真实：failed ajax `{ok:false,data:{message}}`→`result.error.message`（`runtime-actions-chained.test.ts:50-51` 验证）。测试 `upload-field.test.tsx:204-229` 设 `/api/upload-fail` 返 `{data:{message:'rejected'}}` 但**显式跳过** onUploadError payload 断言（注释 `:213-214`），仅查 DOM error state。`input-file/design.md` §8 列 onUploadError 但**未**声明带 server msg。
- **U3（multiple+autoUpload append，P0）— TEST-GAP（正确）。** `upload-field.tsx:219` `multiple ? [...committedItems(), item] : [item]` append；pending append `:271` `[...prev, ...newEntries]`；`latestValueRef`（`:158-169`）使并行/连续 upload 同步累积。autoUpload 隐式（flux 始终选即传）。测试 `:167-201` 单批选 2 文件查均存在，**无** 连续选择（选 2 再 1→共 3）测试。`input-file/design.md` **未**文档化 append-on-successive。
- **U4（init 已有列表 + 新增 merge，P1）— TEST-GAP（正确）。** `existingItems()` 读字段值（`:171-173`）、`committedItems()` 读 `latestValueRef`（`:175-177`）、新 upload 经 `[...committedItems(), item]`（`:219`）merge → init form data 已有文件列表 + 新增保留既有 uploaded。**无** init-existing + add 测试（所有测试空值起）。`input-file/design.md` **未**文档化 merge + uploaded-vs-pending 区分。
- **U5（deleteAction action-ref，P1）— FEATURE-GAP（absent）。** 移除纯本地（`upload-field.tsx:288-291` filter→commitItems）；**无** backend 通知；schema 无 `deleteAction`（`upload-schemas.ts:29-39`）；**无** `onDeleteSuccess/onDeleteError`（grep 零）。`input-file/design.md` 既未文档化 `deleteAction` **也未**记其 absence 为 non-goal。
- **U6（maxSize 客户端拒绝，P1）— FEATURE-GAP（absent）。** **无** `maxSize` 字段；`handleFiles`（`upload-field.tsx:253-286`）**无** JS 级 size/accept 校验（`accept` 仅透传 native `<input>` `:320`）；拒绝文件不滤出 pending；**无** `onReject`/`onFileRejected`（grep 零）。`input-file/design.md` §4 列 `accept`+`maxFiles` 但**非** `maxSize`，无 `onReject`。

### 主要源文件 / 测试

Date 源：`input-date-renderer.tsx`、`date-range-renderer.tsx`、`input-datetime-renderer.tsx`、`input-time-renderer.tsx`、`renderers/date/date-utils.ts`、`date-field-control.tsx`。Tree 源：`flux-renderers-form-advanced/src/tree-controls.tsx`、`tree-control-controllers.ts`、`tree-options.ts`。File 源：`input-file-renderer.tsx`/`input-image-renderer.tsx`、`upload-field.tsx`、`upload-schemas.ts`。校验：`flux-runtime/src/validation/validators.ts`。测试：`input-date.test.tsx`、`date-range.test.tsx`、`input-datetime.test.tsx`、`input-time.test.tsx`、`date-utils.test.ts`、`tree-cascade.test.tsx`、`tree-lazy-children.test.tsx`、`tree-values.test.tsx`、`tree-structure.test.tsx`、`upload-field.test.tsx`。

## Goals

- **D6（P1）**：Fix range `required` 仅一端即通过——引入 range-aware 两端非空校验（或归一化使单端触发 required）；failing-test 先行。
- **D9（P1）**：Fix input-datetime time-typing 绕过 min/max——`handleTimeChange` 加 `isWithinRange` 检查（clamp/reject 到 `[minDate,maxDate]`）；failing-test 先行。
- **U1（P0）**：裁定 upload lifecycle——文档化 `pending→(uploading)→uploaded|error` 契约 + 保证 payload/顺序；裁定独立 `uploading` 状态（推荐 doc-only：pending 兼任 by design）+ `onChange`-at-pending（推荐保持 form 值 success 才写的刻意契约并文档化）。
- **U5**：裁定 deleteAction——实现 `deleteAction` action-ref（镜像 `uploadAction` 桥接，用户点击驱动 pattern #3）+ `onDeleteSuccess/Error` OR 显式 non-goal doc。
- **U6**：裁定 maxSize——实现 `maxSize` + `onReject`（拒绝文件不入 pending、不占 maxFiles）OR 显式 non-goal doc。
- **D1/D2/D4/D7/D12 + TR1/TR3/TR4/TR5/TR6 + U2/U3/U4**：各落聚焦回归锚（预期 direct green）+ 必要 doc 显式化。
- **D5/TR2**：确认锚（已覆盖）。
- owner doc（`input-date/design.md`、`date-range/design.md`、`input-tree/design.md`、`input-file/design.md`）同步全部裁定，与 live code 一致。

## Non-Goals

- 不实现 amis 式独立 `inputDateTime`/`inputTime`/`inputMonth` 类型（NOT-ADOPTED，Flux 统一 `input-date`+`kind`+`date-range`，见 `06` NOT-ADOPTED 表）。
- 不引入 amis `utc` 全局 flag 混淆 display（NOT-ADOPTED，Flux split commit-tz vs display-tz）。
- 不实现 amis 组件级 upload `api`/`receiver`/`fileReceptor`（NOT-ADOPTED，upload 经 `uploadAction` action graph）。
- 不为 date 增加 amis `valueFormat:"X"`（unix）token（当前 token grammar 仅 `YYYY/YY/MM/DD/HH/mm/ss`，属独立 i18n/format 扩展，归 candidate future）。
- 不覆盖 D3（cleared date commits undefined + transformOutAction，P3 #21348，已以 Flux-idiomatic 路径先行）、D8/D10/D11（range over-constraint / relative-date / DST，P2）、TR7（enableNodePath，DESIGN-ACK-NOT-IMPL P3，`input-tree/design.md` 标暂不实现）、U7/U8（accept `*` / multipart body hygiene，P2）——归 B7 / candidate future。
- 不重建 date format/token grammar、tree cascade 运行时、upload action 桥接（均已落地）。

## Scope

### In Scope

- D6 range required-both-bounds Fix + doc。
- D9 input-datetime time-typing min/max Fix + doc。
- U1 upload lifecycle 契约裁定 + doc（+ 独立 uploading / onChange-pending 裁定）。
- U5 deleteAction 裁定（实现 OR non-goal doc）。
- U6 maxSize 裁定（实现 OR non-goal doc）。
- D1/D2/D4/D7/D12 + TR1/TR3/TR4/TR5/TR6 + U2/U3/U4 回归锚 + doc；D5/TR2 确认锚。

### Out Of Scope

- amis 独立 date 类型 / utc 全局 flag / 组件级 upload api（NOT-ADOPTED）。
- date unix token / relative-date / DST（D3/D8/D10/D11）。
- TR7 enableNodePath（暂不实现）。
- U7/U8（P2）。
- 重建 format grammar / cascade runtime / upload bridge。

## Failure Paths

> 涉及校验、min/max 边界、upload lifecycle 与 delete/reject，参考本节。

| 场景编号       | 触发                                                             | 行为（依 Phase 裁定）                                                                                                                                        | 可重试                                                                                                       | 用户可见表现                               |
| -------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------ | -------------------------------------------------- |
| D6-one-bound   | range required，仅设 start（end 空）                             | Fix：range-aware required 校验 → 仅一端非空时 required 失败（错误）；归一化或注册 range-aware 校验器                                                         | n/a                                                                                                          | required 错误提示（两端均需）              |
| D9-time-escape | input-datetime，`minDate` 设定，typing 时间使 datetime < minDate | Fix：`handleTimeChange` 加 `isWithinRange` → clamp/reject 到 `[minDate,maxDate]`；calendar 路径不变                                                          | n/a                                                                                                          | 提交值在 [min,max] 内（不被 typing 绕过）  |
| U1-lifecycle   | 选文件 → 上传 → 成功/失败                                        | 裁定（推荐 doc-only）：`pending→(uploading)→uploaded                                                                                                         | error`，payload/顺序文档化；form `onChange` 仅 success（刻意，doc）；独立 uploading 状态 pending 兼任（doc） | 依实现                                     | 各阶段状态可见 + 事件 payload 含 File/result/error |
| U5-delete      | 移除已上传文件                                                   | 裁定 A：`deleteAction` action-ref（用户点击 dispatch via `props.helpers`，scope 带 `__deletedFile`）+ onDelete 事件；裁定 B：显式 non-goal doc（移除纯本地） | 依实现                                                                                                       | 依裁定：通知后端删除 或 本地移除（文档化） |
| U6-oversized   | 选超过 `maxSize` 文件                                            | 裁定 A：`onReject` 触发、不入 pending、不占 maxFiles；裁定 B：显式 non-goal doc（无 maxSize）                                                                | n/a                                                                                                          | 依裁定：拒绝提示 或 无 maxSize（文档化）   |

## Test Strategy

本档选择：**必须自动化**

理由：D6（required）、D9（min/max）为确认 live 缺陷，依 guide「必须自动化」档其 Proof（failing-test）必先于 Fix。U1（P0 lifecycle 契约）、U5/U6 若裁定为 A-实现（feature Fix）则同升级。其余多为 TEST-GAP（预期 direct green）。

## Execution Plan

### Phase 1 - 缺口裁定与 failing-test 先行（D6 / D9 / U1 / U5 / U6 + Proof）

Status: completed
Targets: `docs/components/input-date/design.md`、`date-range/design.md`、`input-tree/design.md`、`input-file/design.md`（裁定）、`packages/flux-renderers-form/src/__tests__/`、`packages/flux-renderers-form-advanced/src/__tests__/`（failing test / Proof）

- Item Types: `Decision`、`Proof`

- [x] (Decision, D6) 确认 D6 为确认 live 缺陷（range required 单端通过），裁定 Fix：range-aware 两端非空校验（注册 range-aware required 校验器 OR 归一化使单端触发）。记录到 `date-range/design.md`。
- [x] (Proof, D6) failing test：range required，仅设 start → required 失败（错误）；两端均设 → 通过。先红。
- [x] (Decision, D9) 确认 D9 为确认 live 缺陷（time-typing 绕过 min/max），裁定 Fix：`handleTimeChange`（`date-field-control.tsx:141-152`）加 `isWithinRange` 检查（clamp/reject 到 `[minDate,maxDate]`）。记录到 `input-date/design.md`。
- [x] (Proof, D9) failing test：input-datetime `minDate` 设定，typing 时间使 datetime < minDate → 提交值在 [min,max]（不被绕过）。先红。
- [x] (Decision, U1) 裁定 upload lifecycle：文档化 `pending→(uploading)→uploaded|error` 契约 + 保证 payload/顺序；**推荐**：独立 `uploading` 由 pending 兼任（by design，doc）；form `onChange` 仅 success（刻意，doc）。记录到 `input-file/design.md` §8。
- [x] (Decision, U5) 裁定 deleteAction：裁定 A（实现 `deleteAction` action-ref 镜像 `uploadAction`，用户点击驱动 pattern #3 + onDelete 事件）或 B（显式 non-goal doc）。记录到 `input-file/design.md`。
- [x] (Decision, U6) 裁定 maxSize：裁定 A（实现 `maxSize` + `onReject`，拒绝不入 pending、不占 maxFiles）或 B（显式 non-goal doc）。记录到 `input-file/design.md`。
- [x] (Proof, D1/D2/D4) 测试：D1 `valueFormat:"YYYYMMDD"`+`displayFormat:"DD/MM/YYYY"`→commit vs display 分离；D2 `utc:true`→commit UTC、display 本地；D4 datetime-range 设 end 时间→start 时间存活。先证伪（预期 green）。
- [x] (Proof, TR1/TR4) 测试：TR1 `{value:'a',children:[]}`→叶可选；TR4 lazy + 初始值引用 deferred 子节点→children 加载后 checked（deterministic）。先证伪。
- [x] (Proof, U2/U3/U4) 测试：U2 onUploadError payload 带 server msg（补刻意跳过的断言）；U3 选 2 再 1→共 3；U4 init 2 existing + add 1→共 3、existing 保留。先证伪。

Exit Criteria:

> 本 Phase 产出 D6/D9/U1/U5/U6 裁定 + D6/D9 先红测试 + 其余 Proof（多数预期 direct green）。

- [x] D6/D9/U1/U5/U6 Decision 已记录到对应 owner doc（裁定结论）。
- [x] D6/D9 failing test 已落地且为红；D1/D2/D4/TR1/TR4/U2/U3/U4 Proof 已落地（direct green 或失败标记）。

### Phase 2 - Fix 落地（D6 / D9 + U5/U6 实现分支）

Status: completed
Targets: `packages/flux-runtime/src/validation/validators.ts`（D6 range-aware）、`packages/flux-renderers-form/src/renderers/date/date-field-control.tsx`（D9）、`packages/flux-renderers-form-advanced/src/upload-field.tsx`/`upload-schemas.ts`（U5/U6 若裁定 A）

- Item Types: `Fix`、`Proof`

- [x] (Fix, D6) range-aware required 校验：注册/增强 range 字段 required 校验器，使单端非空（值形如 `'2024-06-01,'`）触发 required 失败；不破坏单值 date 的 required 语义。
- [x] (Proof, D6) Phase 1 的 D6 failing test 转 green + 两端均设通过 + 单值 date required 回归 green。
- [x] (Fix, D9) `handleTimeChange` 加 `isWithinRange`：typing 时间后对最终 committed datetime 校验 `[minDate,maxDate]`，越界 clamp/reject（与 calendar 路径同语义）；input-time 的既有 clamp 不回归。
- [x] (Proof, D9) Phase 1 的 D9 failing test 转 green + 边界方向正确 + calendar 路径回归 green。
- [x] (Fix, U5，条件裁定 A) 裁定 **B（non-goal）**——移除纯本地，后端删除通知为 distinct feature；doc 已于 Phase 1 记录（`input-file/design.md` §8.2），successor 归 roadmap B7。裁定 A 分支不执行。
- [x] (Fix, U6，条件裁定 A) 裁定 **B（non-goal）**——无 `maxSize` 字段，客户端 size 拒绝为 distinct feature；doc 已于 Phase 1 记录（`input-file/design.md` §8.3），successor 归 roadmap B7。裁定 A 分支不执行。
- [x] (Proof, U5/U6) 裁定 B 分支：仅 doc（Phase 1 已记），既有 upload 测试回归 green（U2/U3/U4 Phase 1 proof 全 green）。

Exit Criteria:

> 本 Phase 交付 D6/D9 必修 + U5/U6 条件实现。

- [x] D6 range-aware required 生效，failing test green + 回归 green。
- [x] D9 time-typing min/max 生效，failing test green + 回归 green。
- [x] U5/U6（若裁定 A）实现 + Proof green；或裁定 B 则仅 doc（Phase 1 已记）。

### Phase 3 - TEST-GAP 锁与 owner doc 显式化（date / tree / file）

Status: completed
Targets: `packages/flux-renderers-form/src/__tests__/`、`packages/flux-renderers-form-advanced/src/__tests__/`（锚）、`docs/components/input-date/design.md`、`date-range/design.md`、`input-tree/design.md`、`input-file/design.md`

- Item Types: `Proof`、`Decision`

- [x] (Proof, D7) 测试：range 选择立即 commit → 显示=已提交值（无 leak）；锁定 immediate-commit 契约（confirm-step absent 设计差异，doc）。
- [x] (Proof, D12) 测试：input-datetime time sub-field 顺序 digit 输入 `1`→`4`→hour=14（无 doubling），覆盖 Chromium。
- [x] (Proof, TR3) 测试：cascade 反复 toggle 末子 5× → parent 在 value 数组恰好一次（或零），无重复（锁定 `tree-options.ts:229-235` 去重）。
- [x] (Proof, TR5) 测试：options `Object.freeze()` 后 build/flatten/cascade 不抛、不改输入（锁定不可变契约）。
- [x] (Proof, TR6) 测试：`valueField:'code'` → 选择/校验按 `code` 解析（锁定 `tree-options.ts:45-65`）。
- [x] (Proof, D5/TR2) 确认锚：D5 auto-swap、TR2 cascade 全 4 行为（复刻既有断言）。
- [x] (Decision) 若任一 Proof 失败：升级 Fix 并 green（预期多数 direct green）。—— 全部 direct green，无需升级。
- [x] (Decision) 同步 owner doc：D1（valueFormat commit / displayFormat render 语义）、D2（utc 仅 commit，display/picker 本地）、D4（bound 独立）、D6（required 两端）、D7（immediate-commit，无 confirm 设计差异）、D9（min/max 跨 entry path）、D12（无 doubling）；TR1（空数组为叶）、TR4（lazy echo 经 re-render/重算）；U1（lifecycle 状态机 + payload/顺序契约 + pending 兼任 uploading + onChange 仅 success 刻意）、U2（onUploadError 带 server msg）、U3（successive append）、U4（merge existing + uploaded-vs-pending 区分）、U5/U6（裁定结论）与 live code 一致。

Exit Criteria:

> 本 Phase 交付剩余回归锚 + 全部 owner doc 显式化。

- [x] 上述 Proof 测试存在并通过（或失败已升级 Fix 并 green）。
- [x] `input-date/design.md`/`date-range/design.md`/`input-tree/design.md`/`input-file/design.md` 对应 DESIGN-GAP/DOC-GAP 已显式化且与 live code 一致。

### Phase 4 - owner doc 收口同步

Status: completed
Targets: `docs/components/input-date/design.md`、`date-range/design.md`、`input-tree/design.md`、`input-file/design.md`

- Item Types: `Decision`、`Proof`

- [x] (Decision) 收口同步四 owner doc：date（D1/D2/D4/D6/D7/D9/D12）、tree（TR1/TR4）、file（U1/U2/U3/U4/U5/U6）全部裁定/契约与 live code 一致，无「Proposed vs Current」叙事。
- [x] (Proof) 抽查修改后 owner doc 与 live code（`date-field-control.tsx` format/utc/min-max、`date-range-renderer.tsx` bound/normalize、`validators.ts` range required、`tree-options.ts` leaf/cascade、`upload-field.tsx`/`upload-schemas.ts` lifecycle/delete/maxSize）一致。

Exit Criteria:

- [x] 四 owner doc 全部裁定/契约已收口且与 live baseline 一致。

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，ses_0fec963beffecetmlpT5mEcmZq）
- Verdict: `pass-with-minors`
- Rounds: 1（零 Blocker / 零 Major，一轮达成共识）
- Findings addressed:
  - Minor 1（`date-utils.test.ts` 实际位于 `renderers/date/` 同位、行号/范围准确）→ 不阻塞。
  - Minor 2（`date-range.test.tsx:139-147` 反向归一测试 `it(...)` 起于 `:135`，偏移 ~4 行）→ 不阻塞。
  - Minor 3（D6 裁定 option-(b)「归一化使单端触发」会在非 required range 丢合法半选；Phase 2 已倾向 option-(a) validator 注册保值）→ 不阻塞；建议执行期裁定时显式标注 option-(b) 回归风险。
  - Minor 4（观察项，非 plan 缺陷：roadmap mermaid `B41-->B42` 与 Phases 表 `Dependencies:—` 冲突，plan 已按 roadmap Rule「以 Phases 表为准」正确处理；建议 roadmap 后续清理）。
  - 审阅者确认：D6（range required 单端通过）、D9（time-typing 绕过 min/max）均经 live 端到端核对为确认缺陷；U5/U6 grep 零命中确认 absent；20-signal 范围（roadmap AMIS-REF ∪ Phase Detail）依 Rule 22/26 为单一连贯 owner plan（未 over-split/under-bundle）；引用准确性全 ✓。

## Closure Gates

> 关闭条件：本 section 所有条目及每个 Phase Exit Criteria 全 `[x]` 后，方可将 `Plan Status` 改为 `completed`。

- [x] D6 range required-both-bounds 已 Fix，聚焦测试通过。
- [x] D9 input-datetime time-typing min/max 已 Fix，聚焦测试通过。
- [x] U1 upload lifecycle 契约已文档化（+ uploading/onChange-pending 裁定落地）。
- [x] U5 deleteAction 裁定已落地（A 实现 + 测试，或 B non-goal doc）。
- [x] U6 maxSize 裁定已落地（A 实现 + 测试，或 B non-goal doc）。
- [x] D1/D2/D4/D7/D12 + TR1/TR3/TR4/TR5/TR6 + U2/U3/U4 回归锚通过（或失败已升级 Fix 并 green）；D5/TR2 确认锚。
- [x] owner doc（`input-date/design.md`/`date-range/design.md`/`input-tree/design.md`/`input-file/design.md`）与 live baseline 一致。
- [x] 不存在被静默降级到 deferred/follow-up 的 in-scope live defect（D6/D9 为确认缺陷必须 landed；U1/U5/U6 feature 缺口诚实裁定）。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### U5 deleteAction（若裁定 B：non-goal）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 移除当前纯本地（`upload-field.tsx:288-291`）；后端删除通知是 distinct server-contract feature 非「已声称但未测试属性」。若产品判断需，镜像 `uploadAction` 桥接（用户点击驱动 pattern #3）实现为 successor。
- Successor Required: `yes`
- Successor Path: `docs/components/amis-bug-driven-improvement-roadmap.md` B7（或独立 feature plan）。

### U6 maxSize client-side rejection（若裁定 B：non-goal）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 当前无 `maxSize`（`upload-schemas.ts:29-39`）；客户端 size 拒绝是 distinct feature。`accept` 仅透传 native（弱）。若产品判断需，实现 `maxSize`+`onReject` 为 successor。
- Successor Required: `yes`
- Successor Path: `docs/components/amis-bug-driven-improvement-roadmap.md` B7（或独立 feature plan）。

## Non-Blocking Follow-ups

- D3（cleared date commits undefined + `transformOutAction`，P3 #21348，已 Flux-idiomatic 路径先行）、D8（range 无 minDate start 可未来 / maxDate 派生，P2 #6318）、D10（relative-date 词汇，P2 #4936/#6118）、D11（date-only DST midnight，P2 #3768）归 B7 / candidate future。
- TR7（enableNodePath path-string，DESIGN-ACK-NOT-IMPL P3 #6229，`input-tree/design.md` 暂不实现）——不测试直至实现。
- U7（`accept:"*"`/`""` 语义，P2 #334）、U8（multipart body 无 stray part，P2 #1982）归 B7。
- date token grammar 扩展（unix `valueFormat:"X"` 等）归 candidate future（i18n/format 独立项）。

## Closure

Status Note: B4.2 收口。两条确认 live 缺陷已 landed（D6 range required-both-bounds via 新 `requiredRange` validator；D9 input-datetime time-typing min/max via `handleTimeChange` clamp）。U1 lifecycle 契约文档化（pending 兼任 uploading + onChange 仅 success by design）。U5 deleteAction / U6 maxSize 诚实裁定 B（non-goal，genuinely-absent features，successor B7）。D1/D2/D4/D5/D7/D12 + TR1/TR2/TR3/TR4/TR5/TR6 + U2/U3/U4 全部聚焦回归锚通过。四 owner doc 与 live baseline 一致。全量 typecheck/build/lint/test green。独立 fresh-session closure-audit approved。

Closure Audit Evidence:

- Auditor / Agent: 独立 closure-audit 子 agent（fresh session `ses_0fe3bd036ffefa5anVHLoRx7gB`，非执行 session）
- Verdict: `approved` — plan may be marked `Plan Status: completed`。零 Blocker/Major/Minor。
- Evidence（核对 live repo，非执行者声明）:
  - D6: `validators.ts:126-143` `requiredRange` 仅对 partial delimited range 触发；`validation.ts:11` 类型已加；`input.tsx:456-471` `createRangeFieldValidation` 仅在 `required` 时为 date-range 贡献该规则；单值 date 不受影响（回归 green）。5 unit + 3 component 用例通过。
  - D9: `date-field-control.tsx:142-156` `handleTimeChange` 经 `clampToRange`(isWithinRange) 后 commit；calendar 路径不变；3 clamp 方向用例通过。
  - U1: `input-file/design.md §8.1` 契约落地；`commitItems` 仅 success/remove/clear 触发，pending 不写值。
  - U5/U6 裁定B 诚实：grep `packages/` 确认 `deleteAction`/`maxSize`/`onReject`/`onDelete*` 均 ABSENT；`Deferred But Adjudicated` 有有效 non-blocking 理由 + successor B7。
  - Doc↔code spot-check（date-range D4/D6/D7/D5、input-date D1/D2/D9/D12、input-tree TR1/4/5/6、input-file U1/U4/U5/U6）全一致。
  - D6/D9 为仅有的确认 live 缺陷，均已 landed；无 in-scope 缺陷被静默 deferred。
  - 全量验证：`pnpm typecheck` 55/55、`pnpm build` 29/29、`pnpm lint` 29/29（1 pre-existing 无关 warning）、`pnpm test` 55/55；无 `src/` 散落 build artifact。

Follow-up:

- U5 deleteAction、U6 maxSize（裁定 B non-goal）→ successor roadmap B7（或独立 feature plan）。
- D3/D8/D10/D11、TR7、U7/U8、date unix token grammar → 已在 `Non-Blocking Follow-ups` 归 B7 / candidate future（本 plan 不负责）。
