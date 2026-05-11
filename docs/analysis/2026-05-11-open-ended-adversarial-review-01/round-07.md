# 开放式对抗性审查 — 2026-05-11 — 第七轮

> 审查方式：继续按 `docs/skills/open-ended-adversarial-review-prompt.md` 执行。
> 去重背景：上一轮已确认 `xui:imports` 会覆盖 renderer-owned `actionScopePolicy: 'new'`；本轮继续沿 import runtime 的 public contract 往下追，不再重复边界覆盖问题，而是检查公开 API 接收的上下文参数是否真的参与 import frame identity。
> 本轮切入点：`runtime.ensureImportedNamespaces(...)` 接受的 `scope` / `componentRegistry` / `nodeInstance` / `schemaUrl` 是否在缓存命中时仍然有效，还是只在首次安装时生效一次。

---

## 发现 1：public `runtime.ensureImportedNamespaces(...)` 会用过期的 `scope` / `componentRegistry` / `nodeInstance` 复用 import frame，API 形参比真实语义宽很多

**在哪里**

- public runtime contract 明确接收 `imports`、`actionScope`、`componentRegistry`、`scope`、`schemaUrl`、`nodeInstance`：`packages/flux-core/src/types/renderer-core.ts:331-342`
- import manager 的缓存以 `WeakMap<ActionScope, Map<frameKey,...>>` 组织：`packages/flux-runtime/src/imports.ts:61-75`
- `createFrameKey()` 只包含 import specs 本身，不包含 `scope` / `componentRegistry` / `nodeInstance` / `schemaUrl`：`packages/flux-runtime/src/imports.ts:40-48`
- `ensureImportedNamespaces()` 命中已有 frame 时只增加 `refCount`，直接返回，不会重新安装：`packages/flux-runtime/src/imports.ts:91-98`
- 但首次安装时，这些上下文都会被送进 imported namespace context：`packages/flux-runtime/src/imports.ts:100-111`、`packages/flux-runtime/src/import-stack.ts:381-393`

**是什么**

当前 public API 给人的感觉是：你每次调用 `ensureImportedNamespaces(...)`，传入的 `scope` / `componentRegistry` / `nodeInstance` / `schemaUrl` 都会成为这次 import install 的上下文。

但 live 实现的真实语义其实是：

1. 先按 `actionScope + imports` 建缓存。
2. 只要这两个没变，就复用第一次的 frame。
3. 后续调用里即使 `scope`、`componentRegistry`、`nodeInstance`、`schemaUrl` 变了，也不会重装 frame，也不会更新 imported provider 的上下文。

因此这个 API 的真实合同更像“在同一个 `ActionScope` 上按 import spec 安装一次 namespace provider”，而不是“按当前调用上下文确保 import provider 与当前 boundary 对齐”。

**为什么值得关心**

这会让 public runtime API 形成非常误导的能力表面：

1. 类型层把多项上下文都暴露成输入，调用者自然会以为它们都参与有效 identity。
2. 实现层却只把 `actionScope + imports` 当成 cache key。
3. imported namespace provider 首次安装后，会永久保留第一次的 `scope` / `componentRegistry` / `nodeInstance` 视角。

如果调用者在同一个 `ActionScope` 下跨 remount、跨 render boundary、或跨不同 node instance 复用相同 imports，provider 实际看到的仍然是旧上下文。这类 bug 很隐蔽，因为 import 本身“还能工作”，只是读到旧 scope、旧 registry、旧 node identity，最后表现成 imported namespace 某些方法在边界切换后仍对着上一轮 owner/context 行事。

**信心水平**：确定

---

## 本轮小结

本轮确认的是一个典型 public-API overpromise 问题：`ensureImportedNamespaces(...)` 的输入面比它的真实缓存身份宽得多。对外看像是“当前上下文相关的 ensure”，对内其实是“按 actionScope+imports 一次性 install 并复用 first context”。

## 本轮盲区自评

- 本轮没有继续验证 repo 内目前谁在直接调用这个 public API；即便当前主要调用点仍是内部 runtime，自身 public contract 已经足够值得报告。
- 还没检查 `getImportedExpressionBindings()` / `releaseImportedNamespaces()` 是否也存在与 `schemaUrl` 或 node identity 相关的相同 contract 漂移。
- 下一轮适合继续验证另一个 public runtime 候选：`SurfaceRuntime.open()` 是否把调用者提供的任意 scope 都当成“owned child scope”销毁。
