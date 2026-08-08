# HCA2 Engine Layer 包级深审记录

> Audit Date: 2026-08-08
> Mission: industrial-hmi-component-audit
> Work Item: HCA2. Engine 层审计
> Plan: `docs/plans/2026-08-08-0748-2-industrial-hmi-hca2-engine-layer-audit.md`
> Scope: `packages/flux-renderers-industrial/src/engine/` 9 文件（canvas 场景图引擎核心）
> Baseline: HEAD 2026-08-08，`pnpm --filter @nop-chaos/flux-renderers-industrial test` 全绿（97 test files / 1306 tests）
> Dimension Set: `docs/skills/deep-audit-prompts.md` 23 维（engine 为复杂交互层，**维度 21 显示与定位 / 22 集成接线 / 23 测试有效性 必选**）

## 审计方法

逐文件过 23 维重点维度（视口数学正确性 clampScale fit/contain/fill 三分支 + scaleOfWorld 矩阵可恢复性 / 命中测试边界 / 覆盖物生命周期 create-update-dispose 对称 + reset 清理 / event-bridge 事件映射完备 + 监听器清理 / tree-registry 增删查边界 / config-adapter diff 构建增删改幂等 / 引擎 reset/destroy 清理对称），抽查边界值（scale=0/NaN/Infinity/负数 / 空 config / 单图元 / 重复 reset / destroy 后再调用 / 重复 id / 不存在 id / clear 后查 / odd-length points / 零尺寸 bounds）。每条 finding 带 `文件:行` 证据，所有 finding 已 triage 为 P0/P1/P2/P3。

维度 22 边界：本 plan dim 22 = engine 内部子模块接线（event-bridge↔scada-engine、config-adapter→tree-registry、reset/destroy 对称、importConfig↔reset 全量重建路径一致性）+ engine 公共 API 可操作性；完整 schema→store→DOM→event 链路可操作性在 HCA1（renderer hook 层）审，本 plan 不重复。

## 逐文件 finding 表

### scada-engine.ts（499 行）— ScadaCanvasEngine 主体

| 维度                                    | 结论                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | 证据                              | Triage                                 |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- | -------------------------------------- |
| 22 集成接线（全量重建路径一致性）       | `reset(config)`（:191-202）做三件事：background.color 应用 + adapter.build + `interaction?.clear()`；`importConfig(json)`（:343-350）只做 parse+validate+adapter.build，**既不应用 background.color 也不清 InteractionOverlay**。两条公共「全量重建」路径后置处理不一致。host 能力路径安全（`use-scada-handles.ts:138` → `use-scada-config-sync.ts:264 engine.reset(imported)`），但 raw 公共 API `engine.importConfig()` 直调（测试 / host 工具链，`index.ts:51` 注释「导出供 host 侧工具链直接调用」）会留陈旧 hover 覆盖物 + 忽略导入 config 的 background.color。:199-200 注释自称「importConfig/version-change 全量重建后清空 InteractionOverlay」但该清理只在 reset 路径，importConfig 旁路。 | `scada-engine.ts:191-202,343-350` | **P2-ENG-1（fixed）**                  |
| 22 生命周期（destroy 后公共命令无门控） | `destroy()` 经 `destroyed` 标志幂等 + 卸载监听/覆盖物/app。但 `reset/applyAttrs/setViewport/zoomAt/fit/center/setSize/applyDiff/getViewport` 等公共命令**不检查 `destroyed`**——destroy 后再调操作已销毁 app。对照 binding 层（DirtyCollector/RefreshPipeline 所有公共入口 destroy 后 no-op，design-engine.md §4.2）有门控，engine 层缺。主路径无可复现路径（hook 卸载置空 ref、test handle 移除、binding pipeline 门控），属防御纵深缺口非 live defect。                                                                                                                                                                                                                                            | `scada-engine.ts:173-189`         | **P3-ENG-1（归 HCA-CR）**              |
| 21 显示与定位（视口命令矩阵可恢复性）   | `applyViewportState`（:356-377）P1-9 screen 原点锚 + move 序列合成；`handlePluginZoom`（:431-460）P2-8 除零早退守卫 + D3 光标 screen 锚钳制；`syncViewportFromZoomLayer`（:468-478）`-zoomX/scale \|\| 0` 防零。矩阵级断言经 `scada-engine.test.ts:285-356` 与 `scada-engine-plugin-sync.test.ts:34-229` 覆盖（断言 zoomLayer.x/scaleX 结果值，非 not.toThrow）。                                                                                                                                                                                                                                                                                                                                   | `scada-engine.ts:356-478`         | 零发现（先验修复回归点，Phase 3 抽查） |
| 19 错误传播                             | `importConfig` 校验失败 throw（host 路径 catch 返 {ok:false}）；`buildNode` 未知 type fail-fast throw；event-bridge `safeRun` 隔离处理器异常经 `onHandlerError` 去重上报不升级画布 status（P1-8 降级契约）。错误语义清晰。                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | `scada-engine.ts:112,347,398-414` | 零发现                                 |
| 13 类型安全                             | zoomLayer 读 x/y/scaleX 经 `as unknown as` 边界转换（leafer 类型不暴露 zoomLayer 矩阵数据面）。test-handle 全 `unknown` 为已记录 impl drift（design-engine.md §8.3 强类型缺失注记：避 engine↔test-handle 循环导入）。非新缺陷。                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | `scada-engine.ts:432-437,469-473` | 不报告（已收敛）                       |

