# B4.1 select/input 受控值、echo 与事件契约

> Plan Status: completed
> Last Reviewed: 2026-06-26
> Source: `docs/components/amis-bug-driven-improvement-roadmap.md`（Wave B4，工作项 B4.1），`docs/components/amis-bug-driven-improvements/03-select.md`（S1/S3-S6/S8/S12），`docs/components/amis-bug-driven-improvements/05-input-fields.md`（I1-I6/I8），`docs/components/select/design.md`，`docs/components/input-text/design.md`，`docs/components/input-number/design.md`
> Mission: amis-bug-driven-improvements
> Work Item: B4.1 select/input 受控值、echo 与事件契约
> Related: successor B5.2（tabs/dynamic/chart，依赖 B4.1 + B6.1）；本工作项无前置依赖（roadmap Dependencies: —）。

## Purpose

把 roadmap 工作项 B4.1 收口。逐条对照 live repo 裁定并落地 `03-select.md`（7 条）与 `05-input-fields.md`（7 条）共 14 条 in-scope signal（S1/S3/S4/S5/S6/S8/S12 + I1/I2/I3/I4/I5/I6/I8）。三类工作交织：

- **确认 live 缺陷（必须 Fix，failing-test 先行）**：**S3（echo 当 option 缺失时 trigger 渲染空白，P0）**——value 设置但无 option 匹配时，desktop single `<ComboboxValue>` 得 `null` 显示 placeholder（`input-choice-renderers.tsx:260,435`）、multi 把 value 中无对应 option 的 primitive 静默丢弃显示（`:255-259,407-413`）、mobile single `?? ''`（`:282`）→ 用户看不到已提交的值。必须 Fix（raw value / noMatchText fallback）。
- **特征缺口（Feature Gap，需裁定）**：**S4（remote 搜索保留已选项，P1）**——select renderer **无** remote-search 路径，过滤纯本地（`input-choice-renderers.tsx:238-241`），schema 无 `searchSource`/`searchApi`（`schemas.ts:113-124`，对照 input-tree 有 `searchSource` `:176`）。须裁定：实现 `searchSource`（feature）或正式 close 为 out-of-scope（redirect tree-select/picker，doc 已标「远程搜索属组合层」）。**推荐裁定 B（out-of-scope + doc）**。
- **TEST-GAP / DOC-GAP（实现正确，补聚焦锚 + doc）**：S1（multi 真数组 + Object.is 分隔符免疫 LOCK，P0）、S5（cache key 含全依赖，已覆盖 unit 级）、S6（虚拟滚动后过滤不崩，已有 guard）、S8（程序式 set 发 onChange，已覆盖）、S12（optionTemplate 点哪都选中，已覆盖 plain content）、I1（null 渲染空，已覆盖）、I2（reset 重同步显示，flush 结构性 N/A）、I3（reset 清提交值，adapter 已覆盖）、I4（setValue 后仍可编辑，结构性正确）、I5（debounce flush，无 write-debounce，结构性 moot）、I6（所有变更路径发 onChange，已覆盖）、I8（字面量初始值不被当表达式，bare-`$` 正确）。

## Current Baseline

> 来源：2026-06-26 独立 explore 子 agent 对 `packages/flux-renderers-form/src/`（select、input-text、input-number）、`packages/flux-runtime/src/`（valueAdapter、setValue、change observable、api-cache）、`packages/flux-compiler/src/`、owner doc 的 live-repo 审计。下列 file:line 引用均已核对。

### Select 现状

