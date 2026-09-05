# hostContract manifest 工具链闭环分析

> 本文件分析 hostContract manifest 的实现现状、缺口和建议实施路径。

## 文档共识审查记录（本文件）

> 依据项目文档共识审查惯例，本文件定稿前须经独立子 agent（fresh session）反复审查直到共识（判据：连续一轮 0 新增修正项；≤3 轮，超限升级人工）。记录如下：

- **Round 1（2026-09-05，fresh session 独立子 agent，batch 1）**：判定 `AGREE`——0 Blocker / 0 Major / 1 Minor（m-1: 诊断码表未区分已实现 vs manifest 推荐未实现）/ 1 Nit（n-1: resolveHostContractManifest 代码片段为语义等价简化表示）。Minor 为标注增强建议，已接受；Nit 不影响事实准确性。
- **Round 2（2026-09-05，fresh session 独立子 agent，batch 1 确认轮）**：判定 `AGREE`——Round 1 修正项全部落地，1 项 Nit 级行号偏差（≤2 行，不阻塞），0 新增 Major/Minor。**达成共识**（共识循环：R1 修正 0 轮 + R2 确认轮，未超轮次上限）。

---

## 1. 现有基础设施

### 1.1 类型定义层（flux-core）

| 组件                             | 代码位置                                                        | 说明                                                                               |
| -------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Manifest 类型                    | `packages/flux-core/src/schema-diagnostics/manifest.ts:194-201` | `HostCapabilityProjectionManifest` — family + version + projection + capabilities  |
| FluxValueShape                   | `packages/flux-core/src/schema-diagnostics/manifest.ts:16-115`  | 共享结构 shape 类型（string/number/boolean/object/array/union/literal/unknown 等） |
| RendererHostContract             | `packages/flux-core/src/schema-diagnostics/manifest.ts:293-308` | renderer definition 上的 hostContract 字段类型                                     |
| CapabilityPublicationAttribution | `packages/flux-core/src/schema-diagnostics/manifest.ts:260-287` | `whole-owner` / `region-scoped` 两种 capability publication 模式                   |
| HostContractContext              | `packages/flux-core/src/schema-diagnostics/manifest.ts:314-329` | standalone fragment validation 的显式 context                                      |

### 1.2 RendererDefinition 集成

```typescript
// packages/flux-core/src/types/renderer-definition-types.ts:104
hostContract?: RendererHostContract;
```

`RendererHostContract` 包含：

- `family: string` — host family 名称
- `defaultVersion: string` — 默认版本选择器
- `resolveManifest(versionSelector: string)` — 返回 `HostCapabilityProjectionManifest | undefined`
- `capabilityPublication?: CapabilityPublicationAttribution` — 编译器验证所需

### 1.3 标准消费路径

```typescript
// packages/flux-core/src/types/renderer-authoring-contract.ts:51-62
export function resolveHostContractManifest(
  definition: RendererDefinition,
  versionSelector?: string,
): HostCapabilityProjectionManifest | undefined {
  const hostContract = definition.hostContract;
  if (!hostContract) return undefined;
  const selector = versionSelector ?? hostContract.defaultVersion;
  return hostContract.resolveManifest(selector);
}

// packages/flux-core/src/types/renderer-authoring-contract.ts:71-95
export function resolveRendererAuthoringContract(
  definition: RendererDefinition,
  versionSelector?: string,
): ResolvedAuthoringContract {
  // 组装 hostProjection + hostActions + hostManifest + editableProps + events + ...
}
```

### 1.4 编译器 host action 验证

```typescript
// packages/flux-compiler/src/schema-compiler/host-action-validation.ts:75-151
export function validateHostAction(
  action: string,
  args: unknown,
  path: string,
  diagnostics: SchemaCompilerDiagnosticsContext,
  hostContext: HostActionValidationContext | undefined,
): boolean {
  // 1. 检查是否在 capable region 内
  // 2. 解析 namespace:method
  // 3. 验证 method 是否在 manifest 中声明
  // 4. 验证 args shape 是否匹配
  // 5. 标记 deprecated methods
}
```

### 1.5 编译器遍历集成

```typescript
// packages/flux-compiler/src/schema-compiler/shape-validation-traversal.ts:84-155
export function resolveNodeHostContext(
  schema: BaseSchema,
  renderer: RendererDefinition,
  path: string,
  diagnostics: SchemaCompilerDiagnosticsContext,
  inheritedHostContext: HostActionValidationContext | undefined,
): { hostContext?: HostActionValidationContext; startsHostBoundary: boolean } {
  // 1. 读取 renderer.hostContract
  // 2. 处理 xui:version 覆盖
  // 3. 调用 hostContract.resolveManifest()
  // 4. 校验 family 一致性
  // 5. 创建 HostActionValidationContext
}
```

