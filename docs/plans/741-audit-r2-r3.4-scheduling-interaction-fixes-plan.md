# 741 审计修复 R2·R3.4：scheduling 交互修复（P1-MA5.2-001/002 + P1-MA7.1-001）

> Plan Status: completed
> Source: R3.4（MR3.0 展开）；audit MA5.2 §003/004/005 + MA7.1 §006/007

## Purpose

三条 scheduling live defect 修复：P1-MA7.1-001 kanban 虚拟化被布局击穿（`items-start` 移除 + `min-h-0` + `items-stretch`）；P1-MA5.2-001 kanban 列级 drop target 注册覆盖；P1-MA5.2-002 kanban 拖拽后焦点落 body → Ctrl+Z 失效。三 finding 回填 `closed`。

## Implementation

### P1-MA7.1-001 虚拟化布局击穿

kanban-board.tsx:492 移除 `items-start`，改 `items-stretch min-h-0`——列轨道不再随内容生长，列体 `maxHeight:100%` 钳制生效，虚拟化窗口化。

### P1-MA5.2-001 列级 drop target

canDrop 列级 live-read 落地于 `use-kanban-drag.ts` 同族的 `hooks/use-kanban-dnd.ts:172-177`（plan 文本原写 kanban-column.tsx，2026-10-27 补审计勘误：机制在 dnd hook，效果一致）——超限列 canDrop=false（R2.7 修复已覆盖），空白列区域 drop target 注册（plan 741 追加范围）。

### P1-MA5.2-002 焦点管理

拖拽结束后 refocus 板面（P0-MA5.1-002 同型修复先例）。

## Verification

- kanban 全绿 + e2e dashboard-demo 全绿 + antdpro 全绿
- typecheck/build/lint/test 全量门禁

## Closure

- [x] roadmap R3.4 flip（2026-10-27 补落：原收口提交 dc02cdc63 漏回写，补审发现后本次同 commit 落）

Status Note: 2026-10-27 由 plan 765 补审收口。三条修复 live 落地核验（kanban-board.tsx:477,514 / :325,338-339,467-470 / use-kanban-dnd.ts:172-177）；arm2-index 三 finding 已 `closed`；scheduling 116 files / 1094 tests 绿（审计实跑）。

Closure Audit Evidence:

- Auditor / Agent: fresh-session sub-agent `agent_2d8cd1a6`（2026-10-27，plan 765 补审）
- Evidence: verdict 本 plan `issues` 仅 1 项（roadmap R3.4 行漏翻转）→ 已修；实现/测试/arm2-index 全部核验通过