- **S1（multi 真数组 + Object.is，分隔符免疫 LOCK）— TEST-GAP（结构正确）。** multi `comboboxValue`（`input-choice-renderers.tsx:255-260`）`allOptions.filter(o => arr.some(c => Object.is(c, o.value)))`；写值 `handleValueChange`（`:266-272`）`(next).map(o => o.value)`（primitive 数组，无 join）；`selectMultipleAdapter`（`:58-67`）保数组身份。`SelectSchema`（`schemas.ts:113-124`）**无** `delimiter`/`valueField`/`joinValues`。**无**「option value 含 `,`/`@`/`${`/unicode 在 multi 数组中保持为单个 primitive」的聚焦测试。`select/design.md` §2/§12 提「以 Object.is 匹配，不需 amis 值编码」但未框架为 LOCK 契约、未枚举特殊字符。
- **S3（echo 当 option 缺失，P0）— CONFIRMED-LIVE-DEFECT。** value 设置但无 option 匹配时 trigger 渲染 placeholder（空白）：desktop single `comboboxValue = allOptions.find(...) ?? null`（`:260`）→ `<ComboboxValue placeholder=...>`（`:435`）显示 placeholder（base-ui ComboboxValue 在 null 时显 placeholder）；desktop multi chips 过滤为 `allOptions ∩ value`（`:255-259,407-413`）→ value 中无对应 option 的 primitive 静默丢显示（但保留 form 值）；mobile single `?? ''`（`:282`）；mobile multi 同丢显示（`:274-281`）。**无**测试。`select/design.md` 无 echo-fallback 条款。
- **S4（remote 搜索保留已选项，P1）— FEATURE-GAP（remote 搜索本身未实现）。** 过滤纯本地（`input-choice-renderers.tsx:238-241` `visibleOptions = query ? rawOptions.filter(matchChoiceLabel) : rawOptions`）；schema 无 `searchSource`/`searchApi`/`searchAction`（`schemas.ts:113-124`，对照 `InputTreeSchema.searchSource` `:176`）。`select/design.md` §2 标「远程异步搜索：实现（入口预留），`filterOption:false` 禁用前端过滤，搜索关键字驱动 data-source 刷新属组合层」——即显式 deferred 到组合层。**保留属性在结构上安全**（value 在 form/scope 为真值源，options 派生自 `props.props.options`，刷新 option 列表不会丢底层 value，仅影响 echo=S3）。
- **S5（cache key 含全依赖，P1）— ALREADY-COVERED（unit）+ TEST-GAP（e2e）+ DOC-GAP。** `api-data-source-controller-runtime.ts:254-266` `prepareApiRequestForExecution`（`:256` materialize 所有 `${dep}`）→ `resolveCacheKey`（`:264`）；`api-cache.ts:245-253` `generateCacheKey = ${method}:${url}:${headersStr}:${dataStr}` + `stableStringifyForIdentity`（`:100-110` fnv1a64 兜底）。测试 `api-cache.test.ts:169-254`（不同 data/headers 不同 key）。**缺**：dep 变量变而 keyword 同 → key 变 → 新请求的 e2e。`select/design.md` §9 未文档化。
- **S6（虚拟滚动后过滤不崩，P1）— ALREADY-COVERED（guard）+ TEST-GAP。** `select-combobox-lists.tsx:92` `getItemKey: i => getChoiceOptionKey(flatItems[i]?.value ?? i)`（安全兜底）；`:104-108` `if (!option) return null`（null-guard）。**无**「滚到远 offset 再过滤」聚焦测试。
- **S8（程序式 set 发 onChange，P1）— ALREADY-COVERED + TEST-GAP（data-source default 场景）+ DOC-GAP。** `form-runtime.ts:520-560` `setValue`→`store.batchUpdate`+`setLastChange({paths:[name],kind:'update'})`+`revalidateDependents`；`setValues`（`form-runtime-values.ts:63-153`）同；action `setValue`（`action-adapter.ts:113-119`）→`scope.update`→`setSnapshot({paths,kind:'update'})`。订阅 `useBoundFieldValue`（`field-handlers.tsx:44-62`）+ reaction `scopeChangeHitsDependencies`（`scope-change.ts:134`）。测试 `runtime-reactions.test.ts:192-243`（scope.update→reaction）、`runtime-validation.test.ts:507`（reset 发 replace lastChange）。**缺**：data-source default → 依赖字段/expression 反应的聚焦场景。
- **S12（optionTemplate 点哪都选中，P1）— ALREADY-COVERED（plain）+ TEST-GAP（nested anchor）。** base-ui `ComboboxItem`（`node_modules/.../ComboboxItem.js:140-157`）：`onPointerDownCapture`（`:140-143`）preventDefault + `onClick`（`:144-149`）commitSelection——capture phase，任意后代 target 冒泡到 wrapper 选中。`ComboboxItem value={option}`（`select-combobox-lists.tsx:39`）。测试 `select-option-template.test.tsx:87-111`（点 template 文本选中）。**缺**：optionTemplate 渲染 nested `<a>`/`<button>` 自带 `stopPropagation` 时 select 被吞（#5369 实际回归风险）。

