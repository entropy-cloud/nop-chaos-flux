# 维度12：表单字段与 Slot 建模

## 审核日期: 2026-04-20

## P2 发现（3 项）

### [P2] page/container header/footer 声明为纯 region，但 renderer 使用 resolveRendererSlotContent

- **文件**: `packages/flux-renderers-basic/src/index.tsx:46,56`
- **违规类别**: field-rule / value-or-region
- **现状**: `regions: ['body', 'header', 'footer']` 使 header/footer 成为纯 region。但 PageRenderer 和 ContainerRenderer 使用 `resolveRendererSlotContent(props, 'header')` 做 regions→props fallback，暗示设计意图是 value-or-region。传入字符串值时编译阶段抛错 `Region $.header must contain schema input`。
- **建议**: 在 fields 中显式声明 `{ key: 'header', kind: 'value-or-region', regionKey: 'header' }`，从 regions 数组移除。

### [P2] value-or-region 声明不完整（扩展扫描：共 14 处）

同类问题扫描从 2 处扩展到 **14 处**：

| 渲染器       | slot/区域            | 文件位置                                                        | 说明                                                             |
| ------------ | -------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------- |
| page         | header, footer       | `flux-renderers-basic/src/index.tsx:46`                         | 已记录                                                           |
| container    | header, footer       | `flux-renderers-basic/src/index.tsx:56`                         | 已记录                                                           |
| tabs         | toolbar              | `flux-renderers-basic/src/index.tsx`                            | 新增                                                             |
| form         | body, actions        | `flux-renderers-form/src/renderers/form.tsx`                    | 新增                                                             |
| crud         | toolbar, bulkActions | `flux-renderers-data/src/index.tsx`                             | 新增                                                             |
| detail-view  | viewer, content      | `flux-renderers-form-advanced/src/detail-view/detail-view.tsx`  | 新增                                                             |
| detail-field | viewer, content      | `flux-renderers-form-advanced/src/detail-view/detail-field.tsx` | 新增                                                             |
| object-field | body                 | `flux-renderers-form-advanced/src/object-field.tsx`             | 新增                                                             |
| table        | header, footer       | `flux-renderers-data/src/`                                      | **死代码** — 声明了但 renderer 未调用 resolveRendererSlotContent |

- **现状**: 这些 slot 使用 `resolveRendererSlotContent` 做 regions→props fallback，但声明为纯 region。table 的 header/footer 是死代码（声明了但未使用 resolveRendererSlotContent）。
- **建议**: 逐一审查，对实际使用 resolveRendererSlotContent 的 slot 改为 value-or-region 声明。移除 table header/footer 死代码声明。

### [P2] variant-field 手动 FieldFrame 绕过 wrap/frameWrap 机制

- **文件**: `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx:253-265`
- **违规类别**: field-frame
- **现状**: 未声明 `wrap: true`，手动创建 `<FieldFrame>`。导致 schema 的 `frameWrap: false` 无法控制 frame 行为。有技术约束（需要传 rootProps 如 `data-active-variant`）。
- **建议**: 扩展 NodeFrameWrapper 支持 rootProps，或接受当前实现并在文档中标注。

## P3 发现（2 项）

### [P2→P3] loop empty 作为纯 region

- **文件**: `packages/flux-renderers-basic/src/index.tsx:79`
- **现状**: LoopRenderer 直接读 `regions.empty`，不用 resolveRendererSlotContent。声明与实现一致（纯 region）。文档推荐 value-or-region 但当前不是 bug。
- **建议**: 功能增强建议，如需支持 `empty: "没有数据"` 简写时再改。

### [P2→P3] detail-view 有 label 但无 FieldFrame 集成

- **文件**: `packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx:248`
- **现状**: detail-view 不是 bound field（无 name），不需要 FieldFrame 的 error/touched 管理。手动 FieldLabel 足够。
- **建议**: 代码风格一致性建议，非功能缺陷。

## 驳回项

| 原始发现                            | 排除理由                                                                                                   |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| variant-field action 字段应为 event | `ignored` 是正确的：renderer 需要原始 action schema 注入自定义 args，event 类型会包装成 handler 丢失此能力 |
| page modalContainer 声明未使用      | 实际被 SchemaRenderer 层面读取使用（传给 page runtime/DialogHost）                                         |

## 正面评估

核心架构合规性约 90%：

- classifyField 五种来源精确分类（显式 fields > META_FIELDS > regions > 生命周期 > onXxx 正则）
- formLabelFieldRule 被 20+ 表单控件共享，label value-or-region 正确
- event 字段通过 eventPlans 通道传递并合成为 RendererEventHandler
- deep region extraction（table columns、tabs items）正确提取嵌套 region
- 18 个 `wrap: true` 渲染器通过 FieldFrame 统一获得 label/error/hint chrome
- 所有 parameterized region（tree node、array-field item、loop body）通过 bindings 正确合成
