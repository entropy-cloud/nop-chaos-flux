# B3.2 array/combo 嵌套隔离与校验寻址

> Plan Status: completed
> Last Reviewed: 2026-06-26
> Source: `docs/components/amis-bug-driven-improvement-roadmap.md` (Wave B3, work item B3.2), `docs/components/amis-bug-driven-improvements/04-combo-and-array-field.md` (C1-C3/C5/C7/C9/C10/C12/C13), `docs/components/amis-bug-driven-improvements/01-form-validation.md` (V6，由 B1.2 显式 deferred 归本工作项), `docs/architecture/array-field.md`, `docs/components/combo/design.md`, `docs/architecture/form-validation.md`
> Mission: amis-bug-driven-improvements
> Work Item: B3.2 array/combo 嵌套隔离与校验寻址
> Related: predecessor B1.1（`docs/plans/2026-06-26-0234-1-b11-...-plan.md`，已 done；B3.2 依赖 B1.1 校验闭包）；predecessor B1.2（`docs/plans/2026-06-26-0406-1-b12-...-plan.md`，已 done；其 Deferred V6「array 行本地相对寻址」显式归本工作项 `04` C1-C13 跟踪集）；同 wave B3.1（table，独立推进）；successor B3.3（依赖 B3.1+B3.2）

## Purpose

把 roadmap 工作项 B3.2 收口。本计划逐条对照 live repo 裁定并落地 `04-combo-and-array-field.md` 的 9 条 signal（C1/C2/C3/C5/C7/C9/C10/C12/C13），并吸收 predecessor B1.2 显式 deferred 的 **V6（array 行本地相对跨字段寻址）**。三类工作交织：

- **已实现、缺聚焦测试 / owner doc 沉默（TEST-GAP + DESIGN-GAP）**：C1（嵌套写隔离）、C5（外部错误行/叶级寻址）、C7（add 不校验新行）、C9（提交值仅含声明字段）、C12（per-item 重渲染隔离）、C13（per-item action 回写）——机制多已由 prefix-projection / showErrorOn 门控 / transient source state / React.memo 成立，补聚焦回归锚 + owner doc 显式化。
- **特征缺口 / 契约分叉（需裁定）**：**C10（hidden 字段是否排除出提交）**——live 默认「保留值并包含进提交」（与 C10 提议「默认排除」相反）；**C3（per-row delete `when` 门控）**——无实现，仅 field-global minItems 地板；**V6（array 行本地相对寻址）**——确认仍为 gap（`getChildFieldPathPrefix` 返回 false，跨字段校验用绝对 `scope.get`）。
- **LOCK**：C2（嵌套子读父行字段经 owner scope，无需 syncFields）——架构满足，确认锁定。

## Current Baseline

> 来源：2026-06-26 独立子 agent 对 `packages/flux-renderers-form-advanced/src/`（array-field、combo、composite-field）、`packages/flux-runtime/src/`（form-runtime、external-errors、validation）、`docs/architecture/array-field.md`、`docs/components/combo/design.md`、`docs/architecture/value-adaptation-and-detail-field.md` 的 live-repo 审计。下列 file:line 引用均已核对。

### 逐条现状

