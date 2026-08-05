# 审计卡：ai-welcome（flux-renderers-ai）

> 状态: closed
> 审查日期: 2026-08-05
> 审查 plan: `docs/plans/2026-08-05-1721-1-c8-3-ai-enhancement-family-audit.md`
> 注册定义: `packages/flux-renderers-ai/src/ai-renderer-definitions.ts:151` | 渲染器: `packages/flux-renderers-ai/src/renderers/ai-welcome.tsx:10` | design.md: `docs/components/flux-renderers-ai/design.md:78,:585` | renderers.md: `docs/components/flux-renderers-ai/renderers.md:326-337` | playground: `apps/playground/src/pages/ai-widgets-demo.tsx:54` + `apps/playground/src/component-lab/renderers/ai-welcome-lab-page.tsx`（Phase 3 新增） | e2e: `tests/e2e/ai-widgets-demo.spec.ts:9` + `tests/e2e/component-lab/c8-3-host-surfaces.spec.ts`（Phase 3 新增）

> 卡状态说明：本卡 P0×0/P1×0；P2×2（独立测试文件 + lab 页），均在本 plan 内修复，修复后直接 `closed`。

## 组件身份

ai-welcome / flux-renderers-ai / AiWelcomeSchema（`schemas.ts:223-230`）/ defaultSchema `{type:'ai-welcome'}` / 表单参与: 否 / Widget 渲染器（空状态欢迎面板，根 marker `nop-ai-welcome`）：title/description/icon/align(left|center|right，默认 center) + footer value-or-region，无事件。

## 18 维审查记录

| #   | 维度                        | 结论 | 证据                                                                                                                                                                                                                                                                                                                               | 发现  |
| --- | --------------------------- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| 1   | Schema 契约                 | pass | AiWelcomeSchema（schemas.ts:223-230：title/description/icon/align 枚举 + footer SchemaInput）↔ 注册 fields（definitions.ts:157-163：4 prop + footer value-or-region regionKey 'footer'，defaultSchema :155）↔ 渲染器消费（ai-welcome.tsx:12-13 align 默认 center、:14 footer region 求值、:24-38 内容守卫非空字符串才渲染）        | —     |
| 2   | RendererComponentProps 合规 | pass | 仅读 props.props/meta/regions（:11-22,:39）；无 store 直访、无 ad-hoc context、无 prop-drilling（footer region 经 props.regions.footer.render() 标准通道）                                                                                                                                                                         | —     |
| 3   | 值所有权三态                | n-a  | 纯展示 widget：全部内容来自 schema props（title/description/icon 为字面值，footer 为 region），无 value 写回路径、无表单泄漏（display-only 三态不适用）                                                                                                                                                                            | —     |
| 4   | 表单参与                    | n-a  | 非表单字段（无 name/required/validation）                                                                                                                                                                                                                                                                                          | —     |
| 5   | DOM 与选择器契约            | pass | 根 `nop-ai-welcome` marker（:18）+ data-slot="ai-welcome"（:19）+ data-align（:20）+ data-cid（:21）+ data-testid；子 slot ai-welcome-icon/-title/-description/-footer；`check:audit-missing-renderer-markers` 0 命中；data-cid 传播（data-cid-contract.test.tsx:104）                                                             | —     |
| 6   | 嵌套 schema 分类            | pass | footer 为 value-or-region（definitions.ts:162 kind 'value-or-region' regionKey 'footer'；渲染器 :14/:39 经 regions.footer.render() 求值）——08-02 分类正确；其余字段纯 prop；无 deepFields 残留（live grep 零命中）                                                                                                                 | —     |
| 7   | 事件与 action 契约          | n-a  | 无 schema 事件（title/description/icon/align/footer 全为值/region 面）；renderers.md §13 无 ai-welcome 行 ✓（无事件不应声明）                                                                                                                                                                                                      | —     |
| 8   | a11y                        | pass | title 为 h2 语义标题（:30）；description 为 p；icon aria-hidden（:25）；非交互组件无键盘路径需求；footer region 内容可含交互（宿主决定）                                                                                                                                                                                           | —     |
| 9   | i18n                        | pass | 无硬编码文案——全部内容来自 schema props（host 数据驱动）；无 aria-label 硬编码；`check:i18n-keys` 0 命中                                                                                                                                                                                                                           | —     |
| 10  | 四态覆盖                    | pass | 空态（全部字段缺失 → 仅根容器 + marker/data-slot/data-align，不崩溃 :16-23）；部分缺失（仅 icon/仅 title 等独立守卫 :24-38）；加载/错误/禁用 n/a（无 schema 字段）                                                                                                                                                                 | —     |
| 11  | 异步生命周期                | n-a  | 无异步路径                                                                                                                                                                                                                                                                                                                         | —     |
| 12  | 组合宿主场景                | pass | 既有：ai-widgets-demo.spec.ts:9（真实浏览器 title/description/icon 渲染）；**Phase 3 补 host-welcome-reg（footer region 内嵌组件求值/事件正常）**                                                                                                                                                                                  | 见 P3 |
| 13  | 样式契约                    | pass | Widget 自样式（`flex flex-col gap-3 p-6` 面板 + align 派生类属控件视觉设计——非布局 renderer，自样式豁免）；cn() 合并 meta.className；无 BEM；无 ThemeProvider；`check:audit-styling-suspects` 本文件 0 命中                                                                                                                        | —     |
| 14  | React 19 规范               | pass | 无任何 hooks（纯渲染函数）；footerNode 渲染期派生（:14）——无 effect+setState 镜像                                                                                                                                                                                                                                                  | —     |
| 15  | 性能边界                    | pass | 常量级内容；无订阅                                                                                                                                                                                                                                                                                                                 | —     |
| 16  | 测试质量                    | fail | 既有覆盖散在 p1-renderers.test.tsx:153-184（title/description/icon 渲染 + align 默认 center）与 data-cid-contract.test.tsx:104——**无独立测试文件**：footer region 渲染、align left/right、部分字段缺失（仅 icon）、data-cid/data-align DOM 契约无独立断言                                                                          | P2-1  |
| 17  | 文档对照                    | pass | renderers.md §6（:326-337）与 schemas.ts:223-230 一致（footer `常放 ai-prompts` 组合用法说明 ✓）；design.md:78/:585（P1 清单 + marker 表）一致；§13 Events 总览无 ai-welcome 行 ✓（无事件声明）；**ai-bubble 卡 P3 观察的 §13 onAction 误标行核对：live 归属 ai-feedback :622（schema 确有 onAction 字段），无 ai-welcome 族残留** | —     |
| 18  | 注册、包边界与 IO/安全红线  | pass | 单注册（definitions.ts:151）+ surface 导出（src/index.ts:44）+ registerAiRenderers ✓；playground ai-widgets-demo.tsx:54（beforeMessages 内嵌于 ai-chat）✓；无浏览器 IO 直调 ✓；**component-lab lab 页缺失 → P2-2（Phase 3 补页 + registry/route/manifest）**                                                                       | P2-2  |

