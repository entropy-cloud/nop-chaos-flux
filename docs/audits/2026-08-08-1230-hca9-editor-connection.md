# HCA9 Editor Connection 层审计记录

> 日期：2026-08-08
> Plan：`docs/plans/2026-08-08-1230-2-industrial-hmi-hca9-editor-connection-audit.md`
> Work Item：HCA9. Editor connection 审计
> 审计对象：`packages/flux-renderers-industrial/src/editor/connection/`（6 源文件，`wc -l` 实测 291/151/162/97/70/58 = Σ829）
> 方法：`docs/skills/deep-audit-prompts.md` 23 维包级深审（复杂交互层，维度 21 显示与定位 / 22 集成接线 / 23 测试有效性 必选触发）
> 基线：`pnpm --filter @nop-chaos/flux-renderers-industrial test` = 97 文件 / 1311 测试全绿（HEAD）
> 结论：**零 P0 / 零 P1 live defect**；5 项 P3 归 HCA-CR backlog；1 项 P2 低成本（dim 23 测试有效性）当场修复；#1 维持 watch-only residual；#8/#3 先验修复复核成立。

---

## 1. 逐文件 23 维深审 finding 表

> 每条 finding 含「维度 / 结论 / `文件:行` 证据 / P0-P3 triage」。维度族：A 架构边界(01-03) / B 运行时状态(04-08) / C 渲染器UI(09-12) / D 工程质量(13-15) / E 文档一致性(16-18) / F 运行时鲁棒性(19-20) / G 复杂交互正确性(21-23，必选)。

### 1.1 `connection-adapter.ts`（291 行）— 连线 CRUD + dangling 检测 + 端点解析

| 维度          | 结论                                                                                                                                                                                              | 证据                            | Triage              |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | ------------------- |
| 21 显示与定位 | `commitConnectionDrag` 状态机正确：无候选→undefined(noop)；有候选→写入 target/x/y/direction，findIndex 替换或 push。direction 默认 `'out'`（M2 默认），redrag 复用 originalConnection.direction。 | `connection-adapter.ts:126-156` | PASS                |
| 21 显示与定位 | `recomputeJunctionAfterMove` 联动算法正确：读 junction 世界几何（含 group offset，经 collectWorldBounds），fallback 到 local 坐标（orphan 防御），调 recomputeJunctionConnections。               | `connection-adapter.ts:167-203` | PASS                |
| 21 显示与定位 | `listAllConnections` dangling 检测递归 collectIds（含 group 子树）—— **#8 先验修复复核成立**，group child target 不误报 dangling。                                                                | `connection-adapter.ts:269-290` | PASS（#8 baseline） |
| 13 类型安全   | `readConnections`（anchor-snap.ts:158-161）对 `custom.connections` 做 `Array.isArray` 守卫后 `as ScadaPipeConnection[]` cast——动态边界 cast，符合低代码动态边界克制口径。                         | `anchor-snap.ts:158-161`        | PASS                |
| 19 错误处理   | 纯逻辑无 try/catch 需求；undefined junctionNode 经 `junctionNode ? readConnections(...) : []` 守卫；NaN/Infinity 由 connection-link.ts safeDiv 兜底。                                             | `connection-adapter.ts:133`     | PASS                |

**该文件零 P0/P1/P2。**

### 1.2 `connection-drag-controller.ts`（151 行）— 拖拽状态机生产驱动器

| 维度            | 结论                                                                                                                                                                             | 证据                                    | Triage             |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ------------------ |
| 21 状态机正确性 | pick/drag/release 状态转移穷尽：beginDrag 校验 `type === 'scada-pipe-junction'`；moveDrag/endDrag 在 `!dragState` 时 noop（防未 pick 即 drag / release 后重入）。                | `connection-drag-controller.ts:73-118`  | PASS               |
| 22 集成接线     | moveDrag 重算 candidates 后 `candidates.find(c => c.id === currentCandidate.nodeId)` 取 candidateBounds 传 deriveOverlayState——接线完整（state→overlay）。                       | `connection-drag-controller.ts:84-98`   | PASS               |
| 21 命中正确性   | `findJunctionAtPoint` 消费 collectWorldBounds（含 group parent offset 累加），嵌套 junction 世界坐标命中正确。                                                                   | `connection-drag-controller.ts:127-144` | PASS               |
| 15 性能         | `moveDrag` 每次 pointermove 调 `collectSymbolBounds(getSymbols())` 全量重建 O(n)。design §4.2 关键约束 3 建议复用 hit.ts getByPoint 预检。编辑器规模下可接受，但属热路径观察项。 | `connection-drag-controller.ts:87`      | **P3**（→ HCA-CR） |

