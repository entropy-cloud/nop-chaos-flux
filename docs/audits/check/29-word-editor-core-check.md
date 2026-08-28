# 29 word-editor-core 实现代码检查报告

- 检查日期：2026-08-20
- 范围：`packages/word-editor-core/src/` 全部 14 个源文件（共 1838 行，排除 `__tests__/`），并对照 `node_modules/@hufe921/canvas-editor`（^0.9.130）的 `.d.ts` 与发行产物核对内核契约，对照 `packages/word-editor-renderers/src/`（唯一下游消费方）核对调用方式。
- 结论概览：**P0 x1 / P1 x2 / P2 x5 / P3 x8**

总评：本包是基于 `@hufe921/canvas-editor` 的桥接 + 数据模型层（非 Tiptar/ProseMirror，也不做协同 step 变换）。模型校验（`normalize*`/`validate*`）、存储错误分类（`SaveDocumentError`/`RecoveryLoadError`）整体质量不错，纯函数层无明显正确性缺陷。核心问题集中在三处：(1) **readonly 语义完全未传导到 canvas-editor**（画布仍可编辑，且改动会被消费方的自动保存持久化）；(2) **模板标签的属性序列化不转义引号**，chart 名含 `"` 时保存/加载往返损坏；(3) **文档遍历模型写错**——`children` 字段在 canvas-editor 的 `IElement` 上根本不存在（死代码），而真实嵌套结构 `trList[].tdList[].value`（表格单元格）未被遍历，表格内的图表/条形码标签在保存提取时静默丢失。XSS 层面：本包不处理 paste/HTML 清洗（由 canvas-editor 内部处理），但恢复 localStorage 文档时对元素 `url` 不做 scheme 校验，属于防御纵深缺口（P2）。

---

## P0 缺陷

### F-01 readonly 模式未传导至 canvas-editor，只读文档仍可被编辑并自动持久化

- 位置：`packages/word-editor-core/src/canvas-editor-bridge.ts:15`、`canvas-editor-bridge.ts:45-61`、`canvas-editor-bridge.ts:106-109`
- 维度：D1 正确性 / D2 契约
- 摘录：

```ts
// canvas-editor-bridge.ts:15 —— 声明了 readonly 选项
export interface CanvasEditorBridgeOptions {
  ...
  readonly?: boolean;
}

// canvas-editor-bridge.ts:55 —— mount 时既不读 options.readonly，也不给 Editor 传 options
  this.instance = new Editor(container, data);
  this.setupListeners(options);

// canvas-editor-bridge.ts:107 —— _readonly 只挡 bridge 自己的便捷方法
  setValue(data: WordEditorData): void {
    if (this._readonly) return;
    this.instance?.command.executeSetValue(data);
  }
```

- 问题与推理链（输入 → 路径 → 错误结果）：
  1. 输入：消费方 `packages/word-editor-renderers/src/hooks/use-word-editor-state.ts:75` 以 `new CanvasEditorBridge(readOnly ? true : undefined)` 构造只读桥（已核实这是唯一构造路径，`readOnly` 来自 renderer schema 的 `props.props.readOnly`）。
  2. 路径：`mount()` 内 `new Editor(container, data)` 从不传第三参 `options`。canvas-editor 构造函数签名为 `constructor(container, data, options?: IEditorOption)`，`IEditorOption.mode?: EditorMode`，`EditorMode.READONLY = "readonly"`（`dist/src/editor/index.d.ts`、`dataset/enum/Editor.d.ts` 已核实）。因此底编辑器恒为默认 `EDIT` 模式。`_readonly` 标志只拦截 `setValue/undo/redo/insertTemplateExpression` 等 bridge 代理方法，而用户在画布上直接键入/粘贴/删除完全绕过 bridge。
  3. 错误结果：`readOnly: true` 的页面（预览/详情场景）中用户仍可直接修改文档；修改触发 `contentChange` → 消费方 `editor-canvas.tsx` 的 `onContentChange` 回调执行 `debouncedSave()`，把本应只读的文档改动写回 localStorage——原文档被静默篡改。同时 `CanvasEditorBridgeOptions.readonly` 是一个从未被读取的死字段，对任何走 `mount(options)` 传 `readonly: true` 的调用方构成契约陷阱。
