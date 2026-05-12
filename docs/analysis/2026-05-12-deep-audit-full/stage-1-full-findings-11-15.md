# Stage-1 Full Findings: Dimensions 11-15

> 状态：第 1 轮初审条目重建稿。内容来自 live repo 复查，用于补救早期维度文件只保留一句话摘要的问题；最终结论仍需与第 2-5 轮 raw findings 合并后重新独立复核。

## 维度 11：UI 组件使用合规性

### [维度11-01] Debugger JSON viewer 折叠控件使用 raw `<button>`

- **文件**: `packages/nop-debugger/src/panel/json-viewer.tsx:58-66`, `103-111`
- **证据片段**:
  ```tsx
  <button
    type="button"
    className="ndbg-json-toggle"
    aria-expanded={!collapsed}
    aria-label={`${collapsed ? 'Expand' : 'Collapse'} JSON array`}
    onClick={() => setCollapsed((value) => !value)}
  >
    {collapsed ? `▶ Array(${data.length})` : `▼ Array(${data.length})`}
  </button>
  ```
- **严重程度**: P3
- **现状**: `JsonViewer` 直接渲染 native button 作为 array/object expand-collapse 控件。
- **风险**: 绕过 `@nop-chaos/ui` Button 的 shared focus styling、sizing、theme 行为。
- **建议**: 替换为 `@nop-chaos/ui` 的 `Button`，保留 `aria-expanded/aria-label` 和 debugger marker class。
- **误报排除**: 不在 `packages/ui`、不是测试代码、不是隐藏 browser-control；debugger 其他 panel 已使用 UI Button。
- **复核结论**: 保留 P3。

## 维度 12：表单字段与 Slot 建模

### [维度12-01] FieldFrame chrome 部分输入从 raw schema 读取

- **文件**: `packages/flux-react/src/node-frame-wrapper.tsx:25-49`, `60-69`
- **证据片段**:
  ```tsx
  const schema = props.templateNode.schema as Record<string, unknown>;
  const fieldName =
    typeof props.resolvedPropsValue.name === 'string' ? props.resolvedPropsValue.name : undefined;
  const labelValue =
    typeof props.resolvedPropsValue.label !== 'undefined'
      ? (props.resolvedPropsValue.label as ReactNode)
      : (props.regions.label?.render() as ReactNode);
  const requiredValue =
    typeof props.resolvedPropsValue.required === 'boolean'
      ? props.resolvedPropsValue.required
      : undefined;
  const hintValue = typeof schema.hint === 'string' ? schema.hint : undefined;
  ```
- **严重程度**: P2
- **现状**: `name/label/required` 使用 resolved props，但 `hint/description/remark/labelRemark/labelAlign/labelWidth` 从 `templateNode.schema` 读取。
- **风险**: FieldFrame chrome 可与 runtime resolved values 不一致；表达式、imports、aliases 或 normalization 影响这些属性时 UI 可能不反映。
- **建议**: FieldFrame chrome inputs 统一走 resolved props/meta/regions，raw schema 不作为运行时 UI 主数据源。
- **误报排除**: 这些是影响 visible runtime UI 的用户 schema 字段，不是 renderer definition metadata。
- **复核结论**: 保留 P2。

### [维度12-02] Deep parameterized region 缺 `$slot` 符号表的早期判断已被 live code 推翻

- **文件**: `packages/flux-compiler/src/schema-compiler/node-compiler.ts:498-528`; `packages/flux-compiler/src/schema-compiler/regions.ts:101-106`; `packages/flux-compiler/src/schema-compiler/symbol-helpers.ts:151-171`
- **证据片段**:
  ```ts
  symbolTable: regionMeta?.params?.length
    ? pushRegionParamSymbols(
        o?.symbolTable ?? symbolTable,
        regionMeta.params,
        `${path}.${key}:slot`,
      )
    : (o?.symbolTable ?? symbolTable),
  ```
- **严重程度**: 无
- **现状**: live code 已从 nested region extraction 传递 `regionMeta`，并在 `regionMeta.params` 存在时调用 `pushRegionParamSymbols()` 注入 `$slot` symbols。
- **风险**: 早期 Stage-1 记录的具体缺陷不成立；deep nested parameterized region 如 table cells 已有 compile-time `$slot` 支持。
- **建议**: 驳回该 finding；保留/扩展 regression tests，而不是作为 defect 跟踪。
- **误报排除**: live path 并非缺 symbol-table propagation；已有 compiler tests 也覆盖 `$slot.record` 可接受。
- **复核结论**: 驳回。该条会在最终汇总中从保留项移除，除非后续复核发现其他未覆盖 deep path。

### [维度12-03] Deep region rules 所有权仍在 compiler-global tables

- **文件**: `packages/flux-compiler/src/schema-compiler/tables.ts:9-59`, `212-236`
- **证据片段**:
  ```ts
  export const DEEP_FIELD_NORMALIZERS: Record<string, Record<string, DeepFieldNormalizer>> = {
    table: {
      columns(input) {
        return normalizeTableColumns(input.value, input.path, input.regions, input.compileSchema);
      },
      expandable(input) {
        return normalizeTableExpandable(input.value, input.path, input.regions, input.compileSchema);
      },
    },
  ```
