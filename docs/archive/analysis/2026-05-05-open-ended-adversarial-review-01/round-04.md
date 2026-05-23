# 对抗性审查 — 2026-05-05 第 4 轮（Canonical-Only 视角）

## 发现 1：`report-designer-page` 文档和代码仍在主动维护“canonical + alias + mirror”三层宿主合同

- 在哪里
  - `docs/components/report-designer-page/design.md:67-103`
  - `packages/report-designer-renderers/src/host-data.ts:153-190`
  - `packages/report-designer-renderers/src/report-designer-toolbar-helpers.ts:4-31`
  - `packages/report-designer-renderers/src/report-designer-toolbar-helpers.test.ts:174-225`
- 是什么
  - 组件文档明确把 host projection 分成三层：canonical fields、compatibility aliases、convenience mirrors。
  - live 代码继续围绕这个多层模型写工具函数：`readState()` 会在 `isDirty` / `designer.dirty`、`designer.documentName` / `document.name` / `documentName` 之间兜底。
  - 测试也把这些 fallback 路径锁成了受支持行为。
- 为什么值得关心
  - 这不是“有些旧 alias 还没删完”，而是设计文档、helper API、测试三者都在共同维护多合同共存。
  - 在“v1 无兼容负担”的前提下，这会直接阻止 canonical contract 成为真正可执行的约束：任何收敛都必须反向兼容已经被测试和文档正式承认的平行入口。
  - 更深一层看，这也解释了前几轮为什么会反复出现 report designer host scope、bridge、toolbar、文档彼此错位的问题：因为系统从根上就没有允许自己只保留一套读面。
- 信心水平
  - 确定

## 发现 2：`spreadsheet-page` 仍把同一份 host 数据同时投影为嵌套面和顶层面，测试还把双轨锁死

- 在哪里
  - `packages/spreadsheet-renderers/src/page-renderer.tsx:86-99`
  - `packages/spreadsheet-renderers/src/__tests__/schema-integration.test.tsx:35-76`
  - `packages/spreadsheet-renderers/src/__tests__/schema-integration.test.tsx:148-194`
- 是什么
  - live scope 同时发布：
    - `spreadsheet.workbook / spreadsheet.activeSheet / spreadsheet.selection / spreadsheet.runtime`
    - 顶层 `workbook / activeSheet / selection / activeCell / activeRange / runtime`
  - 集成测试显式断言两条路径都可用，例如 A1 值既能从 `data.spreadsheet.activeSheet` 读，也能从 `data.activeSheet` 读；只读状态也同样双路径支持。
- 为什么值得关心
  - 这让 Spreadsheet family 永远不可能形成唯一 authoring surface。任何 schema、示例、文档、AI 生成器、后续重构都必须记住“两套都能用”。
  - 在 v1 阶段继续保留这种双轨，只会把未来一次简单的 contract 收敛升级成大面积迁移工程。
  - 这也是 report designer host 投影持续膨胀的上游原因之一：family-level canonical vocabulary 没被真正裁掉，后续复杂宿主自然继续叠加 mirror 层。
- 信心水平
  - 确定

## 发现 3：`word-editor-core` 仍把 `DataSet*` 兼容别名作为正式公共 API 导出，文档也继续背书

- 在哪里
  - `packages/word-editor-core/src/dataset-model.ts:108-121`
  - `packages/word-editor-core/src/index.ts:21-40`
  - `docs/components/word-editor-page/design.md:49-53`
  - `docs/architecture/word-editor/design.md:24-31,95-100`
- 是什么
  - core 包仍公开导出 `DataSet`, `DataSetSourceType`, `createDataSet`, `validateDataSet`, `dataSetColumnToExpression` 等旧拼写。
  - 组件文档和架构文档都明确写着“这是兼容别名，继续保留”。
- 为什么值得关心
  - 这不是内部遗留变量，而是工作区公开包 API 层面的双词汇表。
  - 对一个还在 v1 阶段、没有外部兼容负担的项目来说，这种“新词汇已经选定，但旧词汇继续一起导出”只会把类型面、文档面、用户心智面长期污染成二义性。
  - 一旦更多包和示例继续引用这些 alias，后面再清理就不再是“删几个 deprecated export”，而是一次真正的生态迁移。
- 信心水平
  - 确定

## 发现 4：Debugger 仍对同一个 `cid` inspect 能力保留双 API 名称

- 在哪里
  - `docs/architecture/debugger-runtime.md:58-62,214-239`
  - `packages/nop-debugger/src/types.ts:338-380`
  - `packages/nop-debugger/src/types.ts:408-459`
  - `packages/nop-debugger/src/controller.ts:138,239,414-417`
  - `packages/nop-debugger/src/automation.ts:71,101-113`
- 是什么
  - active debugger 文档把 `cid` / `inspectByCid()` 定义成 canonical inspect 入口。
  - 但 controller 和 automation API 仍继续公开 `inspectNode(cid)`，而实现上它只是 `inspectByCid(cid)` 的同义别名。
- 为什么值得关心
  - 这会把本来已经收敛好的 debugger 协议重新拉回“双名称同语义”的状态，AI/E2E/工具作者仍要猜哪一个才是正式入口。
  - 由于这是 automation-facing API，不只是内部整洁度问题，而是直接影响外部脚本和文档的稳定词汇表。
  - 在 canonical-only 视角下，这类别名不应再被视为“无害遗留”，因为它本身就在阻止协议收口。
- 信心水平
  - 确定

## 发现 5：Surface runtime 内部仍把同一份表面内容存成两处，破坏单一 canonical source of truth

- 在哪里
  - `packages/flux-core/src/types/runtime.ts:178-193`
  - `packages/flux-runtime/src/surface-runtime.ts:88-100`
  - `packages/flux-react/src/dialog-host.tsx:94-133`
  - `packages/flux-react/src/dialog-host.tsx:169-218`
  - 对照文档：`docs/architecture/surface-owner.md:19-25,73-120`
- 是什么
  - `SurfaceEntry` 既保留完整 `surface` bag，又把 `surface.title` / `surface.body` 再复制一份到 entry 顶层 `title` / `body`。
  - `DialogHost` 渲染时也承认这两个来源并存：标题读 `surface.title`，正文读 `surface.body ?? surface.surface.body`。
- 为什么值得关心
  - 这属于内部 canonical model 自己不相信自己：同一份 opened-surface 内容同时有两个真相来源。
  - 一旦后续有人只更新 `entry.surface.body` 或只更新 `entry.body`，系统就会出现非常隐蔽的渲染分叉，而且这种问题通常只在复杂 surface lifecycle 下出现。
  - 文档已经把 surface family 的长期方向定义为统一内核；当前这类“双位置存储”正是会持续阻碍收敛的内部结构债。
- 信心水平
  - 确定

## 本轮小结

- 本轮切入视角：既然项目明确没有兼容性负担，那么“兼容 alias / convenience mirror / 同义 API / 双 source-of-truth”本身就是问题，而不是中性实现细节。
- 这一轮的高价值结论不是又发现了几个孤立 bug，而是确认：当前 repo 的多个子系统仍在主动把“平行合同共存”写进文档、类型、helper 和测试。这会持续稀释 canonical 设计，并放大前几轮已经暴露出的所有契约漂移问题。
