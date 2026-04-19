# 维度14：测试覆盖与质量 — 初审报告

**审核日期**: 2026-04-18

---

## 覆盖统计

| 包 | 实现文件 | 测试文件 | 测试/代码比 |
|---|---------|---------|-----------|
| flux-core | 32 | 8 | 0.16 |
| flux-formula | 12 | 10 | 0.41 |
| flux-runtime | 65 | 47 | 0.94 |
| flux-react | 33 | 14 | 0.50 |

## 关键发现

### [维度14-1] data-source-runtime.ts 无直接单元测试 — P1
- 696行核心模块仅通过集成测试覆盖
- **建议**: 为轮询调度、取消竞争添加单元测试

### [维度14-2] flux-core coverage include 模块缺测试 — P2
- path-binding.ts(123行)和instance-path.ts(13行)在coverage include中但无测试
- **建议**: 为path-binding.ts添加边界条件测试

### [维度14-3] schema-diagnostics/manifest.ts 无测试 — P2
- 281行诊断清单构建逻辑无测试
- **建议**: 添加 manifest.test.ts

### [维度14-4] compile.ts 无直接单元测试 — P2
- 439行核心编译器，仅通过 index.test.ts 间接覆盖
- **建议**: 补充 import 绑定重写的专项测试

### [维度14-5] form-runtime-performance.test.ts fake timers 隔离性 — P2
- 使用全局 afterEach 恢复而非 try/finally
- **建议**: 统一为 try/finally 模式

### [维度14-6] 测试 helper 内联而非共享 — P3
- owner-based-validation-contracts.test.ts 定义了 84 行 helper
- **建议**: 提取到 test-fixtures.ts

### [维度14-7] flux-react 核心渲染路径无独立测试 — P1
- node-renderer.tsx(366行)、render-nodes.tsx(314行)、hooks.ts(430行) 无独立测试
- **建议**: 为核心渲染路径添加测试

## 正面发现

- 测试框架一致（全部 Vitest）
- flux-runtime 测试密度最高（47文件）
- flux-formula 覆盖最好（70% 阈值）
- 隔离性良好（工厂函数创建独立实例）

---

## 复核结论

| 发现 | 维度复核 | 子项复核 | 最终严重程度 |
|------|---------|---------|------------|
| F1: data-source-runtime.ts 无单元测试 | **保留** | **成立**（696行，零测试引用） | P1 |
| F2: flux-core path-binding/instance-path 缺测试 | **保留** | **成立**（coverage include 列出无测试） | P2 |
| F3: schema-diagnostics/manifest.ts 无测试 | **保留** | **成立**（281行，零覆盖） | P2 |
| F4: compile.ts 无直接单元测试 | **降级** | — | P3 |
| F5: fake timers 隔离性 | **驳回** | — | — |
| F6: 测试 helper 内联 | **保留** | **成立**（3+文件重复 helper） | P3 |
| F7: flux-react 核心渲染路径无独立测试 | **降级** | — | P2 |
