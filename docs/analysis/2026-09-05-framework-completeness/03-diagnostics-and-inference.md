# source-location diagnostics 回溯链与编译期依赖推断

> 本文件分析 diagnostics 回溯链和编译期依赖推断两个 P1/P2 方向。

## 文档共识审查记录（本文件）

> 依据项目文档共识审查惯例，本文件定稿前须经独立子 agent（fresh session）反复审查直到共识（判据：连续一轮 0 新增修正项；≤3 轮，超限升级人工）。记录如下：

- **Round 1（2026-09-05，fresh session 独立子 agent，batch 1）**：判定 `REVISE`——0 Blocker / 1 Major（M-1）/ 1 Minor（m-1）/ 1 Nit。**M-1** final-model-invariant 优先级从 04-26 分析的 P1 降为 P2 且无理由说明——已修正为 P1 并对齐上游理由。**m-1** `xui:location` "整个代码库中零匹配" 措辞过宽——已修正为"TypeScript 源码中零实现"并补充 `schema-file-validator.md:737,742` 的既有定义引用。**n-1** §1.3 未引用既有架构文档对 `xui:location` 的定位——已补充。修正后全文复扫 0 新增。
- **Round 2（2026-09-05，fresh session 独立子 agent，batch 1 确认轮）**：判定 `AGREE`——三项修正全部真实落地（M-1: §1.5 引用 04-26 §1 确认 P1；m-1: 行 21 措辞准确；n-1: §1.5 补充既有文档关系），0 新增修正项。**达成共识**（共识循环：R1 修正 1 轮 + R2 确认轮，未超轮次上限）。

---

## 1. source-location diagnostics 回溯链

### 1.1 现状

当前 schema 节点支持 `testid` 用于测试断言，但缺少从 authoring source → compiled path → runtime instance 的完整定位链。

- `testid` 用于测试定位，不是 source location
- `xui:version` 用于 manifest 版本选择
- `xui:location` 在 TypeScript 源码中 **零实现**（`docs/architecture/schema-file-validator.md:737,742` 已将其定位为"Loader 或预编译步骤填充的可选字段"，但编译器基线尚未读取该字段）

### 1.2 缺口

**核心缺口**：schema 节点缺少可选的 source location 元数据，导致：

1. 编译器报错只能指向 JSON path（如 `$.items[0].children[2]`），无法指向原始 authoring 文件的行列
2. 运行时错误无法回溯到 schema 的编写位置
3. 调试器（nop-debugger）只能显示当前渲染树，无法跳转到 schema 源

### 1.3 建议方案

在 `BaseSchema` 中添加可选 `xui:location`：

```typescript
// packages/flux-core/src/types/schema.ts
interface BaseSchema {
  'xui:location'?: {
    file?: string; // 来源文件路径
    line?: number; // 行号
    column?: number; // 列号
    offset?: number; // 字节偏移
  };
}
```

### 1.4 实施路径

| 阶段    | 内容                                                            |
| ------- | --------------------------------------------------------------- |
| Phase 1 | 定义 `xui:location` 类型 + Loader 在合并 schema 时保留 location |
| Phase 2 | 编译器 diagnostics 使用 location 生成带行列的错误消息           |
| Phase 3 | nop-debugger 支持"跳转到 schema 源"                             |
| Phase 4 | Runtime error boundary 在报错时附加 schema location             |

### 1.5 与既有文档的关系

本方向延续 `docs/archive/analysis/2026-04-26-flux-architecture-improvement-opportunities.md` §2 的第二条改进方向：

> 强化基于稳定 source-location 元数据的 diagnostics 闭环

该文档建议为节点保留可选 `xui:location` 元数据，打通 Loader/Compiler/Runtime/Diagnostics 闭环。本报告在此基础上增加了具体代码位置和分阶段实施路径。

---

## 2. 编译期依赖推断（简单表达式）

### 2.1 现状

`docs/archive/analysis/2026-04-26-flux-architecture-improvement-opportunities.md` §5 已提出：

> 对于简单表达式（如 `${name}`）可以通过编译期推断 scope path，减少宽订阅和无意义重算

当前运行期依赖收集是动态的，对于简单表达式也有运行期开销。

### 2.2 缺口

编译器尚未对简单 `${expr}` 做 scope path 静态推断。例如 `${name}` 可以在编译期推断为直接读取 `scope.name`，无需运行期遍历 scope chain。

### 2.3 建议实施

在 `flux-compiler` 中增加一个 simple expression optimizer pass：

- 识别 `${simpleIdentifier}` 模式（如 `${name}`, `${user.id}`）
- 在编译产物中标注 `scopePath` 元数据
- Runtime 对标注了 scopePath 的表达式走快速路径，跳过完整依赖收集

### 2.4 风险评估

- **低风险**：这是编译器优化 pass，不影响现有语义
- **需要验证**：scope path 推断在 isolate/isolation boundary 下的正确性
- **性能收益**：大 schema（100+ 节点）场景下可显著减少运行期依赖收集开销

---

## 3. final-model-invariant 落地检查

### 3.1 现状

`docs/architecture/flux-dsl-vm-extensibility.md` 已定义"浏览器端拿到的 schema 必须是最终执行模型"，但缺少一个运行时/编译期的 assertion 机制来检测是否意外混入了 authoring merge 语义、未展开的 profile 规则等。

`docs/archive/analysis/2026-04-26-flux-architecture-improvement-opportunities.md` §1 将"固定 Final Execution Schema 输入不变量"列为 **P1**，理由是"最符合 Nop 整体生产线思路，也最能避免前后端边界重新混乱"。

### 3.2 建议方案

在 debug mode 下增加 schema invariant 检查：

- 编译后 schema 不应包含 `x:extends`、`x:profiles` 等 authoring-only 字段
- 编译后 schema 的每个节点应有确定的 `type`
- 编译后 action 的 `args` 不应包含未求值的 `${expr}`

### 3.3 优先级

P1（高优先级）— 与 `2026-04-26-flux-architecture-improvement-opportunities.md` §1 一致。该方向最符合 Nop 整体生产线思路，能避免前后端边界重新混乱。本报告此前标注为 P2 有误，已修正。
