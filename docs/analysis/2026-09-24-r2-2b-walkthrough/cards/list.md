# [card] control:list

- **批次**: R2-2b ｜ **台账状态**: carded ｜ **日期**: 2026-09-24
- **路由**: `#/lab/list` ｜ **载体**: lab 页（MultiScenarioLabPage，6 场景：Collection with item template / Empty state / Single selection + onItemClick / Multiple selection / Pagination via gotoPage / Infinite scroll load more）
- **矩阵裁剪**: simplified（matrixReason：结构化集合控件，无输入值态/disabled 态；裁掉的状态：glass 皮肤、scope/controlled ownership 两变体（fixture 仅覆盖 local + pagination lab 覆盖 controlled）、onLoadMore 事件断言（归引擎域）；已覆盖 light+dark（真 data-mode）、1280+800 双视口、空/载两态、单选互斥/多选累积、弹层开（onItemClick dialog，Esc 关）、gotoPage 翻页+钳制、无限滚动累积加载+哨兵隐藏）
- **探针**: `_tmp/r2-2b-probes/w3-list.mjs`（主探针，`out-w3-list.json`）、`probe-list-dialog.mjs`（弹层关闭通道）、`probe-list2.mjs`（场景 5 兄弟块几何 + dark 选中行像素采样，`out-w3-list2.json`）、`probe-list3.mjs`（badge 对比度，`out-w3-list3.json`）、`probe-list4.mjs`（focus ring + 无限 footer，`out-w3-list4.json`）
- **探针方法注记**: ①onItemClick 每次行点击都会开弹层——交互探针必须在每次点击后检查并关闭弹层；②list-root `overflow-hidden` 会裁剪行级 focus ring；③badge 像素采样须避开右缘 badge 区（先采样到 badge 伪影）

## 1. 截图清单

| 状态                               | light                                                                                                    | dark（真 data-mode）                                                                                          |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 默认 1280                          | `_tmp/visual-inspection-2026-09-24/r2-2b/list/default-1280-light.png`                                    | `_tmp/visual-inspection-2026-09-24/r2-2b/list/default-1280-dark.png`                                          |
| 默认 800×900                       | `_tmp/visual-inspection-2026-09-24/r2-2b/list/default-800-light.png`                                     | —（窄视口仅 light 复跑）                                                                                      |
| 空态（No tasks yet）               | （1280 默认图下半）                                                                                      | `_tmp/visual-inspection-2026-09-24/r2-2b/list/single-selected-esc-dark.png`（顶部可见空态文本）               |
| 单选选中态                         | `_tmp/visual-inspection-2026-09-24/r2-2b/list/single-selected-800-light.png`                             | `_tmp/visual-inspection-2026-09-24/r2-2b/list/single-selected-1280-dark.png` / `single-selected-esc-dark.png` |
| onItemClick 弹层开                 | `_tmp/visual-inspection-2026-09-24/r2-2b/list/dialog-open-focus-light.png` / `dialog-open-800-light.png` | `_tmp/visual-inspection-2026-09-24/r2-2b/list/dialog-open-1280-dark.png`                                      |
| 多选累积                           | `_tmp/visual-inspection-2026-09-24/r2-2b/list/multiple-selected-800-light.png`                           | `_tmp/visual-inspection-2026-09-24/r2-2b/list/multiple-selected-1280-dark.png`                                |
| gotoPage 页 2                      | `_tmp/visual-inspection-2026-09-24/r2-2b/list/goto-page2-800-light.png`                                  | `_tmp/visual-inspection-2026-09-24/r2-2b/list/goto-page2-1280-dark.png`                                       |
| 无限滚动加载完（12/12 + 哨兵隐藏） | `_tmp/visual-inspection-2026-09-24/r2-2b/list/infinite-loaded-800-light.png`                             | `_tmp/visual-inspection-2026-09-24/r2-2b/list/infinite-loaded-1280-dark.png`                                  |
| 键盘 focus ring                    | —                                                                                                        | `_tmp/visual-inspection-2026-09-24/r2-2b/list/focus-ring-dark.png`                                            |

## 2. A–H 维度勾选表

