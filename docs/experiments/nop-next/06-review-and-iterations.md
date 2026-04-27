# 06. 评审与迭代记录

## 第 1 轮子 agent 评审结论

发现的主要问题：

1. 早期版本中的 `Flow` 仍然太像收紧版 action graph。
2. 早期版本中的 `Lease` 仍然太像 typed service locator。
3. replay / retry 会重复触发外部 effect，缺少 request / receipt 机制。
4. lexical visibility 不是授权模型，缺少 principal / tenant / resource scope 绑定。
5. authority 与 draft/offline/cache 副本之间缺少明确同步语义。
6. projection 的“静态可枚举输入”定义过硬，不适合参数化动态场景。

## 已采纳改动

1. 用 `Goal` 取代作者可见的 `Flow`。
2. 用 `Proof + Effect Request` 取代 `Lease`。
3. 引入 `Effect Receipt` 和 outbox-first 执行顺序。
4. 把 `Cell` 拆成 `Authority Cell` 与 `Replica Cell`。
5. 把 projection 读面约束从“完全静态枚举”改为“静态有界 surface”。
6. 增加 portability class、explicit outcome 和 binder uniqueness 约束。
7. 为 goal 增加 satisfaction predicate、bounded recipe 和 effect slot 上界。
8. 为 proof 增加 issuer、grant、revocation epoch 和可验证 token 约束。
9. 为 effect 引入 typed receipt、receipt reducer 和 outbox-first 恢复模型。
10. 为 adapter 增加 closed-world closure 约束，防止回流成 service registry。
11. 为 proof 增加 source 分类：`derived` 或 `proof receipt`，堵住隐藏签发通道。
12. 增加 `Bootstrap Attestation`，只允许它启动 `proof/*` 请求，解决首个 proof 启动循环。
13. 把 bootstrap attestation 的主体、租户、资源范围和 freshness 绑定补齐，防止它成为宽口径根证。

## 当前仍保留的风险

1. `Goal` 如果继续泛化，可能退化成不可控 planner 系统。
2. `Proof` 如果声明成本过高，团队会试图重新引入 ambient capability。
3. `Effect Adapter` 如果边界不严，可能重新变成宿主脚本逃生口。
4. `Receipt Reducer` 如果被滥用，可能重新藏入不可见业务流程。
5. `Proof Request` 如果设计得过重，可能拉高普通交互时延。
6. `Bootstrap Attestation` 如果边界放松，可能重新变成特权逃生口。
7. proof issuer 与 bootstrap envelope 的信任配置仍然需要严密工程实现。

## 第 2 轮评审目标

下一轮子 agent 需要重点检查：

1. 现在是否仍然回流到 workflow engine 盆地
2. goal/proof 语言是否已经足够可执行而非抽象口号
3. 当前风险是否只是工程难度，还是仍有概念层断裂
4. recipe 和 adapter 闭包是否足够约束内部回流路径
5. proof source 与 proof receipt 是否已消除隐藏宿主签发路径
6. bootstrap attestation 是否只承担 proof bootstrap，而不承担业务授权

当前状态：已完成第 1 轮修订，等待第 2 轮子 agent 复审。