### Input 现状

- **I1（null 渲染空，非 "null"，P1）— ALREADY-COVERED。** `stringAdapter.in`（`value-adapter.ts:182-191`）`value == null ? '' : String(value)`；`input.tsx:241` `inputValue ?? ''`。测试 `form-field-handlers.test.tsx:322-348`（`data:{title:null}`→`input.value===''`）。
- **I2（reset 重同步显示含 flush，P0）— TEST-GAP（flush 结构性 N/A，未文档化）。** 显示同步正确：controlled input 经 `useBoundFieldValue` 订阅，`form.reset`（`form-runtime.ts:501-518`）同步 `store.batchUpdate`→订阅同步触发→重渲染 reset 值；`component:reset` 调 `handlers.onChange(initial)`（`input.tsx:257-261`、`input-number-renderer.tsx:90-94`）。**flush 结构性 N/A**：form runtime **无** debounced field-write（`form-store.ts:530` `setValue` 同步；仅 validation debounce `form-runtime-validation.ts:179` 与 reaction debounce `reaction-runtime.ts:396`，均不延迟 committed 值）。测试 `component-handles-input.test.tsx:74-94` 测 `component:reset`（断 form-state-probe 值非 DOM input.value）、`bug-dual-state.test.tsx:117,207`（form.reset 显示重同步，但在 form-advanced）。**缺**：plain input-text/input-number 的 `form.reset()` 显示重同步测试。`input-text/design.md` §8 提 reset handle 但**未**文档化显示同步契约 + 无 write-debounce（故无 flush 需求）。
- **I3（reset 清显示与提交值，P1）— ALREADY-COVERED（adapter）+ TEST-GAP（reset→submit 场景）。** `numberAdapter.out`（`value-adapter.ts:234-249`）`value==null||value==='' ? undefined`；onChange handler（`input-number-renderer.tsx:229-239`）`raw===''`→`onChange(undefined)`。测试 `input-number.test.tsx:104-130`（clear→form 值 undefined）。**缺**：set 111→reset→submit→序列化无 `count` 字段场景。
- **I4（setValue 后仍可编辑，P1）— TEST-GAP（结构性正确）。** 全 controlled（`input.tsx:358-389` `value=inputValue` 恒派生、`onChange` 恒写回；`input-number-renderer.tsx:206-242`）；无内部 committed 镜像、无 `defaultValue`、无覆盖用户输入的 `useEffect`；`useInputComponentHandle`（`use-input-component-handle.ts:33-42`）每渲染更新 bindingsRef。**无**「程序式 setValue→type/paste→值更新」测试。
- **I5（debounce flush 语义，P1）— ALREADY-COVERED（flush 结构性 moot）+ DOC-GAP。** 无 debounced field-write（同 I2，`form-store.ts:530` 同步）。submit（`form-runtime-submit-flow.ts`）/handle 恒读最新 committed 值。**未文档化**「字段写同步、无 flush 契约」（doc-gap：未来贡献者可能加 debounced write 而不加 flush hook）。
- **I6（所有变更路径发 onChange，P1）— ALREADY-COVERED + TEST-GAP（统一断言）+ DOC-GAP。** 全路径收敛同一 store update + lastChange：native typing→`handlers.onChange`（`field-handlers.tsx:84`）→`setValue`（`:217`）；`component:clear`/`reset`→`handlers.onChange('')`/`onChange(initial)`（`input.tsx:256-261` 等）；action `setValue`→`scope.update`/`form.setValues`（`action-adapter.ts:117,136`）；`form.reset`→`setLastChange({paths:['*'],kind:'replace'})`。测试 `component-handles-input.test.tsx`（clear/reset）、`runtime-reactions.test.ts:192`（reaction）。**缺**：单测断言四路径（native/handle-clear/handle-reset/action-setValue）发同一 canonical observable。
- **I8（字面量初始值不被当表达式，P1）— TEST-GAP（bare-`$` 正确）+ DOC-GAP。** 字段 value 来自 form/scope data（plain data，永不解析）。schema-declared `name` 默认 `'prop'` field（`fields.ts:48`）经 `compileValue`（`node-compiler.ts:474`），表达式检测 `hasExpression = input.includes('${')`（`formula-compiler.ts:106`）：`name:"$catId"`→false→字面；`name:"${catId}"`→true→`isPureExpression`（`template.ts:40`）→求值（intentional 动态绑定）。**无** `name:"$catId"` 渲染为字面 `$catId` 的聚焦测试。

