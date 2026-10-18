# [card] page:input-suggest

- **批次**: FM-5 shard3（B 组存量抽样）｜ **台账状态**: carded ｜ **日期**: 2026-10-18
- **路由**: `#/input-suggest`（domain 路由）｜ **载体**: domain demo 页
- **矩阵裁剪**: simplified（抽样口径；建议下拉为键入触发态，不在矩阵）

## 1. 截图清单

| 状态          | light                                      | dark           |
| ------------- | ------------------------------------------ | -------------- |
| 默认 1280×800 | `input-suggest-default-1280x800-light.png` | `...-dark.png` |
| 默认 800×900  | `input-suggest-default-800x900-light.png`  | `...-dark.png` |

## 2. A–H 判定（简）

- A 交互：pass（默认态：双输入 placeholder、Live form values 区正常）｜ B 颜色：pass（双主题可读）｜ C/D/E：pass ｜ **覆盖缺口**：R2-1d-A5-51（P2 suggestTemplate 区域不渲染、回退「无建议」）为键入交互态，本轮矩阵无对应截图、探针未跑——登记未复核，非「已复核无回归」

## 3. 发现

无新增回归（默认态）。A5-51 登记为覆盖缺口待下轮交互复测。

## 4. 结论

**verdict: pass（默认态基线维持；A5-51 未复核）**。
