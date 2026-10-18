# [card] page:antdpro-dashboard（FM-5 改版页回归复检 · 分片 2）

- **批次**: FM-5 render-recheck shard2 ｜ **台账状态**: carded ｜ **日期**: 2026-10-18
- **路由**: `#/complex-pages/antdpro-dashboard` ｜ **载体**: complex-page（replica，R2-1a 在案页）
- **矩阵裁剪**: simplified（default × dark/light × 1280/800）

## 1. 截图清单

| 状态          | light                                                                              | dark                                                                |
| ------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 默认 1280×800 | `_tmp/visual-inspection-2026-10-18/antdpro-dashboard-default-1280x800-light.png` ✓ | `_tmp/…/antdpro-dashboard-default-1280x800-dark.png` ✓              |
| 默认 800×900  | `_tmp/…/antdpro-dashboard-default-800x900-light.png` ✓（存档未复读）               | `_tmp/…/antdpro-dashboard-default-800x900-dark.png` ✓（存档未复读） |

## 2. 回归判定

**pass（无新回归）**。light：面包屑、KPI×4（数值+图标）、销售趋势折线、渠道占比卡布局正常。dark：**整版 dark 适配已落地**——R2-1a-B5-02（dark 整版保持亮底，P1 域级）在本页**验证已修复**：页面/卡片/图表均为 dark 面且文字可读，无亮块残留、无新黑域。

## 3. 发现条目

无新增回归发现。正向记录：R2-1a-B5-02 域级 dark 半适配在本页修复落地（dark 面完整、KPI/图表可读），建议台账行复核时按本卡销项。