### config-adapter.ts（180 行）— config → 场景树 diff 构建

| 维度                                     | 结论                                                                                                                                                                                                                                                                                                                                                                                                                                         | 证据                                      | Triage                                 |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | -------------------------------------- |
| 22 diff 构建幂等性                       | `applyDiff` 处理顺序 removed→added→updated（同 id type 变更 remove+add 语义正确，:59-62 注释固化）；removed 路径 `removeSymbol` 对不存在 id `if(!leaf) return` 幂等；updated 对不存在 id `if(!leaf) return`。`nextConfig` 提供时 nodeById 收敛校准（added :75-78 / updated applyUpdate :164-167 / removed removeSymbol :130,133）。幂等性成立（同 diff 重复应用：removed 已 no-op；added 重复会重建——但 diff 契约为单次应用，caller 责任）。 | `config-adapter.ts:55-80,125-135,137-168` | 零发现                                 |
| 03 契约一致性（nextConfig 可选 footgun） | `applyDiff(diff, nextConfig?)` nextConfig 省略时 `this.config` 不更新（currentConfig/exportConfig 返旧 config）。renderer 恒传 nextConfig（`use-scada-config-sync.ts`），主路径无影响；属公共 API 契约 footgun。                                                                                                                                                                                                                             | `config-adapter.ts:55,71-79`              | **P3-ENG-2（记录）**                   |
| 21 显示与定位（buildNode type 分支）     | `isContainer = node.type === GROUP_CONTAINER_TYPE`（:90，2026-08-05-0653-4 C1 defense-in-depth）——叶子 type 误带 children 按 leaf 构建保留 fill/stroke/width/height，不静默降级 Group。group scale→scaleX/scaleY 转发（:101）。                                                                                                                                                                                                              | `config-adapter.ts:82-123`                | 零发现（先验修复回归点，Phase 3 抽查） |

### viewport.ts（96 行）— 视口纯逻辑数学

| 维度                                         | 结论                                                                                                                                                                                                                                                                                                                                                                                                                | 证据                      | Triage |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | ------ |
| 21 显示与定位（三分支方向一致 + 矩阵可恢复） | `clampScale`（:27-30）非有限→MIN_SCALE，负数/0→MIN；`fit`（:61-75）`Math.max(1e-6,bw)` floor + availWidth/Height `Math.max(1,..)` + clampScale，零尺寸→MAX_SCALE（与 contain 同向，P2-7）；`center`（:77-85）保留 state.scale（已钳制）；`zoomAt`（:87-95）clampScale(scale\*factor)，at-clamp-bound 返 {...state} no-op。`viewport.test.ts` 断言逆变换 + 锚点固定 + clamp 边界结果值。三分支方向一致、矩阵可恢复。 | `viewport.ts:27-95`       | 零发现 |
| 13 边界值（NaN position 下游拦截）           | `center`/`fit` 对 NaN bounds.width 不就地 sanitize（cx 可能 NaN），但结果经 `applyViewportState`→`clampViewport`（:32-41，非有限 x/y 回落 0，2026-08-04-2242-2 Proof-3）拦截。纵深防御成立。                                                                                                                                                                                                                        | `viewport.ts:32-41,77-85` | 零发现 |

### event-bridge.ts（190 行）— LeaferJS 事件 → scada 语义桥

