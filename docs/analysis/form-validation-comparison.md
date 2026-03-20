# 表单验证框架对比摘要

> 角色说明: 这是对比分析摘要，用于记录结论，不是当前仓库实现的最终契约。

> 分析日期: 2026-03-17
> 对比对象: react-hook-form, yup, nop-amis

## 目的

这份文档只保留对当前仓库仍然有参考价值的结论。

更细的研究材料请直接看：

- `docs/references/react-hook-form-template-notes.md`
- `docs/references/yup-template-notes.md`
- `docs/architecture/form-validation.md`

## 一句话结论

- `nop-amis` 继续坚持“编译优先、运行时驱动、低代码 schema 为中心”的方向是正确的
- `react-hook-form` 最值得借鉴的是细粒度订阅、数组操作语义、中心化 form control
- `yup` 最值得借鉴的是条件与引用建模、结构化执行上下文、规范化与校验分层
- 不应把 RHF 的 JSX 注册模型或 Yup 的 fluent builder 模型直接当作当前架构目标

## 对当前仓库最有价值的参考点

### 来自 React Hook Form

最值得保留的结论：

- React 层应该保持薄，复杂状态和校验编排应放在运行时
- 细粒度订阅是性能关键，不应让所有字段订阅整个表单状态
- 数组不是普通 `setValue(path, nextArray)` 的特例，而应该有一流操作语义
- 聚合错误应当有明确归属，而不是被随意投影到某个子字段

对当前仓库的对应关系：

- `FormRuntime` 继续作为中心化编排边界
- `amis-react` 继续扩展 path-scoped selector 和 field/node 级 state hooks
- `amis-runtime` 保持数组操作和数组状态重映射能力

### 来自 Yup

最值得保留的结论：

- “规范化/转换”与“校验”是两个不同阶段
- 条件与引用不应该只是 ad hoc 参数，而应该是清晰的内部概念
- 自定义校验器需要结构化执行上下文
- 嵌套对象/数组校验更适合节点驱动而不是纯路径扫描
- 错误结果既要利于展示，也要利于程序消费

对当前仓库的对应关系：

- 当前 relational rules 方向是合理的
- subtree validation 应继续向节点驱动收敛
- 可以逐步增强自定义校验上下文和调试/内省能力

## 对当前 `nop-amis` 的判断

### 已经做对的地方

- 编译期提取规则，而不是依赖 React 生命周期动态发现字段
- 运行时独立于 React，便于保持核心模型稳定
- 表单校验、异步防抖、过期运行取消，放在运行时统一编排
- 数组操作已经是一流能力，而不只是路径写值
- 错误结构已经支持 `ownerPath` 和 `sourceKind` 这类聚合语义

### 仍可继续加强的地方

- 更正式的规范化阶段
- 更丰富的自定义校验执行上下文
- 更明确的 validation graph 内省接口
- 更彻底的节点驱动 subtree validation
- 进一步减少重复存储的 compiled validation 投影

## 不应直接照搬的部分

### 不直接照搬 RHF

- 不把 `register(...)` 作为主字段发现机制
- 不把 React mount/unmount 生命周期当作校验真相来源
- 不以复刻 RHF 公共 API 形状为目标

### 不直接照搬 Yup

- 不把 fluent builder 作为主要 authoring surface
- 不把 opaque schema object execution 作为核心运行时模型
- 不把当前低代码编译模型回退成通用黑盒校验器

## 对仓库文档和实现的落地建议

当前最合适的落地方向是：

1. 继续以 `docs/architecture/form-validation.md` 作为现行契约
2. 将 RHF/Yup 相关内容保留在 `docs/references/`，作为研究材料而非现行规范
3. 若后续推进新能力，优先考虑：
   - validation normalization
   - richer validation execution context
   - node-driven subtree validation
   - validation introspection/debug export

## 推荐阅读顺序

1. `docs/architecture/form-validation.md`
2. `docs/references/react-hook-form-template-notes.md`
3. `docs/references/yup-template-notes.md`

如果只需要当前实现契约，请停在第 1 步即可。