**该文件零 P0/P1/P2。1 项 P3。**

### 1.3 `anchor-snap.ts`（162 行）— 端点吸附算法

| 维度                  | 结论                                                                                                                                                                                                                           | 证据                     | Triage             |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------ | ------------------ |
| 21 吸附正确性（必选） | `findSnapCandidate` 阈值边界正确：`distSq <= thresholdSq`（恰等于阈值→吸附，inclusive 合理）；空候选集→undefined（free endpoint 降级）；excludeIds 排除自身 junction（C3）；退化 bounds（width/height<=0）跳过。               | `anchor-snap.ts:112-137` | PASS               |
| 21 坐标变换           | `normalizedToWorld` / `worldToNormalized` 公式与 design §4.1 + pipe-junction.ts:83 一致；worldToNormalized 不钳制[0,1]（C1 接受）。                                                                                            | `anchor-snap.ts:75-93`   | PASS               |
| 21 候选排序           | 等距候选去重：`distSq < best.distSq`（严格 <），等距时首入数组者胜（按 candidates 顺序确定性）。可接受但未文档化。                                                                                                             | `anchor-snap.ts:130`     | **P3**（→ HCA-CR） |
| 16 文档-代码          | 源码注释 `anchor-snap.ts:58`「顶/底/左/右四边，每边三档位（共 12 锚点，角点重复经去重保留首命中边）」——EDGE_ANCHORS 实际 8 条（4 角点去重 + 4 边中点）。注释描述的是去重前概念计数，array 是去重后结果，逻辑无误但措辞易误导。 | `anchor-snap.ts:58-68`   | **P3**（→ HCA-CR） |
| 13 类型安全           | `generateConnectionId` 唯一性：index 从 existing.length 起，冲突时自增避让（C4）。                                                                                                                                             | `anchor-snap.ts:144-153` | PASS               |

**该文件零 P0/P1/P2。2 项 P3。**

### 1.4 `connection-link.ts`（97 行）— 联动算法

| 维度                  | 结论                                                                                                                                                                                                                                                                                                                 | 证据                       | Triage                                 |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | -------------------------------------- |
| 21 几何正确性（必选） | `recomputeConnectionAnchor` 联动逆运算正确：stub 终点世界 = target 锚点世界；`safeDiv` 零除守卫返回 0（防 Infinity/NaN 写入序列化，**plan 0900-1 #2 baseline 复核成立**）。                                                                                                                                          | `connection-link.ts:37-57` | PASS（#2 baseline）                    |
| 21 边界               | `recomputeJunctionConnections` 跳过 dangling（target 不在 deviceBoundsById）与无 target connection——保留原 x/y。                                                                                                                                                                                                     | `connection-link.ts:76-97` | PASS                                   |
| 16 文档-代码          | plan 描述 connection-link 为「path 点序列→渲染路径计算（贝塞尔/折线/直角）」，但 live 文件仅含联动算法（recomputeConnectionAnchor/recomputeJunctionConnections/resolveTargetAnchor），无路由策略。M2 stub 为 pipe-junction runtime 简单线段渲染（pipe-junction.ts:78-89），无需路由——live 与 M2 scope 一致，非缺陷。 | `connection-link.ts:1-97`  | PASS（plan 描述 vs live 澄清，非缺陷） |

**该文件零 P0/P1/P2/P3。**

### 1.5 `connection-overlay.ts`（70 行）— 覆盖物投影

