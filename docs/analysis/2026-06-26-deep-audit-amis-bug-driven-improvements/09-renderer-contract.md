# 维度 09：渲染器契约合规性

## 第 1 轮（初审）

### [维度09-01] CRUD carrier 运行期重读 props.schema 违反 compile-once

- **文件**: `packages/flux-renderers-data/src/crud-renderer.tsx:449-476`
- **证据片段**:
  ```ts
  449: const rawSchema = props.schema;
  460: item: rawSchema.item,
  469: card: rawSchema.card,
  476: props.helpers.render(carrierSchema, ...)
  ```
- **严重程度**: P1
- **现状**: crud-renderer-definition 已把 card/item 声明为 region（编译期生成 props.regions.card/item 句柄），但渲染器忽略句柄，回退读 props.schema 原始片段，拼合成 list/cards schema 再 helpers.render 触发 carrier 重编译。
- **风险**: 核心契约漂移（compile-once）；每分页/选择变化重编译；keyed-remount workaround 掩盖。
- **建议**: 用 props.regions.item.render 消费预编译 region，删 carrier 重编译与 remount workaround。
- **误报排除**: 非 type annotation/normalize/test——真实参与运行期渲染输出；**tests**/crud-item-card-compile-contract.test.ts 显式锁定此 residual 边界。
- **复核状态**: 维度复核通过（保留 P1）。与维度 03-01 同源 → AUDIT-02。

### [维度09-02] CRUD→TableRenderer 跨 schema as unknown as cast 链

- **文件**: `packages/flux-renderers-data/src/crud-renderer.tsx:363,376-381,389`
- **证据片段**:
  ```ts
  363: const tableEvents = props.events as unknown as RendererComponentProps<TableSchema>['events'];
  377: props.templateNode as unknown as RendererComponentProps<TableSchema>['templateNode'],
  381: } as unknown as RendererComponentProps<TableSchema>['node'],
  ```
- **严重程度**: P2（初审）→ P1（跨维度合并后保留 P1，见 AUDIT-03）
- **现状**: CRUD 把 CrudSchema templateNode/node/events 整体 as unknown as 成 TableSchema 形态注入 `<TableRenderer>`。regions 单 as 证明可区分兼容字段。
- **风险**: TableRenderer 今后读 TableSchema 专属字段时 TS 不报错，运行期静默拿 CrudSchema 形态数据。
- **建议**: 引入 delegateRendererProps<Src,Dst> 显式类型 delegation，或抽 loose-props 内部函数。
- **误报排除**: 非低代码弱类型边界——两个已强类型化 RendererComponentProps<S> 间的强制转码。
- **复核状态**: 维度复核修正——非"全仓唯一处 as unknown as"（renderer src 共 ~16 处），真正独特是"合成完整 RendererComponentProps 调用 sibling renderer"。与 03-02、13-01 同源 → AUDIT-03。

### [维度09-03] 内部 region nop-\* 类名与 data-slot 双轨

- **严重程度**: 驳回
- **复核理由**: 引用了不存在的文件 `markdown-editor-renderer.tsx`；且 AGENTS.md 明确同时允许 `nop-*` flux 语义 marker **和** shadcn `data-slot`——两者共存是文档化的既定设计，非 marker 协议漂移。误读了 styling 契约。

### [维度09-04] variant-field 直接用 FieldFrame

- **严重程度**: 驳回（suspect false positive）
- **复核理由**: variant-field 是自管壳层的复合字段，RendererDefinition 未声明 wrap，自己根据 schema frameWrap 条件性套 FieldFrame。frameWrap='none' 时渲染器自管 root（发 nop-variant-field + data-testid/cid），frameWrap='label'/'group' 时把 chrome 委托 FieldFrame。testid/cid 归属符合 renderer-runtime.md 契约。命中 calibration pattern #9（downgrade）。`fieldframe-bypass` suspect 未区分"自动 wrap 内非法绕过"与"自管壳层条件性复用"。

### [维度09-05] button-group value 属性名暗示受控但仅作 seed

- **严重程度**: 驳回
- **复核理由**: `button-group-renderer.tsx:40-41` 有显式注释：`Selection is local controlled state. value/defaultValue are initial seeds only (read once here); runtime changes to value do NOT move the selection (non-reactive).` 发现代码描述的是已注释文档化的有意行为，当作潜在缺陷误报。

## 维度复核结论

- [09-01]: 保留 P1 → AUDIT-02（与 03-01 合并）。
- [09-02]: 保留 P1 → AUDIT-03（修正"唯一处"措辞；与 03-02、13-01 合并）。
- [09-03]: 驳回（引用不存在文件 + 误读双 marker 既定设计）。
- [09-04]: 驳回（pattern #9 自管壳层条件性 FieldFrame）。
- [09-05]: 驳回（文档化有意行为）。

## 最终保留项

| 编号  | 严重程度 | 文件                        | 摘要                                       |
| ----- | -------- | --------------------------- | ------------------------------------------ |
| 09-01 | P1       | `crud-renderer.tsx:449-476` | compile-once 违约（合并 AUDIT-02）         |
| 09-02 | P1       | `crud-renderer.tsx:363-389` | 跨 schema cast 合成 props（合并 AUDIT-03） |

无发现区域确认：标准 hooks 全部正确使用（215+ 处），零 ad-hoc React context，零 BEM，全用 cn()，零 templateNode.schema 运行期读取（除 CRUD 缺陷），root marker 完整（check:audit-missing-renderer-markers 零命中），regions.render() 键处理正确。