- **C1（嵌套 combo 写隔离到 index-addressed 子路径）— 实现（prefix-projection），TEST-GAP + DESIGN-GAP。** `createItemScope`（`array-field-runtime.ts:6-45`）以 `itemPrefix = ${arrayPath}.${index}` 投影每项，所有读写经 `parentScope.get/update(${itemPrefix}...)`；`createItemFormProxy`（`:47-74`）经 `prefixPath` → `${arrayPath}.${index}.${path}` 前缀所有 form 路径。嵌套 combo 在 item 内相对父 item 投影 scope 解析自身 `arrayPath`，得 `${parent}.${i}.${child}.${j}`。跨行串扰结构上不可能（每 item scope/form 是共享父 owner 上的隔离前缀投影）。测试 `array-field-runtime.test.ts:94-113`（scalar `update('value')`→`items.0`）、`:160-188`（object `update('name')`→`contacts.0.name`）、`:349-359`（nested-array 委托 `appendValue('phones')`→`contacts.0.phones`）；**无 2 级 combo-in-combo 隔离测试**。`array-field.md:107-124,206-218` 描述 index-addressed 路径；**沉默**于嵌套 combo 隔离保证。
- **C2（嵌套子读父行字段做级联）— LOCK，架构满足（词法 owner-scope 继承）。** `createItemScope`（`array-field-runtime.ts:19-44`）经 `createProjectedOwnerScope` 发布 owner scope；`getNestedValue`/`getAdditionalPath` 读 `parentScope.get(${itemPrefix}.${path})`，故子可经投影 owner scope 读父行字段。无 `syncFields` 钮。测试 `array-field-runtime.test.ts:145-149`（nested value 读）、`composite-form-object-array.test.tsx:325-359`（scope-selector-probe 读 value/index）、`combo-renderer.test.tsx:57-84`（item 字段编辑反映）；无显式「改父行字段 → 子 `when` 反应」级联测试。`array-field.md:167-177` 记参数化 region 绑定 + owner scope 均须可见。NOT-ADOPTED `syncFields` 由投影 scope 设计拒绝成立。
- **C3（per-row delete 经 item-scoped `when` 条件禁用）— FEATURE-GAP，无实现。** `removeItem` handle（`combo-renderer.tsx:410-427`）仅检 `index` 边界 + `itemsArray.length <= minItems`（field-global 地板）。remove 按钮 disabled 态 field-global：`combo-renderer.tsx:155` `canRemove = totalCount > minItems`、`:203` `disabled={readOnly || !canRemove}`。复合 handle `removeItem` 仅受 `{index}`（`composite-field-handles.test.tsx:62-71,125-149`）。`array-field.tsx:466-485` `handleRemove` 同样无 per-row 条件。**无任何 item-scoped `when` 门控**。测试 `combo-renderer.test.tsx:190-203`（minItems 地板禁用，field-global）。`combo/design.md` §4/§8 沉默于 per-row delete `when`。
- **C5（外部错误行级/叶级寻址 + undefined-target 不崩）— 实现（nested/array 路径处理），TEST-GAP + DESIGN-GAP。** 外部错误路径解析：`form-runtime.ts:363-365` → `form-runtime-owner.ts:194-213` `applyExternalErrors` → `form-runtime-owner-external-errors.ts:105-122` `storeOwnedExternalErrors`（按 `isPathOwned` 过滤）+ `:10-35` `rebuildStoreErrorsFromExternal`。`isPathOwned`（`form-runtime.ts:347-350`）= flat dotted-prefix 匹配，故 `items.1`（行）、`items.0.sku`（叶，含穿 containers/tabs `items.2.tabs.t.sku`）均被 root form 拥有并附到 `fieldStates[path]`。array 变更时 `form-runtime-array.ts:259` 调 `remapExternalErrors` → `form-path-state.ts:7-36` `transformArrayIndexedPath` 重映射嵌套 index 路径。**undefined-target 不崩**：错误以 path 为键存入 `externalErrors` map 并并入 `fieldStates[path]`，不论字段是否注册（`form-runtime-owner-external-errors.ts:26-32`）。测试 `form-runtime-array.test.ts:223-244`（remove 时 `items.1.name` remap）、`form-path-state.test.ts:5-13`（`contacts.1.email`）；**无**应用行级/叶级/穿容器外部错误并断言附着 + undefined-target 不崩的测试。`array-field.md:206-218` 描述 index-addressed 路径；**沉默**于外部/服务端错误寻址与 undefined-target 处理。
- **C7（add/scaffold 新空行不浮现 required 校验）— 实现（showErrorOn 门控），TEST-GAP + DESIGN-GAP。** `array-field.tsx:446-464` `handleAdd` → `appendValue` 后 `if (shouldValidateOn) validateSubtree('change')`；`combo-renderer.tsx:335-341` `handleAdd` → `writeValue` 后 `validateField('change')`。错误**可见性**由 `showErrorOn`（默认 `['touched','submit']`）门控，故新加未触行的 required 错误不浮现，直至触行/编辑或 submit。测试 `form-array-validation.test.tsx:273-308`（submit 时 validateOn 不发布父 array 校验）覆盖 array-level `minItems`，**非** per-row required-on-add；无聚焦「add 空 required 行 → 无错；编辑+清空 → 错；submit → 全行校验」测试。`array-field.md`/`combo/design.md` **沉默**于 add-vs-validate 时序。
- **C9（item 提交值仅含声明子字段）— 实现（transient source state 不写入 values），TEST-GAP + DESIGN-GAP。** data-source `options` 作为 **transient** `SourceTransientState` 交付在 `props.props.optionsSourceState`，**不写入** form scope values（`input.tsx:483,534,547` `sourceStateKey:'optionsSourceState'`；`input-choice-renderers.tsx:205`、`checkbox-group-renderer.tsx:31`）。item 字段写仅经投影 item scope 的 `update()`（`array-field-runtime.ts:24-32`），故仅声明子字段写落入 array 值；transient option payload 永不入提交值。**无**「item 含 select 其 options 来自 per-item data-source → 提交值仅含声明字段」测试。`combo/design.md` §7/`array-field.md` **沉默**于提交值对 transient payload 的过滤。
- **C10（hidden 字段默认排除出提交）— FEATURE-GAP / LIVE-DIVERGENCE（与 C10 提议相反）。** 提交直接读 `store.getState().values` **无 hidden 字段过滤**：`form-runtime-submit-flow.ts:360` `() => Promise.resolve({ ok:true, data: store.getState().values })`；`form-component-handle.ts:72` `getValues` → `form.store.getState().values`。唯一 hidden-value 机制是 `clearValueWhenHidden`（`form-runtime-field-ops.ts:383-414,435-437`），**清存储值**（隐藏时），且**默认 `false`**（`hidden-field-policy.test.ts:83,89,108`）。故默认 hidden 字段值**保留**在 store 并**包含**进提交。**无**「排除出提交但保留在 store」机制。测试 `hidden-field-policy.test.ts:465-535`（`clearValueWhenHidden=true` 清值，opt-in）；无提交排除测试（因特征不存在）。owner doc 沉默。注：companion V19（B1.2 已收口）覆盖校验参与排除，**非**提交 payload 排除。
- **C12（编辑单 item 仅重渲染该行子树）— 实现 + 部分测试，TEST-GAP（无 render-count 断言）。** `array-field.tsx:182-198` `ArrayItem = React.memo(...)` 自定义比较器（`itemIdentity`、`item`、`index`、`parentForm`…）+ `key={itemIdentity}`（`:583`）；`combo-renderer.tsx:218-236` `ComboItem = React.memo(...)`。稳定 `itemKey`（`array-field.tsx:48-93` `buildObjectArrayItemKeys`；`combo-renderer.tsx:51-79`）跨 reorder 保身份；结构共享值更新使仅编辑行 `item` prop ref 变，兄弟跳过重渲染。`array-field.tsx:349-359` 记录 item-locality 不变量。测试 `array-field-object-items.test.tsx:296-362`（`itemKey` 下 page-data reorder 身份稳定）；**无** render-count 断言（如 50 items，编辑 row 25 → 仅一行重渲染）。`array-field.md:101-126` 描述 itemKey 连续性。
- **C13（per-item action 回写到 index-addressed path + 不禁用兄弟行）— 部分实现，TEST-GAP + DESIGN-GAP。** item scope 内运行的 action 经投影 item scope 的 `update()` → `parent.update(${itemPrefix}.${path})`（`array-field-runtime.ts:24-32`）回写，故 per-item action 返回数据可定向 `${name}.${i}.*` 并反映到父 array 值。但**无显式 per-item action-result→item-path 回写 helper**，且**无 per-item loading-state 机制**隔离单行 async loading 不禁用兄弟（async 治理 per-request/scope；combo/array-field item affordance 不携带 per-row loading flag）。**无** per-item action 回写 / 兄弟不禁用测试。`array-field.md` Lifecycle 沉默。
- **V6（array 行本地相对跨字段寻址）— 仍为 GAP，确认 B1.2 结论。** 跨字段校验用绝对/root-relative `input.scope.get(input.rule.path)`（`validators.ts:191,204,217,227`——`equalsField`/`notEqualsField`/`requiredWhen`/`requiredUnless`）。array-field 的 `getChildFieldPathPrefix()` 返回 **`false`**（`array-field.tsx:633`），故 item 子字段**不**被收集进父 form 的静态校验模型——`packages/flux-compiler/src/schema-compiler/validation-collection.ts:183-185` 停止遍历。item 子校验改为经投影 form 的运行时字段注册。投影校验 runtime（`projected-validation-runtime.ts:280-321`）为 validateAt/applyExternalErrors 前缀路径，但规则执行的 `input.scope` 是父 owner scope，跨字段 `rule.path`（以相对兄弟名编写）解析到 **root** 而非当前行。`packages/flux-core/src/utils/path-binding.ts:14-63` `toAbsolute`/`toRelative`/`owns` 仅服务静态前缀投影 owner（object/detail/variant）；array 行实例动态 per-index，不作为 path-binding context 表示。测试 `validation-collection.test.ts:320`（`getChildFieldPathPrefix` 返回 false 停止遍历）；**无**行本地相对跨字段引用测试。`array-field.md:206-218` 记路径为 index-addressed absolute，**不**描述行本地相对引用。

