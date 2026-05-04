# 维度 02：模块职责与文件边界

## 复核状态：零发现确认

### 基线

`pnpm check:oversized-code-files` 输出：0 个错误（>700行），42 个警告（500-700行）。

### 500+ 行非测试源码文件分析

| 文件                                                   | 行数 | 判定                                     |
| ------------------------------------------------------ | ---- | ---------------------------------------- |
| flux-compiler/src/schema-compiler.ts                   | 633  | Orchestrator（大量 import 子模块并组装） |
| flow-designer-renderers/.../designer-xyflow-canvas.tsx | 577  | Widget renderer（自封闭 canvas adapter） |
| flux-runtime/src/runtime-factory.ts                    | 541  | Orchestrator（文档明确允许）             |
| flux-formula/src/parser.ts                             | 532  | 单职责算法（递归下降解析器）             |
| word-editor-renderers/src/word-editor-page.tsx         | 530  | Page orchestrator（子组件已提取）        |
| flow-designer-renderers/src/designer-page.tsx          | 522  | Page orchestrator                        |
| flux-runtime/src/form-runtime.ts                       | 512  | Orchestrator（文档明确记载）             |
| flux-runtime/src/async-data/reaction-runtime.ts        | 506  | 单一域运行时模块                         |
| flux-react/src/hooks.ts                                | 505  | Hooks 集合（thin adapters，无耦合）      |

### 结论

所有文件按 Calibration Pattern #1 ("file size alone does not prove mixed ownership") downgrade 或 reject。无一文件满足"需要拆分"的条件。入口文件全部为纯 re-export。
