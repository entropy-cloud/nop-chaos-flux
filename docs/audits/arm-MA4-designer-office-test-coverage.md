# MA4.3 — 设计器+办公 测试覆盖与 E2E 审计报告

> Plan: `docs/plans/2026-07-27-1202-3-ma43-designer-office-e2e-test-audit.md`
> Status: completed
> Date: 2026-07-27
> Scope: designer cluster (flow-designer-core + flow-designer-renderers, report-designer-core + report-designer-renderers, spreadsheet-core + spreadsheet-renderers, word-editor-core + word-editor-renderers, 170 files) + office cluster (word-editor etc., 133 files)
> Method: Per `unit-test-logic-and-contract-coverage-audit-prompt.md` — 3 轮子 agent 审计 + `exploratory-e2e-testing-prompt.md` — Playwright 探索性 E2E 测试（实验室 45 页面 + 领域 4 页面）

## 执行摘要

designer+office 包簇整体测试覆盖良好，核心路径（图操作、表单元数据、电子表格命令、文档 IO）已建立扎实的单元测试基础。关键缺口集中在 **manifest/host-contract 层**的解析函数和常量：3 个 renderer 包簇（report-designer, spreadsheet, word-editor）的 `resolveManifest()` 全部零测试。E2E 方面，Component Lab 45 页面零错误，Domain 页面中 taskflow-designer 有 3 个 action 错误（均为未配置 authoring model 导致的预期行为）。

## Phase 1 — 单元测试契约覆盖审计

### 包簇 1: flow-designer-core (9 测试文件, 2,445 行)

| 契约                                                                            | 状态               |
| ------------------------------------------------------------------------------- | ------------------ |
| `createDesignerCore`                                                            | ✅ 4 测试文件覆盖  |
| `normalizeConfig`                                                               | ✅ 间接覆盖        |
| `projectTree`                                                                   | ✅ 3 领域专用套件  |
| `layoutTreeWithElk` / `simpleTreeLayout`                                        | ✅ 完整覆盖        |
| `registerTreeDomainAdapter` / `getTreeDomainAdapter` / `listTreeDomainAdapters` | ✅ 完整覆盖        |
| `createDesignerStoreAdapter`                                                    | ❌ **零测试 — P1** |

### 包簇 2: flow-designer-renderers (28 测试文件, 6,808 行)

| 契约                                                                                 | 状态               |
| ------------------------------------------------------------------------------------ | ------------------ |
| Stable schema types + `defineDesignerPageSchema`                                     | ✅                 |
| `createDesignerActionProvider`                                                       | ✅ 多文件覆盖      |
| `flowDesignerRendererDefinitions` / `registerFlowDesignerRenderers`                  | ✅                 |
| Manifest constants: `FLOW_DESIGNER_MANIFEST_V1`                                      | ✅                 |
| `resolveDesignerManifest`, `designerHostContract`, `DESIGNER_CAPABILITY_PUBLICATION` | ❌ 零直接测试 (P2) |
| `DesignerCanvasContent`                                                              | ❌ 仅间接测试 (P2) |

### 包簇 3: report-designer-core (8 测试文件)

| 契约                                                                                            | 状态               |
| ----------------------------------------------------------------------------------------------- | ------------------ |
| Metadata CRUD (cell/row/column/sheet/range)                                                     | ✅ 完整覆盖        |
| `createReportDesignerCore` + dispatch                                                           | ✅ 全命令覆盖      |
| `createEmptyAdapterRegistry` / `createStaticFieldSourceProvider` / `createMetaPatchDropAdapter` | ✅                 |
| `isReportDesignerCommand`                                                                       | ❌ **零测试 — P0** |
| Readonly mode guard                                                                             | ❌ 无测试 — P1     |

### 包簇 4: report-designer-renderers (16 测试文件)

| 契约                                                                  | 状态                |
| --------------------------------------------------------------------- | ------------------- |
| Bridge layer (createReportDesignerBridge, deriveDesignerHostSnapshot) | ✅ 完整覆盖         |
| Host data projection (buildReportDesignerScopeData)                   | ✅ 12 个不同测试    |
| Host action provider                                                  | ✅ payload 验证完整 |
| `resolveReportDesignerManifest`                                       | ❌ **零测试 — P0**  |
| `REPORT_DESIGNER_CAPABILITY_PUBLICATION`                              | ❌ **零测试 — P0**  |
| `useReportDesignerHostScope`                                          | ❌ **零测试 — P0**  |
| `readReportFieldDragPayload`                                          | ❌ **零测试 — P0**  |

