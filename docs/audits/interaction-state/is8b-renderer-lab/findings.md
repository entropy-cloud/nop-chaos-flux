# IS-8b renderer lab 批二 48 页序列审查证据（plan 553 基线）

> 审查方法：docs/skills/interaction-state-audit-prompt.md §4/§6/§9；四审查组独立 fresh session 真实驱动浏览器取证（2026-10-08，Playwright chromium，strict-validation，读数定罪/截图零使用，~130 序列）。
> 组 A 布局/导航/反馈 12 页（4 raw）；组 B 内容展示 12 页（3 raw + 剪贴板回读核验通过）；组 C 媒体/移动 10 页（3 raw + 3 撤案 + 移动手势 375×667 hasTouch 仿真——549 先例）；组 D AI 族 14 页（6 raw + 3 撤案 + **AI 族 ${event.\*} 模板 15 处全数求值成功——549 结论在 lab 形态成立** + cancel 语义成立）。合并 16 台账行（P1×2/P2×6/P3×8），无跨组合并；台账净增 15 行（IS-lab-form-001 沿用 552 原行去重）。
> 原始机器可读读数：本目录 survey-readings-A/B/C/D.json；组 B/C/D 另有 \_tmp/is8bB-r-_.json（35）/is8bC-readings/（13）/is8bD-r-_.json（23）（会话级）。

## Findings 摘要（16 台账行 = P1×2 + P2×6 + P3×8）

| ID                          | 页面                 | 症状                                                                                                                                                                                        | 类别/级别 | 归属                                             |
| --------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------------------------------------------------ |
| IS-lab-wizard-001           | lab-wizard           | Linear 向导 step-nav 一键跳到下一未访问步，绕过 formId 校验/onStepCommit（空必填字段点 nav nth(1) 直达 Review 零报错）——computeCanGoTo 对 furthestReached+1 恒放行 + nav 点击不经 commit 层 | C/P1      | renderer（wizard-step-nav）                      |
| IS-lab-wizard-002           | lab-wizard           | 向导「上一步」丢失已键入步数据（mountOnEnter 默认 false → 离开步即卸载内嵌 form store）                                                                                                     | C/P1      | renderer 默认值 × demo 未声明                    |
| IS-lab-json-view-001        | lab-json-view        | 嵌套展开器键盘不可达（根箭头 tabindex=0、嵌套箭头全 -1；鼠标展开正常）                                                                                                                      | E/P2      | renderer a11y                                    |
| IS-lab-link-001             | lab-link             | 链接静置态与正文不可辨（对比度 1.057、无下划线、零 hover 差异；.nop-link 无样式定义，仅 cursor:pointer）                                                                                    | D/P2      | ui 样式                                          |
| IS-lab-ai-conversations-001 | lab-ai-conversations | 新建会话死通道（probe echo 列表 2→2、零反馈）                                                                                                                                               | C/P2      | demo schema（lab 形态未接 create）               |
| IS-lab-ai-conversations-002 | lab-ai-conversations | 重命名死通道（Enter 后输入框关闭、标题原样）                                                                                                                                                | C/P2      | demo schema（未接 onItemRename）                 |
| IS-lab-ai-conversations-003 | lab-ai-conversations | 删除死通道（确认框提交后条目原样；三路确认 V5 全净）                                                                                                                                        | C/P2      | demo schema（未接 onItemDelete）                 |
| IS-lab-carousel-001         | lab-carousel         | 声明 autoPlay 为 true 的自动播 4/5 次加载不自进（next 箭头推进同一 embla 实例为判别——api 健康；仅 autoPlay off→on 循环恢复且不确定）                                                        | C/P2      | content carousel（autoplay effect 生命周期候选） |
| IS-lab-infinite-scroll-001  | lab-infinite-scroll  | retry 点击派发 onLoadMore('retry') 但零可见变化（静态 demo host，「点击 retry 恢复加载」不可观测）                                                                                          | C/P3      | demo host                                        |
| IS-lab-video-001            | lab-video            | 媒体 fallback（error/empty）分支静默丢弃声明 title（错误卡失标识；audio.tsx 同形）                                                                                                          | C/P3      | renderer                                         |
| IS-lab-ai-sender-001        | lab-ai-sender        | 场景宣称 destructive over-cap 计数态不可达（65 字符被原生 maxLength 截 60 且 Enter 正常提交；ai-sender.tsx 软上限与硬截断并存）                                                             | C/P3      | renderer×demo 场景                               |
| IS-lab-ai-prompts-001       | lab-ai-prompts       | 选择交互结果不可见（popover 不关、无选中态、无 toast；payload 派发本身全对）                                                                                                                | C/P3      | renderer 反馈面                                  |
| IS-lab-ai-suggestions-001   | lab-ai-suggestions   | 同 prompts 同根（共享修复面）                                                                                                                                                               | C/P3      | renderer 反馈面                                  |
| IS-lab-alert-001            | lab-alert            | demo-schema 死回显——close-report 引用 closeReported 无动作写入，真实关闭后停「pending」（关闭契约本体真实：probe warning→closed、节点移除、无假 toast）                                     | D/P3      | demo schema                                      |
| IS-lab-result-001           | lab-result           | result 页「返回列表」「查看记录」按钮完全 inert（导航性 label）                                                                                                                             | C/P3      | demo schema                                      |
| IS-lab-form-001             | lab-form             | 场景文案泄漏原始 "undefined"（IS-8a 组 B 已登记——lab-form 属 552 组 B 页清单与 8b 枚举批归交叉，finding 沿用原行不重复立案）                                                                | D/P3      | demo 文案                                        |

