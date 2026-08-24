# 28 report-designer-core 实现代码检查报告

- 检查日期：2026-08-20
- 范围：`packages/report-designer-core/src/` 排除 `*.test.*` 与 `__tests__/` 后 12 个实现文件共 2303 行（core.ts 518 / types.ts 401 / core-dispatch.ts 351 / runtime/metadata.ts 367 / adapters.ts 178 / commands.ts 93 / index.ts 81 / runtime/field-sources.ts 75 / runtime/codec-commands.ts 69 / runtime/preview-commands.ts 56 / runtime/adapter-context.ts 43 / runtime/registry.ts 41 / runtime/inspector-panels.ts 30）。**精读覆盖率 100%**。另核对了 `docs/architecture/report-designer/design.md`、`docs/architecture/report-designer/config-schema.md`、`package.json`，并交叉验证 `packages/spreadsheet-core/src/types.ts`（cellAddress 生成）、`packages/spreadsheet-core/src/core/structure-operations.ts`（行列删除重排键）、`packages/report-designer-renderers/src/page-renderer.tsx`（syncSpreadsheetDocument 消费方）与 `flux-i18n` locale（key 全部存在）；扫读 `__tests__/` 9 个测试文件校准反误报。
- 结论概览：**P0 x0 / P1 x4 / P2 x5 / P3 x7**。总评：包体量小、分层清晰（types 纯函数 + zustand vanilla store + dispatch 命令面 + runtime 辅助），abort/ownership 防竞态（preview 单 owner、refresh 信号量）与 COW 不可变更新纪律执行到位，i18n key 与 flux-i18n locale 全部对齐。但报表设计器经典缺陷面有实质命中：**drop-to-range 自造地址公式在 col≥26 时产生非法地址（"[1"）、range 元数据读取不按 range 匹配恒取第一条、无变化写操作污染 undo 栈并清空 redo、结构性删行/删列后语义元数据键完全不平移**构成 P1 主体。P2 集中在浅拷贝隔离缺口（嵌套引用可绕过 undo 原地突变文档）与对 config-schema.md 的契约漂移（version/$schema/expressions/preview.modes 无类型支持、版本迁移协议整体缺失、importTemplate 结果未隔离）。任务背景中的 band/分页预计算缺陷面在本包不存在——本包是 spreadsheet 之上的语义覆盖层，无 band/页高模型（已 grep 确认），分页/布局属 spreadsheet-core 职责。

## P0 缺陷

无。四条 P1 均为"特定输入/操作条件下确定出错"，未发现无条件主路径破坏。

## P1 隐患

### F-01 applyFieldDrop 自造单元格地址公式只支持 A–Z：col≥26 时字段绑定写入非法地址键，永久悬空

- 位置：`packages/report-designer-core/src/runtime/metadata.ts:335`
- 关键源码摘录（metadata.ts:333-335）：
  ```ts
  for (let row = range.startRow; row <= range.endRow; row++) {
    for (let col = range.startCol; col <= range.endCol; col++) {
      const entryKey = `${String.fromCharCode(65 + col)}${row + 1}`;
  ```
- 输入 → 路径 → 错误结果推理链：
  1. 输入：无 drop 适配器的默认宿主下（`registry.fieldDrops` 为空即走 fallback 路径，core-dispatch.ts:82-97），把字段拖到覆盖第 27 列及以后（col ≥ 26）的区域选择上（design.md §5.2 明确要求 workbook 不得截断到 100x26 最小基线）。
  2. 路径：`String.fromCharCode(65 + 26)` = `[`，col=26 生成 entryKey `"[1"`；spreadsheet-core 的规范地址是 `cellAddress(row, col)` = `"AA1"`（spreadsheet-core/src/types.ts:291-299，正确处理多位字母列）。
  3. 错误结果：cellMeta 写入键 `"[1"`，而所有读取路径（getTargetMeta/updateMetadata 'cell' 分支用 `target.cell.address`）都以 `"AA1"` 寻址——绑定对 inspector 完全不可见；幽灵键随文档持久化、导出，永无清理路径；`parseCellAddress` 的正则 `/^([A-Z]+)(\d+)$/` 解析该键会直接抛错。
- 为什么现有测试没抓到：`__tests__/designer-core.test.ts:283-304` 的 drop 用例只打 A1 单格；range drop 全包测试零覆盖。
- 影响：跨 Z 列的区域字段绑定静默丢失（无报错、无 UI 反馈），是数据绑定类缺陷中最难排查的一类。
- 修复方向：删除本地公式，直接 `import { cellAddress } from '@nop-chaos/spreadsheet-core'`（已是 package.json 直接依赖）；补 col≥26 的 range drop 回归测试。

