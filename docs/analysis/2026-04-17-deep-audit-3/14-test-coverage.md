# 维度 14：测试覆盖与质量

## 测试覆盖统计表

| 包名                         | 源代码行数 | 测试文件数 | 测试代码行数 | 测试/源代码比率 |
| ---------------------------- | ---------- | ---------- | ------------ | --------------- |
| flux-runtime                 | 11,647     | 46         | 11,957       | 102.7%          |
| flux-renderers-form-advanced | 5,021      | 33         | 7,421        | 147.8%          |
| flux-formula                 | 2,431      | 10         | 914          | 37.6%           |
| nop-debugger                 | 4,858      | 11         | 3,159        | 65.0%           |
| flow-designer-core           | 2,668      | 8          | 1,945        | 72.9%           |
| flow-designer-renderers      | 4,225      | 7          | 1,956        | 46.3%           |
| flux-react                   | 3,386      | 12         | 1,630        | 48.1%           |
| spreadsheet-core             | 3,175      | 8          | 1,811        | 57.1%           |
| report-designer-core         | 2,306      | 6          | 1,313        | 56.9%           |
| report-designer-renderers    | 1,944      | 8          | 1,680        | 86.4%           |
| word-editor-core             | 1,237      | 11         | 2,187        | 176.8%          |
| word-editor-renderers        | 3,218      | 9          | 883          | 27.4%           |
| flux-renderers-form          | 1,235      | 9          | 1,635        | 132.4%          |
| flux-renderers-data          | 2,238      | 6          | 714          | 31.9%           |
| flux-renderers-basic         | 1,383      | 5          | 347          | 25.1%           |
| flux-code-editor             | 2,186      | 5          | 717          | 32.8%           |
| spreadsheet-renderers        | 2,851      | 4          | 721          | 25.3%           |
| flux-core                    | 2,960      | 8          | 422          | 14.3%           |
| ui                           | 7,274      | 2          | 200          | 2.7%            |
| flux-i18n                    | 724        | 0          | 0            | 0%              |
| tailwind-preset              | 90         | 0          | 0            | 0%              |
| theme-tokens                 | 1          | 0          | 0            | 0%              |

---

## 无测试的包

| 包名            | 源代码行数 | 风险评估                    |
| --------------- | ---------- | --------------------------- |
| flux-i18n       | 724        | P3 - 封装 i18next，逻辑简单 |
| tailwind-preset | 90         | P3 - 纯配置文件             |
| theme-tokens    | 1          | P3 - 仅 CSS re-export       |

---

## 覆盖缺口

### [维度14-1] flux-core 工具函数测试覆盖不足

- **严重程度**: P2
- **现状**: 测试/源代码比率仅 14.3%
- **建议**: 为核心工具函数补充测试

### [维度14-2] ui 包测试覆盖极低

- **严重程度**: P2
- **现状**: 测试/源代码比率仅 2.7%
- **建议**: 对关键交互组件补充 RTL 测试

### [维度14-3] flux-formula compile.ts 无直接测试

- **严重程度**: P2
- **现状**: 表达式编译器核心模块无对应测试文件
- **建议**: 为 import 重写逻辑、模板编译逻辑补充单元测试

### [维度14-4] flux-runtime action-runtime 无直接单元测试

- **严重程度**: P2
- **现状**: 三个核心文件仅通过集成测试间接覆盖
- **建议**: 为 debounce、retry、timeout 逻辑补充隔离单元测试

### [维度14-6] schema-compiler 子模块测试薄弱

- **严重程度**: P2
- **现状**: 9 个子模块无独立测试
- **建议**: 为 shape-validation.ts、host-action-validation.ts 补充边界测试

---

## 良好实践

1. **flux-runtime 测试/源代码比率超过 100%**
2. **flux-renderers-form-advanced 测试比率 147.8%**
3. **E2E 测试覆盖了主要用户场景** (22 个 spec 文件)
4. **Bug 修复有对应的回归测试**
