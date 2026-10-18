# [card] page:antdpro-form-grouped（FM-5 改版页回归复检 · 分片 2）

- **批次**: FM-5 render-recheck shard2 ｜ **台账状态**: carded ｜ **日期**: 2026-10-18
- **路由**: `#/complex-pages/antdpro-form-grouped` ｜ **载体**: complex-page（replica，R2-1a 在案页；plan 551 后为三卡合一 antdpro-grouped-form 形态）
- **矩阵裁剪**: simplified（default × dark/light × 1280/800）

## 1. 截图清单

| 状态          | light                                                                                 | dark                                                                   |
| ------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 默认 1280×800 | `_tmp/visual-inspection-2026-10-18/antdpro-form-grouped-default-1280x800-light.png` ✓ | `_tmp/…/antdpro-form-grouped-default-1280x800-dark.png` ✓              |
| 默认 800×900  | `_tmp/…/antdpro-form-grouped-default-800x900-light.png` ✓（存档未复读）               | `_tmp/…/antdpro-form-grouped-default-800x900-dark.png` ✓（存档未复读） |

## 2. 回归判定

**pass（无新回归）**。dark 下输入框已是带边框 dark 面、placeholder 可读、select/switch 可辨——R2-1a-B5-02 本页实例"灰药丸不可辨 vs 白底 select 拼贴（P1）"**验证已修复**。light 双卡分组布局正常（左 fieldset 组 + 右任务描述卡）。

## 3. 发现条目

无新增回归发现。两条 watch 维持：

- R2-1a-A3-01（开关 32×18，P3）：形态未恶化，维持 watch。
- 目视观察（visual-only）：左 fieldset 卡右缘可见内滚条细带（内容超卡高内滚）。R2 未登记、无探针、不影响任务——维持观察，不立案。