| 维度                                         | 结论                                                                                                                                                                                                                                                                                                                                                                                                        | 证据                            | Triage |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | ------ |
| 22 集成接线（事件映射完备 + 监听器清理对称） | `attach`（:80-87）挂 tree tap/double_tap + moveTarget(App) pointer.move/pointer.leave；`destroy`（:89-97）逆序 off 全部四监听 + 置 attached=false + lastHovered=undefined，幂等。tap→click、double_tap→dblclick、pointer.move→hover/hover-miss、pointer.leave→hover-miss 映射完备（`event-bridge.test.ts` 逐事件覆盖）。moveTarget=App 非 tree（I15.1 live defect 修复：空白区 tree 收不到 pointer.move）。 | `event-bridge.ts:80-97,99-132`  | 零发现 |
| 19 错误传播（处理器隔离）                    | `safeRun`（:153-159）try/catch 包裹全部 handler；`reportHandlerError`（:161-166）按 message 去重经 `onHandlerError` 上报，不升级画布 status（P1-8）。异常不冒泡进 leafer 交互管线。                                                                                                                                                                                                                         | `event-bridge.ts:117-166`       | 零发现 |
| 23 测试有效性（mock↔真实漂移）               | `pointOf`（:172-178）校验 numeric x/y，非对象/缺坐标返 undefined；`buildSymbolEventPayload`（:23-32）只读快照（world/viewport 浅拷贝）+ 缺字段不输出。mock `MockLeafer.emit('tap')` 建模双击合并 120ms 语义（leafer-ui-mock.ts:255-292），不掩蔽真实交互时序。                                                                                                                                              | `event-bridge.ts:23-32,172-178` | 零发现 |

### interaction-overlay.ts（176 行）— hover/select 覆盖物生命周期 + 绘制

| 维度                                          | 结论                                                                                                                                                                                                                                                                                                                                          | 证据                                     | Triage                                 |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | -------------------------------------- |
| 21 显示与定位（screen 坐标绘制 + 变换面对齐） | `toScreenAttrs`（:125-140）sky 恒等变换 → 覆盖物 screen 坐标（x/y 经 getViewportPoint 换算、宽/高乘 scale、rotation 不变、strokeWidth 保持 preset 屏幕像素）；`refresh`（:143-157）pan/zoom 后按最新视口重算全部活动覆盖物；group `hittable:false`（:90，P1-7 不吞指针）。`scada-engine-plugin-sync.test.ts:113-189` 断言 screen 坐标结果值。 | `interaction-overlay.ts:90,125-157`      | 零发现（先验修复回归点，Phase 3 抽查） |
| 22 生命周期（create/update/dispose 对称）     | `highlight`（:102-117）create-or-update（existing.set 复用 / new Rect + group.add + map.set）；`clear(id?)`（:159-170）单删 group.remove+map.delete / 全删 group.removeAll+map.clear；`destroy`（:172-175）clear + group.destroy（mock 经 parent.remove 脱树）。create/update/dispose 对称。                                                  | `interaction-overlay.ts:102-117,159-175` | 零发现                                 |
| 21 边界值（points/零尺寸兜底）                | `resolveOverlayGeometry`（:42-75）points 优先（flat/object 双形）按包围盒 + MIN_OVERLAY_SIZE floor；无 points 时 width/height>0 取原值，否则 MIN_OVERLAY_SIZE。odd-length flat points 末位 `points[++i]`=undefined 静默跳过（不崩，validator 拒绝 malformed）。                                                                               | `interaction-overlay.ts:42-75`           | 零发现                                 |

### tree-registry.ts（108 行）— 节点注册表

| 维度               | 结论                                                                                                                                                                                                                                                                                                             | 证据                            | Triage               |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | -------------------- |
| 22 增删查边界      | `get`/`has` 不存在返 undefined/false；`remove` 不存在返 false；`subtreeIds`（:94-107）childrenOf Map + DFS，O(subtree)，不依赖父先于子插入序（2026-08-05-1253-1 P2-1）；`findByNode`（:66-74）沿 parent 链上溯到已登记根（gate-3 最深命中回归）。`tree-registry.test.ts` 覆盖逆序插入/remove 断链/clear 后重插。 | `tree-registry.ts:34-74,94-107` | 零发现               |
| 03 契约（重复 id） | `add`（:19-32）不查重——重复 id：byId/nodeIndex 覆盖（旧 node nodeIndex 失效成孤儿），zIndex 跳到当前 size，childrenOf 重 add（Set 去重）。validator 主路径拒绝重复 id，属防御纵深。                                                                                                                              | `tree-registry.ts:19-32`        | **P3-ENG-3（记录）** |

