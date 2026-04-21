# 09 Repo And Package Blueprint

## 1. 目标

本文把前 01-08 的协议级设计落成一个可实现的从零仓库蓝图。

这里回答：

1. 仓库应该怎么拆。
2. 哪些包是必须的。
3. 哪些能力放哪一层。
4. 哪些东西绝不能混放。

## 2. 顶层仓库结构

建议从零实现时采用：

```text
next-gen-lowcode/
  apps/
    playground/
    debugger/
    conformance-runner/
  packages/
    runtime-contracts/
    schema-authoring-types/
    package-compiler/
    kernel-core/
    kernel-actions/
    kernel-validation/
    kernel-owners/
    host-protocol/
    renderer-contracts/
    runtime-facade/
    react-host/
    builtin-renderers/
    builtin-capabilities/
    debugger-sdk/
    conformance-kit/
  examples/
    packages/
    snapshots/
  scripts/
  docs/
    experiments/
```

## 3. 顶层分层原则

### apps

只放：

1. playground
2. debugger UI
3. conformance runner

不放：

1. runtime 核心逻辑
2. compiler 主逻辑
3. host protocol 主定义

### packages

只放：

1. 稳定可复用模块
2. 编译器和运行时核心包
3. host/renderer/debugger/conformance SDK

### examples

只放：

1. execution package fixtures
2. authoring 示例
3. snapshot / journal / collaboration fixtures

## 4. 必须存在的 packages

### `runtime-contracts`

职责：

1. `ExecutionPackage`
2. `PublishedSnapshot`
3. `ScopeWrite`
4. `RuntimeFailureKind`
5. `RuntimeDebugSnapshot`
6. shared DTO / envelope / manifest types

规则：

1. 这是跨 compiler、kernel、host、conformance、debugger 的共享契约层。
2. 不持有实现。
3. 不依赖 React。
4. 不依赖 builtin renderer UI。

### `schema-authoring-types`

职责：

1. authoring DSL type
2. authoring-time helper types
3. round-trip metadata types

规则：

1. 不依赖 runtime。
2. 不依赖 React。
3. 不放 execution package IR。

### `package-compiler`

职责：

1. authoring -> assembled program -> execution package
2. lowering
3. version migration
4. source-map
5. diagnostics
6. determinism/hash
7. composite field bridge lowering such as `itemKey -> itemKeyPath` and `useItemSchema -> itemTemplate reuse`

规则：

1. 是 `ExecutionPackage` 的唯一生产者。
2. 不依赖 React host。
3. 不直接依赖 builtin renderer UI 实现，只依赖 renderer contract metadata。
4. `ExecutionPackage` 类型本身来自 `runtime-contracts`，而不是编译器私有定义。

### `kernel-core`

职责：

1. runtime session
2. scope/value/dependency
3. transaction
4. async governance
5. resource/reaction substrate
6. published snapshot
7. failure taxonomy
8. journal/checkpoint/replay substrate including array identity metadata persistence and replay continuity checks

规则：

1. 不依赖 React。
2. 不依赖具体 renderer。
3. 不依赖具体 host domain。
4. 直接依赖 `runtime-contracts` 与 `host-protocol` 的公开 contract，而不是依赖 `package-compiler`。

### `kernel-actions`

职责：

1. action program compile support
2. action execution runtime
3. capability resolution pipeline glue
4. prev-result / branch / parallel / finally orchestration

规则：

1. 依赖 `kernel-core`。
2. 不持有 scope store 主实现。

### `kernel-validation`

职责：

1. validation model compile/runtime helpers
2. field state / error state / edge-case handling
3. async validation governance integration

规则：

1. validation 逻辑不得散落在 renderers。
2. 依赖 `kernel-core`，可被 `kernel-owners` 调用。

### `kernel-owners`

职责：

1. page/form/draft/surface/collection/domain-host owner substrate
2. owner lifecycle
3. child owner contract
4. composite value structure runtime helpers
5. keyed/index collection identity consumption, rowKey derivation, row draft commit target freeze/resolve

规则：

1. owner family 的具体实现集中在这里。
2. 不把 validation 本体复制到这里，只组合 `kernel-validation`。

### `host-protocol`

职责：

1. host contract manifest
2. domain bridge contract
3. host command envelope
4. permission manifest types
5. projection/command/result DTO types

规则：

1. 是 host/domain contract 的唯一 owner。
2. 不依赖 React。
3. 不依赖 builtin renderers。
4. 权限/manifest 的共享 DTO 来自 `runtime-contracts`；host-protocol 负责它们在 host 语义中的解释，不重新拥有第二份定义。

### `renderer-contracts`

职责：

1. renderer definition
2. resolved node contract
3. region/event/slot metadata
4. renderer classification metadata

规则：

1. 这是编译器和 host 之间的桥接层。
2. 不放实际 React component。

### `runtime-facade`

职责：

1. 向 `react-host` 和 `builtin-renderers` 暴露稳定 facade
2. 屏蔽 `kernel-core` / `kernel-actions` / `kernel-owners` 的内部模块结构
3. 提供只读 hooks/selectors 所依赖的公开 runtime API

规则：

1. UI 层只依赖 facade，不直接 import kernel 内部目录。
2. facade 可以组合 kernel 能力，但不重新实现语义。

### `react-host`

职责：

1. React runtime adapter
2. contexts/hooks
3. node renderer bridge
4. surface host root
5. debugger / devtools integration hooks

