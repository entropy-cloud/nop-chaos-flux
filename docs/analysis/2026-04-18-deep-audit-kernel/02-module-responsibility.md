# 维度02：模块职责与文件边界 — 初审报告

**审核日期**: 2026-04-18

---

## 超大文件清单

| 文件 | 行数 | 阈值 |
|------|------|------|
| data-source-runtime.ts | 696 | **需评估**（接近必须拆分） |
| shape-validation.ts | 596 | **需评估** |
| parser.ts | 510 | **需评估** |
| form-runtime-owner.ts | 496 | 临界 |
| form-runtime.ts | 498 | 临界 |
| runtime-factory.ts | 483 | 临界 |
| action-runtime-core.ts | 428 | 关注 |
| imports.ts | 413 | 关注 |
| reaction-runtime.ts | 402 | 关注 |
| hooks.ts | 430 | **需评估** |

## 关键发现

### [维度02-F1] data-source-runtime.ts 职责混合（696行）— P1
- 两个独立的状态机工厂 + 工具函数混合
- **建议**: 按 Controller 类型拆分为 3-4 个文件

### [维度02-F2] shape-validation.ts 职责偏重（596行）— P2
- schema key分类 + 诊断封装 + 字段验证 + host contract解析
- **建议**: 监控增长，超700行时拆分

### [维度02-F3] parser.ts 单类510行 — P3
- 解析器固有复杂度，无需拆分

### [维度02-F4] hooks.ts 聚合30+个hook（430行）— P2
- 表单hook模板代码重复
- **建议**: 提取表单hooks到独立文件

### [维度02-F5] form-runtime.ts/owner.ts 边界模糊 — P2
- setValue错误重建逻辑应迁入owner

### [维度02-F6] runtime-factory.ts 组装逻辑过长（483行）— P2
- 内联实现过长，工厂职责过重
- **建议**: 提取host projection、action配置

## 入口文件审计

| 包 | 入口行数 | 仅re-export | 问题 |
|---|---------|------------|------|
| flux-core | 36 | 是 | 干净 |
| flux-formula | 78 | 否（55行工厂函数） | 可接受 |
| flux-runtime | 18 | 是 | 干净 |
| flux-react | 62 | 是 | 干净 |

## 目录结构

- flux-runtime 顶层37个非测试文件：**需关注**，建议form-runtime-*移入form/子目录
- flux-react 顶层27个非测试文件：**需关注**

---

## 复核结论

| 发现 | 维度复核 | 子项复核 | 最终严重程度 |
|------|---------|---------|------------|
| F1: data-source-runtime.ts 696行职责混合 | **保留** | **成立**（行数确认，3个独立单元可拆分） | P1 |
| F2: shape-validation.ts 596行职责偏重 | **降级**（子目录内聚） | — | P3 |
| F3: parser.ts 510行单类 | **保留**（无需拆分） | — | N/A |
| F4: hooks.ts 26个hook聚合 | **保留** | **成立**（模板重复，可提取 useFormStoreSubscription） | P2 |
| F5: form-runtime.ts/owner.ts边界模糊 | **保留**（升级：3处重复错误重建逻辑） | **成立**（setValue/applyExternalErrors/executeSetValues 三处重复） | P2 |
| F6: runtime-factory.ts 483行工厂过重 | **保留** | **成立**（createHostProjectionScope 63行可提取） | P2 |
| 目录: flux-runtime 48个顶层文件 | **保留** | **成立**（18个form文件建议子目录化） | P2 |
| 目录: flux-react 30个顶层文件 | **保留** | — | P3 |
