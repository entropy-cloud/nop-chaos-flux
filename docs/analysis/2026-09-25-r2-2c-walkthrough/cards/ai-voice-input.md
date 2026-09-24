# [card] control:ai-voice-input

- **批次**: R2-2c ｜ **台账状态**: carded ｜ **日期**: 2026-09-25
- **路由**: `#/lab/ai-voice-input` ｜ **载体**: lab 页（MultiScenarioLabPage，1 场景：Host voice input degradation path C8.3 — onError probe `${reason}`）
- **矩阵裁剪**: simplified（matrixReason：单按钮控件。裁掉的状态：**降级 disabled 态 + data-unsupported 徽标 + tooltip**——载体 Playwright Chromium 含 Web Speech API（`speechSupported: true`），fixture 场景描述的"浏览器不支持"路径在本载体永不渲染，徽标/toast 通道以源码 L296-312 核对；录音中波形已实测（点击进入 listening）， denied/no-result 错误支实测 no-result 一例）

## 1. 截图清单

| 状态                              | light                                                                                 | dark（真 data-mode，自采）                                                           |
| --------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 默认 1280×800（idle 麦克风）      | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-voice-input/default-light-1280.png`       | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-voice-input/default-dark-1280.png`       |
| hover 探测（tooltip 不出现）      | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-voice-input/tooltip-light-1280.png`       | —                                                                                    |
| 录音中（wave 动画，aria-pressed） | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-voice-input/listening-light-1280.png`     | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-voice-input/listening-dark-1280.png`     |
| 会话结束（no-result 后 idle）     | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-voice-input/after-error-light-1280.png`   | —                                                                                    |
| 默认 ~800 宽                      | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-voice-input/default-narrow-800-light.png` | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-voice-input/default-narrow-800-dark.png` |

## 2. A–H 维度勾选表

- A 交互：A1 n/a（idle 麦克风 ghost 钮 hover 走 variant 通道；降级态 hover 载体不可达）A2 n/a（单钮焦点环同 Button 基类）A3 pass（ghost 钮 28px 高；smallTargets 零命中）A4 pass/warn（降级 disabled 态载体不可达——源码 L268 `disabled={unsupported || disabled}` 通道在位，§4 载体限制声明）A5 pass（listening 用 5 段 wave 动画替代静态图标，`wavePresent: true`）A6–A8 n/a A9 pass（点击→`data-state=listening`+`aria-pressed=true`；再点→idle 停止；会话结束 `onError('no-result')` probe 值 `__c83VoiceError="no-result"` 到位）
- B 颜色：B1 n/a（无文本内容；wave `text-primary` 蓝 light/dark 均可见，PNG 目视）B2 n/a B3 pass B4 pass（wave 走 token）B5 pass（dark wave 亮蓝 `--primary` dark 偏亮但在深底可辨，属族内已知档位）B6 pass
- C 布局：C1 pass（`docOverX 0`；sr-only 50px 白名单排除）C2 pass C3 pass C4 pass C5/C6 n/a
- D 间隔：D1–D8 n/a/pass（单钮无组间距；wave 与徽标 `ml-2` 源码核对）
- E 排布：E1 pass E2 pass E3 pass E4 pass（wave 居中于行）E5/E6 n/a
- F 一致性：F1–F3 n/a F4 **warn**（aria-label "语音输入" 中文 — R2-2a-F4-11 族 aria 实例，§4 引用）F5 n/a
- G 设计器：n/a
- H 弹层：n/a（tooltip 仅降级态挂载，载体不可达）

## 3. 发现条目

（无本控件新立项发现。载体限制与族实例见 §4。）

## 4. 已知族命中（引用，不另立项）

- **默认栈宽基线族（R2-2a-E2-26 watch）**：idle 麦克风 ghost 钮全行拉伸 `918×28`（`out-w2-voice.json` default.button.rect），图标居中悬浮于行中部，可视控件与可点区域 1:30+ 失配——族新实例（`default-light-1280.png` 一枚居中小图标漂在整条 stage 上）。
- **lab 载体与环境基建族 / fixture 承诺落空（R2-2a-F4-83 外围）**：fixture 场景标题与描述承诺"浏览器缺 SpeechRecognition → disabled + data-unsupported + onError('unsupported')"，但载体 Chromium `window.SpeechRecognition` 存在（`speechSupported: true`），降级演示在当前 lab 永不出现（`out-w2-voice.json` default：`disabled: false, dataUnsupported: false, badge: null, onErrorProbe: null`）——需 Firefox/Safari 或注入删除 API 的专用载体才能演示；fixture 与环境能力错配归载体族记录。
- **载体行为备注（非缺陷）**：headless 无麦克风，recognition 会话不自行 onend/onerror，listening 态持续至手动停止（`afterError.state: "listening"` 持续 2.5s+）；真实浏览器将走 not-allowed→permission-denied 支。停止（再点）→idle 与 no-result 错误支均实测通过。
- **R2-2a-F4-11（i18n zh-CN 回退）**：aria-label "语音输入"、降级徽标文案 `t('flux.ai.voiceUnsupported')` 中文源——aria/降级态面，视觉载体不可达。
- **计划内锚点复检通过**：点击→listening（wave 5 段 + data-state + aria-pressed）→ 再点停止回 idle（in-flight 守卫释放，可再次启动）→ no-result 错误 dispatch（probeCount 1）。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-ai-voice-input` → carded（卡列填本路径）；findings 归族后 → digested。