- 影响：只读契约完全失效 + 数据被自动保存覆盖；预期之外的文档内容丢失。
- 修复方向：`mount()` 将 `this._readonly` 传导为 `new Editor(container, data, { mode: EditorMode.READONLY })`（或 mount 时读取 `options.readonly` 合并进 `_readonly` 后再传导）；`applyPaperSettings` 等命令在 READONLY 模式下的可用性需同步回归。

---

## P1 隐患

### F-02 标签属性序列化不转义引号，chart/code 名含 `"` 时保存-加载往返损坏

- 位置：`packages/word-editor-core/src/template-expr.ts:101-113`；触发链涉及 `canvas-editor-bridge.ts:165-196`、`document-io.ts:272-291`
- 维度：D1 正确性（schema 转换往返保真）
- 摘录：

```ts
export function buildTagOpenString(tagName: string, attrs: Record<string, string>): string {
  const attrStr = Object.entries(attrs)
    .map(([k, v]) => `${k}="${v}"`) // v 未转义，直接嵌入双引号
    .join(' ');
  return `<${tagName}${attrStr ? ' ' + attrStr : ''}>`;
}
// buildTagSelfcloseString 同样实现
```

- 问题：`insertChart` 把用户输入的 `chartName`（`DocChart.chartName`，UI 上是自由文本）原样写入 `name="${chartName}"`。当名称含 `"`（如 `销量"月度"报表`）时，重新解析走 `parseTagAttributes` 的正则 `/(\S+?)=(?:"([^"]*)"|'([^']*)')/g`：`name="销量"月度"报表"` 中 `"([^"]*)"` 在第一个内引号处提前闭合，`attrs.name` 截断为 `销量`，其后残片被当作无值属性静默丢弃。同理 `tag-open` 分支的 `content.lastIndexOf('>')`（`template-expr.ts:40`）也可能被属性值内的 `>` 影响。
- 特定条件与后果：用户在 chart/code 名称（或任何属性值）中输入 `"` → `captureDocumentSnapshot → extractDocChartsFromDocument → parseExprFromUrl → parseTagAttributes` 链路解析出被截断的属性 → `validateDocChart` 若因名称非空仍通过，则保存后 chart 名被静默改写；每个保存/加载循环都会再次变换，数据持续损坏。若截断后导致必填字段为空则整个 chart 从 `charts` 列表消失（占位标签仍留在正文，产生悬空引用）。
- 修复方向：序列化时对属性值做 XML 风格转义（至少 `&`、`<`、`>`、`"`），解析端对应反转义；或改用结构化承载（URL 编码属性值）而非伪 XML 字符串。

### F-03 文档遍历用错嵌套模型：`children` 不存在（死代码），表格单元格 `trList[].tdList[].value` 未遍历，表格内图表/条码提取静默丢失

- 位置：`packages/word-editor-core/src/document-io.ts:254-259`（children 递归）、`document-io.ts:265-312`（extract 入口）
- 维度：D1 正确性（节点遍历）/ D6（遍历完整性）
- 摘录：

```ts
// document-io.ts:254-259 —— 按 record.children 递归，但 canvas-editor 的 IElement 没有该字段
const nested = Array.isArray(record.children)
  ? collectTemplateAttrs(record.children as WordEditorElement[], tagName)
  : [];
if (nested.length > 0) {
  collected.push(...nested);
}
```

- 问题：已核对 canvas-editor `dist/src/editor/interface/Element.d.ts`——`IElement` 的全部嵌套能力是 `valueList`（hyperlink/title/list 等）与表格 `trList?: ITr[]`，**全接口无 `children` 字段**（grep 零命中）。`collectTemplateAttrs` 已检查顶层元素和 `valueList` 一层，但表格内容存放在 `ITableAttr.trList[].tdList[].value: IElement[]`（`table/Td.d.ts` 已核实），该路径完全未遍历。
- 特定条件与后果：用户把光标放入表格单元格后执行 `insertChart`/`insertCode`（`executeHyperlink` 会把带 `xpl:nop:chart` URL 的超链接插入单元格）→ 保存时 `captureDocumentSnapshot → extractDocChartsFromDocument` 只扫 header/main/footer 的平铺层 → 表格内的 chart/code 不进 `data.charts`/`data.codes` → 恢复后图表配置列表缺项、`WordEditorHostStatusSummary.chartCount/codeCount` 统计错误，正文里留下无配置的悬空标签。`children` 分支则是永假的死代码，说明遍历是按臆想的 DOM 模型写的。
- 修复方向：删除 `children` 死分支，补充 `element.trList?.flatMap(tr => tr.tdList)?.flatMap(td => td.value)` 的递归遍历（单元格内还可能有嵌套结构，建议对 `value` 数组复用 `collectTemplateAttrs`）。