### 相关测试文件（主要）

`packages/flux-renderers-form-advanced/src/`：`composite-field/array-field.test.tsx`、`array-field-object-items.test.tsx`、`array-field-runtime.test.ts`、`array-field-schema-coverage.test.tsx`、`__tests__/combo-renderer.test.tsx`、`__tests__/composite-form-object-array.test.tsx`、`__tests__/form-array-validation.test.tsx`、`__tests__/array-keyvalue-min-max-reorder.test.tsx`、`__tests__/composite-field-handles.test.tsx`。`packages/flux-runtime/src/__tests__/`：`form-runtime-array.test.ts`、`form-runtime-array-ops.test.ts`、`form-path-state.test.ts`、`hidden-field-policy.test.ts`、`form-runtime-submit-flow.test.ts`。

## Goals

- **C10**：裁定 hidden 字段提交排除——**推荐裁定 B（文档化为 Flux 刻意契约）**：live 默认「hidden 字段保留值并包含进提交；`clearValueWhenHidden`（opt-in）隐藏时清存储值」是 Flux 刻意选择（避免改变所有既有表单默认提交 payload 的高 blast radius；Flux 已提供显式清除机制；「hide ≠ clear」值保留已满足）。C10 提议的「排除出提交但保留在 store」是 distinct semantics、当前未建模，记为 candidate future feature / successor（submit-payload-projection）。owner doc **必须**显式化该契约。锁定当前行为（hidden 字段值在提交；`clearValueWhenHidden=true` 排除）。
- **C3**：裁定 per-row delete `when`——**推荐裁定 A（Fix，实现）**：为 removeItem handle 引入 item-scoped `when`（如 `removeWhen` 表达式）per-item 求值；remove 按钮 disabled 态并入。`when` 是 Flux 规范机制、P1 高频真实需求、显式在 B3.2 范围。failing-test 先行。
- **V6**：裁定 array 行本地相对寻址——**裁定 B（文档化为 DESIGN-ACK-NOT-IMPL）**：array 行使用绝对 index-addressed 路径是 Flux 契约（`getChildFieldPathPrefix` 返回 false 是有意——item 子校验经投影 form 运行时注册，非静态模型）；行本地相对跨字段引用当前不支持，记为 candidate future feature / successor（涉及 validation-collection + path-binding + 投影 runtime 的架构性改动）。确认并关闭 B1.2 deferred。
- **C1/C5/C7/C9/C12/C13**：各落聚焦回归锚钉住当前正确行为；若 Proof 在 live 失败即升级 Fix（C1/C5/C7/C9/C12 预期 green；C13 per-item loading 隔离无机制但无 field-global flag——记录当前）。
- **C2**：确认 LOCK + 最小 Proof（级联可读性）。
- owner doc（`array-field.md`、`combo/design.md`、`form-validation.md`）同步全部裁定，与 live code 一致，无「Proposed vs Current」叙事。