### F-02 getTargetMeta 'range' 分支不按 range 匹配，恒返回该 sheet 第一条 rangeMeta：读写不对称导致跨 range 元数据串写污染

- 位置：`packages/report-designer-core/src/types.ts:361-367`；对照写入侧 `runtime/metadata.ts:279-300`
- 关键源码摘录（types.ts:361-367）：
  ```ts
  case 'range': {
    const rangeEntries = semantic?.rangeMeta?.[target.range.sheetId];
    if (rangeEntries && rangeEntries.length > 0) {
      return rangeEntries[0].meta;   // 不比较 range 边界 / id
    }
    return undefined;
  }
  ```
- 特定条件 + 后果：
  1. 条件：同一 sheet 存在 ≥1 条 rangeMeta（写入侧按精确 id `${sheetId}:${startRow}:${startCol}:${endRow}:${endCol}` 定位，metadata.ts:281-283），用户当前选中的 range 不是存储列表的第一条。
  2. 路径：inspector 读取 `activeMeta = getTargetMeta(...)` 拿到**别的 range** 的元数据；随后 `report-designer:updateMeta` 用 `mergeMetadata(错误基线, patch)` 后写入当前 range 的 id。
  3. 后果：range A 的元数据被合并进 range B 的条目（跨 range 数据串写污染）；即使只有一条 rangeMeta，选中任意其他 range 也会显示并覆写那条记录。渲染层在区域选择时确实会构造 range target（report-designer-renderers/src/report-spreadsheet-canvas.tsx:119）。
- 为什么现有测试没抓到：`__tests__/document-and-metadata.test.ts:181-209` 只测 `setRangeMeta` 写入，从不通过 getTargetMeta 读 range。
- 影响：区域级属性编辑的数据完整性破坏，且污染通过 merge 静默累积。
- 修复方向：读取侧按写入侧同款 id 匹配（`rangeEntries.find((item) => item.id === id)?.meta`），或在 RangeMetaDocument 匹配时比较 range 边界；补两条 rangeMeta 的读写对称测试。

### F-03 updateMeta/replaceMeta/dropFieldToTarget 在 changed=false 时仍无条件压 undo 并清空 redo：无变化写操作产生 no-op 撤销步并销毁重做历史

- 位置：`packages/report-designer-core/src/core-dispatch.ts:88-97`（drop fallback）、`:115-127`（drop adapter 路径）、`:139`（updateMeta）、`:149`（replaceMeta）；对照 core.ts:325-340 `applyDocumentChange` 的正确守卫
- 关键源码摘录（core-dispatch.ts:133-142）：
  ```ts
  case 'report-designer:updateMeta': {
    return withDerivedRefresh(async () => {
      const current = store.getState();
      const currentMeta = getTargetMeta(current.document.semantic, command.target);
      const nextMeta = mergeMetadata(currentMeta, command.patch);
      const result = updateMetadata(current.document, command.target, nextMeta);
      store.setState((s) => ({ ...s, ...ctx.pushUndoEntry(s), document: result.document }));
      return { ok: true, changed: result.changed };
  ```
  对照 core.ts:327-332（直接 setMetadata 路径有守卫）：
  ```ts
  store.setState((current) => {
    if (current.document === nextDocument) {
      return current;   // 未变化不压 undo、不清 redo
    }
  ```
- 特定条件 + 后果：
  1. 条件：inspector 保存未修改的表单（updateMeta patch 与现有 meta 归一化后相等，`shallowEqualMetadata` 判等 → `result.changed === false`），或重复拖同一字段到同一单元格（drop 两次相同 payload）。
  2. 路径：`updateMetadata` 返回 `document` 原引用，但 dispatch 路径仍执行 `pushUndoEntry`——该函数无条件 `undoStack.push(当前文档)` 且 `redoStack: []`（core.ts:316-323）。
  3. 后果：(a) redo 历史被一次无变化保存**静默清空**；(b) undo 栈混入与当前文档完全相同的条目，用户按一次 undo "无反应"（实际恢复的是同一文档），要按两次才回到真实前态；两次 drop 同一字段即必现。
