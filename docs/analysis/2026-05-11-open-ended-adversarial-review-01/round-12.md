# 开放式对抗性审查 — 2026-05-11 — 第十二轮

> 审查方式：继续按 `docs/skills/open-ended-adversarial-review-prompt.md` 执行。
> 去重背景：前 11 轮已覆盖 action/runtime/import/surface 以及多个 designer core 的 snapshot aliasing。本轮切到 Word Editor，检查 manual save 成功后 host projection 与 persisted content 是否仍保持一致。
> 本轮切入点：`word-editor:save` 成功后会清 dirty，但 host-scope `document` 是否真的更新到刚保存的 editor 内容，还是仍停留在旧 autosave snapshot。

---

## 发现 1：Word Editor 手动保存成功后，`runtime.dirty` 可变为 `false`，但 host projection 的 `document` 仍可能停留在旧 autosave snapshot

**在哪里**

- manual save 读取的是 bridge 当前值并写入持久化：`packages/word-editor-renderers/src/word-editor-action-provider.ts:39-58`、`packages/word-editor-core/src/document-io.ts:69-94`
- save 成功后 renderer 只清 dirty 并调用 `onDocumentSaved({ charts, codes })`：`packages/word-editor-renderers/src/word-editor-action-provider.ts:56-58`
- `onDocumentSaved` 只把 `charts/codes` patch 进 `savedDocument.data`，不会刷新 `header/main/footer/paperSettings`：`packages/word-editor-renderers/src/hooks/use-word-editor-state.ts:82-95`
- host projection `document` 读的是 `savedDocument?.data`，不是 bridge 当前内容：`packages/word-editor-renderers/src/hooks/use-word-editor-state.ts:170-184`
- 架构文档要求 explicit save 成功后，persisted host projection 应更新到保存时使用的 runtime values：`docs/architecture/word-editor/design.md:140-149`

**是什么**

当前 manual save 的链路是：

1. `saveDocument()` 从 bridge `getValue()` 序列化当前编辑器内容。
2. saveEvent 成功后，renderer `setDirty(false)`。
3. 但 host projection 用来给 schema/宿主看的 `document` 仍来自 `savedDocument.data`。
4. `savedDocument` 在 explicit save 成功后只更新 `charts/codes` extras，不更新正文的 `header/main/footer`。

因此只要用户在 autosave 之后又做了编辑，然后立即触发 manual save：

- 存储里写入的是最新 bridge 内容
- `runtime.dirty` 变成 `false`
- 但 host scope 的 `document` 仍可能还是上一次 autosave 的旧正文

直到下一次 autosave 到来，host projection 才会追上。

**为什么值得关心**

这会制造一个非常危险的 split-brain：

1. 持久化层已经保存了最新内容。
2. runtime host summary 说当前不 dirty。
3. 但宿主/schema 侧通过 host projection 读取到的 `document` 却还是旧内容。

这破坏了 explicit save 最基本的心智模型：保存成功后，宿主看到的“已保存文档快照”应该与刚保存的内容一致。当前实现把 “dirty=false” 和 “host projection document 已同步到保存结果” 拆成了两件不再同步的事，外部消费者会看到一个已经“保存成功”的编辑器，却仍暴露旧正文。

**信心水平**：确定

---

## 本轮小结

这一轮发现的是另一个 designer-family split-brain：不是 mutable aliasing，而是 save success 后多个 truth surface 不再同时收敛。持久化内容、dirty 状态、host projection `document` 三者在 explicit save 之后应当重新对齐，但现在只对齐了前两者的一部分。

## 本轮盲区自评

- 本轮没有继续验证 autosave 与 explicit save 并发时是否会放大该问题。
- 还没检查 Word Editor 的 `paperSettings` 是否也有同样的 save-success 后滞后问题。
- 下一轮应再做一次严格去重后的 fresh sweep；如果仍没有新的高价值问题，才停止。