## Non-Goals

- 不实现 V6 行本地相对寻址（架构性改动，裁定为 DESIGN-ACK-NOT-IMPL + successor）。
- 不实现 C10 提交时 hidden 字段排除（裁定为刻意保留 + successor；提交 payload 投影是新功能，非已声称属性测试债）。
- 不改 `showErrorOn` 显示策略本身（C7 仅靠其门控成立）。
- 不重开 B1.1/B1.2 已锁定/已收口的校验闭包（V1/V2/V16/V22、V3-V23）。
- 不引入 amis 式 `multiLine`/`canAccessSuperData`/`strictMode`/`syncFields`/packed `msg`（NOT-ADOPTED，见 `04` NOT-ADOPTED 表）。
- 不覆盖 array reorder/move（C11，P2，`sortable` 未落地）与 scalar-array（C15，P2）——归 B7/backlog。

## Scope

### In Scope

- C1 嵌套写隔离 Proof + doc。
- C2 LOCK 确认 + Proof。
- C3 per-row delete `when` 裁定（推荐 Fix）+ 实现 + 测试 + doc。
- C5 外部错误行/叶级寻址 + undefined-target Proof + doc。
- C7 add 不校验新行 Proof + doc。
- C9 提交值仅含声明字段 Proof + doc。
- C10 hidden 提交排除裁定（推荐文档化为刻意契约）+ owner doc 显式化 + 锁定 Proof。
- C12 per-item 重渲染隔离 Proof（render-count 断言）。
- C13 per-item action 回写 Proof + doc；per-item loading 隔离记录当前。
- V6 行本地相对寻址裁定（DESIGN-ACK-NOT-IMPL）+ doc + 关闭 B1.2 deferred。

### Out Of Scope

- V6 行本地相对寻址实现（架构性 → successor）。
- C10 提交 payload 投影实现（新功能 → successor）。
- C11（reorder/move，P2，`sortable` 未落地）/ C14（maxItems 表达式，P2）/ C15（scalar-array，P2）—— B7/backlog。
- B1.1/B1.2 范围。

## Failure Paths

> 涉及外部错误寻址、hidden 提交 payload、per-row delete 门控，参考本节。

