# [card] control:input-file

- **批次**: R2-2a ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/lab/input-file` ｜ **载体**: lab 页（3 场景：single valueMode url（accept .pdf/.doc/.docx，uploadAction /api/upload 无宿主 fetcher）/ multiple maxFiles 3 / host fetcher 成功+失败双通道）
- **矩阵裁剪**: simplified（matrixReason：上传态机 pending→result/error 的可见面已查 error/result/超限拒绝；**pending 态未能捕获**——默认 fetcher 对 /api/upload 同步失败，120ms 截帧已是 error 终态（`s1-pending-mid-light-1280.png`），pending spinner+取消钮 DOM 通道存在（`upload-field.tsx` L623/L634）但 fixture 下不可稳定复现，登记为矩阵缺口）。裁掉：disabled/readOnly（fixture 无）、glass 皮肤。dark 用真 data-mode 自采。
- **交互键说明**: 上传态需 `setInputFiles`，runner 无该 action，无法注册交互键（见最终上报）。

## 1. 截图清单

| 状态                                      | light                                                                                                                    | dark（真 data-mode，自采）                                                          |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| 默认 1280×800                             | `_tmp/visual-inspection-2026-09-23/r2-2a/input-file/default-1280-light-viewport.png` / `default-1280-light-fullpage.png` | `_tmp/visual-inspection-2026-09-23/r2-2a/input-file/default-1280-dark-viewport.png` |
| 上传错误态（/api/upload 不可用）          | `_tmp/visual-inspection-2026-09-23/r2-2a/input-file/s1-upload-result-light-1280.png`                                     | —                                                                                   |
| pending 中间态（120ms 截帧，已到 error）  | `_tmp/visual-inspection-2026-09-23/r2-2a/input-file/s1-pending-mid-light-1280.png`                                       | —                                                                                   |
| S2 多文件超 maxFiles 拒绝提示             | `_tmp/visual-inspection-2026-09-23/r2-2a/input-file/s2-multiple-over-max-light-1280.png`                                 | —                                                                                   |
| S3 host 成功（url 回写行）+失败（错误行） | `_tmp/visual-inspection-2026-09-23/r2-2a/input-file/s3-host-ok-and-fail-light-1280.png`                                  | `_tmp/visual-inspection-2026-09-23/r2-2a/input-file/s3-host-states-dark-1280.png`   |
| S3 提交 echo（fail 值保持干净）           | `_tmp/visual-inspection-2026-09-23/r2-2a/input-file/s3-submitted-light-1280.png`                                         | —                                                                                   |
| 默认 800×900 窄视口                       | `_tmp/visual-inspection-2026-09-23/r2-2a/input-file/default-800x900-light-fullpage.png`                                  | —                                                                                   |

## 2. A–H 维度勾选表

- A 交互：A1 pass（上传文件钮 hover）A2 pass A3 pass（上传钮全宽 36px 高、清空钮 ≥24px）A4 n/a A5 pass（错误态 Spinner 通道存在；error 行红字右位清晰可读）A6/A8 n/a A7 n/a A9 pass（成功回写 url 行+清空钮出现；失败值不污染：echo `MR-UPLOAD:{"ok":"https://cdn.example.com/demo.txt"}` 无 fail 键值）
- B 颜色：B1–B4 pass（错误 destructive 红、成功行令牌）B5 pass（dark 上传行/错误行正常）B6 pass（错误红仅真错误）
- C 布局：C1 pass（溢出命中仅 `nop-input-file-input` sr-only 1×1 隐藏 input overX ~190，白名单）C2–C6 pass/n-a
- D 间隔：D1 pass（上传钮、值行、清空钮垂直节奏一致）D2–D8 n/a/pass
- E 排布：E1 pass E2 pass（上传主钮全宽主导）E3 pass（错误信息行内右位）E4 pass E5 pass E6 n/a
- F 一致性：F1 pass（上传钮图标+文案形态与 input-image 一致）F2 n/a F3 pass（error 行 dashed 边框模式两控件一致）F4 warn（已知族 F4-11："上传文件/上传多个文件/清空/上传失败："中文 chrome；且组合消息"上传失败：Upload rejected by host"中文前缀拼英文服务端消息，语言混排）
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

### [R2-2a-A5-85] accept 类型不匹配无客户端拒绝提示：超限有 rejection 面板、类型不匹配静默放行，拖拽路径无守门

- **页面/路由**: `#/lab/input-file`（S1 场景 accept=".pdf,.doc,.docx"）
- **主题/视口/状态**: light / 1280 / 程序注入 note.txt（accept 外类型）→ 无任何提示；同控件注入 4 文件超 maxFiles → 有 rejection 提示
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-2a/input-file/s2-multiple-over-max-light-1280.png`（超限提示正常："文件数量超限 —— 最多允许 3 个"）
- **目视描述**: 注入 .txt 文件后控件直接进入上传/错误流程，无"类型不接受"的 rejection 提示；而超数量时有明确拒绝面板。
- **程序化证据**:
  - 探针: `_tmp/r2-2a-probes/w5-input-file.mjs`（setInputFiles note.txt → 读 `[data-slot="upload-rejection"]`）
  - 输出: `rejection: null`（accept 不匹配零反馈）；对照 `multiRejection: "文件数量超限 —— 最多允许 3 个"`。`upload-field.tsx` L112-114 accept 仅传给原生 `<input accept>`——文件对话框路径有效，但**拖拽/程序注入路径无客户端类型校验**，与 maxFiles 的客户端校验不对称。
- **对照基准**: 检查提示词 A5（状态反馈完整性）；`upload-field.tsx` L160 G2-视角5-02 注释（rejection surface 设计意图覆盖"maxSize / …"类客户端拒绝）
- **严重程度**: P3（对话框主路径用户不受影响；拖拽大文件错误类型会走到服务端才失败）
- **用户影响**: 拖拽 .txt/.exe 等不可接受类型的用户得不到即时反馈，浪费一次上传往返。
- **修复方向**: `upload-field.tsx` 批次入口校验 `accept` 匹配（与 maxSize 同通道写入 rejectionNotice），拒绝文案走 i18n。
- **归族**: watch-only → 台账（输入守门一致性；与 maxFiles 拒绝面收敛后可升级 local）
- **复核状态**: 未复核

## 4. 已知族命中（引用，不另立项）

- **i18n zh-CN 回退（R2-2a-F4-11 族，新实例，含混排形态）**: "上传文件/上传多个文件/清空/上传失败："中文；组合错误消息"上传失败：Upload rejected by host"= 中文前缀 + 英文服务端消息同串混排（`s3-host-ok-and-fail-light-1280.png`），F4 语言一致性族的新形态。
- 成功项 `upload-item-name` 显示完整 url 而非文件名（valueMode url 语义下可解释，登记 watch 不立项）。
- 计划内正面锚点：失败值不污染（XSS/干净值红线通过）；宿主 fetcher INV-1 边界工作正常。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-input-file` → carded（卡列填本路径）；findings 归族后 → digested。
- 交互键：无法注册可复现交互态（上传需 setInputFiles，runner 无该 action）；仅默认态截帧。理由已登记卡头。