- A 交互：A1 pass（`cursor-pointer hover:bg-muted` 行 hover 链）A2 **warn(R2-2b-A2-88)**（ring 存在 rgb(77,141,245) 但首行 focus 时被 list-root `overflow-hidden` 裁成"下划线"）A3 pass（行高 36px + 全宽行点击区，扫描 0 命中）A4 n/a A5 pass（empty 区域渲染有意义提示 "No tasks yet — add one to get started."，h44 非空白；infinite loading 用 Spinner 非纯文本——源码 `list-renderer.tsx` L567 `t('flux.list.loadingMore')`+Spinner，加载过快无法现场截取）A6/A8 n/a A7 pass（onItemClick 弹层开：overlay+portal 正常、Esc 关闭生效——关闭通道专项探针 `afterEsc1: {open:false}`）A9 pass（单选互斥 `[null,true,null]`、多选累积 `[true,null,true]`、gotoPage 再切片、无限累积 4→12 + 末页哨兵隐藏，全部可见非静默）
- B 颜色：B1 pass（行文本 dark 像素采样达标；**badge 内文字 3.18:1 为 R2-2a-B5-01/B1-02 已裁定族实例**，引用不另立项）B2 pass B3 pass B4 pass（data-selected 驱动 bg-muted/primary tint 走令牌）B5 pass（dark 选中行 tint vs 普通行 1.13 可辨、文字 13+:1，无白底块）B6 n/a
- C 布局：C1 pass（docOverX 0、hits 0——本页 scope-debug 无长令牌）C2 pass C3 pass C4 pass（800 视口行不截断）C5 pass C6 n/a
- D 间隔：D1 pass（行高 36px 一致、hairline 分隔）D2–D5 n/a/pass **D6 pass（注明）**：场景 5 分页条 UI 不存在（见 R2-2b-F5-87），兄弟块序列 = list-root → gotoPage 按钮行 → scope-debug，list 底(3232)→按钮行顶(3256) gap 24px 落栅格；D6 对"列表内嵌分页条"的锚点在本控件无对象
- E 排布：E1 pass E2 pass（badge 弱于主文本）E3 pass E4 pass（行左缘 x302 对齐、文本基线一致）E5 pass（hairline 单一分组语言）E6 pass（空态有任务引导文案）
- F 一致性：F1 n/a F2–F3 pass（与 table 分页/空态家族同构）F4 **warn**（i18n 族：`flux.list.loadingMore` 走 zh-CN 回退（源码 t() 调用，R2-2a-F4-11 族根因）；空态文案 fixture 英文不受影响）**F5 fail(R2-2b-F5-87)**（page 模式无内建分页条，跨组件分页条家族缺席者）
- G 设计器：n/a
- H 弹层：pass（onItemClick 弹层开态完整：overlay/portal/Esc；深度走查归 dialog 卡，不重复）

## 3. 发现条目

### [R2-2b-F5-87] list page 模式无内建分页条 UI：`pagination.enabled` 只切数据不给出翻页可供性，`showSizeChanger` 为死配置——F5 跨组件分页条家族缺席者

- **页面/路由**: `#/lab/list`（场景 5 "Pagination via gotoPage"；任何 `pagination: { enabled: true, mode: 'page' }` 的 list 同险）
- **主题/视口/状态**: 双主题 / 1280 / 默认态
- **截图**: `_tmp/visual-inspection-2026-09-24/r2-2b/list/goto-page2-1280-dark.png`（列表下方仅有 fixture 外挂的 Page 1/2/3 按钮，无分页条）
- **目视描述**: 列表只显示前 4 条（pageSize 4 / total 12），页面上没有任何分页条或"共 N 条"信息；用户除非点击 fixture 特意外挂的按钮，无从得知有后续页、也无法翻页。
- **程序化证据**:
  - 探针: `_tmp/r2-2b-probes/probe-list2.mjs`（兄弟块几何扫描）
  - 输出: 场景 5 兄弟块序列 `[list-root(demo-list-pagination), nop-flex(Page 1/2/3 按钮), scope-debug]`——`[data-slot="pagination-root"]` 全页查找 `pagFound: false`；源码核对 `packages/flux-renderers-data/src/list-renderer.tsx` 仅 infinite 模式渲染内建 footer（L564 `list-infinite`），page 模式无任何 bar 渲染分支；`list-pagination.ts` 只做状态机（applyPage/gotoPage capability）。schemas.ts L316 `showSizeChanger?: boolean` 注释为 "Host UI hint to show a page-size selector"——渲染层无消费点（page 模式无 UI 可挂）。对照：table（TablePaginationBar）/crud（CrudListPagination）/standalone pagination（pagination-renderer）三条分页条已由 plan 490 收敛同锚点，list 为列表家族唯一无 bar 成员。
