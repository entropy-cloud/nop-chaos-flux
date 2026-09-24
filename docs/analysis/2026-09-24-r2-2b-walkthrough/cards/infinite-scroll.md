# [card] control:infinite-scroll

- **批次**: R2-2b ｜ **台账状态**: carded ｜ **日期**: 2026-09-24
- **路由**: `#/lab/infinite-scroll` ｜ **载体**: lab 页（MultiScenarioLabPage，2 场景：① Host infinite-scroll in dialog + immediateCheck（弹层内含 pull-refresh + infinite-scroll）② Host infinite-scroll failure + retry（error:true + 重试钮））
- **矩阵裁剪**: simplified（matrixReason：四态中 loading / finished 为宿主受控 props（`hasMore`/`loading`），lab fixture 无状态回写通路不可达（归渲染器单测覆盖）；本卡实测态：normal（弹层内 immediateCheck）× 双主题、error + retry 面板 × 双主题 × 1280/800/375、retry 点击、A8 鼠标路径核对；R2-1d-A9-01 卡死现状复核附做）
- **dark 证据声明**：全部 dark 截图为自采真 `data-mode="dark"`（R2-2a-B5-34）；渐变背景下对比度以像素采样判读。

## 1. 截图清单

| 状态                                   | light                                                                            | dark（真 data-mode，自采）                    |
| -------------------------------------- | -------------------------------------------------------------------------------- | --------------------------------------------- |
| 默认 1280×800（双场景）                | `_tmp/visual-inspection-2026-09-24/r2-2b/infinite-scroll/default-light-1280.png` | `…/infinite-scroll/default-dark-1280.png`     |
| 弹层开（场景①，immediateCheck 已触发） | `…/infinite-scroll/dialog-open-light-1280.png`                                   | `…/infinite-scroll/dialog-open-dark-1280.png` |
| retry 场景默认（error 态）             | （含于 default-light-1280）                                                      | `…/infinite-scroll/retry-dark-1280.png`       |
| retry 点击后（状态无变化证据）         | `…/infinite-scroll/after-retry-click-light-1280.png`                             | —                                             |
| 默认 800×900                           | `…/infinite-scroll/default-light-800.png`                                        | `…/infinite-scroll/default-dark-800.png`      |
| 弹层开 800                             | `…/infinite-scroll/dialog-open-light-800.png`                                    | —                                             |
| retry 375×812                          | `…/infinite-scroll/retry-light-375.png`                                          | `…/infinite-scroll/retry-dark-375.png`        |
| R2-1d-A9-01 复核（demo 页 375）        | `…/infinite-scroll/r21d-recheck-demo-375-light.png`                              | —                                             |

## 2. A–H 维度勾选表

- A 交互：A1 n/a A2 pass（弹层内 Esc 关闭后焦点回落，无逃逸异常）A3 pass（retry 钮 918×28 ≥24；smallTargets 零命中）A4 n/a A5 pass（error 态呈重试钮非纯文本裸奔；loading/finished 不可达见裁剪说明）A6 n/a A7 pass（弹层有关闭钮/遮罩）A8 n/a（本控件无手势）A9 **warn(R2-2b-A9-182)**（retry 点击零可见反馈）
- B 颜色：B1 pass（dark retry 文本像素采样 15.59:1）B2 n/a B3 pass（error 态走 ghost Button 无裸红）B4 pass B5 **warn（家族引用，不立项）**（弹层 dark 白底，见 §4 #2）B6 n/a
- C 布局：C1 pass（1280/800 零溢出；375 见 C4）C2 pass C3 pass C4 **warn（家族引用，不立项）**（375 载体壳层压挤，同 countdown 卡 §4 #1）C5 pass C6 n/a
- D 间隔：D1–D8 n/a/pass
- E 排布：E1 pass E2 pass E3 pass E4–E6 n/a/pass
- F 一致性：F1–F3 n/a F4 n/a（`errorText:'加载失败，点击重试'` 为 fixture 显式中文文案，非 chrome 回退，不计 i18n 族实例）F5 n/a
- G 设计器：n/a
- H 弹层：H1 pass（弹层 sm 档 480px，落在 `--overlay-size-*` 阶梯）H2 n/a H3 pass（surface 560×159 / top 60 / bottom 219 ≤ 792）H4 pass H5 n/a（无 footer 按钮）H6–H7 pass H8 pass H9 pass（800 宽弹层不溢出）

## 3. 发现条目

### [R2-2b-A9-182] retry 点击后零可见反馈：fixture 承诺"resumes loading"但 error 态永不解除，按钮按下前后画面逐字节相同

