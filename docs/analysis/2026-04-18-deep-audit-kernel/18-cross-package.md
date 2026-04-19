# 维度18：跨包模式一致性 — 初审报告

**审核日期**: 2026-04-18

## 发现

### [维度18-1] flux-code-editor 缺少标准注册函数 — P2
- **涉及包**: flux-code-editor vs 所有其他渲染器包
- **不一致**: 仅导出单个RendererDefinition，无registerCodeEditorRenderers()
- **建议**: 补充标准注册三件套

### [维度18-2] flow-designer-core/nop-debugger 不使用Zustand — P3
- **涉及包**: flow-designer-core/nop-debugger vs spreadsheet-core/report-designer-core
- **不一致**: 手动Set<listener> vs Zustand createStore
- **建议**: 可解释差异，无需统一

### [维度18-3] table/chart 渲染器fallback硬编码英文 — P2
- **涉及包**: flux-renderers-data
- **不一致**: 'No data' vs 其他包使用t()
- **建议**: 替换为t('table.empty')/t('chart.empty')

### [维度18-4] code-editor validation message拼接英文 — P2
- **涉及包**: flux-code-editor
- **不一致**: 模板字符串 vs 其他包使用createFieldValidation()+t()
- **建议**: 使用t()获取本地化消息

### [维度18-5] nop-debugger FILTER_LABELS硬编码英文 — P3
- **涉及包**: nop-debugger
- **不一致**: 同文件其他部分已使用t()
- **建议**: 替换为t()调用

### [维度18-6] console.warn前缀命名不一致 — P3
- **涉及包**: 跨多个包
- **不一致**: [TableRenderer] vs [source-resolvers] vs [flux-react]
- **建议**: 可保持现状

## 一致性确认

- 渲染器注册模式（除code-editor）✅
- Domain core/renderers分层 ✅
- Hook使用 ✅
- 事件处理 void props.events.xxx?.() ✅
- Store对外接口 getSnapshot()+subscribe() ✅

---

## 复核结论

| 发现 | 维度复核 | 子项复核 | 最终严重程度 |
|------|---------|---------|------------|
| F1: flux-code-editor 缺标准注册函数 | **保留** | **成立**（唯一缺少 register* 的渲染器包） | P2 |
| F2: flow-designer-core/nop-debugger 不用 Zustand | **保留** | —（可解释差异） | P3 |
| F3: table/chart/tree fallback 硬编码英文 | **保留** | **成立**（3处 + i18n key 已存在可直接替换） | P2 |
| F4: code-editor 验证消息英文 | **降级** | — | P3 |
| F5: nop-debugger FILTER_LABELS 英文 | **保留** | **成立**（同文件已用 t()，i18n key 已有45+） | P3 |
| F6: console.warn 前缀不一致 | **驳回** | — | — |
