# [card] page:three-canvas-demo

- **批次**: FM-5 shard3（A 组改版页回归复检）｜ **台账状态**: carded ｜ **日期**: 2026-10-18
- **路由**: `#/three-canvas-demo`（domain 路由）｜ **载体**: domain demo 页
- **矩阵裁剪**: simplified（复检口径；矩阵 light 帧为加载中间帧，以 8s settled 探针为准）

## 1. 截图清单

| 状态                    | light                                                                              | dark                            |
| ----------------------- | ---------------------------------------------------------------------------------- | ------------------------------- |
| 默认 1280×800（矩阵帧） | `three-canvas-demo-default-1280x800-light.png`（spinner 中间帧）                   | `...-dark.png`（3D 场景已渲染） |
| settled 探针            | `_tmp/visual-inspection-2026-10-18/fm5-three-canvas-settled-light.png`（场景完整） | —                               |
| 默认 800×900            | `three-canvas-demo-default-800x900-light.png`                                      | `...-dark.png`                  |

## 2. A–H 判定（简）

- **C 布局：pass——R2-1c-C4-01（P1 默认视口纵向破版/窄视口横溢）修复确认**：1280 默认下页头/描述/画布卡正常文档流排布；画布 canvas 984×494 与容器一致
- B 颜色：B1-01（错误态对比度）本轮无错误态可复核（覆盖缺口登记）；画布深底双主题一致
- C6：**C6-01（DPR 未乘）无法在本轮复核**——headless DPR=1 下 ratio 恒 1.00，探针无判别力（覆盖缺口登记）
- D 间隔：D1-01（Back 下边距 18px）域已变——Back 现为通栏 pill（见发现）
- G：n/a

## 3. 发现

### [FM5-S3-E4-01] Back to Home 渲染为通栏 pill，与兄弟 demo 页头部形态不一致（fixture 头部层）

- **页面/路由**: `#/three-canvas-demo` 页头
- **主题/视口/状态**: light+dark / 1280 / 默认
- **截图**: `fm5-three-canvas-settled-light.png`（x≈133–1147 通栏）
- **目视描述**: Back to Home 为横贯内容区全宽的胶囊按钮；map/pivot/scada 等兄弟 demo 页为左上紧凑返回
- **程序化证据**: 探针实测 backW=1018px（`_tmp/fm5-shard3-three.mjs`）
- **对照基准**: F1 同语义操作跨页同位/同形；demo 头部模板一致性
- **严重程度**: P3
- **用户影响**: 返回动线可见可点，仅形态一致性弱
- **修复方向**: demo 头部模板将 Back 收敛为 inline 左置（与 map/pivot 头部同款）
- **归族**: watch-only（fixture 头部层）｜ **复核状态**: 未复核

- 另：矩阵 light 帧为加载中间帧（双 spinner），settled 后零 spinner、场景完整——截屏时机伪影非缺陷。

## 4. 结论

**verdict: pass（回归面；C4-01 修复确认，新登记 fixture 级 P3 一项，C6-01/B1-01 覆盖缺口登记）**。
