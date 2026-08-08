# 审计卡：rd-4 预览（report-designer-core + report-designer-renderers，D3.3 面）

> 状态: closed
> 审查日期: 2026-08-08
> 审查 plan: `docs/plans/2026-08-08-1315-2-round2-d33-report-designer-surface-audit.md`
> 面定义: `docs/audits/host-surface/surface-inventory.md` rd-4 | 渲染器: `core-dispatch.ts:172-229`（preview 命令）+ `runtime/preview-commands.ts`（resolvePreviewAdapter/runPreviewCommand）+ `report-designer-toolbar.tsx`（Preview/Stop 按钮）
> 契约基准: `docs/audits/host-surface/README.md` §1 report-designer 行（`contracts.md` §5.4 preview adapter + `nop-report-profile.md` 预览路径）

## 面身份

rd-4 预览面：`report-designer:preview` 命令（mode union inline/dialog/replace-page/download + args）+ PreviewAdapter 解析（config.preview.provider / profile.previewId → registry.previews）+ 运行生命周期（running 态 + requestId 陈旧完成丢弃 + abort/stopPreview）+ toolbar Preview/Stop 入口。表单参与：无。布局 or widget：widget（命令面 + 入口控件）。

## 维度审查记录（18 维降维 + Designer 特有维度）