- 为什么现有测试没抓到：`__tests__/designer-core.test.ts` 的 undo 用例都是"变更→撤销"，无"无变更写入→检查 undo/redo 栈"用例；`metadata-immutability.test.ts` 只验证文档引用替换。
- 影响：undo/redo 语义可信度受损（redo 丢失属不可恢复的用户操作损失）；同包内两条写路径（setMetadata vs dispatch）行为不一致本身就是缺陷信号。
- 修复方向：dispatch 各写路径复用 `applyDocumentChange`（或同样以 `result.changed`/`result.document !== current.document` 为门禁再压栈）；补"未变更 updateMeta 不产生 undo 条目、不清 redo"回归测试。

### F-04 结构性删行/删列/删 sheet 后语义元数据键零平移零清理：绑定静默错位到错误行列，孤儿元数据永久残留

- 位置：`packages/report-designer-core/src/core.ts:462-474`（syncSpreadsheetDocument 整体替换 spreadsheet，semantic 原样引用）；全包 grep `remap|shiftRow|deleteRow|removeColumn|cleanup|orphan` 零命中
- 关键源码摘录（core.ts:462-468）：
  ```ts
  syncSpreadsheetDocument(nextDocument) {
    if (isReadonly) return;
    const currentDocument = store.getState().document;
    const changed = applyDocumentChange({
      ...currentDocument,
      spreadsheet: structuredClone(nextDocument),   // semantic 分毫未动
    });
  ```
- 特定条件 + 后果推理链：
  1. 输入：报表中 A2 单元格绑定了字段（cellMeta["A2"]），用户在画布删除第 1 行（design.md §9.1 将行列删除列为共享 workbench 基线操作）。
  2. 路径：spreadsheet-core `deleteRowAt` 按 `cellAddress(cell.row - count, cell.col)` 把原 A2 内容**重键**到 A1（structure-operations.ts:116）；宿主随后 `core.syncSpreadsheetDocument(新doc)`（report-designer-renderers/src/page-renderer.tsx:467 直接透传，同样无平移）；core 只替换 `document.spreadsheet`，`semantic.cellMeta`/`rowMeta`/`columnMeta` 的键原样保留。
  3. 错误结果：原 A2 的绑定仍挂在 cellMeta["A2"]，而 A2 现在是原 A3 的内容——**所有被删行之下的绑定静默上移错位一行**；rowMeta/columnMeta 同理按数字索引错位；删除整个 sheet 后该 sheetId 的全部元数据变孤儿，随导出永久序列化。undo 虽可救急，但用户在不知情间继续编辑即产生真实脏数据。
- 责任界定：design.md §6.2 将 metadata 平面划给 report designer 语义层维护，本包既未实现平移也未提供任何 remap API/钩子供适配器实现（消费方 renderer 亦无），链路整体缺位。
- 影响：报表设计器最经典的"删行后绑定引用清理"缺陷，成批绑定错位且无任何告警。
- 修复方向：为 syncSpreadsheetDocument 增加可选结构 diff/迁移钩子（接收 old/new spreadsheet，返回 semantic 重键 patch），或由 core 暴露 `remapSemantic(sheetId, ops)` 命令并要求宿主在结构变更时调用；至少在文档中显式声明当前不平移的契约与宿主责任。

## P2 风险

### F-05 浅拷贝隔离缺口：嵌套元数据对象与文档/配置共享引用，getMetadata/activeMeta/applyFieldDrop 三处可绕过 undo 原地突变文档

- 位置：`runtime/metadata.ts:14-16`（cloneMetadataBag 仅一层展开）、`:313-319`（applyFieldDrop 把 `command.field.data` 调用方引用直接入档）、`core.ts:59-61`（buildSnapshot 的 activeMeta 是文档内对象的**原引用**，零克隆）、`runtime/field-sources.ts:18`（`{...field}` 浅克隆，field.meta 与 config 共享）
- 关键源码摘录（metadata.ts:313-318）：
  ```ts
  const patch: MetadataBag = {
    [field.type]: {
      sourceId: field.sourceId,
      fieldId: field.fieldId,
      data: field.data, // 调用方对象引用直接写入文档
    },
  };
  ```
- 问题：`getMetadata` 返回 `{...meta}` 浅拷贝，消费者改 `meta.field.data.x` 或 `snapshot.activeMeta` 嵌套属性即原地改文档——不产生 undo 条目、不置 dirty、不通知订阅者；drop 命令的 payload.data 同样与调用方共享。`metadata-immutability.test.ts` 只验证顶层引用替换，嵌套层无覆盖。
- 影响：绕过 undo/dirty 的静默突变，宿主任一处不规范写法即可造成"文档变了但历史与基线不知情"。
- 修复方向：cloneMetadataBag 升级为 structuredClone（或深冻结快照）；applyFieldDrop/mergeMetadata 对入参 patch 做深克隆；buildSnapshot 的 activeMeta 至少浅克隆并说明嵌套只读契约。

