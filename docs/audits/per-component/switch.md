# 审计卡：switch（flux-renderers-form）

> 状态: closed
> 审查日期: 2026-08-03
> 审查 plan: `docs/plans/2026-08-03-0517-1-c2-3-form-choice-control-family-audit.md`
> 注册定义: `packages/flux-renderers-form/src/renderers/input.tsx:602-610` | 渲染器: `packages/flux-renderers-form/src/renderers/input-choice-renderers.tsx:587-642` | design.md: `docs/components/switch/design.md` | playground: `apps/playground/src/component-lab/renderers/switch-lab-page.tsx` | e2e: `tests/e2e/component-lab/c2-3-host-surfaces.spec.ts`（本族宿主场景新增）

## 组件身份

switch / flux-renderers-form / SwitchSchema（`schemas.ts:245-252`）/ `{type:'switch', name}` / 表单参与: 是（name/required/validation/提交路径）/ widget 控件 renderer（`wrap: true`，FieldFrame 提供 label/校验 chrome + `data-field-*`）

## 18 维审查记录

| #   | 维度                        | 结论 | 证据                                                                                                                                                                                                                                                              | 发现                                                   |
| --- | --------------------------- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| 1   | Schema 契约                 | pass | SwitchSchema: option/trueValue/falseValue（schemas.ts:245-252）；注册 fields 含 formFieldRules + option/trueValue/falseValue（input.tsx:610-616）双侧一致                                                                                                         | P2-1 已修复（fields 补 3 项 prop）                     |
| 2   | RendererComponentProps 合规 | pass | 仅读 props.props/meta；useFormFieldController 标准 hooks（:593-599）；useInputComponentHandle 句柄（:604-614）                                                                                                                                                    | —                                                      |
| 3   | 值所有权三态                | pass | booleanMappingAdapter(trueValue,falseValue)（:592）；三态经 useFormFieldController；trueValue/falseValue 契约 6 用例（boolean-control-value-contract.test.tsx:167-256）含 onLabel/offLabel 正交断言                                                               | —                                                      |
| 4   | 表单参与                    | pass | name/required/validation 挂接；`data-field`/`data-renderer=switch` 冻结（field-controls-dom-contract.test.tsx:89-94）；aria-invalid 随 showError（:631）                                                                                                          | —                                                      |
| 5   | DOM 与选择器契约            | pass | 根 `nop-switch` marker + `data-slot="switch-wrapper"`（:638-644）+ 内部 `[data-slot="switch"][role="switch"]` span（Base UI SwitchPrimitive，冻结 field-controls-dom-contract.test.tsx:385-401）；`nop-haptic`/touch 类（:621-622）                               | P1-B 已修复（根同时输出 type marker + -wrapper，CX-5） |
| 6   | 嵌套 schema 分类            | pass | option/trueValue/falseValue 为标量 value；无内嵌 action/schema/region；无 deepFields 残留                                                                                                                                                                         | —                                                      |
| 7   | 事件与 action 契约          | pass | onCheckedChange → handlers.onChange(Boolean(nextChecked))（:634）；onFocus/onBlur 走 field handlers                                                                                                                                                               | —                                                      |
| 8   | a11y                        | pass | role=switch + aria-checked + aria-readonly + aria-invalid + aria-label（:626-632）；交互元素是 SPAN（冻结 :391）；`data-slot="switch-label"` 状态文案（:637-639）；**form Enter 排除 role=switch（form.tsx:672，C2.1 交棒项已闭合，真机证明 host-choice-enter）** | P1-C 已修复（排除清单扩展 + defaultPrevented 兜底）    |
| 9   | i18n                        | pass | aria-label 走 label ?? name；**开关状态文案缺省走 `t('flux.form.switchOn'/'switchOff')`**（:657-661，zh/en keys 同步；单测 choice-error-i18n + 真机 '开'/'关'）                                                                                                   | P2-2 已修复（On/Off 硬编码 → i18n）                    |
| 10  | 四态覆盖                    | pass | disabled/readOnly 经 presentation（:629-630）；错误态 aria-invalid；无 loading（n-a）；onLabel/offLabel 缺省回退不崩溃（i18n 化）                                                                                                                                 | —                                                      |
| 11  | 异步生命周期                | n-a  | 无异步路径                                                                                                                                                                                                                                                        | —                                                      |
| 12  | 组合宿主场景                | pass | 单测丰富（dom-contract/boolean-value/touch-adaptation）+ 真机：host-choice-submit（switch 值进 store 并提交 'on' 回显）+ host-choice-enter（P1-C）+ host-controlled-echo（外部 setValue 更新 aria-checked + '开' 文案）                                           | Phase 3 完成                                           |
| 13  | 样式契约                    | pass | widget 自样式；wrapper 仅 marker + touch 类 + meta.className；无 BEM；`check:audit-styling-suspects` 0 命中                                                                                                                                                       | —                                                      |
| 14  | React 19 规范               | pass | 无 memo/callback/effect 镜像；受控 checked 直读（:601）                                                                                                                                                                                                           | —                                                      |
| 15  | 性能边界                    | pass | useBoundFieldValue paths 订阅；无列表热点                                                                                                                                                                                                                         | —                                                      |
| 16  | 测试质量                    | pass | field-controls-dom-contract（switch wrapper/aria-checked）、boolean-control-value-contract（6 用例）、choice-touch-adaptation、choice-markers-contract、choice-error-i18n（On/Off 缺省 i18n）、form-shell-enhancements（Enter 排除）——正确行为断言                | 缺口已补齐（P1-C 与 On/Off 缺省文案均有测试）          |
| 17  | 文档对照                    | pass | design.md §10:63 承诺 `nop-switch` marker ↔ 实现（:638）一致；§4/§5 trueValue/falseValue/option 分类 ↔ 注册 fields（input.tsx:610-616）一致；§2 onLabel/offLabel ↔ i18n 缺省一致                                                                                  | P1-B/P2-1/P2-2 修复后 design.md 与实现一致             |
| 18  | 注册、包边界与 IO/安全红线  | pass | 注册 input.tsx:602 + definitions.ts 导出链；playground switch-lab-page.tsx 存在；无浏览器 IO；复用 @nop-chaos/ui Switch；无注入面                                                                                                                                 | —                                                      |