### 主要源文件 / 测试

源：`input-choice-renderers.tsx`、`select-combobox-lists.tsx`、`select-mobile-renderer.tsx`、`input.tsx`、`input-number-renderer.tsx`、`textarea-renderer.tsx`、`field-utils/field-handlers.tsx`、`flux-core/value-adapter.ts`、`flux-runtime/form-runtime.ts`/`form-store.ts`/`scope-change.ts`、`flux-runtime/async-data/api-cache.ts`。测试：`select-enhancements.test.tsx`、`select-option-template.test.tsx`、`input-text-enhancements.test.tsx`、`input-number.test.tsx`、`component-handles-input.test.tsx`、`form-field-handlers.test.tsx`、`runtime-reactions.test.ts`、`api-cache.test.ts`。

## Goals

- **S3（P0）**：Fix echo 当 option 缺失——single+multi、desktop+mobile trigger 在 value 无匹配 option 时降级渲染（raw value / fallback label / noMatchText 标记），绝不空白；failing-test 先行。
- **S4**：裁定 remote 搜索——**推荐裁定 B（out-of-scope + doc）**：select 远程搜索显式归组合层（doc 已标），redirect tree-select/picker；文档化「value 为真值源、option 刷新不丢底层值（仅影响 echo）」契约。
- **S1（P0 LOCK）**：multi 分隔符免疫回归锚 + owner doc LOCK 契约显式。
- **I2（P0）+ I5**：plain input-text/input-number 的 `form.reset()` 显示重同步测试 + doc「字段写同步、无 write-debounce、故无 flush 契约」（I2 + I5 共用 doc note）。
- **S5/S6/S8/S12/I3/I4/I6/I8**：各落聚焦回归锚（预期 direct green）+ 必要 doc 显式化。
- **I1**：确认锚（已覆盖）。
- owner doc（`select/design.md`、`input-text/design.md`、`input-number/design.md`）同步全部裁定，与 live code 一致。

## Non-Goals

- 不实现 select remote 搜索（`searchSource`）——若裁定 B 则 redirect tree-select/picker + doc；若执行期裁定 A-实现则拆 successor feature plan。
- 不引入 amis `valueField`/`delimiter`/`joinValues`/`extractValue` 值编码（NOT-ADOPTED，见 `03` NOT-ADOPTED 表）。
- 不为 input 增加 debounced field-write（I2/I5 结论是当前同步写正确；doc 仅声明其 absence 为刻意）。
- 不覆盖 S2/S7/S9/S10/S11/S13（select P2）与 I7/I9/I10/I12/I13（input P2/P3，I11 已 BY-DESIGN P3）——归 B7。
- 不重建 form change-observable / setValue 管道（已统一落地）。