### F-06 与 config-schema.md 的配置契约漂移：ReportDesignerConfig 缺 version/$schema/expressions/preview.action/preview.modes，fieldSources 类型与 FieldSourceConfig 不符

- 位置：`packages/report-designer-core/src/types.ts:122-144`；对照 `docs/architecture/report-designer/config-schema.md` §5-§9
- 关键源码摘录（types.ts:122-144）：
  ```ts
  export interface ReportDesignerConfig {
    kind?: string;                       // 文档要求 version/kind 必填，impl 均可选且无 version
    fieldSources?: FieldSourceSnapshot[]; // 文档为 FieldSourceConfig[]：mode/description/itemTemplate/dragPayload 无类型支持
    ...
    preview?: { provider?: string };      // 文档还有 action?/modes?
  ```
- 问题：文档定义的 `$schema`、`version`（必填）、`expressions`（表达式编辑器绑定）、`adapters`、`preview.action`、`preview.modes` 在核心配置类型中全部缺位；FieldSourceConfig 的 `mode/itemTemplate/dragPayload` 亦无。运行时结构类型不拒多余键，宿主可传入但核心静默忽略——"声明了但未实现且静默"模式。另 `inspector.byProfile` 以 `profile.inspectorSchemaId` 为键（inspector-panels.ts:16-18），与文档"按 profile 名"的描述存在解释空间。
- 影响：宿主按文档写配置无类型反馈、无运行时告警；preview.modes 不生效会让宿主误以为模式受控。
- 修复方向：补齐类型（或将文档收窄为已实现集）；对未识别的 config 键在 dev 模式告警。

### F-07 schema 版本迁移协议整体缺失：config-schema.md §12 的 from→to 迁移链、结构化失败错误无任何实现

- 位置：`packages/report-designer-core/src/types.ts:53`（version 仅是字符串字段）、`:173`（创建时硬编码 '1.0.0'）；全包无 migrat\* 代码
- 问题：config-schema.md §12 明确要求"SpreadsheetDocument.version 与 ReportTemplateDocument.version 都必须参与迁移协议；迁移按显式 from→to 链顺序执行；迁移失败时返回结构化错误"。impl 对导入文档（importTemplate）的 version 不读取、不校验、不迁移——旧版本模板直接按当前结构消费，未来任何不兼容变更都没有承接点。
- 影响：契约承诺的演进路径不存在，首个真实 schema 变更时将面临没有迁移框架可挂的境地。
- 修复方向：落地最小迁移注册表（`migrations: { from, to, migrate }[]` + 版本校验 + 结构化错误），或先在文档中把 §12 降级为"预留"。

### F-08 importTemplate 结果文档未克隆未校验直接成为 canonical document：适配器保留引用即可绕过 undo 突变文档

- 位置：`packages/report-designer-core/src/core-dispatch.ts:246-258`；对照 core.ts:85（构造时 cloneDocument）、core.ts:467（sync 时 structuredClone）
- 关键源码摘录（core-dispatch.ts:246-250）：
  ```ts
  store.setState((current) => ({
    ...current,
    ...ctx.pushUndoEntry(current),
    document: imported,        // 适配器返回对象原引用入档
    savedDocument: imported,
  ```
- 问题：三条文档入口中两条有隔离，唯独 importTemplate 没有——适配器（外部代码）若缓存并复用返回的文档对象，可在 undo/redo/dirty 体系之外原地改写 canonical document；同时返回值不做形状校验/归一化（缺 spreadsheet、缺 workbook.sheets 的垃圾输入会一路存进 store）。
- 影响：外部适配器成为文档可变性的后门；脏导入让后续 getDefaultSelectionTarget/getTargetMeta 等路径行为不可预期。
- 修复方向：`document: cloneDocument(imported)`（savedDocument 同源）+ 最小形状校验（id/spreadsheet.workbook 存在，失败返回结构化错误）。

### F-09 profile 空数组语义反转：fieldDropIds: [] 变成"允许全部"，fieldSourceIds: [] 变成"全部字段源"——"显式禁用全部"不可表达