---

## P2 风险

### F-04 恢复文档不校验元素 URL scheme，任意 URL 直接进入 canvas-editor 的 `window.open`（防御纵深缺失）

- 位置：`packages/word-editor-core/src/document-io.ts:91-100`（normalizeWordElements）
- 维度：D5 错误处理 / XSS
- 摘录：

```ts
function normalizeWordElements(value: unknown): WordDocument['main'] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(
    (entry): entry is WordDocument['main'][number] =>
      !!entry && typeof entry === 'object' && !Array.isArray(entry),
  );
}
```

- 问题：`loadDocument → normalizeWordDocument → normalizeWordElements` 只做"是对象"过滤，元素内部的 `url`（含 `hyperlink` 元素 URL）原样通过。已核对 canvas-editor 发行产物 `canvas-editor.es.js:12099-12105`：悬停弹出层把 `element.url` 直接赋给 `<a>` 的 `href`，点击执行 `window.open(element.url, "_blank")`。`data:text/html,...` 可打开钓鱼页，`javascript:` 在 `<a href>` 悬停链接路径上仍有历史执行面。前提是攻击者已能写同源 localStorage（通常意味着已存在其它 XSS 或共享机器场景），且本包 URL 生态（`expr:`/`xpl:` 前缀）未被校验，故不升 P0/P1。
- 修复方向：normalize 阶段对元素 `url` 做白名单校验（`http(s):`、`expr:`、`xpl:`、`#`），非法 scheme 置空或剥离；与 canvas-editor 的链接拦截（`override`）联动兜底。

### F-05 `saveDatasets`/`clearDocument` 无错误处理，与 saveDocument 路径不对称

- 位置：`packages/word-editor-core/src/document-io.ts:438-444`
- 维度：D5 错误处理
- 摘录：

```ts
export function clearDocument(): void {
  getStorage()?.removeItem(STORAGE_KEY);
}

export function saveDatasets(datasets: Dataset[]): void {
  getStorage()?.setItem(DATASET_STORAGE_KEY, JSON.stringify(datasets));
}
```

- 问题：`persistSavedDocument`/`loadDocument`/`loadDatasets` 全部有 try/catch 并映射到结构化错误（`SaveDocumentError`/`RecoveryLoadError`），而 `saveDatasets` 的 `setItem` 在配额超限（大文档场景常见）或 Safari 隐私模式抛 `QuotaExceededError` 时未捕获异常直接上抛；`clearDocument` 的 `removeItem` 同理（罕见）。同一包内持久化错误处理契约不一致，调用方难以统一兜底。
- 修复方向：`saveDatasets` 包 try/catch 返回结构化错误（或至少复用 `reportRecoveryLoadError` 对称的 report 机制），`clearDocument` 同步补齐。

### F-06 `collectTemplateAttrs` 的 `children` 递归是永假死代码（与 F-03 同根，独立记录其契约面）

- 位置：`packages/word-editor-core/src/document-io.ts:254-256`
- 维度：D2 契约 / D8
- 摘录：

```ts
const nested = Array.isArray(record.children)
  ? collectTemplateAttrs(record.children as WordEditorElement[], tagName)
  : [];
```

- 问题：`Record<string, unknown>` 强转掩盖了 `IElement` 无 `children` 字段的事实——若直接用 `WordEditorElement` 类型访问 `children`，TS 立即报错。这段代码给读者"已处理嵌套子树"的假象，实际从未执行。属于针对错误文档模型编写的遍历，未来任何人复制此模式都会延续错误。
- 修复方向：随 F-03 一并删除或改为真实字段遍历。

### F-07 `DataColumn.type` 复用 `DatasetSourceType`，列"数据类型"被建模为数据源类型（suspect）

- 位置：`packages/word-editor-core/src/dataset-model.ts:1-8`、`dataset-model.ts:67-69`
- 维度：D2 契约（建模）
- 摘录：

```ts
export type DatasetSourceType = 'sql' | 'api' | 'mongo' | 'static';

export interface DataColumn {
  name: string;
  label: string;
  description?: string;
  type: DatasetSourceType;   // 列的类型复用了"数据集来源"枚举
}
...
        if (!col.type || !['sql', 'api', 'mongo', 'static'].includes(col.type)) {
```

