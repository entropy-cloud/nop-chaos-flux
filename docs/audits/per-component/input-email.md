# 审计卡：input-email（flux-renderers-form）

> 状态: closed
> 审查日期: 2026-08-03
> 审查 plan: `docs/plans/2026-08-03-0105-3-c2-2-form-text-input-family-audit.md`
> 注册定义: `packages/flux-renderers-form/src/renderers/input.tsx:521-532` | 渲染器: `packages/flux-renderers-form/src/renderers/input.tsx:264-444`（createInputRenderer('email')） | design.md: `docs/components/input-email/design.md` | playground: `apps/playground/src/component-lab/renderers/input-email-lab-page.tsx` | e2e: `tests/e2e/form-input-enhancements.spec.ts`、`tests/e2e/complex-form.spec.ts`

## 组件身份

input-email / flux-renderers-form / InputSchema（`schemas.ts:55-80`）/ `{type:'input-email', name}` / 表单参与: 是（默认 email 校验规则） / widget 控件 renderer（`wrap: true`）

## 18 维审查记录

| #   | 维度                        | 结论 | 证据                                                                                                                                                                                           | 发现                                                                                                        |
| --- | --------------------------- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 1   | Schema 契约                 | pass | 注册 `input.tsx:521-532`（fields 同 input-text；`createFieldValidation(undefined, true)` 默认 email validator :528 与 design.md §2/§3 一致）；inputMode 映射 email→email（mobile-touch-utils） | —                                                                                                           |
| 2   | RendererComponentProps 合规 | pass | 同 input-text（共享工厂）                                                                                                                                                                      | —                                                                                                           |
| 3   | 值所有权三态                | pass | 同 input-text（stringAdapter 全路径；input-controlled-value.test.tsx 覆盖）                                                                                                                    | —                                                                                                           |
| 4   | 表单参与                    | pass | email 校验规则经 form runtime 输出（collectRules :456-465 kind:'email'）；required/minLength/pattern 编译期规则合并；提交路径值形状为字符串                                                    | —                                                                                                           |
| 5   | DOM 与选择器契约            | fail | `data-slot="input"`/`input-group`；`check:audit-missing-renderer-markers` 0 命中（脚本假阴性同 input-text 卡）                                                                                 | **P1-1：根 marker `nop-input-email` 缺失**（design.md §10"建议输出 nop-input-email marker"；共性根因 CX-4） |
| 6   | 嵌套 schema 分类            | pass | 同 input-text（suggest 族共享）；无 deepFields 残留                                                                                                                                            | —                                                                                                           |
| 7   | 事件与 action 契约          | pass | 无自定义事件 payload；suggest 共享时同 input-text 卡                                                                                                                                           | —                                                                                                           |
| 8   | a11y                        | pass | aria-invalid/describedby/errormessage 接线齐备（input.tsx:401-405）；email 键盘语义由原生 type=email 提供                                                                                      | —                                                                                                           |
| 9   | i18n                        | fail | clear 按钮 `aria-label="Clear"` 硬编码（input.tsx:251，共享）                                                                                                                                  | **P2-1：clear aria-label 未走 i18n**（input-text 卡 P2-1 同根因，Phase 2 统一修复）                         |
| 10  | 四态覆盖                    | pass | 空值/disabled/readOnly/错误态同 input-text；email 校验失败展示经 FieldFrame（form-validation-ui 既有覆盖）                                                                                     | —                                                                                                           |
| 11  | 异步生命周期                | n-a  | 无独立异步（suggest 共享时同 input-text 卡）                                                                                                                                                   | —                                                                                                           |
| 12  | 组合宿主场景                | pass | input-suggest.test.tsx:527-561 断言 input-email 共享 suggest 浮层；Phase 3 补 form 内 email 提交宿主场景                                                                                       | —                                                                                                           |
| 13  | 样式契约                    | pass | widget 自样式；cn() 合并；同 input-text 卡                                                                                                                                                     | —                                                                                                           |
| 14  | React 19 规范               | pass | 同 input-text 卡（共享工厂）                                                                                                                                                                   | —                                                                                                           |
| 15  | 性能边界                    | pass | 同 input-text 卡（paths 限定订阅）                                                                                                                                                             | —                                                                                                           |
| 16  | 测试质量                    | pass | 既有 email 校验单测（form-validation-rules.test.tsx 等）+ input-suggest 共享用例；均为正确行为断言                                                                                             | —                                                                                                           |
| 17  | 文档对照                    | fail | design.md §3/§4/§5 与实现一致；§10 marker 承诺未实现（P1-1）；§9"远端邮箱可用性校验走 validate.api"与 `validate.action` 实现一致（validatePropContract actionValue）                           | P1-1 同源（§10 marker）                                                                                     |
| 18  | 注册、包边界与 IO/安全红线  | pass | 注册 input.tsx:521；playground input-email-lab-page.tsx 存在；无浏览器 IO；复用 @nop-chaos/ui                                                                                                  | —                                                                                                           |

## 发现清单

- [P1-1] 根 marker `nop-input-email` 缺失（design.md §10 承诺 vs `input.tsx:425-442`）→ 状态: **fixed**（`nop-input-email` marker，c2-2 host-family-markers 真机断言；test-first：input-classname-contract.test.tsx；共性根因 CX-4）
- [P2-1] clear `aria-label="Clear"` 硬编码（`input.tsx:251` 共享）→ 状态: **fixed**（`t('flux.common.clear')`；i18n keys check 绿）

## 组合宿主场景（真实浏览器验证）

- 场景: form 内 input-email 提交（email 值进入提交 payload）| 断言: programmatic DOM（`c2-2-host-surfaces.spec.ts` host-family-submit：email 'alice@example.com' 进入 valuesPath 回显）| 结果: **pass**

## 修复记录

- plan: `docs/plans/2026-08-03-0105-3-c2-2-form-text-input-family-audit.md` Phase 2/3
- test-first: input-classname-contract.test.tsx（marker 断言先红后绿）
- 实现: `input.tsx`（marker + clear i18n label，input-text 卡同源修复共享）、`flux-i18n`
- 验证: form 包 655 tests 绿；c2-2 host-family-submit/markers pass

## Closure

- 独立 closure audit: **pass** + 证据: `docs/plans/2026-08-03-0105-3-c2-2-form-text-input-family-audit.md` Closure Audit Evidence（独立子 agent fresh session task `ses_03bb1a612ffe2K2XqYNpitL1gv`，verdict approved，零 Blocker/Major）
