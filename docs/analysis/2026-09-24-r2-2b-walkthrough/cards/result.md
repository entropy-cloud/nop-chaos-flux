# [card] control:result

- **批次**: R2-2b ｜ **台账状态**: carded ｜ **日期**: 2026-09-24
- **路由**: `#/lab/result` ｜ **载体**: lab 页（MultiScenarioLabPage，3 场景：Success result with actions / Status gallery（info/warning/error）/ Custom icon override（package-check））
- **矩阵裁剪**: simplified（matrixReason：终态展示块，无弹层/无拖拽/无异步面；裁掉的状态：非法 status 回退（resolveStatus→info 有 dev warn，渲染面无法在 fixture 触发）、actions 长文案换行变体（fixture 按钮短文案））

## 1. 截图清单

| 状态                               | light                                                                   | dark（真 data-mode，自采）                                             |
| ---------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 默认 1280×800（success + actions） | `_tmp/visual-inspection-2026-09-24/r2-2b/result/default-1280-light.png` | `_tmp/visual-inspection-2026-09-24/r2-2b/result/default-1280-dark.png` |
| 默认 800×900                       | `_tmp/visual-inspection-2026-09-24/r2-2b/result/default-800-light.png`  | —                                                                      |
| 状态画廊（info/warning/error）     | `_tmp/visual-inspection-2026-09-24/r2-2b/result/gallery-light-1280.png` | `_tmp/visual-inspection-2026-09-24/r2-2b/result/gallery-dark-1280.png` |

## 2. A–H 维度勾选表

- A 交互：A1 pass（actions 按钮 hover 归 button 卡 A1 族，本卡不重复）A2–A4 n/a A5 pass（终态图标+标题+描述齐备，非空白壳）A6–A9 n/a
- B 颜色：B1 pass（title 12.61:1 / description 7.46:1 light；dark 前景令牌按像素基线可读）B2 n/a B3 **pass**（四态语义色全部正确：success 绿 rgb(16,183,127) / info 蓝 rgb(13,162,231) / warning 黄 rgb(245,159,10) / error 红 rgb(239,67,67)；dark 整体提亮一档仍四色分明：rgb(38,217,157)/rgb(62,186,244)/rgb(237,175,69)/rgb(217,38,38)）B4 pass（text-success/text-destructive/text-warning/text-info 语义类）B5 pass B6 pass
- C 布局：C1 pass（docOverX 0；overflow 扫描仅 sr-only span 白名单排除）C2 pass C3 pass（icon→title→description→actions 纵轴居中成体系）C4 pass（800 宽居中不塌）C5/C6 n/a
- D 间隔：D1 pass（gap-2 + mt-2 落栅格）D2–D8 n/a/pass
- E 排布：E1 pass（三问可答：结果状态/后续动作/详情一屏可读）E2 **warn(R2-2b-E2-50)**（actions 双按钮无主次）E3 pass E4 pass（图标/标题/描述水平居中对齐）E5 pass E6 pass（终态有明确任务引导按钮）
- F 一致性：F1–F3 n/a F4 pass F5 n/a
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

### [R2-2b-E2-50] result actions 双按钮同 variant 无主次：后续动线的主操作不可辨识

- **页面/路由**: `#/lab/result`（场景 1 Success result with actions："Back to list" + "View record"）
- **主题/视口/状态**: light（dark 同）/ 1280 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-24/r2-2b/result/default-1280-light.png`（两枚同尺寸同灰的 default 按钮）
- **目视描述**: 两个后续操作按钮渲染完全同级（同 variant、同灰度），无法辨识推荐动作（按惯例 "Back to list" 为主路径应强于 "View record"）。
- **程序化证据**:
  - 探针: `_tmp/r2-2b-probes/w2-result.mjs` structural
  - 输出: `actionsBtns: [{text: "Back to list", w: 94, h: 32}, {text: "View record", w: 98, h: 32}]`——两者 classVariant 均为 default（无 variant-\*/bg-primary 差异）；fixture schema 未声明 variant，renderer 无 actions 主位默认语义。
- **对照基准**: 检查提示词 E2/E3（主操作 variant 强于次操作、确认在主位）；dialog real-schema 场景已有 取消/确定 主次正确形态（R2-2a dialog 卡 E2 pass），同项目内 result 页与 dialog 弹层两种形态并存
- **严重程度**: P3（schema 未声明 variant 时控件层无强默认属设计空白，非渲染错误）
- **用户影响**: 结果页动线引导弱化，用户需读文案判断哪个是主路径。
- **修复方向**: 约定 result actions 首按钮默认 primary variant（renderer 层给 actions 首个子按钮注入主变体，或在 design.md/flux-guide 规定 schema 作者必须显式声明）。
- **归族**: watch-only → 台账（控件默认语义空白，需设计裁定）
- **复核状态**: 未复核

## 4. 已知族命中（引用，不另立项）

- **图标别名回环族（核对通过，无实例）**：任务要求 content 控件配图标时重点核对——自定义图标 `package-check` 经 `resolveLucideIconStrict` 正常解析（`svgLucideClass: "lucide lucide-package-check"`，渲染为 PackageCheck 非 status 默认 CircleCheck 回退），无 home/house 型死链。
- i18n zh-CN 回退族（引用不立项）：sr-only 状态词渲染中文「成功/提示/警告/错误」（`t('flux.result.status*')`），英文页 a11y 通道语言错乱，修宿主 initFluxI18n 后复检。
- 状态画廊（info/warning/error）B3 语义色四态双主题全部程序化核对通过（见勾选表 B3），plan490 语义令牌锚点复检通过，非缺陷。
- 调试 chip / scope-debug 中文：载体环境族，引用不立项。

## 5. 交互键

- 无法注册：actions 按钮未绑定 action（fixture 无 onClick），点击无状态变化；状态画廊为静态渲染无需键。

## owner-doc drift 登记

- owner-doc 登记：无 docs/components/result/design.md（owner-doc-missing，review-a DR-5，2026-09-24）；按本 plan Failure Paths 不新建，新建归后续 plan。

## 6. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-result` → carded（卡列填本路径）；findings 归族后 → digested。
