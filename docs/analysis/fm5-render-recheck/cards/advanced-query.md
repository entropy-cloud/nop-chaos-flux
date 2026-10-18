# [card] page:advanced-query（FM-5 改版页回归复检 · 分片 2）

- **批次**: FM-5 render-recheck shard2 ｜ **台账状态**: carded ｜ **日期**: 2026-10-18
- **路由**: `#/complex-pages/advanced-query` ｜ **载体**: complex-page（R2-1a 在案页）
- **矩阵裁剪**: simplified（回归复检口径：default × dark/light × 1280/800；交互/弹层态本轮矩阵未提供）

## 1. 截图清单

| 状态          | light                                                                                                          | dark                                                                    |
| ------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| 默认 1280×800 | `_tmp/visual-inspection-2026-10-18/advanced-query-default-1280x800-light.png`（**4.7KB 纯白空白 = 采集伪影**） | `_tmp/…/advanced-query-default-1280x800-dark.png` ✓ 正常                |
| 默认 800×900  | `_tmp/…/advanced-query-default-800x900-light.png` ✓ 正常                                                       | `_tmp/…/advanced-query-default-800x900-dark.png` ✓ 正常（存档，未复读） |
| 实时补证      | live 1440×900 浏览器截图（本次走查，渲染正常：查询表单+表格完整）                                              | —                                                                       |

## 2. 回归判定

**pass（无新回归）**。dark 1280 与 800 light 渲染完整：查询表单六字段、折叠钮、搜索/重置、表格 8 列与行数据均正常，无塌陷/黑域/错位/文字劣化。

- **空白采集伪影**：light-1280 截图为纯白（与 business-document 等同批同字节数），判定为采集竞态而非页面回归——live 打开 `#/complex-pages/advanced-query` 渲染正常。注意：采集脚本若用 `#/advanced-query` 会落到 home（route-model.ts 只认 `#/complex-pages/<id>`），需按正确 hash 重采。
- **R2-1a-C4-04（窄视口查询表单溢出裁切，P1 在案）**：本 round 800×900 下查询卡内六字段两列排布均在卡内，未见 R2 描述的页级溢出——判定**改善/未复发**（修复批未落地但现渲染可接受，维持台账观察）。
- **R2-1a-B5 相关注（dark 日历白底，宿主 `--popover` 已知 P1）**：默认态无日历弹层，本轮不可核验。

## 3. 发现条目

无新增回归发现。行动项 1 条：**重采 light-1280 截图**（采集伪影，非页面缺陷，不计 finding 定级）。
