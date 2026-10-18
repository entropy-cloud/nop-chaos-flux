# [card] page:pivot-table-demo

- **批次**: FM-5 shard3（A 组改版页回归复检）｜ **台账状态**: carded ｜ **日期**: 2026-10-18
- **路由**: `#/pivot-table-demo`（domain 路由）｜ **载体**: domain demo 页
- **矩阵裁剪**: simplified（复检口径；矩阵截屏为异步图加载中间帧，以 6s settled 探针为准）

## 1. 截图清单

| 状态                              | light                                                                            | dark                       |
| --------------------------------- | -------------------------------------------------------------------------------- | -------------------------- |
| 默认 1280×800（矩阵帧，mid-load） | `pivot-table-demo-default-1280x800-light.png`（spinner 帧）                      | `...-dark.png`（半渲染帧） |
| settled 探针复核                  | `_tmp/visual-inspection-2026-10-18/fm5-pivot-settled-light.png`（6s 后全量渲染） | —                          |

## 2. A–H 判定（简）

- **C 布局：pass——R2-1c-C1-01（P1 Sales Pivot 明细空白）修复确认**：settled 帧明细单元格数值齐全（1200/240/800…、小计行、列总计）
- B 颜色：carried——R2-1c-B5-01（dark 画布恒白断裂）维持，无恶化
- D 间隔：pass ｜ E 排布：E2-01 角头空列维持登记 ｜ watch：R2-1c-C1-02（AVG 进度条列宽不足、值截断 "168...."）**未复发恶化、原样维持**（watch-pool 在册）

## 3. 发现

- 矩阵批 light/dark 默认帧均为异步加载中间帧（spinner/半渲染）——判定为**截屏时机伪影，非产品缺陷**（探针 6s settled 后零 spinner、canvas 584×420 完整渲染、零 console error）。已在分片汇总登记为矩阵采集口径注意事项。

## 4. 结论

**verdict: pass（回归面；C1-01 修复确认，C1-02/B5-01/E2-01 维持）**。
