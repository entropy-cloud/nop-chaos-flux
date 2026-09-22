# [card] page:master-detail

- **批次**: R2-1a ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/complex-pages/master-detail` ｜ **载体**: complex-page（master-detail 域）
- **矩阵裁剪**: full（G 画布 n/a；拖拽 n/a；loading 帧未捕获——子表随选中即时加载）

## 1. 截图清单

| 状态                        | light                                                                                   | dark                                      |
| --------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------- |
| 默认 1280×800（未选中空态） | `_tmp/visual-inspection-2026-09-23/r2-1a/master-detail/master-detail-default-light.png` | `…/master-detail-default-dark.png`        |
| 默认 800×900                | `…/master-detail-default-light-narrow.png`                                              | `…/master-detail-default-dark-narrow.png` |
| 主列表选中（第 3 单）       | `…/master-detail-order3-selected-light.png`                                             | —                                         |
| Tab 切换（操作日志）        | `…/master-detail-tab-log-light.png`                                                     | `…/master-detail-tab-log-dark.png`        |
| 子表新增弹层                | `…/master-detail-subtable-add-dialog-light.png`                                         | —                                         |
| 拖拽 / loading              | n/a                                                                                     | n/a                                       |

## 2. A–H 维度勾选表

- A 交互：A1 ✔ A2 ✔ A3 warn（左列表 radio 视觉球 16×16——整行 label 可点为有效热区，缓解后不立项；表格列宽手柄同族 A3-01） A4 n/a A5 ✔（未选中态"请选择左侧订单查看详情"+ 子表"暂无数据"引导明确） A6 n/a（子表 inline edit 归 inline-edit-table 卡深查） A7 ✔ A8 n/a A9 ✔（选中订单 → 右侧详情/子表联动刷新，DOM diff changed=true）
- B 颜色：B1 ✔（dark 表格 17.08:1、tab 13.78:1） B2 ✔ B3 ✔ B4 ✔ B5 warn（弹层受宿主 `--popover` 覆盖已知项影响，确认一句） B6 ✔（radio 选中实心蓝）
- C 布局：C1 fail(R2-1a-C4-05，窄视口) C2 warn(R2-1a-C2-02) C3 ✔（左列表右详情主次清晰） C4 fail(R2-1a-C4-05) C5 ✔ C6 n/a
- D 间隔：D1 ✔（toolbar→表格 16px） D2 ✔ D3 ✔（子表行高 39.6 均匀） D6 ✔ D7 ✔ D8 ✔
- E 排布：E1 ✔ E2 ✔ E3 ✔（列表→详情→子表 F 动线顺） E4 warn（子表金额类列左对齐，归族 R2-1a-E4-01） E5 ✔（tab 子表 vs 堆叠子表分组语言清晰） E6 ✔（三态引导完整）
- F 一致性：F1 ✔ F5 ✔
- G 设计器：n/a
- H 弹层：H1 ✔（子表新增弹层 560px=`--overlay-size-base`） H2 n/a H3 ✔（content bottom 450.8 ≤ 792） H4 fail（同 R2-1a-H4-01，标题 16px/正文 24px 缩进差） H5 fail（同 R2-1a-H5-01：取消/保存左对齐 left=384/446、w=50、gap=12px） H6 ✔ H7 ✔ H8 ✔ H9 ✔

## 3. 发现条目

### [R2-1a-C4-05] 窄视口右详情区被压至 156px，主从双栏不折行

- **页面/路由**: `#/complex-pages/master-detail`
- **主题/视口/状态**: light+dark / 800×900 / 已选中订单
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1a/master-detail/master-detail-default-light-narrow.png`
- **目视描述**: 800px 下左订单列表仍占约 270px，右侧详情/子表区仅 156px：订单详情字段逐字竖排折行（"单号：NO-20240703"折成三行）、明细表只露出 SKU 列一角。
- **程序化证据**:
  - 探针: 溢出扫描（`_tmp/r2-1a-probes/w6-master-detail-probes.json` → `narrowC1`）
  - 输出: `DIV sw=395 cw=156`（订单详情内容区）、`.nop-container sw=269 cw=154`；主内容区被压至不足 1/3
- **对照基准**: C4 视口弹性；主从布局窄屏降级惯例（antd Pro/Material Master-Detail 均在窄屏转堆叠或列表-全屏切换）
- **严重程度**: P1（与 C4-01 同族高频路径；本页双栏结构受损最重）
- **用户影响**: 分屏用户在窄窗口几乎无法读取详情内容；主从联动核心场景受损。
- **修复方向**: 主从 flex 容器 `lg:` 以下改 `flex-col`（列表折叠为可展开选择器或全屏切换模式）；详情摘要字段改 grid 自适应列。
- **归族**: systemic → R2-3 批（与 C4-01/02/03/04 同族）
- **复核状态**: 未复核

### [R2-1a-C2-02] 收货地址表"默认"列在 1280 视口被卡片右缘裁切（列可达但无提示）

- **页面/路由**: `#/complex-pages/master-detail`（非 Tab 堆叠子表）
- **主题/视口/状态**: light / 1280×800 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1a/master-detail/master-detail-default-light.png`（地址表最右列头"默"字截半）
- **目视描述**: 收货地址表 4 列在约 640px 容器内放不下，"默认"列被裁只剩半字，无横向滚动条可见（overlay 滚动条静态隐藏）。
- **程序化证据**: [visual-only + 间接程序佐证] 截图目视；同构表格容器已证实为内层 `overflow-x-auto`（tree-crud follow-up `narrowScroll` 探针同款结构），故列可达性成立；1280 宽下 4 列表仍溢出本身反映列宽分配问题。
- **对照基准**: C1/C2（内容不意外裁切）、C4（表格滚动合理）
- **严重程度**: P3
- **用户影响**: 用户可能不知道右侧还有"默认"列；发现横滚后可达。
- **修复方向**: 地址表"地址"列设 `max-w-*` + truncate，给"默认"列留出定宽；或容器右缘加渐隐遮罩提示可横滚。
- **归族**: local → R2-4 批
- **复核状态**: 未复核

### [R2-1a-H5-02] 子表新增弹层动作左对齐（R2-1a-H5-01 同族第 2 实例）

- **页面/路由**: `#/complex-pages/master-detail` 订单明细 Tab → 新增
- **主题/视口/状态**: light / 1280×800 / Dialog 打开
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1a/master-detail/master-detail-subtable-add-dialog-light.png`
- **目视描述**: 与 standard-crud 表单弹层一致，取消/保存位于弹层左下。
- **程序化证据**:
  - 探针: dialog anatomy（`w6-master-detail.mjs` → `subDialog`）
  - 输出: 取消 left=384(w50)、保存 left=446(w50)、弹层右缘 920；footer 容器未命中 `justify-end`。与 standard-crud 输出逐字节同构 → 同一根因（弹层 actions 模板缺右对齐默认），坐实系统性
- **对照基准**: 同 R2-1a-H5-01（plan 490 anatomy + Dialog/Form Action Button Convention）
- **严重程度**: P1（同族主路径）
- **用户影响**: 同 H5-01；跨页一致地"错"，强化错误心智模型。
- **修复方向**: 同 R2-1a-H5-01（一次模板修复覆盖两页及全部 crud 弹层表单）。
- **归族**: systemic → R2-3 批（并入 H5-01）
- **复核状态**: 未复核

## 4. 误报排除记录

| 疑点                                       | 排除理由                                                                                                |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| 左列表 radio 16×16 命中 A3                 | 整行 `nop-label` 为可点热区（行高 >24px），16px 仅为视觉球，属 registered 误报模式（视觉小控件+大热区） |
| C1 命中 `group/radio-group-item` sw26/cw14 | 同上 opacity-0 原生 radio 白名单                                                                        |
| 未选中页"单号：- 客户：-"疑为空壳          | 属显式空态设计（提示选择左侧订单），E6 通过                                                             |
| 弹层内三个 24×24 同 x 空文本按钮           | 为数组字段每行的删除钮（同 x 不同 y），尺寸合规，非渲染异常                                             |

## 5. 台账回写

- 本卡完成后：`ledger.md` 对应行 status → `carded`；
- findings 归族：C4-05 → R2-3（同族）；H5-02 → R2-3（并入 H5-01）；C2-02 → R2-4 local；
- 批内复检通过后 → `verified`。
