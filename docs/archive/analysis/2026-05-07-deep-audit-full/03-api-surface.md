# 03 API Surface

- 深挖轮次: 3
- 深挖发现数: 6
- 维度复核: 4 保留 / 2 降级 / 0 驳回
- 子项复核: 已完成高风险公开契约条目复核

## 第 1 轮初审

- `report-designer-renderers` 根入口漏导出 `createReportDesignerActionProvider`
- `flow-designer-core/src/core-shell-commands.ts` 为未接线重复实现

## 深挖第 2 轮追加

- `spreadsheet` / `report-designer` host action provider 的 `listMethods()` 返回空数组，与 manifest 不一致
- `flow-designer/api.md` 文档化 bridge contract 无可导入 API 对应

## 深挖第 3 轮追加

- `flow-designer` host projection 字段 `gridVisible` 与 live `gridEnabled` 不一致
- `flow-designer/api.md` 的公开 action 名与 payload 形状与 provider/manifest 漂移

## 维度复核结论

保留:

- `report-designer-renderers` 根入口漏导出 action provider
- provider `listMethods()` 与 manifest 脱节
- `gridVisible` vs `gridEnabled`
- `flow-designer/api.md` action/payload 漂移

降级:

- `core-shell-commands.ts` 更适合作为死代码/重复实现问题处理
- 文档化 bridge contract 无导出 API，更像文档定位与 surface 选择问题

## 子项复核结论

成立:

- `gridVisible` vs `gridEnabled`
- `flow-designer/api.md` action/payload 漂移

## 最终保留项

### [维度03] Flow Designer manifest 与 live host projection 的网格字段名漂移

- **文件**: `packages/flow-designer-renderers/src/designer-manifest.ts`, `packages/flow-designer-renderers/src/designer-context.ts`, `packages/flow-designer-renderers/src/designer-toolbar.tsx`
- **严重程度**: P1
- **现状**: manifest 对外声明 `runtime.gridVisible`，而 live docs、toolbar、context、playground schema 都使用 `gridEnabled`
- **风险**: host projection、authoring tooling、debugger 对同一字段的契约理解分裂
- **建议**: 将 manifest 与 live code/docs 收敛到单一字段名
- **复核状态**: 子项复核通过

### [维度03] `flow-designer/api.md` 的公开 action 名与 payload 形状已与 live provider/manifest 漂移

- **文件**: `docs/architecture/flow-designer/api.md`, `packages/flow-designer-renderers/src/designer-action-provider.ts`, `packages/flow-designer-renderers/src/designer-manifest.ts`
- **严重程度**: P1
- **现状**: 文档中的 `moveNodes`/`update*Data`/`updateMultipleNodes` payload 命名与 live 实现不一致，且仍列出 `openInspector`/`autoLayout` 等当前未提供方法
- **风险**: 对外 action surface 被文档错误指导，直接误导 schema/tooling/集成代码
- **建议**: 逐项对齐 action 名、payload 名、返回值，并区分 current vs target 文档
- **复核状态**: 子项复核通过

### [维度03] `report-designer-renderers` 根入口漏导出 live host action provider

- **文件**: `packages/report-designer-renderers/src/index.ts`
- **严重程度**: P2
- **现状**: 包内存在 `createReportDesignerActionProvider`，但根入口未导出
- **风险**: 外部宿主只能绕过 root surface 直接导入内部模块，扩大私有耦合
- **建议**: 补 root export，并与同族 `spreadsheet-renderers` 对齐
- **复核状态**: 维度复核通过