## 发现清单

- [P2-1] 测试盲区：无独立测试文件（footer region 渲染、align left/right、部分字段缺失、data-cid/data-align DOM 契约未独立断言）→ 状态: fixed（Phase 2 新增 `ai-welcome.test.tsx` 9 用例：marker/data-slot 渲染、部分内容（仅 icon）、空根、align 三值类映射、footer region 渲染/省略、data-cid/testid 传播）
- [P2-2] component-lab lab 页缺失（维度 18 覆盖缺口）→ 状态: fixed（Phase 3——`ai-welcome-lab-page.tsx` + registry/route/manifest 条目）

## 组合宿主场景（真实浏览器验证）

- 场景: Phase 3 —— host-welcome-reg（ai-welcome footer region 内嵌组件 → region 渲染 + 内嵌按钮 action 派发（probe 值 0→1 递增证明 host scope 求值正常））| 断言: `tests/e2e/component-lab/c8-3-host-surfaces.spec.ts`（programmatic DOM 断言，禁截图） | 结果: **pass（Phase 3）**

## 修复记录

- Phase 2：P2-1 独立测试文件（`ai-welcome.test.tsx` 9 用例）。
- Phase 3：P2-2 lab 页 + host 场景（c8-3-host-surfaces.spec.ts 4/4）。
- 验证: `pnpm --filter @nop-chaos/flux-renderers-ai typecheck && build && lint && test` 绿（509，含新增 9 用例）+ c8-3 host spec 4/4 全绿。

## Closure

- 18 维核对完成（dim 16 发现已修复回填）；P0×0/P1×0/P2×2 fixed；卡状态 `closed`（Phase 4 全量回归绿后流转，checklist §3：P0/P1 清零）
- 独立 closure audit: 待定（mission-driver CLOSURE_VERIFY fresh session——见 plan `2026-08-05-1721-1` Closure Audit Evidence）
