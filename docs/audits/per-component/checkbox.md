# 审计卡：checkbox（flux-renderers-form）

> 状态: closed
> 审查日期: 2026-08-03
> 审查 plan: `docs/plans/2026-08-03-0517-1-c2-3-form-choice-control-family-audit.md`
> 注册定义: `packages/flux-renderers-form/src/renderers/input.tsx:593-600` | 渲染器: `packages/flux-renderers-form/src/renderers/input-choice-renderers.tsx:545-585` | design.md: `docs/components/checkbox/design.md` | playground: `apps/playground/src/component-lab/renderers/checkbox-lab-page.tsx` | e2e: `tests/e2e/component-lab/c2-3-host-surfaces.spec.ts`（本族宿主场景新增）

## 组件身份

checkbox / flux-renderers-form / CheckboxSchema（`schemas.ts:238-244`）/ `{type:'checkbox', name}` / 表单参与: 是（name/required/validation/提交路径）/ widget 控件 renderer（`wrap: true`，FieldFrame 提供 label/校验 chrome + `data-field-*`）

## 18 维审查记录

| #   | 维度                        | 结论 | 证据                                                                                                                                                                                                                                                                                                             | 发现                                                   |
| --- | --------------------------- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| 1   | Schema 契约                 | pass | CheckboxSchema: option/trueValue/falseValue（schemas.ts:238-244）；注册 fields 含 formFieldRules + option/trueValue/falseValue（input.tsx:595-602）双侧一致                                                                                                                                                      | P2-1 已修复（fields 补 3 项 prop）                     |
| 2   | RendererComponentProps 合规 | pass | 仅读 props.props/meta；useFormFieldController 标准 hooks（:551-557）                                                                                                                                                                                                                                             | —                                                      |
| 3   | 值所有权三态                | pass | booleanMappingAdapter(trueValue,falseValue)（value-adapter.ts:220-232）；local/controlled/scope 三态经 useFormFieldController；trueValue/falseValue 契约 7 用例（boolean-control-value-contract.test.tsx:69-165）含 value-neither 保留路径                                                                       | —                                                      |
| 4   | 表单参与                    | pass | name/required/validation 挂接；`data-field`/`data-renderer=checkbox` 冻结（field-controls-dom-contract.test.tsx:82-87）；`aria-invalid` 随 showError（:576）；required 语义：unchecked=false 非空（isEmptyValue 不含 false，validators.ts:36-38）——false 通过 required，仅 undefined 触发（平台级语义，P3 记录） | —                                                      |
| 5   | DOM 与选择器契约            | pass | 根 `nop-checkbox` marker + `data-slot="checkbox-wrapper"`（:582-588）+ 内部 `[data-slot="checkbox"][role="checkbox"]` span（Base UI CheckboxRoot，冻结于 field-controls-dom-contract.test.tsx:352-379）；`nop-haptic`/touch 类（:566-567）；`check:audit-missing-renderer-markers` 0 命中（脚本假阴性）          | P1-B 已修复（根同时输出 type marker + -wrapper，CX-5） |
| 6   | 嵌套 schema 分类            | pass | option/trueValue/falseValue 为标量 value；无内嵌 action/schema/region；无 deepFields 残留                                                                                                                                                                                                                        | —                                                      |
| 7   | 事件与 action 契约          | pass | onCheckedChange → handlers.onChange(Boolean(nextChecked))（:579），无自定义 payload；onFocus/onBlur 走 field handlers                                                                                                                                                                                            | —                                                      |
| 8   | a11y                        | pass | role=checkbox + aria-checked + aria-readonly + aria-invalid + aria-label（:571-578）；交互元素是 SPAN（Base UI CheckboxPrimitive，冻结 :360）；键盘：Space 由 Base UI 隐藏 input 处理；**form Enter 排除 role=checkbox（form.tsx:672，C2.1 交棒项已闭合，真机证明 host-choice-enter）**                          | P1-C 已修复（排除清单扩展 + defaultPrevented 兜底）    |
| 9   | i18n                        | pass | 无硬编码文案（aria-label 用 optionLabel ?? name，:577；无按钮文案）                                                                                                                                                                                                                                              | —                                                      |
| 10  | 四态覆盖                    | pass | disabled/readOnly 经 presentation（:574-575）；错误态 aria-invalid；空值 undefined→unchecked；无 loading（n-a）                                                                                                                                                                                                  | —                                                      |
| 11  | 异步生命周期                | n-a  | 无异步路径                                                                                                                                                                                                                                                                                                       | —                                                      |
| 12  | 组合宿主场景                | pass | 单测丰富（dom-contract/boolean-value/touch-adaptation）+ 真机：host-choice-submit（checkbox 值进 store 并提交，'yes' 回显）+ host-choice-enter（P1-C 修复证明）                                                                                                                                                  | Phase 3 完成                                           |
| 13  | 样式契约                    | pass | widget 自样式；wrapper 仅 marker + touch 类 + meta.className；无 BEM；`check:audit-styling-suspects` 0 命中                                                                                                                                                                                                      | —                                                      |
| 14  | React 19 规范               | pass | 无 memo/callback/effect 镜像；受控 checked 直读（:560）                                                                                                                                                                                                                                                          | —                                                      |
| 15  | 性能边界                    | pass | useBoundFieldValue paths 订阅（field-handlers.tsx:50-59）；无列表热点                                                                                                                                                                                                                                            | —                                                      |
| 16  | 测试质量                    | pass | field-controls-dom-contract（wrapper/aria-checked/data-checked 4 断言）、boolean-control-value-contract（7 用例）、choice-touch-adaptation、choice-markers-contract（marker 先红后绿）、form-shell-enhancements（Enter 排除）——正确行为断言                                                                      | 缺口已补齐（P1-C/P1-B 均有回归测试）                   |
| 17  | 文档对照                    | pass | design.md §10:66 承诺 `nop-checkbox` marker ↔ 实现（:582）一致；§4/§5 trueValue/falseValue/option 分类 ↔ 注册 fields（input.tsx:595-602）一致                                                                                                                                                                    | P1-B/P2-1 修复后 design.md 与实现一致                  |
| 18  | 注册、包边界与 IO/安全红线  | pass | 注册 input.tsx:593 + definitions.ts 导出链；playground checkbox-lab-page.tsx 存在（+Enter no-submit 场景）；无浏览器 IO；复用 @nop-chaos/ui Checkbox；role=checkbox span 内无 HTML 注入面                                                                                                                        | —                                                      |