规则：

1. 只消费 published snapshot。
2. 不应重新实现 transaction/owner/resource 逻辑。
3. 通过 `runtime-facade` 访问运行时，而不是直接依赖 kernel 内部模块。

### `builtin-renderers`

职责：

1. 内建 page/form/input/table/dialog 等 renderer 实现
2. 内建 renderer metadata

规则：

1. UI 实现和 renderer metadata 可以同包，但 contract 类型来自 `renderer-contracts`。
2. 不得直接访问 kernel store 私有结构。
3. 通过 `runtime-facade` 读取运行时能力，不直接依赖 `kernel-owners`。

### `builtin-capabilities`

职责：

1. built-in capability 实现
2. setValue / navigate / openSurface / closeSurface / refreshResource / submit / validate 等基础动作

规则：

1. 只通过 capability resolver 暴露。
2. 不允许普通 renderer 绕过它们直接操作底层 kernel。
3. 依赖 `kernel-actions` + `kernel-owners` + `kernel-validation` + `host-protocol` 的公开 facade，而不是反向让 UI 包直接碰这些实现。

### `debugger-sdk`

职责：

1. runtime debug snapshot types
2. inspection APIs
3. debugger transport

### `conformance-kit`

职责：

1. conformance case schema
2. harness helpers
3. deterministic compiler/runtime test fixtures
4. keyed/index collection identity, row draft confirm, and replay continuity fixtures

## 5. 强制依赖方向

```text
runtime-contracts
  -> package-compiler
  -> kernel-core
  -> kernel-actions
  -> kernel-validation
  -> kernel-owners
  -> host-protocol
  -> renderer-contracts
  -> runtime-facade
  -> react-host
  -> debugger-sdk
  -> conformance-kit

schema-authoring-types
  -> package-compiler

renderer-contracts -> package-compiler
host-protocol -> package-compiler

kernel-core -> kernel-actions
kernel-core -> kernel-validation
kernel-core -> kernel-owners
kernel-core -> runtime-facade

host-protocol -> kernel-actions
host-protocol -> kernel-core
renderer-contracts -> react-host
runtime-facade -> react-host

renderer-contracts -> builtin-renderers
runtime-facade -> builtin-renderers
react-host -> builtin-renderers

kernel-actions -> builtin-capabilities
kernel-owners -> builtin-capabilities
kernel-validation -> builtin-capabilities
host-protocol -> builtin-capabilities
kernel-core -> debugger-sdk
kernel-core -> conformance-kit
package-compiler -> conformance-kit
react-host -> conformance-kit
```

## 6. 明确禁止的混放

1. 不把 compiler 与 react-host 放在同包。
2. 不把 host-protocol 放进 builtin-renderers。
3. 不把 validation runtime 逻辑散落在各 renderer。
4. 不把 conformance case 直接写进 playground app。
5. 不把 debugger 读取逻辑硬编码在 kernel 热路径。
6. 不让 UI 层直接 import `kernel-core` / `kernel-actions` / `kernel-owners` 的内部实现目录。

## 7. 示例 app 结构

### `apps/playground`

职责：

1. authoring schema/example package 加载
2. 运行时 host 演示
3. renderer/theme/demo surface 展示

### `apps/debugger`

职责：

1. 连接 `debugger-sdk`
2. 展示 dependency/resource/reaction/transaction/owner/validation 视图

### `apps/conformance-runner`

职责：

1. 跑协议级合规测试
2. 输出 case pass/fail matrix
3. 验证 deterministic compile/runtime behavior

## 8. 最小起步 package 集

如果第一阶段希望最小可运行，可先只建：

1. `runtime-contracts`
2. `package-compiler`
3. `kernel-core`
4. `kernel-actions`
5. `kernel-validation`
6. `kernel-owners`
7. `renderer-contracts`
8. `runtime-facade`
9. `react-host`
10. `builtin-renderers`
11. `builtin-capabilities`
12. `conformance-kit`

`host-protocol` 和 `debugger-sdk` 也建议尽早建壳，即使先只放 types。

## 8.1 Mock 优先级

最先应该被 mock/stub 的不是 UI，而是：

1. deterministic clock / scheduler
2. in-memory trust validator
3. headless host bridge
4. in-memory snapshot / journal adapter
5. headless renderer registry
6. fake transport / resource backend

## 9. 与实验规范的映射

| Spec | Implementation owner |
| --- | --- |
| 01 | package-compiler + kernel-core 共同落地 |
| 02 | package-compiler |
| 03 | kernel-core + kernel-actions |
| 04 | kernel-owners + kernel-validation |
| 05 | host-protocol + renderer-contracts + react-host |
| 06 | kernel-core + host-protocol + conformance-kit |
| 07 | debugger-sdk + conformance-kit |
| 08 | examples + conformance-kit |
| 19 | package-compiler + kernel-owners + kernel-core + conformance-kit |

## 10. 与当前仓库的映射提示

这是一份**新仓库蓝图**，不是要求当前 `nop-chaos-flux` 物理目录立刻按此改造。

如果将来需要做迁移映射，可粗略参考：

1. `package-compiler` 方向上近似当前 compiler/runtime compile 代码
2. `kernel-core` 方向上近似当前 runtime store/transaction/resource/reaction 内核
3. `react-host` 方向上近似当前 React integration
4. `builtin-renderers` 逻辑 owner 对应当前多个 renderer 包，但这里不要求实验阶段立刻合并成单一物理包
