# 733 审计修复 R2·R2.11：契约补测—print+xlang（P1-MA4.4-010/011）

> Plan Status: active
> Last Reviewed: 2026-10-24
> Source: `docs/backlog/audit-remediation-r2-roadmap.md` R2.11（MR2.0/plan 713 展开）；`docs/audits/2026-10-21-2001-arm2-MA4.4-designer-office-tests.md` §P1-MA4.4-010/011（各含最小补强规格）；owner doc `docs/architecture/frontend-programming-model.md`
> Related: renderer-env.md:155 INV capability 分支（openSocket 负路径）；先例 plan 723-732（同构契约补测链）
> 编号 runway：732 为 R2.10（本线）；733 本 plan；ARC 线从 734 起避开

## Purpose

两条契约补测：010 xlang-debug env 适配层 envelope 映射（createCompileService：status!==0 → 单条 error 诊断、status===0 → diagnostics 透传/空集——`grep createCompileService` 全包测试 0 引用）+ INV capability 负路径（openSocket 缺省 → 组件内连接失败呈现 :135-143，renderer-env.md:155「使用前必须 if (env.openSocket)」承诺）；011 print bind.ts 三发射点判别（text exec 期 EVAL :221-228 / table-source compile 期 SYNTAX :266-274 / table-source exec 期 EVAL :288-295——red-verification D19-02 只钉单元格路径，7 发射点只钉 4）。双 finding 回填 `closed`。

## Current Baseline（2026-10-24 live，HEAD `304dbf5f7` 实测）

- **010**：`packages/flux-xlang-debug/src/assembly/compile-service.ts`（47 行全量已读：envelope 映射 + 默认端点 `/r/nop-xlang-debug/compile` + headers）；INV 负路径 `xlang-debug-editor.tsx:135-143`（`if (!openSocket) setConnectError('env.openSocket 不可用…')` + :195 注记）。assembly 无既有测试；真 EditorView happy-dom 惯用法沿 732 T3。
- **011**：`packages/flux-print-core/src/bind.ts` 三发射点——text exec EVAL :221-228（evalError 且 missingPaths 空）、table compile SYNTAX :266-274（compileExpression throw）、table exec EVAL :288-295（exec throw）。harness：`bind.test.ts` element()/template() 惯用法 + env stub。
- roadmap R2.11 行 `todo`（:108）；arm2-index :164/:165（010/011）状态 `open`、修复列 R2.11。

## Goals

- 两契约测试落地（xlang-debug envelope 表驱动 + INV 负路径 1 文件；bind.ts 三发射点扩展 1 文件），各带红证。
- 双 finding 回填 `closed`；roadmap R2.11 翻转。

## Non-Goals

- 不改任何实现代码（补测行纪律）；不处理 MA4.4 其余 finding；并发线隔离。

## Scope（必填节）

### In Scope

- `packages/flux-xlang-debug/src/assembly/compile-service.test.ts`（新建，010 envelope 表驱动）
- `packages/flux-xlang-debug/src/assembly/xlang-debug-inv-capability.test.tsx`（新建，010 INV 负路径——真装配渲染沿 732 T3 真 EditorView 惯用法）
- `packages/flux-print-core/src/bind.test.ts`（扩展，011 三发射点表驱动）
- `docs/audits/arm2-index.md` 回填 + daily log + roadmap R2.11 翻转（激活/收口两提交）

### Out Of Scope

- 实现代码变更；R2.12-R2.15 与 R3.x；并发线（ARC WIP）。

## Failure Paths

| 可测场景编号 | 触发                                                       | 行为                                                                | 可重试 | 用户可见表现 |
| ------------ | ---------------------------------------------------------- | ------------------------------------------------------------------- | ------ | ------------ |
| api-shape    | 装配渲染/hook API 形状与规格不符                           | 以既有先例（732 T3 真 EditorView、bind.test 惯用法）校正，plan 补记 | 是     | 不适用       |
| defect-found | INV 负路径探针显示缺省 openSocket 时仍发起连接（守卫失效） | 停：升级 live defect finding，plan 记录不越权修复                   | 否     | 不适用       |
| flake        | 装配渲染 CodeMirror 慢                                     | waitFor 超时放宽沿 732（5s）                                        | 是     | 不适用       |

## Test Strategy

本档选择：**必须自动化**——红证 = 临时变异：010 删 envelope 的 status!==0 分支（直返 data）→ 错误码断言红；011 删三发射点各自分支（三分支三变异）→ 对应断言红。判别机制（Rule 13）：各变异即分支本体（审计「删分支必挂」原文）。

## Execution Plan

### Phase 1 - 两测试落地（各先红后绿）

Status: planned
Targets: 两测试文件（bind.test.ts 扩展）

- Item Types: `Proof`