### 包簇 5: spreadsheet-core

| 契约                                                                                                | 状态                |
| --------------------------------------------------------------------------------------------------- | ------------------- |
| ~55 命令类型                                                                                        | ✅ 全 dispatch 测试 |
| 类型工具函数 (cellAddress, parseCellAddress 等)                                                     | ✅                  |
| `createDefaultSelection` / `createDefaultViewport` / `createDefaultHistory` / `createDefaultLayout` | ❌ 未测试 (P2)      |
| `mergeCellStyle` / `getCellsInRange` / `rangeIntersects`                                            | ❌ 未测试 (P2)      |

### 包簇 6: spreadsheet-renderers

| 契约                                                     | 状态                   |
| -------------------------------------------------------- | ---------------------- |
| Bridge / Action Provider                                 | ✅                     |
| `SheetTabBar` / `SpreadsheetToolbar` / `SpreadsheetGrid` | ✅                     |
| `resolveSpreadsheetManifest`                             | ❌ **零测试 — P1**     |
| `spreadsheetHostContract`                                | ❌ **无直接测试 — P1** |
| `SPREADSHEET_CAPABILITY_PUBLICATION`                     | ❌ 未验证 (P2)         |

### 包簇 7: word-editor-core (25 契约)

| 契约                                                                                                                 | 状态                          |
| -------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| `createEditorStore`                                                                                                  | ✅ 10 用例                    |
| `createDatasetStore`                                                                                                 | ✅ CRUD + column + validation |
| `document-io.ts` (save/load/capture)                                                                                 | ✅ 多用例                     |
| `normalizeWordDocument` / `normalizeDocCharts` / `normalizeDocCodes` / `normalizeDataset` / `normalizeDatasets`      | ❌ **零测试 — P1**            |
| `parseFieldReference` / `validateFieldReference` / `parseTemplate` / `extractFieldReferences` / `hasFieldReferences` | ❌ 零测试 (P2)                |

### 包簇 8: word-editor-renderers

| 契约                                 | 状态                   |
| ------------------------------------ | ---------------------- |
| Action provider                      | ✅ 13 用例             |
| 12 个子模块/组件                     | ✅ 完整覆盖            |
| `resolveWordEditorManifest`          | ❌ **零测试 — P1**     |
| `wordEditorHostContract`             | ❌ **无直接测试 — P1** |
| `WORD_EDITOR_CAPABILITY_PUBLICATION` | ❌ 未验证 (P2)         |

## P0/P1 发现汇总

### P0 发现 (5)

| ID         | 包簇                      | 契约                                     | 描述                                               |
| ---------- | ------------------------- | ---------------------------------------- | -------------------------------------------------- |
| MA43-P0-01 | report-designer-core      | `isReportDesignerCommand`                | 类型守卫函数零测试，消费者依赖其进行运行时命令路由 |
| MA43-P0-02 | report-designer-renderers | `resolveReportDesignerManifest`          | manifest 版本解析函数零测试                        |
| MA43-P0-03 | report-designer-renderers | `REPORT_DESIGNER_CAPABILITY_PUBLICATION` | 能力发布契约常量零测试                             |
| MA43-P0-04 | report-designer-renderers | `useReportDesignerHostScope`             | 公开 React hook 零测试                             |
| MA43-P0-05 | report-designer-renderers | `readReportFieldDragPayload`             | 拖放 payload 反序列化函数零测试                    |

### P1 发现 (10)

