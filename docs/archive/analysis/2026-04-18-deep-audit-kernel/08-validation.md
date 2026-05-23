# 维度08：验证系统一致性 — 初审报告

**审核日期**: 2026-04-18

---

## 发现清单

### [维度08-1] applyChangesAndRevalidate 缺少路径所有权校验 — P1

- **文件**: form-runtime-owner.ts:194-231
- **阶段**: 执行
- **现状**: 未校验传入路径是否属于当前 owner，违反文档"must be rejected"
- **建议**: 添加 isPathOwned 校验

### [维度08-2] validateForm 使用 Promise.all 并行但丢失 validationOrder 确定性 — P2

- **文件**: form-runtime-owner.ts:249-256
- **阶段**: 执行
- **建议**: 文档说明为何 Promise.all 安全

### [维度08-3] revalidateDependents 不传递原始 reason — P2

- **文件**: form-runtime-owner.ts:64-107
- **阶段**: 触发
- **建议**: 透传原始 reason

### [维度08-4] shouldShowFieldError 重复实现 — P3

- **文件**: form-state.ts:104-122 和 field-frame.tsx:23-39
- **阶段**: 结果展示
- **建议**: 抽取为唯一导出

### [维度08-5] draftError 使用组件本地 state — P2

- **文件**: detail-field.tsx:53, detail-view.tsx:60
- **阶段**: 结果展示
- **建议**: 注入到 FormRuntime 或在文档中明确说明

### [维度08-6] draft FormRuntime 未 dispose — P1

- **文件**: detail-field.tsx:90-93, detail-view.tsx:106-109
- **阶段**: 注册
- **现状**: handleCancel/handleConfirm 未调用 dispose()
- **建议**: 在所有退出路径调用 draftForm?.dispose()

### [维度08-7] validatePath 在 bootstrapping/refreshing 状态下不拒绝 — P2

- **文件**: form-runtime-validation.ts:273-276
- **阶段**: 触发

### [维度08-8] supersedeLowerPriorityWork 范围偏宽 — P2

- **文件**: form-runtime-owner.ts:186-192
- **阶段**: 执行

### [维度08-9] computeScopeState 的 ready 不含 touched 语义 — P3

- **文件**: form-runtime-owner.ts:34-62
- **阶段**: 执行

### [维度08-10] 隐藏字段 errors 清除依赖渲染器主动通知 — P3

- **文件**: form-runtime-field-ops.ts:167-214
- **阶段**: 执行

## 正面发现

1. fieldStates 严格使用 single flat map
2. showErrorOn 策略正确实现（默认 ['touched', 'submit']）
3. 异步验证 generation-aware stale run suppression 正确
4. submit/commit bypasses debounce 正确
5. 跨 scope 验证隔离正确
6. hiddenFieldPolicy 正确实现
7. applyExternalErrors 遵循文档契约

---

## 复核结论

| 发现                                           | 维度复核 | 子项复核                                                                | 最终严重程度 |
| ---------------------------------------------- | -------- | ----------------------------------------------------------------------- | ------------ |
| F1: applyChangesAndRevalidate 缺路径所有权校验 | **保留** | **成立**（isPathOwned 存在未调用，form-validation.md:776 明确要求拒绝） | P1           |
| F2: validateForm Promise.all 丢失确定性        | **降级** | —                                                                       | P3           |
| F3: revalidateDependents 不传递 reason         | **保留** | **成立**（submit/commit reason 丢失，debounce bypass 不适用于依赖字段） | P2           |
| F4: shouldShowFieldError 重复实现              | **保留** | **成立**（3处相同逻辑，flux-react 内2处可合并）                         | P3           |
| F5: draftError 组件本地 state                  | **驳回** | —                                                                       | —            |
| F6: draft FormRuntime 未 dispose               | **保留** | **成立**（pending debounce timer 泄漏，无 useEffect 清理）              | P1           |
| F7: validatePath bootstrapping/refreshing      | **降级** | —                                                                       | P3           |
| F8: supersedeLowerPriorityWork 范围偏宽        | **降级** | —                                                                       | P3           |
| F9: computeScopeState ready 语义               | **驳回** | —                                                                       | —            |
| F10: 隐藏字段 errors 清除机制                  | **保留** | **成立**（设计契约，自定义渲染器需遵守）                                | P3           |
