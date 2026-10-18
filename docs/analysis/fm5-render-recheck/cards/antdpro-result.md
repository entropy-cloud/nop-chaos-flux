# [card] page:antdpro-result（FM-5 改版页回归复检 · 分片 2）

- **批次**: FM-5 render-recheck shard2 ｜ **台账状态**: carded ｜ **日期**: 2026-10-18
- **路由**: `#/complex-pages/antdpro-result` ｜ **载体**: complex-page（replica，R2-1a 在案页）
- **矩阵裁剪**: simplified（default × dark/light × 1280/800）

## 1. 截图清单

| 状态          | light                                                                           | dark                                                             |
| ------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 默认 1280×800 | `_tmp/visual-inspection-2026-10-18/antdpro-result-default-1280x800-light.png` ✓ | `_tmp/…/antdpro-result-default-1280x800-dark.png` ✓              |
| 默认 800×900  | `_tmp/…/antdpro-result-default-800x900-light.png` ✓（存档未复读）               | `_tmp/…/antdpro-result-default-800x900-dark.png` ✓（存档未复读） |

## 2. 回归判定

**pass（无新回归）**。结果卡居中、绿色对勾居中带浅绿晕、标题/描述/双按钮（查看订单 primary + 再录一单）排布正常。dark 已适配（R2-1a-B5-02 本页"dark 整卡保持亮底 P1"**验证已修复**——dark 卡面、按钮区正常，成功徽标白底圆为徽章语义恒定，可读）。

## 3. 发现条目

无新增回归发现。两条维持/销项：

- **R2-1a-E4-01（勾图标贴绿带左缘，P3）验证已修复**：ux-r12 CP-5 result banner flex 契约落地，图标居中。
- **R2-1a-B1-01（查看订单主按钮文字对比度 4.1:1，P3）**：截图不可测对比度，形态未见变化，按在案维持 watch（待探针口径复核）。
