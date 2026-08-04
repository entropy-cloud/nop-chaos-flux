# 审计卡：html（flux-renderers-content）

> 状态: closed
> 审查日期: 2026-08-04
> 审查 plan: `docs/plans/2026-08-04-0841-2-c6-1-content-text-family-audit.md`
> 注册定义: `packages/flux-renderers-content/src/content-renderer-definitions.ts:183` | 渲染器: `packages/flux-renderers-content/src/html.tsx:8` | design.md: `docs/components/html/design.md` | playground: `apps/playground/src/pages/w1a-content-display-demo.tsx:60/:67`（demo-html/demo-html-empty）| e2e: `tests/e2e/w1a-content-family.spec.ts:23/:38` + `tests/e2e/component-lab/c6-1-host-surfaces.spec.ts`（本组件宿主场景新增）

## 组件身份

html / flux-renderers-content / HtmlSchema（`schemas.ts:184-192`）/ `{type:'html', content?, sanitize?, empty?}` / 表单参与: 否 / widget 展示组件（自样式，dangerouslySetInnerHTML 承载 sanitized 输出）。

## 18 维审查记录

| #   | 维度                        | 结论 | 证据                                                                                                                                                                                                                                                                                                                            | 发现                         |
| --- | --------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| 1   | Schema 契约                 | pass | HtmlSchema（schemas.ts:184-192）↔ 注册 fields（content-renderer-definitions.ts:189-192：content/sanitize/empty）↔ 渲染器消费三方核对：content（html.tsx:10-13）、sanitize（:19）、empty（:22-23）；sanitize valueType boolean 默认 true 与实现 `!== false`（:19）一致；content 空 → empty 态（:21-35）                          | —                            |
| 2   | RendererComponentProps 合规 | pass | 仅读 props.props/meta（html.tsx:9-23）；无 store 直访、无 ad-hoc context                                                                                                                                                                                                                                                        | —                            |
| 3   | 值所有权三态                | n-a  | 展示组件：content 只读 prop 渲染，无值写面                                                                                                                                                                                                                                                                                      | —                            |
| 4   | 表单参与                    | n-a  | 非表单字段                                                                                                                                                                                                                                                                                                                      | —                            |
| 5   | DOM 与选择器契约            | pass | 根 `nop-html` marker + data-slot="html" + data-testid/data-cid（:25-31,40-46）；empty 态 data-state（:29）；trusted 逃生口 data-trusted 标记（:44）；`check:audit-missing-renderer-markers` 0 命中                                                                                                                              | —                            |
| 6   | 嵌套 schema 分类            | pass | content/sanitize → prop（:190-191）、empty → value-or-region（:192）✓；无 deepFields 残留                                                                                                                                                                                                                                       | —                            |
| 7   | 事件与 action 契约          | n-a  | 无事件字段（design §8 默认无专用事件）                                                                                                                                                                                                                                                                                          | —                            |
| 8   | a11y                        | pass | 内容由 dangerouslySetInnerHTML 直出（作者负责语义）；空态 slot 透传；无硬编码文案（空态内容来自 schema）                                                                                                                                                                                                                        | —                            |
| 9   | i18n                        | n-a  | 无内建文案（空态内容作者提供）                                                                                                                                                                                                                                                                                                  | —                            |
| 10  | 四态覆盖                    | pass | 空态（content 空 → empty slot，:21-35）；禁用/加载/错误态 n/a（无异步面、无交互）                                                                                                                                                                                                                                               | —                            |
| 11  | 异步生命周期                | n-a  | 无异步面                                                                                                                                                                                                                                                                                                                        | —                            |
| 12  | 组合宿主场景                | pass | 单测：html.test.tsx 5 用例（sanitize strip script/onerror/javascript: URI/trusted 逃生口/空态）；真实浏览器：w1a demo-html XSS 程序化检查（w1a-content-family.spec.ts:23-36，`__W1A_XSS_HTML__` 全局未设）+ demo-html-empty；本族 Phase 3 新增宿主场景（**动态内容更新后 sanitize 复验——bug 73 模式专项**）                     | Phase 3 见「组合宿主场景」节 |
| 13  | 样式契约                    | pass | widget 自样式；cn() 合并 meta.className（:45）；无 BEM；无硬编码布局类                                                                                                                                                                                                                                                          | —                            |
| 14  | React 19 规范               | pass | 无冗余 memo/effect；纯渲染组件                                                                                                                                                                                                                                                                                                  | —                            |
| 15  | 性能边界                    | pass | content 字符串直渲；无重复解析热点                                                                                                                                                                                                                                                                                              | —                            |
| 16  | 测试质量                    | pass | 5 用例断言正确行为（script 剥除/事件处理器剥除/javascript: URI 清理/trusted 透传/空态）；**sanitize 门禁全路径**：DOMPurify 默认路径（html.test.tsx:19-55）+ trusted 逃生口（:57-67）均覆盖；**SSR fail-closed 分支（sanitize.ts:33-36）零断言**（同 markdown P2-1，共享 sanitize.ts）                                          | P2-1（共享）                 |
| 17  | 文档对照                    | pass | design.md §4/§5/§10/§12 ↔ 实现一致（字段清单、sanitize 默认 on + `sanitize:false` 逃生口、nop-html marker、dangerouslySetInnerHTML 仅承载 sanitized 输出、安全门禁父文档引用）                                                                                                                                                  | —                            |
| 18  | 注册、包边界与 IO/安全红线  | pass | 单注册（:183）+ src/index.tsx 导出 HtmlRenderer ✓；**sanitize 门禁全路径核对（维度 18 重点）**：默认路径 DOMPurify（:37-41）+ trusted 逃生口显式声明（:19,44）+ SSR fail-closed（sanitize.ts:33-36）✓；无浏览器 IO 直调（无 fetch/localStorage 等）；无 window/global 访问；**component-lab lab 页缺失** → P2-2（Phase 3 补页） | P2-2                         |

