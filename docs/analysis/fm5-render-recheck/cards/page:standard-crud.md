# [card] page:standard-crud

- **批次**: FM-5 shard3（A 组改版页回归复检）｜ **台账状态**: carded ｜ **日期**: 2026-10-18
- **路由**: `#/complex-pages/standard-crud` ｜ **载体**: complex-page
- **矩阵裁剪**: simplified（复检口径；light 默认帧空白，以 live 探针复核为准）

## 1. 截图清单

| 状态          | light                                                                                                                                                    | dark                                   |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| 默认 1280×800 | `standard-crud-default-1280x800-light.png`（**空白帧，采集伪影**）→ settled 复核 `_tmp/visual-inspection-2026-10-18/fm5-standard-crud-default-light.png` | `...-dark.png`（弹层打开帧，取证有效） |
| 默认 800×900  | `standard-crud-default-800x900-light.png`                                                                                                                | `...-dark.png`                         |
| 探针          | `_tmp/fm5-shard3-crud.mjs`（10 行表格 + page-size select=10 + 零 console error）                                                                         | —                                      |

## 2. A–H 判定（简）

- A 交互：pass ｜ B 颜色：pass ｜ C 布局：pass（查询区/表格/操作列正常；C2-01 主题切换器遮压分页条维持壳层登记）｜ D 间隔：pass ｜ H 弹层：**pass——R2-1a-H5-01（P1 弹层动作左对齐）修复确认**：dark 帧新增用户弹层 footer 右对齐、取消→保存主次正确；H4-01 标题缩进维持 P3 ｜ H6 新实例：性别 combobox 空值无占位（H6-06 已知族实例，见发现）

## 3. 发现

### [FM5-S3-H6-01] 性别 combobox 无值无占位（R2-1a-H6-06 已知族新实例）

- **页面/路由**: `#/complex-pages/standard-crud` 新增用户弹层
- **主题/视口/状态**: dark / 1280 / 弹层打开
- **截图**: `_tmp/visual-inspection-2026-10-18/standard-crud-default-1280x800-dark.png`
- **目视描述**: 弹层内性别下拉为空白框（同弹层状态下拉有「启用」值）
- **程序化证据**: [visual-only]（截图帧清晰可辨，与 R2-1a-H6-06 linear 实例同形态）
- **对照基准**: R2-1a-H6-06 族（combobox 无值无占位）
- **严重程度**: P3
- **用户影响**: 新增时性别字段语义不可辨（必填星号在，影响轻）
- **修复方向**: combobox 空值态渲染 placeholder（同族统一修复面）
- **归族**: systemic（并入 R2-1a-H6-06 族）｜ **复核状态**: 未复核

- 另：light 默认帧整幅空白为**矩阵采集伪影**（live 探针同路由渲染完整、零 console error），非产品缺陷。

## 4. 结论

**verdict: pass（回归面；H5-01 修复确认，H6-06 族新实例 P3，A3-01 维持）**。
