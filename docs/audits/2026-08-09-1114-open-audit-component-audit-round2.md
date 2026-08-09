# Open Audit — component-audit-round2（2026-08-09 11:14）

> Audit Status: planned
> Audit Type: open-ended
> Mission: component-audit-round2

## 路由登记（2026-08-09 处理）

- P1-01/P1-02 → plan `docs/plans/2026-08-09-1140-1-table-column-width-strategy-rework.md`（Phase 1/2，Fix）。
- P2-01 → 同上 plan（Phase 3，与 P1 同 closure surface 折叠）。
- P2-02 → `docs/backlog/audit-followups-2026-08-09-1114.md`。

## 执行说明

- **方式**：开放式对抗审查。先读 `AGENTS.md`、`docs/index.md`、`docs/skills/react19-best-practices-review.md`、`docs/skills/open-ended-adversarial-review-prompt.md`；扫 `docs/analysis/` 既有对抗报告与今日 multi-audit（`2026-08-09-1114-multi-audit-component-audit-round2.md`）去重；随后从**工作区未提交 diff** 与 surface runtime 切入读代码（未提交改动的 wip 区域是 multi-audit 未覆盖的盲区）。
- **去重**：closeOnSubmit 系列（multi-audit P1-01 / P2-02..04 / P3-05..10）、round-2 host 面 37 卡发现、08-07 open-audit 的渲染器行为缺陷——均不重复报告。
- **轮次文件**：`docs/analysis/2026-08-09-1114-open-audit-component-audit-round2/round-01..03.md`（本轮全部发现均经代码直读验证）。
- **基线事实**：未提交 WIP = closeOnSubmit 功能 + table maxWidth 修复（daily log 2026-08-09 顶部条目）；table 改动含 2 个新测试断言但**未跑过真实浏览器**（jsdom 无法验证表格布局）。

## 发现汇总

| #   | 优先级        | 一句话                                                                                                                               |
| --- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | P1            | 未提交 table maxWidth 修复过度矫正：所有无 width 列被硬性封顶 120px，默认表格不再填满容器、宽内容表头/表体错位                       |
| 2   | P1（facet B） | 同一修复覆盖不对称：非 sticky 配置（rowSelection 且无 fixed 列——最常见 CRUD 形态）下 selection/expand 控制列仍会被拉伸，原始缺陷未修 |
| 3   | P2            | H10 注释声称 MemoizedDataRow 比较器「已包含 fixedColumnLayout」，实际未比较（功能性安全，注释事实性错误）                            |
| 4   | P2            | `publishClosedSummary` 与 sibling 的 owner-scope 解析不一致 + use-surface-renderer 两个调用点 scope 回退链不同（潜伏契约分叉）       |

## P1 发现

### [P1-01] table maxWidth 修复过度矫正：无 width 列被硬性封顶 120px → 表格不再填满容器 + 表头/表体错位

- **位置**：`packages/flux-renderers-data/src/table-renderer/table-header-row.tsx:163,176-181`；配合 `use-column-resize.ts:237-243`（`widths[key] ?? resolveColumnWidth(column)` 的 120 fallback）、`table-renderer.tsx:284`（`columnResize` 默认开）、`table-renderer.tsx:293-314`（`effectiveMainColumns` 把 120 写回 `column.width`）
- **是什么**：修复目标（sticky/控制列不被 `table-layout:auto` 剩余空间拉伸）在 `fixed-columns.ts` 的 `createStickyStyle` 处实现正确；但 `table-header-row.tsx` 把 `maxWidth: resolvedWidth` 应用到了**所有**表头单元格。对没有显式 width 的列，`getColumnWidth` 恒 fallback 120（`initialWidths` 对每个可 resize 列预填 120），于是全部无 width 列表头被 `width/minWidth/maxWidth = 120` 硬封顶。CSS auto 表格布局语义下：
  1. `max-width = width` 的单元格无法吸收剩余空间 → `w-full` 表格（`packages/ui/src/components/ui/table.tsx:11`）列宽合计 < 容器宽，右侧留白，**所有默认表格不再拉满容器**；
  2. 内容（cell 默认 `whitespace-nowrap`）宽于 120 时，表体 min-content 把列撑宽、表头被 maxWidth 封在 120 → **表头比列窄**，表头背景/边框与列错位；
  3. `columnResize: false` 时同样生效（非 resizable 列也走 120 fallback），即任何配置下无 width 列都停止拉伸。