| 场景编号           | 触发                                                                        | 行为（依 Phase 裁定）                                                                                                                                   | 可重试 | 用户可见表现                         |
| ------------------ | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------ |
| C10-hidden-submit  | 表单含 `when` 隐藏的字段（值已填），提交                                    | 裁定 B（推荐）：hidden 字段值**保留并包含**进提交 payload；`clearValueWhenHidden:true` 时隐藏即清存储值故不入提交。裁定 A：默认排除出提交（保留 store） | n/a    | 依裁定：hidden 值在/不在提交         |
| C3-remove-when     | array 含 echoed+新增混合行，`removeWhen` 禁用 echoed 行                     | 裁定 A（推荐）：echoed 行 remove 按钮 disabled、新增行可删；删新增行成功                                                                                | n/a    | echoed 行无删除按钮/灰禁；新增行可删 |
| C5-external-error  | 应用外部错误 `items.1`（行级）、`items.0.sku`（叶级）、`items.2.tabs.t.sku` | 各路径附着到对应行/叶字段、高亮；undefined-target 不崩                                                                                                  | n/a    | 对应行/叶字段红字高亮                |
| C7-add-no-validate | item 模板含 required 字段，点 add 新空行                                    | 新行无 required 错误浮现；编辑该行+清空 → 错误；submit → 全行校验                                                                                       | n/a    | add 后无红字；交互/submit 后浮现     |
| V6-row-relative    | array 行内规则以相对兄弟名引用（如 `equalsField:'siblingCol'`）             | 裁定 B：解析到 root（非当前行），规则不按预期作用；文档化为不支持，须用绝对 `items.${i}.x` 路径（authoring 时不可知 → 记 successor）                    | n/a    | 跨字段规则不作用（文档化限制）       |

## Test Strategy

本档选择：**必须自动化**

理由：C3 是确认的特征缺口（裁定为 Fix 则需 failing-test 先行）；C10 是确认的契约分叉（裁定须锁定当前行为或验证新行为）。依 guide「必须自动化」档：C3（若裁定 A）Proof 必先于 Fix。C1/C5/C7/C9/C12/C13/C2 多为 TEST-GAP 锁定 + doc，预期直接 green（实现已建模），但 C5（穿容器寻址）、C12（render-count）有非平凡断言。V6/C10 裁定 B 属 Decision + 锁定 Proof（预期 green）。

## Execution Plan

### Phase 1 - 缺口裁定与 failing-test 先行（C10 / C3 / V6）

Status: completed
Targets: `docs/architecture/array-field.md`、`docs/components/combo/design.md`、`docs/architecture/form-validation.md`（裁定记录）、`packages/flux-renderers-form-advanced/src/__tests__/`（failing test）

- Item Types: `Decision`、`Proof`

- [x] (Decision, C10) 裁定 hidden 字段提交排除：**推荐裁定 B**——live 默认「hidden 字段保留值并包含进提交；`clearValueWhenHidden`（opt-in）隐藏时清存储值」是 Flux 刻意契约。理由：改变所有既有表单默认提交 payload 是高 blast radius；Flux 已有显式清除机制（`clearValueWhenHidden`）；「hide ≠ clear」值保留已满足；提交时投影排除（保留 store）是 distinct semantics、当前未建模。C10 提议记为 candidate future / successor（submit-payload-projection）。owner doc **必须**显式化该契约（`form-validation.md` 或 `array-field.md`）。若 live 审计/产品判断认为提交排除应为默认，退回裁定 A（须给明确理由 + 评估 blast radius）。
- [x] (Proof, C10) 锁定测试（裁定 B）：表单含 `when` 隐藏字段（值已填）→ 提交 payload **包含**该值；`clearValueWhenHidden:true` → 隐藏即清、提交 payload **不含**。预期 green。若裁定 A：failing test（提交默认不含 hidden 值）先红。
- [x] (Decision, C3) 裁定 per-row delete `when`：**推荐裁定 A（Fix）**——为 removeItem handle 引入 item-scoped `when`（如 schema `removeWhen` 表达式，per-item 经 item scope 求值）；remove 按钮 disabled 态 = `readOnly || atMinItems || (removeWhen && !truthy(eval(removeWhen, itemScope)))`。理由：`when` 是 Flux 规范机制、P1 高频真实需求、显式在 B3.2 范围；实现局部（handle + 按钮 disabled 态）。记录到 `combo/design.md` §4/§8 + `array-field.md`。若裁定发现需新 handle API 契约过大，退回裁定 B（DESIGN-ACK-NOT-IMPL + successor）。
- [x] (Proof, C3) 若裁定 A：failing test——array 含 echoed（`removeWhen` 为真禁用）+ 新增行 → echoed 行 remove disabled、新增行可删、删新增行成功。先红。若裁定 B：无 failing test。
- [x] (Decision, V6) 裁定 array 行本地相对寻址：**裁定 B（DESIGN-ACK-NOT-IMPL）**——array 行使用绝对 index-addressed 路径是 Flux 契约（`getChildFieldPathPrefix` 返回 false 有意——item 子校验经投影 form 运行时注册，非静态模型）；行本地相对跨字段引用不支持，记 candidate future / successor（涉及 validation-collection + path-binding + 投影 runtime 架构性改动）。确认并关闭 B1.2 deferred。记录到 `array-field.md` + `form-validation.md`。
- [x] (Proof, V6) 锁定测试（裁定 B）：array 行内跨字段规则以相对兄弟名编写 → 解析到 root（非当前行），规则不按 row-local 预期作用；文档化「须用绝对路径」。预期 green（钉住当前绝对解析行为）。

