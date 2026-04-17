# 15 安全与性能红线

- Task ID: `ses_2690a2ef2ffe08deH13Df3wUC4`
- Source prompt: `docs/skills/deep-audit-prompts.md`

## 安全违规

未发现需要报告的问题。

## 性能违规

### [维度15] 表单错误 hooks 仍使用全量 store 广播订阅
- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-react\src\hooks.ts:165-202`
- **严重程度**: P1
- **类别**: 性能
- **规则编号**: P7
- **现状**: `useCurrentFormErrors` 和 `useCurrentFormError` 无论查询是否已收敛到字段路径，仍通过 `form?.store.subscribe` 订阅整个表单 store。
- **风险**: 大表单中单字段变更会唤醒无关错误订阅者，退化为全量广播，放大渲染和 selector 成本。
- **建议**: 对字段级错误查询改走 `store.subscribeToPath(path, listener)`，仅保留真正表单级错误汇总使用全量订阅。
- **参考文档**: `docs/architecture/performance-design-requirements.md`

### [维度15] Report Designer 共享 document 在 store 内被原位修改
- **文件**: `C:\can\nop\nop-chaos-flux\packages\report-designer-core\src\core-dispatch.ts:83-145`, `C:\can\nop\nop-chaos-flux\packages\report-designer-core\src\runtime\metadata.ts:44-145`, `C:\can\nop\nop-chaos-flux\packages\report-designer-core\src\runtime\metadata.ts:152-185`
- **严重程度**: P2
- **类别**: 性能
- **规则编号**: P3
- **现状**: `dispatchReportDesignerCommand` 直接把 store 中的 `document` 传入 `writeMetadata` / `applyFieldDrop`，后者通过属性赋值、`push`、`splice`、`??=` 等方式原位修改共享状态。
- **风险**: 会破坏基于引用的变更检测和选择器稳定性，使后续 memo、浅比较、细粒度订阅难以可靠工作，并增加隐性渲染/同步问题。
- **建议**: 将 metadata/drop 更新改为 immutable update，返回新的 `document` 与受影响子容器，并在 `store.setState` 时显式替换 `document` 引用。
- **参考文档**: `docs/architecture/performance-design-requirements.md`
