# [card] page:m4-data

- **批次**: R2-1d ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/m4-data` ｜ **载体**: 域页面（M4a crud 工具栏/查询/分页简化 + M4c chart 高度 clamp + grid/list/cards 响应式列）
- **矩阵裁剪**: simplified+移动专项（裁掉 glass（本波统一）、弹层（无）、拖拽（crud 无拖拽面）。375 主分析 + 800 断点 + 1280 一轮；重点：窄视口排布、chart 自适应、分页简化）

## 1. 截图清单（状态矩阵）

| 状态                                          | light                                                                      | dark                         |
| --------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------- |
| 默认 375×812                                  | `_tmp/visual-inspection-2026-09-23/r2-1d/m4-data/m4-default-375-light.png` | `…/m4-default-375-dark.png`  |
| CRUD 区段 375（查询折叠/工具栏纵排/表格横滚） | `…/m4-crud-375-light.png`                                                  | —                            |
| Chart 区段 375（宽度溢出实拍）                | `…/m4-chart-375-light.png`                                                 | `…/m4-chart-375-dark.png`    |
| CRUD 区段 1280                                | `…/m4-crud-1280-light.png`                                                 | —                            |
| 默认 800×900                                  | `…/m4-default-800-light.png`                                               | `…/m4-default-800-dark.png`  |
| 默认 1280×800                                 | `…/m4-default-1280-light.png`                                              | `…/m4-default-1280-dark.png` |
| hover/disabled/弹层                           | n/a                                                                        | —                            |

## 2. A–H 维度勾选表

- A 交互：A1 ✔ A2 ✔ A3 **warn(R2-1d-A3-02 族实例)**（resize handle 4×39.5） A4 n/a A5 ✔（chart 有 empty/loading 分支——本页恒有数据未触发，loading spinner 组件存在） A6 n/a A7 n/a A8 ✔（查询折叠为按钮） A9 ✔（折叠/展开即点即变）
- B 颜色：B1 ✔ B2 ✔ B3 ✔（chart 红/蓝语义系列与 dark 下可读） B4 ✔（ECharts 主题色经 echarts-theme.ts 合规——简报误报红线） B5 ✔（dark chart 平价，目视同构） B6 n/a
- C 布局：C1 **fail(R2-1d-C1-01)**（chart 375 溢出裁切） C2 ✔（溢出被 section overflow-hidden 剪裁，无叠压） C3 ✔ C4 ✔（crud/grid/list/cards 四件套 375→1280 断点行为全部正确；仅 chart 失败） C5 ✔ C6 ✔（svg width=attr width 一致，非 canvas）
- D 间隔：D1 ✔（五区段 24px 节奏） D2 ✔ D3 ✔（表格行高 375 下 41px 一致） D4 ✔（工具栏组间距走 --crud-toolbar-gap） D5 ✔ D6 ✔（分页条（header 挂载）与表格间距目视 ≥24px；footer 统计条贴合合规） D7 ✔ D8 ✔
- E 排布：E1 ✔ E2 ✔ E3 ✔ E4 ✔（Salary 数值列左对齐为 watch-pool 既有族，不另立项） E5 ✔ E6 n/a
- F 一致性：F5 ✔（crud 分页与 m1 表格分页同构——注意 m1 的空 select 缺陷在本页 crud 不存在（crud 分页 select 有 4 选项），仅 table-pagination-bar 受影响） F1–F4 n/a
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

### [R2-1d-C1-01] M4c chart 窄视口宽度不收缩：533px svg 装进 243px 容器，右半数据与图例被裁

- **页面/路由**: `#/m4-data`（M4c Chart 区段；recharts 柱状图 authored height=400）
- **主题/视口/状态**: light+dark / 375×812 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1d/m4-data/m4-chart-375-light.png`（Jan/Feb/Mar 可见、Mar 柱被拦腰裁切、Apr/May/Jun 完全不可见、图例只剩 Expenses）；dark 同构 `…/m4-chart-375-dark.png`
- **目视描述**: 6 个月数据只渲染出 3 个，右侧被静默裁掉；图例（Revenue）同样被裁只剩 Expenses，无横向滚动可补救（父级 overflow-hidden）。
- **程序化证据**:
  - 探针: chart 容器/svg 测量（`_tmp/r2-1d-probes/m4-out.json` + m4-followup-out.json）
  - 输出: 375 下 `chartW=243, chart.scrollWidth=533, svg[width]=533, .recharts-responsive-container w=533, 图例项 flexWrap=nowrap`；对照 800 下 `chartW=668` 无溢出、1280 下 `svgW=711` 正常。源码 `packages/flux-renderers-data/src/chart-renderer.tsx` L84–100：ResizeObserver 观察 `chart-canvas`（width:100% 但被内部 recharts svg 撑开，形成内容自锁，收窄时测得的仍是 533）；L234 高度 clamp 生效（375 下高≈295≈300 上限）但宽度无 min-w-0/max-w 约束链。
- **对照基准**: 检查提示词 C1（无意外裁切）/C4（视口弹性）；本页自身 M4c 承诺「容器宽度自适应 + 图例换行」。
- **严重程度**: P1（移动视口下关键数据不可读且无替代访问路径）
- **用户影响**: 手机上看该图表丢失一半月份数据和半个图例，且没有任何滚动/缩放补救——「数据展示响应式」的核心承诺失效。
- **修复方向**: `chart-renderer.tsx`：① 给 chart-canvas 观察链加 `min-width: 0`/`max-width: 100%`（或改为观察外层不受内容影响的 wrapper）；② 图例容器补 flex-wrap；③ 回归断言 `svg.getBoundingClientRect().width ≤ widget clientWidth`（375 视口）。
- **归族**: local → R2-4 批（chart-renderer 单根因；修复后建议在 R2-3 汇总时评估是否升系统性）
- **复核状态**: 未复核

### [R2-1d-A3-02 族实例] 列宽手柄 4×39.5（crud 表格，R2-1a-A3 既有族）

- **页面/路由**: `#/m4-data`（crud 表格）
- **主题/视口/状态**: light / 375 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1d/m4-data/m4-crud-375-light.png`
- **目视/证据**: 同 m1 卡实例：`[data-slot="table-column-resize-handle"] w=4 h=39.5`（m4-out.json n375.smallTargets）。
- **对照基准**: WCAG 2.5.8；R2-1a-A3 既有族。
- **严重程度**: P3 ｜ **用户影响**: 同族。 ｜ **修复方向**: 同族既定方向。
- **归族**: watch-only → 台账（R2-1a-A3 族扩面）
- **复核状态**: 未复核

### 正向取证（M4a 承诺逐条验证 pass）

- **switch-per-page 小屏隐藏**: 375 下 crud 内 `select` 数=0；800/1280=2（各 4 选项、68×28 可见）——与 m1 的 table-pagination-bar 空 select 形成对照，crud 分页条正常。
- **查询区默认折叠**: 375 下查询区高 46px（仅「折叠」toggle 行），800/1280 下 254px 展开——mobile 分支强制折叠生效。
- **工具栏纵排**: 375 下 toolbar `flex-direction: column`（Bulk Delete/统计/分页依次堆叠）。
- **表格横滚**: 375 下 table 353px 在 243px 容器内 overflow-x-auto（有意滚动容器，白名单）。
- **grid/list/cards**: 375 下 `data-responsive='narrow'`、grid/cards 1 列、list 行高 44px（py-3 触摸目标）+ nop-hairline 分隔；800/1280 恢复 3 列/36px——三件套断点行为全部正确。

## 4. 误报排除记录

| 疑点                                 | 排除理由                                                                                    |
| ------------------------------------ | ------------------------------------------------------------------------------------------- |
| chart 溢出在 800/1280 消失           | 缺陷仅在收窄路径触发（初始测量后内容自锁）；800 起 svg ≤ 容器，不误报为全视口缺陷           |
| 表格 353>243 横向溢出（C1 扫描命中） | `overflow-x-auto` 有意滚动容器（误报排除表白名单口径）                                      |
| ECharts 系列色与 flux 令牌差异       | 简报误报红线：echarts-theme.ts 合规                                                         |
| toolbar column 在 1280 仍纵排        | toolbarLayout 四槽纵向分组为本 schema 显式编排，桌面下组内横排正常（m4-crud-1280 截图目视） |

## 5. 台账回写

- 本卡完成后：`ledger.md` 对应行 status → `carded`；
- findings 归族：C1-01 → R2-4 local（P1）；A3-02 实例 → watch；
- 批内复检通过后 → `verified`。
