# 维度 12：表单字段与 Slot 建模（初审）

## 发现（全部 P3，文档覆盖率缺口）

### F1: flux-runtime-module-boundaries.md 遗漏多个 form-runtime-* 文件
- form-runtime-owner-lifecycle.ts, form-runtime-owner-external-errors.ts, form-runtime-owner-field-states.ts, form-runtime-derived-state.ts, form-runtime-state.ts, form-runtime-array.ts 未被记录

### F2: form-runtime-owner.ts 描述过时
- 文档说负责 "owner-local validation orchestration"，但职责已拆分子模块

### F3: schema-compiler/ 子目录遗漏多个文件
- authoring-transform.ts, symbol-helpers.ts, static-analysis.ts, shape-validation-utils.ts, shape-validation-rules.ts 未被记录

### F4: async-data/ 目录遗漏多个文件
- source-executor.ts, reaction-runtime-helpers.ts, formula-data-source-controller.ts 等 7 个文件未记录

## 积极发现

- SchemaFieldKind value-or-region/event/ignored 分类正确实现 ✓
- 参数化 regions (params) 和 isolate 字段实现正确 ✓
- select/radio-group/checkbox-group allowSource 模式一致 ✓
- form 渲染器 event 分类正确区分管道入口与后置通知 ✓

## 复核状态: 未复核
