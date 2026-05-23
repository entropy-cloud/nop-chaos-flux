# 开放式对抗性审查 — 2026-05-06 — 第五轮

> 最终轮。前三轮覆盖了 compiler、react、action、runtime、async、formula、utilities、renderer、SSR、undo/redo。本轮检查错误边界、长生命周期组件闭包/泄漏、schema 动态行为边界。

---

## 发现 1：SchemaRenderer 缺少顶层 Error Boundary — DialogHost 等组件异常导致整棵渲染树白屏

**在哪里**

- `packages/flux-react/src/schema-renderer.tsx:282-308`

**是什么**

`NodeErrorBoundary` 仅包裹 `NodeRenderer`（单节点级），但 `SchemaRenderer` 自身没有错误边界。`DialogHost`（第 299 行）在 `NodeErrorBoundary` 保护范围之外。如果 Dialog 宿主的 surface store 操作抛出异常，整棵 React 树崩溃——白屏，无恢复途径。

同时，schema import 失败时（第 211 行被 `process.env.NODE_ENV !== 'production'` 守卫），生产环境只 `console.warn`，用户看到空白页面但不知道原因。

**为什么值得关心**

这是整个渲染架构的根入口。一个 DialogHost 中的异常就能让整个应用白屏。`NodeRenderer` 已经建立了良好的逐节点错误隔离，但根级别缺少同样的防护，形成一个明显的保护盲区。

**信心水平**：确定

---

## 发现 2：CodeMirror `updateListener` 捕获过期的 `onChange` 回调 — schema 动态更新时事件处理可能不触发

**在哪里**

- `packages/flux-code-editor/src/use-code-mirror.ts:27-51`（updateListener 闭包）
- 同文件 `:63-80`（空依赖 useEffect）

**是什么**

```ts
// 第 27-44 行：updateListener 闭包捕获创建时的 options
function createEditorState(options: UseCodeMirrorOptions): EditorState {
  const extensions = [
    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        options.onChange?.(update.state.doc.toString()); // ← 捕获的是创建时的 options
      }
    }),
  ];
}

// 第 63-80 行：空依赖，只在挂载时执行一次
useEffect(() => {
  const state = createEditorState(optionsRef.current);
  const editorView = new EditorView({ state, parent: containerRef.current });
  // ...
}, []); // ← 空依赖！后续 options 变化不会更新 updateListener
```

虽然 `optionsRef.current` 每次渲染都更新（第 59-61 行），但 `createEditorState` 已经用创建时刻的 options 生成了闭包。如果 `props.events.onChange` 的引用因 schema 动态更新而变化，用户在编辑器中的输入不会触发最新的 onChange 处理逻辑。

**为什么值得关心**

schema 动态更新时（如热重载、条件切换 code-editor 配置），code-editor 的事件处理器被冻结在初始版本。用户编辑不会触发更新后的 action，可能导致数据丢失或状态不同步。

**信心水平**：确定

---

## 发现 3：Word Editor Canvas 在 `charts`/`codes` 变更时完全重建 — 用户编辑中断

**在哪里**

- `packages/word-editor-renderers/src/editor-canvas.tsx:29-148`

**是什么**

```ts
useEffect(() => {
  bridge.mount(container, editorData, { ... }, paperSettings);
  return () => {
    bridge.unmount();           // ← 完全卸载编辑器
    editorStore.setBridge(null);
    editorStore.setReady(false);
  };
}, [bridge, charts, codes, editorStore, initialDocument, onAutosave]);
//          ^^^^^^  ^^^^^  ← charts/codes 变化触发完整重建
```

当用户在数据集面板修改 charts 或 codes 时，整个编辑器 Canvas 被销毁再重建。光标位置、选区、未保存的编辑内容可能丢失。

**为什么值得关心**

这是一个重量级操作。在编辑过程中修改数据集配置时，用户的编辑状态被强制中断。如果 autoSave 尚未触发，编辑内容可能丢失。

**信心水平**：确定

---

---

## 总评

五轮审查完成。本轮发现的 SchemaRenderer 无顶层 Error Boundary 是一个"灯下黑"的问题——项目在节点级别已经建立了良好的错误隔离，但最关键的根级别缺少防护。

## 五轮审查综合总评

### 最值得关注的 3 个方向

1. **级联深度保护系统性失效 + Reaction 错误处理缺陷**（R1#1, R1#2, R2#3, R3#4）
   - `globalCascadeDepth` 溢出变负数
   - 数据源异步级联完全不受保护
   - `once` reaction dispatch 失败不 dispose
   - 这些问题组合在一起意味着：响应式系统的保护机制在异常情况下不可信

2. **三个设计器的 Undo/Redo 系统各有严重缺陷**（R4#1-#7）
   - Report Designer：3 条路径绕过 undo 系统 + dirty 状态与 undo 栈绑定
   - Spreadsheet：事务原子性完全损坏 + undo 不清除编辑状态
   - Flow Designer：undo 不恢复选择状态
   - 这些问题直接影响用户的数据安全

3. **Action 错误传播链路的系统性失真**（R1#4, R1#5, R1#6）
   - `ActionResult.error` 四种互斥消费协议
   - `onError` 分支恢复后链路中断
   - `withRetryMetadata` 修改原始 error 并创建循环引用
   - 从错误产生到错误展示的全链路都存在失真风险

### 本次审查的盲区自评

仍然可能遗漏的方向：

- **性能压力测试**：万级节点的编译和渲染性能未实测
- **浏览器兼容性**：仅检查了 SSR，未测试 Firefox/Safari 等浏览器的兼容性
- **打包优化**：tree-shaking 效果、bundle size 分析未执行
- **并发用户场景**：WebSocket 推送 + 多 tab 同时操作的行为未验证
- **国际化运行时**：RTL 布局、日期/数字格式化的实际运行效果未测试
- **安全边界**：除了此前发现的沙箱逃逸，未深入测试 XSS 向量
