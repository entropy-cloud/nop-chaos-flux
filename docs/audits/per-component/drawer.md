# 审计卡：drawer（flux-renderers-basic）

> 状态: closed
> 审查日期: 2026-08-02
> 审查 plan: `docs/plans/2026-08-02-2043-2-c1-1-basic-structure-core-family-audit.md`
> 注册定义: `packages/flux-renderers-basic/src/surface-renderer-definitions.ts:194` | 渲染器: `packages/flux-renderers-basic/src/drawer.tsx:5` + `use-surface-renderer.ts:26` + host `packages/flux-react/src/dialog-host.tsx:374` | design.md: `docs/components/drawer/design.md` | playground: `apps/playground/src/component-lab/renderers/drawer-lab-page.tsx` | e2e: `tests/e2e/component-lab/layout-content.spec.ts`、`surface-form-input.spec.ts`

## 组件身份

drawer / flux-renderers-basic / DrawerSchema / 无 defaultSchema / 表单参与: 无（surface shell）/ surface 家族（widget chrome，宿主渲染）

## 18 维审查记录

| #   | 维度                        | 结论 | 证据                                                                                                                                                                                                                                                                                             | 发现                |
| --- | --------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------- |
| 1   | Schema 契约                 | pass | `surface-renderer-definitions.ts:241-245` fields = sharedSurfaceFields + side/closeOnOutside/resizable；`schemas.ts:83-110` DrawerSchema 全部键覆盖                                                                                                                                              | 无遗漏              |
| 2   | RendererComponentProps 合规 | pass | 同 dialog（共享 use-surface-renderer）                                                                                                                                                                                                                                                           | —                   |
| 3   | 值所有权三态                | pass | 同 dialog：open/defaultOpen/host-driven；component-handles-surface.test.tsx drawer 用例冻结                                                                                                                                                                                                      | —                   |
| 4   | 表单参与                    | n-a  | —                                                                                                                                                                                                                                                                                                | 同 dialog           |
| 5   | DOM 与选择器契约            | pass | host `dialog-host.tsx:482-492` `nop-drawer` + data-slot="drawer-surface" + data-close-on-outside/data-close-on-esc/data-mobile-side-overridden + testid/cid；data-slot drawer-close/drawer-confirm-bar（:501-552）；resize handle data-slot="drawer-resize-handle"（ui DrawerContent resizable） | 与 markers doc 对齐 |
| 6   | 嵌套 schema 分类            | pass | 同 dialog（sharedSurfaceFields region/event 分类）；onConfirm 模板保持                                                                                                                                                                                                                           | 无 deepFields 残留  |
| 7   | 事件与 action 契约          | pass | `surface-renderer-definitions.ts:5-43` 共享 eventContracts `{surfaceId, kind, open}`；派发形状一致；`closeOnOutside` 与 dialog `closeOnOutsideClick` 命名不对称已文档化（E2f 修复，design.md §2/§5.1）                                                                                           | —                   |
| 8   | a11y                        | pass | 焦点/键盘委托 ui Drawer；Esc reason 检查（dialog-host.tsx:451-465）；mobile bottom sheet（:430-431）；真机 Tab wrap 由 ui 层 `wrap-surface-tab-focus.ts` 兜底（与 dialog 共享修复，见 dialog 卡 P1-1）                                                                                           | —                   |
| 9   | i18n                        | pass | 宿主 t()；ui drawer 内部 aria 走 ui 层                                                                                                                                                                                                                                                           | —                   |
| 10  | 四态覆盖                    | pass | open/closed/top-active（basic-page-layout-surfaces.test.tsx）；resizable 本地状态重置（design.md §7）                                                                                                                                                                                            | —                   |
| 11  | 异步生命周期                | n-a  | —                                                                                                                                                                                                                                                                                                | 同 dialog           |
| 12  | 组合宿主场景                | pass | layout-content.spec.ts（右侧 drawer 表单提交关闭、左侧导航）+ surface-form-input.spec.ts（StrictMode textarea 值保持）+ drawer-lab-page.tsx 2 场景                                                                                                                                               | —                   |
| 13  | 样式契约                    | pass | `nop-drawer` 根 + host marker；buildSurfaceInlineStyle 仅 width/height（L6 不变量，dialog-host.tsx:51-80）；slot className 走 ui 原语                                                                                                                                                            | —                   |
| 14  | React 19 规范               | pass | 共享 use-surface-renderer（同 dialog 结论）                                                                                                                                                                                                                                                      | —                   |
| 15  | 性能边界                    | pass | 同 dialog（共享 summary 缓存）                                                                                                                                                                                                                                                                   | —                   |
| 16  | 测试质量                    | pass | surface-enhancements.test.tsx（resizable/closeOnOutside/size/confirm 各用例）+ basic-page-layout-surfaces + e2e                                                                                                                                                                                  | —                   |
| 17  | 文档对照                    | pass | design.md §10 L6 不变量与 host 一致；§14 mobile 不强制 size（与 dialog 差异）与 host :427-431 一致；§14 mobile side override 与 host :489 一致                                                                                                                                                   | —                   |
| 18  | 注册、包边界与 IO/安全红线  | pass | surface-renderer-definitions.ts:194 注册 + basic-renderer-definitions.ts:401 聚合；导出 index.tsx:15；playground drawer-lab-page.tsx 存在；无浏览器 IO；复用 ui Drawer/Button                                                                                                                    | —                   |

## 发现清单

- 无 P0/P1/P2 发现（P3：无）

## 组合宿主场景（真实浏览器验证）

- 场景: tabs 内 drawer 打开/关闭生命周期（Phase 3，host-tabs-nesting） | 结果: **pass**（c1-1-host-surfaces.spec.ts：开关后 drawer-surface 无残留）

## 修复记录

- 本卡无发现（18 维全 pass/n-a），无修复项；Phase 3 宿主场景 drawer 用例真机 pass（c1-1-host-surfaces.spec.ts）。
- 共享修复（ui 层 focus Tab wrap）见 dialog 卡 P1-1 修复记录（CX-2）。

## Closure

- 独立 closure audit: pass + 证据: `docs/plans/2026-08-02-2043-2-c1-1-basic-structure-core-family-audit.md` Closure Audit Evidence（独立子 agent fresh session task `ses_03cd0a4edffe5iADFQjlupOf6y`，verdict approved，live-repo 复核 + 亲自重跑 focused 测试与 e2e）
