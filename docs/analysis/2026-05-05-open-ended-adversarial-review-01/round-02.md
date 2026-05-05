# 对抗性审查 — 2026-05-05 第 2 轮

## 发现 1：Debugger automation hub 从不注销 controller，默认 active 指针只是“最后注册者”

- 在哪里
  - `packages/nop-debugger/src/automation.ts:122-145`
  - `packages/nop-debugger/src/controller.ts:426-428`
  - `packages/nop-debugger/src/types.ts:384-468`
- 是什么
  - `registerAutomationApi()` 只会把 automation API 塞进 `window.__NOP_DEBUGGER_HUB__.controllers`，并把 `activeControllerId` 改成当前 controller。
  - 没有任何 unregister/dispose 路径，也没有“当前 controller 是否仍然存活”的校验。
  - 这意味着多实例、热重载、StrictMode remount、页面内多个 renderer 并存时，旧 controller 会永久留在全局 hub 中，而默认 API `window.__NOP_DEBUGGER_API__` 永远指向最后注册者。
- 为什么值得关心
  - 自动化脚本或宿主调试代码如果没显式传 `controllerId`，拿到的很可能不是自己想要的 runtime，而是“最近注册的另一个实例”甚至已失效实例。
  - 旧 controller 继续被全局强引用，也让调试快照、事件缓存和 inspect 能力跨实例泄漏，形成内存和状态污染。
  - 这不是调试器 UI 小瑕疵，而是调试/自动化边界的实例隔离被破坏。
- 信心水平
  - 确定

## 发现 2：Debugger 的 strict-mode 开关是进程级全局副作用，不是 controller 局部能力

- 在哪里
  - `packages/nop-debugger/src/controller.ts:407-410`
  - `packages/flux-core/src/strict-mode.ts:48-72`
  - `packages/flux-react/src/schema-renderer.tsx:61,228`
- 是什么
  - `NopDebuggerController.setStrictMode()` 调用 `setStrictValidationGlobal(enabled)`，后者直接向 `globalThis.__FLUX_STRICT_VALIDATION__` 写值。
  - 与此同时，`SchemaRenderer` 的 strict mode 解析又会读取这个全局值作为默认来源。
  - 结果一个 debugger controller 的开关操作，会改变同页其他 renderer/runtime 的严格校验行为。
- 为什么值得关心
  - controller API 表面上像“控制这个 debugger 对应的 runtime”，实际却在改整个页面甚至整个进程的默认行为。
  - 这会让多实例调试、嵌入式宿主、测试并行场景出现非常诡异的串扰：A 面板切 strict，B runtime 编译/校验语义也一起变。
  - 这类全局副作用尤其危险，因为它既不是显式依赖注入，也不是用户显式配置，而是从调试操作里偷偷溢出到生产语义入口。
- 信心水平
  - 确定

## 发现 3：Word Editor 的文档和数据集存储键是全局固定值，多个实例天然互相覆盖

- 在哪里
  - `packages/word-editor-core/src/document-io.ts:8-10,56-120`
  - `packages/word-editor-renderers/src/editor-canvas.tsx:38-55`
  - `packages/word-editor-renderers/src/word-editor-page.tsx:208-217`
- 是什么
  - 文档和数据集都使用固定的 localStorage key：`nop-word-editor-document`、`nop-word-editor-datasets`。
  - `EditorCanvas` autosave 也直接把当前编辑结果写到这个全局 key，没有任何 document id、renderer path、statusPath 或宿主命名空间隔离。
  - 页面初始化时又会无条件从这些全局 key 回读并加载。
- 为什么值得关心
  - 同一浏览器里打开两个不同模板、两个 tab、或两个嵌入式 word editor 时，它们会互相读取/覆盖对方的草稿与数据集。
  - 这不仅是 UX 污染，还可能造成低敏感数据跨页面泄漏，以及“我明明打开的是 B 文档却自动加载了 A 的草稿”的错误恢复语义。
  - 项目整体在 runtime/store 层强调 factory-per-instance 隔离，但这里的持久化层完全反着来，形成很强的架构反差。
- 信心水平
  - 确定

## 本轮小结

- 本轮切入视角：多实例隔离、全局命名空间、副作用越界。
- 三个问题有共同根因：本应属于“某个实例”的能力，被提升成了 `window` 或 `localStorage` 级别的共享状态；这会让宿主集成和并行使用场景明显比单实例 demo 脆弱得多。
