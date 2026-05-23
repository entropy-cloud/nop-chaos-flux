# 维度05：响应式订阅精度

## 维度复核结论

| 编号 | 初审 | 复核    | 说明                                                  |
| ---- | ---- | ------- | ----------------------------------------------------- |
| F01  | P2   | 保留 P2 | 返回值被丢弃，强制父组件重渲染                        |
| F02  | P2   | 保留 P2 | 三条独立 per-path 订阅确认属实                        |
| F03  | P2   | 保留 P2 | per-path 无法感知 requiredWhen 依赖字段变更，真实 bug |
| F04  | P3   | 保留 P3 | inline fallback 闭包未记忆化                          |
| F05  | P3   | 保留 P3 | args 导致 selector 不稳定                             |
| F06  | P3   | 驳回    | 调试组件全量订阅是设计需求                            |
| F07  | P3   | 保留 P3 | 全量 snapshot 触发多余 useEffect                      |

## 最终有效发现

### [维度05-F01] useSurfaceScopeSnapshot 订阅全量 scope 但丢弃结果 (P2)

- **文件**: packages/flux-react/src/dialog-host-surface.tsx:50-73
- **复核状态**: 维度复核通过

### [维度05-F02] useFieldPresentation 每个字段三条 per-path 订阅 (P2)

- **文件**: packages/flux-renderers-form/src/field-utils.tsx:306-349
- **复核状态**: 维度复核通过

### [维度05-F03] requiredWhen 跨字段依赖无法被 per-path 感知 (P2)

- **文件**: packages/flux-react/src/form-state.ts:97-121
- **复核状态**: 维度复核通过 — 真实 bug

### [维度05-F04] DialogHost subscribe/getSnapshot 未记忆化 (P3)

### [维度05-F05] useFormErrorStoreSelector selector 不稳定 (P3)

### [维度05-F07] ReportDesignerPageRenderer useEffect 依赖全量 snapshot (P3)
