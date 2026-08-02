# 审计卡：checkbox-group（flux-renderers-form）

> 状态: closed
> 审查日期: 2026-08-03
> 审查 plan: `docs/plans/2026-08-03-0517-1-c2-3-form-choice-control-family-audit.md`
> 注册定义: `packages/flux-renderers-form/src/renderers/input.tsx:626-641` | 渲染器: `packages/flux-renderers-form/src/renderers/checkbox-group-renderer.tsx:19-206` | design.md: `docs/components/checkbox-group/design.md` | playground: `apps/playground/src/component-lab/renderers/checkbox-group-lab-page.tsx` | e2e: `tests/e2e/component-lab/c2-3-host-surfaces.spec.ts`（本族宿主场景新增）

## 组件身份

checkbox-group / flux-renderers-form / CheckboxGroupSchema（`schemas.ts:169-175`）/ `{type:'checkbox-group', name}` / 表单参与: 是（name/required/validation/提交路径）/ widget 控件 renderer（`wrap: true`，FieldFrame 提供 label/校验 chrome + `data-field-*`）

## 18 维审查记录

| #   | 维度                        | 结论 | 证据                                                                                                                                                                                                                                                          | 发现                                                   |
| --- | --------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| 1   | Schema 契约                 | pass | CheckboxGroupSchema: options/checkAll/maxSelected/minSelected/direction（schemas.ts:169-175）；注册 fields（input.tsx:628-635）双侧一致；options allowSource（:630）                                                                                          | —                                                      |
| 2   | RendererComponentProps 合规 | pass | 仅读 props.props/meta；useFormFieldController 标准 hooks（:22-28）；useInputComponentHandle（:40-50）                                                                                                                                                         | —                                                      |
| 3   | 值所有权三态                | pass | checkboxGroupAdapter 保数组身份（input-choice-renderers.tsx:61-71）；三态经 useFormFieldController；选择集/checkAll/max-min 派生（checkbox-group-renderer.tsx:52-119）；约束测试 22 用例（checkbox-group-selection.test.tsx）                                 | —                                                      |
| 4   | 表单参与                    | pass | name/required/validation 挂接；wrapper role=group + aria-label/required/readonly/describedby（:131-135）；错误展示/清除经 FieldFrame；`data-field`/`data-renderer` 契约（field-controls-dom-contract.test.tsx:428-449 区域）                                  | —                                                      |
| 5   | DOM 与选择器契约            | pass | 根 `nop-checkbox-group` marker + `data-slot="checkbox-group-wrapper"`（:125-131）+ checkall/loading/error/item/item-label markers（:137-203）；data-mobile-stack marker（:130）；per-option disabledTip `title` + `data-disabled-tip`（:173-174，E2c 冻结）   | P1-B 已修复（根同时输出 type marker + -wrapper，CX-5） |
| 6   | 嵌套 schema 分类            | pass | options 为 value（allowSource）；checkAll/maxSelected/minSelected/direction 为 prop；无内嵌 action/region；无 deepFields 残留                                                                                                                                 | —                                                      |
| 7   | 事件与 action 契约          | pass | onCheckedChange → toggleOption/commit → handlers.onChange（:71-107）；checkAll 派生无外部 action 组合；onFocus/onBlur 走 field handlers（:154-156,183-193）                                                                                                   | —                                                      |
| 8   | a11y                        | pass | wrapper role=group + aria-label；item Checkbox 带 aria-label=option.label + aria-invalid/describedby/errormessage（:176-182）；checkAll aria-label=`t('flux.common.selectAll')`（:153）；**form Enter 排除 role=checkbox（form.tsx:672，C2.1 交棒项已闭合）** | P1-C 已修复（排除清单扩展 + defaultPrevented 兜底）    |
| 9   | i18n                        | pass | `t('flux.common.loading')`/`t('flux.common.selectAll')`（:140,153,158）；locale keys 存在（en-US.ts:15,29 / zh-CN.ts:6,31）                                                                                                                                   | —                                                      |
| 10  | 四态覆盖                    | pass | loading → `checkbox-group-loading` + 组 disabled（:137-142,62）；error → `checkbox-group-error` role=alert（:199-203）；maxSelected 禁用未选项（:164-165）；minSelected 阻止取消（:89-91）；readOnly 经 aria-readonly + presentation.interactive 门控（:76）  | —                                                      |
| 11  | 异步生命周期                | n-a  | 无组件内异步（optionsSourceState 由 data-source 层管理）                                                                                                                                                                                                      | —                                                      |
| 12  | 组合宿主场景                | pass | 单测丰富（checkbox-group-selection 22 用例 + dom-contract + touch-adaptation）+ 真机 host-choice-submit（tags=['stable','beta'] 数组进 valuesPath，"stable,beta" 回显）                                                                                       | Phase 3 完成                                           |
| 13  | 样式契约                    | pass | widget 自样式；wrapper 仅 marker + 布局类 + meta.className；无 BEM；`check:audit-styling-suspects` 0 命中                                                                                                                                                     | —                                                      |
| 14  | React 19 规范               | pass | 无 memo/callback/effect 镜像；checkAllState 渲染期派生（:109-119）；无 key 不稳定（getChoiceOptionKey）                                                                                                                                                       | —                                                      |
| 15  | 性能边界                    | pass | useBoundFieldValue paths 订阅；options map O(n)；isSelected 每项 Object.is 扫描 O(n)（选项规模小，可接受）                                                                                                                                                    | —                                                      |
| 16  | 测试质量                    | pass | checkbox-group-selection 22 用例（disabled/disabledTip/max-min/checkAll/indeterminate）、field-controls-dom-contract、choice-touch-adaptation、choice-markers-contract（marker）、form-shell-enhancements（Enter）——正确行为断言                              | 缺口已补齐（P1-B/P1-C 均有回归测试）                   |
| 17  | 文档对照                    | pass | design.md §10:76 承诺 `nop-checkbox-group` marker ↔ 实现（:125-127）一致；§10 markers 清单 ↔ 实现一致（checkall/disabled-tip/loading/error）；§4/§8 maxSelected/minSelected 即时阻止语义 ↔ 实现一致                                                           | P1-B 修复后 design.md 与实现一致                       |
| 18  | 注册、包边界与 IO/安全红线  | pass | 注册 input.tsx:626 + definitions.ts 导出链；playground checkbox-group-lab-page.tsx 存在；无浏览器 IO；复用 @nop-chaos/ui Checkbox；无注入面                                                                                                                   | —                                                      |