- 问题：列（字段）的 `type` 语义应为数据类型（string/number/date 等），此处与数据集来源共用同一枚举，导致"这一列的类型是 sql"这类无语义取值成为唯一合法值。下游若按列类型做格式化/校验会拿到错误语义。可能是早期复制粘贴所致；因不确定是否存在刻意设计（如列直接透传来源），标 suspect。
- 修复方向：为列引入独立的 `DataColumnType`（string/number/date/boolean…），或改名澄清语义；迁移时兼容旧持久化数据。

### F-08 `dataset-store.validate()` 无参调用恒返回 valid，形成"验证通过"假象

- 位置：`packages/word-editor-core/src/dataset-store.ts:132-141`
- 维度：D2 契约 / D5
- 摘录：

```ts
    validate(datasetId?: string): DatasetValidationResult {
      if (datasetId) {
        const dataset = this.getById(datasetId);
        if (!dataset) {
          return { valid: false, errors: ['Dataset not found'] };
        }
        return validateDataset(dataset);
      }
      return { valid: true, errors: [] };   // 不传 id：什么都不校验，却报告 valid
    },
```

- 问题：`validate()` 的自然语义是"校验全部数据集"，实际实现无参时直接返回 `{ valid: true }`。调用方（尤其未来做"保存前全量校验"的逻辑）会得到虚假的通过结果；且 `add`/`update` 入库前也不做校验，非法数据可以进 store。
- 修复方向：无参时遍历所有 datasets 聚合校验结果，或在类型上强制必传 `datasetId`（拆成两个方法）。

---

## P3 提示

### F-09 `substr` 已废弃

- 位置：`packages/word-editor-core/src/dataset-store.ts:72`
- 摘录：`name: \`col*${Date.now()}*${Math.random().toString(36).substr(2, 9)}\``
- 问题：`String.prototype.substr` 处于 Annex B legacy，ESLint（no-substr）通常报警。修复：`slice(2, 11)`。

### F-10 图表属性以逗号拆分字段列表，字段名含逗号即损坏；重复插入产生重复 id

- 位置：`packages/word-editor-core/src/canvas-editor-bridge.ts:176-177`（`valueField.join(',')`）、`document-io.ts:279-286`（`split(',')`）
- 问题：字段名（`createDataColumn` 不限制字符集）含 `,` 时往返拆分错位；同一 chart 的占位标签被复制粘贴到多处时，`extractDocChartsFromDocument` 会产出多个同 id 条目，下游按 id 查找产生歧义。修复：join/split 前校验字段名字符集，提取时按 id 去重。

### F-11 `validateFieldReference` 与 `parseFieldReference` 契约不一致

- 位置：`packages/word-editor-core/src/template-expr.ts:141-171` vs `125-139`
- 问题：`parseFieldReference` 要求 `${dataset.field}` 完整括号形式，`validateFieldReference` 却接受裸 `a.b`（先 split 再剥 `${`/`}`）。同一"字段引用"概念两套宽严标准，易在 UI 校验/解析间产生"校验通过但解析失败"。修复：validate 复用 parse 的正则。

### F-12 `parseTagAttributes` 静默丢弃无值属性与 `k = "v"`（等号两侧带空格）形式

- 位置：`packages/word-editor-core/src/template-expr.ts:92`（`/(\S+?)=(?:"..."|'...')/g`）
- 问题：正则要求属性名与 `=`、`=` 与引号间无空白，且必须有带引号的值。本包自身序列化格式恒为 `k="v"` 故自洽；但用户手工构造的 `xpl:` URL（或未来扩展）中这些形式会被无声吞掉。建议：解析失败时至少记录/返回诊断。

### F-13 `SavedDocument`（template-model）与 `SavedDocumentData`（document-io）形状分叉，`version` 字段从未被写入

- 位置：`packages/word-editor-core/src/template-model.ts:16-21`；`document-io.ts:31-35`
- 问题：`SavedDocument` 要求 `version: string` 并从 `index.ts:45` 对外导出，但持久化实际写的是无 `version` 的 `SavedDocumentData`；仓库内无任何代码构造 `SavedDocument`（已 grep 核实）。死类型 + 误导性导出。修复：删除或让 `persistSavedDocument` 真正写入版本号（后者更佳，利于未来迁移）。

### F-14 `normalizePaperSettings` 不校验数值范围

- 位置：`packages/word-editor-core/src/document-io.ts:182-212`
- 问题：`typeof record.width === 'number'` 即接受，负值/0/NaN（JSON 无 NaN，但 0/负数可行）会进入 `applyPaperSettings → executePaperSize`，产生不可预期的纸张渲染。修复：限定正数区间（如 72–2000）否则回退默认。

