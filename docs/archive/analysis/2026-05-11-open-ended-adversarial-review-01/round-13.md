# 开放式对抗性审查 — 2026-05-11 — 第十三轮

> 审查方式：继续按 `docs/skills/open-ended-adversarial-review-prompt.md` 执行。
> 去重背景：前几轮已经分别记录了 `spreadsheet-core` / spreadsheet bridge 的 live snapshot 泄露，以及 `report-designer-core` 的 spreadsheet subtree by-reference sync。本轮关注的是更外层的 `report-designer-page` schema-visible host projection 是否继续把这些 live object 直接暴露给内部 schema。
> 本轮切入点：文档把 host projection 定义为 schema-visible readonly shape，但 live `report-designer` host scope 是否仍直接引用 core snapshot 内部对象。

---

## 发现 1：`report-designer-page` 把 live designer/spreadsheet snapshot 对象直接投进 schema-visible host scope，内部 schema 可通过 host projection 持有并篡改运行时 truth

**在哪里**

- `report-designer-page` 把 `reportDesignerScope` 直接传给 toolbar / fieldPanel / inspector / dialogs / body 这些 schema 片段：`packages/report-designer-renderers/src/page-renderer.tsx:248-294`
- host projection 构造时直接暴露 live spreadsheet objects：`packages/report-designer-renderers/src/host-data.ts:43-62`
  - `workbook: snapshot.document.workbook`
  - `selection: snapshot.selection`
  - `activeSheet` 直接从 live workbook 中 `find(...)`
- report-designer host projection 继续直接暴露 live designer objects：`packages/report-designer-renderers/src/host-data.ts:136-195`
  - `reportDocument` 在有 `spreadsheetSnapshot` 时直接使用 `{ ...snapshot.document, spreadsheet: spreadsheetSnapshot.document }`，其中 `spreadsheetSnapshot.document` 是 live spreadsheet document
  - `workbook` 直接取 `spreadsheet?.workbook ?? snapshot.document.spreadsheet.workbook`
  - `designer.inspector` / `designer.fieldDrag` / `designer.preview` / `designer.activeMeta` / `designer.fieldSources` 都直接引用 snapshot 内部对象
  - 顶层 `fieldSources`、`inspector`、`meta`、`preview` 也继续复用这些 live 引用
- `report-designer-core` 自己的 `getSnapshot()` 直接返回 live `state.document`、`state.inspector`、`state.fieldSources`、`state.fieldDrag`、`state.preview`：`packages/report-designer-core/src/core.ts:55-72`
- capability/projection 文档把 host projection 定义为 schema-visible readonly shape，而不是内部 bridge snapshot：`docs/architecture/capability-projection-manifest.md:251-265`
- report-designer 架构文档也强调 schema 读取的是固定 host scope snapshot，写入应走 namespaced actions / canonical snapshot：`docs/architecture/report-designer/design.md:389-415`

**是什么**

`report-designer-page` 对内渲染 schema 时，给内部 schema 的不是一个“只读投影副本”，而是大量 live runtime object 的直接引用。也就是说：

1. schema 可以读取 `workbook` / `reportDocument` / `designer.fieldSources` / `inspector` / `meta` 等字段。
2. 这些字段并不是只读 materialized projection，而是直接指向 designer core / spreadsheet core 当前 snapshot 内部对象。
3. 任何拿到这些对象引用的表达式、helper、action payload 组装逻辑、甚至外部 JS 扩展代码，只要发生对象级 mutation，都可能绕过 report-designer / spreadsheet 命令边界，直接篡改运行时 truth。

这不是单纯的“bridge snapshot 里字段多了一点”，而是 `report-designer-page` 自己把 live core state 重新发布成了 schema-visible host scope，扩大了污染面。

**为什么值得关心**

这会同时破坏两条架构基线：

1. **readonly host projection 被击穿。** 文档明确说 projection contract 是 schema-visible readonly shape，不应等价于内部 bridge/core snapshot；当前实现却把 live object 直接给了 schema。
2. **writes-through-actions / canonical snapshot 边界被击穿。** report-designer 文档要求 spreadsheet/report 文档修改通过 canonical snapshot 和 namespaced actions 收敛；但现在内部 schema 一旦持有这些 live 对象，完全可能在命令链之外修改 workbook、selection 相关结构、metadata 派生数据或 fieldSources 内容。

更糟的是，这个泄露发生在 report-designer 最外层 host scope，覆盖 toolbar、inspector、dialogs、body 等整个内部 schema 面。只要其中任何一处把 host projection 当普通 JS object 处理，就可能把“只读查看”升级成“越过命令系统的隐式写入”。

**与前轮的区别**

- 第 11 轮记录的是 `spreadsheet-core` / spreadsheet bridge 本身的 live snapshot 泄露。
- 本轮记录的是 `report-designer-page` 作为更外层 host family，又把 designer-core 与 spreadsheet-core 的 live objects 二次发布到 schema-visible host scope，属于新的暴露面和更大的影响范围，不是同一问题的重复表述。

**信心水平**：确定

---

## 本轮小结

这一轮延续了“复杂宿主把 live internal state 误当 readonly host projection 对外发布”的主线，但落点是更高一层的 `report-designer` host boundary。也就是说，即使底层 spreadsheet bridge 将来修正为 defensive snapshot，只要这里继续把 designer/spreadsheet live objects 直接塞进 host scope，schema-visible 污染面仍然存在。

## 本轮盲区自评

- 还没有逐一验证内部 schema helper / expression runtime 是否存在能直接 mutate host object 的内建路径；本轮结论基于引用泄露这一能力边界本身已不成立。
- 还没检查 `flow-designer-renderers` 是否也有类似“host scope 再次直挂 live core snapshot object”的二次泄露。
- 下一轮应继续做更窄的 fresh sweep，重点检查剩余 designer/editor family 的 host-data / bridge / page-renderer 边界，确认是否还有新的独立实例。
