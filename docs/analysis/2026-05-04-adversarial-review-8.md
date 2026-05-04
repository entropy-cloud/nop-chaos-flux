# 对抗性审查报告 — 2026-05-04 (第八轮: V12 未来破坏者 + V-new2 依赖与架构演进)

> 审查方式：按 `docs/skills/open-ended-adversarial-review-prompt.md` 执行。

---

## 视角选择

- **V12 未来破坏者** — 此前报告（第二轮）提到 API cache 无 mutation-aware invalidation，但未深入 SSR、multi-instance、tree-shaking 等架构锁定问题。
- **V-new2 依赖与架构演进**（新增视角）— 检查依赖选择和模块级状态是否创造了不可逆锁定。

---

## 发现 1：Formula 注册表是全局可变单例 — 阻塞 SSR 和多实例 (HIGH)

**在哪里**

- `packages/flux-formula/src/registry.ts:15-19`

**是什么**

Formula 的 functions/namespaces/filters 注册使用 module-level `Map` 单例。这意味着：

- **SSR 场景**: Node.js 进程中所有并发请求共享同一注册表。一个请求的 `resetFormulaRegistry()` 会破坏其他请求的在途渲染。
- **多实例场景**: 同一页面上两个 `<SchemaRenderer>` 共享完全相同的 formula 函数集。一个实例的插件注册污染另一个。
- **测试隔离**: 忘记调用 `resetFormulaRegistry()` 的测试会泄漏状态到后续测试。

**为什么值得关心**

这是该项目**最大的架构锁定点**。想要 SSR、micro-frontend、或多租户隔离时，必须重新设计 formula 的 DI 机制 — 影响 `flux-formula`、`flux-compiler`、`flux-runtime` 三个包。

**修复方向**: 将 registry 变为 per-runtime 实例属性（通过 `createRendererRuntime` 注入），保留全局注册作为默认快捷方式。

**严重度**: HIGH  
**信心水平**: 确定。

---

## 发现 2：Renderer barrel file 无 tree-shaking — 导入一个拉入全部 (MEDIUM)

**在哪里**

- `packages/flux-renderers-basic/src/index.tsx:1-25`
- `packages/flux-renderers-form/src/index.ts`
- `packages/flux-renderers-form-advanced/src/index.ts`
- `packages/flux-renderers-data/src/index.ts`

**是什么**

每个 renderer 包的入口 `registerXxxRenderers(registry)` 无条件导入并注册所有渲染器。消费者无法只使用 `TextRenderer` 而不 bundle `DialogRenderer`、`DrawerRenderer` 等。

**为什么值得关心**

- 当前 renderer 数量约 30 个，bundle 影响有限。
- 但项目目标是低代码平台 — renderer 数量会持续增长到 100+。
- 缺少 per-renderer entry point（如 `@nop-chaos/flux-renderers-basic/text`）使得未来的 code-splitting 需要架构重写。

**修复方向**: 支持 lazy renderer registration（`registry.registerLazy('text', () => import('./text'))`）。

**严重度**: MEDIUM  
**信心水平**: 确定。

---

## 发现 3：`flux-core/src/index.ts` 的 `export *` 阻碍 tree-shaking (MEDIUM)

**在哪里**

- `packages/flux-core/src/index.ts:1-7`

**是什么**

前 7 行使用 `export *` 从 types、utils、constants 等模块重导出所有内容。对于纯类型模块这无害（编译后消失），但对于包含运行时值的模块（如 constants、utils），bundler 无法确定哪些导出有副作用，可能保留未使用代码。

**严重度**: MEDIUM  
**信心水平**: 中 — 现代 bundler（Vite/Rollup）对 `export *` 的 tree-shaking 能力在改善，但存在边界情况。

---

## 发现 4：SchemaRenderer 使用 `queueMicrotask` 延迟 dispose — React 版本脆弱 (MEDIUM)

**在哪里**

- `packages/flux-react/src/schema-renderer.tsx:117`

**是什么**