## Scope

### In Scope

- S3 echo-fallback Fix（P0）+ doc。
- S4 remote 搜索裁定（推荐 out-of-scope + doc）。
- S1 分隔符免疫 LOCK 回归锚 + doc。
- I2 reset 显示重同步测试 + I2/I5 同步写 doc note。
- S5/S6/S8/S12/I3/I4/I6/I8 回归锚 + 必要 doc；I1 确认锚。

### Out Of Scope

- select `searchSource` 实现（feature，successor）。
- amis 值编码（NOT-ADOPTED）。
- input debounced write（刻意 absent）。
- S2/S7/S9/S10/S11/S13、I7/I9/I10/I11/I12/I13（P2/P3 → B7）。

## Failure Paths

> 涉及 echo-fallback 与字面量/表达式边界，参考本节。

| 场景编号        | 触发                                                     | 行为                                                                                                                | 可重试 | 用户可见表现                                           |
| --------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------ |
| S3-no-match     | value 设置但 options 无匹配（async 未加载 / 不在过滤集） | Fix：trigger 渲染 raw value / fallback label / noMatchText（非 placeholder 空白）；multi 不丢已选项显示             | n/a    | 已提交值可见（非空白）                                 |
| S3-multi-retain | multi value 含某项，其 option 暂不在当前 options         | value 保留（form 真值源）；显示降级（chip 显 raw value/fallback）                                                   | n/a    | chip 显已选项（降级 label）                            |
| I8-literal      | `name:"$catId"`（bare `$`）                              | 字面渲染 `$catId`（`hasExpression` 仅识别 `${`）；仅 `${...}` 包装才求值                                            | n/a    | 显示 `$catId`                                          |
| S4-remote       | select 需远程搜索                                        | 裁定 B（推荐）：不实现，redirect tree-select/picker + doc；组合层（`filterOption:false` + data-source）路径已文档化 | n/a    | 依裁定：组合层方案 或（若 successor）renderer 内置搜索 |

## Test Strategy

本档选择：**必须自动化**

理由：S3 是确认 live 缺陷（echo 空白，P0），依 guide「必须自动化」档 S3 的 Proof（failing-test）必先于 Fix。S1（P0 LOCK）/I2（P0）虽实现正确，仍配聚焦回归锚。其余多为 TEST-GAP（预期 direct green）。

## Execution Plan

### Phase 1 - 缺口裁定与 failing-test 先行（S3 / S4 / S1 / I2）

Status: completed
Targets: `docs/components/select/design.md`、`docs/components/input-text/design.md`、`docs/components/input-number/design.md`（裁定）、`packages/flux-renderers-form/src/__tests__/`（failing test / Proof）

- Item Types: `Decision`、`Proof`

- [x] (Decision, S3) 确认 S3 为确认 live 缺陷（trigger 空白），裁定 Fix：single+multi、desktop+mobile 在 value 无匹配 option 时降级渲染 raw value / fallback label / noMatchText。记录到 `select/design.md` §7/§12。
- [x] (Proof, S3) failing test：single select value=`'x'` 但 options 不含 → trigger 非空（raw/fallback）；multi value=`['a','ghost']` options 只含 a → chip 显 ghost（降级）；mobile single/multi 同理。先红。
- [x] (Decision, S4) 裁定 remote 搜索：**裁定 B（out-of-scope + doc）**——select 远程搜索归组合层（`filterOption:false` + data-source），redirect tree-select/picker；doc 文档化「value 真值源、option 刷新不丢底层值」。若执行期证据表明需 renderer 内置 `searchSource`，升级裁定 A 并拆 successor。
- [x] (Proof, S1) 测试：option value 含 `,`/`@`/`${`/unicode，multi → value 为 whole primitive 数组、echo 显完整 label。先证伪（预期 green，锁定 LOCK）。
- [x] (Proof, I2) 测试：input-text/input-number type 后 `form.reset()` → DOM `input.value`===reset 值 且 runtime 值同步。先证伪（预期 green）。

