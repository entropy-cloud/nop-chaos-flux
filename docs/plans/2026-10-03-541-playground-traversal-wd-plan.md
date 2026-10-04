# 541 Playground 全遍历 W-D：AI 家族 14 页遍历

> Plan Status: completed
> Last Reviewed: 2026-10-03
> Source: `docs/analysis/2026-10-03-playground-full-traversal-ux-roadmap.md` §五（W-D）
> Related: plan 537-540；R13 roadmap

## Purpose

AI 家族 14 页（`#/ai-*` 域路由：ai-chat、ai-tools、ai-widgets、ai-hitl、ai-citations、ai-conversations、ai-persistence、ai-coverage、ai-component-handle、ai-rich-text、ai-linkage、ai-p4、ai-virtual-scroll、ai-attachments）逐页按钮遍历 + 核心交互流（发送消息→流式渲染、工具调用环、HITL 审批、分支/联动）实机验证，确认卡回填 R13 roadmap §六 W-D 表。

## Current Baseline

- 从未逐按钮确认（roadmap §一 W-D 行）。
- AI 页依赖 mock connector（无需真实 API key）；流式为模拟端到端。
- 方法与探针已沉淀（W-A1~W-C）；聊天类页面交互以真实输入 + 发送按钮为主路径。

## Goals

- 14 页逐页遍历；每页至少一条核心交互流实机跑通（发送/审批/工具调用/切换）。

## Non-Goals

- W-A/W-B/W-C/W-E 页面；AI 渲染器内核改动；真实 LLM API 集成测试。

## Scope

### In Scope

- 上述 14 个 `#/ai-*` 路由页；遍历期小修。

### Out Of Scope

- 渲染器重构；需要外部 API key 的真实连接形态（mock 即验证对象）。

## Failure Paths

| 可测场景               | 触发                                 | 行为                                                                     | 可重试 | 用户可见表现 |
| ---------------------- | ------------------------------------ | ------------------------------------------------------------------------ | ------ | ------------ |
| 流式未完成即断言       | 发送后立即检查                       | 发送后等待流式落定（≥2.5s）再断言气泡                                    | 是     | 无           |
| localStorage 残留      | ai-persistence 会话持久化            | 遍历后清理该页 localStorage 或以刷新还原为验证口径                       | 是     | 无           |
| Web Speech 不可用      | ai-p4 语音输入（浏览器权限）         | 以按钮存在 + 点击无崩溃为准，语音能力不实点                              | 是     | 降级呈现     |
| 虚拟滚动窗口化断言假象 | ai-virtual-scroll 仅挂载视口窗口消息 | 以「视口窗口挂载 + 零错误」为口径（W-C canvas 页同款），DOM 总量断言不做 | 是     | 无           |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**建议有测**（AI 家族已有 ai-coverage e2e 页面与组件测试；遍历期非平凡修复补 focused 测试）。

## Execution Plan

### Phase 1 - 遍历与修复（14 页）

Status: completed
Targets: 上述 14 页

- Item Types: `Proof | Fix | Follow-up`

- [x] 14 页逐页遍历 + 每页一条核心交互流实机验证；id 耦合顺带核对（无新增 id 耦合）
- [x] P1/P2 处置；P3 登记——P1 零；P2 一项书面改判（ai-conversations 会话列表传播链 → 渲染器级 follow-up，roadmap §七 W-D 段）
- [x] roadmap §六 W-D 表 14 行回填（13 ✅ + 1 ⚠️1）

Exit Criteria:

- [x] 14 行矩阵回填且无 ❌（⚠️1 为 P2 改判项非 P1）；P1 清零；处置书面化

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，general-purpose）
- Verdict: `pass-with-minors`（2 Minor 当轮收敛）
- Rounds: 1
- Findings addressed:
  - Minor-1：originStorage → localStorage 笔误修正。
  - Minor-2：ai-virtual-scroll 窗口化渲染断言口径补入 Failure Paths。

## Closure Gates

- [x] 14 页遍历完成，矩阵回填，无 ❌，P1 清零
- [x] P2 修复或书面改判；处置登记 roadmap（ai-conversations 传播链改判已登记 §七，含修复方向与对照形态）
- [x] 受影响的 owner docs 已同步，或 No owner-doc update required（本波无代码变更，No owner-doc update required）
- [x] 非平凡修复有 focused 测试或探针记录（诊断记录入 daily log；e2e ai-conversations.spec.ts 现状复核）
- [x] 不存在被静默降级的 in-scope live defect（P2 改判项为演示页数据流缺陷，dispatch 层工作且有 e2e 断言，改判书面化并登记修复方向）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [x] `pnpm typecheck` / `pnpm build` / `pnpm lint` / `pnpm test` / `pnpm check` 全绿

## Deferred But Adjudicated

（执行期回填）

## Non-Blocking Follow-ups

- 渲染器级缺口登记 roadmap §七。

## Closure

Status Note: W-D 完成——14/14 页遍历零 JS 错误（13 ✅ + ai-conversations ⚠️1），核心交互流全实证（流式/工具环流/HITL/双联动/持久化），P2 一项书面改判为渲染器级 follow-up。全量门禁 full-green，独立子 agent closure audit approved。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，general-purpose）
- Evidence: 审计结论「通过」（2026-10-03）。P2 改判两项证据核实成立：e2e spec L22-31 注释明示仅断言接线无错、可视循环未覆盖；use-conversation.ts return 含 controller（store 循环完备、缺陷在演示页 schema 传播链）。roadmap §六 W-D 14 行 + §七 登记段 + daily log 均 live 核实；playground 测试 41 文件 408/408 复证。

Follow-up:

- 渲染器/演示页数据流 follow-up：ai-conversations 会话列表传播链（roadmap §七 W-D 登记）。