Exit Criteria:

> 本 Phase 产出裁定 + 先红测试（C3 若裁定 A，及 C10 若裁定 A），不改实现（C3 Fix 留 Phase 2）。

- [x] C10/C3/V6 三条 Decision 已记录到对应 owner doc（裁定结论，非叙事）。
- [x] C3 failing test（若裁定 A）已落地且为红；C10 failing test（若裁定 A）已落地且为红；裁定 B 项的锁定测试落地（预期 green）。

### Phase 2 - Fix C3（per-row delete `when`，若裁定 A）

Status: completed
Targets: `packages/flux-renderers-form-advanced/src/combo-renderer.tsx`（`removeItem` handle、按钮 disabled）、`composite-field/array-field.tsx`（`handleRemove`）、`composite-field/remove-when-gating.ts`（共享求值）、`composite-field/composite-schemas.ts`（schema 类型）、handles 配置/schema

- Item Types: `Fix`、`Proof`

- [x] (Fix, C3) 若裁定 A：为 removeItem 引入 item-scoped `when`（schema `removeWhen` 表达式，`kind:'ignored'` 保留 raw，per-item 经 item scope 求值）；remove 按钮 disabled 态并入（echoed/persisted 行可禁用、新增行可删）；`minItems` field-global 地板保留。combo-renderer + array-field 两路径同步（共享 `remove-when-gating.ts`）。component:removeItem handle 与 handleRemove 均并入 `isRemoveBlockedAt` 门控。若裁定 B：跳过（N/A）。
- [x] (Proof, C3) 若裁定 A：Phase 1 的 C3 failing test 转 green；补负向（无 `removeWhen` 时所有行可删直到 minItems；`removeWhen` 为假时行可删；array-field 路径同步）。

Exit Criteria:

> 本 Phase 交付 C3 条件 Fix。

- [x] C3（若裁定 A）per-row delete `when` 落地、failing test green + 负向 green；裁定 B 则 doc 已记、N/A。

### Phase 3 - TEST-GAP 锁与 doc 显式化（C1 / C2 / C5 / C7 / C9 / C12 / C13）

Status: completed
Targets: `packages/flux-renderers-form-advanced/src/__tests__/`、`packages/flux-runtime/src/__tests__/`（锚）、`docs/architecture/array-field.md`、`docs/components/combo/design.md`

- Item Types: `Proof`、`Decision`

- [x] (Proof, C1) 新增测试：2 级嵌套 object-array（combo-in-combo）；编辑 row 0 的子项 → row 1 子项不受影响（无跨行串扰）；锁定 prefix-projection 隔离（`array-field-runtime.ts` `createItemScope`）。`b32-array-combo-nested-isolation.test.tsx`。
- [x] (Proof, C2) 新增测试：嵌套子读父行字段经 owner scope；改父行字段 → 子项 `visible`/级联可读反应（锁定词法继承）。`b32-array-combo-nested-isolation.test.tsx`。
- [x] (Proof, C5) 新增测试：应用行级错误 `items.1` + 叶级 `items.0.sku` + 穿容器/Tab `items.2.tabs.t.sku` → 各附着高亮、无 throw；undefined-target（`items.999.unknown`）不崩；remove 后 index remap。锁定 `form-runtime-owner-external-errors.ts` + `form-path-state.ts`。`form-runtime-external-errors-addressing.test.ts`。
- [x] (Proof, C7) 新增测试：item 模板含 required 字段（array-editor）；点 add 新空行 → 无 required 错误浮现；编辑该行+清空 → 错误；submit → 全行校验。锁定 `showErrorOn` 门控。`b32-array-submit-and-validate.test.tsx`。
- [x] (Proof, C9) 新增测试：item 含 select，options 来自 per-item data-source（transient `optionsSourceState`）；提交 → 提交值**仅含声明子字段**、不含 transient option payload。锁定 transient state 不写入 values。`b32-array-submit-and-validate.test.tsx`。
- [x] (Proof, C12) 新增测试：大 array-field（30 items）；编辑 row 中部一项 → 仅该行子树重渲染（render-count 断言，兄弟行 render count 不增）。锁定 `React.memo` 自定义比较器 + `itemKey` 身份。`b32-array-combo-nested-isolation.test.tsx`。
- [x] (Proof, C13) 新增测试：per-item action 返回数据 → 经投影 item form 回写到 `${name}.${i}.*` 并反映到父 array 值；该行 action 不禁用兄弟行（兄弟仍可交互）。锁定 `array-field-runtime.ts` 投影回写 + 无 field-global loading flag。`b32-array-combo-nested-isolation.test.tsx`。
- [x] (Decision) 所有 Proof 在 live 通过（C1/C2/C5/C7/C9/C12/C13 均 green，无需升级 Fix；C13 per-item loading 隔离：无 field-global loading flag，兄弟不被禁用，已锁定）。
- [x] (Decision) 同步 owner doc：C1（嵌套写隔离保证）、C5（外部错误行/叶级寻址 + undefined-target）、C7（add-vs-validate 时序）、C9（提交值仅声明字段）、C12（per-item 重渲染隔离 + itemKey）、C13（per-item action 回写 + per-item loading 无 field-global flag）已显式化于 `array-field.md`，与 live code 一致。