## 发现清单

- [P0] 无
- [P1] 无
- [P2-1] sanitize SSR fail-closed 分支（sanitize.ts:33-36）零测试覆盖 → 状态: fixed（sanitize.test.ts 新增「fails closed in an SSR / no-DOM environment」用例——行为已正确，断言缺失属测试加固）
- [P2-2] component-lab lab 页缺失 → 状态: fixing（Phase 3 新增 `html-lab-page.tsx`）
- [P3] 无

## 组合宿主场景（真实浏览器验证）

- 场景: 动态 html 内容更新 + sanitize 复验（bug 73 模式专项，Phase 3）| 断言: host-html-sanitize（c6-1-host-surfaces.spec.ts）——scope 按钮更新 html 内容含 `<script>`，更新路径剥除（`__C6C1_HTML_XSS__` 未设，programmatic 断言）；strong 存活、safe 内容切换回正常渲染 | 结果: **pass**

## 修复记录

- plan: `docs/plans/2026-08-04-0841-2-c6-1-content-text-family-audit.md` Phase 2/3
- test-first 证据: sanitize.test.ts SSR fail-closed 用例（行为已正确、断言缺失属测试加固——用例先红（无该断言）后绿）
- 实现: 无 renderer 行为变更（sanitize 门禁既有实现已正确）；`sanitize.test.ts`（SSR fail-closed 用例）；Phase 3 新增 `html-lab-page.tsx`
- 验证: `pnpm --filter @nop-chaos/flux-renderers-content typecheck && build && lint && test` 全绿（248 tests）；宿主场景 c6-1-host-surfaces.spec.ts html-host 1/1 + smoke/w1a 回归绿
- 卡状态流转: open（Phase 1 产出）→ fixing（Phase 2 修复）→ fixed-pending-closure（Phase 3 宿主实证）→ closed（Phase 4 全卡复查）

## Closure

- 全卡复查（Phase 4）：18 维表结论与最终代码一致；P0 ×0、P1 ×0；P2-1 fixed + lab 页 fixed；卡状态 `closed`
- 独立 closure audit: 待填写（见 plan `2026-08-04-0841-2` Closure 节，mission-driver CLOSURE_VERIFY fresh session 执行；执行 session 不自审）
