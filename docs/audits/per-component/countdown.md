# 审计卡：countdown（flux-renderers-mobile）

> 状态: closed
> 审查日期: 2026-08-05
> 审查 plan: `docs/plans/2026-08-05-1314-1-c7-mobile-interaction-family-audit.md`
> 注册定义: `packages/flux-renderers-mobile/src/mobile-renderer-definitions.ts:82` | 渲染器: `packages/flux-renderers-mobile/src/countdown.tsx:182` | design.md: `docs/components/countdown/design.md` | playground: `apps/playground/src/pages/mobile-components-demo.tsx:77` | e2e: `tests/e2e/mobile-components.spec.ts`（1 测试）+ `tests/e2e/m5-mobile-showcase.spec.ts`

## 组件身份

countdown / flux-renderers-mobile / CountdownSchema（`schemas.ts:79-91`）/ defaultSchema `{type:'countdown', time: 60_000}` / 表单参与: 否 / widget 展示型组件（time/targetTime 双模式 wall-clock 派生倒计时 + format 模板 + paused/autoStart + onFinish 单次派发）。

## 18 维审查记录

| #   | 维度                        | 结论 | 证据                                                                                                                                                                                                                                                                                                                                                                                                                     | 发现       |
| --- | --------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| 1   | Schema 契约                 | pass | CountdownSchema（schemas.ts:79-91：time/targetTime/format/millisecond/paused/autoStart/prefix/suffix/onFinish）↔ 注册 fields（mobile-renderer-definitions.ts:88-98：8 prop + onFinish event；布尔 valueType 标注）↔ 渲染器消费（countdown.tsx:184-199）三方一致；defaultSchema `{time:60_000}` ✓；缺失 prop 降级（format 默认 'HH:mm:ss'、time/targetTime 均缺 → 空渲染 :204-215）存在                                   | —          |
| 2   | RendererComponentProps 合规 | pass | 仅读 props.props/meta/events（:183-199,:207-231）；无 store 直访、无 ad-hoc context；useCountdownTimer 为包内本地 hook（:47）                                                                                                                                                                                                                                                                                            | —          |
| 3   | 值所有权三态                | pass | **time/targetTime 为配置 prop（local 受控回显：config 变更经 computeInitialRemaining 依赖 effect 复位 remaining + 重锚 wall-clock 原点，countdown.tsx:92-102，MM-08 测试实证不吞已过进度）；paused 为受控布尔（:104-106/:121-154 暂停冻结、恢复续走，MM-14 测试实证 pause 窗口不计入）**；remaining 纯 local（无 scope/受控面——design §1 明确纯展示不参与值通道）；autoStart 为 mount-time 语义（MM-08 裁定）            | —          |
| 4   | 表单参与                    | n-a  | 非表单字段（design §1/§10 明确不参与 value/validation 通道）                                                                                                                                                                                                                                                                                                                                                             | —          |
| 5   | DOM 与选择器契约            | pass | 根 `nop-countdown` marker + tabular-nums（:219）+ data-slot="countdown"（:222）+ data-finished（:223）+ data-slot countdown-prefix/:value/:suffix（:226-230）+ data-remaining（:227）+ data-testid/data-cid 透传（:220-221）；`check:audit-missing-renderer-markers` 0 命中                                                                                                                                              | —          |
| 6   | 嵌套 schema 分类            | pass | 8 字段全 prop（数值/布尔/字符串）+ onFinish event；无 region（design §3「无 regions」）；无 deepFields 残留（live grep 零命中）                                                                                                                                                                                                                                                                                          | —          |
| 7   | 事件与 action 契约          | fail | onFinish 派发 `{type:'finish'}`（:194，MA-04 payload 有测试锁定）；**派发缺 `event`/`evaluationBindings`/`scope` ctx**（bug 83 同族先例）→ **P1-1**；**注册定义缺 onFinish eventContracts**（carousel P1-1/diff-view P1-7 同族先例）→ **P1-2**                                                                                                                                                                           | P1-1/P1-2  |
| 8   | a11y                        | pass | `aria-live="off"`（:224）——每秒（毫秒模式 30ms）刷新值，若用 aria-live 会造成读屏风暴；design 未文档化该裁决 → P3-1 记录；无交互面（展示组件，无键盘路径需求）                                                                                                                                                                                                                                                           | P3-1       |
| 9   | i18n                        | n-a  | 无硬编码文案（纯数字 + prefix/suffix 由 schema 提供）                                                                                                                                                                                                                                                                                                                                                                    | —          |
| 10  | 四态覆盖                    | pass | 未配置（空渲染 data-finished=true）、运行中、已结束（归零显示 + 停 tick + onFinish 一次）、paused、autoStart:false、targetTime 已过期（clamp 0 + 单次 onFinish）全覆盖（countdown.test.tsx:83-260 实证）                                                                                                                                                                                                                 | —          |
| 11  | 异步生命周期                | pass | interval 清理：卸载（:161-170 测试）、pause（:121-154 条件早退）、finish 停 tick（MA-16 :128 + 测试 :458-494 无重渲染风暴）；onFinish 单次守卫（finishedRef :66/:113-119 + StrictMode MM-23 测试）；wall-clock 派生防节流漂移（OA-21 :143-150 + 测试 :427-456）                                                                                                                                                          | —          |
| 12  | 组合宿主场景                | pass | 单测覆盖充分（26 用例含 hook 8 用例）；真实浏览器：mobile-components.spec.ts 1 场景（30s 真实走时）；**Phase 3 补 countdown onFinish 真机实证宿主场景（结束 → data-finished=true + `${type}` 参数解析）**                                                                                                                                                                                                                | 见 Phase 3 |
| 13  | 样式契约                    | pass | widget 自样式（nop-countdown marker + tabular-nums 数字对齐）；cn() 合并（:219）；无 BEM（markers-contract 断言）；无 ThemeProvider；`check:audit-styling-suspects` mobile 0 命中                                                                                                                                                                                                                                        | —          |
| 14  | React 19 规范               | pass | useCallback×1（computeInitialRemaining effect dep 所需）；onFinishRef latest-ref（:67-70）；effect 拆分（config 复位 / autoStart / finish 派发 / tick）职责清晰；定时器全路径清理；无 effect+setState 镜像（remaining 由 tick 直写）                                                                                                                                                                                     | —          |
| 15  | 性能边界                    | pass | 每秒（毫秒模式 30ms）单 setRemaining——最小刷新频率满足秒级展示；finished 后 interval 停 + 无重渲染（MA-16 测试 :458-494 commits 稳定）；无 selector 订阅                                                                                                                                                                                                                                                                 | —          |
| 16  | 测试质量                    | pass | 26 用例断言**正确行为**（formatCountdown 7 纯函数、渲染/前缀后缀/空态、onFinish 单次/StrictMode/卸载清理、targetTime 过期 clamp、毫秒模式 30ms tick、pause 续走 MM-14、throttle 防漂移 OA-21、autoStart toggle MM-08、reset/start 契约 OA-13）；payload 形状断言 :247-260；无假绿                                                                                                                                        | —          |
| 17  | 文档对照                    | fail | **design.md §2 决策表 prefix/suffix 标注「value-or-region」而实现为纯 string prop（schemas.ts:88-89 `prefix?: string`、definitions :95-96 kind:'prop'）——design §2 与 §3 字段分类表（value）自相矛盾 → P2-2 文档同步**；§5 格式化规则/§6 定时器实现（wall-clock/结束即停/reset 契约）↔ 实现一致；§8 边界表与实现一致；**onFinish payload 形状（{type:'finish'}）design.md 未文档化——P1-2 eventContracts 落地时同步补充** | P2-2       |
| 18  | 注册、包边界与 IO/安全红线  | fail | 单注册（:82）+ src/index.ts:44 导出 + registerMobileRenderers ✓；无浏览器 IO 直调（INV-1 live grep 零命中——Date.now/setInterval 为平台 API 非 IO）✓；**component-lab lab 页缺失（维度 18 覆盖缺口）→ P2-1（Phase 3 补页 + registry/manifest/routes）**                                                                                                                                                                   | P2-1       |