- **对照基准**: 检查提示词 F5（同语义分页条跨组件一致）；已知族"schema 契约缺口（R2-3 候选）"；AMIS list 自带分页器对标
- **严重程度**: P3（复核降级 2026-09-24 review-b：design.md L56 明文裁定 list 不内建分页 UI，属文档化设计决策非静默缺口；剩余缺陷=showSizeChanger 死配置+零诊断）
- **用户影响**: schema 作者写 `pagination.enabled` 期望出现分页器（AMIS 语义），实际只有切片生效——用户看到"被截断的列表"且无翻页入口；`showSizeChanger` 写了没有任何效果。
- **修复方向**: 二选一并落文档：①list-renderer page 模式补内建分页条（复用 plan490 收敛的 pagination bar + `--space-block-gap` 锚点，ownership=controlled 时不渲染保持现契约）；②schemas.ts 移除/标注 `showSizeChanger` 并在 flux-guide 明示"page 模式翻页 UI 由宿主负责"，lab 场景描述同步。
- **归族**: systemic → schema 契约缺口族（R2-3 候选）+ F5 分页条家族
- **复核状态**: 已复核（降级 P2→P3，review-b 2026-09-24）：行为全部成立，但 list/design.md L56 明文裁定 list 不内建分页 UI（文档化设计决策非静默缺口）；剩余真实缺陷=showSizeChanger 死配置+零诊断

### [R2-2b-A2-88] 行 focus ring 被 list-root `overflow-hidden` 裁剪：首行聚焦时 ring 只剩底部 2px"下划线"

- **页面/路由**: `#/lab/list`（场景 3 单选列表首行；所有行级 focus 场景首行同险）
- **主题/视口/状态**: dark（真 data-mode）/ 1280 / 键盘聚焦首行
- **截图**: `_tmp/visual-inspection-2026-09-24/r2-2b/list/single-selected-esc-dark.png`（选中行底部蓝色下划线状 ring）；`focus-ring-dark.png`（row 2 中部行 ring 完整可辨）
- **目视描述**: 点击+关闭弹层后焦点回到首行，首行周围不见完整 focus ring，仅其下边缘一条 2px 蓝线，形似随机下划线；中部行聚焦时 ring 完整。
- **程序化证据**:
  - 探针: `_tmp/r2-2b-probes/probe-list4.mjs`
  - 输出: 行 rect `y 381.5 h 36`（首行），parent rect `y 344.5 h 110`、`parentOverflow: "hidden"`；focus 时 `boxShadow` 含 `rgb(77,141,245)`（ring-2 ring-ring 生效）。首行 ring 上缘与容器内容顶重合、左右缘与容器边框重合 → 三边被 `overflow-hidden` 裁剪，仅底边落入容器内部可见。中部行（rowRect 在 parentRect 内缩 >2px）ring 四边完整。
- **对照基准**: WCAG 2.4.11 / 检查提示词 A2（focus-visible 有可见环且不被遮挡）
- **严重程度**: P3（ring 仍部分可见——底部 2px；键盘用户可定位但形态误导）
- **用户影响**: 首行聚焦时视觉焦点指示弱且形态怪异（一条线），键盘走查容易误判为无 focus 态。
- **修复方向**: `list-renderer.tsx` 行类链改用 `focus-visible:ring-inset`（ring 画在行内），或 list-root 放弃 `overflow-hidden` 改用行级圆角收口；选中态/悬停态不受影响可同步核查。
- **归族**: local → R2-4 批（单控件 CSS 收口）
- **复核状态**: 未复核

## 4. 已知族命中（引用，不另立项）

- **dark badge 不可读族**（R2-2a-B5-01，P1 已裁定，修复面收窄至 `--secondary-foreground` 翻转）：list 行内 priority badge dark 实测 `color rgb(49,102,188) on bg rgb(203,186,252)` ≈3.18:1——同族新实例证据（`out-w3-list3.json`）；light 侧同属 R2-2a-B1-02 四语义色 <4.5:1 族。
- **i18n zh-CN 回退族**（R2-2a-F4-11）：`t('flux.list.loadingMore')` 等无限加载 chrome 走 zh-CN 回退。
- **lab 载体与环境基建族**：scope-debug 面板（调试/折叠）随载体出现。
- **计划内锚点复检通过**：空态区域（`empty` 插槽渲染非空白提示）；单选互斥/多选累积局部状态机；gotoPage capability 钳制（Page 3=末页，`data-current-page: 3`）；无限滚动哨兵（末页 `sentinelVisible:false`、累积 12/12）；弹层关闭通道（Esc 一次生效，探针 `out-w3-list-dialog.json`）。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-list` → carded（卡列填本路径）；findings 归族后 → digested。