已支持的诊断码：

| 诊断码                              | 说明                                   | 严重度  |
| ----------------------------------- | -------------------------------------- | ------- |
| `unknown-host-contract-family`      | manifest family 与 renderer 声明不一致 | error   |
| `unsupported-host-contract-version` | 版本选择器无法解析                     | error   |
| `host-contract-version-mismatch`    | 内外版本不一致                         | warning |
| `unknown-host-capability-method`    | 方法不在 manifest 中                   | error   |
| `invalid-host-capability-args`      | args shape 不匹配                      | error   |

### 1.6 四个设计师已发布 hostContract

```typescript
// flow-designer-renderers/src/designer-manifest.ts:497
export const designerHostContract: RendererHostContract = {
  family: 'designer', defaultVersion: '1.0',
  capabilityPublication: { mode: 'region-scoped', capableRegions: [...], transitiveInheritance: true },
  ...
};

// report-designer-renderers/src/report-designer-manifest.ts:523
export const reportDesignerHostContract: RendererHostContract = {
  family: 'report-designer', defaultVersion: '1.0', ...
};

// spreadsheet-renderers/src/spreadsheet-manifest.ts:55
export const spreadsheetHostContract: RendererHostContract = {
  family: 'spreadsheet', defaultVersion: '1.0', ...
};

// word-editor-renderers/src/word-editor-manifest.ts:210
export const wordEditorHostContract: RendererHostContract = {
  family: 'word-editor', defaultVersion: '1.0', ...
};
```

---

## 2. 缺口分析

### Gap 1: SCADA Editor 缺失 hostContract 声明

SCADA Editor (`flux-renderers-industrial/src/editor/`) 作为第五个 designer family，未显式声明 `hostContract`。其他四个 family 均已声明。

**影响**：SCADA Editor 的 host actions 无法通过编译器自动验证。

### Gap 2: 消费路径未统一固定

`resolveHostContractManifest()` 和 `resolveRendererAuthoringContract()` 已实现，但只有一个生产 consumer：

```typescript
// packages/nop-debugger/src/controller-component-inspector.ts:100
result.authoringContract = resolveRendererAuthoringContract(definition);
```

Schema 编辑器、文档导出工具、CI 校验工具尚未统一消费此路径。

### Gap 3: 缺少自动化 manifest 一致性检查工具

`docs/architecture/capability-projection-manifest.md` 的 "Loader And CI Use" 节定义了理想流程：

```
schema file → parse → resolve publishing owner nodes by renderer type
→ read family + default version selector + resolveManifest(...)
→ apply optional xui:version override on owner node
→ resolve one concrete manifest bundle
→ validate actions against manifest contracts
→ compile final execution schema
```

但目前没有独立的 CLI 工具或 CI 集成来执行此流程。

### Gap 4: projection-path 验证尚未实现

manifest 文档明确定义 projection-path 验证作为后续 slice：

> `unknown-host-projection-field` 和 `invalid-host-projection-path` 属于 later projection-attribution slice

编译器当前只做了 action validation（方法存在性 + args shape），未验证 `${expr}` 中的 host projection path（如 `${activeNode.id}` 中 `activeNode` 是否在 manifest projection fields 中声明）。

### Gap 5: 缺少 manifest 演化工具

版本选择器 (`xui:version`)、deprecated 标记、`replacedBy` 映射已定义在类型中，但缺少：

- manifest diff 工具（两个版本之间的 breaking change 检测）
- migration guide 自动生成
- schema fragment 版本兼容性批量检查

---

## 3. 建议实施路径

| 阶段    | 内容                                                                                        | 依赖                                |
| ------- | ------------------------------------------------------------------------------------------- | ----------------------------------- |
| Phase 1 | 补充 SCADA Editor hostContract 声明                                                         | 无                                  |
| Phase 2 | 将 schema 编辑器、nop-debugger、CI 校验统一接入 `resolveRendererAuthoringContract()`        | 无                                  |
| Phase 3 | 实现 standalone manifest validation CLI (`pnpm validate:host-contract <schema-file>`)       | Phase 2                             |
| Phase 4 | 实现 projection-path 编译器验证（需 capability publication attribution 在编译器中完全可用） | 编译器 publication attribution 完成 |
| Phase 5 | manifest diff + migration tool                                                              | Phase 3                             |