- 位置：`packages/report-designer-core/src/runtime/registry.ts:25-30`、`runtime/field-sources.ts:23-31`
- 关键源码摘录（registry.ts:25-30）：
  ```ts
  export function getProfileFieldDropIds(profile?: ReportDesignerProfile): Set<string> | undefined {
    if (!profile?.fieldDropIds?.length) {
      return undefined;        // 空数组 → undefined → dispatch 侧不再过滤 = 全部放行
    }
  ```
- 问题：`allowedFieldDropIds === undefined` 在 core-dispatch.ts:82-86 的语义是"不设限"，与 profile 声明 `fieldDropIds: []`（合理意图：该 profile 不允许任何 drop 适配器）正好相反；fieldSourceIds 同构回落到全部 config 源。类型上 `fieldDropIds: string[]` 是必填字段，显式空数组是完全合法的输入。
- 影响：profile 想收紧权限却意外全开——权限类配置的反直觉默认，可能被宿主用于禁用某类写路径的场景。
- 修复方向：区分"未配置"（undefined）与"配置为空"（[]），后者返回空 Set；同步修 fieldSourceIds。

## P3 提示

### F-10 元数据合并语义三轨不一致：updateCellMeta 深合并、updateRow/Column/SheetMeta 浅合并、dispatch 链浅合并 + normalize 丢 undefined 键

- 位置：`types.ts:227-236`（deepMerge 仅 cell 用）、`:259-300`（row/column/sheet 浅展开）、`runtime/metadata.ts:36-42, 304-306`
- 问题：同一"更新元数据"意图，三个公开入口对嵌套对象与 undefined 清键行为不同（deepMerge 保留 `foo: undefined` 键，normalizeMetadataBag 会删除该键）。cell 与 row/column 走不同合并深度缺乏设计依据，宿主在 inspector 与编程 API 间切换时会观察到不一致结果。
- 修复方向：统一为一种合并策略（建议全浅 + 显式 `null`/undefined 清键约定），deepMerge 仅保留给确需深合并的调用点并文档化。

### F-11 cloneDocument 的 JSON 往返保真缺口：Date→string、NaN/Infinity→null、undefined 丢弃、循环引用抛错，与 syncSpreadsheetDocument 的 structuredClone 不对称

- 位置：`runtime/metadata.ts:10-12`
- 问题：exportDocument/save/adapter context 均走 `JSON.parse(JSON.stringify(...))`，而 sync 入口用 structuredClone（保留 Date）。若 cell value 含 Date（类型上 `value?: unknown` 合法），导出/保存产物与内存文档类型不一致；循环引用直接抛 TypeError 未捕获。
- 修复方向：统一改 structuredClone，或文档声明 cell value 必须为 JSON 安全值并在入口校验。

### F-12 preview.lastResult 生命周期不完整：importTemplate/undo/redo 不清理旧文档的预览结果，失败路径保留 mode

- 位置：`core-dispatch.ts:246-259`（import 不动 preview）、`:288-324`（undo/redo 同）、`:185-194`（resolve 失败保留 `mode: command.mode`，对照 stopPreview:283 清 mode）
- 问题：换文档（import）或回退文档（undo）后 `preview.lastResult` 仍是旧文档产物，宿主若按"有 lastResult 即展示"实现预览面板会显示与新文档无关的结果。
- 修复方向：document 替换类命令统一清 `preview.lastResult`（或给 lastResult 附带文档版本戳）。

### F-13 性能与健壮性：每次元数据编辑全量刷新字段源、provider 串行加载无超时、超大 range drop 无上限

- 位置：`core-dispatch.ts:71-75`（withDerivedRefresh 每次写后 refresh）、`runtime/field-sources.ts:47-72`（for-await 串行、无 timeout）、`runtime/metadata.ts:333-354`（range 行列双循环无界）
- 问题：updateMetadata 每次都产生新文档引用，字段源缓存（按文档引用判等，core.ts:146-151）必失效，动态 provider 在每次单元格属性保存时被重新 load；整列选择（endRow 可达工作表边界）drop 时循环量可达百万级，阻塞主线程。
- 修复方向：字段源刷新按需（仅 drop/import 后），或对 provider 结果做内容级缓存；applyFieldDrop 对 range 规模设上限并返回结构化错误。

### F-14 initialize() 双通道报错：onError 回调之外返回的 promise 仍 reject，宿主只配 onError 不 catch 会产生 unhandled rejection

