# [card] page:sundial-todo-dialog

- **批次**: FM-5 shard3（A 组改版页回归复检）｜ **台账状态**: carded ｜ **日期**: 2026-10-18
- **路由**: `#/complex-pages/sundial-todo-dialog` ｜ **载体**: complex-page
- **矩阵裁剪**: simplified（复检口径；弹层打开态经探针补测）

## 1. 截图清单

| 状态                      | light                                                                | dark                                    |
| ------------------------- | -------------------------------------------------------------------- | --------------------------------------- |
| 默认 1280×800（intro 卡） | `sundial-todo-dialog-default-1280x800-light.png`                     | `...-dark.png`                          |
| 探针补测（弹层打开）      | `_tmp/fm5-shard3-sdd.mjs` + `fm5-sundial-todo-dialog-open-light.png` | `fm5-sundial-todo-dialog-open-dark.png` |

## 2. A–H 判定（简）

- A 交互：pass ｜ **B 颜色：carried——R2-1a-B5-09 维持**：dark 宿主下 360dp 弹层面板保持 #FEFEFE（设计声明）而输入框取 dark token（探针：输入框 bg=oklab 暗色 0.3α、border 亮蓝），观感混排与 R2 相同，可读性无碍 ｜ C 布局：pass ｜ **H 弹层：pass——watch-pool R2-1a-E3-05（弹层动作钮左对齐）本轮不复现**：探针实测 footer `justify-content:flex-end`、按钮序 取消→添加，项目约定已生效

## 3. 发现

- **watch-pool R2-1a-E3-05 关系**：该 watch 项登记时为左对齐待裁决；本轮实测已右对齐——**未复发，且状态好于登记时点**（计划 490/499 actions 契约延伸到本 replica 弹层）。建议台账复核时标记为已消化。
- B5-09 维持（P3 观感混排，设计声明范围）。

## 4. 结论

**verdict: pass（回归面；E3-05 不复现且改善，B5-09 维持）**。