## n-a 与豁免登记

- 组 A：lab-grid/lab-timeline/lab-separator 展示面 n/a（声明即展示；几何/装饰语义已验）；lab-resizable Esc-cancel n/a（库无 Escape 处理、schema 未宣称）。
- 组 B：lab-markdown/html/image/card/cards/progress/spinner/mapping/status 交互面全绿（剪贴板回读逐字节相等、复制标签生命周期 复制→已复制→复制）。
- 组 C：pull-refresh/swipe-cell/countdown/notice-bar/diff-view/qrcode 全绿（swipe 开/关/部分回弹/touchcancel 无提交、pull-refresh ≤950ms 落定——StrictMode 隐患阴性）；lab-video 播放态 headless 不可驱（w4a 先例）。
- 组 D：lab-ai-message-list 虚拟窗口无注入面 n/a；lab-ai-voice-input 降级分支本浏览器不可达 n/a（no-result 错误路径已验）；lab-ai-welcome 无状态面。
- 探针伪影撤案：组 B 3 处（scope-debug dump 文本污染——recurse-001 同型；trace-teardown ENOENT 环境噪声）+ 组 C 3 处（swipe TouchEvent 非提交伪影异步复测全绿、trace-ENOENT、offscreen autoplay 首读为 WCAG 暂停声明）+ 组 D 3 处。

## Watch（未定罪，不进 P0–P3）

lab-ai-bubble hover-reveal bar（IS-ai-chat-001 同根族）；wizard 完成/结果按钮 inert（demo 未接完成态——IS-lab-result-001 同族）；lab-resizable Esc 取消为库级缺口（未宣称不立案，库能力候选）；carousel autoplay 恢复不确定性（effect 生命周期候选）；ai-sender 软上限与硬截断并存语义。

## 修复收口（plan 553 Phase 2，2026-10-08）

| ID                | 裁决               | 修复面与证据                                                                                                                                                                                                                                                                                                               |
| ----------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| IS-lab-wizard-001 | **fixed→verified** | wizard-step-nav：linear 且非 allowStepJump 时，furthestReached+1（下一未访问步）的 nav 点击不再可点（该步仅可经「下一步」commit 层——formId 校验/onStepCommit；computeCanGoTo 保持供 goToStep 守卫）。e2e：空必填下 gated nav 钮 toBeDisabled、active 停留步 0（红态：一键直达 Review 零报错——审查组红 e2e 草图原样复验）。 |
| IS-lab-wizard-002 | **fixed→verified** | wizard-renderer mountOnEnter 默认翻转（=== true → !== false）：已访问步 body 保持挂载（内嵌 form store 随存），unmountOnExit 仍可显式退出；layout-renderer-definitions 默认值同步。e2e：fill Acme Corp → 下一步 → 上一步 → input 仍 Acme Corp（红态：''）。                                                                |

红→绿纪律：2 用例独立取证（wizard nav 门禁 disabled 断言 + back-preserves toHaveValue）；layout 包 145/145 零回归（无测试钉住旧绕过行为）。

## 回归与门禁（修复执行会话实测）

flux-renderers-layout 145/145；typecheck 零错误。