Exit Criteria:

> 本 Phase 产出 S3/S4 裁定 + S3 先红测试 + S1/I2 Proof。

- [x] S3/S4 Decision 已记录到 owner doc（裁定结论）。
- [x] S3 failing test 已落地且当前为红；S1/I2 Proof 已落地（direct green 或失败标记）。

### Phase 2 - Fix S3（P0 echo-fallback）

Status: completed
Targets: `packages/flux-renderers-form/src/renderers/input-choice-renderers.tsx`、`select-combobox-lists.tsx`、`select-mobile-renderer.tsx`

- Item Types: `Fix`、`Proof`

- [x] (Fix, S3) 在 desktop single（`comboboxValue` `:260` / `ComboboxValue` `:435`）、desktop multi（chips 过滤 `:255-259,407-413`）、mobile single（`:282`）/multi（`:274-281`）引入 echo-fallback：value 无匹配 option 时渲染 raw value（或 fallback label / noMatchText），multi 不丢 value 中 primitive 的显示。保留 form 真值源不变。
- [x] (Proof, S3) Phase 1 的 S3 failing test 转 green；补 multi-retain（option 暂缺后回填）+ disabled/readonly 下降级不阻塞选择。

Exit Criteria:

> 本 Phase 交付 S3 必修 + 多分支覆盖。

- [x] S3 echo-fallback 在 single+multi、desktop+mobile 生效，failing test green + 补测 green；既有 select 测试回归 green。

### Phase 3 - TEST-GAP 锁与 doc 显式化（S5/S6/S8/S12 + I1/I3/I4/I5/I6/I8）

Status: completed
Targets: `packages/flux-renderers-form/src/__tests__/`、`packages/flux-runtime/src/__tests__/`（锚）、`docs/components/select/design.md`、`input-text/design.md`、`input-number/design.md`

- Item Types: `Proof`、`Decision`

- [x] (Proof, S5) 测试：option data-source cache key——dep 变量变而 keyword 同 → key 变 → 新请求（锁定 `api-cache.ts:245` + `prepareApiRequestForExecution`）。
- [x] (Proof, S6) 测试：`virtual=true` 1000+ options 滚到 offset~700 再过滤 → 不崩、过滤列表正确（锁定 `select-combobox-lists.tsx:92,106-108`）。
- [x] (Proof, S8) 测试：data-source default value → 依赖字段/expression 反应（锁定 `form-runtime.ts:520` lastChange + `scope-change.ts:134`）。
- [x] (Proof, S12) 测试：optionTemplate 渲染 nested `<a>`/`<button>` 自带 `stopPropagation` → 仍选中（或不被吞的契约裁定）；virtual + multiple 下同。
- [x] (Proof, I1) 确认锚：`data:{title:null}`→`input.value===''` + onChange→null round-trip（锁定 `value-adapter.ts:182`）。
- [x] (Proof, I3) 测试：input-number set 111→reset→submit→序列化无 `count`/`count===undefined`（锁定 `value-adapter.ts:234` out-path）。
- [x] (Proof, I4) 测试：程序式 setValue → type/backspace/paste → 值正常更新（锁定 controlled input `input.tsx:358-389`）。
- [x] (Proof, I6) 测试：单测断言 native typing / handle-clear / handle-reset / action-setValue 四路径发同一 canonical onChange observable（可被 `when`/reaction 消费）。
- [x] (Proof, I8) 测试：`name:"$catId"` 渲染字面 `$catId`；`name:"${x}"` 求值为动态绑定（锁定 `formula-compiler.ts:106` hasExpression）。
- [x] (Decision) 若任一 Proof 失败：升级 Fix 并修复 green（预期多数 direct green）。
- [x] (Decision) 同步 owner doc：S1（multi Object.is + 分隔符免疫 LOCK 显式 + 特殊字符枚举）、S3（echo-fallback 契约）、S4（remote 搜索 out-of-scope + redirect）、S5（cache key 含全依赖）、S8（程序式 set 发 onChange）、S12（click-anywhere + nested-anchor 契约）、I2/I5（字段写同步、无 write-debounce、无 flush 契约——刻意 absent）、I6（所有变更路径发统一 onChange）、I8（字面 vs `${}` 求值契约）与 live code 一致。

