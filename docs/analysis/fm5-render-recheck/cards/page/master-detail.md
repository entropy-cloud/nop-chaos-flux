# [card] page:master-detail

- **批次**: FM-5 shard3（A 组改版页回归复检）｜ **台账状态**: carded ｜ **日期**: 2026-10-18
- **路由**: `#/complex-pages/master-detail` ｜ **载体**: complex-page
- **矩阵裁剪**: simplified（复检口径；子表弹层经探针补测 footer 对齐）

## 1. 截图清单

| 状态          | light                                                                                                                                           | dark           |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| 默认 1280×800 | `master-detail-default-1280x800-light.png`                                                                                                      | `...-dark.png` |
| 默认 800×900  | `master-detail-default-800x900-light.png`                                                                                                       | `...-dark.png` |
| 探针补测      | `_tmp/fm5-shard3-md-dialog2.mjs`（打开子表新增弹层测 footer 对齐）；副证 `_tmp/visual-inspection-2026-10-18/fm5-master-detail-dialog-light.png` | —              |

## 2. A–H 判定（简）

- A 交互：pass ｜ B 颜色：pass ｜ C 布局：carried——**R2-1a-C4-05（窄视口右详情压窄）维持**：800px 下右详情仍 ~175px 窄栏、字段逐字折行，量级与 R2 相当，无恶化；C2-02（默认列右缘裁切）维持 P3 登记（1280 双主题均可见「默」字贴边）｜ H 弹层：**pass——R2-1a-H5-02（P1 弹层动作左对齐）修复确认**：探针实测 actions 容器 `display:flex; justify-content:flex-end; gap:12px`，按钮序 取消→保存

## 3. 发现

无新增回归。C4-05/C2-02 维持登记；H5-02 修复确认（R2-3b plan 499 契约在本页成立）。

## 4. 结论

**verdict: pass（回归面；H5-02 修复确认，窄视口族维持登记）**。