- [ ] T1（010，compile-service.test.ts）：表驱动 fetcher 状态矩阵——status 0+diagnostics → 透传；status 0+null data → []；status 401/403/500 → 恰一条 error 诊断 message 含 `status N`；默认端点断言（fetcher 收 `/r/nop-xlang-debug/compile`）+ 自定义 endpoint/headers 透传。红证：**M-A** 删 status!==0 分支（直返 data?.diagnostics ?? []）→ 401/403/500 行红。
- [ ] T2（010 INV，xlang-debug-inv-capability.test.tsx，沿既有 assembly.test.tsx mock useCodeMirror 惯用法——渲染单元钉 **XlangDebugEditor** 装配组件（守卫 :135-143 在其中；review R1 m1：XlangDebugEditorRenderer 需 Runtime/Scope providers 且守卫不在其中，:196-202 openSocket 提取直通面留 Non-Blocking Follow-up）：无 openSocket 最小 props（sourcePath/serverUrl/compile stub/getToken）→ 渲染断言**特征文本**「env.openSocket 不可用」在场 + onSessionClosed spy **零调用**；对照：有 WebSocketConnection 形状 fake（沿 debug-client.test.ts fake-connection 惯用法——review R1 m4：裸 vi.fn 致 conn.onopen= TypeError unhandled）→ 特征文本缺席。红证：**M-D** 守卫删除（无条件 connect→openSocket undefined 调用 throw→onSessionClosed 收 openSocket failed）→ 特征文本变为 closed:…（原文本缺席红）+ onSessionClosed 被调（双判别——review R1 m2：非 element-presence）。探针先行：现状守卫在位（:135-143 live 已核），若探针显示缺省即连接 → contract-gap 停停升级。
- [ ] T3（011，bind.test.ts 扩展三用例）：**a** text exec EVAL——text 元素表达式 `${obj.constructor}` + data `{obj:{}}`（危险成员键 compile 期放行、exec 期抛、missingPaths 空——review R1 m3：未知路径表达式不合资格，evaluator.ts:367-377 onUndefinedVariable 与 throw 共现→missingPaths 非空走 PATH_MISSING）→ PRINT_BIND_EVAL 诊断；**b** table compile SYNTAX——table.source 非法表达式 → PRINT_BIND_SYNTAX；**c** table exec EVAL——source 可编译但 exec 抛 → PRINT_BIND_EVAL。红证：**M-C** 三分支各自删除（三变异）→ 对应断言红。

Exit Criteria:

- [ ] 测试绿证 + 红证留痕（实测计数填入；变异复员，实现文件 diff 空）
- [ ] flux-xlang-debug + flux-print-core 两包套件全绿（pnpm --filter 正确 cwd 口径，计数实测）

### Phase 2 - 索引回填与收口

Status: planned
Targets: arm2-index、roadmap、daily log

- Item Types: `Proof`

- [ ] arm2-index 两行回填：:164（010）/:165（011）→ `closed` + 注记；Last Updated 滚动
- [ ] roadmap R2.11 `planned`→`done` 翻转（IN closure commit；激活提交先行 `todo`→`planned`）

Exit Criteria:

- [ ] arm2-index 两行状态与注记实测一致（open 36→34）；roadmap R2.11 行 `done`（收口提交内）
- [ ] daily log R2.11 条目在场

## Closure Gates

- [ ] 全量门禁：typecheck / build / lint（实测 Tasks: N successful 计）+ test 全套件
- [ ] `pnpm check` 零新增红
- [ ] 红证全部复员（实现文件 `git diff HEAD` 空）
- [ ] 独立 closure audit（fresh sub-agent，输入=plan+diff summary+验证输出）：双 finding 闭环判定、红证判别力复核（auditor 独立重演至少 2 个变异）
- [ ] 收口提交（flip `done` IN commit；记录复核结论）

## Deferred But Adjudicated

- **010 INV 正路径深度**：有 openSocket 时的 WS 连接全链属 WS 主干 21 用例既有守护面（audit 证据段），本行只钉负路径呈现。Classification: out-of-scope improvement。Why Not Blocking Closure: 最小补强即负路径断言。Successor Required: 否。
- **011 去重面**：PRINT_BIND_PATH_MISSING 同元素去重逻辑（:229-236）已具既有用例覆盖（red-verification 面），不在本行三发射点范围。Classification: out-of-scope improvement。Why Not Blocking Closure: 审计点名 3 发射点即全量规格。Successor Required: 否。

## Draft Review Record

- R1（fresh sub-agent agent_4aceb2f1，2026-10-24）：**PASS** 0B/0M/4m——T1 矩阵完备/端点透传核验；T2 渲染单元钉 XlangDebugEditor（守卫 :135-143 在其中；Renderer 需 providers）+ M-D 双判别机制（特征文本+onSessionClosed spy）+ 对照 fake-connection 惯用法；T3-a 可构造性（`${obj.constructor}` 危险成员键 exec 期抛、未知路径共现不合资格）；行号 :164/:165/结构/词表全核验。m1-m4 随激活落。

## Non-Blocking Follow-ups

- XlangDebugEditorRenderer :196-202 openSocket 提取直通面（env→装配 props 一行透传）——T1+T2 合并覆盖间隙，留 log 线索非独立行。

## Closure

- [x] R1 共识（PASS pass-with-minors，m1-m4 随激活落）后激活提交（Status→`active` + roadmap R2.11 `todo`→`planned` IN commit）
- [ ] 执行 Phase 1/2 → Closure Gates 全过 → closure audit PASS → 收口提交（Status→`completed`、flip `done` IN commit、记录复核结论于本节）