| ID         | 包簇                      | 契约                                                           | 描述                                                    |
| ---------- | ------------------------- | -------------------------------------------------------------- | ------------------------------------------------------- |
| MA43-P1-01 | flow-designer-core        | `createDesignerStoreAdapter`                                   | 顶层公开 API 零测试，是 Zustand 风格外部 store 集成关键 |
| MA43-P1-02 | report-designer-core      | `registerPreview`                                              | 注册方法无直接测试（兄弟方法已覆盖）                    |
| MA43-P1-03 | report-designer-core      | Readonly mode guard                                            | `readonly: true` 路径无测试                             |
| MA43-P1-04 | report-designer-renderers | `toReportDesignerActionResult`                                 | Error 规范化未直接测试                                  |
| MA43-P1-05 | report-designer-renderers | `createReportFieldDragPayload` / `writeReportFieldDragPayload` | Payload 构造/写入函数无直接单元测试                     |
| MA43-P1-06 | spreadsheet-renderers     | `resolveSpreadsheetManifest`                                   | 版本化 manifest 查找函数零测试                          |
| MA43-P1-07 | spreadsheet-renderers     | `spreadsheetHostContract`                                      | RendererHostContract 对象未直接验证                     |
| MA43-P1-08 | word-editor-core          | `normalizeWordDocument` 等 5 个函数                            | 数据完整性核心函数零测试                                |
| MA43-P1-09 | word-editor-renderers     | `resolveWordEditorManifest`                                    | 版本化 manifest 查找函数零测试                          |
| MA43-P1-10 | word-editor-renderers     | `wordEditorHostContract`                                       | RendererHostContract 对象未直接验证                     |

## Phase 2 — Playground 探索性 E2E 审计

### Component Lab 批量扫描

- **45 页面**：全部零 console.error / pageerror / debugger error
- 5 个交互 artifacts（input-number 类型约束 + 4 个 viewport 定位问题）——非 bug
- 详见 `docs/analysis/2026-07-27-ma43-designer-office-e2e-test-audit/05-e2e-lab-batch-scan.md`

### Domain 页面 E2E

| 页面              | console.errors | pageerrors | debugger errors | 通过 |
| ----------------- | -------------- | ---------- | --------------- | ---- |
| flow-designer     | 0              | 0          | 0               | ✅   |
| report-designer   | 0              | 0          | 0               | ✅   |
| word-editor       | 0              | 0          | 0               | ✅   |
| taskflow-designer | 0              | 0          | 3               | ⚠️   |

taskflow-designer 的 3 个 debugger error 均为 toolbar action 调用产生的预期行为（`import-json requires a valid nop-task JSON payload`, `No authoring model available`, `Already at root container`）——非回归缺陷，属于缺少初始配置状态下的正常错误路径。

详见 `docs/analysis/2026-07-27-ma43-designer-office-e2e-test-audit/04-e2e-domain-pages.md`

## 强覆盖区域

- **Flow designer core**: 图操作（add/update/delete/undo/redo）、tree projection（3 领域套件）、error fidelity、UI state
- **Report designer core**: 元数据 CRUD（cell/row/column/sheet/range 完整覆盖）、dispatch 全部 11 命令、adapter 注册/使用
- **Spreadsheet core**: ~55 命令全 dispatch 测试、类型工具函数
- **Word editor core**: editor store、dataset store（CRUD + validation）、document IO、dataset model、template tags
- **Word editor renderers**: 12 子模块/组件完整覆盖、action provider 13 用例、host scope integration 测试
- **E2E**: Component Lab 45 页面零错误、Domain 页面 3/4 零错误

## 弱覆盖区域

1. **manifest/host-contract 层系统性缺口**：3 个包簇（report-designer-renderers, spreadsheet-renderers, word-editor-renderers）的 `resolveManifest()` 全部零测试，`hostContract` 和 `CAPABILITY_PUBLICATION` 均缺乏直接验证
2. **报告导出孤函数**：report-designer-core 的 `isReportDesignerCommand`、report-designer-renderers 的 `readReportFieldDragPayload`、`useReportDesignerHostScope` 等暴露给消费者的函数无覆盖率
3. **Readonly mode**：report-designer-core 声明了 `readonly` 标志但守卫路径无测试
4. **word-editor-core normalize 函数**：5 个文档/数据集标准化函数零测试
5. **spreadsheet-core 默认工厂函数**：`createDefaultSelection` / `createDefaultViewport` / `createDefaultHistory` / `createDefaultLayout` 零测试

## test-global-leaks 检查

执行 `check:audit-test-global-leaks`：designer+office 包簇无确认的 test-global-leak。

## 附录：测试数据

| Package                   | Test Files | Total Lines |
| ------------------------- | ---------- | ----------- |
| flow-designer-core        | 9          | 2,445       |
| flow-designer-renderers   | 28         | 6,808       |
| report-designer-core      | 8          | ~2,500+     |
| report-designer-renderers | 16         | ~3,000+     |
| spreadsheet-core          | 7          | ~3,500+     |
| spreadsheet-renderers     | 20+        | ~4,000+     |
| word-editor-core          | 9          | ~2,000+     |
| word-editor-renderers     | 15         | ~3,000+     |
