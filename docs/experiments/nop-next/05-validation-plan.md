# 05. 验证计划

## 最小验证切片

在进入实现前，每个切片都要交付 4 份工件：

1. 作者语言声明
2. 编译后的 IR
3. 运行时执行日志
4. 宿主 request/receipt 样本
5. patch set 样本

### 切片 A：表单提交链路

场景：

1. 订单表单编辑
2. 字段级本地校验
3. 远程唯一性校验
4. 提交成功后跳详情页

验证点：

1. 草稿是否稳定归属于 replica cell，而提交结果归属于 authority cell
2. 作者是否只声明 `SubmitDraft` intent 和 `Draft persisted` goal，而不手写提交流程图
3. HTTP 与路由是否都经由 proof-backed effect request
4. 断点恢复时是否依赖 receipt 而不是重复外部调用
5. `validate -> persist -> navigate` 是否表现为 bounded recipe，而不是作者手写流程图
6. proof 若无法本地派生，是否明确走 `proof/*` request/receipt 链路
7. 首个 proof 是否能由 bootstrap attestation 合法启动，而不引入业务 effect 越权
8. bootstrap attestation mint 出的 proof 是否始终受 principal/tenant/resource 子集约束

### 切片 B：嵌套弹窗编辑

场景：

1. 列表页打开详情弹窗
2. 弹窗内编辑子表记录
3. 局部提交后回写列表投影

验证点：

1. 弹窗是否只是一种 projection 宿主，而非独立状态黑洞
2. 上下层是否无需共享动态 context
3. 编辑中的事实是否存在清楚 authority/replica 关系
4. dialog effect adapter 是否只服务声明过的 effect closure

### 切片 C：离线草稿与恢复

场景：

1. 表单编辑时断网
2. 本地持久化草稿
3. 恢复后合并服务端新版本

验证点：

1. authority 与 replica 语言是否天然表达该场景
2. reconciliation policy 是否比“页面 store 合并”更清楚
3. effect receipt 是否支持崩溃恢复与幂等提交
4. proof revocation 后是否能阻止旧 request 继续兑现
5. proof issuer 故障时 goal 是否进入显式 deferred，而不是隐藏重试魔法

### 切片 D：宿主裁剪与拒绝

场景：

1. 同一套设计部署到 SaaS 标准版和受限嵌入版
2. 嵌入版不允许路由跳转和本地存储

验证点：

1. proof / effect manifest 是否可裁剪
2. 缺失能力时系统是否进入显式 `deferred` 或 `rejected`
3. 不支持 `interactive` / `navigational` 时是否不会伪成功
4. adapter closure 是否不会偷偷转调未声明 host service

## 对照实验

每个切片都要和一个主流基线对照：

1. `Schema + Action` 基线
2. `Action Graph` 基线
3. `Global Store + Context Service` 基线

只要新方案在概念纯度上没有明显胜出，就不能宣称是新吸引子。

## 原型交付物

第一阶段原型至少应交付：

1. `schema-free` 的作者声明样例 3 份
2. 对应 IR dump 3 份
3. recipe DAG 可视化 3 份
4. outbox / receipt / audit log 样本
5. 一个 crash recovery 回放演示
6. 一个 host trimming 演示
7. 一个 binder payload mapping 样本

## 成败判据

满足以下 7 条中的至少 6 条，才算新吸引子成立：

1. UI 树重组不影响事实 owner
2. 作者不需要手写通用流程图
3. 外部 effect 具备 proof、request、receipt 三件套
4. 崩溃恢复不依赖“外部调用大概没发生”
5. 宿主裁剪能表现为显式 outcome，而不是隐式 fallback
6. 编译结果能导出 owner/replica/surface/intent-goal/proof/effect 六张图
7. 编译结果还能导出 recipe/reducer/adapter-closure 三张图
8. 多效果 goal 的最大 effect cardinality 可静态算出
9. 复杂度主要落在新边界语言上，而不是藏回 runtime magic
10. 每个 proof class 都能追溯到 derived source 或 `proof/*` request path
11. bootstrap attestation 只覆盖 `proof/*`，不会泄漏到业务 effect
12. bootstrap attestation 不会放大 principal/tenant/resource scope

## 明确不通过信号

出现以下任一信号，说明方案正在回流：

1. 重新允许作者直接维护 step graph
2. 重新允许运行时直接持有 host capability 句柄
3. 重新把副本与 authority 混成一个页面 store
4. 重新让 projection 读取动态 ambient context
5. 重新用脚本节点补齐表达力
6. 让 adapter 变成广义 host service registry
7. 让 goal 在运行时临时长出新 effect slot
8. 让 proof 通过未审计宿主调用偷偷签发
9. 让 bootstrap attestation 直接授权业务 effect
10. 让 bootstrap attestation 申请比自身范围更大的 proof

只要出现其中两条，这个方案就已经回流到旧盆地。
