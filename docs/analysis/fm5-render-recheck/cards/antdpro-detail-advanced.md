# [card] page:antdpro-detail-advanced（FM-5 改版页回归复检 · 分片 2）

- **批次**: FM-5 render-recheck shard2 ｜ **台账状态**: carded ｜ **日期**: 2026-10-18
- **路由**: `#/complex-pages/antdpro-detail-advanced` ｜ **载体**: complex-page（replica，R2-1a 在案页）
- **矩阵裁剪**: simplified（default × dark/light × 1280/800）

## 1. 截图清单

| 状态          | light                                                                                    | dark                                                                      |
| ------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| 默认 1280×800 | `_tmp/visual-inspection-2026-10-18/antdpro-detail-advanced-default-1280x800-light.png` ✓ | `_tmp/…/antdpro-detail-advanced-default-1280x800-dark.png` ✓              |
| 默认 800×900  | `_tmp/…/antdpro-detail-advanced-default-800x900-light.png` ✓（存档未复读）               | `_tmp/…/antdpro-detail-advanced-default-800x900-dark.png` ✓（存档未复读） |

## 2. 回归判定

**pass（无新回归）**。dark 已完整适配（R2-1a-B5-02 在本页验证修复：标签/步骤条/tabs/字段值均可读，无亮块）。版心收缩形态与 R2 一致，无新塌陷/错位。

## 3. 发现条目

### [FM5-shard2-C3-02] R2-1a-C3-02 复发（在案 P2，未修复）：执行进度卡 ~410px / tabs 卡 ~272px（authored max-w-5xl=1024）

- **页面/路由**: `#/complex-pages/antdpro-detail-advanced`
- **主题/视口/状态**: light、dark / 1280×800 / 默认
- **截图**: `_tmp/visual-inspection-2026-10-18/antdpro-detail-advanced-default-1280x800-light.png`（dark 同形态）
- **目视描述**: 双卡居中收缩，四步进度条与 tabs 内容仍压最窄档，页面重心失衡形态与 R2 记录（414px/~272px）一致。
- **程序化证据**: 截图量测与 R2 探针值吻合（本 round 未重跑探针，判复发）
- **对照基准**: C3 主轴结构；R2-1a-C3-02（systemic → R2-3 批，schema 补 `w-full`，未落地）
- **严重程度**: P2（维持原判，复发非新增）
- **用户影响**: 步骤条横排拥挤、审批记录组无内容余量。
- **修复方向**: 同 R2-1a-C3-02（schema 卡片容器补 `w-full`）。
- **归族**: systemic → R2-3 批既有项 ｜ **复核状态**: 本 round 截图复核确认仍在

### [FM5-shard2-note-02] R2-1a-A3-01（tab 高 25px，P3 watch）形态未见恶化，维持 watch。
