# 维度02：模块职责与文件边界（初审，待复核）

## 超过 500 行的关键非测试源文件

### P1 级 (3项)

1. **spreadsheet-toolbar.tsx** (608行) — 40+ props 巨型组件，需拆分子组件
2. **api-data-source-controller.ts** (531行) — runRequest 单函数 259 行异步状态机
3. **field-utils.tsx** (502行) — 万能桶混合 6 种关注点（验证、值绑定、展示、处理器、适配、控制器）

### P2 级 (6项)

4. **schema-compiler.ts** (633行) — compileSingleNode 单函数 326 行
5. **runtime-factory.ts** (539行) — 装配层方法过多
6. **reaction-runtime.ts** (506行) — 可提取 reaction-registry.ts
7. **form-runtime.ts** (503行) — 方法组可提取
8. **3个超700行测试文件** — schema-compiler-registry.test.ts (746), schema-compiler-shape-validation.test.ts (744), schema-renderer-runtime-core.test.tsx (742)

### P3 级 (2项)

9. **parser.ts** (532行) — 内聚递归下降解析器，无需拆分
10. **report-designer-demo.tsx** (502行) — playground 页面

## index.ts 入口文件检查

所有 index.ts 均为纯 re-export，无实现逻辑泄露。

## 目录结构

整体合理。flux-runtime 和 flux-compiler 已充分拆分。主要问题集中在个别文件内部职责混合。
