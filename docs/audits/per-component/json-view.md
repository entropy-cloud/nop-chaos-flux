# 审计卡：json-view（flux-renderers-content）

> 状态: closed
> 审查日期: 2026-08-04
> 审查 plan: `docs/plans/2026-08-04-0841-2-c6-1-content-text-family-audit.md`
> 注册定义: `packages/flux-renderers-content/src/content-renderer-definitions.ts:155` | 渲染器: `packages/flux-renderers-content/src/json-view.tsx:12` | design.md: `docs/components/json-view/design.md` | playground: `apps/playground/src/pages/w1a-content-display-demo.tsx:100/:106`（demo-json-view/demo-json-view-empty）| e2e: `tests/e2e/w1a-content-family.spec.ts:69` + `tests/e2e/component-lab/c6-1-host-surfaces.spec.ts`（本组件宿主场景新增）

## 组件身份

json-view / flux-renderers-content / JsonViewSchema（`schemas.ts:159-169`）/ `{type:'json-view', value?, collapsed?, showCopy?, empty?}` / 表单参与: 否 / widget 展示组件（复用 ui JsonViewer）。

## 18 维审查记录

| #   | 维度                        | 结论 | 证据                                                                                                                                                                                                                                                                                                                                                                                    | 发现                         |
| --- | --------------------------- | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| 1   | Schema 契约                 | pass | JsonViewSchema（schemas.ts:159-169）↔ 注册 fields（content-renderer-definitions.ts:161-166：value/collapsed/showCopy/empty）↔ 渲染器消费三方核对：value（json-view.tsx:14）、collapsed（:46-52）、showCopy（:47）、empty（:31-32）；collapsed 三语义（true 全折叠/false 全展开/number 层级）与 schema 注释一致（schemas.ts:164）；value 空判定 null/undefined/''（:8-10）               | —                            |
| 2   | RendererComponentProps 合规 | pass | 仅读 props.props/meta（json-view.tsx:13-14）；无 store 直访；Hooks 在早退前无条件声明（:18-28，Rules of Hooks 合规）                                                                                                                                                                                                                                                                    | —                            |
| 3   | 值所有权三态                | n-a  | 展示组件：value 只读 prop；collapsed 为展示配置（非用户值）；copy 为 UI 动作非值写                                                                                                                                                                                                                                                                                                      | —                            |
| 4   | 表单参与                    | n-a  | 非表单字段                                                                                                                                                                                                                                                                                                                                                                              | —                            |
| 5   | DOM 与选择器契约            | pass | 根 `nop-json-view` marker + data-slot="json-view" + data-testid/data-cid（:34-39,82-87）；empty 态 data-state（:38）；toolbar data-slot="json-view-toolbar"（:89）；JsonViewer 输出 `.json-viewer`（ui json-viewer.tsx:28）；`check:audit-missing-renderer-markers` 0 命中                                                                                                              | —                            |
| 6   | 嵌套 schema 分类            | pass | value/collapsed/showCopy → prop（:162-164）、empty → value-or-region（:165）✓；无 deepFields 残留；empty 双态消费（:31-32）✓                                                                                                                                                                                                                                                            | —                            |
| 7   | 事件与 action 契约          | n-a  | 无事件字段（design §8 推荐句柄 component:copy/onCopy 未实现——「推荐支持」非承诺契约，需组件 capability 注册面，>15 分钟 → P2-b backlog 归 CR）                                                                                                                                                                                                                                          | P2-b                         |
| 8   | a11y                        | pass | 树由 ui JsonViewer（react-json-view-lite）输出，展开节点为可点击元素（库内建键盘可操作性）；Copy 按钮为 @nop-chaos/ui Button（原生 button 可聚焦）；无树形 role="tree" 语义（库限制，展示型数据视图可接受）→ P3 观察                                                                                                                                                                    | P3-1                         |
| 9   | i18n                        | pass | Copy/Copied 文案走 `t()`（:91：flux.common.copy/copied，en-US.ts:21-22 存在）；无其他硬编码文案                                                                                                                                                                                                                                                                                         | —                            |
| 10  | 四态覆盖                    | pass | 空态（null/undefined/'' → empty slot，:30-44，data-state=empty）；禁用/加载/错误态 n/a（无异步面）；大对象折叠态（collapsed 控制，:50-52）                                                                                                                                                                                                                                              | —                            |
| 11  | 异步生命周期                | n-a  | 仅 copy 定时器（setTimeout 1500ms 重置 copied，:63-66）——卸载清理 ✓（:22-28）+ 重复点击去重 ✓（:60-62），已有专测（json-view.test.tsx:105-142）                                                                                                                                                                                                                                         | —                            |
| 12  | 组合宿主场景                | pass | 单测：json-view.test.tsx 7 用例（空态×2/对象树/折叠/复制按钮/复制 payload/定时器清理）；真实浏览器：w1a demo-json-view 对象树 + demo-json-view-empty 空态（w1a-content-family.spec.ts:69-80）；本族 Phase 3 新增宿主场景（null 空态 + scope 动态 value 更新）                                                                                                                           | Phase 3 见「组合宿主场景」节 |
| 13  | 样式契约                    | pass | widget 自样式；toolbar 布局类为视觉设计部分（:89）；cn() 合并（:86）；无 BEM                                                                                                                                                                                                                                                                                                            | —                            |
| 14  | React 19 规范               | pass | 无冗余 memo；copied 状态经 setState 直接管理；无 effect+setState 镜像                                                                                                                                                                                                                                                                                                                   | —                            |
| 15  | 性能边界                    | pass | 大对象由 JsonViewer 树渲染（库内建折叠，collapsed 默认展开但作者可控）；复制 JSON.stringify 仅点击时执行（:56）；无 O(n²) 热点；`check:audit-performance-suspects` 0 命中                                                                                                                                                                                                               | —                            |
| 16  | 测试质量                    | pass | 7 用例断言正确行为（空态 data-state/树内容/折叠语义/复制 payload 形状/定时器清理）；无 not-throw 空断言                                                                                                                                                                                                                                                                                 | —                            |
| 17  | 文档对照                    | pass | design.md §4/§5/§10/§11.1 ↔ 实现一致（字段清单、collapsed 语义、nop-json-view marker、复制定时器生命周期 §11.1 已实现+已测）；§8 推荐句柄未实现 → P2-b backlog；quick-reference 无组件级词条（n/a）                                                                                                                                                                                     | P2-b                         |
| 18  | 注册、包边界与 IO/安全红线  | pass | 单注册（:155）+ src/index.tsx 导出 JsonViewRenderer ✓；**`navigator.clipboard.writeText`（:57）直调浏览器 API**——INV-1 清单（fetch/WebSocket/localStorage/history/import 等）不含 clipboard，且为 best-effort（try/catch 吞错 + capability 检查 :57）→ P3 观察（若未来 env 提供 clipboard 抽象再迁移）；无 dangerouslySetInnerHTML；**component-lab lab 页缺失** → P2-2（Phase 3 补页） | P2-2 / P3-2                  |

