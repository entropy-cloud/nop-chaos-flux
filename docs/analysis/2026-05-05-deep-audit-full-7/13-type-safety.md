# 维度 13：类型安全与动态边界

## 第1轮初审

### [维度13] Word Editor 保存路径用 `{} as any` 绕过 `ActionContext` 必填契约

- **文件**: `packages/word-editor-renderers/src/word-editor-page.tsx:219-227`
- **严重程度**: P1
- **分类**: 危险
- **现状**: `actionProvider.invoke('save', undefined, {} as any)` 直接跳过完整 `ActionContext` 契约。
- **真实风险**: `saveEvent` 若依赖 `runtime/scope/actionScope/signal` 等字段，运行时才会暴露失败。
- **建议**: 构造真实上下文或收紧 provider/save helper 签名，不要用 `{} as any` 补洞。

### [维度13] Report Inspector 的 `body` 类型过窄，迫使壳层用 `props as any` 转发

- **文件**: `packages/report-designer-renderers/src/inspector-shell-renderer.tsx:54-57`
- **严重程度**: P2
- **分类**: 可疑
- **现状**: 内部已有更精确的 `SchemaInput`，但桥接仍用 `props as any`。
- **真实风险**: body 契约被从类型系统中抹掉，后续错误 shape 只能在运行时暴露。
- **建议**: 将 `body` 收敛到 `SchemaInput` 并显式构造 props。

## 深挖第2轮追加

### [维度13] detail-view 外部错误写入把不存在的 `'custom'` 规则伪装成合法类型

- **文件**: `packages/flux-renderers-form-advanced/src/detail-view/value-adaptation-helper.ts:102-110`
- **严重程度**: P1
- **分类**: 危险
- **现状**: `rule: 'custom' as any` 把非法规则名写入 validation 契约。
- **真实风险**: 下游按 rule 聚合/筛选时会收到不在契约内的值。
- **建议**: 映射到已有合法 rule，或正式扩展 Validation 契约。

### [维度13] spreadsheet 交互返回值把精确推导出的 `currentCell` 再次降级为 `any`

- **文件**: `packages/spreadsheet-renderers/src/use-spreadsheet-interactions.ts:289-369`
- **严重程度**: P2
- **分类**: 可疑
- **现状**: `currentCell` 已有精确类型，返回时却 `as any`。
- **建议**: 直接保持精确类型并复用 `CellDocument | undefined`。

## 深挖第4轮追加

### [维度13] `runtime-factory` 用 `ctx as ActionContext` 把可选上下文伪装成必填上下文

- **文件**: `packages/flux-runtime/src/runtime-factory.ts:536-537`
- **严重程度**: P1
- **分类**: 危险
- **现状**: 上游多处传 `Partial<ActionContext> | undefined`，最后一跳直接断言为完整 `ActionContext`。
- **真实风险**: 缺失 `runtime/scope/actionScope/signal` 时只能在 action-core 里运行时爆炸。
- **建议**: 在 helper 边界统一补齐必需字段，或拆分 Partial/Full 两个 API。

### [维度13] detail-view 适配动作入口先把 `ValueAdaptationAction` 降成 `unknown`，再用 `as any` 派发

- **文件**: `packages/flux-renderers-form-advanced/src/detail-view/detail-draft-controller.ts:63-79`
- **严重程度**: P2
- **分类**: 可疑
- **现状**: 同一子系统已有精确 `ValueAdaptationAction` 类型，桥接函数仍用 `unknown -> any`。
- **建议**: 将参数直接收紧到 `ValueAdaptationAction`。

## 深挖统计

- 第1轮发现数：2
- 第2轮新增：2
- 第3轮新增：0
- 第4轮新增：2

## 维度复核结论

- 初审与深挖共 6 项，独立复核后保留 3 项、降级 3 项。
- 最终保留项集中在真实类型越界和把 `Partial<ActionContext>` 强装成完整上下文的危险边界。

## 子项复核结论

- `[维度13] Word Editor 保存路径用 {} as any 绕过 ActionContext 必填契约`: 降级。`saveEvent` 当前签名本身就是 `ctx?: Partial<ActionContext>`，更像接口对齐不严的类型债。
- `[维度13] Report Inspector 的 body 类型过窄，迫使壳层用 props as any 转发`: 保留。`ReportInspectorSchema.body` 过窄，导致壳层必须抹掉类型再传 `resolvedSchema`，真实破坏静态契约。
- `[维度13] detail-view 外部错误写入把不存在的 'custom' 规则伪装成合法类型`: 保留。`ValidationError.rule` 不允许 `custom`，却被真实写入并已有测试固化。
- `[维度13] spreadsheet 交互返回值把精确推导出的 currentCell 再次降级为 any`: 降级。更多是实现层偷懒/推导未打通，风险偏维护性而非明确功能性缺陷。
- `[维度13] runtime-factory 用 ctx as ActionContext 把可选上下文伪装成必填上下文`: 保留。上游显式接收 `Partial<ActionContext>`，最后却不补齐必填字段直接强转为完整上下文。
- `[维度13] detail-view 适配动作入口先把 ValueAdaptationAction 降成 unknown，再用 as any 派发`: 降级。类型保护被削弱属实，但当前更像局部桥接层可维护性问题。