Exit Criteria:

> 本 Phase 交付 S5/S6/S8/S12 + I1/I3/I4/I5/I6/I8 回归锚 + owner doc 显式化。

- [x] 上述 Proof 测试存在并通过（或失败已升级 Fix 并 green）。
- [x] `select/design.md`/`input-text/design.md`/`input-number/design.md` 对应 DESIGN-GAP/DOC-GAP 已显式化且与 live code 一致。

### Phase 4 - owner doc 收口同步

Status: completed
Targets: `docs/components/select/design.md`、`docs/components/input-text/design.md`、`docs/components/input-number/design.md`

- Item Types: `Decision`、`Proof`

- [x] (Decision) 收口同步三 owner doc：S1/S3/S4/S5/S8/S12 + I2/I5/I6/I8 全部裁定/契约与 live code 一致，无「Proposed vs Current」叙事。
- [x] (Proof) 抽查修改后 owner doc 与 live code（`input-choice-renderers.tsx` echo-fallback、`value-adapter.ts` adapter、`form-runtime.ts` lastChange、`formula-compiler.ts` hasExpression）一致。

Exit Criteria:

- [x] 三 owner doc 全部裁定/契约已收口且与 live baseline 一致。

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，ses_0fec9b95bffeIWLGwZXj7rlNb3）
- Verdict: `pass`
- Rounds: 1（零 Blocker / 零 Major，一轮达成共识）
- Findings addressed:
  - Minor 1（S12 `node_modules/.../ComboboxItem.js:140-157` 不可直接核对——base-ui 经 `@nop-chaos/ui` 传递消费；load-bearing 锚 `select-combobox-lists.tsx:39` `<ComboboxItem value={option}>` 已确认）→ 不阻塞；建议执行期以 `:39` + 行为说明替代 node_modules 行号。
  - Minor 2（个别 bare-filename 引用省略子目录，如 `template.ts:40`、`reaction-runtime.ts:396`；行号/内容正确）→ 不阻塞。
  - Minor 3（`handleValueChange` 引 `:266-272` 实际 `:262-272`，偏移几行）→ 不阻塞。
  - 审阅者确认关键裁定均经 live 核对成立：S3=确认 live 缺陷（trigger 空白，Fix 必要）、S4 deferred 诚实（`select/design.md:27` 显式归组合层）、I2/I5「无 write-debounce→flush 结构性 N/A」经 grep 全 `flux-runtime` debounce 命中确认（均非延迟 committed 值）；引用准确性全 ✓。

## Closure Gates

> 关闭条件：本 section 所有条目及每个 Phase Exit Criteria 全 `[x]` 后，方可将 `Plan Status` 改为 `completed`。

