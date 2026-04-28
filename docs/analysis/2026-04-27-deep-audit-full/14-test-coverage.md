# 维度 14：测试覆盖与质量

## 审核范围

评估每个包的测试覆盖完整性、测试文件质量、E2E 覆盖。

## 发现清单

### [维度14] ui 包测试覆盖极低（降级为 P2）

- **文件**: `packages/ui/src/`
- **严重程度**: P2
- **类别**: 覆盖缺口
- **现状**: ui 包有约 70 个组件但仅 6 个测试文件。初审标为 P1，但复核降级——ui 包本质是 shadcn/ui re-export，核心逻辑在 radix-ui 上游，自定义部分有限。
- **建议**: 为 ui 包中自定义添加的逻辑（如 Combobox、Empty 等非直接 re-export 组件）补充测试。
- **复核状态**: 维度复核通过，从 P1 降级为 P2

### [维度14] object-field.test.tsx 超过 700 行

- **文件**: `packages/flux-renderers-form-advanced/src/composite-field/object-field.test.tsx`
- **严重程度**: P2
- **类别**: 跨域
- **现状**: 755 行测试文件，包含渲染、验证、嵌套、联动等多领域测试。
- **建议**: 按领域拆分。
- **复核状态**: 维度复核通过

### [维度14] controller-inspect.test.ts 超过 700 行

- **文件**: `packages/nop-debugger/src/controller-inspect.test.ts`
- **严重程度**: P2
- **类别**: 跨域
- **现状**: 750 行调试器测试。
- **建议**: 按检查功能域拆分。
- **复核状态**: 维度复核通过

### [维度14] spreadsheet/flow-designer 测试覆盖缺口

- **文件**: `packages/spreadsheet-core/src/`, `packages/flow-designer-core/src/`
- **严重程度**: P2
- **类别**: 覆盖缺口
- **现状**: 这两个 domain core 包的测试覆盖相对薄弱，核心交互逻辑缺少充分测试。
- **建议**: 按优先级补充核心交互路径的单元测试。
- **复核状态**: 维度复核通过

### [维度14] 16 个测试文件超过 500 行

- **严重程度**: P2
- **类别**: 跨域
- **现状**: 16 个测试文件在 500-700 行范围，需评估拆分。
- **建议**: 逐文件评估职责边界，优先拆分职责混合的文件。
- **复核状态**: 维度复核通过

### 已驳回项

1. **form e2e 测试缺失（已驳回）** — 初审认为缺少 form e2e 测试，但复核发现 `tests/e2e/component-lab/simple-form.spec.ts` 等 20 个 spec 文件已覆盖表单场景。

## E2E 覆盖

`tests/e2e/` 目录下有约 20 个 spec 文件，覆盖基础渲染、表单交互、组件 lab 等场景。

## 总结评估

5 个 P2 保留（ui 包覆盖、2 个超大测试文件、domain core 覆盖缺口、16 个 500+ 行测试文件）。初审 P1（form e2e 缺失）已驳回。测试框架统一使用 Vitest ✓，mock 模式一致 ✓。