- **根因**：maxWidth 策略没有区分「sticky/控制列（应封顶）」与「普通数据列（应允许拉伸填满）」，叠加 `getColumnWidth` 的 120 fallback 从「建议值」变成「硬上限」。
- **影响范围**：所有默认 table（列大多不写 width）——playground/CRUD 最常见形态；daily log 的「resize 交互验证」只验证了 sticky 覆盖行为，未覆盖普通列。
- **为什么值得关心**：修复本身未提交；一旦按现状提交，肉眼可见破坏默认表格布局（空余留白 + 宽内容溢出/错位）。修复方向：maxWidth 只对 sticky/控制列输出；或 `getColumnWidth` 对无 width 列返回 undefined，让表头回落到 `column.width` 语义。
- **信心水平**：很可能（代码级事实确定；布局后果基于成熟的 CSS 表格 auto 布局规则，最终像素表现建议真实浏览器 e2e 确认——这也是为什么需要修复后补一条真实浏览器宿主断言）。

### [P1-02] 同一修复覆盖不对称：非 sticky 配置下 selection/expand 控制列仍会拉伸（原始缺陷未修）

- **位置**：`table-header-row.tsx:396-422,528-557`（表头控制 cell 硬编码 `width: '40px'`、无 maxWidth）；`table-body-row-rendering.tsx:250-299`（表体控制 cell 非 sticky 时无任何宽度样式）；`fixed-columns.ts:99-121`（`resolveEntry` 非 sticky 返回 `{}`）
- **是什么**：`createStickyStyle` 的 maxWidth 只在列真正 sticky 时输出。当表格有 `rowSelection`/`expandable` 但**没有任何 fixed 数据列**（最常见 CRUD 选择表格），表头控制 cell 只有 `width:40px`（无 maxWidth，仍参与剩余空间分配），表体控制 cell 完全无宽度样式 → 控制列依旧被拉伸，「序号/checkbox 列过宽」的原始用户反馈在该配置下原样存在；而普通列却被 P1-01 过度封顶。修复同时**过度**（普通列）与**不足**（控制列）——根因同 P1-01：maxWidth 策略没有按列类别区分。
- **修复方向**：控制列宽度与 sticky 解耦——表头/表体控制 cell 无条件 `width/minWidth/maxWidth = CONTROL_COLUMN_WIDTH`，再叠加 sticky 样式。
- **信心水平**：确定（代码直读）。

## P2 发现

### [P2-01] H10 注释声称 comparator「已包含 fixedColumnLayout」，实际未比较

- **位置**：`packages/flux-renderers-data/src/table-renderer/table-body-row-rendering.tsx:571-616`
- **是什么**：注释（571-580 行）明示 comparator 已含 `fixedColumnLayout` 以关闭 stale-offset 缺口；但 581-616 行的比较器通读后无此项。功能上目前安全——`createFixedColumnLayout` 的全部输入（`mainColumns` 经 `areColumnsRenderEquivalent` 覆盖 `fixed`/`width`、`rowSelection`、`showExpandColumn`）都在比较器里，layout 内容不变则无 stale render；但注释的事实性声明错误，会误导后续扩展比较器的人重蹈注释所述陷阱。
- **修复方向**：比较器补 `prev.fixedColumnLayout === next.fixedColumnLayout`（与注释一致），或改写注释如实描述覆盖关系。
- **信心水平**：确定。