## 发现清单

- [P1-B] 根 marker `nop-checkbox` 缺失（design.md §10:66 承诺 vs `input-choice-renderers.tsx:565` 仅 `nop-checkbox-wrapper`）→ 状态: fixed（根同时输出 `nop-checkbox` + `nop-checkbox-wrapper`，input-choice-renderers.tsx:582；共性根因 4 组件 → CX-5 回写；test-first：choice-markers-contract.test.tsx 先红后绿）
- [P1-C] form Enter 提交排除清单缺 role="checkbox"（`form.tsx:641-673`，C2.1 交棒项）→ 状态: fixed（排除清单扩展 role=checkbox/switch/radio + event.defaultPrevented 兜底，form.tsx:650-674；test-first：form-shell-enhancements.test.tsx 先红后绿；真机证明 e2e host-choice-enter）
- [P2-1] `option`/`trueValue`/`falseValue` 未入注册 fields（`schemas.ts:238-244` vs `input.tsx:595`）→ 状态: fixed（fields 补 3 项 prop，input.tsx:596-602）
- [P3-1] required 对 unchecked=false 不报错（false 非空，仅 undefined 触发）——平台级 isEmptyValue 语义，卡内记录归 CR

## 组合宿主场景（真实浏览器验证）

- 场景: form 内 checkbox 勾选 → store → 提交 | 断言: programmatic DOM（c2-3-host-surfaces.spec.ts host-choice-submit）| 结果: pass（agree=true 提交进 valuesPath，"Choice: ... | yes | ..." 真机回显）
- 场景: checkbox 聚焦 + Enter 不提交（P1-C 修复真机证明）| 断言: programmatic DOM（host-choice-enter）| 结果: pass（Enter 800ms 后无 "Submitted:"；显式 Submit 按钮正常提交；Enter 仅切换选中态（Base UI 原生键盘行为））

## 修复记录

- plan: `docs/plans/2026-08-03-0517-1-c2-3-form-choice-control-family-audit.md` Phase 2/3
- test-first 证据: choice-markers-contract.test.tsx（5 用例先红后绿）、form-shell-enhancements.test.tsx（+role=checkbox/switch + defaultPrevented 3 用例先红后绿）、c2-3-host-surfaces.spec.ts host-choice-enter（真机证明）
- 实现: `input-choice-renderers.tsx`（nop-checkbox marker）、`input.tsx`（checkbox fields option/trueValue/falseValue）、`form.tsx`（Enter 排除清单）
- 验证: `pnpm --filter @nop-chaos/flux-renderers-form typecheck && build && lint && test` 全绿（677 tests）；e2e c2-3 5/5 + component-lab 171 passed / 1 skipped

- 独立 closure audit: pass（task `ses_03b60f3d0ffe0WzxJ5baVcQWAW`，2026-08-03，零 Blocker/Major；证据见 plan `2026-08-03-0517-1` Closure 节）
