# 审计卡：input-time（flux-renderers-form）

> 状态: closed
> 审查日期: 2026-08-03
> 审查 plan: `docs/plans/2026-08-03-0517-2-c2-4-form-date-family-audit.md`
> 注册定义: `packages/flux-renderers-form/src/renderers/date-renderer-definitions.ts:80-99` | 渲染器: `packages/flux-renderers-form/src/renderers/input-time-renderer.tsx` | design.md: `docs/components/input-time/design.md` | playground: `apps/playground/src/component-lab/renderers/input-time-lab-page.tsx` | e2e: `tests/e2e/w2b-date-family.spec.ts`、`tests/e2e/component-lab/c2-4-host-surfaces.spec.ts`

## 组件身份

input-time / flux-renderers-form / InputTimeSchema（`schemas.ts:340-348`）/ `{type:'input-time', name}` / 表单参与: 是 / widget 控件 renderer（`wrap: true`，原生 `<input type="time">`）

## 18 维审查记录

| #   | 维度                        | 结论 | 证据                                                                                                                                                                                                                                                                   | 发现                                                                                                                                              |
| --- | --------------------------- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Schema 契约                 | pass | 注册 `date-renderer-definitions.ts:80-99`（fields 含 minTime/maxTime :91-92）与 `schemas.ts:340-348` 一致；valueFormat/displayFormat 默认（`input-time-renderer.tsx:27-39`）；`resolveTimeInputFormat`（:19-23）以 valueFormat/displayFormat 是否含 `ss` 决定原生 step | —                                                                                                                                                 |
| 2   | RendererComponentProps 合规 | pass | `input-time-renderer.tsx:25-49` 仅读 props.props/meta/id + useInputComponentHandle；标准 hooks                                                                                                                                                                         | —                                                                                                                                                 |
| 3   | 值所有权三态                | pass | useFormFieldController 三态；`convertValueFormat` 桥接原生 HH:mm(:ss) ↔ valueFormat（:55,:86）；clear→undefined（:75,:81,:133）；minTime/maxTime 越界 clamp（:86-96，input-time.test.tsx:80-108）                                                                      | 原生输入每次 change 即时提交（immediate-commit 与 date-range D7 同语义）                                                                          |
| 4   | 表单参与                    | pass | name/required/validation 同族；提交形状 = valueFormat 字符串（input-time.test.tsx:56-78,110-140 含 HHmm 自定义）；aria-invalid/aria-describedby/aria-errormessage（:116-118）                                                                                          | —                                                                                                                                                 |
| 5   | DOM 与选择器契约            | pass | 根 marker `nop-input-time`（`input-time-renderer.tsx:102`）+ data-slot="field-control"；`id={name}-control`、name 透传（:109-110）；clear testid `time-clear`（:131）                                                                                                  | 原生 input 自身由浏览器渲染，无自定义 data-value（n-a，浏览器契约）                                                                               |
| 6   | 嵌套 schema 分类            | pass | 无 deepFields；全 prop                                                                                                                                                                                                                                                 | —                                                                                                                                                 |
| 7   | 事件与 action 契约          | pass | onChange payload = valueFormat 字符串（clamp 后）；无自定义事件                                                                                                                                                                                                        | —                                                                                                                                                 |
| 8   | a11y                        | pass | aria-label（label/name 兜底 :114）、aria-required、aria-invalid、aria-describedby、aria-errormessage；原生 time input 键盘路径（浏览器原生：上下键/分步）                                                                                                              | 原生控件 aria 契约由浏览器承担，键盘完整路径可用                                                                                                  |
| 9   | i18n                        | fail | 硬编码 `aria-label="Clear"`（`input-time-renderer.tsx:130`）                                                                                                                                                                                                           | **P2-1：Clear aria-label 硬编码**（`flux.common.clear` 已存在，直接替换）                                                                         |
| 10  | 四态覆盖                    | pass | 空值（value='' 渲染安全）；disabled/readOnly → `effectiveDisabled`/`readOnly`（:112-113）；错误态 aria-invalid；加载态 n-a                                                                                                                                             | —                                                                                                                                                 |
| 11  | 异步生命周期                | n-a  | 无异步                                                                                                                                                                                                                                                                 | —                                                                                                                                                 |
| 12  | 组合宿主场景                | fail | w2b e2e 仅初始值回显（`w2b-date-family.spec.ts:100-105`）；真实输入/提交未覆盖                                                                                                                                                                                         | Phase 3 补（c2-4 host-family-submit：原生 time 输入 → store → 提交）                                                                              |
| 13  | 样式契约                    | pass | widget 自样式；`cn()` 合并；clear 按钮 absolute 定位 + `pr-8`（:120,:132）                                                                                                                                                                                             | —                                                                                                                                                 |
| 14  | React 19 规范               | pass | 无冗余 memo/callback；useRef 管理 inputRef                                                                                                                                                                                                                             | —                                                                                                                                                 |
| 15  | 性能边界                    | pass | 受控 value 单向流；无订阅放大                                                                                                                                                                                                                                          | —                                                                                                                                                 |
| 16  | 测试质量                    | pass | input-time.test.tsx 5 用例（marker/写回/clamp/custom valueFormat round-trip）——断言正确行为                                                                                                                                                                            | 缺四态与 zh 文案测试（P2-6 补）                                                                                                                   |
| 17  | 文档对照                    | fail | design.md §4 声明 `displayFormat` 但原生控件显示固定 HH:mm(:ss)——displayFormat 仅参与秒分辨率决策（`input-time-renderer.tsx:52`），与文档"建议正式字段"存在语义差                                                                                                      | **P3-1：displayFormat 语义漂移**（原生 time input 无法自定义显示格式；行为裁定：displayFormat 仅驱动秒分辨率，design.md §4 补一句说明，卡内记录） |
| 18  | 注册、包边界与 IO/安全红线  | pass | 注册+导出；playground lab 页存在（含 HHmm 场景）；无 IO/XSS；复用 @nop-chaos/ui（Input/Button）                                                                                                                                                                        | —                                                                                                                                                 |

## 发现清单

- [P2-1] Clear aria-label 硬编码（`input-time-renderer.tsx:130`）→ 状态: **fixed**（`t('flux.common.clear')`；date-i18n.test.tsx zh/en 断言先红后绿）
- [P3-1] displayFormat 仅驱动秒分辨率（原生控件显示不可定制）→ 状态: 卡内记录（P3，design.md §4 补一句说明）
- [P3-2] 原生 time input 的 placeholder 在多数浏览器不渲染（`input-time-renderer.tsx:119`）→ 状态: 卡内记录（P3，浏览器契约）

## 组合宿主场景（真实浏览器验证）

- 场景: 复合提交（bug 73 模式）| 断言: `c2-4-host-surfaces.spec.ts` host-family-submit（原生 time 输入 09:15 → store → 提交 `09:15`）| 结果: **pass**

## 修复记录

- plan: 同 input-date 卡（Phase 2/3）
- test-first 证据: date-i18n.test.tsx（input-time clear zh/en，先红后绿）
- 实现: `input-time-renderer.tsx`（`t('flux.common.clear')`）
- 文档: `docs/components/input-time/design.md` §4（displayFormat 语义说明）
- 验证: form 包 typecheck/build/lint/test 全绿（677→**700 tests**）；e2e c2-4 4/4 + w2b 6/6

## Closure

- 独立 closure audit: **pass** + 证据: `docs/plans/2026-08-03-0517-2-c2-4-form-date-family-audit.md` Closure Audit Evidence