## 发现清单

- [P1-1] **onFinish 派发缺 event/evaluationBindings/scope ctx 注入**（countdown.tsx:194）→ bug 83 同族先例 → 状态: fixed（Phase 2 test-first——`__tests__/event-and-i18n-contract.test.tsx`「countdown onFinish dispatch carries event/evaluationBindings ctx」先红后绿；实现 countdown.tsx onFinish 补 `{event, evaluationBindings, scope: props.node.scope}`；详见 `docs/bugs/86`）
- [P1-2] **注册定义缺 onFinish eventContracts**（mobile-renderer-definitions.ts:82-99；carousel P1-1/diff-view P1-7 同族先例）→ 状态: fixed（Phase 2——mobile-renderer-definitions.ts:148-161 eventContracts{type} + 测试「countdown declares onFinish eventContracts」）
- [P2-1] component-lab lab 页缺失（维度 18 缺口）→ 状态: fixed（Phase 3——`countdown-lab-page.tsx` + registry/route/manifest 条目 + host-cd-finish 宿主场景）
- [P2-2] design.md §2 prefix/suffix「value-or-region」标注与实现（纯 string prop）漂移 + onFinish payload 未文档化 → 状态: fixed（Phase 2——design.md §2/§3/§7 更正为 string prop、§3 Events 补 payload 契约说明）
- [P3-1] aria-live="off" 裁决未在 design.md 文档化 → keep（card 记录）

