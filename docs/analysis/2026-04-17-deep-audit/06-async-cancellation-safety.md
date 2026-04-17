# 06 异步模式与取消安全

- Task ID: `ses_268f5b160ffeZYrngIp1lQ4jbe`
- Source prompt: `docs/skills/deep-audit-prompts.md`

### [维度06] DataSource 在请求进行中会丢弃后续刷新，旧响应可覆盖新输入
- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\data-source-runtime.ts:307-323,378-390`; `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\source-registry.ts:320-338`
- **严重程度**: P1
- **异步操作**: 依赖 scope 变化自动刷新的 DataSource API 请求
- **竞态场景**: 步骤 1 用户输入筛选词 `a` 触发请求 A → 步骤 2 在 A 完成前继续输入 `ab`，registry 再次调用 `refresh()` → 结果 `runRequest()` 因 `fetchStatus === 'fetching'` 直接返回，A 不会被 supersede，最终把旧结果写回
- **用户可见故障**: 搜索结果、下拉选项、表格数据停留在上一次输入，对当前输入不一致，直到再次变更或手动刷新
- **建议**: 不要在 `fetching` 时直接丢弃刷新；应在新刷新到来时中止旧请求并启动新请求，或记录 `pendingRefresh/requestRevision`，在当前请求结束后立即补跑；提交结果前继续做 request revision / `signal.aborted` 校验，并补充快速连续输入回归测试
- **参考文档**: `docs/architecture/performance-design-requirements.md`

### [维度06] submitForm 的超时/取消信号在表单提交链路中丢失
- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\index.ts:177-185,429-433`; `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\form-runtime-submit-flow.ts:24,146-155`; `C:\can\nop\nop-chaos-flux\packages\flux-core\src\types\runtime.ts:157-162,306`
- **严重程度**: P1
- **异步操作**: `submitForm` 内建 action 的表单提交 / 提交 API 调用
- **竞态场景**: 步骤 1 用户提交表单，外层 action 带 `timeout` 或所在 surface 被关闭 → 步骤 2 action dispatcher 已触发 abort / timeout → 结果 `signal` 没有传入 `FormRuntime.submit` / `submitApi`，底层请求继续执行
- **用户可见故障**: UI 已显示取消/超时或对话框已关闭，但后台仍收到提交并产生真实副作用；在重试或再次提交时可能造成重复创建/重复更新
- **建议**: 给 `FormRuntime.submit`、`submitApiCall`、`submitApi` 以及表单 lifecycle `submitAction` 统一补上 `signal?: AbortSignal`，从 `runBuiltInAction` 一路透传到 `executeApiSchema/env.fetcher`；在 success/error lifecycle 前再校验一次取消状态，并补充“timeout 后不应继续发起/完成 submit”的回归测试
- **参考文档**: `docs/architecture/performance-design-requirements.md`; `docs/bugs/07-submit-concurrent-guard-fix.md`

### [维度06] Schema 根级 import 预加载仍用 cancelled 布尔标记，且 cleanup 不释放/不中止旧加载
- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-react\src\schema-renderer.tsx:108-167`; `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\imports.ts:177-206,317-322`
- **严重程度**: P2
- **异步操作**: `SchemaRenderer` 启动时的 imported namespace 预加载
- **竞态场景**: 步骤 1 用户打开 schema A，开始加载 imports → 步骤 2 在加载完成前切到 schema B/卸载组件 → 结果 effect cleanup 只设置 `cancelled = true`，旧加载继续运行，`releaseImportedNamespaces()` 还是空实现
- **用户可见故障**: 已离开的页面仍可能弹出旧 import 错误；更严重时，旧 schema 的 namespace 可能残留在当前 action scope 中，形成过期能力泄漏
- **建议**: 将 import loader / `ensureImportedNamespaces` 改为支持 `AbortSignal`，cleanup 中调用 `controller.abort()`；根级 preload 也要显式 release 旧 imports；删除 `cancelled` 布尔方案，改用 signal + request revision，并补充“切换 schema 时不保留旧 namespace”的回归测试
- **参考文档**: `docs/architecture/performance-design-requirements.md`

### [维度06] Flow Designer 自动布局没有并发门闩，旧布局结果可乱序覆盖新文档
- **文件**: `C:\can\nop\nop-chaos-flux\packages\flow-designer-renderers\src\designer-page.tsx:175-191`; `C:\can\nop\nop-chaos-flux\packages\flow-designer-core\src\elk-layout.ts:12-64`; `C:\can\nop\nop-chaos-flux\packages\flow-designer-core\src\tree-layout.ts:100-119`
- **严重程度**: P2
- **异步操作**: Designer 的 ELK auto-layout
- **竞态场景**: 步骤 1 用户对当前图触发 auto layout → 步骤 2 在 Promise 完成前继续拖拽节点、切换文档或再次点击 auto layout → 结果较早启动的布局 Promise 仍会在完成后执行 `core.layoutNodes(...)`，把旧快照的位置覆盖回去
- **用户可见故障**: 节点位置“跳回去”、手工调整丢失、连续点击后布局结果不稳定；大图场景也没有取消/超时出口
- **建议**: 为 layout 引入 revision/token，只有最新一次完成时才允许 apply；运行中发布 busy 状态并禁用重复触发；若底层无法真正 abort，至少在 apply 前比较文档 revision，并为大图补充 timeout / worker 化策略与回归测试
- **参考文档**: `docs/architecture/performance-design-requirements.md`; `docs/architecture/flow-designer/design.md`

### [维度06] 文档预览页的字数统计 Promise 没有 stale guard
- **文件**: `C:\can\nop\nop-chaos-flux\packages\word-editor-renderers\src\preview\DocPreviewPage.tsx:18-52`
- **严重程度**: P3
- **异步操作**: `CanvasEditorBridge.getWordCount()` 预览统计
- **竞态场景**: 步骤 1 用户打开文档 A 预览，触发字数统计 Promise → 步骤 2 在 Promise 返回前切到文档 B 或返回上一页 → 结果旧 Promise resolve 后仍直接 `setWordCount(count)`
- **用户可见故障**: 预览头部显示上一份文档的字数，或在页面快速切换时出现延迟更新的错误计数
- **建议**: 为该 effect 增加 request id / `AbortController` 风格的 stale guard；若 bridge 后续支持 signal，则在 cleanup 中中止旧统计；补充“快速切换预览文档时字数不串台”的测试
- **参考文档**: `docs/architecture/performance-design-requirements.md`
