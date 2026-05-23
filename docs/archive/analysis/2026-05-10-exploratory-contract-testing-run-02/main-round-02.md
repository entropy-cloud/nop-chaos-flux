# main-round-02 — Verification & Triage

- 执行者身份：主执行者
- 本轮检查的契约或方向：复核子 agent A-E 的候选问题

## 子 agent 结果汇总

| 子 agent | 方向                                | 假设数 | 候选数 | 经验证成立                        |
| -------- | ----------------------------------- | ------ | ------ | --------------------------------- |
| A        | flux-formula 评估契约               | 95     | 3      | 0 (均为设计观察，非 bug)          |
| B        | action-core 调度与控制流            | 40     | 5      | 1 (withRetry failureCount 不一致) |
| C        | compiler schema 契约与诊断          | 90     | 3      | 3 (已合并为 2 类)                 |
| D        | flux-react hook 与 surface 生命周期 | 16     | 0      | 0                                 |
| E        | core 工具与数据结构契约             | 60     | 4      | 0 (均为 by-design)                |

## 经验证确认的新问题类别

### ECT-001: withRetry failureCount 在 soft-fail 路径少计 1 次

- **发现者**: 子 agent B
- **测试文件**: `packages/flux-action-core/src/__tests__/contract-retry-and-classification.test.ts`
- **稳定契约来源**: `RetryResult.failureCount` 应统计所有失败尝试次数
- **现象**: 当 `shouldStop` 返回 false 且最终 attempt 超过 retryTimes 时，`break` 前不增加 `failureCount`，而 throw 路径在 catch 中正确累加。导致同参数下 throw 路径 `failureCount=3` 但 soft-fail 路径 `failureCount=2`。
- **影响范围**: `withRetry` 所有使用 soft-fail (shouldStop 返回 false) 的调用者
- **根因**: `operation-control.ts:221-223` 的 `break` 路径缺少 `failureCount += 1`
- **修复成本**: 简单 (一行改动)，但需确认产品意图
- **状态**: `open` (需确认 failureCount 语义)
- **去重键**: `withRetry-failureCount-soft-fail-undercount`

### ECT-002: validate() 重复调用 analyzeSchemaInput 导致重复诊断和双倍 schemaValidator

- **发现者**: 子 agent C
- **测试文件**: `packages/flux-compiler/src/schema-compiler-contract-exploration.test.ts` (H78, H86)
- **稳定契约来源**: `validate()` 应为每个 schema 节点产生恰好 1 份诊断
- **现象**:
  - `validate()` 先调用 `compileSchemaToTemplateNodes()` (内部调 `analyzeSchemaInput`)，再显式调用 `analyzeSchemaInput()`，导致:
    - 每个 unknown-renderer-type 产生 2 条重复诊断 (路径格式不同: `$[0]` vs `/0/type`)
    - `renderer.schemaValidator` 回调被调用 2 次
- **影响范围**: 所有使用 `validate()` 的消费者
- **根因**: `validation-compiler.ts` validate() 函数同时调用 compile (内含 analyze) 和 analyze
- **修复成本**: 中等 (需理解 validate pipeline 全貌，避免遗漏校验)
- **状态**: `open`
- **去重键**: `compiler-validate-double-analyze`

### ECT-003: compileNode() 对未知 renderer 抛出不可读 TypeError (已修复)

- **发现者**: 子 agent C
- **测试文件**: `packages/flux-compiler/src/schema-compiler-contract-exploration.test.ts` (H83)
- **稳定契约来源**: 公共 API 应提供有意义的错误信息
- **现象**: `compileNode()` 对未知 renderer type 直接传入 undefined renderer 给内部函数，导致 `TypeError: Cannot read properties of undefined`。而 `compile()` 同场景抛出清晰的 "Renderer not found for type: xxx"。
- **影响范围**: 直接使用 `compileNode` API 的工具 (IDE 集成、schema 编辑器等)
- **根因**: `compileNode` 缺少 `registry.get()` 检查
- **修复**: 在 `compileNode` 中添加 renderer 查找和 null check
- **状态**: `fixed`
- **去重键**: `compiler-compileNode-opaque-crash-unknown-type`

## 已否定的候选

- A-C1: scope prototype method access — scope proxy 已处理，非 evaluator 缺陷
- A-C2: INT(null) vs INT(undefined) — JS 语义差异，非 bug
- A-C3: REPLACE with empty string — JS split/join 语义，quirky but consistent
- B-C1: then branch failure replaces outer result — by design
- B-C2: onError branch result discarded — by design (existing test verifies)
- B-C4: ok:true + cancelled:true error undefined — by design
- B-C5: ok:false + skipped:true neutral — by design (skipped priority)
- E-C1: isPlainObject returns true for class instances — known design limitation
- E-C3: shallowEqual ignores inherited properties — by design (Object.keys)
- E-C4: getIn allows array prototype methods — by design (only **proto** blocked)

## 本轮覆盖了哪些主方向

5 个方向全部覆盖：flux-formula、action-core、compiler、flux-react、core utilities

## 本轮新增方向

全部 5 个方向均为新覆盖 (run-01 未涉及)

## 下一批计划

根据首次覆盖结果，以下方向尚未触及：

- cross-package composition (core→runtime→react→renderer 边界失真)
- renderer contracts (flux-renderers-basic / form / data)
- scope ownership & isolation edge cases
- async data source / API data source contracts
- surface lifecycle (dialog/drawer) 在 renderers 层的表现
