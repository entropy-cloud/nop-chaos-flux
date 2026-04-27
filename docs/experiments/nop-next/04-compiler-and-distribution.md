# 04. 编译与分发模型

## 编译目标

编译器不是做模板预编译，而是做 6 件事：

1. 固化事实 owner 边界
2. 固化 projection 读面边界
3. 固化 intent 到 goal 的确定映射
4. 固化 proof 与 effect class 的宿主契约
5. 固化 goal recipe、receipt reducer 与 adapter 闭包边界
6. 固化 proof source：local derivation 或 proof request

输入不是“一棵大而全 schema”，而是以下构件：

1. authority/replica cell 定义
2. projection 定义
3. intent family 定义
4. goal binder 定义
5. proof policy 定义
6. effect adapter contract
7. receipt reducer 定义
8. proof verifier / issuer contract

输出是：

1. authority map
2. replica sync map
3. projection surface map
4. intent-goal map
5. proof requirement map
6. effect manifest
7. goal recipe map
8. reducer map
9. adapter closure map
10. proof source map

## 五步 lowering

### 第一步：Fact Lowering

把所有逻辑事实归位到 authority，并要求所有副本声明同步与合并语义。

### 第二步：Surface Lowering

把 projection 的读取面降低成静态有界的 surface map。

说明：

- 这里要求的是“静态有界”，不是“每个读路径都必须完全展开”。
- 参数化集合、重复子树、动态行项可以存在，但必须落在可推断的读族之内。

### 第三步：Goal Lowering

把 UI 事件、自动化触发、外部信号统一降低为 typed intent，再通过 binder 降低为 goal family。

关键约束：

1. 一个 intent family 在同一装配单元内只能有一个 binder owner。
2. 多策略分支必须显式列出判定条件。
3. 不允许 host 在运行时偷偷替换 binder 语义。
4. 每个 goal family 必须编译出 bounded recipe、satisfaction predicate 和 outcome table。

### 第四步：Proof Lowering

把宿主需求降低为 proof class 与 effect manifest，而不是把 host API 句柄塞给运行时。

要求：

1. 每个 proof class 必须绑定 issuer class 与 revocation channel。
2. 每个 effect class 必须声明需要的 proof classes。
3. 每个 effect adapter 必须声明其 closed-world effect closure。
4. 每个 proof class 必须声明 source 是 `derived` 还是 `requested`。
5. `requested` proof 必须绑定 `proof/*` effect class 与 proof receipt schema。
6. bootstrap attestation 必须声明来源 envelope、可用期限和可启动的 proof classes。
7. bootstrap attestation 必须声明 principal/tenant/resource scope 上界与 freshness contract。

### 第五步：Receipt Lowering

把宿主结果降低为 typed receipt schema 与 reducer map。

要求：

1. 每个 effect class 必须有对应 receipt schema。
2. reducer 只能写预声明的 authority/replica targets。
3. reducer 不得引入新的 effect request。
4. proof receipt 也必须有独立 schema，不能复用模糊通用 receipt。

## 不把 Plan 暴露为作者 DSL

这是编译模型最关键的约束。

如果某个上层产品要求作者直接画“步骤 1 -> 步骤 2 -> 步骤 3”，那是上层流程产品，不是这个底层框架的核心语言。

底层框架只允许：

1. 作者定义目标
2. 编译器生成 recipe 与内部 plan
3. 调试器展示已生成 recipe 与单次 plan

不允许：

1. 作者维护通用步骤图
2. 用脚本节点补洞
3. 把运行时重新变成 workflow engine

## 分发形态

框架应允许同一份设计分发到多类宿主：

1. `browser runtime`
2. `embedded runtime`
3. `SSR or precompute runtime`
4. `headless automation runtime`

但前提不是“所有 goal 到处都能跑”，而是“goal 与 effect class 有 portability contract”。

例如：

1. `interactive` goal 不应在 headless 宿主伪成功
2. `navigational` effect 在 SSR 宿主只能被拒绝或延期
3. `durable` goal 必须要求 receipt-backed effect

## AI 友好性

这一代底层框架必须为 AI 提供结构化中间面，而不是给 AI 一棵混合 schema 猜语义。

编译结果至少应暴露：

1. owner map
2. replica map
3. surface map
4. intent-goal map
5. proof map
6. effect manifest
7. recipe map
8. reducer map
9. adapter closure map
10. proof source map

这样 AI 才能回答真正重要的问题：

1. 哪个 projection 读面过宽
2. 哪个 goal 缺失显式 outcome
3. 哪个 proof 范围过大
4. 哪个 replica 没有清晰 merge policy
5. 哪个 effect class 在目标宿主不可移植
6. 哪个 adapter closure 过宽
7. 哪个 goal recipe 有隐藏 workflow 倾向
8. 哪个 proof class 仍然依赖隐藏签发路径
9. 哪个 bootstrap attestation 范围过宽，可能越权到业务 effect

## 为什么这比主流方案更像底层框架

因为它不依赖某种具体 UI schema 长相，也不把执行语言绑定为流程图。

你完全可以：

1. 上层接可视化编辑器
2. 上层接 hand-written DSL
3. 上层接 AI 生成器
4. 上层接已有 JSON schema 转换器

但底层收敛的永远是同一套事实/目标/证明/效果语言，而不是不同入口各自带一份脏运行时。