- **严重程度**: P2
- **现状**: compiler 硬编码 `table/crud/tabs/variant-field` 等 renderer-specific deep normalization rules。
- **风险**: renderer slot/field ownership 分裂：renderer definitions 声明部分 metadata，deep nested region behavior 却在 compiler tables；新增/修改 renderer slots 需要 compiler edits。
- **建议**: 将 deep region declarations 移入 `RendererDefinition` metadata 或 renderer-owned extension point，compiler 只消费 metadata。
- **误报排除**: 表内直接出现 renderer IDs 与 field names，不是普通 compiler helper。
- **复核结论**: 保留 P2。

## 维度 13：类型安全与动态边界

### [维度13-01] Persisted datasets JSON 未校验直接断言为 `Dataset[]`

- **文件**: `packages/word-editor-core/src/document-io.ts:131-150`
- **证据片段**:

  ```ts
  export function loadDatasets(): Dataset[] {
    try {
      const storage = getStorage();
      if (!storage) return [];

      const raw = storage.getItem(DATASET_STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as Dataset[];
    } catch {
      return [];
    }
  ```

- **严重程度**: P2
- **现状**: 从 `localStorage` 读取的数据 parse 后直接 cast 为 `Dataset[]`。
- **风险**: 语法合法但 shape 错误的 persisted data 会作为可信 typed data 进入 editor state，引发下游 shape errors 或无效状态。
- **建议**: 为 `Dataset[]` 增加 runtime validation/coercion，丢弃或修复 invalid entries。
- **误报排除**: `try/catch` 只处理 parse/storage exceptions，不验证 array 和 dataset item shape。
- **复核结论**: 保留 P2。

## 维度 14：测试覆盖与质量

### [维度14-01] Component Lab coverage manifest 漏 live `input-number` route

- **文件**: `apps/playground/src/route-model.ts:173-178`; `apps/playground/src/component-lab/renderer-lab-registry.ts:66-71`; `tests/e2e/component-lab/coverage-manifest.ts:167-180`
- **证据片段**:
  ```ts
  id: 'input-number',
  title: 'Input Number',
  category: 'form',
  sourcePackage: '@nop-chaos/flux-renderers-form',
  description: 'Numeric input with min/max, precision, stepper, and prefix/suffix support.',
  ```
  ```ts
  {
    id: 'input-password',
    title: 'Input Password',
    tier: 'write',
  },
  {
    id: 'textarea',
  ```
- **严重程度**: P3
- **现状**: playground route 与 lab registry 暴露 `input-number`，但 E2E coverage manifest 从 `input-password` 跳到 `textarea`，未列出 input-number。
- **风险**: Component Lab coverage accounting 漏报 active renderer route，route-specific smoke/coverage 可能漏掉回归。
- **建议**: 添加 `input-number` manifest entry 和对应 E2E assertion。
- **误报排除**: `input-number` 在 route model、lab registry、renderer implementation、lab page 均存在，不是 dead code。
- **复核结论**: 保留 P3。

### [维度14-02] Component Lab manifest 声明 write coverage，但 specs 只断言 read visibility

- **文件**: `tests/e2e/component-lab/coverage-manifest.ts:244-255`; `tests/e2e/component-lab/complex-form.spec.ts:110-124`, `129-148`
- **证据片段**:
  ```ts
  {
    id: 'key-value',
    title: 'Key Value',
    tier: 'write',
    primaryScenario: 'HTTP header editing',
    notes: 'Verify pre-populated rows are visible; add a row and verify it appears',
  },
  {
    id: 'array-editor',
    title: 'Array Editor',
    tier: 'write',
  ```
  ```ts
  test.describe('key-value renderer', () => {
    test('read: pre-populated HTTP headers are visible', async ({ page }) => {
  ```
- **严重程度**: P3
- **现状**: manifest tier 标记 `write`，但 live specs 至少对 `key-value`/`array-editor` 是 read-style 可见性检查。
- **风险**: dashboard/reviewer 会误以为 mutation/write behavior 已锁定，实际只测初始渲染。
- **建议**: 降级 manifest tiers 为 `read`，或补充真实 write interaction tests。
- **误报排除**: manifest 对 `write` 有明确语义，spec 名称和动作显示 read-only。
- **复核结论**: 保留 P3。

## 维度 15：安全与性能红线

### [维度15-01] Report/spreadsheet sync 热路径全量 `JSON.stringify` spreadsheet document

- **文件**: `packages/report-designer-renderers/src/page-renderer.tsx:124-126`, `301-337`
- **证据片段**:
  ```tsx
  function serializeSpreadsheetDocument(document: SpreadsheetRuntimeSnapshot['document']): string {
    return JSON.stringify(document);
  }
  ...
  const syncingSpreadsheetFromReportRef = useRef(false);
  const lastSyncedSpreadsheetRef = useRef(serializeSpreadsheetDocument(spreadsheetSnapshot.document));
  const lastAppliedReportSpreadsheetRef = useRef(
    serializeSpreadsheetDocument(snapshot.document.spreadsheet),
  );
  ```
- **严重程度**: P2
- **现状**: report/spreadsheet bridge 在 refs/effects 中通过 stringify 整个 spreadsheet document 比较 sync state。
- **风险**: spreadsheet document 变大后，订阅/effect 路径上出现 O(document size) serialization hot-path cost。
- **建议**: 使用 revision/version counters、structural sharing identity、dirty generation IDs 或 core 维护的 targeted hashes 替代 full stringify。
- **误报排除**: 不是 cold save/export path；调用位于 React sync effects 与 snapshot subscriptions。
- **复核结论**: 保留 P2。
