# [card] page:form-input-enhancements

- **批次**: R2-1d ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/form-input-enhancements` ｜ **载体**: 域 demo 页（`apps/playground/src/pages/form-input-enhancements-demo.tsx`，input-number 长按步进 + array-editor/key-value min-max-reorder）
- **矩阵裁剪**: simplified + 中间态全查（长按连续步进/clamp/max 提示/上下移/删到下限禁用/light+dark/800；无弹层无拖拽）

## 1. 截图清单

| 状态                             | light                                                      | dark                                                     |
| -------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------- |
| 默认 1280（首屏/页尾）           | `default-light-1280.png` / `default-light-1280-bottom.png` | `default-dark-1280.png` / `default-dark-1280-bottom.png` |
| ~800 宽                          | `default-light-800.png` / `full-800-light.png`             | —                                                        |
| 长按 clamp 到 max 10             | `stepper-clamped-light.png`                                | —                                                        |
| array 加满 4/4                   | `array-max-light.png`                                      | —                                                        |
| 上移重排后                       | `array-moved-light.png`                                    | —                                                        |
| 删到下限（headers 1/1 删除禁用） | `array-min-light.png`                                      | —                                                        |
| 全页 dark                        | —                                                          | `full-dark-1280.png`                                     |

## 2. A–H 维度勾选表

- A 交互：A1 pass（上传/图标钮 hover bg 变化）A2 pass A3 **warn（步进钮 24×16 = R2-1d-A3-01 已裁定族；行钮 28×28 合格）** A4 **pass（边界禁用齐全：行 1 上移禁用、行末下移禁用、max 时添加禁用、min 时删除禁用，探针逐钮验证）** A5 n/a A6 n/a A7 n/a A8 n/a A9 pass（步进/重排/增删即时反映到 Live values 与行序）
- B 颜色：B1 pass B2 pass B3 pass（「不能为空」错误红）B4 pass B5 pass B6 pass
- C 布局：C1 pass C2 pass C3 pass C4 pass C5 pass C6 n/a
- D 间隔：D1–D8 pass（行间 gap-2 均匀）
- E 排布：E1 pass E2 pass E3 pass E4 pass（icon 列垂直对齐一致）E5 pass E6 pass
- F 一致性：F4 **fail(F4-53 [object Object]) fail(F4-54 aria 语言混用)** F1 pass F3 pass
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

### [R2-1d-F4-53] Live form values 将数组/对象值渲染为「[object Object]」

- **页面/路由**: `#/form-input-enhancements`（Live form values 区）
- **主题/视口/状态**: light+dark / 1280 / 增删行后
- **截图**: `array-min-light.png`（`tags = [object Object],[object Object],[object Object],[object Object]`、`headers = [object Object]`）
- **目视描述**: `${tags}`（对象数组）与 `${headers}` 插值结果为 `[object Object]` 串联，不可读。
- **程序化证据**: 探针: 读 `[data-testid="form-input-enhancements-tags"]` textContent → `"tags = [object Object],[object Object],..."`（`_tmp/r2-1d-probes/w5-fi-out.json` arrayState）；截图同帧确认。
- **对照基准**: 文本插值惯例（数组应 JSON.stringify 或按 itemLabel 摘要）；F4 文案正确性。
- **严重程度**: P3
- **用户影响**: 调试面板失去价值；任何把对象数组绑到 text 的真实页面都会复现。
- **修复方向**: 表达式插值对 Array/Object 走 JSON.stringify（或 text 渲染器提供 valueFormat 钩子）。
- **归族**: systemic → R2-3 批（表达式引擎字符串化策略，影响所有 text 绑定）
- **复核状态**: 未复核

### [R2-1d-F4-54] 同页两组件 aria 标签语言割裂：array-editor 全中文、key-value 英中混用

- **页面/路由**: `#/form-input-enhancements`
- **主题/视口/状态**: light / 1280 / 默认
- **截图**: `default-light-1280-bottom.png`（视觉一致，差异在可访问名称）
- **目视描述**: 视觉同构的行操作钮，array-editor 的 aria 为「上移 Tag 1 / 下移 Tag 1 / 删除 Tag 1」（zh），key-value 为「Move up entry 1 / Move down entry 1 / 删除 entry 1」（en + zh 混合）。
- **程序化证据**: 探针: 逐钮 aria-label 枚举（`_tmp/r2-1d-probes/w5-fi2-out.json` arrayRowButtons/kvRowButtons）。
- **对照基准**: F4 同一概念不混用两种叫法；读屏用户体验一致性。
- **严重程度**: P3
- **用户影响**: 读屏用户听到两种语言的操作名；i18n 审计噪音。
- **修复方向**: 统一走 i18n 词条（两渲染器共用同一组 move/remove label key）。
- **归族**: local → R2-4 批
- **复核状态**: 未复核

**本页正例（记录）**: 长按连续步进完全符合规格（点击 0→1；1.6s 长按 1→10 ≈ 400ms 初延迟 + 80ms 间隔）；越界 clamp（max 10 后 3s 长按仍 10）；array-editor 达上限显示「已达最大条目数（4/4）」并禁用添加；上移重排生效（beta 移至首位）；key-value 删到 minItems 1 后删除钮禁用（视觉置灰）；行操作钮 28×28 全部达标；Live values 对标量（count=10）实时正确。

**族实例确认（一句话，不另立项）**: input-number 步进钮 24×16 → R2-1d-A3-01（m2-touch 卡，input-number 全站同构）；新增空行立即显示「Tag 4 不能为空」红色校验 → R2-1a「validation 链幻影错误族」实例（添加即报错先于用户输入，族内确认）。

## 4. 台账回写

- 本卡完成后：ledger.md `form-input-enhancements` 行 status → `carded`；findings 归族后 → `digested`。