| 维度          | 结论                                                                                                                                             | 证据                          | Triage              |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------- | ------------------- |
| 21 覆盖物投影 | `deriveOverlayState`：有候选+bounds→1 snap-dot + 1 drag-line(pointer→anchor)；无候选或 bounds 缺失→1 零长 drag-line(pointer→pointer)。配对完整。 | `connection-overlay.ts:46-67` | PASS                |
| 19 错误处理   | 候选存在但 bounds 缺失时降级为零长 drag-line（不 throw）——防御分支，测试覆盖。                                                                   | `connection-overlay.ts:54`    | PASS                |
| 16 文档-代码  | **#3 先验修复复核成立**：rg `tooltip` = 0 命中，死字段已移除（plan 0900-2 #3）。                                                                 | `connection-overlay.ts:1-70`  | PASS（#3 baseline） |

**该文件零 P0/P1/P2/P3。**

### 1.6 `connection-overlay-renderer.ts`（58 行）— sky 层渲染

| 维度                  | 结论                                                                                                                                                                                                               | 证据                                        | Triage                                              |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------- | --------------------------------------------------- | -------------------------------------- | ---- |
| 21 覆盖物生命周期     | `update` 先 `clear()` 再加新——重复 update 无 leak；`clear` destroy 全部 nodes；wiring cleanup（connection-wiring.ts:62-68）调 `overlayRenderer.clear()`——unmount 清理完整（conn-overlay-leak failure path 覆盖）。 | `connection-overlay-renderer.ts:19-57`      | PASS                                                |
| 19 错误处理           | sky 缺失守卫：`if (!sky                                                                                                                                                                                            |                                             | typeof sky.add !== 'function') return`——防御 noop。 | `connection-overlay-renderer.ts:21-22` | PASS |
| 10 样式               | 颜色硬编码 `#22c55e`/`#ffffff`（leafer sky 层，非 DOM/CSS，主题独立性规则不直接适用；编辑会话临时视觉，不入组态 JSON）。可抽常量便于调参，非缺陷。                                                                 | `connection-overlay-renderer.ts:28,41-43`   | **P3**（→ HCA-CR）                                  |
| 23 测试有效性（必选） | 「sky layer missing」测试以 `not.toThrow()` 为唯一断言——dim 23 假绿模式（防御 noop 分支主契约是 crash-safety，not.toThrow 直接测契约，但未验证「无节点残留」结果）。低成本加强。                                   | `connection-overlay-renderer.test.ts:34-42` | **P2 低成本**（→ Phase 2 当场修复）                 |

**该文件零 P0/P1。1 项 P2 低成本 + 1 项 P3。**

---

## 2. #1 转交项复核裁定（plan 0900-1 #1：connection drag pointermove vs viewport-pan）

> **裁定：维持 watch-only residual。** 不升级修复。

**复核证据**：

1. **手势仲裁仍接线**（`connection-wiring.ts:41-57`，#1 跨界点）：
   - `onConnectionPointerDown`（:41-48）：`session.mode === 'edit'` 且命中 junction 时，`connectionDragActiveRef.current = true`（:45）+ `connectionController.beginDrag`（:46）+ `e.preventDefault()`（:47）。preventDefault 阻断 viewport-pan 处理器接收同源 pointerdown。
   - `onConnectionPointerMove`（:49-52）：`if (!connectionDragActiveRef.current) return`——非连线拖拽期间不响应，避免与 viewport-pan 争用 pointermove。
   - `onConnectionPointerUp`（:53-57）：`connectionDragActiveRef.current = false` + `endDrag`。

2. **e2e 仍覆盖且通过**（`tests/e2e/scada-editor-interaction-correctness.spec.ts:65-106` #1 test）：
   - 装入 pipe-junction + 目标设备 → 读 vpBefore → junction 中心 pointerdown + 拖到空白区 + up → 读 vpAfter → `expect(vpAfter).toEqual(vpBefore)`（:105）。证伪「连线拖拽期间 viewport 被平移」。

3. **无新冲突**：本层（connection/）6 文件无新增 pointer 监听；connection-wiring.ts 三个 listener 均经 connectionDragActiveRef 门控，与 editor-engine 的 viewport-pan/wheel 处理器（HCA11 infra，out-of-scope 本体）经 preventDefault + ref 互斥。本轮无接线变更。