### hit.ts（29 行）— 命中测试 helper

| 维度                      | 结论                                                                                                                                                                                                                                                                      | 证据           | Triage |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ------ |
| 21 显示与定位（命中边界） | `resolveSymbolId`（:17-28）屏外点 `viewX<0\|\|viewY<0\|\|viewX>size.width\|\|viewY>size.height` 立即排除（0ms 预检）；IPickResult.target 解包（gate-3 M-2）；target null→undefined；idOf 不命中→undefined。`hit.test.ts` 覆盖屏外/未命中/IPickResult/null target 结果值。 | `hit.ts:17-28` | 零发现 |

### batch-add-probe.ts（44 行）— 批量添加探针

| 维度                          | 结论                                                                                                                                                                                                                                        | 证据                       | Triage |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | ------ |
| 23 测试有效性（dev 探针口径） | dev/test 专用（仅 test handle measureAddStrategies 暴露），非公共契约。`batch-add-probe.test.ts` 断言 shape + count（不断言 timing 值——mock 下 timing 无意义，口径声明「真实 leafer-ui@2.2.9 浏览器页面上下文」）。非缺陷判定、性能观察项。 | `batch-add-probe.ts:10-17` | 零发现 |

### test-handle.ts（29 行）— 测试句柄挂载

| 维度                         | 结论                                                                                                                                                                                                                                                                                                                                                                                                         | 证据                   | Triage |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------- | ------ |
| 22 集成接线（挂载/卸载对称） | `mountScadaTestHandle`/`removeScadaTestHandle`（:23-29）window 键 set/delete 对称；engine.destroy 经 `removeScadaTestHandle(this.cid)` 卸载（scada-engine.ts:186-188）。`setPointValues`/`measureAddStrategies` 为可选注入通道——`setPointValues` 由 renderer hook（`use-scada-engine.ts:210`）装配（写 pipeline，非 engine 责任），`measureAddStrategies` 由 engine.installTestHandle 装配。owner 归属清晰。 | `test-handle.ts:23-29` | 零发现 |

## 维度 21 显示与定位正确性 专项节

| 子项                                       | 结论                                                                                                                                                       | 证据                                                                                                    |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| clampScale fit/contain/fill 三分支方向一致 | fit(MIN-scale/contain) + center(保留) + zoomAt(clamp) + P2-7 fill 零尺寸 floor → 三分支非有限/零尺寸同向收敛到 MAX_SCALE/MIN_SCALE，无方向反转             | `viewport.ts:27-95` + `use-scada-config-sync.ts` fill 分支（P2-5/P2-7 已收口）                          |
| scaleOfWorld 矩阵可恢复性                  | 命令路径（screen 原点锚 P1-9）+ 插件路径（光标 screen 锚 D3 + 除零早退 P2-8）双路径 zoomLayer 矩阵级断言，corrupt（Infinity/NaN scaleX）不可恢复场景已守卫 | `scada-engine.ts:356-478` + `scada-engine.test.ts:285-356` + `scada-engine-plugin-sync.test.ts:195-229` |
| 命中测试边界                               | 屏外预检 + IPickResult 解包 + 最深命中 parent 链上溯；空/重叠/变换后命中经 mock+e2e 覆盖                                                                   | `hit.ts:17-28` + `tree-registry.ts:66-74`                                                               |
| 覆盖物 screen 坐标对齐                     | sky 恒等变换 + getViewportPoint 换算 + scale 乘宽高 + hittable:false + refresh 钩子（命令/插件双路径）                                                     | `interaction-overlay.ts:90,125-157`                                                                     |

**结论**：维度 21 零 live defect。视口数学、命中、覆盖物定位均经矩阵级/坐标级结果值断言覆盖，先验修复（P1-9/P2-5/P2-7/P2-8/D3/P1-7）回归点 Phase 3 抽查。

## 维度 22 集成接线与可操作性 专项节

