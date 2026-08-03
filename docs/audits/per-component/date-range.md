# 审计卡：date-range（flux-renderers-form）

> 状态: closed
> 审查日期: 2026-08-03
> 审查 plan: `docs/plans/2026-08-03-0517-2-c2-4-form-date-family-audit.md`
> 注册定义: `packages/flux-renderers-form/src/renderers/date-renderer-definitions.ts:100-123` | 渲染器: `packages/flux-renderers-form/src/renderers/date-range-renderer.tsx` | design.md: `docs/components/date-range/design.md` | playground: `apps/playground/src/component-lab/renderers/date-range-lab-page.tsx` | e2e: `tests/e2e/w2b-date-family.spec.ts`、`tests/e2e/component-lab/c2-4-host-surfaces.spec.ts`

## 组件身份

date-range / flux-renderers-form / DateRangeSchema（`schemas.ts:350-362`）/ `{type:'date-range', name}` / 表单参与: 是（含 requiredRange 两端校验）/ widget 控件 renderer（`wrap: true`）

## 18 维审查记录

| #   | 维度                        | 结论 | 证据                                                                                                                                                                                                                                                                                                | 发现                                                                              |
| --- | --------------------------- | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| 1   | Schema 契约                 | pass | 注册 `date-renderer-definitions.ts:100-123`（fields 含 rangeKind/valueFormat/delimiter/shortcuts :107-116；validation=createRangeFieldValidation）与 `schemas.ts:350-362` 一致；rangeKind 非法值降级 'date'（`date-range-renderer.tsx:33-35`）                                                      | —                                                                                 |
| 2   | RendererComponentProps 合规 | pass | `date-range-renderer.tsx:71-100` 仅读 props.props/meta/id；标准 hooks；popover open 为字段内部态（design §7 裁定）                                                                                                                                                                                  | —                                                                                 |
| 3   | 值所有权三态                | pass | 三态同族；存储形状 = delimiter 连接字符串（`joinDateRange`，默认 `,`）；读时/写时双向归一 start≤end（:106-117 读、:163-178 写，D5）；immediate-commit（D7：display==committed，date-range.test.tsx:263-292）；D4 两端时间独立（:186-215，date-range.test.tsx:294-377）；clear→undefined（:222-225） | —                                                                                 |
| 4   | 表单参与                    | pass | requiredRange 规则：部分填充（单端）触发 `{{label}} requires both ends of the range`（`input.tsx:493-507` + i18n requiredRange key，date-range.test.tsx:379-446 三向）；提交形状 = delimited 字符串；min/max 越界 clamp 覆盖 calendar/time/shortcut 全写入路径（:60-69,:163-178）                   | —                                                                                 |
| 5   | DOM 与选择器契约            | pass | 根 marker `nop-date-range`（:244）+ data-slot；`data-range-kind` sr-only span（:387，P3 记录）；trigger/display/popover/shortcuts/clear testid 齐备（:259,266,272,342,365,381）                                                                                                                     | —                                                                                 |
| 6   | 嵌套 schema 分类            | pass | 无 deepFields；shortcuts 为 value prop（label/start/end 字符串结构，运行时 filter 校验 :137-141）；全 prop 字段                                                                                                                                                                                     | —                                                                                 |
| 7   | 事件与 action 契约          | pass | onChange payload = delimited 字符串（单端/双端/undefined 三态）；无自定义事件；compareDates re-export（:433）                                                                                                                                                                                       | —                                                                                 |
| 8   | a11y                        | pass | trigger aria 齐备；time 输入 aria-label 走 i18n（P2-1 修复后）；calendar 键盘路径 react-day-picker；disabled matchers 使越界日不可聚焦/不可选                                                                                                                                                       | —                                                                                 |
| 9   | i18n                        | fail | 硬编码 `'Select range'` placeholder（:268）、`'Start time'`/`'End time'`（:304,:310）、`'Range start time'`/`'Range end time'`（:326,:334）、`'Clear'`（:363,:378）；Calendar locale 未随语言（CX-7 共享）                                                                                          | **P2-1：占位/时间标签/清除文案硬编码**；**P2-2（shared，CX-7）：Calendar locale** |
| 10  | 四态覆盖                    | pass | 空值 placeholder（:268）；disabled/readOnly → interactive=false → trigger disabled（:254）；错误态 aria-invalid + FieldFrame；加载态 n-a                                                                                                                                                            | —                                                                                 |
| 11  | 异步生命周期                | n-a  | 无异步（shortcuts 静态）                                                                                                                                                                                                                                                                            | —                                                                                 |
| 12  | 组合宿主场景                | fail | w2b e2e 覆盖 rangeKind 解析/快捷项写回（`w2b-date-family.spec.ts:71-98`）；日历起止选择真机写回未覆盖（单测仅）                                                                                                                                                                                     | Phase 3 补（c2-4 host-range-calendar 日历选择写回 + host-family-submit 快捷项）   |
| 13  | 样式契约                    | pass | widget 自样式；`cn()` 合并；无 BEM；`check:audit-styling-suspects` 0 命中                                                                                                                                                                                                                           | —                                                                                 |
| 14  | React 19 规范               | pass | useState open 局部态；无冗余 memo/callback；`check:audit-react19-optimization-candidates` 0 命中（form 包）                                                                                                                                                                                         | —                                                                                 |
| 15  | 性能边界                    | pass | Calendar 挂载于 popover 打开时；受控 value 单向流；shortcuts 渲染前 filter（:137-141）                                                                                                                                                                                                              | —                                                                                 |
| 16  | 测试质量                    | pass | date-range.test.tsx 17 用例（canonical 收敛/选择写回/自定义 delimiter/序归一/D5/D7/D4/H9 clamp/D6 required 三向/time 写回）——断言正确行为                                                                                                                                                           | 缺四态与 zh 文案测试（P2-6 补）                                                   |
| 17  | 文档对照                    | pass | design.md §4/§7.1（D4/D5/D6/D7）与实现逐项一致；§10 marker `nop-date-range` 已实现；quick-reference 无组件级词条（n-a）                                                                                                                                                                             | design.md 未提 locale 随 flux 语言（CX-7 修复后行为，P3 记录）                    |
| 18  | 注册、包边界与 IO/安全红线  | pass | 注册+导出；playground lab 页（date/time/datetime 三场景）；无 IO/XSS；复用 @nop-chaos/ui                                                                                                                                                                                                            | —                                                                                 |