## 发现清单

- [P0] 无
- [P1] 无
- [P2-b] design.md §8 推荐句柄（component:copy/onCopy）未实现——「推荐支持」非承诺契约，需组件 capability 注册面（>15 分钟）→ 状态: backlog（审计卡 backlog 归 CR 集中处理）
- [P2-2] component-lab lab 页缺失 → 状态: fixing（Phase 3 新增 `json-view-lab-page.tsx`）
- [P3-1] 树无 role="tree" 语义（react-json-view-lite 库限制，展示型数据视图可接受）→ 状态: keep
- [P3-2] `navigator.clipboard` 直调（INV-1 清单外、best-effort、capability-checked）→ 状态: keep

## 组合宿主场景（真实浏览器验证）

- 场景: json-view 空态 + scope 动态 value 更新（Phase 3）| 断言: host-json-empty（c6-1-host-surfaces.spec.ts）——null 空态展示（data-state=empty + empty 文案）无抛错；scope 按钮 Set object value → 树渲染（.json-viewer + Alice）；Set null → 空态返回 | 结果: **pass**

## 修复记录

- plan: `docs/plans/2026-08-04-0841-2-c6-1-content-text-family-audit.md` Phase 2/3
- test-first 证据: n/a（无行为缺陷；P2-b backlog 显式登记）
- 实现: Phase 3 新增 `json-view-lab-page.tsx`（lab 页，P2-2）
- 验证: `pnpm --filter @nop-chaos/flux-renderers-content typecheck && build && lint && test` 全绿（248 tests）；宿主场景 c6-1-host-surfaces.spec.ts json-view-host 1/1 + smoke/w1a 回归绿
- 卡状态流转: open（Phase 1 产出）→ fixing（Phase 2 修复）→ fixed-pending-closure（Phase 3 宿主实证）→ closed（Phase 4 全卡复查）

## Closure

- 全卡复查（Phase 4）：18 维表结论与最终代码一致；P0 ×0、P1 ×0；P2-2 lab 页 fixed；P2-b backlog 显式登记归 CR；P3 keep ×2（卡内记录）；卡状态 `closed`
- 独立 closure audit: 待填写（见 plan `2026-08-04-0841-2` Closure 节，mission-driver CLOSURE_VERIFY fresh session 执行；执行 session 不自审）
