# R2 第 7 轮递归扩展发现 — G3（round-07-g3）

> 轮次: Round 07（递归扩展 · **收敛终判轮（第二轮），最严格价值判据**） · 审查日期: 2026-08-29 · HEAD `0f183874a`（与 R1–R6 同基线）
> 组号: G3（data / dashboard / pivot） · agent: general（fresh session，只读审查）
> 派发输入: `dispatch-shared-prefix.md` + `dispatch-recursive-extension.md` + `dedup-baseline.md`（§1–§4） + round-01（按 `\[G3-` 定位精读）/ round-02-compact / round-03-compact 全文 / round-04（按 `\[G3-` 定位精读）/ round-05-g3、round-06-g3 全文精读（含各自"核对过且不构成发现"清单）
> 本轮价值判据: 只有前 6 轮所有方法面都未触及的**全新根因**、通过真实用户影响检验、且与累积 274 条（G3 组 50 条）逐根因比对为全新时才立案；新实例须注明引根且修复互不覆盖。已有根因复述、纯视觉偏好、零散细节、已弃报候选翻案（无新事实）一律不立案。

## 检查范围（逐文件）

**目标包**: `packages/flux-renderers-data/src/`（81 非 test 文件）、`packages/flux-renderers-dashboard/src/`（14 非 test 文件，含 `editor/`）、`packages/flux-renderers-pivot/src/`（7 非 test 文件）。`*.test.*`、`test-support*` 不入审。

**本轮方法定位**: R6 已对 table-renderer 全部 body 面（combine/expanded-row/summary/popover/quick-edit-cell/flattened/header-tree/loading-overlay/pagination-bar）、tree-renderer/list-renderer/pagination-renderer 主体、dashboard editor session 面做穷举精读并声明收敛。本轮补齐的是**前 6 轮从未逐行读过或只被间接引用**的逻辑面/定义面，以及对既有已立条目修复面的反查，构成"G3 组最终闭合清单"：

- 本轮亲自全文精读（前 6 轮未逐行覆盖）: `table-renderer/use-column-resize.ts`、`table-renderer/use-table-pagination.ts`、`table-renderer/use-table-selection.ts`、`table-renderer/use-table-expand.ts`、`table-renderer/use-table-lazy-children.ts`、`table-renderer/use-table-tree.ts`、`table-renderer/use-table-visible-columns.ts`、`table-renderer/column-settings-state.ts`、`table-renderer/table-data.ts`、`table-renderer/table-quick-edit-controller.ts`、`table-renderer/use-row-quick-edit-draft.tsx`（含 SaveBar UI 面）、`table-renderer/use-table-row-scope-cache.ts`、`chart-y-axis.ts`、`chart-sanitize.ts`、`list-pagination.ts`、`crud-renderer-state.ts`、`crud-renderer-delegate.ts`、`crud-renderer-ownership.ts`、`crud-query-form-id.ts`、`data-schema-validation.ts`、`tree-node-helpers.ts`、`editor-palette.tsx`（R5 精读后的复读复核）、`dashboard-editor-renderer.tsx`（全文复读，header 动作组逐按钮边界态反查）、`dashboard-definitions.ts`、`dashboard-editor-definitions.ts`
- 确认为纯 schema/definition/类型（grep 零 className/JSX 命中，无 UI 表面）: `crud-renderer-schema-builders.ts`、`crud-renderer-definition.ts`、`w2a-data-composition-definitions.ts`、`sparkline-{schemas,schema-validation,renderer-definition}.ts`、`stat-tile-renderer-definition.ts`、`data-renderer-definitions.ts`、`pivot-renderer-definitions.ts`、`pivot-events.ts`（事件桥，本轮全文）、`table-renderer/types.ts`、`schemas.ts` ×3、`index.ts(x)` ×3
- 经典缺陷类独立 grep 终扫（与 R6 同法交叉验证）: 硬编码 Tailwind 调色板色 / `animate-spin` 手写 spinner / 硬编码英文 aria-label 与字面量 / console 直出——三包全量。

## 检查方法

1. **文件清单闭合核对**: 以 `find` 枚举三包全部非 test 源文件，逐一对照 R1–R6 各轮"检查范围"声明，把"从未被任何轮逐行读过"的文件列为本轮精读清单（上节），全部读完。
2. **边界态/门控反查**: 对 dashboard editor header 全部动作（Undo/Redo/Delete/Save/mode toggle）逐按钮核对 disabled 判据（`canUndo`/`canRedo`/`selection`/`dirty` 均已接线）、保存失败通道（commit → validate → onError 事件）可达性；对列宽 resize 钩子核对 min/max 钳制、键盘 stepResize 通道、pointercancel/H4 卸载清理；对 quick-edit 双控制器核对 saving 门控、generation 防并发、saveError 回调接线。
3. **经典缺陷类 grep 终扫**: 硬编码色仅命中已立 [G3-视角7-01]（stat-tile emerald/red）；`animate-spin` 手写 spinner 仅命中已立 [G3-R2-视角10-02]（树表懒加载）；硬编码英文仅命中已立 [G3-视角9-01] 范围内表面（editor-canvas aria-label、inspector 字段标签）；console 全部为 dev 告警或内部 error log（pivot 事件桥回调兜底、layout-math sanitize 告警等）——与 R6 终扫结论一致，零新实例。
4. **候选逐一定性**: 本轮产生的 3 个候选（见弃报留档）逐一按"根因是否已立 / 真实用户影响是否通过"判死后落盘留档，不凑数立案。

## 发现汇总