- 位置：`core.ts:300-313`（.then 里重抛 inspector.error）
- 问题：provider 启动失败既触发 `onError` 又让 `initialize()` 的 promise reject（`__tests__/designer-core.async.test.ts:352` 测试自身都要 `.catch(() => undefined)`）。onError 的存在暗示"错误已托管"，两个通道并存易被误用。
- 修复方向：二选一（建议 initialize 解析为 void、错误只走 onError + inspector.error），或在文档中显式要求 catch。

### F-15 API 面不一致：index.ts 未导出 StopPreview/Undo/Redo/Save 四个命令类型；core-dispatch.ts:63 的 import 语句位于文件中部

- 位置：`index.ts:40-52`（导出了 Drop/Update/Replace/Open/Close/Preview/Import/Export 命令类型，漏 StopPreviewCommand/UndoCommand/RedoCommand/SaveCommand）、`core-dispatch.ts:63`（`import { isAbortError }` 夹在接口定义之后）
- 问题：宿主想对 stop/undo/redo/save 命令做类型标注只能从子路径导入或自行声明；中部 import 违背 ESM 惯例（虽合法）。
- 修复方向：补齐四个类型导出；import 上移。

### F-16 杂项：crypto.randomUUID 非安全上下文不可用、字段 id 跨源重名不校验、codec 只能经 profile 配置（与 preview 的 config 回退不对称）

- 位置：`types.ts:170`（createReportTemplateDocument 用 crypto.randomUUID，非 HTTPS/localhost 环境抛 TypeError）、`runtime/field-sources.ts:71`（多 provider 返回同 id 字段直接 push，drop payload 仅以 sourceId+fieldId 定位，重名字段绑定歧义）、`runtime/registry.ts:32-41`（getPreviewProviderId 有 `config.preview.provider` 回退，getCodecId 只认 profile.codecId——纯 config 宿主能用 preview 却永远 import/export 报"未配置编解码器"）
- 修复方向：randomUUID 加 fallback（或注入 id 生成器）；loadFieldSources 做跨源 id 冲突检测（至少 dev 告警）；codec 增加 config 级回退键或在文档声明仅 profile 可配。

## 检查过程记录

1. 通读 `docs/architecture/report-designer/design.md`（契约：dirty 收敛、preview 单 owner、undo 参与面、host scope 投影）与 `docs/architecture/report-designer/config-schema.md`（配置模型、版本迁移约束），建立契约基线。
2. 精读全部 12 个实现文件（2303 行，覆盖率 100%）：core.ts（store/生命周期/信号量）→ types.ts（模型+元数据纯函数）→ core-dispatch.ts（命令面）→ runtime/\*（metadata/field-sources/inspector-panels/preview/codec/adapter-context/registry）→ commands/adapters/index。
3. 交叉验证反误报：
   - spreadsheet-core `cellAddress`（types.ts:291-299）确证 F-01 地址公式错误范围（col≥26）；`structure-operations.ts:116,164` 确证删行/列按地址重排键，支撑 F-04。
   - report-designer-renderers `page-renderer.tsx:445-468` 确证 syncSpreadsheetDocument 消费方无任何元数据平移，F-04 为链路级缺位而非仅本包。
   - flux-i18n zh-CN/en-US locale 确认本包使用的 9 个 i18n key（documentReadonly/untitledReport/nothingToUndo/nothingToRedo/unknownCommand/noPreviewProvider/previewAdapterNotFound/noCodecConfigured/codecNotFound）全部存在。
   - 扫读 `__tests__/` 9 个文件：preview 竞态（designer-core.async.test.ts:38-151）与启动去重行为有充分测试且实现正确（stale completion 不发布状态）；"stale preview dispatch 对自身 caller 仍返回 ok:true"（:90）为测试背书的既定行为，不列为 finding；undo/drop/无变更写入与 range 元数据读取均无覆盖，对应 F-01/F-02/F-03 反误报确认。
4. 范围内核查：任务背景中的 band 层级/跨页/分页页高累计浮点误差/页脚重复缺陷面在本包不存在（grep `band|paginat|pagebreak|footer` 零命中）——本包为 spreadsheet 之上的语义层，分页布局属 spreadsheet-core；字段删除级联清理（cellMeta 悬空引用）与聚合字段重名按通用设计器定位属适配器/profile 职责，但本包亦未提供任何级联钩子（见 F-04 修复方向的连带建议）。
5. 分级校准：对照 27 号报告口径（"冻结/筛选索引不随结构变更平移"为 P1），F-04 保持 P1；F-01/F-02/F-03 均需特定条件触发但后果确定，未发现无条件主路径破坏，故 P0 x0。