- **页面/路由**: `#/lab/infinite-scroll`（场景② Host infinite-scroll failure + retry；`c7RetrySchema` 的 `onLoadMore` 只投递 probe、从不清 `error`）
- **主题/视口/状态**: light / 1280 / retry 点击前后
- **截图**: `_tmp/visual-inspection-2026-09-24/r2-2b/infinite-scroll/after-retry-click-light-1280.png`（与点击前 default-light-1280 场景②区完全一致）
- **目视描述**: 场景描述承诺"clicking retry resumes loading"，但点击"加载失败，点击重试"后界面无任何变化——无 spinner、无文案切换、无 error 解除，按钮与错误文案保持原样。
- **程序化证据**:
  - 探针: `_tmp/r2-2b-probes/w6-infinite-scroll.mjs` retryClick 段（点击前后 DOM 采样）
  - 输出: `before: 'error'` → `after: { status:'error', probe:'retry', text:'加载失败，点击重试' }`——事件通路正常派发（`${source}` 解析为 retry），但 `data-status` 恒为 error，无任何渲染面变化。渲染器侧 OA-16 文档化的恢复杠杆是宿主清 `error`，fixture 未演示该回写，恢复链路在此载体上不可见。
- **对照基准**: 检查提示词 A9（交互后反馈可见，非静默更新）；fixture 承诺落空族（R2-2a-F4-83 同形态：demo/fixture 承诺的行为在载体上永不出现）。
- **严重程度**: P3（fixture 演示层缺口：渲染器 error/retry 契约本身工作，真实接入方回写 error 后状态机正常；但该 lab 页向使用者展示的"重试恢复"是不可兑现的）
- **用户影响**: 学习者按场景描述点击重试后看不到任何效果，对该组件恢复能力形成"失灵"误解。
- **修复方向**: `apps/playground/src/component-lab/renderers/data-c7-host.ts` `c7RetrySchema`：`onLoadMore` probe action 中（或换用 host 命名空间 invoke）延时回写 `error:false` + 短 `loading:true`，令 retry 点击呈现 loading→normal 恢复链；或在场景描述中明示"本 fixture 不回写状态"。
- **归族**: watch-only → 台账（fixture 承诺落空族实例，同 R2-2a-F4-83 形态；渲染器无责）
- **复核状态**: 未复核

## 4. 已知族命中（引用，不另立项）

- **R2-1d-A9-01（infinite-scroll 演示永久卡在「加载中...」P1）现状复核：仍复现**。`#/mobile-components` demo 页 375 实测（`out-w6-infinite-scroll.json` r21dA9recheck）：初始 `status:'loading'`，6 轮滚动（~4.2s）后仍 `status:'loading'`、文案恒"加载中..."（截图 `r21d-recheck-demo-375-light.png`）。demo 宿主代码已有 MA 系重写注释（mobile-components-demo.tsx L178 起），但运行时行为未收敛——原条目 P1 维持，引用不另立项。
- **宿主级 `--popover` dark 亮底族**：`dialog-open-dark-1280.png` 弹层整面白底（像素采样 surface `rgb(252,252,252)`），弹层内 pull-refresh/infinite-scroll 全部继承白底——引用不立项，修复后需本卡 B5/H 复检。
- **默认栈宽基线族（R2-2a-E2-26 watch）**：场景① "Open mobile host dialog" 主按钮全宽拉伸 918px（`default-light-1280.png`），族实例挂账不立项。
- **窄视口 flex/固定壳层（R2-3c 候选族）**：375 下 retry 钮被压至 22px 宽（`retry-light-375.png` 逐字竖排，overflow hits `c7-dialog-open` overX 69），根因载体壳层，引用不立项。
- **计划内正向锚点**：MA-13/MM-16 in-flight 去重在弹层 immediateCheck 场景精确生效（`__c7loadMore === 'immediate'` 恰好一次，无重复派发）；MM-20 内滚祖先探测在本载体无内滚容器时正确回退视口观测。

## 5. 误报排除记录

| 疑点                                      | 排除理由                                                                          |
| ----------------------------------------- | --------------------------------------------------------------------------------- |
| dark retry 文本 DOM 合成对比度 1.19:1     | 渐变背景合成失真（R2-2a 方法学②）；像素采样实测 15.59:1（`w6-pixel-sample2.mjs`） |
| error 态重试钮无边界（ghost 变体透明底）  | ux-skill 误报排除表登记的 ghost variant 模式，勿报；文本对比度 15.59:1 合格       |
| 弹层场景 body 文案"第一页数据项…"折成单行 | `\n` 在 text 渲染器折叠为空白，fixture 文本渲染行为，非本控件缺陷                 |

## 6. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-infinite-scroll` → carded（卡列填本路径）；
- findings：R2-2b-A9-182 → watch-only 台账后 → digested；R2-1d-A9-01 维持原裁决（P1，现状仍复现）；批内复检通过后 → verified。
