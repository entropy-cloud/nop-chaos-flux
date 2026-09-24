# [card] control:pivot-table

- **批次**: R2-2c ｜ **台账状态**: carded ｜ **日期**: 2026-09-25
- **路由**: `#/pivot-table-demo` ｜ **载体**: 域 demo 页（VTable PivotTable：Sales Pivot 全量配置卡 + Filtered 过滤/progressbar 卡 + Empty 空态卡）
- **矩阵裁剪**: simplified（matrixReason：canvas 渲染、指针由 VTable 接管，DOM 无 hover/选中面（R2-1c 同口径）；**字段拖拽不可达**——demo 为三张静态配置卡，未暴露行列维度切换/拖拽运行时 UI（R2-1c 页单元同裁定，本波复核源码与 demo 均无新增交互通道），中间态按 n/a 记录理由；地板 = light+dark（真 data-mode）、1280×800 + ~800、默认态全查；loading/error 态 DOM 槽位存在性已程序化核（0/1/0））
- 本页实际裁掉的状态：hover/选中（canvas 接管）、字段拖拽（无运行时 UI）、弹层（无载体）、glass 皮肤

## 1. 截图清单

| 状态            | light                                                                              | dark（真 data-mode）                                                              |
| --------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| 默认 1280×800   | `_tmp/visual-inspection-2026-09-25/r2-2c/pivot-table/pivot-default-light-1280.png` | `_tmp/visual-inspection-2026-09-25/r2-2c/pivot-table/pivot-default-dark-1280.png` |
| 默认 ~800 宽    | `_tmp/visual-inspection-2026-09-25/r2-2c/pivot-table/pivot-default-light-800.png`  | —（窄视口风险=布局折叠，light 已证单列 736、docOverX 0）                          |
| canvas 像素判据 | 探针带内 ink 统计（见 §4 C1-01 行）+ 截图目检                                      | canvas 角像素探针 + 截图目检                                                      |

## 2. A–H 维度勾选表

- A 交互：A1 n/a（canvas 接管指针）A2 pass（页头/暗色切换钮 shadcn 族）A3 pass（smallTargets=[] 唯一命中为宿主页脚选择器内部件，非本控件）A4 n/a A5 pass（Empty 卡 `data-slot="pivot-empty"`"暂无销售数据"居中）A6 n/a（无拖拽 UI）A7 n/a A8 n/a A9 n/a
- B 颜色：B1 pass（壳层文本对比正常）B2 pass B3 n/a B4 pass（progressbar 蓝=主题色）B5 **维持 R2-1c-B5-01**（dark 两画布恒白块，截图 `pivot-default-dark-1280.png`：Filtered 卡白表格悬在暗卡中央）B6 n/a
- C 布局：C1 **维持 R2-1c-C1-01**（明细格全空白）+**维持 R2-1c-C1-02**（AVG 168.…. 截断、progressbar 形同虚设——watch 已裁）C2 pass C3 pass（双列网格）C4 pass（800 单列 736、docOverX 0）C5 pass C6 **pass（本波新证据：DPR2 合规）**——attr 1168 = css 584×2（`pivotC6Dpr2 matchDpr2 true`×2），VTable DPR 处理正确
- D 间隔：D1 pass（卡间距 gap-4）D2–D8 pass/n-a
- E 排布：E1 pass E2 **维持 R2-1c-E2-01**（角头空列带仍在，截图可见）E3 pass E4 **维持 R2-1c-E4-01**（数值左对齐/小计行无强化——已知族 R2-1a-E4-01 数值列左对齐族实例，引用）E5 pass E6 pass
- F 一致性：F1–F3 pass（空态模式与 map/graph 一致）F4 pass F5 n/a
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

本波无新增独立条目（新证据均并入 §4 维持行；C6 DPR2 合规为积极面记录）。裁剪说明：字段拖拽中间态不可程序化触达——demo 未暴露维度拖拽 UI 且 `pivot-renderer.tsx` 无拖拽通道，理由记于卡头，不占用 finding 序号。

## 4. R2-1c 页单元裁定复检对照（本波现状，均"维持"，不重复立项）

| R2-1c 条目                                    | 现状探针值（2026-09-25）                                                                                                                                                                                       | 结论                                                                         |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| R2-1c-C1-01 明细格全空白仅小计有值（P1）      | 截图 `pivot-default-light-1280.png`：North/South Q1–Q3 明细行销售额/利润全空、小计行 4050/810/2800/515 在；像素探针 headerBand 10.5% vs detailBand 6.0%（明细带墨迹全部来自行头/格线，无数值字形——与截图互证） | **维持**（`pivot-option.ts` 明细取数路径未变）                               |
| R2-1c-B5-01 dark 画布恒白（P2）               | 截图 `pivot-default-dark-1280.png`：两 canvas 白底黑字悬于暗卡；`pivotDark.rootBg rgba(0,0,0,0)`（壳层已 dark，画布未随）                                                                                      | **维持**                                                                     |
| R2-1c-E2-01 角头区空列（P3）                  | 截图同位空列带可见                                                                                                                                                                                             | **维持**                                                                     |
| R2-1c-E4-01 数值左对齐/小计无强化（P3）       | 截图同状态（已知族 R2-1a-E4-01 数值列左对齐族实例，引用）                                                                                                                                                      | **维持**                                                                     |
| R2-1c-C1-02 AVG progressbar 截断（P3, watch） | `pivot-default-light-1280.png` South 行 "168.…" 截断、进度条细线                                                                                                                                               | **维持**（watch-pool R2-1c-C1-02 不变）                                      |
| 积极面：C6 DPR                                | DPR2 上下文 attr 1168 = css 584×2（两画布 matchDpr2 true）                                                                                                                                                     | **合规**（graph/three/map 域中 VTable 独有正确处理，修复他项时可作参照实现） |

## 5. 已知族命中（引用，不另立项）

- 数值列左对齐族（watch-pool R2-1a-E4-01 族）：本卡 E4 维持行。
- canvas dark 恒白族（R2-1c-B5-01 已裁 systemic 候选）：本卡 B5 维持行。

## 6. 交互键

无法注册：页面无任何程序化可复现的交互中间态（canvas 接管指针、无拖拽 UI、无弹层）——默认态即唯一状态，runner `waitFor` 锚点无增益，理由记于卡内。

## 7. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `pivot-table`（control）→ carded；
  五处 R2-1c 维持项不改判原裁定；C6 DPR 积极面供 R2-4 修复参照；归族后 → digested。