## 发现清单

- [P1-B] 根 marker `nop-checkbox-group` 缺失（design.md §10:76 承诺 vs `checkbox-group-renderer.tsx:125` 仅 `nop-checkbox-group-wrapper`）→ 状态: fixed（根同时输出 `nop-checkbox-group` + `nop-checkbox-group-wrapper`，checkbox-group-renderer.tsx:125-127；共性根因 4 组件 → CX-5 回写；test-first：choice-markers-contract.test.tsx 先红后绿）
- [P1-C] form Enter 提交排除清单缺 role="checkbox"（`form.tsx:641-673`，C2.1 交棒项）→ 状态: fixed（排除清单扩展 role=checkbox/switch/radio + defaultPrevented 兜底，form.tsx:650-674；test-first：form-shell-enhancements.test.tsx 先红后绿）
- [P3-1] `aria-errormessage` 未接（wrapper 只有 aria-describedby，:135；item 有 errormessage）——低影响（FieldFrame 层已处理校验文案），卡内记录归 CR

## 组合宿主场景（真实浏览器验证）

- 场景: form 内 checkbox-group 多选 → store → 提交 | 断言: programmatic DOM（c2-3-host-surfaces.spec.ts host-choice-submit）| 结果: pass（tags=['stable','beta'] 数组进 valuesPath，"Choice: ... | stable,beta | ..." 真机回显）

## 修复记录

- plan: `docs/plans/2026-08-03-0517-1-c2-3-form-choice-control-family-audit.md` Phase 2/3
- test-first 证据: choice-markers-contract.test.tsx（先红后绿）、form-shell-enhancements.test.tsx（role=checkbox 先红）、c2-3-host-surfaces.spec.ts（真机证明）
- 实现: `checkbox-group-renderer.tsx`（nop-checkbox-group marker）、`form.tsx`（Enter 排除清单）
- 验证: `pnpm --filter @nop-chaos/flux-renderers-form typecheck && build && lint && test` 全绿（677 tests）；e2e c2-3 5/5 + component-lab 171 passed / 1 skipped

- 独立 closure audit: pass（task `ses_03b60f3d0ffe0WzxJ5baVcQWAW`，2026-08-03，零 Blocker/Major；证据见 plan `2026-08-03-0517-1` Closure 节）
