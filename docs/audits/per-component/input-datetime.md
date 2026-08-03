# 审计卡：input-datetime（flux-renderers-form）

> 状态: closed
> 审查日期: 2026-08-03
> 审查 plan: `docs/plans/2026-08-03-0517-2-c2-4-form-date-family-audit.md`
> 注册定义: `packages/flux-renderers-form/src/renderers/date-renderer-definitions.ts:58-79` | 渲染器: `packages/flux-renderers-form/src/renderers/input-datetime-renderer.tsx` | 共享控件: `packages/flux-renderers-form/src/renderers/date/date-field-control.tsx` | design.md: `docs/components/input-datetime/design.md` | playground: `apps/playground/src/component-lab/renderers/input-datetime-lab-page.tsx` | e2e: `tests/e2e/w2b-date-family.spec.ts`、`tests/e2e/component-lab/c2-4-host-surfaces.spec.ts`

## 组件身份

input-datetime / flux-renderers-form / InputDatetimeSchema（`schemas.ts:328-338`）/ `{type:'input-datetime', name}` / 表单参与: 是 / widget 控件 renderer（`wrap: true`）

## 18 维审查记录

| #   | 维度                        | 结论 | 证据                                                                                                                                                                                                                                                                             | 发现                                                                                                                                                          |
| --- | --------------------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Schema 契约                 | fail | 注册 `date-renderer-definitions.ts:58-79`（fields 含 `timeFormat` :67）与 `schemas.ts:328-338`（timeFormat :333）及 design.md §4/§5、`docs/components/input-datetime/example.json:7` 均声明 `timeFormat`；但渲染器从未读取该 prop                                                | **P1-1：`timeFormat` 声明但实现为零行为（契约漂移）**——注册/类型/design 三方声明 vs `input-datetime-renderer.tsx` 无任何引用；author 写 `timeFormat` 静默无效 |
| 2   | RendererComponentProps 合规 | pass | `input-datetime-renderer.tsx:8-30` 仅读 props.props/meta/id；标准 hooks 同上卡                                                                                                                                                                                                   | —                                                                                                                                                             |
| 3   | 值所有权三态                | pass | 同 input-date（共享 DateFieldControl + useFormFieldController）；选日保留时间（`date-field-control.tsx:131-135` handleSelect withTime 分支，input-datetime.test.tsx:61-85）；时间输入 clamp 到 [minDate,maxDate]（:142-169，D9 测试 :144-228）；无 doubling（D12 测试 :113-142） | timeFormat 实现后：秒粒度由 timeFormat 驱动，选日/时/分编辑按 timeFormat 保留或清零秒（P1-1 修复内容）                                                        |
| 4   | 表单参与                    | pass | name/required/validation 同 input-date；提交形状 = valueFormat 字符串；校验错误展示/清除经 FieldFrame                                                                                                                                                                            | —                                                                                                                                                             |
| 5   | DOM 与选择器契约            | pass | 根 marker `nop-input-datetime`（`input-datetime-renderer.tsx:53`）+ data-slot；共享控件 testid 同 input-date；input-date 与 input-datetime 共享 `date-trigger`/`date-popover` testid（宿主测试需按 marker 类 scope，c2-4 spec 已处理）                                           | —                                                                                                                                                             |
| 6   | 嵌套 schema 分类            | pass | 无 deepFields；全 prop 字段；validate.action 统一消费                                                                                                                                                                                                                            | —                                                                                                                                                             |
| 7   | 事件与 action 契约          | pass | onChange payload = valueFormat 字符串；无自定义事件                                                                                                                                                                                                                              | —                                                                                                                                                             |
| 8   | a11y                        | pass | trigger aria 齐备；popover 内 Hour/Minute 输入 aria-label（P1-1 修复后含 Second）走 i18n；键盘路径 react-day-picker + number input                                                                                                                                               | —                                                                                                                                                             |
| 9   | i18n                        | fail | 同 input-date 共享控件硬编码（Hour/Minute/Clear）；Calendar locale 未随语言（CX-7）                                                                                                                                                                                              | **P2-1（shared）：同 input-date P2-1**（date-field-control 共享控件）；**P2-2（shared，CX-7）：Calendar locale**                                              |
| 10  | 四态覆盖                    | pass | 同 input-date（共享控件）；disabled/readOnly → trigger disabled                                                                                                                                                                                                                  | 测试加固随 P2-6（date-i18n.test.tsx）                                                                                                                         |
| 11  | 异步生命周期                | n-a  | 无异步                                                                                                                                                                                                                                                                           | —                                                                                                                                                             |
| 12  | 组合宿主场景                | fail | w2b e2e 覆盖初始值回显（`w2b-date-family.spec.ts:107-112`）；复合提交真机未覆盖                                                                                                                                                                                                  | Phase 3 补（c2-4 host-family-submit 含 datetime 选日 + 时间保留）                                                                                             |
| 13  | 样式契约                    | pass | 同 input-date                                                                                                                                                                                                                                                                    | —                                                                                                                                                             |
| 14  | React 19 规范               | pass | 无冗余 memo/callback；共享控件 useState open 局部态                                                                                                                                                                                                                              | —                                                                                                                                                             |
| 15  | 性能边界                    | pass | 同 input-date；时间输入受控 value 派生自 committed Date（D12 无 doubling 即 key 稳定佐证）                                                                                                                                                                                       | —                                                                                                                                                             |
| 16  | 测试质量                    | pass | input-datetime.test.tsx 7 用例（marker/显示/选日保时间/输时分/D12/D9 clamp 三向）——断言正确行为                                                                                                                                                                                  | 缺 timeFormat 秒粒度用例（P1-1 修复补）；四态缺测（P2-6 补）                                                                                                  |
| 17  | 文档对照                    | fail | design.md §4 声明 `timeFormat` 字段但实现零行为（P1-1 同源）；§10 marker 已实现                                                                                                                                                                                                  | P1-1 修复后 design.md §4 需同步 timeFormat 语义（popover 时间粒度）                                                                                           |
| 18  | 注册、包边界与 IO/安全红线  | pass | 注册+导出（`definitions.ts:15,22`）；playground lab 页存在；无 IO/XSS；复用 @nop-chaos/ui                                                                                                                                                                                        | —                                                                                                                                                             |

