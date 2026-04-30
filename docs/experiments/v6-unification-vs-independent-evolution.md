# v6 统一边界与独立演化边界

## 状态

- 状态: draft
- 目的: 把前两份实验文档收束成一份更短的决策稿，只回答“低代码底层到底哪些东西该统一，哪些东西必须独立演化”
- 上游输入:
  1. `docs/experiments/next-gen-low-code-runtime-kernel-design-v6.md`
  2. `docs/experiments/next-gen-runtime-vs-current-flux-comparison-v6.md`

## 1. 一句话结论

应该统一的是共享执行机制，不应该强统一的是 owner 语义和复杂领域语义。

更具体地说:

1. 统一 `substrate`
2. 保持 `owner family` 独立
3. 保持 `domain runtime` 独立

## 2. 三层模型

### 2.1 Substrate

这是最适合统一到底层的部分。它解决的是“怎么执行”，不是“业务语义归谁”。

包括:

1. 表达式求值
2. 基础依赖追踪
3. 失效传播
4. 结构化写入发布
5. action 结果分类
6. effect continuation 基础设施
7. async ownership / cancel / retry / timeout / trace id

### 2.2 Owner Family

这是“谁拥有某类状态和生命周期”的层。

包括:

1. form runtime
2. surface runtime
3. table/row runtime
4. page runtime
5. validation runtime

这些系统可以共享 substrate，但不应该被压成一个语义完全相同的大系统。

### 2.3 Domain Runtime

这是最不适合硬塞进统一核心的层。

包括:

1. flow designer
2. spreadsheet
3. report designer
4. word editor
5. 未来任何复杂宿主域控件

它们应该通过窄契约接入，而不是反向定义核心词汇。

## 3. 决策原则

统一一项能力前，至少要回答四个问题。

1. 它是不是跨多个子系统重复出现的共享机制？
2. 它是不是共享同一套不变量？
3. 不统一它，是否已经造成明显重复实现、行为不一致或调试困难？
4. 统一它，是否会迫使本来独立的 owner 语义被错误合并？

只有前 3 个问题偏“是”，且第 4 个问题偏“否”，才值得下沉到底层。

## 4. 决策表

| 能力                      | 是否应统一到底层 | 原因                                                      |
| ------------------------- | ---------------- | --------------------------------------------------------- |
| 表达式求值                | 应统一           | 所有动态值都会用到，重复实现代价高                        |
| 基础依赖追踪              | 应统一           | `value/resource/reaction` 至少应共享最小失效模型          |
| 写入发布                  | 应统一           | 不统一会出现不同系统各自写、各自通知                      |
| action 结果代数           | 应统一           | `success/failure/skipped` 应全局一致                      |
| async governance          | 应统一           | timeout/cancel/retry 是典型横切机制                       |
| source/resource substrate | 部分统一         | 刷新、取消、去重可统一，发布语义可保持独立                |
| reaction substrate        | 部分统一         | 依赖命中与调度可统一，reaction 自身语义不必与别的系统强并 |
| validation runtime        | 不应强统一       | 它有自己完整的 owner、path、aggregate、async 语义         |
| surface runtime           | 不应强统一       | dialog/drawer 更像独立 owner family                       |
| table/row runtime         | 不应强统一       | 高频优化高度依赖集合与 UI 场景                            |
| domain runtime            | 不应强统一       | 复杂域不应反灌核心                                        |
| renderer adapter          | 不应强统一       | 这是宿主适配层，不是执行核心                              |

## 5. 为什么“大一统 graph kernel”容易出问题

如果统一过度，常见失败模式有三种。

1. validation 被塞进通用 reactive kernel，结果 owner 语义被污染
2. row/table 的高频策略被抽成通用机制，结果普通场景也背上复杂度
3. 复杂域控件被纳入核心 contract，结果核心边界持续膨胀

所以问题从来不是“能不能统一”，而是“统一之后是否仍然保留正确的边界”。

## 6. 更现实的内核形态

如果真的想吸收 v6 的优势，更现实的目标不是大一统 `graph kernel`，而是 `Minimal Execution Kernel`。

这个最小执行内核只统一:

1. expression VM
2. dependency invalidation substrate
3. write publication substrate
4. effect scheduling substrate
5. async governance substrate

而以下系统继续独立演化:

1. form/validation
2. page/surface
3. table/row
4. domain runtime
5. React 和其他 renderer adapter

## 7. 对当前 Flux 的直接含义

对当前 Flux，更合理的方向不是“改造成 v6 graph kernel”，而是:

1. 保留七原语与派生系统的总体边界
2. 在不破坏原则的前提下，增强共享 substrate
3. 提升 turn contract、async ownership、tracing、一致性协议
4. 让 validation、surface、table、domain runtime 继续独立演化

换句话说，Flux 真正应该吸收的不是“大统一”，而是“更强的一致性协议”和“更窄的共享执行底座”。

## 8. 最终判断

最终判断只有四句。

1. 该统一的是机制，不是所有语义。
2. 该独立的是 owner family 和 domain runtime。
3. `graph kernel` 不是伪概念，但它很容易统一过度。
4. 最可落地的路线是 `Minimal Execution Kernel + Independent Owner Evolution`。