**裁定行**：`#1 connection pointermove vs viewport-pan` → **维持 watch-only residual**（手势仲裁 preventDefault + connectionDragActiveRef 接线完整、e2e #1 覆盖且通过、无新冲突；无需升级 test-first 修复）。

---

## 3. 先验修复回归抽查（Phase 3 抽查）

| 先验修复                                                             | 证据                                                                                                                                                        | 复核结论                   |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| **#8**（plan 0900-1）：dangling 检测递归 collectIds（含 group 子树） | `connection-adapter.ts:269-276` collectIds 递归 node.children；proof test `connection-adapter.test.ts:232-258` 断言 group child target `dangling === false` | **成立**（Proof residual） |
| **#3**（plan 0900-2）：connection-overlay 死字段 tooltip 移除        | rg `tooltip` 于 connection/ = 0 命中                                                                                                                        | **成立**                   |
| **#2**（plan 0900-1）：零尺寸 junction safeDiv 守卫                  | `connection-link.ts:46-57` safeDiv 除数===0 返回 0；proof test `connection-link.test.ts:71-101` 断言 `Number.isFinite(point.x/y)` + JSON 往返非 null        | **成立**                   |

---

## 4. owner doc 一致性核对（Phase 3）

| owner doc                                                    | 节                    | live 核对结论                                                                                                                                                    |
| ------------------------------------------------------------ | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/components/industrial-hmi-editor/design-connection.md` | §4.1 端点吸附坐标模型 | 归一化↔世界公式与 `anchor-snap.ts:75-93` 一致；EDGE_SNAP_POSITIONS `[0,0.5,1]` 与 §4.1 rule 1 一致；DEFAULT_SNAP_THRESHOLD=8 与 §4.2 rule 2 一致。**无 drift。** |
| 同上                                                         | §4.2 三段式交互       | beginConnectionDrag/updateDragCandidate/commitConnectionDrag 与 §4.2 (a)(b)(c) 逐段对齐；C3 单一活动端点（excludeIds）、C4 id 生成对齐。**无 drift。**           |
| 同上                                                         | §4.3 折线重拖         | redrag 恢复原 connection（无候选→noop，working copy 未变，原 connection 仍在）与 §4.3 M2 默认恢复一致。**无 drift。**                                            |
| 同上                                                         | §4.5 联动算法         | recomputeConnectionAnchor 公式 + safeDiv 守卫与 §4.5 代码示例一致（safeDiv 为 plan 0900-1 #2 增量，doc 代码示例未含但属实现期增量，非 drift）。**无 drift。**    |
| 同上                                                         | §6 overlay            | deriveOverlayState snap-dot + drag-line 与 §6 一致；EMPTY_OVERLAY_STATE 清空。**无 drift。**                                                                     |
| `docs/components/industrial-hmi/design-engine.md`            | §6 交互覆盖层（sky）  | connection overlay 渲染于 engine.sky（screen 坐标系，经 getViewportPoint 换算）与 design-engine.md §6（:216 sky 层恒等变换、screen 坐标）一致。**无 drift。**    |

**owner doc 同步**：无 drift 需同步。§4.4 row1（runtime stub 渲染跟随 junction，normalized 坐标）与 §4.5（适配层联动重算）是正交关注点，doc 两节分别覆盖；live 行为正确，非 drift（详见 §5.3 跨层观察）。

---

## 5. 喂入 HCA-BL（bug 候选）/ HCA-CR / HCA11 跨层观察

### 5.1 bug 候选（→ HCA-BL 正式归档）

**无复杂/跨层 bug 候选需归 `docs/bugs/`。** 本层 6 文件逐文件深审零 P0/P1，先验 #8/#3/#2 修复复核成立，#1 维持 watch-only residual。简单 P3 留痕于本表即可。

### 5.2 P3 backlog（→ HCA-CR 跨层集中修复）

| 编号      | 文件:行                                   | 摘要                                                                                                                   | Triage |
| --------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------ |
| HCA9-P3-1 | `connection-drag-controller.ts:87`        | moveDrag 每 pointermove 全量 collectSymbolBounds O(n)；design §4.2 关键约束 3 建议复用 hit.ts 预检。编辑器规模可接受。 | P3     |
| HCA9-P3-2 | `anchor-snap.ts:130`                      | 等距吸附候选 tie-break 为首入数组（确定性但未文档化）。                                                                | P3     |
| HCA9-P3-3 | `anchor-snap.ts:58`                       | 源码注释「共 12 锚点」 vs EDGE_ANCHORS 实际 8 条（去重后）；措辞易误导。                                               | P3     |
| HCA9-P3-4 | `connection-overlay-renderer.ts:28,41-43` | sky overlay 颜色硬编码 `#22c55e`/`#ffffff`；可抽常量便于调参（非 DOM/CSS，主题独立性规则不直接适用）。                 | P3     |

