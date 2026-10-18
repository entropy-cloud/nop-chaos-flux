# [card] page:airtable-grid（FM-5 改版页回归复检 · 分片 2）

- **批次**: FM-5 render-recheck shard2 ｜ **台账状态**: carded ｜ **日期**: 2026-10-18
- **路由**: `#/complex-pages/airtable-grid` ｜ **载体**: complex-page（replica，R2-1a 在案页）
- **矩阵裁剪**: simplified（default × dark/light × 1280/800；注意：`interaction` 系列截图与 default 字节相同，未捕获真实交互态）

## 1. 截图清单

| 状态          | light                                                                          | dark                                                          |
| ------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| 默认 1280×800 | `_tmp/visual-inspection-2026-10-18/airtable-grid-default-1280x800-light.png` ✓ | `_tmp/…/airtable-grid-default-1280x800-dark.png` ✓            |
| 默认 800×900  | `_tmp/…/airtable-grid-default-800x900-light.png` ✓                             | `_tmp/…/airtable-grid-default-800x900-dark.png`（存档未复读） |
| interaction   | 与 default 字节相同（伪状态）                                                  | 同左                                                          |

## 2. 回归判定

**pass（无新回归）**。1280 双主题：工具栏（视图 switcher / 行高四档 / 分组 chips / 搜索筛选）、网格、行 1 蓝框选中格、彩色标签均正常；dark 下网格面保持亮纸面为 R2 基线形态（replica 纸面语义，非回归）。

## 3. 发现条目

### [FM5-shard2-C4-01] R2-1a-C4-03 复发（在案 P2，未修复）：800px 行高四档分段控件仍被裁只剩"短"

- **页面/路由**: `#/complex-pages/airtable-grid` 视图栏
- **主题/视口/状态**: light / 800×900 / 默认
- **截图**: `_tmp/visual-inspection-2026-10-18/airtable-grid-default-800x900-light.png`
- **目视描述**: 行高分段只见"短"+空档；同屏挤压还有：标题"任务清单网格视图"逐字竖排成窄条、分组 chips"按阶段/按负责人"被裁成残字。
- **程序化证据**: R2 探针口径 `.at-seg sw163/cw59`（本 round 未重跑探针，截图表现与 R2 记录一致，判复发）
- **对照基准**: C4 视口弹性；R2-1a-C4-03（systemic → R2-3 批，未落地）
- **严重程度**: P2（维持原判，复发非新增）
- **用户影响**: 窄窗口无法切换中/高/超高密度；标题可读性受损。
- **修复方向**: 同 R2-1a-C4-03（工具栏 flex-wrap 或收纳进视图选项菜单；分段控件 shrink-0）。
- **归族**: systemic → R2-3 批既有项 ｜ **复核状态**: 本 round 截图复核确认仍在

### [FM5-shard2-note-01] R2-1a-H3-01（记录 modal 越界 P2）本轮不可核验

- 矩阵无 modal 打开态（interaction 截图与 default 字节相同，属采集伪状态）。修复批未落地前按在案维持；下轮需真实 modal 截图。
