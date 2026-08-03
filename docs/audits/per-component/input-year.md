# 审计卡：input-year（flux-renderers-form）

> 状态: closed
> 审查日期: 2026-08-03
> 审查 plan: `docs/plans/2026-08-03-0517-2-c2-4-form-date-family-audit.md`
> 注册定义: `packages/flux-renderers-form/src/renderers/date-renderer-definitions.ts:148-159` | 渲染器: `packages/flux-renderers-form/src/renderers/period-renderers.tsx`（共享工厂 PeriodRenderer kind='year'） | design.md: `docs/components/input-year/design.md` | playground: `apps/playground/src/component-lab/renderers/input-year-lab-page.tsx` | e2e: `tests/e2e/component-lab/c2-4-host-surfaces.spec.ts`

## 组件身份

input-year / flux-renderers-form / InputPeriodSchema（`schemas.ts:369-381`，year 成员）/ `{type:'input-year', name}` / 表单参与: 是 / widget 控件 renderer（`wrap: true`，text 数字输入 + inputMode=numeric + maxLength=4，存储 `YYYY`）

## 18 维审查记录

| #   | 维度                        | 结论 | 证据                                                                                                                                                                                              | 发现                                                                                             |
| --- | --------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------ |
| 1   | Schema 契约                 | fail | 同 input-month：注册 `date-renderer-definitions.ts:148-159` + `schemas.ts:380` + design.md §4 声明 `shortcuts`，`period-renderers.tsx` 无引用                                                     | **P1-1：`shortcuts` 声明但零行为**（同 input-month 卡，共享工厂根因，修复记录见 input-month 卡） |
| 2   | RendererComponentProps 合规 | pass | 同 input-month（kind 由 YearPeriodRenderer wrapper 提供，M-07）                                                                                                                                   | —                                                                                                |
| 3   | 值所有权三态                | pass | 三态同族；存储 `YYYY`（数字过滤 + 4 位截断 `period-renderers.tsx:302-309`）；空输入→undefined（:305-307）；min/max clamp 经 `commitSingle` 与 `normalizePeriodRange`；clear→undefined（:210-221） | 逐键即时提交（'2' 瞬时入 store），最终 4 位值正确（P3-1）                                        |
| 4   | 表单参与                    | pass | name/required/validation 同族；提交形状：`YYYY` / delimited 范围（input-period.test.tsx:107-123）；aria-invalid/aria-describedby（:296-297）                                                      | —                                                                                                |
| 5   | DOM 与选择器契约            | pass | 根 marker `nop-input-year`（`period-renderers.tsx:31`）+ `data-period-kind="year"`（:148）；`period-input-year` testid 直接挂 input（:298）；`period-clear-year`（:216）                          | —                                                                                                |
| 6   | 嵌套 schema 分类            | pass | 同 input-month                                                                                                                                                                                    | —                                                                                                |
| 7   | 事件与 action 契约          | pass | onChange payload = `YYYY` / delimited 范围；无自定义事件                                                                                                                                          | —                                                                                                |
| 8   | a11y                        | pass | aria-label（label/name 兜底）；inputMode=numeric + maxLength=4（移动端数字键盘）；placeholder `'YYYY'`（格式字面量）                                                                              | —                                                                                                |
| 9   | i18n                        | fail | 硬编码 `aria-label="Clear"`（:215）、`placeholder="Start"`/`"End"`（:178,:198，range 模式）                                                                                                       | **P2-1：Clear/Start/End 硬编码**（`flux.common.clear` + `flux.date.start                         | end`） |
| 10  | 四态覆盖                    | pass | 空值渲染安全；disabled/readOnly → 输入禁用；错误态 aria-invalid；加载态 n-a                                                                                                                       | —                                                                                                |
| 11  | 异步生命周期                | n-a  | 无异步                                                                                                                                                                                            | —                                                                                                |
| 12  | 组合宿主场景                | fail | 无既有 e2e                                                                                                                                                                                        | Phase 3 补（c2-4 host-family-submit 单值 + host-period-range）                                   |
| 13  | 样式契约                    | pass | widget 自样式；`cn()` 合并；无 BEM                                                                                                                                                                | —                                                                                                |
| 14  | React 19 规范               | pass | 无冗余 memo/callback                                                                                                                                                                              | —                                                                                                |
| 15  | 性能边界                    | pass | 固定规模单 input                                                                                                                                                                                  | —                                                                                                |
| 16  | 测试质量                    | pass | input-period.test.tsx year 用例（marker/写回 `2031`/空值→undefined）——断言正确行为                                                                                                                | 缺 shortcuts 用例（P1-1 共享修复补）；缺四态（P2-6 补）                                          |
| 17  | 文档对照                    | fail | design.md §4 声明 `shortcuts`（P1-1 同源）；§10 marker `nop-input-year` 已实现；quick-reference 无组件级词条（n-a）                                                                               | P1-1 修复后 design.md §4 补 shortcuts 语义                                                       |
| 18  | 注册、包边界与 IO/安全红线  | pass | 注册+导出；playground lab 页；无 IO/XSS；复用 @nop-chaos/ui                                                                                                                                       | —                                                                                                |

## 发现清单

- [P1-1] `shortcuts` 声明但零行为 → 状态: **fixed**（共享工厂修复，见 input-month 卡）
- [P2-1] Clear/Start/End 硬编码（`period-renderers.tsx:178,198,215`）→ 状态: **fixed**（共享修复）
- [P2-6] 四态测试加固 → 状态: **fixed**
- [P3-1] 逐键即时提交（部分年份瞬时入 store）→ 状态: 卡内记录（P3，同 input-month）

## 组合宿主场景（真实浏览器验证）

- 场景: 复合提交（bug 73 模式，单值）| 断言: `c2-4-host-surfaces.spec.ts` host-family-submit（year 输入 2031 → store → 提交 `2031`）| 结果: **pass**
- 场景: period 范围复合提交 | 断言: host-period-range（`2031`）| 结果: **pass**

## 修复记录

- plan: 同 input-date 卡（Phase 2/3）
- test-first 证据: 同 input-month 卡
- 实现: `period-renderers.tsx`（共享修复）+ flux-i18n（flux.date keys）
- 文档: `docs/components/input-year/design.md` §4（shortcuts 语义）
- 验证: form 包 typecheck/build/lint/test 全绿（677→**700 tests**）；e2e c2-4 4/4

## Closure

- 独立 closure audit: **pass** + 证据: `docs/plans/2026-08-03-0517-2-c2-4-form-date-family-audit.md` Closure Audit Evidence
