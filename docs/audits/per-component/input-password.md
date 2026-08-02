# 审计卡：input-password（flux-renderers-form）

> 状态: closed
> 审查日期: 2026-08-03
> 审查 plan: `docs/plans/2026-08-03-0105-3-c2-2-form-text-input-family-audit.md`
> 注册定义: `packages/flux-renderers-form/src/renderers/input.tsx:534-545` | 渲染器: `packages/flux-renderers-form/src/renderers/input.tsx:264-444`（createInputRenderer('password')） | design.md: `docs/components/input-password/design.md` | playground: `apps/playground/src/component-lab/renderers/input-password-lab-page.tsx` | e2e: `tests/e2e/form-input-enhancements.spec.ts`

## 组件身份

input-password / flux-renderers-form / InputSchema（`schemas.ts:55-80`）/ `{type:'input-password', name}` / 表单参与: 是 / widget 控件 renderer（`wrap: true`）

## 18 维审查记录

| #   | 维度                        | 结论 | 证据                                                                                                                                                                                                                                                                                    | 发现                                                                                                              |
| --- | --------------------------- | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 1   | Schema 契约                 | pass | 注册 `input.tsx:534-545`（type/fields=formFieldRules+inputEnhancementFieldRules/validate propContract/SCALAR_INPUT_CAPABILITY_CONTRACTS）；`revealPassword` 声明在共享 InputSchema 但仅 password 消费（design.md §2/§7，input-password-reveal.test.tsx:236-265 断言 text/email 不渲染） | —                                                                                                                 |
| 2   | RendererComponentProps 合规 | pass | 同 input-text（共享工厂，仅 props.props/meta/regions/helpers）                                                                                                                                                                                                                          | —                                                                                                                 |
| 3   | 值所有权三态                | pass | 三态全路径同 input-text；reveal 明文态为 local UI state（`input.tsx:299-300`），不写表单值（input-password-reveal.test.tsx:113-137"toggling reveal does not change form field value"）                                                                                                  | —                                                                                                                 |
| 4   | 表单参与                    | pass | name/required/validation 挂接同 input-text；提交路径值为密码字符串本身（reveal 不改值）                                                                                                                                                                                                 | —                                                                                                                 |
| 5   | DOM 与选择器契约            | fail | reveal 按钮 `data-slot="input-password-reveal"` + aria-pressed（input.tsx:369-385，input-password-reveal.test.tsx:287）；`check:audit-missing-renderer-markers` 0 命中（脚本假阴性同 input-text 卡）                                                                                    | **P1-1：根 marker `nop-input-password` 缺失**（design.md §10"建议输出 nop-input-password marker"；共性根因 CX-4） |
| 6   | 嵌套 schema 分类            | pass | 同 input-text（suggest 族字段共享声明）；无 deepFields 残留                                                                                                                                                                                                                             | —                                                                                                                 |
| 7   | 事件与 action 契约          | pass | 无自定义事件 payload；reveal toggle 为纯 UI 动作（local state）                                                                                                                                                                                                                         | —                                                                                                                 |
| 8   | a11y                        | pass | reveal 按钮 `aria-label` 随态切换 + `aria-pressed={revealed}`（input.tsx:374-375）；键盘路径完整（Button 可聚焦，Enter/Space 原生触发）；disabled/readOnly 时 reveal 按钮 disabled（:376）                                                                                              | P2-1 关联：aria-label 硬编码英文（见维度 9）                                                                      |
| 9   | i18n                        | fail | `aria-label` 硬编码 `'Show password'`/`'Hide password'`（input.tsx:374）                                                                                                                                                                                                                | **P2-1：reveal aria-label 未走 i18n**（与 input-text 卡 P2-1 同根因，Phase 2 统一修复）                           |
| 10  | 四态覆盖                    | pass | 空值安全；disabled/readOnly 测试齐备（input-password-reveal.test.tsx:188-224）                                                                                                                                                                                                          | —                                                                                                                 |
| 11  | 异步生命周期                | n-a  | 无异步（suggest 共享时同 input-text 卡）                                                                                                                                                                                                                                                | —                                                                                                                 |
| 12  | 组合宿主场景                | pass | 单测 14 条（reveal 切换/共存/disabled/readOnly/state 保持）；Phase 3 补真机 reveal 切换场景                                                                                                                                                                                             | —                                                                                                                 |
| 13  | 样式契约                    | pass | widget 自样式；cn() 合并；end addon 顺序 suffix→counter→clear→reveal（input-password-reveal.test.tsx:138-187）                                                                                                                                                                          | —                                                                                                                 |
| 14  | React 19 规范               | pass | reveal 用 useState 局部态；无冗余 memo                                                                                                                                                                                                                                                  | —                                                                                                                 |
| 15  | 性能边界                    | pass | 同 input-text（paths 限定订阅）；reveal 切换仅重渲染本组件                                                                                                                                                                                                                              | —                                                                                                                 |
| 16  | 测试质量                    | pass | input-password-reveal.test.tsx 14 条（含 reveal 态跨 clear 保留 :266-285）；均为正确行为断言                                                                                                                                                                                            | —                                                                                                                 |
| 17  | 文档对照                    | fail | design.md §7"reveal 明文态 local state 不写表单值"与实现一致；§10 marker 承诺未实现（P1-1）                                                                                                                                                                                             | P1-1 同源（§10 marker）；其余与实现一致                                                                           |
| 18  | 注册、包边界与 IO/安全红线  | pass | 注册 input.tsx:534；playground input-password-lab-page.tsx 存在；无浏览器 IO；复用 @nop-chaos/ui                                                                                                                                                                                        | —                                                                                                                 |

## 发现清单

- [P1-1] 根 marker `nop-input-password` 缺失（design.md §10 承诺 vs `input.tsx:425-442`）→ 状态: **fixed**（`nop-input-password` marker，c2-2 host-family-markers 真机断言；test-first：input-classname-contract.test.tsx；共性根因 CX-4）
- [P2-1] reveal `aria-label` 硬编码 `'Show password'`/`'Hide password'`（`input.tsx:374`）→ 状态: **fixed**（`t('flux.common.showPassword'|'hidePassword')`，zh/en keys；i18n keys check 绿）

## 组合宿主场景（真实浏览器验证）

- 场景: password reveal 切换真机 | 断言: programmatic DOM（`c2-2-host-surfaces.spec.ts` host-password-reveal：fill 'hunter2' → type=password → reveal click → type=text + aria-pressed=true → 再 toggle 回 password，live echo "Set: hunter2" 全程不变）| 结果: **pass**

## 修复记录

- plan: `docs/plans/2026-08-03-0105-3-c2-2-form-text-input-family-audit.md` Phase 2/3
- test-first: input-classname-contract.test.tsx（marker 断言先红后绿）；i18n 断言随 input-suggest.test.tsx 既有初始化覆盖
- 实现: `input.tsx`（marker + reveal i18n label）、`flux-i18n`（showPassword/hidePassword）
- 验证: form 包 655 tests 绿；c2-2 host-password-reveal pass

## Closure

- 独立 closure audit: **pass** + 证据: `docs/plans/2026-08-03-0105-3-c2-2-form-text-input-family-audit.md` Closure Audit Evidence（独立子 agent fresh session task `ses_03bb1a612ffe2K2XqYNpitL1gv`，verdict approved，零 Blocker/Major）