Exit Criteria:

> 本 Phase 交付 C1/C2/C5/C7/C9/C12/C13 回归锚 + owner doc 显式化。

- [x] C1/C2/C5/C7/C9/C12/C13 七条 Proof 测试存在并通过（或失败已升级 Fix 并 green）。
- [x] `array-field.md`/`combo/design.md` 对应 DESIGN-GAP 已显式化且与 live code 一致。

### Phase 4 - owner doc 收口同步

Status: completed
Targets: `docs/architecture/array-field.md`、`docs/components/combo/design.md`、`docs/architecture/form-validation.md`

- Item Types: `Decision`、`Proof`

- [x] (Decision) 收口同步 owner doc：C10（hidden 提交契约，刻意保留 + `clearValueWhenHidden` opt-in + submit-payload-projection successor）、C3（per-row delete `removeWhen`，裁定 A 实现契约记录于 `array-field.md` + `combo/design.md` §4/§8）、V6（行本地相对 DESIGN-ACK-NOT-IMPL + successor）、C1/C5/C7/C9/C12/C13（显式化于 `array-field.md`）与 live code 一致，无「Proposed vs Current」叙事。
- [x] (Proof) 抽查修改后的 owner doc 与 live code 一致：`array-field-runtime.ts` prefix-projection（C1）、`form-runtime-owner-external-errors.ts` 寻址（C5）、`form-runtime-submit-flow.ts:360` 提交直读 `store.getState().values`（C10）、`clearValueWhenHidden` 默认 false（C10）、`array-field.tsx` `getChildFieldPathPrefix` false（V6）、C3 `removeWhen` 已实现于 combo-renderer + array-field。

Exit Criteria:

