# Round 01 — Open-Ended Adversarial Review (`flux-renderers-industrial`)

> 执行：2026-08-08 17:12（本执行结果目录 `2026-08-08-1712-open-audit-industrial-hmi-component-audit`）
> 规范产出（含完整优先级表 + 总评 + 盲区）：`docs/audits/2026-08-08-1712-open-audit-industrial-hmi-component-audit.md`
> 本文件为该轮发现的 round 落盘副本，遵循 `docs/skills/open-ended-adversarial-review-prompt.md` §结果落盘与重复执行。

## 触发视角

契约考古学家 × 恶意输入者 × 生命周期追踪者（交叉）。

## 发现汇总

| #   | 优先级 | 位置                                                                                | 一句话                                                                                                                                              |
| --- | ------ | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1  | P1     | `editor/editor-session.ts:113-121`（经 `runtime-factories.ts:113` 无 try/catch）    | `cloneConfig` 对合法的 `variables` 缺失 config 直接 `.map` → 编辑器 mount 崩溃；同仓 `cloneConfigSnapshot` 已守卫，证其真实                         |
| F2  | P1     | `serialization/validators/helpers.ts:54-55`（`assertShape` number 分支）            | `assertShape` 未拒 NaN/Infinity，P2-3 finite 修复只落 `checkNumberField`；grid.size / animation.from-to / scale.k-b 仍放行 → corrupt 几何/动画/量程 |
| F3  | P1     | `editor/scada-editor-canvas.tsx:78,280` + `editor/runtime-mutators.ts:76-82`        | 拖拽 id 由不重置计数器生成 + `addWorkingSymbol` 不去重 → load 后拖拽 id 碰撞 → `tree-registry.ts:21` last-write-wins；paste/group 却都去重          |
| F4  | P1     | `serialization/validate.ts:23-40`                                                   | 仅深度上限（`MAX_VALIDATE_DEPTH=100`），无数值广度/总量上限 → 不可信 config 无界迭代 + 引擎构建 DoS                                                 |
| F5  | P2     | `serialization/parse.ts:17-24`                                                      | 非对象输入仍 cast 成 `ScadaConfig`（类型谎言，下游 validate 兜住）+ 浅拷贝与调用方共享嵌套引用                                                      |
| F6  | P2     | `editor/editor-session.ts:113-121` vs `editor/editor-working-helpers.ts:70-76`      | 两份克隆分裂：allowlist+硬编码 version+浅 variable vs spread+保 version+深节点                                                                      |
| F7  | P2     | `binding/animator.ts:121-127,203-230`                                               | `pause()` 不停 rAF、每帧重算并 flush 相同增量（公共 API，prod 未调用→潜伏）                                                                         |
| F8  | P2     | `binding/refresh-pipeline.ts:177-194`                                               | `recomputeExpressionPoints` 对 `lastDeps` 脏点×表达式点线性扫描，扇出大时趋 O(n²)，10万首屏基准未覆盖                                               |
| F9  | P2     | `engine/event-bridge.ts:161-166` + `binding/point-store.ts:310-315`                 | 错误去重以 message 字符串为键 → 同文案异因错误被吞；去重 Set 生命期内无界增长                                                                       |
| F10 | P2     | `serialization/validators/binding.ts:22-24` vs `validators/point-declaration.ts:42` | binding 级 scale 仅 isPlainObject，不校验 k/b（弱于 declaration scale，内部不一致；叠加 F2 双重放行）                                               |
| F11 | P2     | `editor/scada-editor-canvas.tsx:277-296`                                            | drop 的 `type` 不经符号注册表校验即入 working copy → 自存自读不回                                                                                   |

## 关键判定

- **去重核对**：`docs/references/reopened-design-decisions-and-audit-adjudications.md` 5 条裁定均针对 form/basic/react 等其他包，与 industrial 包无重叠；`docs/analysis/industrial-hmi*/` 无前置 open-ended 对抗审查。本批 11 条均为新发现。
- **P0 判定**：本轮无 P0。F1（mount 崩溃）需「省略 variables 的最小 config」特定输入方触发，common authoring 路径（带 variables）不受影响，按规范判 P1 而非 P0。
- **总评 / 盲区自评**：见规范产出 `docs/audits/2026-08-08-1712-open-audit-industrial-hmi-component-audit.md` 末尾两节。

## 下一轮建议切入点

symbols 形状族几何正确性、connection/undo-redo 组合交互态、用最小 benchmark 固化 F4/F8 触发点。
