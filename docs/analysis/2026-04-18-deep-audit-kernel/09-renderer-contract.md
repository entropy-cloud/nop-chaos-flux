# 维度09：渲染器契约合规性 — 初审报告

**审核日期**: 2026-04-18

## 总体统计

41个渲染器中 **38个完全合规**，3个存在问题。

## 问题详情

### [维度09] CrudRenderer — B级
1. 内部区域使用 nop-* marker class (P2) — crud-renderer.tsx:217,223,229
2. 硬编码 $crud scope 写入绕过 statusPath (P2) — crud-renderer.tsx:155-159
3. 硬编码中文fallback '暂无数据' (P3) — crud-renderer.tsx:163,188

### [维度09] VariantFieldRenderer — B级
1. 手动构建 nop-field 结构绕过 FieldFrame (P2) — variant-field.tsx:253-274

### [维度09] variant-field/detail-view/detail-field — B+级
1. RendererDefinition.component 使用 as any 类型转换 (P3) — variant-field.tsx:279, detail-view.tsx:278, detail-field.tsx:204

## 合规渲染器确认

- flux-renderers-basic: 16/16 ✅
- flux-renderers-form: 10/10 ✅
- flux-renderers-form-advanced: 8/10（variant-field问题）
- flux-renderers-data: 4/5（crud问题）

---

## 复核结论

| 发现 | 维度复核 | 子项复核 | 最终严重程度 |
|------|---------|---------|------------|
| CrudRenderer 内部区域 nop-* marker class | **驳回**（设计意图） | — | — |
| CrudRenderer 硬编码 $crud scope 写入 | **保留** | **成立**（无条件 scope.update('$crud')，与 statusPath 双写） | P2 |
| CrudRenderer 硬编码中文 fallback | **保留** | **成立**（2处 '暂无数据'，项目已有 t() 体系） | P3 |
| VariantField 手动构建 nop-field | **保留** | **成立**（用 div 代替 label，缺 required/validating/description） | P2 |
| variant-field/detail-view/detail-field as any | **保留** | **成立**（3处相同模式，函数参数逆变） | P3 |