| 严重程度 | 数量 | 编号 |
| -------- | ---- | ---- |
| HIGH     | 0    | —    |
| MEDIUM   | 0    | —    |
| LOW      | 0    | —    |

**零发现。** G3 组累积维持 R1–R6 的 **50 条**（26 + 9 + 7 + 4 + 3 + 1）；全审查累积 274 条不变。G3 组发现序列 26 → 9 → 7 → 4 → 3 → 1 → 0。前 6 轮全部方法面（列契约、组合矩阵、crud 多区块协同、chart 交互、dashboard 编辑器写入/门控/键盘、树表/combine/expand/quick-edit/分页、经典缺陷类 grep）经本轮**文件级闭合核对后均无未立根因、无未立新实例**。**G3 组审查在文件级闭环意义上收敛终结。**

## 弃报留档（本轮核对过且不构成发现，防复核重复提问）

1. **dashboard-editor 保存失败仅走 onError 事件、无 UI 内建反馈**（`dashboard-editor-renderer.tsx:262-274`）: commit 失败仅派发 `dashboard-editor:error` 事件，host 未配 onError 时无提示。但① `dashboard-editor-definitions.ts:81-92` 已将 onError 文档化为公开事件契约（"Dispatched when a save fails"）；② 该失败路径经纯 UI 通道**实际不可达**——adapter validate 只拒非 finite 几何，而 Inspector NumberInput 过滤非 finite 输入、drag/resize/addPanel 全部经钳制、palette 写入合法几何，唯一来源是 host 注入的非法 layout 数据。无真实用户可触发的影响，不通过真实用户影响检验，弃报。
2. **editor 画布对未注册 panel type 静默渲染空面板壳**（`dashboard-editor-renderer.tsx:188-201`）: 与已立 [G3-视角11-01]（运行态 dashboard 未注册类型渲染空卡片壳无提示）同根因的同包编辑态表面；R5 全文精读 editor 五件套时未立案，本轮无新事实（palette 只列已注册类型，空壳仅来自 host layout 引用未注册类型），属已有根因复述，不立案。
3. **树表懒加载失败原始 error.message 进 toggle 的 `title` tooltip**（`table-body-row-rendering.tsx:363-369` ← `use-table-lazy-children.ts:70-83`）: "直出原始异常 message"已立根因族（map/barcode/scada 编辑器各实例）的表内 title 属性级表面；该控件已具备 destructive 色 + 重试通道 + i18n aria-label，原始 message 仅出现在悬停 tooltip，信息不丢失。零散细节，低于终判门槛，弃报。
4. **fast-scan 命中项全数已立**: stat-tile emerald/red（[G3-视角7-01]）、树表懒加载手写 spinner（[G3-R2-视角10-02]，现状未修复但不重报）、editor-canvas aria-label 与 inspector 字段标签英文（[G3-视角9-01] 范围内）、pivot 包中文 console.error（dev 诊断输出，非 UI 面）——均不重复计数。
5. **本轮全文精读确认无缺陷的面**: use-column-resize（min 40px 钳制/键盘 stepResize/H4 卸载清理/controlled 只读 dev 告警齐备）、use-table-selection（P1-7 渲染期剪枝/H21 幽灵键清除/三通道同步注释与实践一致）、use-table-pagination（scope/controlled/local 三态 + clamp）、use-table-tree（环检测 dev 告警、maxDepth、lazy 融合）、use-table-lazy-children（inFlight 闸/mounted 守卫/i18n 兜底文案）、use-table-visible-columns + column-settings-state（normalize 补齐未知键）、table-data（dup rowKey dev 告警/多排序/keyword 过滤）、table-quick-edit-controller 与 use-row-quick-edit-draft（saving 门控/generation 防并发/H20 快照/dirty 关闭还原/SaveBar Spinner+role=status+i18n）、use-table-row-scope-cache（cacheKey 迁移/卸载微任务清理）、chart-sanitize（逐字段 finite 清洗）、chart-y-axis（多轴归一化回退）、list-pagination（clamp/hasMore 语义/scope 缺路径 dev 告警）、crud-renderer-state/ownership/delegate（状态归一化/查询桥 validate→getValues 序列防竞态/单一 cast seam 注释）、data-schema-validation（ownership×statePath 必填校验、queryForm region 组装 i18n 按钮齐全）、editor-palette（空态 i18n 提示/仅列已注册类型/buildPalettePanel id 去重）、pivot-events（单回调抛错兜底、off 注销）——无发现。

## 去重自检声明

本轮**零新发现**，无条目级去重负担；产生过的 3 个候选全部因"根因已立（[G3-视角11-01] / 直出异常 message 族）或未通过真实用户影响检验"判死，已逐条落盘于弃报留档。与全部 274 条既有发现按根因比对：无重复立案、无已立根因复述。dedup-baseline §1（ma5-ux 6 条已修复不复报）、§2（16 项已登记缺口未作为发现，本轮未撞见新表象）、§3（8 条误报对照未报）、§4（维度 09–12/20 边界未越界）全程合规。

## 结论

新发现 **0 条**。本轮以"文件级闭合核对"为方法：三包全部非 test 源文件至此已被 R1–R7 至少一轮逐行覆盖（R6 穷举 body/tree/list/pivot/editor-session 面，R7 补齐其余全部逻辑/定义/钩子面并复核已立条目修复面），经典缺陷类 grep 终扫零新实例。G3 组发现序列 26 → 9 → 7 → 4 → 3 → 1 → 0，收敛判据在文件级闭环意义上满足。**未发现新的高价值问题。审查结束。**
