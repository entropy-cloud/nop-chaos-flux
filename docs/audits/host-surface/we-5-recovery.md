# 审计卡：we-5 恢复（word-editor-core + word-editor-renderers，D3.4 面）

> 状态: closed
> 审查日期: 2026-08-08
> 审查 plan: `docs/plans/2026-08-08-1315-3-round2-d34-word-editor-surface-audit.md`
> 面定义: `docs/audits/host-surface/surface-inventory.md` we-5 | 渲染器: `document-io.ts` persist/load/recovery 全链路（persistSavedDocument/saveDocument/loadDocument/loadDatasets/loadRecoveredState + normalize 族）
> 契约基准: `docs/audits/host-surface/README.md` §1 word-editor 两包行（`docs/architecture/word-editor/design.md` 唯一 owner doc）

## 面身份

we-5 恢复面：localStorage 持久化 + mount-time recovery（persisted-first，design.md:178-179）+ 失败态（storage-unavailable/storage-read-failed/json-parse-failed → RecoveryLoadError 上报）+ SSR 安全回退。表单参与：无。布局 or widget：IO/数据面。

## 覆盖矩阵映射

| e2e spec                                                     | 映射 |
| ------------------------------------------------------------ | ---- |
| word-editor-persistence.spec.ts（保存 + reload 恢复 + 字数） | ✓    |
| word-editor-dataset.spec.ts（数据集持久化 reload）           | ✓    |

（完整矩阵见 surface-inventory.md D3.4 增量登记节）

## 维度审查记录（18 维降维 + Designer 特有维度）

| #   | 维度                        | 结论                                                                                                                                                                                                                                                                                  | 证据                                                                               | 发现 |
| --- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ---- |
| 1   | Schema 契约                 | `SavedDocumentData`（data/paperSettings/savedAt）与 host `document` 投影（saved.data）一致；`WordEditorRecoveredState`（document/datasets）为恢复契约 ✓；`loadRecoveredState(initialDatasets)` persisted-first（design.md:178-179 一致）✓                                             | document-io.ts:31-41,535-543、use-word-editor-state.ts:70-73,205-209               | —    |
| 2   | RendererComponentProps 合规 | 恢复面在 core（纯 TS）；renderers 经 loadRecoveredState/loadDocument 调用，无直访 ✓                                                                                                                                                                                                   | use-word-editor-state.ts:70-73                                                     | —    |
| 3   | 值所有权三态                | 恢复态 = 持久化快照（local storage）+ schema initial 兜底 + 空默认；`document` 投影 = savedDocumentRef（autosave 500ms 滞后语义）✓；datasets 恢复优先于 schema datasets ✓；**dirty 不清除当恢复失败**（load 失败 → savedDocument null → 空文档，不误标 dirty）✓                       | document-io.ts:535-543、use-word-editor-state.ts:80-85,205-209                     | —    |
| 4   | 表单参与                    | 无                                                                                                                                                                                                                                                                                    | —                                                                                  | —    |
| 5   | DOM 与选择器契约            | 恢复无 DOM 面（数据层）；preview 回显 testid 在案（word-editor-saved-preview）✓                                                                                                                                                                                                       | word-editor-page.tsx:159-161                                                       | —    |
| 6   | 嵌套 schema 分类            | 不适用                                                                                                                                                                                                                                                                                | —                                                                                  | —    |
| 7   | 事件与 action 契约          | RecoveryLoadError 上报经模块级 handler（setRecoveryLoadErrorHandler）——**renderers/playground 零注册**（错误静默吞，仅函数安全回退兜底）→ P3-1；无 schema 事件                                                                                                                        | document-io.ts:71-81、rg setRecoveryLoadErrorHandler 零消费                        | P3-1 |
| 8   | a11y                        | 不适用（数据面）                                                                                                                                                                                                                                                                      | —                                                                                  | —    |
| 9   | i18n                        | 无用户文案面（错误消息英文为异常诊断，非 UI 面）——design.md:187 工具链 chrome 条款不适用                                                                                                                                                                                              | —                                                                                  | —    |
| 10  | 四态覆盖                    | 空存储（null/[]）✓ / 有效恢复 ✓ / 损坏 JSON（parse 失败 → 上报 + null）✓ / **合法 JSON 但根为 null/非对象 → 崩溃（见 we-7 P1-1）** / SSR 无 storage（getStorage null 守卫）✓                                                                                                          | document-io-persist.test.ts:237-407、document-io.ts:83-89                          | we-7 |
| 11  | 异步生命周期                | 恢复为同步路径（render memo 内调用——StrictMode 双调用幂等，P3-2）；持久化写失败（storage-write-failed）经 SaveDocumentError 上报 ✓；abort 无涉及 ✓                                                                                                                                    | use-word-editor-state.ts:70-73、document-io.ts:369-384                             | P3-2 |
| 12  | 组合宿主场景                | 真实浏览器场景齐备（保存 → reload → 恢复文本/字数/数据集）→ 本面结果 pass（word-editor-persistence.spec + word-editor-dataset.spec 2026-08-08 绿）                                                                                                                                    | tests/e2e/word-editor-persistence.spec.ts:22-57、word-editor-dataset.spec.ts:55-61 | —    |
| 13  | 样式契约                    | 不适用                                                                                                                                                                                                                                                                                | —                                                                                  | —    |
| 14  | React 19 规范               | loadRecoveredState 于 useMemo 调用（render 期读 localStorage——副作用入 render，幂等可接受但非纯；P3-2）                                                                                                                                                                               | use-word-editor-state.ts:70-73                                                     | P3-2 |
| 15  | 性能边界                    | 恢复一次读取（两 key）O(1)；无热点                                                                                                                                                                                                                                                    | —                                                                                  | —    |
| 16  | 测试质量                    | document-io-persist.test（17 用例：保存/读取/失败/升级/过滤/恢复）+ document-io-normalize.test + document-io-datasets.test 齐备 ✓；**缺口：合法 JSON 非对象根（"null"）未覆盖**（→ we-7 P1-1 补测）                                                                                   | document-io-persist.test.ts:376-407                                                | we-7 |
| 17  | 文档对照                    | design.md:177（持久化 helper SSR 安全回退）——**persistSavedDocument storage-unavailable 时 throw（非 return false），与「must return explicit safe fallbacks」措辞漂移**（调用方全 catch，无功能损失）→ P2-1 路由 DR-16（改 API 返回语义或修文档措辞二选一，公共 API 变更需人工确认） | design.md:177、document-io.ts:369-384                                              | P2-1 |
| 18  | 注册、包边界与 IO/安全红线  | localStorage 仅 core document-io（SSR getStorage 守卫，design.md:177 落地）✓；renderers 零直连 IO（INV-1 零命中）✓；导出面含 12 条 document-io 函数（index.ts:26-44，本 plan 不改）✓                                                                                                  | document-io.ts:83-89、word-editor-core/src/index.ts:26-44                          | —    |
| H1  | host 契约                   | `document` 投影 = 恢复快照优先（design.md:178 mount-time recovery persisted-first）✓；save 路径持久化（persistSavedDocument + saveDatasets 成功提交后）✓；无独立恢复 host 方法                                                                                                        | use-word-editor-state.ts:80-85、word-editor-action-provider.ts:125-137             | —    |
| H2  | 事务 undo                   | 不适用（undo 面见 we-1 H2）                                                                                                                                                                                                                                                           | —                                                                                  | —    |
| H3  | 拖拽                        | 不适用                                                                                                                                                                                                                                                                                | —                                                                                  | —    |
| H4  | 键盘                        | 不适用                                                                                                                                                                                                                                                                                | —                                                                                  | —    |
| H5  | 剪贴板                      | 不适用                                                                                                                                                                                                                                                                                | —                                                                                  | —    |
| H6  | e2e 可操作性                | 本面 e2e 齐备 ✓；Phase 5 新增候选 = 损坏 JSON 恢复（we-7 场景，seed localStorage "null" → 打开不崩溃）                                                                                                                                                                                | tests/e2e/word-editor-persistence.spec.ts                                          | we-7 |
| H7  | MA4.3 缺口回归              | MA43-P1-08 收敛（Phase 1 核对）；document-io 测试族为 we-5 回归基准（document-io-persist.test 17 用例在案）✓                                                                                                                                                                          | surface-inventory.md D3.4 增量登记节                                               | —    |

