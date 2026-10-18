# [card] page:w3c-value-mapping

- **批次**: FM-5 shard3（B 组存量抽样）｜ **台账状态**: carded ｜ **日期**: 2026-10-18
- **路由**: `#/w3c-value-mapping`（domain 路由）｜ **载体**: W3c 组件族 demo 页
- **矩阵裁剪**: simplified（抽样口径）+ 探针补测（badge 对比度实测）

## 1. 截图清单

| 状态          | light                                                                         | dark           |
| ------------- | ----------------------------------------------------------------------------- | -------------- |
| 默认 1280×800 | `w3c-value-mapping-default-1280x800-light.png`                                | `...-dark.png` |
| 默认 800×900  | `w3c-value-mapping-default-800x900-light.png`                                 | `...-dark.png` |
| 探针          | `_tmp/fm5-shard3-w3c.mjs`（Completed/Pending/Failed/Running 四 badge 对比度） | 同左           |

## 2. A–H 判定（简）

- A 交互：pass ｜ **B 颜色：carried（部分改善）**——R2-1d-B1-31 复测：**dark 全档达标**（Completed 9.78 / Pending 9.21 / Failed 5.96 / Running 9.78，R2 dark error 3.17 已修复）；**light warning（Pending 琥珀）2.13:1 仍 <3**（R2 实测 1.9，微改善未达标；Completed/Failed/Running light 6.45/6.07/6.45 达标）｜ C/D/E：pass

## 3. 发现

无新增回归。B1-31 维持「部分收敛」状态：dark 修复确认、light warning 档未达标——随原裁决口径继续在册（amber token 白底固有低对比，修复面在语义 warning 档 light token）。

## 4. 结论

**verdict: pass（基线维持；B1-31 dark 改善、light warning 仍不足）**。
