# [card] control:pagination

- **批次**: R2-2b ｜ **台账状态**: carded ｜ **日期**: 2026-09-24
- **路由**: `#/lab/pagination` ｜ **载体**: lab 页（MultiScenarioLabPage，4 场景：Simple pagination / With page size selector / Boundary clamp / Host pagination drives a list data flow）
- **矩阵裁剪**: simplified（matrixReason：单条交互控件、无弹层无拖拽无异步；裁掉的状态：glass 皮肤、focus 键盘走查（链接 `focus-visible:ring-3` 类链存在，交互机制与 button 卡同族，未逐环截图）；已覆盖 light+dark（真 data-mode）、1280+800 双视口、页码点击态、页尺寸切换态、边界钳制态、宿主驱动列表联动态）
- **探针**: `_tmp/r2-2b-probes/w3-pagination.mjs`（主探针，输出 `out-w3-pagination.json`）、`w3-pagination2.mjs`（点击机制/溢出细节/场景 4 几何，`out-w3-pagination2.json`）、`probe-pag5.mjs`（双主题对比度，`out-w3-pagination-contrast.json`）、`probe-pag6.mjs`（边界钳制，`out-w3-pagination-clamp.json`）
- **探针方法注记**: 页码为 `<a role="button" data-slot="pagination-link" data-page="N">` 非 `<button>`——交互探针必须用 `[data-slot=pagination-link]` 选择器（首轮 button 定位全部超时，已修正复跑）

## 1. 截图清单

| 状态                              | light                                                                           | dark（真 data-mode）                                                                                           |
| --------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 默认 1280                         | `_tmp/visual-inspection-2026-09-24/r2-2b/pagination/default-1280-light.png`     | `_tmp/visual-inspection-2026-09-24/r2-2b/pagination/default-1280-dark.png`                                     |
| 默认 800×900                      | `_tmp/visual-inspection-2026-09-24/r2-2b/pagination/default-800-light.png`      | —（几何与 1280 无差异，仅 light 复跑）                                                                         |
| 页尺寸选 50（重置回页 1）         | `_tmp/visual-inspection-2026-09-24/r2-2b/pagination/pagesize50-1280-light.png`  | `_tmp/visual-inspection-2026-09-24/r2-2b/pagination/pagesize50-1280-dark.png` / `pagesize50-followup-dark.png` |
| 800 视口页尺寸态                  | `_tmp/visual-inspection-2026-09-24/r2-2b/pagination/pagesize50-800-light.png`   | —                                                                                                              |
| 边界钳制（999→页 3/3）+ next 禁用 | —（clamp 状态以探针为准）                                                       | —                                                                                                              |
| 边界走查后（页 2 态）             | `_tmp/visual-inspection-2026-09-24/r2-2b/pagination/clamp-and-walked-light.png` | —                                                                                                              |
| 场景 4 宿主驱动列表               | `_tmp/visual-inspection-2026-09-24/r2-2b/pagination/scenario4-1280-light.png`   | `_tmp/visual-inspection-2026-09-24/r2-2b/pagination/scenario4-1280-dark.png`                                   |
| 场景 4 点页 2 后（列表再切片）    | —                                                                               | `_tmp/visual-inspection-2026-09-24/r2-2b/pagination/scenario4-page2-dark.png`                                  |

## 2. A–H 维度勾选表

