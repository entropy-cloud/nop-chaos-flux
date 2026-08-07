# Round 01 — 渲染器行为缺陷扫描（form / data / scheduling / content / runtime 核心）

> 执行：open-audit 2026-08-07（mission `component-audit`）
> 视角：异常路径侦探 + 组合爆炸测试者 + 死代码清道夫
> 去重：本批全部经代码直读验证；未重复 08-07 multi-audit 已登记项（22-13 gantt 句柄 reaction、22-14 gantt design.md、23-1/23-4 kanban 假绿、03-01..03-03 工具/文档项、16-1..16-5 文档行号项）。

## 方法与验证

4 个子 agent 分域扫描（form / data / scheduling+ai+content / runtime+compiler+action），主 agent 对全部 P1 候选逐条代码直读复核。以下条目均为复核通过项。

## 发现（详见最终报告）

- **P1 家族 A**：`form-load-action.ts` 三个相互独立缺陷（StrictMode autoLoad 静默丢弃 / 失败永不重试 / refresh 与 autoLoad 竞态覆写）——已逐行验证（见最终报告 §1.1）
- **P1**：CRUD `loadAction` + `pagination.mode:'infinite'` 组合逐页替换 rows 竞速到末页（crud-renderer.tsx:289-307 + crud-renderer-load.ts:240）
- **P1**：list onItemClick 派发缺 evaluationBindings/event（`key` 在 action args 不可解析）+ 扫描器对 `owner.events` receiver 形态盲区
- **P1**：kanban `component:moveCard` 目标列不存在时卡片孤儿化且返回 ok:true（kanban-board.tsx:393-407 + kanban-helpers.ts:15-22）
- **P1**：kanban undo 删除卡片后恢复丢失 meta（kanban-board.tsx:380-388 只存 data + addCard 重建 meta:{}）
- **P1**：barcode torch 可用性检查仅在挂载时执行一次、生产流程永不出现（use-barcode-torch.ts:44-59）
- **P1**：gantt 键盘/滚动监听在 loading/empty 首挂载时永久丢失（use-gantt-keyboard.ts:130-139 + use-gantt-scroll.ts:31-51）
- **P1**：calendar 快速点击遗留长按定时器 → 下次无关 pointerup 弹类型选择器（use-calendar-drag-create.ts:60-117,148-175）
- **P1**：diff-view 4 个 reaction 字段只 ready 不 dispatch（diff-view-renderer.tsx:291-295，22-13 家族新实例）
- **P1**：kanban 过滤态下 roving 键盘导航索引错位（kanban-column.tsx:155-192 + kanban-card.tsx:67）
- **P1**：remote search 选中值回显为原始 id（input-choice-utils.ts:180-223 allOptions 不含 remoteOptions）
- **P1**：async-data 每次 run/poll 创建 child scope 永不 dispose（api-data-source-controller-runtime.ts:248 + data-source-runtime-utils.ts:93）——ownedScopeDisposers 无界增长
- **P2 批**：polling.stopWhen 死配置、$crud.refreshing 恒 false、importsReady 死守卫、input-choice append 空远端全量展示、finishAction 恒等函数死管道、surface scope dispose 缺口 + GC 测试绕过、barcode 连续同值丢弃/硬编码英文、carousel/qrcode 硬编码文案、copy setTimeout 无清理、CRUD 双 fetch/retry 跳页、pagination clamp 缺失等

## 结论

本轮产生 12 条 P1 + ~15 条 P2。下一轮切入：docs-代码对账 + scripts 门禁盲区收尾扫描。
