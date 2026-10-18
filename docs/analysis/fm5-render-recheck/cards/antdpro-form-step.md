# [card] page:antdpro-form-step（FM-5 改版页回归复检 · 分片 2）

- **批次**: FM-5 render-recheck shard2 ｜ **台账状态**: carded ｜ **日期**: 2026-10-18
- **路由**: `#/complex-pages/antdpro-form-step` ｜ **载体**: complex-page（replica，R2-1a 在案页）
- **矩阵裁剪**: simplified（default × dark/light × 1280/800）

## 1. 截图清单

| 状态          | light                                                                              | dark                                                                |
| ------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 默认 1280×800 | `_tmp/visual-inspection-2026-10-18/antdpro-form-step-default-1280x800-light.png` ✓ | `_tmp/…/antdpro-form-step-default-1280x800-dark.png` ✓              |
| 默认 800×900  | `_tmp/…/antdpro-form-step-default-800x900-light.png` ✓（存档未复读）               | `_tmp/…/antdpro-form-step-default-800x900-dark.png` ✓（存档未复读） |

## 2. 回归判定

**pass（无新回归）**。dark 下步骤条（1 填写付款信息/2 确认付款信息/3 完成）与表单标签**全部可读**——R2-1a-B5-02 本页实例"dark 步骤表单标签隐形（P1）"**验证已修复**。footer 上一步/下一步左右分位正确。

## 3. 发现条目

### [FM5-shard2-C3-05] R2-1a-C3-02 复发（在案 P2，未修复）：wizard 卡仍收缩（约 547px，authored 768px）

- **页面/路由**: `#/complex-pages/antdpro-form-step`
- **主题/视口/状态**: light、dark / 1280×800 / 默认
- **截图**: `_tmp/visual-inspection-2026-10-18/antdpro-form-step-default-1280x800-light.png`（dark 同形态）
- **目视描述**: 分步卡居中收缩、两侧大量留白，形态与 R2"wizard 卡 430px"同族（量值略有出入，同一根因表现）。
- **程序化证据**: 截图量测 ~547px vs authored 768px（复发判定；R2 探针 430px）
- **对照基准**: C3 主轴结构；R2-1a-C3-02（systemic → R2-3 批，未落地）
- **严重程度**: P2（维持原判，复发非新增）
- **用户影响**: 表单可用但版面收缩、重心失衡。
- **修复方向**: 同 R2-1a-C3-02（schema 补 `w-full`）。
- **归族**: systemic → R2-3 批既有项 ｜ **复核状态**: 本 round 截图复核确认仍在

### [FM5-shard2-note-04] R2-1a-A3-01（步骤圆点 20px，P3）形态未恶化，维持 watch。