## 发现清单

- [P1-B] 根 marker `nop-switch` 缺失（design.md §10:63 承诺 vs `input-choice-renderers.tsx:620` 仅 `nop-switch-wrapper`）→ 状态: fixed（根同时输出 `nop-switch` + `nop-switch-wrapper`，input-choice-renderers.tsx:638；共性根因 4 组件 → CX-5 回写；test-first：choice-markers-contract.test.tsx 先红后绿）
- [P1-C] form Enter 提交排除清单缺 role="switch"（`form.tsx:641-673`，C2.1 交棒项）→ 状态: fixed（排除清单扩展；test-first 先红后绿；真机证明 e2e host-choice-enter）
- [P2-1] `option`/`trueValue`/`falseValue` 未入注册 fields（`schemas.ts:245-252` vs `input.tsx:604`）→ 状态: fixed（fields 补 3 项 prop，input.tsx:610-616）
- [P2-2] `'On'`/`'Off'` 状态文案硬编码（`input-choice-renderers.tsx:638`）→ 状态: fixed（新增 `flux.form.switchOn`/`switchOff` keys zh/en 同步；renderer 走惰性 t()，input-choice-renderers.tsx:657-661；test-first：choice-error-i18n.test.tsx 先红后绿 + e2e host-controlled-echo 真机 '开'/'关'）

## 组合宿主场景（真实浏览器验证）

- 场景: form 内 switch 切换 → store → 提交 | 断言: programmatic DOM（c2-3-host-surfaces.spec.ts host-choice-submit）| 结果: pass（active=true 提交进 valuesPath，"Choice: ... | on | ..." 真机回显）
- 场景: switch 聚焦 + Enter 不提交（P1-C 修复真机证明）| 断言: programmatic DOM（host-choice-enter）| 结果: pass（Enter 800ms 后无 "Submitted:"；Enter 切换开关态属 Base UI 原生键盘路径，不提交）
- 场景: 外部 setValue 更新 switch（受控 echo + i18n 文案）| 断言: programmatic DOM（host-controlled-echo）| 结果: pass（aria-checked=true + label '开'，zh 默认 locale 真机）

## 修复记录

- plan: `docs/plans/2026-08-03-0517-1-c2-3-form-choice-control-family-audit.md` Phase 2/3
- test-first 证据: choice-markers-contract.test.tsx（先红后绿）、choice-error-i18n.test.tsx（On/Off 先红）、form-shell-enhancements.test.tsx（role=switch 先红）、c2-3-host-surfaces.spec.ts（真机证明）
- 实现: `input-choice-renderers.tsx`（nop-switch marker + t() 文案）、`input.tsx`（switch fields）、`form.tsx`（Enter 排除清单）、flux-i18n（switchOn/switchOff keys）
- 验证: `pnpm --filter @nop-chaos/flux-renderers-form typecheck && build && lint && test` 全绿（677 tests）；e2e c2-3 5/5 + component-lab 171 passed / 1 skipped

- 独立 closure audit: pass（task `ses_03b60f3d0ffe0WzxJ5baVcQWAW`，2026-08-03，零 Blocker/Major；证据见 plan `2026-08-03-0517-1` Closure 节）