## 发现清单

- [P2-1] 占位/时间标签/清除文案硬编码（`date-range-renderer.tsx:268,304,310,326,334,363,378`）→ 状态: **fixed**（`t('flux.date.selectRange'|'startTime'|'endTime'|'rangeStartTime'|'rangeEndTime')` + `t('flux.common.clear')`；date-i18n.test.tsx 先红后绿）
- [P2-2] Calendar locale（shared，CX-7）→ 状态: **fixed**（共享修复，`date-range-renderer.tsx` 传 locale）
- [P2-6] 四态测试加固 → 状态: **fixed**（date-i18n.test.tsx + date-range.test.tsx 增 disabled 用例）
- [P3-1] `data-range-kind` sr-only span 断言钩子（`date-range-renderer.tsx:387`）→ 状态: 卡内记录（P3，可留作 e2e 断言契约）
- [P3-2] 外部传入越界存储值只读展示不 clamp（仅写路径 clamp，读路径归一序不归一界）→ 状态: 卡内记录（P3，design D9 仅约束写路径）

## 组合宿主场景（真实浏览器验证）

- 场景: 日历起止选择写回（bug 73 风险面：react-day-picker 真机交互）| 断言: `c2-4-host-surfaces.spec.ts` host-range-calendar（选日 18 → range-display `2024-06-01 , 2024-06-18`，D7 即提交值）| 结果: **pass**
- 场景: 复合提交（快捷项路径）| 断言: host-family-submit（`2024-06-03,2024-06-10` 进 store）| 结果: **pass**

## 修复记录

- plan: 同 input-date 卡（Phase 2/3）
- test-first 证据: date-i18n.test.tsx（zh/en 占位/标签/clear，先红后绿）；date-calendar-locale.test.tsx（range 模式周标题 zh，先红后绿）
- 实现: `date-range-renderer.tsx`（i18n labels + Calendar locale）
- 文档: `docs/components/date-range/design.md` §7.1 附注 locale 行为
- 验证: form 包 typecheck/build/lint/test 全绿（677→**700 tests**）；e2e c2-4 4/4 + w2b 6/6

## Closure

- 独立 closure audit: **pass** + 证据: `docs/plans/2026-08-03-0517-2-c2-4-form-date-family-audit.md` Closure Audit Evidence
