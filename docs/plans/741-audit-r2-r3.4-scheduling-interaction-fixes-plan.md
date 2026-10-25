# 741 审计修复 R2·R3.4：scheduling 交互修复（P1-MA5.2-001/002 + P1-MA7.1-001）

> Plan Status: active
> Source: R3.4（MR3.0 展开）；audit MA5.2 §003/004/005 + MA7.1 §006/007

## Purpose

三条 scheduling live defect 修复：P1-MA7.1-001 kanban 虚拟化被布局击穿（`items-start` 移除 + `min-h-0` + `items-stretch`）；P1-MA5.2-001 kanban 列级 drop target 注册覆盖；P1-MA5.2-002 kanban 拖拽后焦点落 body → Ctrl+Z 失效。三 finding 回填 `closed`。

## Implementation

### P1-MA7.1-001 虚拟化布局击穿

kanban-board.tsx:492 移除 `items-start`，改 `items-stretch min-h-0`——列轨道不再随内容生长，列体 `maxHeight:100%` 钳制生效，虚拟化窗口化。

### P1-MA5.2-001 列级 drop target

kanban-column.tsx 卡片 drop target 增加 canDrop 检查——超限列 canDrop=false（R2.7 修复已覆盖），空白列区域 drop target 注册（plan 741 追加范围）。

### P1-MA5.2-002 焦点管理

拖拽结束后 refocus 板面（P0-MA5.1-002 同型修复先例）。

## Verification

- kanban 全绿 + e2e dashboard-demo 全绿 + antdpro 全绿
- typecheck/build/lint/test 全量门禁

## Closure

- [x] roadmap R3.4 flip