| 子项                                    | 结论                                                                                                           | 证据                                                |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| event-bridge ↔ scada-engine 接线        | attach/destroy 四监听对称幂等；moveTarget=App（I15.1）；处理器异常隔离不升级画布                               | `event-bridge.ts:80-97` + `scada-engine.ts:394-416` |
| config-adapter → tree-registry 接线     | buildNode 注册 / removeSymbol 子树删 / applyUpdate 重建 + nodeById 收敛                                        | `config-adapter.ts:82-168`                          |
| reset/destroy 清理对称                  | destroy 幂等逆序（eventBridge/interaction/listeners/adapter/registry/app/testHandle）；reset 清覆盖物（P2-10） | `scada-engine.ts:173-202`                           |
| **importConfig ↔ reset 全量重建一致性** | **不一致（P2-ENG-1）**：importConfig 旁路 background 应用 + 覆盖物清理                                         | `scada-engine.ts:343-350`                           |
| engine 公共 API 可操作性                | 主路径可操作；destroy 后公共命令无门控（P3-ENG-1 防御纵深缺口）                                                | `scada-engine.ts:173-189`                           |

**结论**：维度 22 一项 P2 live defect（importConfig 全量重建路径不一致，P2-ENG-1），一项 P3 防御纵深（destroy 门控，P3-ENG-1）。event-bridge/config-adapter/registry 接线与 reset/destroy 对称性 otherwise 零发现。

## 维度 23 测试有效性与假绿 专项节

| 子项                                    | 结论                                                                                                                                                                                       | 证据                                                                                              |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| mock↔真实漂移防蔽                       | MockZoomLayer.scaleOfWorld 建模 x/y 锚定副作用（P1-9）；MockLeafer.zoomLayer===this（T1）；MockApp 仅 config 含 key 时建层（gate-3）；getBoundsToWorld/getBounds/worldBox 抛错暴露产线误用 | `leafer-ui-mock.ts:180-218,321-383,127-137`                                                       |
| 断言结果值（非 not.toThrow/call-count） | viewport 逆变换/锚点/clamp close-to；engine zoomLayer.x/scaleX 矩阵级；overlay screen 坐标；event-bridge 载荷字段                                                                          | viewport.test.ts / scada-engine.test.ts / scada-engine-plugin-sync.test.ts / event-bridge.test.ts |
| 测试覆盖缺口                            | `engine.importConfig` 未与 interactionLayer+background 共测 → P2-ENG-1 gap 未被现有测试捕获（Phase 2 补 failing-first proof）                                                              | `config-adapter.test.ts:408-415`（无 interactionLayer）                                           |
| 先验修复回归锁定                        | P2-8 除零 / P2-10 reset 清覆盖物 / P1-9 锚点 / D3 光标锚均有专项 failing-first proof 测试锁                                                                                                | `scada-engine-plugin-sync.test.ts:195-259` / `scada-engine.test.ts:285-356`                       |

**结论**：维度 23 mock 建模扎实（多轮 gate-3/P1-9 校准），断言口径为结果值。唯一覆盖缺口为 P2-ENG-1（importConfig+overlay+background 未共测），Phase 2 补 failing-first proof 转绿。

## Finding Triage 汇总

| ID       | 严重程度 | 文件                                   | 一句话摘要                                                                                                                                                     | 处置                                                                                                                                                                                                               |
| -------- | -------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| P2-ENG-1 | P2       | `scada-engine.ts:343-350` ↔ `:191-202` | `engine.importConfig()` 全量重建旁路 background.color 应用 + InteractionOverlay 清理（与 reset 不一致）；raw 公共 API 直调留陈旧 hover 覆盖物 + 忽略导入背景色 | **fixed**（Phase 2）：failing-first proof（importConfig 后 activeCount=0 + ground.fill=导入色，修复前 activeCount 残留/背景未应用）→ `importConfig` 改调 `this.reset(config)`（应用背景 + 清覆盖物 + build）→ 转绿 |
| P3-ENG-1 | P3       | `scada-engine.ts:173-189`              | engine 公共命令 API 缺 destroyed 门控（binding 层有，engine 缺）；主路径无可复现路径                                                                           | 归 HCA-CR（防御纵深）                                                                                                                                                                                              |
| P3-ENG-2 | P3       | `config-adapter.ts:55,71-79`           | applyDiff nextConfig 省略时 currentConfig/exportConfig 返旧 config（renderer 恒传，主路径无影响）                                                              | 记录（公共 API 契约 footgun）                                                                                                                                                                                      |
| P3-ENG-3 | P3       | `tree-registry.ts:19-32`               | add 不查重，重复 id 旧 node 成孤儿 + zIndex 跳变（validator 主路径拒绝）                                                                                       | 记录（防御纵深）                                                                                                                                                                                                   |

