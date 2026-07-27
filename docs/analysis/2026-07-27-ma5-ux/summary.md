# MA5.2 Basic+Content UX Audit — 汇总报告

## 审查范围

- **扫描的包**: flux-renderers-basic, flux-renderers-form, flux-renderers-form-advanced, flux-renderers-data, flux-renderers-content
- **审查日期**: 2026-07-27
- **执行方式**: 2 轮迭代发现 + 独立复核
- **`check:audit-missing-renderer-markers`**: 0 问题

## 发现统计

- 总轮次: 2
- 总发现数: 6
- 复核后保留: 6 (HIGH: 0, MEDIUM: 4, LOW: 2)
- 降级: 0
- 驳回: 0

## 快速修复项（Quick Wins，<30分钟可修复）

| 编号       | 文件                                | 修复描述                                                                                               |
| ---------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------ |
| [视角1-01] | `array-editor.tsx`, `key-value.tsx` | Add `<PlusIcon className="size-4" />` before add-button label text                                     |
| [视角3-01] | `icon-picker.tsx:211-223`           | Add `focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none` to icon button className |
| [视角3-03] | `carousel.tsx:298-312`              | Add `focus-visible:ring-2 focus-visible:ring-ring` to indicator button className                       |

## 最大影响修复（Top 3）

1. [视角9-01] + [视角9-02] — i18n 修复：icon-picker 硬编码中文 + 7 个 content 组件硬编码英文 → 影响 8 个组件，10+ 字符串，跨语言用户可见
2. [视角1-01] — Add 按钮跨组件 PlusIcon 一致性 → 影响 array-editor 和 key-value，高频 CRUD 场景
3. [视角3-01]/[视角3-02]/[视角3-03] — 键盘导航与焦点指示器修复 → 影响 icon-picker 和 carousel，可访问性合规

## HIGH 清单

无 HIGH 发现。

## MEDIUM 清单

| 编号       | 文件                                                 | 问题                                                   | 行业惯例                                                     |
| ---------- | ---------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------ |
| [视角1-01] | array-editor.tsx, key-value.tsx                      | Add 按钮缺少 PlusIcon，与同包 combo/input-table 不一致 | shadcn/ui + Ant Design: 新增操作 = PlusIcon + text           |
| [视角9-01] | icon-picker.tsx                                      | 4 处硬编码中文字符串，未使用 `t()` i18n                | 项目内所有其他组件使用 @nop-chaos/flux-i18n                  |
| [视角3-01] | icon-picker.tsx                                      | 图标网格按钮缺少 focus-visible ring                    | shadcn/ui Button + cards-renderer 均含 focus-visible:ring-\* |
| [视角9-02] | audio/video/carousel/json-view/markdown/image/qrcode | 7 个 content 文件硬编码英文 fallback 字符串 (10+ 处)   | 同包 empty/spinner/cards/diff-view 正确使用 t()              |

## LOW 清单

| 编号       | 文件            | 问题                                                           | 行业惯例                                              |
| ---------- | --------------- | -------------------------------------------------------------- | ----------------------------------------------------- |
| [视角3-02] | icon-picker.tsx | aria-haspopup="listbox" 与 PopoverContent role="dialog" 不匹配 | 对应 role 应一致或使用 role="listbox" + role="option" |
| [视角3-03] | carousel.tsx    | 指示点按钮缺少 focus-visible ring                              | 所有 tabIndex>=0 元素应有焦点指示                     |

## 按组件分组

| 组件                                                 | 发现数 | 主要问题类别                        |
| ---------------------------------------------------- | ------ | ----------------------------------- |
| icon-picker                                          | 3      | i18n, focus-visible ring, ARIA role |
| array-editor                                         | 1      | 图标一致性                          |
| key-value                                            | 1      | 图标一致性                          |
| audio/video/carousel/json-view/markdown/image/qrcode | 1 each | i18n                                |
| 其余 20+ 组件                                        | 0      | —                                   |

## 跨组件一致性问题

- **Add 按钮**: combo-renderer 和 input-table-renderer 使用 `variant="outline"` + `PlusIcon` + 文本；array-editor 和 key-value 仅使用文本（无图标）
- **i18n**: 大多数组件使用 `t()`；icon-picker 使用硬编码中文；7 个 content 组件使用硬编码英文

## 建议的统一设计规范

1. Add 按钮统一使用 `variant="outline"` + `PlusIcon` + 文本
2. 所有用户可见字符串使用 `t()` from `@nop-chaos/flux-i18n`
3. 所有 tabIndex>=0 的自定义交互元素必须包含 `focus-visible:ring-*`

## 被驳回 / 降级模式复盘

无驳回或降级。

## 对 deep-audit 的依赖

无。所有发现可直接在渲染器代码层面修复，无需架构重构。

## 可暂缓项

- Carousel 指示点 focus-visible ring（LOW，辅助导航元素
