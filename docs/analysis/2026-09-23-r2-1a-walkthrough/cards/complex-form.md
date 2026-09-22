# [card] page:complex-form

- **批次**: R2-1a（波 5） ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/complex-pages/complex-form` ｜ **载体**: complex-page（schema: `apps/playground/src/complex-pages/page-schemas/complex-form.json`）
- **矩阵裁剪**: full（同步表单页：无异步首屏数据 → loading/empty 裁剪；无 Dialog/Sheet/Drawer 实体弹层，select/combobox 弹出层属 hover floater 不入 H 阶梯 → H 裁剪为 n/a；拖拽 n/a；fieldset 折叠态 schema 未启用 collapsible，无法程序化触发 → 未截，见误报排除）

## 1. 截图清单（状态矩阵）

| 状态                              | light                                                                                            | dark                                                                                 |
| --------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| 默认 1280×800                     | `_tmp/visual-inspection-2026-09-23/r2-1a/complex-form/complex-form-default-light.png`            | `_tmp/visual-inspection-2026-09-23/r2-1a/complex-form/complex-form-default-dark.png` |
| 默认 ~800 宽（800×900）           | `_tmp/visual-inspection-2026-09-23/r2-1a/complex-form/complex-form-narrow-light.png`             | `_tmp/visual-inspection-2026-09-23/r2-1a/complex-form/complex-form-narrow-dark.png`  |
| focus-visible（输入框）           | `_tmp/visual-inspection-2026-09-23/r2-1a/complex-form/complex-form-focus-light.png`              | —                                                                                    |
| hover（用户类型 select 触发器）   | computed 对比 done（无差异，见 A1-02）                                                           | —                                                                                    |
| disabled（保存钮 agreed 门控）    | default-light 内可见（左下 保存 0.5 透明度）                                                     | 同左                                                                                 |
| 联动中间态：userType→企业         | `_tmp/visual-inspection-2026-09-23/r2-1a/complex-form/complex-form-enterprise-light.png`         | —                                                                                    |
| 联动中间态：advanced→预算/备注    | `_tmp/visual-inspection-2026-09-23/r2-1a/complex-form/complex-form-advanced-open-light.png`      | —                                                                                    |
| 联动中间态：省份→城市启用         | `_tmp/visual-inspection-2026-09-23/r2-1a/complex-form/complex-form-cascade-light.png`            | —                                                                                    |
| select 弹出层（用户类型）         | `_tmp/visual-inspection-2026-09-23/r2-1a/complex-form/complex-form-usertype-popover-light.png`   | —（dark 受宿主 --popover 覆盖影响，已知项不重复取证）                                |
| 校验错误（空必填点保存）          | `_tmp/visual-inspection-2026-09-23/r2-1a/complex-form/complex-form-error-light.png`              | `_tmp/visual-inspection-2026-09-23/r2-1a/complex-form/complex-form-error-dark.png`   |
| 校验失败 toast（[object Object]） | `_tmp/visual-inspection-2026-09-23/r2-1a/complex-form/complex-form-toast-objectobject-light.png` | —                                                                                    |
| 合法保存成功（toast+状态回写）    | `_tmp/visual-inspection-2026-09-23/r2-1a/complex-form/complex-form-save-valid-light.png`         | —                                                                                    |

## 2. A–H 维度勾选表

- A 交互：A1 **fail(A1-02)** A2 pass A3 **fail(A3-02)** A4 pass A5 n/a A6 n/a A7 pass A8 n/a A9 **fail(A9-02)**（行内错误呈现 4/4 全量合格；失败在 toast 通道）
- B 颜色：B1 pass（label/input 20:1、error 5.81:1） B2 **fail(R2-1a-B2-01 系统项，本页复测)** B3 pass B4 pass B5 pass（dark 正文 16.7:1；B2 边界问题 dark 同源） B6 pass（错误走 destructive 令牌、城市 disabled 灰感明确）
- C 布局：C1 pass（1280 与 800 宽溢出扫描均 0 命中） C2 pass C3 pass C4 pass（双列布局窄视口下单列堆叠不破版） C5 pass C6 n/a
- D 间隔：D1 pass（组内字段间隙序列 [16,16,16]/[16,16]/[16] 全栅格） D2 **warn(D2-01)** D3 n/a D4 pass D5 pass（label→control 8px、error→control 8px、字段间 16px 三层成体系） D6 n/a D7 pass（fieldset↔fieldset 16px） D8 pass（字段距 fieldset 边缘 ~16px）
- E 排布：E1 pass E2 pass（保存 primary；disabled 0.5 可感知） E3 **fail(E3-01)** E4 pass（双列 x=313/785 两条Clean列线；label lx=cx） E5 pass（边框 fieldset 分组语言统一） E6 n/a
- F 一致性（横切）：F1 **warn（E3-01 的跨页面：向导动作条右主位 vs 表单动作条左对齐）** F2 n/a F3 n/a F4 pass F5 n/a
- G 设计器：n/a
- H 弹层：n/a（页面无 Dialog/Sheet/Drawer/Popover 实体弹层；select/combobox 浮层为 content-sized floater，按提示词不在阶梯口径内；coordinator 要求的 H3/H8 长内容弹层滚动契约因无实体弹层无法执行，注明）

## 3. 发现条目

### [R2-1a-A9-02] 表单校验失败 toast 渲染为 "[object Object],[object Object],…"

- **页面/路由**: `#/complex-pages/complex-form`（空必填点「保存」）；combo-editor 页同现象（见其卡 R2-1a-A9-03）
- **主题/视口/状态**: light / 1280×800 / 提交校验失败后 ~1s
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1a/complex-form/complex-form-toast-objectobject-light.png`、`complex-form-error-light.png`（右下角同现）
- **目视描述**: 右下角错误 toast 文案为字面 `[object Object],[object Object],[object Object],[object Object]`，与 4 条行内错误一一对应但完全不可读。
- **程序化证据**:
  - 探针: 点击保存后采集 `[data-sonner-toast], li[role="status"]` 的 textContent 与 data-type（`complex-form-toast.mjs`）。
  - 输出: `{type:"error", txt:"[object Object],[object Object],[object Object],[object Object]"}`；combo-editor 复测同为 `[object Object]`（跨页复现 ≥2 页）。合法保存路径 toast 正常（「保存成功」type=success），故为**校验失败分支的消息对象未序列化/未取 message 字段**。
- **对照基准**: 检查提示词 A9「交互后反馈可见，非静默更新」；B4 文案可读性常识；Design QA「内容：截断/溢出/空态」——错误反馈内容不可读。
- **严重程度**: P1（系统性候选：基础 P2 + 跨页同根因升一级）
- **用户影响**: 所有带 submitAction 的表单在校验失败时，动作级反馈是乱码；虽然行内错误存在（本页 4/4 全标红），toast 作为全局反馈通道输出垃圾文本，观感差且可能被截屏/上报场景放大。
- **修复方向**: 校验失败 → toast 的 messages 管线（flux-action-core/flux-runtime submitForm 分支）在把 validation errors 交给 toaster 前取 `error.message` 或 join 每项的 `field+message`，禁止对象直 toString。
- **归族**: systemic → R2-3 批
- **复核状态**: 未复核

### [R2-1a-A3-02] Switch 32×18.4、Checkbox 16×16，低于 24px 最小可点目标

- **页面/路由**: `#/complex-pages/complex-form`（「接收通知」「展开高级选项」Switch；「我已阅读并同意相关条款」Checkbox）
- **主题/视口/状态**: light / 1280×800 / 默认态
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1a/complex-form/complex-form-default-light.png`（左列下部 switch/checkbox）
- **目视描述**: 开关与复选框明显小于常规触控目标。
- **程序化证据**:
  - 探针: 可交互元素 `getBoundingClientRect()` 短边统计（`complex-form-walk.mjs` probeForm smallTargets + `complex-form-toast.mjs` SIZES）。
  - 输出: `{slot:"switch", w:32, h:18.4}` ×2（接收通知/展开高级选项）；`{slot:"checkbox", w:16, h:16}`；1×1 视觉隐藏原生 input 属已登记误报不报。
- **对照基准**: WCAG 2.5.8 最小目标 24×24 CSS px；检查提示词 A3。
- **严重程度**: P2
- **用户影响**: switch 是本页联动的主控件（类型切换/高级展开全靠它），18px 高度对触屏与精确点击都不友好；协议勾选框 16px 同理。
- **修复方向**: `packages/ui` Switch 提升至 `h-6`（24px）轨道或保持视觉尺寸但扩大可点热区（`after:absolute after:-inset-1`，click target ≥24）；Checkbox 提升 `size-5`（20px）+ 热区扩展至 24。
- **归族**: systemic → R2-3 批（与 form-wizard 卡 A3-01 stepper 同属「控件可点目标 <24」族）
- **复核状态**: 未复核

### [R2-1a-A1-02] select/combobox 触发器 hover 无反馈（与 A1-01 同族）

- **页面/路由**: `#/complex-pages/complex-form`（「用户类型」「省份」select 触发器）
- **主题/视口/状态**: light / 1280×800 / 指针强制 hover
- **截图**: 差异为 computed 值零变化，无独立截图价值（探针为主要证据）
- **目视描述**: 悬停 select 触发器无任何底色/边框变化。
- **程序化证据**:
  - 探针: Playwright `hover()` 前后读 computed backgroundColor/borderColor（`complex-form-walk.mjs`）。
  - 输出: `rgba(0,0,0,0)|rgb(225,231,239) => rgba(0,0,0,0)|rgb(225,231,239) diff=false`。combobox-trigger 类串（见 form-wizard flow 日志）不含任何 `hover:` 工具类。