## 先验修复回归抽查（Phase 3 抽查点）

以下先验修复构成本 plan Current Baseline，Phase 3 抽查其行为仍成立（不重做）：

- P2-7 fill 零尺寸方向兜底（`use-scada-config-sync.ts` Math.max(1e-6,...) floor）。
- P2-8 wheel-zoom 除零守卫（`scada-engine.ts:442` rawScale=0/非有限早退）。
- P2-10 reset 清覆盖物（`scada-engine.ts:201` interaction?.clear()）。
- P2-11 handles deps 卫生（`use-scada-handles.ts`，HCA1 域，本 plan 不直接抽查源码，仅确认 engine 接线面不变）。
- viewport clampScale clamp-before-center（plan 2026-08-05-1253-1）。
- P1-9 applyViewportState screen 原点锚 + D3 光标锚（`scada-engine.ts:356-460`）。

**Phase 3 回归验证证据（2026-08-08）**：`pnpm --filter @nop-chaos/flux-renderers-industrial test` 全绿（97 test files / 1306 tests）。覆盖先验修复的回归测试文件均绿：

- `scada-engine-plugin-sync.test.ts`（260 行）— P2-8 除零守卫（:195-229）、P2-10 reset 清覆盖物（:235-259）、P1-7 覆盖物 screen 坐标 + refresh 钩子（:113-189）。
- `scada-engine.test.ts`（402 行）— P1-9 锚点空间矩阵级断言（:285-356）、D3 光标 screen 锚（:327-343）。
- `viewport.test.ts`（156 行）— clampScale/clampViewport 非有限输入 + fit/center/zoomAt 锚点固定。

## owner doc 一致性核对（Phase 3 item 1）

核对 `docs/components/industrial-hmi/design-engine.md` 与 live engine：

| 契约                                                                                                                                 | doc 位置                | live 位置                                       | 结论                                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 视口数学（clampScale MIN/MAX=0.1/20、fit/center/zoomAt、scaleOfWorld screen 原点锚 P1-9、D3 光标锚、P2-7 fill floor、P2-8 除零守卫） | §4.4（:107-173）        | `viewport.ts:24-95` + `scada-engine.ts:356-478` | 一致                                                                                                                                                                             |
| reset/destroy 行为（destroy 幂等逆序、reset 清覆盖物 P2-10、销毁门控对称属 binding 层）                                              | §4.2（:94-99）          | `scada-engine.ts:173-202`                       | 一致                                                                                                                                                                             |
| event-bridge 事件清单（symbol:click/dblclick/hover/hover-miss + render 帧）                                                          | §8.1（:235-239）        | `event-bridge.ts:3,99-151`                      | 一致                                                                                                                                                                             |
| tree-registry 模型（id→Leaf 索引、z 序=树序、subtree DFS）                                                                           | §4.3/§7（:103-105,226） | `tree-registry.ts:11-107`                       | 一致                                                                                                                                                                             |
| importConfig/exportConfig 序列化契约转发                                                                                             | §8.2（:253）            | `scada-engine.ts:337-350`                       | **drift（P2-ENG-1）**：doc §8.2 列 importConfig 为「序列化契约转发」（全量替换语义），live importConfig 缺 background 应用 + 覆盖物清理（与 reset 不一致）。Phase 2 修复后一致。 |

**结论**：发现 1 处 drift（P2-ENG-1，importConfig 全量重建语义与 reset 不一致），Phase 2 修复（importConfig 改调 reset）后 doc §8.2 「序列化契约转发」语义兑现，无需 doc 同步（doc 已正确描述预期契约，是 impl 旁路了它）。其余契约一致。

## 喂入 HCA-BL（bug 候选）

> 正式归档动作在 HCA-BL，本 plan 不产出 `docs/bugs/` 卡片。以下为本层 finding 喂入清单。

| 候选                                                       | 复杂/跨层                                       | 归档建议                                                                                                                          |
| ---------------------------------------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| P2-ENG-1 importConfig 全量重建旁路 background + 覆盖物清理 | 单层（engine 内 reset↔importConfig 路径不一致） | 复杂度低（单文件 1 行修复 + test-first），同 P2-10 同类；建议在审计卡内留痕即可（已在 P2-10 系列覆盖同类），HCA-BL 视情况合并归档 |