## 发现清单

- [P2-1] **persistSavedDocument SSR/不可用 throw vs design.md「return safe fallbacks」措辞漂移**（document-io.ts:369-384；调用方全 catch 无功能损失）→ 状态: 登记 DR-16（改返回语义（公共 API）或修 design.md 措辞，DR 裁决）
- [P3-1] setRecoveryLoadErrorHandler 零消费（恢复错误上报无 app 级接收者，错误静默）→ 状态: 卡内记录（函数安全回退兜底无崩溃；host 可自行注册，watch）
- [P3-2] loadRecoveredState 在 useMemo（render 期 localStorage 读取，StrictMode 双调用幂等）→ 状态: 卡内记录（SSR 安全，非纯渲染，可接受）
- （we-7 P1-1 loadDocument 合法 JSON null 根崩溃——**fixed**（bug note 114，见 we-7 卡），本面损坏存储崩溃路径一并覆盖）

## 组合宿主场景（真实浏览器验证，bug 73 模式专项）

- 场景: playground `#/word-editor` 键入 → 保存 → reload → 文本/字数/数据集恢复断言 | 结果: pass（word-editor-persistence.spec + word-editor-dataset.spec 2026-08-08 全绿）

## 修复记录

- 无直接代码修复（P2-1 路由 DR-16）；we-7 P1-1 修复同时覆盖本面损坏存储崩溃路径（test-first 见 we-7 卡）

## Closure

- 卡状态 closed：2026-08-08 Phase 5 收口（全部 P0/P1 fixed、P2 显式路由 DR 零悬挂、P3 卡内记录、宿主场景 ≥1 在案）；plan 级 closure audit 由独立 fresh session 执行（记录见 plan `2026-08-08-1315-3` Closure 节）
