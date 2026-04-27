# 下一代低代码底层框架设计

本目录只设计低代码底层框架，不设计完整平台产品。

最终保留的不是另一套 `Schema + Renderer + Action Graph`，而是一套新的底层边界语言：

1. `Cell`：显式状态 owner
2. `Projection`：纯投影视图
3. `Intent`：语义触发
4. `Goal`：期望达成的后置条件
5. `Proof`：与主体/租户/资源/时间绑定的能力证明
6. `Effect Request`：面向宿主的可审计效果请求

关键变化有两条：

1. 作者不再手写动作图或流程图，运行时只在内部生成短命 `Plan`，它是编译与调度产物，不是作者面对的一等语言。
2. 宿主能力不再通过 `Lease/Service/Context` 直接给运行时调用，而是通过 `Proof` 约束下的 `Effect Request` 请求宿主兑现；proof 自身也必须来自可验证派生或显式 proof receipt。

这使方案不再以页面树、schema 解释器、action graph 或 service locator 为中心，而以“状态归属、目标达成、授权证明、效果兑现”四条边界为中心。

建议阅读顺序：

1. `01-attractor-analysis.md`
2. `02-core-language.md`
3. `03-runtime-and-execution.md`
4. `04-compiler-and-distribution.md`
5. `05-validation-plan.md`
6. `06-review-and-iterations.md`
7. `07-authoring-language.md`
8. `08-intermediate-representation.md`
9. `09-runtime-algorithms.md`
10. `10-worked-example-submit-draft.md`

设计结论：

1. 下一代低代码底层的核心不是“更强 schema”，而是“把状态、视图、触发、目标、授权、效果拆成不同物种”。
2. 如果作者仍然直接写 action step graph，系统大概率会回流到 BPMN-like 盆地。
3. 如果宿主能力仍以上下文对象或服务容器暴露，系统大概率会回流到 service locator 盆地。
4. 只有当 `Goal` 和 `Proof` 成为一等概念，低代码底座才同时具备可分析性、可裁剪性、可审计性和 AI 友好的重构界面。
