# 开放式对抗性审查 — 2026-05-12 — 第二轮

> 审查方式：继续按 `docs/skills/open-ended-adversarial-review-prompt.md` 执行。
> 去重背景：上一轮记录 data renderer 状态桥接问题；本轮转查 table slot authoring contract。近期 bug/log 已把 playground 示例从裸 `record.*` 修到 `$slot.record.*`，但本轮关注的是 compiler/tests/docs 是否仍把裸 `record` 当成稳定合同保留。
> 本轮切入点：表格 cell/buttons region 已声明 parameterized region 后，编译诊断是否还能发现旧式裸 `record` 写法，还是会让它静默读父 scope。

---

## 发现 1：表格 cell/buttons 的裸 `record` 写法仍能无诊断编译，但运行时参数只发布到 `$slot.record`

**在哪里**

- Table column `cell` / `buttons` region 声明了 `params: ['record', 'index']`：`packages/flux-compiler/src/schema-compiler/tables.ts:9-24`
- node compiler 对带 params 的 region 只把参数符号推入 `$slot` 语义表：`packages/flux-compiler/src/schema-compiler/node-compiler.ts:422-444`
- runtime 对 parameterized region 会把传入 bindings 包装成 `{ $slot: slotFrame }`，不再平铺成顶层 `record` / `index`：`packages/flux-react/src/node-renderer-resolved.tsx:228-249`
- `RenderNodes` 随后只用这份 fragment bindings 创建 child scope：`packages/flux-react/src/render-nodes.tsx:243-267,316-319`
- table cell 渲染确实传入 `{ record, index }`，但由于该 region 有 params，最终只会成为 `$slot.record` / `$slot.index`：`packages/flux-renderers-data/src/table-renderer/table-body-row-rendering.tsx:242-247`
- formula diagnostics 只对以 `$` 开头的未知 root 做诊断；裸 `record` 不会被报告：`packages/flux-formula/src/compile/symbol-diagnostics.ts:66-89`
- compiler 测试仍保留裸 `record` cell 示例并期望编译成功：`packages/flux-compiler/src/schema-compiler-table.test.ts:59`、`packages/flux-compiler/src/schema-compiler-registry-features.test.ts:98`
- 架构文档仍把 row-local reader 示例写成 `${record.name}` / `${record.status}`：`docs/architecture/table-row-identity-and-scope-performance.md:148-152`

**是什么**

当前 live runtime 的稳定访问方式是 `$slot.record`：parameterized region 的 bindings 不会平铺到普通 scope，而是发布到保留的 `$slot` frame。这个语义在类型注释里也已经写明：`RenderRegionHandle` 的 `params` 存在时，bindings 会被发布到 `$slot` 而不是顶层 scope。

但旧式写法仍然被 compiler 测试和架构文档保留：

```json
{ "cell": { "type": "text", "text": "User ${record.name}" } }
```

这个表达式不会被诊断，因为 symbol diagnostics 不检查未知裸 identifier。运行时它会尝试从父/当前普通 scope 读 `record`，而不是从 `$slot.record` 读当前行。如果父 scope 恰好没有 `record`，结果通常是空值；如果父 scope 恰好也有一个 `record`，结果会更危险地读到错误对象。

**为什么值得关心**

这是一个 authoring contract 漂移：

1. runtime 和近期 bug 修复已经把 `$slot.record.*` 作为稳定行参数合同。
2. compiler 测试与架构文档仍给作者展示 `${record.*}`。
3. diagnostics 又不会提示裸 `record` 在 parameterized region 中未绑定。

结果是新作者会写出“编译成功但运行时错读”的 schema。更糟的是，这个错误不一定表现为空；如果外层 scope 也有 `record`，table row cell/action 可能会悄悄读外层 record，形成跨行或跨 owner 的错误数据引用。

**信心水平**：确定

---

## 本轮小结

本轮发现的不是 `$slot` 机制本身的问题，而是 `$slot` 迁移后的残留合同没有完全收口：runtime、bug 修复和部分测试已经使用 `$slot.record`，但 compiler 示例、架构示例和诊断策略仍允许裸 `record` 作为无声失败路径存在。应优先统一 author-facing 文档和测试，并考虑在 parameterized region 的 symbol table 中对裸 param name 给 warning 或迁移建议。

## 本轮盲区自评

- 本轮只核验了 table cell/buttons；expandedRow 已在 `docs/analysis/2026-05-08-deep-audit-full/09-renderer-contract.md` 作为另一条参数化合同问题记录，未重复报告。
- 没有继续检查 tabs/list/loop 等其它 parameterized region 是否也有同类裸参数示例残留。
- 下一轮适合切到 validation/field policy 或 UI keyboard interaction，避免继续围绕 table slot 合同打转。
