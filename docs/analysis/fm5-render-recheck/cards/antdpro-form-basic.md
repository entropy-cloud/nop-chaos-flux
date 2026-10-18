# [card] page:antdpro-form-basic（FM-5 改版页回归复检 · 分片 2）

- **批次**: FM-5 render-recheck shard2 ｜ **台账状态**: carded ｜ **日期**: 2026-10-18
- **路由**: `#/complex-pages/antdpro-form-basic` ｜ **载体**: complex-page（replica，R2-1a 在案页）
- **矩阵裁剪**: simplified（default × dark/light × 1280/800）

## 1. 截图清单

| 状态          | light                                                                               | dark                                                                 |
| ------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 默认 1280×800 | `_tmp/visual-inspection-2026-10-18/antdpro-form-basic-default-1280x800-light.png` ✓ | `_tmp/…/antdpro-form-basic-default-1280x800-dark.png` ✓              |
| 默认 800×900  | `_tmp/…/antdpro-form-basic-default-800x900-light.png` ✓（存档未复读）               | `_tmp/…/antdpro-form-basic-default-800x900-dark.png` ✓（存档未复读） |

## 2. 回归判定

**pass（无新回归）**。dark 下表单标签（任务名称/执行时间段/负责人/目标权重/目标描述）**全部可见可读**——R2-1a-B5-02 本页实例"dark 下字段标签完全不可见（P1）"**验证已修复**。输入面 dark 适配正常，无新缺陷。

## 3. 发现条目

### [FM5-shard2-C3-04] R2-1a-C3-02 复发（在案 P2，未修复）：表单卡收缩（约 234px 内容列）

- **页面/路由**: `#/complex-pages/antdpro-form-basic`
- **主题/视口/状态**: light、dark / 1280×800 / 默认
- **截图**: `_tmp/visual-inspection-2026-10-18/antdpro-form-basic-default-1280x800-light.png`（dark 同形态）
- **目视描述**: 表单卡居中收缩、输入框窄条形态与 R2 记录一致。
- **程序化证据**: 截图量测与 R2 探针值（234px/authored 672px）形态吻合（复发判定）
- **对照基准**: C3 主轴结构；R2-1a-C3-02（systemic → R2-3 批，未落地）
- **严重程度**: P2（维持原判，复发非新增）
- **用户影响**: 输入框过窄、版面明显收缩。
- **修复方向**: 同 R2-1a-C3-02（schema 补 `w-full`）。
- **归族**: systemic → R2-3 批既有项 ｜ **复核状态**: 本 round 截图复核确认仍在

### [FM5-shard2-note-03] R2-1a-A3-01（数字步进器 24×16，P3）形态未恶化，维持 watch。