- [x] S3 echo-fallback 已 Fix（single+multi、desktop+mobile），聚焦测试通过。
- [x] S4 remote 搜索裁定已落地（裁定 B 则 out-of-scope + doc + redirect；裁定 A 则拆 successor）。
- [x] S1 分隔符免疫 LOCK 回归锚 + doc 通过。
- [x] I2 reset 显示重同步测试 + I2/I5 同步写 doc note 通过。
- [x] S5/S6/S8/S12/I1/I3/I4/I6/I8 回归锚通过（或失败已升级 Fix 并 green）。
- [x] owner doc（`select/design.md`/`input-text/design.md`/`input-number/design.md`）与 live baseline 一致。
- [x] 不存在被静默降级到 deferred/follow-up 的 in-scope live defect（S3 为确认缺陷必须 landed）。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### S4 select renderer 内置 remote 搜索（`searchSource`）（若裁定 B）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: select 远程搜索 Flux 显式归组合层（`select/design.md` §2「实现（入口预留）」，`filterOption:false` + data-source 驱动）；非「已声称但未测试属性」。tree-select/picker 已有 lazy/search 能力。裁定 B redirect + doc 闭合边界；保留属性（value 真值源、option 刷新不丢值）已文档化。
- Successor Required: `yes`
- Successor Path: `docs/components/amis-bug-driven-improvement-roadmap.md` B7（或独立 feature plan，若产品判断需 renderer 内置 searchSource，镜像 input-tree）。

## Non-Blocking Follow-ups

- S2（duplicate option value 解析 + virtual echo，P2 #941）、S7（options ref 替换保持选择，P2 #4521）、S9（multi change observable post-array，P2 #4480）、S10（setValue per-key merge，P2 #2900）、S11（space 字面搜索，P2 #1333）、S13（mobile Sheet touch-scroll，P2 #3252）归 B7 backlog。
- I7（focused input 不吞页面热键，P2 #4201）、I9（同 name 双字段，P2 #5363）、I10（precision rounding mode，P2 #3753）、I11（min/max clamp BY-DESIGN P3 #2597，已降级）、I12（number type-stability，P2 #6334）、I13（disabled input-number 视觉，P3 #5351）归 B7 backlog。

## Closure

Status Note: 全部 4 个 Phase 已落地收口。S3 echo-fallback（P0 确认 live 缺陷）已 Fix（desktop single/multi + mobile single/multi + `noMatchText` 覆盖）。S4 remote 搜索裁定 B（out-of-scope + doc + redirect）。S1/S5/S6/S8/S12 + I1/I3/I4/I6/I8 回归锚全部 direct green（S12 nested-anchor stopPropagation 边界经实测确认为「commit 在冒泡 click，stopPropagation 会吞」并文档化）。owner doc（select/input-text/input-number）与 live code 一致。全 workspace typecheck/build/test/lint green。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，ses_0fe725b22ffeFp1ZIs5hmcWXku）
- Verdict: `pass`（零 Blocker）
- Audit Status: `closed`
- Evidence: 独立审计核对——S3 Fix real（`input-choice-renderers.tsx:255-299` synthetic fallback single/multi/desktop/mobile，value 不被回写；`noMatchText` `:274/:298`；`schemas.ts:122`）；测试断言行为而非「无错」（S3 raw value 可见 + 不显 placeholder；S5 不同 dep→不同 key；I3 clear→submit `count===undefined`；I8 bare `$catId` 字面 vs `${x}` 求值；I2 DOM `input.value` 重同步）；S4 裁定落地（doc §2 + Deferred But Adjudicated successor→B7）；无 in-scope 缺陷被静默降级；doc↔code 一致（`value-adapter.ts:182,234`/`api-cache.ts:245,255`/`select-combobox-lists.tsx:39` 行号准确）；无 stray 构建产物入 `src/`。全 workspace `pnpm typecheck`/`build`/`test`/`lint` green（form 528 tests、runtime 1241 tests）。

Follow-up:

- S4 successor：select renderer 内置 `searchSource` 归 B7 backlog（或独立 feature plan，镜像 input-tree）。
- P2/P3 项（S2/S7/S9/S10/S11/S13、I7/I9/I10/I12/I13）明确归 B7 backlog（见 Non-Blocking Follow-ups）。

> Plan Status: completed
> Last Reviewed: 2026-06-26