为绕过 React 18 StrictMode 的 double-mount 行为，dispose 被推迟到 microtask。这是一个 hack — 它依赖于 React 的 _当前_ StrictMode 时序行为（mount → unmount → mount）。如果 React 未来版本改变了这个时序（或引入 async cleanup），这段代码会产生 use-after-dispose 或 double-dispose。

**严重度**: MEDIUM  
**信心水平**: 中 — React 团队尚未宣布改变此行为，但 "microtask timing assumption" 在跨版本升级时是已知的脆弱点。

---

## 发现 5：自定义 renderer 无 validated API (MEDIUM)

**在哪里**

- `packages/flux-react/src/schema-renderer.tsx:35-36`（`createSchemaRenderer(definitions)`）

**是什么**

消费者添加自定义 renderer 需要构造 `RendererDefinition[]`，需要了解：

- schema type 匹配规则
- meta resolution
- component props 形状（`RendererComponentProps<S>`）
- region 渲染约定

缺少 `defineRenderer({ type, component, schema? })` 形式的 validated helper。新手容易配置错误且只在运行时发现。

**严重度**: MEDIUM  
**信心水平**: 确定。

---

## 发现 6：自定义 formula function 只能全局注册 (MEDIUM)

**在哪里**

- `packages/flux-formula/src/registry.ts:29-36`

**是什么**

`registerFunction(name, fn)` 修改全局 Map，无 unregister 方法，无 per-scope 隔离。插件系统如果想提供 "仅在本 renderer 实例中生效" 的自定义函数，当前做不到。

**严重度**: MEDIUM  
**信心水平**: 确定。

---

## 发现 7：Runtime factory 多实例隔离良好 — 正面确认

**在哪里**

- `packages/flux-runtime/src/runtime-factory.ts:86-124`

**是什么**

`createRendererRuntime()` 为每个实例创建独立的 action scope、page store、source registry、reaction registry。多个 `<SchemaRenderer>` 的 runtime 层完全隔离。

这是良好的设计 — 唯一的全局污染点是 formula registry（发现 1）。

**严重度**: N/A（正面发现）

---

## 发现 8：Zustand 抽象良好 — 低迁移风险

**在哪里**

- `packages/flux-runtime/src/` 全文件（store 通过 factory 创建）

**是什么**

Zustand store 全部通过工厂函数创建，React 组件通过 hooks 间接访问。Zustand 版本升级只需修改 `flux-runtime` 内部，不影响下游包。

**严重度**: N/A（正面发现）

---

## 总评

### 最值得关注的方向

1. **Formula 注册表的 DI 化**（发现 1、6）— 这是阻塞 SSR、multi-instance、plugin isolation 的单一根因。改为 per-runtime 注入的 registry 可以一次性解决三个问题。优先级最高。

2. **Renderer 注册的 lazy/tree-shakable 化**（发现 2、3）— 随着 renderer 数量增长，当前 "注册即全量加载" 模式会成为 bundle 瓶颈。建议引入 lazy registration + per-renderer entry point。

3. **自定义扩展的 DX**（发现 5、6）— 项目定位是低代码框架，扩展性是核心卖点。当前扩展（自定义 renderer/function）需要深度内部知识且无验证。建议添加 validated helper API。

### 盲区自评

- 未检查 `flux-i18n` 是否有类似的全局单例问题（i18next 实例通常是全局的）。
- 未检查 Vite dev server 的 HMR 是否能正确处理 formula registry 的热更新。
- 未检查 `pnpm-workspace.yaml` 中包的实际列表与文件系统是否一致。
- 未评估 React 19 concurrent features（useTransition、Suspense）与当前 `useSyncExternalStore` 模式的交互。

**建议下次视角**: 如果仍有新发现空间，可尝试 V-new3（依赖 CVE 安全审计）或重新以 V5 视角深入 reaction + data source + scope 的三方时序。

---

## 新增视角记录

| 编号   | 视角           | 核心问题                                   | 典型发现类型                                           |
| ------ | -------------- | ------------------------------------------ | ------------------------------------------------------ |
| V-new2 | 依赖与架构演进 | "当前架构决策是否创造了不可逆的技术锁定？" | 全局单例、barrel file 锁定、缺少 DI、tree-shaking 障碍 |
