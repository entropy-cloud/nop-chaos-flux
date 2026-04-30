# 01 Architecture Overview

## 1. 设计目标

新框架必须同时满足：

1. 支撑 page、form、list、table、dialog/drawer、workbench、designer host 等低代码运行场景。
2. 运行时只执行 `Execution Package`。
3. `Schema` 作者可见副作用只能通过 `Capability`。
4. 运行时必须提供 deterministic transaction、stale-result 防护、authoritative publish gate。
5. React 只是 host adapter，不是语义来源。
6. 大对象编辑、对象数组编辑、editable table、draft/detail 编辑必须是 first-class。
7. host/domain 系统必须通过只读 projection 和写入 capability 接入。
8. 必须有完整 diagnostics、versioning、security、recovery、conformance 边界。

## 2. 非目标

1. 不让 authoring model 直接进入 runtime。
2. 不把 CRDT、OT、graph layout、spreadsheet formula engine 等领域算法升格为 core primitive。
3. 不把 graph/cell 内部实现细节暴露为 public runtime model。
4. 不允许任意 JavaScript 执行。
5. 不把所有 owner family 压成一个统一 public runtime class。

## 3. 分层

| Layer            | Owns                                                                       | Output             |
| ---------------- | -------------------------------------------------------------------------- | ------------------ |
| Authoring        | round-trip DSL、编辑器元数据、继承、组合、profile                          | Authoring Document |
| Assembly         | 静态裁剪、i18n、默认展开、引用解析、manifest 装配                          | Assembled Program  |
| Compiler         | template/value/action/validation/resource/reaction/manifest 编译           | Execution Package  |
| Execution Kernel | session、scope、dependency、transaction、async governance、owner substrate | Runtime Session    |
| Host / Domain    | React host、designer/report/word/spreadsheet domain、bridge、shell         | Concrete App       |

顶层规则：

1. runtime 不做 authoring inheritance expansion。
2. host/domain 私有对象不进入 schema-visible scope。
3. 任意 runtime admitted fragment 也必须先被编译成同一 execution contract。

## 4. 顶层公开语义原语

| Primitive         | 问题                               | Owns                                                     |
| ----------------- | ---------------------------------- | -------------------------------------------------------- |
| `Template`        | 结构是什么                         | 结构树、region、生命周期锚点、renderer 选择              |
| `Scope`           | 这里能看到什么数据                 | 词法可见性、shadowing、own writes                        |
| `Value`           | 这里怎么读值/派生值                | literal、expr、template、array、object、anonymous source |
| `Resource`        | runtime 是否拥有一个值的生产和发布 | lifecycle、publish、refresh、status                      |
| `Reaction`        | watched change 是否触发后果        | watch、when、debounce、once、dispatch                    |
| `Capability`      | 谁能执行副作用                     | built-in、namespaced、instance-targeted、host-targeted   |
| `Host Projection` | 哪些 host-owned 只读快照可见       | readonly snapshot admission                              |

## 5. 为什么 `Owner` 不是 primitive

`Owner` 很重要，但它不是第八个 primitive。

原因：

1. 它不是作者直接操纵的跨域最小语义单元。
2. 它主要负责把已有 primitive 组织到 form、draft、surface、collection、domain-host 这些运行时边界上。
3. 作者感知到的是 `form`、`detail-view`、`table`、`designer-page` 这类 DSL 结构，不是一个裸 `owner` primitive。

因此：

1. `Owner` 是 kernel organizing substrate。
2. `surface`、`validation`、`undo/redo`、`collaboration` 是 derived systems。

## 6. 设计连续性判断

相对当前 Flux，保留：

1. primitive closure
2. DSL continuity
3. host/domain boundary discipline
4. compile-first validation
5. owner-local participation 和 row identity split 的方向

相对实验稿，吸收：

1. Execution Package
2. deterministic transaction
3. async governance
4. authoritative publish gate
5. stricter host contract / capability manifest

明确放弃：

1. graph-kernel public model
2. 统一 generic binding primitive
3. runtime loader-style schema assembly
4. 把 host bridge/store/controller 注入 scope

## 7. 核心不变量

1. Execution kernel 只执行 `Execution Package`。
2. 作者可见副作用只通过 `Capability`。
3. `Value`、`Resource`、`Reaction` 不得合并成 generic binding。
4. `Scope` 是数据环境，不是命令对象容器。
5. 所有写入和异步 settle 都必须进入 transaction pipeline。
6. owner-local 派生状态必须与值写入同轮 publish。
7. 复杂域宿主只能通过 projection + namespaced command 接入。
8. collection runtime identity 与值地址分离。

## 8. 明确拒绝的基线

1. raw schema 直接进入 runtime
2. graph cell public API 成为唯一 runtime 心智
3. `Scope` 同时承载数据、行为、bridge、controller
4. React local state 成为 low-code authoritative state
5. validation 全靠 mounted field register 临时拼装
6. 旧 async 结果覆盖新 publish

## 9. 后续阅读

继续读：`02-execution-package-and-admission.md`