## 组合宿主场景（真实浏览器验证）

- 场景: Phase 3 —— host-cd-finish（倒计时结束：1.5s countdown 真实走时归零 → data-finished=true + 显示 00 + onFinish `${type}` 解析 = finish）| 断言: `tests/e2e/component-lab/c7-host-surfaces.spec.ts` host-cd-finish（programmatic DOM 断言，禁截图） | 结果: **pass**

## 修复记录

- **test-first 证据**（Phase 2）：`__tests__/event-and-i18n-contract.test.tsx` evalCtx 用例先行运行失败，随后实现修复转绿。
- **P1-1**：countdown.tsx onFinish 派发补 `{event: finishPayload, evaluationBindings: finishPayload, scope: props.node.scope}`。
- **P1-2**：mobile-renderer-definitions.ts countdown 注册项补 eventContracts。
- **P2-2**：design.md §2/§3/§7 更正 prefix/suffix 为纯 string prop；§3 Events 补 payload 契约。
- **bug 记录**：`docs/bugs/86-mobile-events-evaluationbindings-ctx-fix.md`。
- **共性缺陷裁决**：当前 plan 内修复，不插入 CX-n（与 pull-refresh 卡同裁，roadmap §7）。
- 验证: `pnpm --filter @nop-chaos/flux-renderers-mobile typecheck/build/lint/test` 全绿（170 tests）+ c7 host spec 6/6 + mobile/m5/m2 e2e 全绿

## Closure

- 全卡复查（Phase 4）：18 维表结论与最终代码一致；P0 ×0 / P1 ×2（onFinish evalCtx、eventContracts）/ P2 ×2 fixed（lab 页、design prefix/suffix 文档更正 + payload 文档）；P3-1 keep；卡状态 `closed`
- 独立 closure audit: pass（mission-driver CLOSURE_VERIFY fresh session，2026-08-05——live repo 核对卡结论与最终代码一致；详见 plan `2026-08-05-1314-1` Closure Audit Evidence）
