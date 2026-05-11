# 开放式对抗性审查 — 2026-05-11 — 第十四轮

> 审查方式：继续按 `docs/skills/open-ended-adversarial-review-prompt.md` 执行。
> 去重背景：第九轮已经记录了 `flow-designer-core` 的 shallow-clone aliasing，会让 snapshot/history/saved baseline 共享嵌套 payload。本轮关注的是更外层的 renderer host boundary：`designer-page` 是否又把这些 live snapshot object 直接发布成 schema-visible host scope。
> 本轮切入点：Flow Designer 文档把 `snapshot` 描述为只读事实快照、`host scope` 描述为供 schema 读取的快照投影，写路径应继续走 `designer:*` action；检查 live code 是否仍直接挂载内部对象引用。

---

## 发现 1：`flow-designer` 的 region host scope 直接暴露 live `snapshot.doc` / `activeNode` / `activeEdge` / selection arrays / viewport，schema-visible “只读快照投影” 实际可持有内部运行时对象

**在哪里**

- 文档约束：schema 片段只读 bridge snapshot，不直接改 graph store；写操作必须走 `dispatch(command)` 或 `designer:*` action：`docs/architecture/flow-designer/api.md:115-120`
- 文档语义：`snapshot` 是 graph runtime 的只读事实快照，`host scope` 是把快照重新投影为 schema 可读上下文，写路径继续走 `designer:*`：`docs/architecture/flow-designer/runtime-snapshot.md:312-326`
- live host-scope builder 直接暴露 snapshot 内部对象：`packages/flow-designer-renderers/src/designer-context.ts:108-145`
  - `doc: snapshot.doc`
  - `selection.nodeIds` / `edgeIds` / `selectedNodeIds` / `selectedEdgeIds` 直接复用 `snapshot.selection` 内部数组
  - `activeNode: snapshot.activeNode`
  - `activeEdge: snapshot.activeEdge`
  - `activeBranch: snapshot.activeBranch`
  - `runtime.viewport: snapshot.viewport`
- host scope 通过 `useHostScope(...)` 发布给 schema：`packages/flow-designer-renderers/src/designer-context.ts:148-159`
- 该 scope 实际被传入 toolbar / inspector / dialogs region schema：`packages/flow-designer-renderers/src/page-renderer.tsx` 的当前实现锚点已在文档中记为 `useDesignerHostScope` 注入 region；同类 live code 路径见 `docs/architecture/flow-designer/runtime-snapshot.md:397-407`
- `DesignerCore.getSnapshot()` 返回的 `DesignerSnapshot` 自身来自 core 的当前运行时对象；`createDesignerCore(...).getSnapshot()` 通过 snapshot cache 提供：`packages/flow-designer-core/src/core.ts:147-157`

**是什么**

`flow-designer` 对 schema 公开的 host scope 并不是一个 defensive / materialized 的只读投影，而是大量 live runtime object 的直通引用。也就是说，内部 toolbar / inspector / dialogs schema 一旦拿到 `doc`、`activeNode`、`activeEdge`、`selection.selectedNodeIds`、`runtime.viewport` 等字段，本质上拿到的是 designer runtime 当前对象图的一部分，而不是一个隔离后的只读 snapshot view。

这意味着 host scope 的“只读”更多只是文档意图，而不是代码层面的边界：任何把这些 host fields 当普通 JS object 使用的路径，只要发生引用级 mutation，就可能在 action/command 之外影响 designer runtime truth。

**为什么值得关心**

这会破坏 Flow Designer 自己最核心的宿主约束：

1. 文档要求 schema 只读 snapshot，写入走 `designer:*` / command adapter；但当前 host scope 已经把 live graph objects 直接交给 schema。
2. 这让 host scope 从“readonly projection”退化成“runtime object capability leak”，外部 schema/扩展逻辑可以在命令系统、history、dirty 语义之外持有并修改内部对象。
3. 即使第九轮记录的 core shallow-clone aliasing 将来被修复，只要 renderer 层继续把 `snapshot.doc` / `activeNode` 等 live objects 直接发布给 schema，这条越权写入通道仍然存在。

换句话说，第九轮是 core snapshot/history 自身的 aliasing 缺陷；本轮是 renderer host boundary 又把 live snapshot object 公开给 schema-visible 读面，属于不同层级、不同暴露面的独立问题。

**信心水平**：确定

---

## 本轮小结

这一轮把“host projection/read surface 不应直通 live internal object”这条主线扩展到了 Flow Designer。到目前为止，Flow、Report、Spreadsheet、Word Editor 都已经出现不同层级的 truth-surface / snapshot-boundary 漏洞，说明这不是单个包偶发实现问题，而是 workbench-host family 的系统性风险模式。

## 本轮盲区自评

- 还没逐一枚举 Flux schema expression / action payload 组装时，哪些现有 helper 最容易对这些 live host objects 产生 mutation；本轮结论仍然基于 capability boundary 已泄露本身。
- 还没完成对剩余 `word-editor` host projection 的最终 sweep，尤其是 selection/runtime 是否也有类似 live object 直挂但文档要求更窄只读语义的实例。
- 下一轮应做最后一次严格去重 sweep；若没有新的独立问题，再停止。
