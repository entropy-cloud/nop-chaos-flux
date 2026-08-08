# Round 02 — Open-Ended Adversarial Review (`flux-renderers-industrial`)

> 执行：2026-08-08 17:12（mission driver `2026-08-08-171203`，本执行结果目录 `2026-08-08-1712-open-audit-industrial-hmi-component-audit`）
> 规范产出（完整优先级表 + 总评 + 盲区）：`docs/audits/2026-08-08-1712-open-audit-industrial-hmi-component-audit.md`
> 本文件为本轮发现的 round 落盘副本，遵循 `docs/skills/open-ended-adversarial-review-prompt.md` §结果落盘与重复执行。
> round-01 为同 mission driver 上一执行尝试的产出（11 条 F1–F11，状态 `planned`）；本轮独立切入其自报盲区，并核对 F1–F11 的 live/fixed。

## 触发视角

契约考古学家 × 恶意输入者 × 生命周期追踪者 × 新人开发者（mock 是否掩蔽产线）× 组合爆炸测试者。重点从 round-01 自报盲区（symbols 形状几何、connection/undo-redo 组合、engine/renderer 生命周期）切入。

## 本轮新发现（相对 round-01）

| #   | 优先级 | 位置                                                                                                                              | 一句话                                                                                                                                                  | 置信   |
| --- | ------ | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| A1  | **P0** | `symbols/composite.ts:94-100` + `pump.ts:33-42` + `gauge.ts:30-48` + leafer `core.esm.js:6090-6095` + `leafer-ui-mock.ts:125-137` | 复合图元按中心点放置子 Ellipse/Group，leafer 默认 top-left → gauge 表盘溢出符号框一半、设备转子偏右下；mock 不建模 bounds 故测试全绿却掩蔽              | 确定   |
| A2  | P1     | `connection-drag-controller.ts:73-78` + `connection-adapter.ts:67-80,142-148` + `connection-wiring.ts:49-59`                      | 生产连线恒生成 conn-0，第二次覆盖第一次 → junction 经 UI 最多持一条连线（redrag 路径 prod 死代码）                                                      | 确定   |
| A3  | P1     | `scada-engine.ts:444-498` + `viewport.ts:43-52`                                                                                   | 零缩放守卫自毁：`readZoomLayerScale` 对 0 返回 0（isFinite(0)=true），守卫早退反而把 scale=0 落地 → viewportToWorld 除 0；handlePluginMove 完全无零守卫 | 确定   |
| A4  | P1     | `renderer/scada-canvas.tsx:188,272,300` vs `editor/scada-editor-canvas.tsx:217`                                                   | runtime scada-canvas 忽略 meta.disabled/visible（编辑器遵守）→ 只读监控仍可交互，违反 AGENTS.md meta 契约                                               | 确定   |
| A5  | P1     | `editor-session.ts:78-84` + `runtime-mutators.ts:204-229` + `toolbox-runtime.ts:221-247` + `undo-redo-adapter.ts:28-30`           | load/importConfig 不 abort 进行中 transform 事务 → 拖拽中 load 后 pointerup 用旧快照 diff 出整页 bogus undo                                             | 很可能 |
| A6  | P1     | `runtime-mutators.ts:100-113` + `editor-engine.ts:221-239`                                                                        | applyUndoRedoDiff 引擎 applyDiff 半途抛错只回滚 working 不回滚 leafer → 画布与 working copy 永久背离                                                    | 很可能 |
| A7  | P1     | `toolbox/clipboard.ts:96-103,64-91`                                                                                               | 粘贴含连线 junction：reassignIdsRecursive 不改 custom.connections → target 指原件、connection id 重复                                                   | 确定   |
| A8  | P1     | `runtime-mutators.ts:84-91` + `toolbox-runtime.ts:174-191`                                                                        | removeWorkingSymbol/cutSelection 不 prune dangling connection 声明 → 保存后永久幽灵引用（listAllConnections dangling 检测恰证此态被容忍）               | 确定   |
| A11 | P1     | `instrument/level.ts`/`thermometer.ts`/`progress.ts`（无 parts.resize）vs `composite.ts:72-78` + `pump.ts:48-55`                  | level/thermometer/progress 容器永不随几何尺寸 resize（仅 extent 变），与 sibling device/gauge resize 纪律不一致                                         | 确定   |
| A12 | P1     | `symbols/pipe/pipe-junction.ts:103-137`                                                                                           | applyProps 不把 stroke/fill 路由到 stubs（只 body）→ 改色半截接线头不变色                                                                               | 很可能 |

P2 簇（12 条，见规范产出末尾表）：冗余手写 memo（普遍）、interactionOverlay 销毁后惰性重建、engineRef 未清、错误去重 Set 无界（round-01 F9 仍 live）、visual-state 默认绑定盲、round-rect 固定圆角、bidirectional 缺 startArrow、空 children 崩溃、Group 承载几何属性、config-sync 双跑、paste 无 id 碰撞检查、align/distribute 嵌套局部坐标。

## round-01 核对结论

- F1（cloneConfig variables）→ **已修复**（editor-session.ts:118 现有守卫）。
- F2（assertShape NaN/Infinity）→ **仍 live**，本轮 A10 重报（helpers.ts:55 未变）。
- F3（拖拽 id 碰撞）→ **仍 live**，并入 A2/A7/A8 的 id/connection 纪律主题。
- F4（validate 无广度上限）→ **仍 live**，本轮 A9 重报。
- F9（错误去重 Set 无界）→ **仍 live**，P2 簇收录。
- F5/F7/F8/F10/F11 → 未变，P2，不重报。
- F6 → 部分缓解（custom 深克隆已统一，variables/viewport/background 仍浅）。

历史裁定核对：`reopened-design-decisions-and-audit-adjudications.md` 5 条均针对 form/basic/react 包，与 industrial 无重叠；本轮无旧问题重报。

## 关键判定

- **本轮最高价值 = A1（P0）**：机制三重交叉定证（leafer 源码 + mock 抛 bounds + 内部约定矛盾），并暴露「mock 掩蔽 live 几何缺陷 + 测试网缺真实渲染断言」的系统性盲区。round-01 明确把「symbols 形状族几何正确性」列为盲区未覆盖，本轮正面命中。
- **P0 唯一未完成的验证**：未在真实浏览器跑一次 boxBounds 断言（leafer 需真实 canvas，JSDOM/happy-dom 不可）。建议 remediation 第一步即补此真实渲染回归网。

## 下一轮建议切入点

- 真实 leafer 渲染回归网（验证 A1 并堵几何漂移同类）。
- leafer 交互/视口数学（interaction-overlay/hit/anchor-snap）的 mock↔真实漂移。
- 用最小复现 benchmark/用例固化 A3（零缩放）、A5（拖拽中 load）、A6（引擎 applyDiff 抛错）触发点。
