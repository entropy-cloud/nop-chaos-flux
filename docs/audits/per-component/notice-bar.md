# 审计卡：notice-bar（flux-renderers-mobile）

> 状态: closed
> 审查日期: 2026-08-05
> 审查 plan: `docs/plans/2026-08-05-1314-1-c7-mobile-interaction-family-audit.md`
> 注册定义: `packages/flux-renderers-mobile/src/mobile-renderer-definitions.ts:101` | 渲染器: `packages/flux-renderers-mobile/src/notice-bar.tsx:27` | design.md: `docs/components/notice-bar/design.md` | playground: `apps/playground/src/pages/mobile-components-demo.tsx:86` | e2e: `tests/e2e/mobile-components.spec.ts`（2 测试）+ `tests/e2e/m5-mobile-showcase.spec.ts`

> 卡状态说明：本卡无 P0/P1 发现（18 维核对全 pass/n-a；唯一发现 P2-1 lab 页缺口，P2 低成本 Phase 3 补建后回填证据）——按 checklist §3「P0/P1 未清零才禁止 closed」，本卡可直接 closed。

## 组件身份

notice-bar / flux-renderers-mobile / NoticeBarSchema（`schemas.ts:95-107`）/ defaultSchema `{type:'notice-bar', text:'Notice'}` / 表单参与: 否 / widget 展示型组件（text string|string[] + marquee 滚动 + 多文本轮播 + closable + onClick/onClose 原生事件转发 + 变体语义色）。

## 18 维审查记录