- [x] 三 owner doc 全部裁定/契约已收口且与 live baseline 一致。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 guide 的 `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子 agent（fresh session，task `ses_0ff4b9c0affeAM61Hbqzzhh5EF`）
- Verdict: `pass-with-minors`
- Rounds: 1（零 Blocker / 零 Major，一轮达成共识）
- Findings addressed:
  - Minor 1（`path-binding.ts:14-63` 引用缺 `packages/flux-core/src/utils/` 前缀）→ 已修正为全路径（行号正确）。
  - Minor 2（`validation-collection.ts:183-185` 引用缺 `packages/flux-compiler/src/schema-compiler/` 前缀，非 flux-runtime）→ 已修正为全路径（行号正确）。
  - Minor 3（三条「推荐裁定」C10→B/C3→A/V6→B 带 A/B fallback；Draft Review 确认后建议 collapse 为单一裁定）→ 不阻塞；执行者在 Phase 1 Decision 落定单一裁定，避免 closure 歧义。
  - 审阅者确认：所有关键 file:line 经 live repo 核对准确（C10 分歧真实——submit 直读 `store.getState().values` 无 hidden 过滤、`clearValueWhenHidden` 默认 false 清存储值、无「排除出提交但保留 store」语义；C3 feature-gap 真实——removeItem 仅 minItems 地板无 item-scoped when；V6 仍为 gap——`getChildFieldPathPrefix` 返回 false、跨字段校验绝对 scope.get、path-binding 仅静态前缀 owner、B1.2 显式 deferred V6→B3.2；C5/C1/C12/C9 实现核对通过）；owner doc 均存在；Anti-Slacking 诚实——C10/V6 为 Flux 从未声称的 amis-parity feature gap，分类为刻意契约/DESIGN-ACK-NOT-IMPL + 明确理由 + successor（B7），非静默延期 live defect；C3（唯一推荐 Fix）含 failing-test-first 完整 phasing；模板完整、范围精确对应 B3.2 工作项（单一 owner 结果面）。

## Closure Gates

> 关闭条件：本 section 所有条目及每个 Phase Exit Criteria 全 `[x]` 后，方可将 `Plan Status` 改为 `completed`。

- [x] C10 hidden 提交裁定已落地（裁定 A 则 Fix + 测试；裁定 B 则锁定 + doc）。
- [x] C3 per-row delete `when` 裁定已落地（裁定 A 则 Fix + 测试；裁定 B 则 doc）。
- [x] V6 行本地相对寻址裁定已文档化（DESIGN-ACK-NOT-IMPL + successor），B1.2 deferred 已关闭。
- [x] C1/C2/C5/C7/C9/C12/C13 回归锚通过（或失败已升级 Fix 并 green）。
- [x] owner doc（`array-field.md`/`combo/design.md`/`form-validation.md`）与 live baseline 一致。
- [x] 不存在被静默降级到 deferred/follow-up 的 in-scope live defect 或 contract drift（C3 若裁定为缺陷必须 landed；C10/V6 为特征缺口经裁定为刻意契约/DESIGN-ACK-NOT-IMPL，Decision 有明确理由，未降级 live defect）。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### V6 array 行本地相对跨字段寻址（关闭 B1.2 deferred）

- Classification: `out-of-scope improvement`（显式 successor 所有权）
- Why Not Blocking Closure: live 无行本地相对寻址机制——`getChildFieldPathPrefix` 返回 false（`array-field.tsx:633`）有意，item 子校验经投影 form 运行时注册（非静态模型）；跨字段校验用绝对 `scope.get(rule.path)`（`validators.ts:191,204,217,227`）；`path-binding.ts` 仅服务静态前缀 owner。array 行用绝对 index-addressed 路径是 Flux 契约（owner doc 将显式化），行本地相对引用是 amis-parity 特征、Flux 从未声称。本工作项的嵌套隔离/寻址契约（C1/C5）独立于行本地相对，均已落地或在本计划收口。确认并关闭 B1.2 Deferred V6（successor B3.2 = 本计划）。
- Successor Required: `yes`
- Successor Path: `docs/components/amis-bug-driven-improvement-roadmap.md` B7（如未来评估值得实现行本地相对寻址，涉及 validation-collection + path-binding + 投影 runtime 架构性改动）。

### C10 提交时 hidden 字段排除（submit-payload-projection）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: live 默认「hidden 字段保留值并包含进提交」经裁定为 Flux 刻意契约（裁定 B），owner doc 将显式化；`clearValueWhenHidden`（opt-in）提供显式清除路径。C10 提议的「排除出提交但保留 store」是 distinct semantics、当前未建模，属新功能非已声称属性测试债。改变默认提交 payload blast radius 高，故记 successor。
- Successor Required: `yes`
- Successor Path: `docs/components/amis-bug-driven-improvement-roadmap.md` B7（如产品判断需提交时投影排除，评估为新功能工作项）。

## Non-Blocking Follow-ups

- C4（per-row add/sort gating when `sortable` lands，P2 #3269）归 B7/backlog，待 `sortable` 落地。
- C6（unique 约束重校验不踩兄弟值，P2 #1729）归 B7/backlog 评估。
- C8（乱序 add/scaffold 不产生数组洞，P2 #3511/#793）归 B7/backlog。
- C11（reorder/move 一致性，P2 #3269，`sortable` 未落地）、C14（maxItems 表达式响应，P2）、C15（scalar-array editor，P2）归 B7/backlog。

## Closure

Status Note: B3.2 收口完成。C3 per-row delete `removeWhen` 已实现（combo + array-field，item-scoped 表达式门控，fail-open）；C10 hidden 提交契约裁定 B（刻意保留 + clearValueWhenHidden opt-in）已锁定 + 文档化；V6 行本地相对寻址裁定 B（DESIGN-ACK-NOT-IMPL，successor B7）已文档化，B1.2 deferred 关闭；C1/C2/C5/C7/C9/C12/C13 七条回归锚全 green，owner doc 显式化。full-green（typecheck/build/lint/test workspace 全过）。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh-session 子 agent `ses_0fee5435fffeFzfwc9s0j5WG7Q`（执行 session 不自审）
- Evidence: VERDICT `pass`（零 Blocker / 零 Major）。核对：plan 4 Phase 全 `completed` + 全 `[x]`；Deferred（V6/C10）honest（`out-of-scope improvement` + successor B7 + non-blocking 理由，无 in-scope defect 降级）；C3 live 落地核对（`remove-when-gating.ts` 纯求值 fail-open、combo/array-field raw 读 `props.schema` + `kind:'ignored'` + `removeBlockedByIndex` 投影求值 + 按钮/handle 门控，gating `!result` 匹配 plan）；C10/V6 doc↔code 一致（`form-runtime-submit-flow.ts:360` 直读 values、`array-field.tsx` getChildFieldPathPrefix false）；无 src 产物泄漏；re-run focused tests green（form-advanced b32- 95 files/855 passed、runtime 1236 passed）；owner doc 抽查 C10 ↔ `form-runtime-field-ops.ts` clearValueWhenHidden 默认 false 一致。1 minor（array-field.md 公式 atMinItems 措辞，仅 combo 有 minItems）已处理（doc 已澄清）。

Follow-up:

- V6 行本地相对跨字段寻址 + C10 submit-payload-projection → successor B7（out-of-scope improvement，非 plan-owned defect）。
- C4/C6/C8/C11/C14/C15 归 B7/backlog（P2，Non-Blocking Follow-ups）。
- successor B3.3（table 高级能力）依赖 B3.1+B3.2，可推进。
- 无剩余 plan-owned work。