### F-15 `loadRecoveredState` 在持久化数据集为空时回退 `initialDatasets`，清空操作会被"复活"

- 位置：`packages/word-editor-core/src/document-io.ts:541-548`
- 问题：用户删光全部数据集并保存（持久化为 `[]`）后，下次恢复 `persistedDatasets.length === 0` 又落回初始数据集，"删除所有"永远不生效。修复：区分"无持久化记录"（可用哨兵或额外 key）与"持久化为空数组"。

### F-16 次要工程问题（汇总）

- 位置与问题：
  - `editor-store.ts:121-123`：`reset()` 仅重置状态，不清理 `bridge` 指向的编辑器实例（不调 `unmount`），依赖消费方自觉；文档未约定归属。
  - `template-expr.ts:186`：`new RegExp(FIELD_REF_REGEX)` 从 regex 复制 regex，每次调用冗余分配；直接用常量即可（当前写法规避 lastIndex 共享是有效的，仅性能/可读性提示）。
  - `document-io.ts` 共 549 行，超过仓库 500 行评估阈值（`docs/` 治理规则），按职责可拆 storage 层与 extract 层。
  - `document-io.ts:353-355`：`'empty-document'` 错误仅在 `getValue()` 返回 null（编辑器未挂载）时抛出，空内容文档仍可保存成功，错误分类名与触发条件不副实，易误导排障。

---

## 检查过程记录

1. 读 `packages/word-editor-core/package.json`：依赖 `@hufe921/canvas-editor@^0.9.130`，peer 依赖 zustand——确认为 canvas-editor 桥接层而非 Tiptar/ProseMirror 扩展（component-lab 的 Tiptap DR 117 与本包无直接代码关联，未发现 Tiptap 引用）。
2. 精读 `src/` 全部 14 个源文件（index/canvas-editor-bridge/canvas-editor-types/document-io/editor-store/dataset-store/dataset-model/template-expr/template-tags/template-model/chart-model/code-model/paper-settings/host-status），共 1838 行，无遗漏。
3. 对照内核 `.d.ts` 核对桥接契约：`Command.d.ts`（executeXxx → CommandAdapt 方法映射）、`CommandAdapt.d.ts`（`getValue/getWordCount/getPaperMargin(): number[]/setPaperMargin(payload: IMargin)/paperSize(width,height)/hyperlink(payload)/setValue(Partial<IEditorData>)`）、`Listener.d.ts`（contentChange/rangeStyleChange/pageSizeChange/pageScaleChange 均存在）、`Editor.d.ts`（构造函数第三参 `options?: IEditorOption`，`mode?: EditorMode`）、`EditorMode`/`PaperDirection` 枚举值——除 readonly 传导（F-01）外桥接方法签名均正确。
4. 对照 `Element.d.ts`、`table/Tr.d.ts`、`table/Td.d.ts` 确认嵌套模型：`IElement` 无 `children`；表格内容在 `trList[].tdList[].value`——支撑 F-03/F-06。
5. 对照发行产物 `canvas-editor.es.js:12090-12105` 确认超链接悬停 `<a href>` 赋值与 `openHyperlink` 直接 `window.open(element.url)`——支撑 F-04。
6. grep 下游 `packages/word-editor-renderers/src/`（唯一依赖方）：`new CanvasEditorBridge` 仅两处（use-word-editor-state 的 readOnly 构造、doc-preview-page 无参构造），无任何 `executeMode` 调用——支撑 F-01 推理链；`SavedDocument` 类型全仓库无构造点——支撑 F-13。
7. 检查维度覆盖说明：本包不做协同/step 变换、撤销合并（undo/redo 直接代理内核，bridge 层有 readonly 守卫）；不做 paste/HTML 清洗（canvas-editor 内部职责），故相关经典缺陷面按"不适用/转 F-04 纵深缺口"处理；长文档遍历（D6）方面 `collectTemplateAttrs`/`normalize*` 均为线性扫描，未发现性能缺陷。
8. 反误报处理：`parseExprFromUrl` 中 `replace(/>$/, '')`、`slice(1, lastIndex+1).slice(0,-1)` 等晦涩写法经逐例推演确认功能正确，未列为缺陷；`initialState.selection` 共享引用经确认所有更新路径均为拷贝更新，不构成缺陷。