- A 交互：A1 pass（`hover:bg-muted` 类链存在 + `transition` 定义）A2 pass（`focus-visible:ring-3 focus-visible:ring-ring/50` 全链接覆盖）A3 pass（**全链接 32×32**，smallTargets 扫描 0 命中——本控件是 A3 族的反例正面样本）A4 pass（边界 prev/next `aria-disabled` + opacity 0.5 + `pointer-events:none` 三通道齐备，探针实测）A5 n/a（无异步；场景 4 列表数据本地即时切片）A6/A8 n/a A7 n/a A9 pass（页码点击 → `data-current-page` 更新 → 活动页 pill 即时迁移；页尺寸变更 → 重置页 1，schema 承诺行为全部实测成立）
- B 颜色：B1 pass（dark 链接文字 13.78:1；light 侧信息文本 12.61:1）B2 pass（活动页 pill：dark `border-input` + bg-input/30 tint，实测 vs 页面底 ≈1.3:1——低于 3:1 但叠加边框+tint 双通道，截图目视清晰可辨，记 watch 备注）B3 pass B4 pass（全令牌）B5 pass（dark 无白底块，disabled 次态 opacity 0.5 可感知）B6 pass（活动态非默认蓝，用 border+bg tint 档）
- C 布局：C1 pass（docOverX 0；唯一溢出命中为 `span.sr-only` overX 47——有意屏幕阅读器元素，误报排除）C2 pass C3 pass C4 pass（800 视口 8 链接+选择器不折行不溢出）C5 pass C6 n/a
- D 间隔：D1 pass（链接间 gap-2px 档，紧凑一致）D2 n/a D3 n/a D4 pass D5 n/a **D6 pass**（场景 4 standalone pager 与宿主列表 `gapPagerToList 24px`——≥8px 且落 8 栅格；plan490 `--space-block-gap` 锚点分页根节点 `mt-[var(--space-block-gap)]` 生效，复检通过）D7 pass D8 n/a
- E 排布：E1 pass E2 pass（活动页 pill 强于普通页码）E3 pass（prev 左 next 右惯例）E4 pass（链接 y 基线一致 32×32 等格）E5 n/a E6 n/a
- F 一致性：F1 pass（与 table/crud 分页条同用 ui Pagination 族，F5 跨组件锚点在 lab 面成立）F2–F3 n/a F4 **warn**（i18n zh-CN 回退族命中：aria-label/title "上一页/下一页"中文出现在英文 lab 页——R2-2a-F4-11 族新实例，引用不另立项）F5 pass（场景 4 列表受控分页与 standalone 同构）
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

（无 P0–P2 发现。本控件为 data 批内最干净面：A3/边界态/受控联动全部实测通过。）

### [R2-2b-F4-84] i18n zh-CN 回退族实例：pagination chrome 中文 aria-label/title（族引用，不另立新族）

- **页面/路由**: `#/lab/pagination`（全部场景）
- **主题/视口/状态**: 双主题 / 全视口 / 默认态
- **截图**: `_tmp/visual-inspection-2026-09-24/r2-2b/pagination/default-1280-light.png`
- **目视描述**: 英文 lab 页上 hover 页码链接出现中文 title"上一页/下一页"。
- **程序化证据**:
  - 探针: `_tmp/r2-2b-probes/probe-pag3.mjs`（markup dump）
  - 输出: `<a data-testid="pagination-prev" aria-label="上一页" title="上一页">`；flux-i18n 未随宿主初始化时回退 zh-CN（同 R2-2a-F4-11 主条目根因）。
- **对照基准**: R2-2a-F4-11 已知族（flux-i18n zh-CN 回退）
- **严重程度**: P3
- **用户影响**: 同族既有判定——英文用户读到中文辅助文案。
- **修复方向**: 同族主条目（playground 入口 initFluxI18n）。
- **归族**: systemic → R2-2a-F4-11 族实例挂账
- **复核状态**: 未复核

## 4. 已知族命中（引用，不另立项）

- **i18n zh-CN 回退族**（R2-2a-F4-11）：上一页/下一页 aria+title 中文，见 R2-2b-F4-84。
- **lab 载体与环境基建族**：scope-debug 面板（调试/折叠）随载体出现，引用既有裁定。
- **计划内锚点复检通过**：① D6 `--space-block-gap` 12px 锚点（pagination 根 `mt-[var(--space-block-gap)]`，实测 standalone pager↔宿主列表 24px 落栅格）；② F5 跨组件分页条同构（ui Pagination 复用）；③ 边界钳制契约（999→3/3，next aria-disabled 三通道）；④ 页尺寸变更重置页 1（mode=with-page-size）；⑤ 场景 4 statusPath 驱动受控列表端到端（页 1→Record 1/2，页 2→Record 3/4，列表根 `data-current-page` 同步）；⑥ A3 正面样本（全交互目标 32×32）。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-pagination` → carded（卡列填本路径）；findings 归族后 → digested。
