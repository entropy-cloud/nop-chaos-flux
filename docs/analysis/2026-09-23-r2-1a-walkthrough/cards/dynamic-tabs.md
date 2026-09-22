# [card] page:dynamic-tabs

- **批次**: R2-1a ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/complex-pages/dynamic-tabs` ｜ **载体**: complex-page（数据列表域：tabs + mountOnEnter DynamicRenderer 远程 schema）
- **矩阵裁剪**: simplified（裁剪理由 matrixReason：本页为双页签 fixture——页签溢出 C1 不可触发（仅 2 页签、tablist 118px）；loading 帧不可捕获（mock 即时返回，代码层确认 DynamicRenderer 具备 loading 态）；无弹层/拖拽/写操作 → A4/A6/A7/A8 n-a；裁掉的状态：glass 皮肤（本波统一）、error 态、拖拽、弹层）

## 1. 截图清单（状态矩阵，逐张列路径）

| 状态                                          | light                                                                                      | dark                                         |
| --------------------------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------- |
| 默认 1280×800（概览页签激活）                 | `_tmp/visual-inspection-2026-09-23/r2-1a/dynamic-tabs/dynamic-tabs-default-wide-light.png` | `…/dynamic-tabs-default-wide-dark.png`       |
| 默认 800×900                                  | `…/dynamic-tabs-default-narrow-light.png`                                                  | `…/dynamic-tabs-default-narrow-dark.png`     |
| 切至"远程数据"后（远程 CRUD 已加载）          | `…/dynamic-tabs-remote-loaded-wide-light.png`                                              | `…/dynamic-tabs-remote-loaded-wide-dark.png` |
| 切换瞬间（loading 帧尝试）                    | `…/dynamic-tabs-remote-loading-wide-light.png`（60ms 时已加载完毕——mock 即时）             | —                                            |
| 往返切换后再入远程页签                        | `…/dynamic-tabs-remote-revisit-wide-light.png`（3 行保留、无重复请求 spinner）             | —                                            |
| focus-visible（页签，键盘 focusVisible 强制） | `…/dynamic-tabs-tab-focus-keyboard-light.png`                                              | —（探针 outline 3px solid）                  |
| 弹层/拖拽/loading/empty/error                 | n/a（无弹层、无拖拽；loading 见上；远程数据恒 3 行无 empty/error 触发路径）                | n/a                                          |

## 2. A–H 维度勾选表

- A 交互：A1 warn(P3，见 R2-1a-A1-02：页签 hover 无背景反馈，仅文字色微变) A2 ✔（页签 focus-visible outline 3px solid rgba(2,8,23,0.6)，强制态探针坐实） A3 ✔（本页可交互元素 min(w,h)<24 扫描 0 命中；页签 70×25） A4 n/a A5 n-a（loading 态存在但 mock 无法触发，见裁剪说明） A6 n/a A7 n/a A8 n/a A9 ✔（mountOnEnter 懒加载语义成立：默认态 DOM 无远程表，点击后才出现 3 行；往返切换内容保留不重载）
- B 颜色：B1 ✔（正文/卡片文字对比正常，dark 单元格 rgb(248,250,252)） B2 ✔ B3 ✔（本页无语义色对象） B4 ✔ B5 ✔（dark 激活页签 `oklab(0.285 …/0.3)` 半透明底 + 白字，远程表 dark 可读） B6 ✔（激活页签白底/暗底非默认蓝一键切）
- C 布局：C1 ✔（双主题双视口 C1 扫描 0 命中；仅 2 页签无溢出面） C2 ✔ C3 ✔（页签区/内容区分区清楚） C4 ✔（800px 不塌不挤，卡片正常换行） C5 ✔ C6 n/a
- D 间隔：D1 ✔（页签-内容、卡片内 title/body 节奏成栅格；远程表分页条与表底 12px，同 `--space-block-gap` 组件证据见 crud-views-export 卡 cvD6 实测） D2 ✔ D3 ✔ D4 ✔ D5 n/a D6 ✔（同上，同分页组件） D7 ✔ D8 ✔
- E 排布：E1 ✔（页签名+卡片标题可答"这页是什么"；宿主头部提供页面说明） E2 ✔（激活页签强于未激活） E3 ✔ E4 warn(R2-1a-E4-01 同族：远程表"数值"列左对齐) E5 ✔ E6 ✔（静态页签含说明文字引导点击"远程数据"）
- F 一致性：F1 ✔（页签样式与 crud-views-export 页签同构） F3 ✔ F5 ✔（远程表分页条与全站同构）
- G 设计器：n/a（非画布页）
- H 弹层：n/a（本页无弹层）

## 3. 发现条目

### [R2-1a-A1-02] 页签 hover 无可感知反馈（背景不变、下划线不显）

- **页面/路由**: `#/complex-pages/dynamic-tabs`（同款 ui Tabs 用于 crud-views-export；两页同构）
- **主题/视口/状态**: light / 1280×800 / 指针悬停未激活页签
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1a/dynamic-tabs/dynamic-tabs-remote-loaded-wide-light.png`（页签区放大目视；hover 态以探针读值为准）
- **目视描述**: 悬停"概览/远程数据"页签时外观几乎不变，只有极轻微的文字色差，难以预判可点击。
- **程序化证据**:
  - 探针: `page.hover()` 后读 computed style（`w4-tabs-crud-out.json` → dtTabStates.hoverC）
  - 输出: hover 后 `backgroundColor: rgba(0,0,0,0)`（与默认相同透明）、color 与默认值一致量级（无亮度跳变）；激活态则有白底强区分——即 hover 与 default 无差异
- **对照基准**: 检查提示词 A1（hover 态存在且可感知）
- **严重程度**: P3（悬停可供性弱，用户仍可凭激活态与光标形状完成切换；桌面端影响小）
- **用户影响**: 用户悬停页签得不到"可点"预判，触屏无影响；与行/按钮 hover 反馈的页面内一致性略降。
- **修复方向**: ui TabsTrigger 补 `hover:bg-muted/50 hover:text-foreground`（或 hover 下划线过渡），不动激活态样式。
- **归族**: watch-only → watch-pool.md（summary §6 口径对齐；P3 单页实例）（ui 组件层，一次改动全站页签生效）
- **复核状态**: 未复核

### watch-only（不立项，记录待观察）

- 远程表（RemoteTabContent fixture）三列均分宽度：仅 1 位数字的"编号"列占 ~305px（无列宽提示时等分策略），fixture 数据量小，观感略空；属 schema 未配 width，非渲染缺陷。
- 切换瞬间无可见 loading（mock 即时）；DynamicRenderer 代码具备 loading/error 态（`dynamic-renderer.tsx` setState loading），建议后续给 mock 加人工延迟后在复检轮补帧。

## 4. 误报排除记录

| 疑点                                             | 排除理由                                                                                                                     |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| 键盘 Tab 12 次未达页签（A2 初测假阴性）          | 宿主侧栏有数十个导航链接先于内容区获得焦点，非 flux 页签不可聚焦；`focus({focusVisible:true})` 强制后 outline 3px solid 坐实 |
| 默认态整页大面积空白                             | fixture 单卡片页固有形态，宿主头部已给页面说明，E1 判过；非组件壳堆叠缺陷                                                    |
| 程序化 `el.focus()` 后页签无 outline（首轮探针） | 程序化 focus 不触发 `:focus-visible` 启发式（known false-positive 模式），强制态复验后排除                                   |

## 5. 台账回写

- 本卡完成后：`ledger.md` 对应行 status → `carded`（card 列填本路径）；
- findings 归族：A1-02 → R2-4 local 批；
- 批内复检通过后 → `verified`。
