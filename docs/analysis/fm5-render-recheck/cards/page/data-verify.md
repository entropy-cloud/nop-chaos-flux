# [card] page:data-verify

- **批次**: FM-5 shard3（B 组存量抽样）｜ **台账状态**: carded ｜ **日期**: 2026-10-18
- **路由**: `#/data-verify`（domain 路由）｜ **载体**: domain 机制验证页
- **矩阵裁剪**: simplified（抽样口径）

## 1. 截图清单

| 状态          | light                                    | dark           |
| ------------- | ---------------------------------------- | -------------- |
| 默认 1280×800 | `data-verify-default-1280x800-light.png` | `...-dark.png` |
| 默认 800×900  | `data-verify-default-800x900-light.png`  | `...-dark.png` |

## 2. A–H 判定（简）

- A 交互：pass ｜ **B 颜色：pass——R2-1c-B1-01（dark primary 按钮白字 3.26:1）修复确认**：dark 帧主按钮白字蓝底对比达观感达标（R2-4 实测 --primary dark 5.07），数据行/调试区文本双主题可读 ｜ C 布局：pass ｜ D 间隔：pass ｜ E 排布：E2-26 watch 族（主按钮默认栈全宽拉伸）实例维持登记

## 3. 发现

无新增回归。watch-pool 关系：E2-26 族实例（全宽 primary）维持原裁决，未恶化。

## 4. 结论

**verdict: pass（基线维持；B1-01 改善确认）**。