| #   | 维度                        | 结论                                                                                                                                                                                                                                                  | 证据                                                                      | 发现      |
| --- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | --------- |
| 1   | Schema 契约                 | config.preview.provider（renderers.tsx:125-131 shape）+ profile.previewId（page-renderer.tsx:132）+ adapters.previews Map（Partial registry 透传）；manifest preview args/result envelope 形状（previewResultEnvelopeShape）↔ PreviewAdapter 契约一致 | renderers.tsx:125-131、report-designer-manifest.ts:169-193,437-456        | —         |
| 2   | RendererComponentProps 合规 | 命令面在 core（无 react）；toolbar 从 props.props/helpers.dispatch 取数；无 store 直访                                                                                                                                                                | report-designer-toolbar.tsx:15-26,28-53                                   | —         |
| 3   | 值所有权三态                | preview 状态（running/mode/lastResult）为 core 状态（local）+ scope 投影（designer.preview/runtime.previewRunning/previewMode）+ statusPath 发布（busy/previewRunning）三态齐备                                                                       | core.ts:57-76、host-data.ts:239-253、page-renderer.tsx:531-544            | —         |
| 4   | 表单参与                    | 无                                                                                                                                                                                                                                                    | —                                                                         | —         |
| 5   | DOM 与选择器契约            | toolbar Preview/Stop 按钮（Button data-active/intent 视觉）；无新 data-slot（复用 report-designer-toolbar 容器）                                                                                                                                      | report-designer-toolbar.tsx:126-144                                       | —         |
| 6   | 嵌套 schema 分类            | 不适用（无内嵌 schema）                                                                                                                                                                                                                               | —                                                                         | —         |
| 7   | 事件与 action 契约          | preview/stopPreview 经 toolbar helpers.dispatch → actionScope namespace 派发；无 schema 事件；manifest 12 方法与 core 12 case 一致（preview/stopPreview 在列）                                                                                        | report-designer-toolbar.tsx:28-53、host-action-provider.ts:9-22           | —         |
| 8   | a11y                        | Preview 按钮 label 硬编码英文（'Preview'，见 P2-3）；Stop 按钮 visible 模板 `${preview.running}` 切换；无 aria-pressed（toggle 语义弱，P3-1）                                                                                                         | report-designer-toolbar-defaults.ts:24-36                                 | P2-3/P3-1 |
| 9   | i18n                        | 错误消息硬编码英文 2 处（preview-commands.ts:22/:27 'No preview provider configured'/'Preview adapter not found: X'——经 toolbar dispatch 失败 → reportRuntimeHostIssue 用户可见）；'Preview'/'Stop' 按钮标签硬编码英文 → P2 路由 DR-7                 | preview-commands.ts:19-29、report-designer-toolbar-defaults.ts:24-36      | P2-3      |
| 10  | 四态覆盖                    | 无 provider（错误结果）+ provider 不存在（错误结果）+ 运行中（running + Stop 可见）+ 完成（lastResult + running:false）+ 取消（stopPreview → abort → cancelled:true）全分支有测试                                                                     | designer-core.async.test.ts:29-110                                        | —         |
| 11  | 异步生命周期                | startPreviewRun（requestId + AbortController 前一次 abort）；isCurrentPreviewRun 陈旧完成丢弃（测试 :38-94 锁定）；stopPreview cancelPreviewRun；isAbortError → cancelled:true；previewController dispose abort                                       | core.ts:190-206,503-515、core-dispatch.ts:172-229                         | —         |
| 12  | 组合宿主场景                | **无任何 e2e**（demo 页无 preview 入口/adapter）——真缺口（Phase 5 新增宿主页 + spec：Preview → mock adapter running/完成 + 结果展示）                                                                                                                 | —                                                                         | 缺口在案  |
| 13  | 样式契约                    | toolbar 视觉 = Button intent primary（preview）/outline；无新样式契约                                                                                                                                                                                 | report-designer-toolbar.tsx:130-144                                       | —         |
| 14  | React 19 规范               | toolbar items useMemo（itemsOverride 依赖）；runtimeSnapshot useMemo；无冗余优化                                                                                                                                                                      | report-designer-toolbar.tsx:19-26                                         | —         |
| 15  | 性能边界                    | preview 文档 clone（cloneDocument 防 adapter 篡改）；无订阅泄漏（store 内部）                                                                                                                                                                         | runPreviewCommand（preview-commands.ts:51-70）                            | —         |
| 16  | 测试质量                    | designer-core.async.test（无 adapter / 陈旧完成丢弃 / abort / stopPreview 竞态）；host-action-provider.test（preview mode union 校验拒绝 'modal'）；toolbar.test（preview switch 渲染 + dispatch 映射）；e2e 缺口 Phase 5 补                          | designer-core.async.test.ts:29-110、host-action-provider.test.ts:107-116  | —         |
| 17  | 文档对照                    | contracts.md §5.4 preview adapter 与 adapters.ts PreviewAdapter 一致；manifest previewResultEnvelopeShape 描述 'Discriminated envelope for report-designer:preview results' ↔ nop-report-profile.md 预览语义一致；无 phantom                          | docs/architecture/report-designer/contracts.md:623-642                    | —         |
| 18  | 注册/边界/IO                | preview adapter 为 host 注入（registry.previews），core 无 IO；INV-1 零命中                                                                                                                                                                           | D3.3 live 跑（2026-08-08）                                                | —         |
| H1  | host 契约                   | preview 方法 args（mode union + args object）↔ validateMethodPayload 拒绝 'modal'（测试在案）；result envelope（ok/cancelled/changed/error/data + mode/output）↔ PreviewResult 形状一致；provider 解析链（config→profile→registry）双向核对通过       | report-designer-manifest.ts:437-456、host-action-provider.test.ts:107-116 | —         |
| H2  | 事务 undo                   | preview 非文档变更不入 undo 栈（changed:false）；preview 期间 undo 不禁用（文档回退与预览并行——语义可接受）                                                                                                                                           | core-dispatch.ts:215、286-320                                             | —         |
| H3  | 拖拽                        | 不适用                                                                                                                                                                                                                                                | —                                                                         | —         |
| H4  | 键盘                        | toolbar 按钮原生键盘可达；无快捷键映射（preview 无快捷键）                                                                                                                                                                                            | report-designer-toolbar.tsx                                               | —         |
| H5  | 剪贴板                      | 不适用                                                                                                                                                                                                                                                | —                                                                         | —         |
| H6  | e2e 可操作性                | 真缺口 = 预览入口真实浏览器场景（Phase 5 新增）                                                                                                                                                                                                       | —                                                                         | 缺口在案  |
| H7  | MA4.3 缺口回归              | MA43-P1-02 registerPreview 直接测试在案（adapters-and-helpers.test.ts:238）→ 收敛；preview 路径行为测试齐备                                                                                                                                           | adapters-and-helpers.test.ts:238                                          | —         |

## 发现清单

- [P2-3] 预览面硬编码英文：preview-commands.ts:22/:27 错误消息 + report-designer-toolbar-defaults.ts:24/:31 'Preview'/'Stop' 标签 + report-designer-toolbar.tsx:44/:58 'Report toolbar action failed' 兜底消息（用户可见）→ 状态: 登记 DR-7（跨面集中修复 i18n 化，复用 flux.reportDesigner.\* key 族）
- [P3-1] Preview 按钮无 aria-pressed/toggle 语义（preview 运行中无状态化表达——Stop 出现即状态信号，可接受）→ 状态: 卡内记录

## 组合宿主场景（真实浏览器验证，bug 73 模式专项）

- 场景（Phase 5 新增）: 宿主页 toolbar Preview 点击 → mock preview adapter（window hook 记录）→ running/完成 + preview 结果 data 断言；Stop 按钮可见性切换 | 断言: programmatic DOM + window hook | 结果: pass（`report-designer-host.spec.ts` 2026-08-08 全绿）

## 修复记录

- 本面无行为修复（P2-3 路由 DR-7；P3 卡内记录）

## Closure

- 独立 closure audit: pass | fail + 记录位置（fresh session）
