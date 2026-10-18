# [card] page:antdpro-list（FM-5 改版页回归复检 · 分片 2）

- **批次**: FM-5 render-recheck shard2 ｜ **台账状态**: carded ｜ **日期**: 2026-10-18
- **路由**: `#/complex-pages/antdpro-list` ｜ **载体**: complex-page（replica，R2-1a 在案页）
- **矩阵裁剪**: simplified（default × dark/light × 1280/800；弹层/批量删除态矩阵未提供，H5-01/A9-02 本轮不可核验）

## 1. 截图清单

| 状态          | light                                                                         | dark                                                         |
| ------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------ |
| 默认 1280×800 | `_tmp/visual-inspection-2026-10-18/antdpro-list-default-1280x800-light.png` ✓ | `_tmp/…/antdpro-list-default-1280x800-dark.png` ✓            |
| 默认 800×900  | `_tmp/…/antdpro-list-default-800x900-light.png` ✓                             | `_tmp/…/antdpro-list-default-800x900-dark.png`（存档未复读） |
| interaction   | 与 default 字节相同（伪状态）                                                 | 同左                                                         |

## 2. 回归判定

**pass（无新回归）**。1280 双主题查询区/工具栏/表格结构完整；**dark 已完整适配**（R2-1a-B5-02 antdpro 域"dark 半适配拼贴 P1"**验证已修复**——查询输入 dark 面可读、表头 dark 正常）。R2-1a-C2-02（sticky 操作列透明底遮压末列 P1）**验证已修复**——ux-r12 CP-4 已移除破损的 fixed:right 列，1280 默认无遮压。

## 3. 发现条目

### [FM5-shard2-C4-02] R2-1a-C4-01 复发（在案 P1，未修复）：800px 查询区塌缩

- **页面/路由**: `#/complex-pages/antdpro-list` 查询区
- **主题/视口/状态**: light / 800×900 / 默认
- **截图**: `_tmp/visual-inspection-2026-10-18/antdpro-list-default-800x900-light.png`
- **目视描述**: 关键词输入塌缩为 ~20px 空药丸、状态 select 挤压、渠道 select 被卡片右缘裁切不可用——与 R2"窄视口查询区塌缩"同形态。
- **程序化证据**: 截图表现与 R2 探针记录（53px 裁切族）一致（复发判定）
- **对照基准**: C4 视口弹性；R2-1a-C4-01（systemic → R2-3 批，未落地）
- **严重程度**: P1（维持原判，复发非新增；窄视口下渠道筛选不可用）
- **用户影响**: 窄窗口用户无法使用渠道筛选。
- **修复方向**: 同 R2-1a-C4-01（查询行 flex-wrap + select min-width + 容器允许换行/滚动）。
- **归族**: systemic → R2-3 批既有项 ｜ **复核状态**: 本 round 截图复核确认仍在

### [FM5-shard2-note-05] R2-1a-H5-01（弹层 footer 左对齐 P1）/ A9-02（批量删除无确认 P2）/ A3-01 / H4-01：均需弹层或交互态，本 round 矩阵未捕获，不可核验，按在案维持。