| #   | 维度                        | 结论 | 证据                                                                                                                                                                                                                                                                                                                                                                                                            | 发现       |
| --- | --------------------------- | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 1   | Schema 契约                 | pass | NoticeBarSchema（schemas.ts:95-107：text/scrollable/speed/direction/loop/closable/icon/variant/onClick/onClose）↔ 注册 fields（mobile-renderer-definitions.ts:107-118：9 prop + 2 event；布尔 valueType 标注）↔ 渲染器消费（notice-bar.tsx:29-42 默认值、:44-55 textList 归一、:158-173 事件）三方一致；defaultSchema `{text:'Notice'}` ✓；缺失 prop 降级（variant info/direction left/speed 50/loop true）存在 | —          |
| 2   | RendererComponentProps 合规 | pass | 仅读 props.props/meta/events（:28-42,:158-173,:202-212）；无 store 直访、无 ad-hoc context                                                                                                                                                                                                                                                                                                                      | —          |
| 3   | 值所有权三态                | n-a  | 展示组件无 value 面（design §1 纯展示）；visible/currentIndex/shouldScroll 为纯 local 内部状态                                                                                                                                                                                                                                                                                                                  | —          |
| 4   | 表单参与                    | n-a  | 非表单字段（design §1 明确纯展示）                                                                                                                                                                                                                                                                                                                                                                              | —          |
| 5   | DOM 与选择器契约            | pass | 根 `nop-notice-bar` marker（:205）+ data-slot="notice-bar"（:210）+ data-variant（:211）+ data-scrollable（:212）+ data-slot notice-bar-icon/:content/:text/:close（:214,:221,:226,:249）+ data-testid/data-cid 透传（:208-209）+ close data-testid 派生（:249）；`check:audit-missing-renderer-markers` 0 命中                                                                                                 | —          |
| 6   | 嵌套 schema 分类            | pass | 9 字段全 prop（字符串/数值/布尔）+ 2 event；无 region（design §2 明确 v1 不提供 body/icon region）；无 deepFields 残留（live grep 零命中）                                                                                                                                                                                                                                                                      | —          |
| 7   | 事件与 action 契约          | pass | onClick/onClose 派发**原生 DOM 事件转发**（:158-161/:165-167，MA-04 测试 :537-572 实证 currentTarget/type）——与 link（link.tsx:50）/card（card.tsx:28）原生转发同族惯例，payload 经 normalizeActionEvent 统一（link 卡 dim 7 裁定）；link/card 均无 eventContracts 先例 → 不强制声明；派发点与 design §4 Events 一致                                                                                            | —          |
| 8   | a11y                        | pass | role 分流（OA-04 :197-199：onClick 绑定 → role=button + tabIndex=0 + Enter/Space 键盘激活 :169-173；未绑定 → role=status advisory）；close 按钮 aria-label 走 i18n t()（:251）；icon aria-hidden（:217）                                                                                                                                                                                                        | —          |
| 9   | i18n                        | pass | close aria-label `t('flux.mobile.noticeBar.close', ...)`（:251）——key 与 locale 文件一致（zh-CN.ts:937-939/en-US.ts:938-940）；`check:i18n-keys` 0 命中；en-US 解析实证见 Phase 2 新增 `__tests__/event-and-i18n-contract.test.tsx`（'Close'）                                                                                                                                                                  | —          |
| 10  | 四态覆盖                    | pass | 空态（text 空/缺失 → 不渲染 :179-181 + 双测试）、静态/滚动态、多文本轮播、closable、loop 开关全覆盖（notice-bar.test.tsx:52-528 实证）；disabled 态 n/a（展示组件无 disabled 语义，design 无此字段）                                                                                                                                                                                                            | —          |
| 11  | 异步生命周期                | pass | carousel setTimeout 全路径清理（MM-15 :139-156 visible 守卫 + 测试 :465-509 无隐藏期 churn）；ResizeObserver 断开（:104）；currentIndex clamp（OA-19/MM-07 :119-121 + 测试 :365-407）；close 后 null 渲染（:175-177）                                                                                                                                                                                           | —          |
| 12  | 组合宿主场景                | pass | 单测覆盖充分（24 用例）；真实浏览器：mobile-components.spec.ts 2 场景（渲染/关闭）+ m5 套件；**Phase 3 补可关闭 + onClick 宿主场景（onClose 隐藏 + onClick 派发实证）**                                                                                                                                                                                                                                         | 见 Phase 3 |
| 13  | 样式契约                    | pass | widget 自样式（nop-notice-bar + 包 CSS variant 配色/`nop-notice-bar-marquee` keyframes，styles.css；NEW-MM-06 `--nop-notice-bar-*` 变量）；cn() 合并（:204-207）；无 BEM（markers-contract 断言）；无 ThemeProvider；`check:audit-styling-suspects` mobile 0 命中                                                                                                                                               | —          |
| 14  | React 19 规范               | pass | 无冗余 memo/useCallback（Compiler 基线——handler 为 render 内建闭包，无稳定性需求）；textList useMemo（:45，effect dep 稳定所需）；useLayoutEffect 溢出测量（:65）合法（DOM 读后同步渲染）；effect 拆分职责清晰                                                                                                                                                                                                  | —          |
| 15  | 性能边界                    | pass | 溢出测量仅 scrollable + 尺寸变更时（:65-81）；ResizeObserver 增量（H31 :89-105）；carousel 单 setTimeout 自续（:139-156）；动画走 CSS keyframes（design §9 性能决策）；无 selector 订阅                                                                                                                                                                                                                         | —          |
| 16  | 测试质量                    | pass | 24 用例断言**正确行为**（role/tabindex 分流、variant 协议、滚动/方向锁定 MM-24、轮播 loop/非溢出 OA-15、OA-20 停留时长、MM-15 无 churn、OA-19 clamp、原生事件转发 MA-04、close 不冒泡）；DOM 契约断言存在；无假绿（MA-20 溢出分支经 scrollWidth spy 覆盖真分支）                                                                                                                                                | —          |
| 17  | 文档对照                    | pass | design.md ↔ 实现一致：§4 schema/Events/字段分类同步；§5 滚动实现（duration 公式/OA-15/OA-20/OA-22 方向裁定）↔ 实现一致；§6 DOM marker/role 分流/`--nop-notice-bar-*` 变量/MA-05 keyframes 迁入包 CSS 全部文档化；§7 边界表与实现一致                                                                                                                                                                            | —          |
| 18  | 注册、包边界与 IO/安全红线  | fail | 单注册（:101）+ src/index.ts:45 导出 + registerMobileRenderers ✓；无浏览器 IO 直调（INV-1 live grep 零命中——ResizeObserver/scrollWidth 为 DOM 只读测量非 IO）✓；**component-lab lab 页缺失（维度 18 覆盖缺口）→ P2-1（Phase 3 补页 + registry/manifest/routes）**                                                                                                                                               | P2-1       |

## 发现清单

- [P2-1] component-lab lab 页缺失（维度 18 缺口）→ 状态: fixed（Phase 3——`notice-bar-lab-page.tsx` + registry/route/manifest 条目 + host-nb-close/host-nb-click 宿主场景）

## 组合宿主场景（真实浏览器验证）

- 场景: Phase 3 —— host-nb-close（可关闭 notice-bar：关闭按钮 → onClose 派发 + 组件卸载消失）、host-nb-click（onClick 绑定 → role=button 可点击 + 点击派发）、host-nb-static（未绑定 → role=status 不可聚焦）| 断言: `tests/e2e/component-lab/c7-host-surfaces.spec.ts`（programmatic DOM 断言，禁截图） | 结果: **pass 3/3**

## 修复记录

- 本卡无 P0/P1 发现，Phase 2/3 无代码修复；P2-1 lab 页补建于 Phase 3（lab 页 + registry + route + manifest + 宿主场景 3 项）。
- 验证: c7 host spec 6/6 + mobile/m5/m2 e2e 全绿。

## Closure

- 18 维核对全 pass/n-a（dim 7 原生事件转发与 link/card 同族惯例一致）；P0×0/P1×0；P2-1 已修复；卡状态 `closed`（checklist §3：无 P0/P1 可 closed）
- 独立 closure audit: pass（mission-driver CLOSURE_VERIFY fresh session，2026-08-05——见 plan `2026-08-05-1314-1` Closure Audit Evidence）