### [P2-02] `publishClosedSummary` owner-scope 解析与 sibling 不一致 + use-surface-renderer 两个调用点 scope 回退链不同

- **位置**：`packages/flux-runtime/src/surface-runtime.ts:56-72`（`clearSurfaceStatus` 用 `entry.ownerScope ?? entry.scope.parent ?? entry.scope`）vs `:74-89`（`publishClosedSummary` 只用 `scope.parent ?? scope`，忽略 ownerScope）；`packages/flux-renderers-basic/src/use-surface-renderer.ts:340,358`（`declarativeScope ?? node.scope`）vs `:380`（`declarativeScope ?? ownerScope`）
- **是什么**：公开 runtime API `publishClosed` 的状态发布目标解析与 sibling 函数不一致；同一渲染器内两个调用点的 scope 回退链也不同。
- **为什么值得关心**：当前调用面（声明式 surface，declarativeScope 通常有值、ownerScope 通常无）下无实际差异，属潜伏契约分叉——一旦 `publishClosed` 被用于 action-style surface 或 declarativeScope 缺失的瞬态渲染，`$surface.status` 会发布/清除到错误 scope。
- **修复方向**：统一三处 owner-scope 解析（`ownerScope ?? parent ?? self`）与两处回退链。
- **信心水平**：确定（代码级）；当前影响范围窄。

## 排除项（已核实为安全/合理，不复报）

- **closeOnSubmit 语义分叉 / 顺序断言 / 50ms 假绿 / 死 catch / fieldRules 遗漏等**：已由今日 multi-audit 登记（P2-02..04 / P3-05..08），本轮不重复。
- **MemoizedDataRow 手写 React.memo**：react19-review 文档允许「已有手写 memo 不需立即删除」，且此处有 load-bearing 说明（test 环境 Compiler 不活跃）——不构成新发现。
- **widths map / `as Record<string, unknown>` 等类型转换**：已由 multi-audit P3-07 覆盖。

## 总评

本轮最有价值的发现集中在一个**未提交的 WIP**（table maxWidth 修复）上：它把「控制列被拉伸」这一局部视觉问题，通过「所有表头 cell 加 maxWidth」的方式过度矫正，形成**所有默认表格列宽冻结在 120px、不再填满容器、宽内容溢出/表头错位**的全局回归；同时又因只在 sticky 配置下封顶，让最常见（非 sticky 选择表格）配置的原始缺陷原样保留。这是一个典型的「修复意图正确、实现层面未按列类别区分、且未做真实浏览器验证」的组合缺陷——修复前必须重构 maxWidth 策略（sticky/控制列封顶、普通列保持可拉伸），并补一条真实浏览器宿主断言（本项目 H 系列纪律的先例）。整体上项目治理良好（37 卡关闭、full-green 基线、多轮审计闭环），但**未提交改动是当前最大的风险面**：今天的 multi-audit 覆盖了 closeOnSubmit，却恰好漏掉了同一批未提交 diff 里的表格布局改动——这正是「灯下黑」的典型位置。

## 盲区自评

1. **布局类验证盲区**：jsdom 无法执行 CSS 表格布局，本报告 P1 的像素级后果（留白尺寸、溢出形态）未做真实浏览器验证——下一轮应在浏览器 host 场景（如 CRUD 页面）对默认表格做列宽和 = 容器宽的断言。
2. **未覆盖面**：本轮聚焦未提交 diff + surface runtime；flow-designer/spreadsheet/report-designer/word-editor 四个 host 包已被 37 卡审计覆盖，未再深入；`flux-renderers-mobile`/`flux-renderers-ai` 非本轮焦点，若有轮次可从「最近一次大改后的跨包组合场景」切入（如 column-resize × column-settings × fixed 列三特性叠加）。
3. **时序类**：closeOnSubmit 与 surface dispose 的竞态（multi-audit 已列为观察项）未做压力/并发验证。

<AI_STEP_RESULT>issues</AI_STEP_RESULT>
