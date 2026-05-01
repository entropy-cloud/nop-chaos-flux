# 维度 08：验证系统一致性（初审）

## 总体评估

验证实现与 form-validation.md 中定义的架构契约**高度一致**。七个审核维度中未发现严重违规。

## 发现

### [维度08-F1] 额外 isTouched 门控的 change 验证（低）
- **文件**: `packages/flux-renderers-form/src/field-utils.tsx:135`
- **现状**: 在 triggers: ['change'] 之上增加未记录的 isTouched 检查
- **影响**: 性能优化但未文档化的隐式行为

### [维度08-F2] 非表单范围的 effectiveRequired（中）
- **文件**: `packages/flux-renderers-form/src/field-utils.tsx:436-454`
- **现状**: currentForm 未定义时回退到 Boolean(options?.required)，未检查 requiredWhen/requiredUnless
- **影响**: ValidationScopeRuntime 支持的字段不显示动态必填星号

## 确认的架构约束（全部合规）

1. 验证由 runtime 拥有，非 React ✓
2. 扁平 fieldStates 单映射 ✓
3. 生成感知的 stale run suppression（三层） ✓
4. showErrorOn 显示/执行分离 ✓
5. 编译时优先 ✓
6. 子 owner 独立性 ✓
7. submit 取代低优先级工作 ✓
8. 规则执行收集所有（无首错短路） ✓
9. 隐藏字段清理 ✓
10. 跨 scope 验证独立性 ✓

## 复核状态: 未复核
