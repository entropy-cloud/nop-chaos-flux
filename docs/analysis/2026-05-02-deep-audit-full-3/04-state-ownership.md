# 维度04：状态所有权与单一事实来源

## 维度复核结论

| 编号 | 初审 | 复核判定                                   |
| ---- | ---- | ------------------------------------------ |
| F01  | P2   | 保留 P2                                    |
| F02  | P2   | 保留 P2                                    |
| F03  | P3   | 保留 P3                                    |
| F04  | P3   | 降级（useState+ref 镜像是 React 标准模式） |
| F07  | P3   | 降级（transformIn 派生视图，有意设计）     |
| F08  | P3   | 保留 P3                                    |
| F09  | P3   | 降级（ref 是 sync cache，非独立事实源）    |

## 子项复核结论

| 编号 | 子项复核判定                                                                     |
| ---- | -------------------------------------------------------------------------------- |
| F01  | 降级 P2→P3（双写是有意设计，rowScope.update 不引起 record 变化，不存在循环覆盖） |
| F02  | 成立 P2（useState+useEffect 同步模式脆弱，scope 回写时可丢失编辑）               |

## 最终有效发现

### [维度04-F02] flow-designer treeDocument props-to-state 同步链

- **文件**: packages/flow-designer-renderers/src/designer-page.tsx:63-69
- **严重程度**: P2
- **复核状态**: 子项复核通过
- **现状**: useState+useEffect 同步模式，scope 回写时可覆盖内部编辑

### [维度04-F01] table-quick-edit-controller draftValue 与 rowScope 双写

- **文件**: packages/flux-renderers-data/src/table-renderer/table-quick-edit-controller.ts:26-38
- **严重程度**: P3（子项复核降级）
- **复核状态**: 子项复核通过
- **现状**: 双写是有意设计，不存在循环覆盖。仅外部数据刷新时可能丢失 draft。

### [维度04-F03] word-editor-page charts/codes 与 savedDocument.data 双存

- **文件**: packages/word-editor-renderers/src/word-editor-page.tsx:57-68
- **严重程度**: P3
- **复核状态**: 维度复核通过

### [维度04-F08] variant-field 多来源变体选择优先级覆盖风险

- **文件**: packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx:97-105
- **严重程度**: P3
- **复核状态**: 维度复核通过