### 5.3 跨层观察（→ HCA11 复核，非 HCA9 defect）

- **design-connection.md §4.4 row1 vs `recomputeLinkagesForMovedNode`**：§4.4 row1 称「pipe-junction 主体移动 → 适配层无需额外处理（runtime 已落地）」，而 live `editor-working-helpers.ts:131-133`（HCA11 infra）在 junction 主体移动时 DOES 触发 `recomputeJunctionAfterMove` 重算 connection.x/y。**经核对，live 行为（junction 移动时重算以保持 stub 终点钉在目标设备锚点）是视觉正确的**——若不重算，junction 移动后 stub 终点会脱离目标设备。§4.4 row1 的「无需额外处理」指的是 runtime stub 渲染跟随 junction（normalized 坐标，pipe-junction.ts:78-89），与 §4.5 适配层联动重算是正交关注点（两节分别覆盖，非 drift，无需 doc 同步）。connection 层 `recomputeJunctionAfterMove`（connection-adapter.ts:167-203）本身按 §4.5 契约正确实现，**非 HCA9 defect**。调用时机语义归 HCA11 复核。

---

## 6. 维度覆盖统计

| 维度族                    | 覆盖 | 备注                                                                                                        |
| ------------------------- | ---- | ----------------------------------------------------------------------------------------------------------- |
| 01-03 架构边界            | ✓    | editor subpath 隔离；无跨包内部路径导入；公共面收敛（adapter 导出状态机，drag-controller 导出驱动器）。     |
| 04-08 运行时状态          | ✓    | 无 React state（纯逻辑 + leafer）；无双状态（dragState 单一 ref 持有）；无异步。                            |
| 09-12 渲染器/UI           | N/A  | 非注册 renderer（编辑器域核心纯逻辑 + leafer sky 覆盖物，无 DOM marker / 表单 / slot）。                    |
| 13-15 工程质量            | ✓    | 类型安全（边界 cast 克制）；测试断言结果值；性能观察项 P3-1。                                               |
| 16-18 文档/命名/跨包      | ✓    | owner doc 一致（§4）；plan 描述 vs live 澄清（§1.4）。                                                      |
| 19-20 鲁棒性/a11y         | ✓    | 错误降级完整（undefined/空候选/缺 bounds/缺 sky）；a11y N/A（canvas 交互面 a11y 归 HCA7/HCAX-2）。          |
| **21 显示与定位（必选）** | ✓    | 吸附阈值/坐标变换/状态机/联动/覆盖物投影逐项核对 PASS。                                                     |
| **22 集成接线（必选）**   | ✓    | #1 手势仲裁复核（§2）；state→overlay→sky 接线完整。                                                         |
| **23 测试有效性（必选）** | ✓    | 测试断言结果值（非 not.toThrow 唯一断言，除 P2-1 sky-missing 一处已加强）；无固化缺陷断言；无死代码带测试。 |

---

## 7. Phase 2 修复记录

| 编号      | finding                                                                                     | fix 落点                                                                                            | 状态                     |
| --------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------ |
| HCA9-P2-1 | `connection-overlay-renderer.test.ts:34-42` sky-missing 测试 not.toThrow 唯一断言（dim 23） | 加强为：not.toThrow + 断言「缺 sky 时 update 不创建任何节点」（经后续 valid update 仅见新批次证明） | fixed（test-strengthen） |

> 零 P0/P1 finding → Phase 2 第 1 条（P0/P1 test-first 修复）vacuously satisfied。P2-1 低成本加强已落地。