- **对照基准**: 检查提示词 A1「hover 态存在且可感知」；Design QA 交互态清单。
- **严重程度**: P2
- **用户影响**: 表单控件无可点可供性；与 form-wizard 卡 A1-01（primary button 无 hover）同属「交互控件 hover 反馈缺失」系统族。
- **修复方向**: `nop-combobox` 触发器类（flux-renderers-form select/combobox 控件）补 `hover:border-input hover:bg-muted/50` 一类工具类；与 ui Button outline variant 的 hover 语义对齐。
- **归族**: systemic → R2-3 批（A1-01 同族合并处理）
- **复核状态**: 未复核

### [R2-1a-E3-01] 表单动作条按钮左对齐，违背 styling-system 右对齐约定

- **页面/路由**: `#/complex-pages/complex-form`（「保存」钮在表单左下）；combo-editor「保存联系人」同位（见其卡复测）
- **主题/视口/状态**: light + dark / 1280×800 / 默认态
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1a/complex-form/complex-form-default-light.png`（左下 保存）
- **目视描述**: 表单唯一主操作按钮出现在内容左下角，不在惯常的右下主位。
- **程序化证据**:
  - 探针: 按钮 boundingRect.x（probeForm.submit + 截图目视）。
  - 输出: 保存按钮 x 与表单左缘对齐（≈313），右侧留白；form-wizard 的 wizard-actions 为 `justify-between`（上一步左/下一步右，下一步 x=1176 右缘）→ 同域两种动作条落位。`docs/architecture/styling-system.md`「Dialog / Form Action Button Convention」明文 "Action buttons are right-aligned via `actionsClassName: "flex justify-end gap-2"` (set as default on form `form-actions`)"。
- **对照基准**: styling-system.md Form Action Button Convention（右对齐为默认契约）；检查提示词 E3「操作按钮落点符合惯例（确认在主位）」。
- **严重程度**: P2（跨页不一致 + 违背已文档化契约；高频保存路径故不降级）
- **用户影响**: 保存动作落点与向导页/弹层页不一致，长表单（本页 2 列高表单）下按钮离视觉终点（右下）远，F 型动线终点空置。
- **修复方向**: form 渲染器 actions 槽（flux-renderers-form `form.tsx` 的 form-actions wrapper）默认补 `justify-end`，或在两页 schema 显式 `actionsClassName: "flex justify-end gap-2"`；跨页修正走 R2-3 统一裁决。
- **归族**: systemic → R2-3 批（所有带 actions 的表单页）
- **复核状态**: 未复核

### [R2-1a-D2-01] fieldset 组间距(16) 与组内字段间距(16) 相等，分组层级仅靠边框

- **页面/路由**: `#/complex-pages/complex-form`
- **主题/视口/状态**: light / 1280×800 / 默认态
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1a/complex-form/complex-form-default-light.png`
- **目视描述**: 三个 fieldset 之间的留白与字段间距同值，分组呼吸感弱（幸有边框盒补足）。
- **程序化证据**:
  - 探针: fieldset 间 `boundingRect` 间隙 vs 组内 `.nop-field` 间隙（probeForm fieldsetGaps/fieldGapsByGroup）。
  - 输出: fieldsetGaps=[16]（高级设置↔上行），组内 [16,16,16]——两组间距同值，不满足「分组间距 > 组内项间距」的格式塔邻近要求。
- **对照基准**: 检查提示词 D2「同组紧凑、异组留白：分组间距 > 组内项间距」；styling-system.md 间隔惯例表。
- **严重程度**: P3
- **用户影响**: 扫读时分块边界感知稍弱；已有边框分组兜底，实际影响小。
- **修复方向**: 页面 schema 两 fieldset 之间插 `className: "mt-2"`（+8px）或 fieldset 间距档升 24px（`gap-6`）；亦可作为 R2-3 对 `nop-fieldset` 默认 margin 的统一决策。
- **归族**: watch-only → 台账（低影响，建议随系统性间隔档决策一并处理）
- **复核状态**: 未复核

## 4. 误报排除记录

| 疑点                                           | 排除理由                                                                                                                                                     |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 「高级设置」fieldset 点击折叠无反应            | 本页 schema 未启用 collapsible，折叠图标不可见；collapse 中间态无法触发 → n/a（fieldset 渲染器支持该能力但页面未开）                                         |
| 城市 select 在选定省份后仍显示「请先选择省份」 | schema 占位文案为静态字符串（complex-form.json placeholder），联动本身已生效（探针 disabled:false, opacity:1）；文案陈旧属 schema 文案选择，watch 记录不立项 |
| dark 弹层（select 下拉）未截图                 | 宿主 `:root` 覆盖 `--popover` 已登记 systemic-local（P1），按简报不重复取证                                                                                  |
| 保存 disabled 态 cursor:pointer                | pointer-events:none 下 cursor 永不生效，已登记误报模式                                                                                                       |
| 空必填保存后出现的错误 toast 数量              | 行内 4 错误全量标红合格（与向导只报首错对照），toast 乱码已单独立项 A9-02                                                                                    |

## 5. 台账回写

- 本卡完成后：`ledger.md` 对应行 status → `carded`（card 列填本路径）；
  findings 归族：A9-02/A3-02/A1-02/E3-01 → R2-3；D2-01 → watch-only 台账；
  批内复检通过后 → `verified`。
