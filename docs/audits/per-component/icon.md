# 审计卡：icon（flux-renderers-basic）

> 状态: closed
> 审查日期: 2026-08-03
> 审查 plan: `docs/plans/2026-08-03-0105-1-c1-3-basic-atomic-display-family-audit.md`
> 注册定义: `packages/flux-renderers-basic/src/basic-renderer-definitions.ts:310` | 渲染器: `packages/flux-renderers-basic/src/icon.tsx:31` | design.md: `docs/components/icon/design.md` | playground: `apps/playground/src/component-lab/renderers/icon-lab-page.tsx` | e2e: `tests/e2e/component-lab/data-renderers.spec.ts`

## 组件身份

icon / flux-renderers-basic / IconSchema（`schemas.ts:250-258`）/ 无 defaultSchema / 表单参与: 无 / widget 展示 renderer（自样式，`nop-icon` marker + data-icon）

## 18 维审查记录

| #   | 维度                        | 结论 | 证据                                                                                                                                                                          | 发现                                                                                          |
| --- | --------------------------- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 1   | Schema 契约                 | fail | 注册项 `basic-renderer-definitions.ts:310-321` fields（icon/size/color）与 schemas.ts:250-258 一致，但 **无 `defaultSchema`**——作者插入/设计器基线不完整，与 C1.2 CX-3 同根因 | **P2-1：注册项缺 `defaultSchema`**（CX-3 同类，当前 plan 修复并回写）                         |
| 2   | RendererComponentProps 合规 | pass | `icon.tsx:31-53` 仅读 props.props/meta                                                                                                                                        | —                                                                                             |
| 3   | 值所有权三态                | n-a  | 展示型无值所有权（design.md §7）                                                                                                                                              | —                                                                                             |
| 4   | 表单参与                    | n-a  | 非表单字段                                                                                                                                                                    | —                                                                                             |
| 5   | DOM 与选择器契约            | pass | `nop-icon` marker（:42）+ `data-icon={icon}`（:43）+ data-testid/data-cid（:44-45）；`data-renderer` 为 FieldFrame 契约不适用                                                 | —                                                                                             |
| 6   | 嵌套 schema 分类            | pass | 无内嵌 schema/action                                                                                                                                                          | —                                                                                             |
| 7   | 事件与 action 契约          | n-a  | 无事件（design.md §8）                                                                                                                                                        | —                                                                                             |
| 8   | a11y                        | pass | `aria-hidden="true"` + `focusable="false"`（:48-49）——装饰图标默认语义（design.md §2 裁定）；title/decorative a11y 字段为 design.md 已记录 follow-up（不阻塞）                | —                                                                                             |
| 9   | i18n                        | pass | 无硬编码文案；invalid-size dev warn（:20-25）为开发诊断（P3）                                                                                                                 | —                                                                                             |
| 10  | 四态覆盖                    | pass | 无效图标名回退 `Circle`（resolveLucideIcon fallback）不崩溃；空 icon → Circle；无加载/错误/禁用语义                                                                           | —                                                                                             |
| 11  | 异步生命周期                | n-a  | 无异步                                                                                                                                                                        | —                                                                                             |
| 12  | 组合宿主场景                | pass | data-renderers.spec.ts icon 场景 + icon-lab-page 2 场景；无 scope 上下文安全（icon 字段可接表达式，名称需稳定——design.md §9）                                                 | 宿主场景缺"无 label/aria 时降级渲染"检查（Phase 3 host-icon-aria 并入 text/badge 场景或单独） |
| 13  | 样式契约                    | pass | widget 自样式；`cn()` 合并（:42）；size 映射 `{sm:12,md:16,lg:20}`（:6-10）经 `resolveIconSize` 校验回退（:12-27）；color inline style 保留 className 优先级（:50）           | —                                                                                             |
| 14  | React 19 规范               | pass | 纯函数组件，无 memo/effect                                                                                                                                                    | —                                                                                             |
| 15  | 性能边界                    | pass | 无订阅/监听器；icon 解析每次渲染执行 resolveLucideIcon（模块级缓存查找，廉价）                                                                                                | —                                                                                             |
| 16  | 测试质量                    | pass | icon-size-token.test.tsx（size 三态/回退）、widget-markers-contract.test.tsx:44-57（marker + data-icon）、basic-class-alias-and-icon-markers.test.tsx:100（无 BEM 修饰类）    | —                                                                                             |
| 17  | 文档对照                    | pass | design.md §4/§10 与实现一致（size token/color/回退语义）；flux-guide/flux-types IconSchema 与 schemas.ts 一致；quick-reference 无组件级词条（n-a）                            | —                                                                                             |
| 18  | 注册、包边界与 IO/安全红线  | pass | 注册 :310 + 导出 index.tsx；playground icon-lab-page.tsx 存在；无浏览器 IO；lucide 静态图标（无 URL/HTML 面）                                                                 | —                                                                                             |

## 发现清单

- [P2-1] 注册项缺 `defaultSchema`（`basic-renderer-definitions.ts:310-321`）→ 状态: fixed（`{type:'icon', icon:'star'}`，CX-3 同类一并补齐并回写）
- [P3-1] invalid-size dev console.warn（`icon.tsx:20-25`）——DEV 门控，仅记录

## 组合宿主场景（真实浏览器验证）

- 场景: icon 无 label/aria 缺失时降级渲染不崩溃 + aria 语义可读（Phase 3，host-icon-aria） | 结果: **pass**（c1-3-host-surfaces.spec.ts：未知图标名回退渲染 2 个 `.nop-icon` 不崩溃；svg aria-hidden='true' + focusable='false'）

## 修复记录

- test-first 证据: `renderer-contract-smoke.test.ts` badge/icon defaultSchema 断言（先红后绿）
- 实现: `basic-renderer-definitions.ts` icon 补 `defaultSchema {type:'icon', icon:'star'}`
- 验证: `pnpm --filter @nop-chaos/flux-renderers-basic typecheck/build/lint/test` 全绿（466 tests）

## Closure

- 独立 closure audit: pass + 证据: `docs/plans/2026-08-03-0105-1-c1-3-basic-atomic-display-family-audit.md` Closure Audit Evidence（独立子 agent fresh session task `ses_03c655ea6ffeZUBM6m56E4eKJe`，verdict approved，零 Blocker/Major，2 Minor 非阻塞：P2-3 走 CR 后继已登记；卡内行号为审计时点）
