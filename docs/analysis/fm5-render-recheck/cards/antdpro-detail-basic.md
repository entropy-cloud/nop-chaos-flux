# [card] page:antdpro-detail-basic（FM-5 改版页回归复检 · 分片 2）

- **批次**: FM-5 render-recheck shard2 ｜ **台账状态**: carded ｜ **日期**: 2026-10-18
- **路由**: `#/complex-pages/antdpro-detail-basic` ｜ **载体**: complex-page（replica，R2-1a 在案页）
- **矩阵裁剪**: simplified（default × dark/light × 1280/800）

## 1. 截图清单

| 状态          | light                                                                                 | dark                                                                   |
| ------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 默认 1280×800 | `_tmp/visual-inspection-2026-10-18/antdpro-detail-basic-default-1280x800-light.png` ✓ | `_tmp/…/antdpro-detail-basic-default-1280x800-dark.png` ✓              |
| 默认 800×900  | `_tmp/…/antdpro-detail-basic-default-800x900-light.png` ✓（存档未复读）               | `_tmp/…/antdpro-detail-basic-default-800x900-dark.png` ✓（存档未复读） |

## 2. 回归判定

**pass（无新回归）**。light/dark：订单详情 Descriptions 卡（基本信息分组 + 字段行分隔线）渲染正常，dark 下标签/值/操作钮全部可读（R2-1a-B5-02 在本页验证修复）。无新塌陷/错位/文字劣化。

## 3. 发现条目

### [FM5-shard2-C3-03] R2-1a-C3-02 复发（在案 P2，未修复）：Descriptions 卡 ~310px（authored 896px）

- **页面/路由**: `#/complex-pages/antdpro-detail-basic`
- **主题/视口/状态**: light、dark / 1280×800 / 默认
- **截图**: `_tmp/visual-inspection-2026-10-18/antdpro-detail-basic-default-1280x800-light.png`（dark 同形态）
- **目视描述**: 详情卡居中收缩为窄条，与 R2 记录（310px）一致；长值换行局促形态未变。
- **程序化证据**: 截图量测与 R2 探针值吻合（复发判定）
- **对照基准**: C3 主轴结构；R2-1a-C3-02（systemic → R2-3 批，未落地）
- **严重程度**: P2（维持原判，复发非新增）
- **用户影响**: 页面重心失衡，宽屏大量留白。
- **修复方向**: 同 R2-1a-C3-02（schema 补 `w-full`）。
- **归族**: systemic → R2-3 批既有项 ｜ **复核状态**: 本 round 截图复核确认仍在