## 发现清单

- [P1-1] `timeFormat` 声明但零行为（`schemas.ts:333`、`date-renderer-definitions.ts:67`、design.md §4/§5 vs `input-datetime-renderer.tsx` 无引用）→ 状态: **fixed**（实现为 popover 时间粒度驱动：`timeFormat` 含 `ss` 时渲染秒输入（`date-field-control.tsx` withSeconds），选日/时/分编辑按粒度保留或清零秒；`input-datetime-renderer.tsx` 传 `timeFormat` prop，默认 `HH:mm`；test-first：input-datetime.test.tsx 新增 4 用例先红后绿）
- [P2-1] 共享控件硬编码文案（同 input-date P2-1）→ 状态: **fixed**（共享修复，见 input-date 卡）
- [P2-2] Calendar locale（shared，CX-7）→ 状态: **fixed**（共享修复）
- [P2-6] 四态测试加固 → 状态: **fixed**（date-i18n.test.tsx）
- [P3-1] onFocus/onBlur 挂 PopoverContent（共享，`date-field-control.tsx:217-218`）→ 状态: 卡内记录（P3，归 CR）

## 组合宿主场景（真实浏览器验证）

- 场景: 复合提交（bug 73 模式）| 断言: `c2-4-host-surfaces.spec.ts` host-family-submit（datetime 日历选日 20 → 保留 14:30 → `2024-06-20 14:30` 进 store）| 结果: **pass**
- 场景: 根 marker 真机 | 断言: host-family-markers | 结果: **pass**

## 修复记录

- plan: 同 input-date 卡（Phase 2/3）
- test-first 证据: input-datetime.test.tsx +4（timeFormat 秒输入渲染/秒提交/选日保留秒/默认清零，先红后绿）
- 实现: `date/date-field-control.tsx`（timeFormat prop + withSeconds + 秒输入 + i18n）、`input-datetime-renderer.tsx`（传 timeFormat）、flux-i18n（flux.date.second key）
- 文档: `docs/components/input-datetime/design.md` §4（timeFormat = popover 时间粒度语义 + 示例对齐）
- 验证: form 包 typecheck/build/lint/test 全绿（677→**700 tests**）；e2e c2-4 4/4 + w2b 6/6

## Closure

- 独立 closure audit: **pass** + 证据: `docs/plans/2026-08-03-0517-2-c2-4-form-date-family-audit.md` Closure Audit Evidence
