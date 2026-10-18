# [card] page:approval-tasks（FM-5 改版页回归复检 · 分片 2）

- **批次**: FM-5 render-recheck shard2 ｜ **台账状态**: carded ｜ **日期**: 2026-10-18
- **路由**: `#/complex-pages/approval-tasks` ｜ **载体**: complex-page（R2-1a 在案页；plan 550/643、ux-r12e 多批修复落地）
- **矩阵裁剪**: simplified（default × dark/light × 1280/800；审批 Dialog / confirm AlertDialog 态矩阵未提供，A7-01/H5-02 本轮不可目验）

## 1. 截图清单

| 状态          | light                                                                           | dark                                                             |
| ------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 默认 1280×800 | `_tmp/visual-inspection-2026-10-18/approval-tasks-default-1280x800-light.png` ✓ | `_tmp/…/approval-tasks-default-1280x800-dark.png` ✓              |
| 默认 800×900  | `_tmp/…/approval-tasks-default-800x900-light.png` ✓（存档未复读）               | `_tmp/…/approval-tasks-default-800x900-dark.png` ✓（存档未复读） |
| interaction   | 与 default 字节相同（伪状态）                                                   | 同左                                                             |

## 2. 回归判定

**pass（无新回归）**。双主题查询区、表格、操作列渲染正常；dark 表格完整适配，无亮块/黑域。

## 3. 发现条目

### [FM5-shard2-fix-01] R2-1a-B3-01（状态三态同色 P2）验证已修复

- 状态列现为语义徽章：待审批（amber）/已通过（green）/已驳回（red），light 与 dark 双态均可读——ux-r12e "approval-tasks status badges" 落地确认。

### [FM5-shard2-fix-02] R2-1a-C2-02（sticky 操作列透明底透字 P2）修复落地确认 + 一条 watch

- 操作列已有不透明底（ux-r12e table sticky opaque rule）。dark 下 sticky 列底色与行条纹存在细微色差竖带（硬边可见，文字无叠压）——**watch-only P3**：若后续行条纹与 sticky 底色令牌收敛可消除，不立案。

### [FM5-shard2-note-06] R2-1a-A7-01（confirm AlertDialog 被审批 Dialog 压制 P0）/ H5-02（动作钮左置 P1）本轮不可目验

- plan 550 confirm-bridge（按需挂载 AlertDialog）与审批链 normalize 已入库，但本 round 矩阵无弹层态截图，无法目验复发与否。**下轮需补 打开审批 Dialog + 点驳回 的双态截图**；按在案维持（修复已落地、未见复发证据）。
- 宿主 `--popover` dark 弹层亮底（已知 systemic-local P1）：弹层态未捕获，维持已知项跟踪。
