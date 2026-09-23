# [card] control:input-text

- **批次**: R2-2a ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/lab/input-text` ｜ **载体**: lab 页（4 场景：basic required / placeholder+maxLength / family composite submit / suggestSource writeback）
- **矩阵裁剪**: simplified（matrixReason：单行文本输入 + suggest 弹层；已查：suggest 弹层开态/选中/空态、maxLength 值态、error 态；裁掉的状态：glass 皮肤、disabled/readonly 变体（fixture 未布置）、prefix/suffix（input-number 卡已覆盖同结构））

## 1. 截图清单

| 状态                      | light                                                     | dark（真 data-mode）                                            |
| ------------------------- | --------------------------------------------------------- | --------------------------------------------------------------- |
| 默认 1280×800 s1/s2       | `default-s1-light-1280.png` / `default-s2-light-1280.png` | `default-s1-dark-1280.png`                                      |
| suggest 弹层开（输入 ap） | `suggest-open-s4-fixed-light-1280.png`                    | `suggest-open-s4-dark-1280-fixed.png`（真 data-mode，亮底弹层） |
| suggest 选中回写          | `suggest-picked-s4-fixed-light-1280.png`                  | —                                                               |
| suggest 空态（zz 无匹配） | `suggest-empty-s4-light-1280.png`                         | —                                                               |
| maxLength=100 值态        | `counter-maxlength-s2-light-1280.png`                     | —                                                               |
| error（空 required 提交） | `error-s1-fixed-light-1280.png`                           | —                                                               |
| 默认 800×900              | `default-s1-light-800.png`                                | —                                                               |

（截图落点前缀 `_tmp/visual-inspection-2026-09-23/r2-2a/input-text/`；早期 `suggest-open-s4-light-1280.png`/`error-s1-light-1280.png` 为探针选择器失配批次的同名废片，以 `-fixed` 批次为准）

## 2. A–H 维度勾选表

- A 交互：A1 pass（suggest item hover 有 accent 高亮）A2 pass A3 pass（弹层项 32px 高）A4 n/a A5 pass（suggest 空态有"明确空态文案"槽位）A6/A8 n/a A7 pass（suggest 弹层无遮罩属 popover 惯例、Esc 可关）A9 **warn(R2-2a-A9-62)**（suggest 过滤未生效，见发现）
- B 颜色：B1 pass（label 20.01:1；error 红 181,59,44 对白底 ≈6.3:1）B2 pass B3 pass B4 pass B5 **warn（已知族 --popover dark 亮底引用）** suggest 弹层 dark 下保持亮底 `rgb(251,250,249)` + 暗棕字（`suggest-open-s4-dark-1280-fixed.png`）B6 n/a
- C 布局：C1 **warn(R2-2a-C1-63)**（scope-debug JSON pre 长令牌不换行引发溢出链）+ C1-61 引用（clearable input-group 4–5px 微溢出）C2 pass C3 pass C4 pass C5 pass C6 n/a
- D 间隔：D1 pass（字段间隙 16px）D5 pass（label→控件 9px）其余 n/a/pass
- E 排布：E1–E5 pass E6 n/a
- F 一致性：F1–F3 n/a/pass F4 **warn（已知族 F4-11 引用）** 错误文案"Full Name不能为空"中文 F5 n/a
- G 设计器：n/a
- H 弹层：H1 pass（suggest 弹层宽=锚点 918px，无失控）H3 pass（bottom 628 ≤ 792）H4 n/a H5 n/a（无 footer）H6 pass（项高 32 一致）H7 pass H8 pass（列表内滚动）H9 pass（800 视口无溢出）

## 3. 发现条目

### [R2-2a-A9-62] suggest 弹层过滤未生效：输入 "ap" 仍展示全部 5 个选项（含不匹配的 Banana/Cherry）

- **页面/路由**: `#/lab/input-text`（场景 4 "input-text suggestSource writeback in form"）
- **主题/视口/状态**: light+dark / 1280 / 输入 "ap" 后弹层开
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-2a/input-text/suggest-open-s4-fixed-light-1280.png`（Apple/Apricot/Avocado/Banana/Cherry 全量并列）
- **目视描述**: 在 suggest 输入框键入 "ap"，弹层展示全部 5 个水果选项，未按查询收敛到 Apple/Apricot。
- **程序化证据**:
  - 探针: `_tmp/r2-2a-probes/w4-fixup2.mjs`（pressSequentially('ap') 后收集可见 `[data-slot="input-suggest-item"]` 文本）
  - 输出: `itemTexts: [Apple, Apricot, Avocado, Banana, Cherry]`（5 项全量）；选中回写与弹层关闭正常（live echo "Fruit: apple"）。根因在 fixture env：`apps/playground/src/component-lab/renderers/input-text-lab-page.tsx` 的 `suggestEnv.fetcher` 读 `api.args.params.q`，而 ajax 执行器把 params 规范化进 URL（同页 select 场景 `remoteSearchEnv` 已按 URL 读参并加注释说明），导致 q 恒为空串 → 走全量分支。
- **对照基准**: 检查提示词 A9（交互后反馈/结果正确）；suggestMinInputLength/suggestSource 契约
- **严重程度**: P3（lab fixture 取参错位，非 renderer 缺陷；选中回写主链路正常）
- **用户影响**: lab 演示的"按输入过滤"观感失效，作者按此 fixture 集成会复刻同一错误。
- **修复方向**: 对齐 `select-lab-page.tsx` 的 `remoteSearchEnv` 模式：fetcher 从 `api.url` 正则解析 `?q=`（或改读执行器规范化后的 data），使 suggestEnv 真正按 q 过滤。
- **归族**: local → R2-4 批（playground fixture 单点修正）
- **复核状态**: 未复核

### [R2-2a-C1-63] scope-debug JSON pre 长令牌不换行：溢出沿祖先链传播（1280 达 161px、800 达 641px、长值场景更高）

- **页面/路由**: `#/lab/input-text`（s2 填入 100 字符后触发；同根因实例：`#/lab/markdown-editor` XSS 场景（长 script 串，overX 链 875px@800）、各 lab 页 scope-debug 面板同构）
- **主题/视口/状态**: light / 1280 与 800 / 值态=长值
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-2a/input-text/counter-maxlength-s2-light-1280.png`（100 个 x 的 JSON 值行）
- **目视描述**: debug 面板 JSON 中超长未断行字符串使内容横向超出容器，虽然页级无滚动条（被上层裁剪），溢出值在 form/page 链路逐层累积。
- **程序化证据**:
  - 探针: `_tmp/r2-2a-probes/w4-textselect.mjs`（overflowScanJs）
  - 输出: `pre[data-slot=scope-debug-json] overX 161` → `scope-debug-body 161` → `nop-form 161` → `form-body 161` → `page-body 145` → `nop-page 145` → `scenario-stage 125` → `multi-scenario-lab 124`（1280）；800 视口同链 641；markdown XSS 场景 875。docOverX=0（页级不滚， ancestor overflow hidden 裁剪）。
- **对照基准**: 检查提示词 C1（无意外溢出；排除有意滚动容器）
- **严重程度**: P3（lab 专用 debug 面板，非用户产品面；页级无可感知破版）
- **用户影响**: 仅 lab 调试观感；若 scope-debug 组件被复用到宿主 debug 面板会带出同类裁切。
- **修复方向**: `apps/playground/src/component-lab/scope-debug` 的 JSON pre 加 `break-all`/`overflow-x:auto`（自我收敛为有意滚动容器），或对字符串值做截断省略。
- **归族**: watch-only → 台账（lab debug 工具面；跨 lab 页同根因，可并入 R2-3 候选一并清理）
- **复核状态**: 未复核

## 4. 已知族命中（引用，不另立项）

- **--popover dark 亮底（宿主已知问题）**：suggest 弹层 dark 下亮底 `rgb(251,250,249)`、文字 `rgb(103,87,76)`（`suggest-open-s4-dark-1280-fixed.png`），与 select 卡同族实例，引用不立项。
- **C1-61 input-group 尾缀微溢出**（本波 password 卡立项）：s4 clearable 输入组 4–5px 同链实例。
- **F4-11 i18n zh-CN 回退（已知族）**：错误文案"Full Name不能为空"中文。
- 计划内锚点复检通过：maxLength=100 硬截断生效（valueLen=100；input-counter 未渲染系 fixture 未开 showCounter，非缺陷）；suggest 选中回写+弹层关+live echo 正常；suggest 空态有文案槽。

## 交互键登记

- suggest 开态未注册：需先键入文本触发过滤，runner action 集无 type/fill（wave4 报告登记补录 2026-09-24，closure audit m-2）；卡内 A9-62 探针已覆盖该态取证。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-input-text` → carded（卡列填本路径）；findings 归族后 → digested。
