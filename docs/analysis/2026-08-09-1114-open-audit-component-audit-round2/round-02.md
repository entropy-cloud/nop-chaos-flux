# Round 02 — 注释-代码矛盾与 surface 状态发布范围不一致

> 执行：open-audit 2026-08-09（mission `component-audit-round2`）
> 视角：契约考古学家 + 死代码清道夫
> 去重：round-01 之外的新方向；未重复多维度审计已登记项（closeOnSubmit 系列 P1-01/P2-02..04/P3-05..10）。

## 发现

### [P2] H10 注释声称 comparator「已包含 fixedColumnLayout」，实际未比较

- **位置**：`packages/flux-renderers-data/src/table-renderer/table-body-row-rendering.tsx:571-616`
- **是什么**：注释（571-580 行）明示「The comparator now includes `fixedColumnLayout`, closing that stale-render gap」——但 `MemoizedDataRow` 的比较器（581-616）通读后**没有** `fixedColumnLayout` 比较项。
- **为什么值得关心**：功能上目前安全——`createFixedColumnLayout` 的 memo 输入（`mainColumns`、`rowSelection`、`showExpandColumn`）全部被比较器覆盖（columns 经 `areColumnsRenderEquivalent` 覆盖 `fixed`/`width`，`table-flattened-items.ts:88-104`），`fixedColumnLayout` 内容不变就不会造成 stale render。但注释的事实性声明是错的：下一个扩展比较器的人会信任「fixedColumnLayout 已被比较」这一前提，重蹈注释里描述的 stale-offset 陷阱。
- **修复方向**：把 `prev.fixedColumnLayout === next.fixedColumnLayout` 加进比较器（与注释一致），或改写注释如实说明「fixedColumnLayout 内容由其输入（columns/rowSelection/showExpandColumn）覆盖」。
- **信心水平**：确定（注释 vs 代码直读矛盾）。

### [P2] `publishClosedSummary` 与 sibling 的 owner-scope 解析不一致（含 use-surface-renderer 两处调用点 scope 来源不一致）

- **位置**：`packages/flux-runtime/src/surface-runtime.ts:56-72,74-89`；`packages/flux-renderers-basic/src/use-surface-renderer.ts:340,358,380`
- **是什么**：
  1. `clearSurfaceStatus`/`publishSurfaceStatus` 用 `entry.ownerScope ?? entry.scope.parent ?? entry.scope`；`publishClosedSummary` 只取 `scope.parent ?? scope`，**忽略 ownerScope**——公开 runtime API `publishClosed` 与 sibling 的状态发布目标解析不一致；
  2. use-surface-renderer 主 effect 调 `publishClosed({ scope: declarativeScope ?? node.scope })`（:340/:358），unmount cleanup 却用 `scope: current.declarativeScope ?? current.ownerScope`（:380）——同一函数两个调用点的 scope 回退链不同。
- **为什么值得关心**：当前调用面（声明式 surface，declarativeScope 通常有值、ownerScope 通常无）下无实际差异，属于潜伏契约分叉：一旦 publishClosed 被用于 action-style（ownerScope 有值）surface 或 declarativeScope 缺失的瞬态渲染，状态会发布到错误 scope，`$surface.status` 消费者读到幽灵状态。
- **修复方向**：统一三处 owner-scope 解析（`ownerScope ?? parent ?? self`），并统一 use-surface-renderer 两处回退链。
- **信心水平**：确定（代码直读）；当前实际影响范围窄（很可能）。

## 本轮未发现

无新 P0/P1 级发现。上一轮（round-01）的 table maxWidth 问题仍为唯一 P1。
