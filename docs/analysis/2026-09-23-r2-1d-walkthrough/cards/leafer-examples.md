# [card] page:leafer-examples

- **批次**: R2-1d ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/leafer-examples` ｜ **载体**: 域页面（LeaferJS 官方示例对照，工业 HMI i17.3 参考）
- **矩阵裁剪**: simplified（light/dark × 1280 + 800 + C6 像素判据专项；裁掉 hover/focus/弹层——页面为 4 张画布示例卡 + 5 个缩放按钮，无弹层拖拽）

## 1. 截图清单

| 状态          | light                                                                            | dark                    |
| ------------- | -------------------------------------------------------------------------------- | ----------------------- |
| 默认 1280×800 | `_tmp/visual-inspection-2026-09-23/r2-1d/leafer-examples/default-1280-light.png` | `default-1280-dark.png` |
| 4s 长等待后   | `scrolled-300-light.png`                                                         | —                       |
| 默认 800×900  | `default-800x900-light.png`                                                      | —                       |

## 2. A–H 勾选

- A: A1✔(Zoom In/Out/→/←/Reset 按钮 hover 正常) A3✔(按钮均 ≥24px) 其余 n/a
- B: **B1 warn(B-57 画布内文字低对比)** B5✔(dark 页面骨架平价；画布像素 lightPx=0 无白块)
- C: **C6✔（判据=buffer 原值：6 canvas 全部 bufW/H=420/200=CSS 尺寸×DPR(1)，无拉伸无空转；idx1 为 leafer App 三图层堆叠中的一层，层间透明属设计）** C1✔（无溢出）
- D: D1✔（卡片网格均匀）E: E1✔（对照页说明完整）
- F: F3✔（四卡同构）
- G n/a ｜ H n/a

## 3. 发现条目

### [R2-1d-C-56] 画布首绘延迟 >1.8s 且无 loading 指示 + 截图采集空白存疑（P3）

- **页面/路由**: `#/leafer-examples`（"创建 Leafer + 基础元素"等 4 卡）
- **主题/视口/状态**: light / 1280 / 1.5s vs 4s 两次采样
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1d/leafer-examples/default-1280-light.png`（1.5s：卡 1/3/4 目视全白）vs `scrolled-300-light.png`（4s 采样后）
- **目视描述**: 1.5s 时三张卡画布区域空白；同时 headless 截图在 buffer 已有内容后仍显示白色（见下），存在采集端 desynchronized-canvas 已知局限。
- **程序化证据**: 探针=双时刻 getImageData；输出=1.8s 时 idx0 已 17,679 nonzero（蓝 21,101,192 / 绿 46,125,50 / 橙 230,81,0 等饱和色块），4s 复测同量级——即 buffer 内容与"截图全白"矛盾，判定截图空白为采集端伪象 [visual-only 矛盾已用 buffer 数据坐实为伪象]；但 1.5–4s 首绘窗口内无任何 Skeleton/Spinner。
- **对照基准**: C6（canvas.width/height vs clientWidth×DPR：pass）；A5（外部同步/慢首绘应有指示）。
- **严重程度**: P3
- **用户影响**: 慢机/首访用户在数秒内面对白卡无解释。
- **修复方向**: 画布容器挂载期显示 Skeleton（ui 组件现有），首帧绘制后移除；复核轮用 CDP screenshot 或 `toDataURL` 输出对照确认采集伪象不影响真实浏览器。
- **归族**: local → R2-4 批
- **复核状态**: 未复核

### [R2-1d-B-57] 画布内说明文字近白低对比（P3）

- **页面/路由**: `#/leafer-examples`（App 三图层卡内绘制文字 "ground + tree + sky 三图层"）
- **主题/视口/状态**: light / 1280 / 默认
- **截图**: `default-1280-light.png`（图形下方浅灰文字）
- **目视描述**: 画布内标题文字极浅，白底上勉强可辨。
- **程序化证据**: 探针=画布像素颜色直方图；输出=文字色样本 `rgb(207,216,220)`（#CFD8DC）叠白底，对比度≈1.35:1（远低于 3:1 大字下限）。
- **对照基准**: WCAG 1.4.3/1.4.11；画布内容为 demo 绘制（非 flux token 域），按 demo 内容简化口径降 P3。
- **严重程度**: P3
- **用户影响**: 图层说明不可读，削弱对照页教学价值。
- **修复方向**: leafer 示例源中该文字 fill 改深色（如 #455A64）或加投影。
- **归族**: local → R2-4 批
- **复核状态**: 未复核

## 4. 备注

- 6 个 canvas = 3 个单画布示例 + App 三图层堆叠（idx1 空层=sky 覆盖层透明，属 leafer App 分层设计，非缺陷）。
- dark 下画布像素 lightPx=0：无白底画布裸奔，双主题无像素级破损。
