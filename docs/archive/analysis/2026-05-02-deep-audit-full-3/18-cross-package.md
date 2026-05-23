# 维度18：跨包模式一致性（初审，待复核）

## 发现清单

### P1 级 (2项)

1. **CRUD 工具栏硬编码英文文本** — crud-renderer-toolbar.tsx:81,120（"Total"/"Page" 未走 i18n）
2. **CRUD 分页按钮使用语义错误的 i18n key** — crud-renderer-toolbar.tsx:118,126（collapse/expand 代替 previous/next）

### P3 级 (2项)

3. **console.warn 标签格式不一致** — form-advanced 内 kebab-case vs PascalCase 混用
4. **错误处理模式差异** — dynamic-renderer 展示 UI 错误 vs object-field 静默降级（有意差异）
