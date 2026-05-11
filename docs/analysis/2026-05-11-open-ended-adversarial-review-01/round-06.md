# 开放式对抗性审查 — 2026-05-11 — 第六轮

> 审查方式：继续按 `docs/skills/open-ended-adversarial-review-prompt.md` 执行。
> 去重背景：前几轮已覆盖 action targeting、surface lifecycle、monitor 开始态等问题；本轮切到 `xui:imports` 与 renderer-owned boundary 的叠加关系，检查 runtime 是否把两个不同 owner 的 `ActionScope` 边界错误地折叠成一个。
> 本轮切入点：声明了 `xui:imports` 的节点，如果对应 renderer 同时使用 `actionScopePolicy: 'new'`，最终子树到底拿到的是嵌套边界，还是 import boundary 把 renderer-local boundary 覆盖掉了。

---

## 发现 1：`xui:imports` 会覆盖 renderer-owned `actionScopePolicy: 'new'` 边界，而不是在其下创建 import-owned child scope

**在哪里**

- 文档把两者明确区分为不同 owner 的 boundary：`xui:imports` 必须创建 import-owned child `ActionScope`，且它与 renderer-owned `actionScopePolicy` 不是同一种边界：`docs/architecture/renderer-runtime.md:729-747,837`、`docs/architecture/action-scope-and-imports.md:1393-1405`
- compiler 仍然独立保留 renderer-owned boundary 计划：`packages/flux-compiler/src/schema-compiler/node-compiler.ts:615-621,676-677`
- `NodeRenderer` 先用 `useNodeScopes()` 创建 renderer-owned `activeActionScope`，但 import-owned scope 却是以 `props.actionScope` 为 parent 创建的，而不是以 `activeActionScope` 为 parent：`packages/flux-react/src/node-renderer.tsx:33-41,71-88`
- 随后 `resolvedActionScope = importOwnedActionScope ?? activeActionScope`，有 imports 时直接用 import-owned scope 替换 renderer-owned scope：`packages/flux-react/src/node-renderer.tsx:78-88`
- 这个被替换后的 scope 会继续发布给 helpers / child subtree：`packages/flux-react/src/node-renderer-resolved.tsx:151-205`、`packages/flux-react/src/node-renderer-providers.tsx:44-90`
- 真实 host renderers 确实在使用 `actionScopePolicy: 'new'`：`packages/flow-designer-renderers/src/index.tsx:123-124`、`packages/report-designer-renderers/src/renderers.tsx:99-100`、`packages/spreadsheet-renderers/src/renderers.tsx:55-56`、`packages/word-editor-renderers/src/renderers.tsx:76-77`

**是什么**

当前 runtime 的顺序不是：

`parent scope -> renderer-owned scope -> import-owned child scope`

而是：

1. 先创建 renderer-owned `activeActionScope`
2. 但 import-owned scope 却挂在 `props.actionScope` 上
3. 最终直接 `importOwnedActionScope ?? activeActionScope`

所以一旦节点同时有：

- renderer `actionScopePolicy: 'new'`
- `xui:imports`

子树拿到的就只剩 import-owned scope；renderer-local scope 不再出现在有效链路里。

**为什么值得关心**

这不是纯实现细节，因为文档已经把两类边界的 owner 和职责说得很清楚：

1. renderer-owned `actionScopePolicy: 'new'` 是 owner-local capability boundary。
2. `xui:imports` 是 node-local import-owned lexical boundary。
3. 两者应该叠加，而不是互相替代。

现在 live code 把二者折叠成“有 imports 时只保留 import scope”，会产生两个后果：

- renderer-local namespace isolation / fallback contract 被绕开，导入边界直接挂回父级 scope。
- host renderers 这类最依赖 local action namespace 的节点，一旦再引入 `xui:imports`，就会让 import boundary 抢走原本属于 owner shell 的 capability lexical boundary。

这属于典型的“两个独立正确的边界组合后，相互破坏”的问题，恰好命中这次开放式审查要找的跨边界链式缺陷。

**信心水平**：确定

---

## 本轮小结

本轮暴露的是 capability boundary 组合语义不闭合：`xui:imports` 不是简单多加一个 child scope，而是在 live runtime 里把 renderer-owned scope 覆盖掉了。对单独使用 imports 或单独使用 `actionScopePolicy: 'new'` 的路径，这个问题都不明显；只有两者叠加时才暴露。

## 本轮盲区自评

- 本轮没有继续验证 component-registry boundary 与 `xui:imports` 是否也存在类似的 owner-boundary 折叠。
- 尚未补 focused test 证明“host local namespace + imported namespace”在同节点叠加时的实际解析链顺序错误。
- 下一轮适合继续看 public runtime APIs 是否也存在“参数接受得很宽，但缓存/销毁语义默认把调用者上下文吞掉”的问题，例如 import manager 或 surface runtime。
