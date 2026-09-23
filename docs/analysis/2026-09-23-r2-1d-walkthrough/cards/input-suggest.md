# [card] page:input-suggest

- **批次**: R2-1d ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/input-suggest` ｜ **载体**: 域 demo 页（`apps/playground/src/pages/input-suggest-demo.tsx`，input-text 异步建议 ×2：默认列表 + suggestTemplate region）
- **矩阵裁剪**: simplified（弹层中间态为本页核心，已全查：建议下拉打开/键盘导航/选中写回/空态/模板区/dark；800 视口页面级单列无弹层差异故只采集）

## 1. 截图清单

| 状态               | light                                                        | dark                                                       |
| ------------------ | ------------------------------------------------------------ | ---------------------------------------------------------- |
| 默认 1280          | `default-light-1280.png`                                     | `default-dark-1280.png`                                    |
| ~800 宽            | `default-light-800.png`                                      | —                                                          |
| 建议下拉打开       | `suggest-open-light.png` / `suggest-open-dark2.png`          | `suggest-open-dark2.png`                                   |
| 键盘导航高亮       | `suggest-nav-light.png`                                      | —                                                          |
| 选中写回后         | `suggest-selected-light.png`                                 | —                                                          |
| 空态（无匹配）     | `suggest-empty-light.png` / `suggest-empty2-light.png`       | —                                                          |
| suggestTemplate 区 | `suggest-template-light.png` / `suggest-template2-light.png` | `suggest-template2-dark.png` / `suggest-template-dark.png` |

## 2. A–H 维度勾选表

- A 交互：A1 pass（选项 hover 高亮由 data-highlighted 驱动）A2 pass（输入 focus 后边框转蓝 + group ring，探针 `groupBorder: rgb(28,110,242)`）A3 pass（扫描 0 命中）A4 n/a A5 **pass（空态文案存在）** A6 n/a A7 pass（下拉 z=2000、左对齐 input、宽度=input 757px）A8 n/a A9 pass（Enter 选中 → Live values 即时更新 → 下拉关闭）
- B 颜色：B1 pass B2 pass B3 pass B4 pass B5 **warn（dark 下拉亮底=宿主 --popover 已裁定族）** B6 pass
- C 布局：C1 pass C2 pass C3 pass C4 pass C5 pass C6 n/a
- D 间隔：D1–D8 pass（选项行 py-1.5 节奏均匀）
- E 排布：E1 pass E2 pass E3 pass E4 pass E5 pass E6 **pass（"No matching fruits" 空态非空白）**
- F 一致性：F4 warn（「无建议」zh 回退 vs「No matching fruits」en 配置 vs en 页面文案——R2-1d-F4-01 语言割裂族实例）其余 n-a
- G 设计器：n/a
- H 弹层：n/a（建议浮层属 hover-floater，内容自适应，plan-490 阶梯外）

## 3. 发现条目

### [R2-1d-A5-51] suggestTemplate 区域不渲染：匹配项被「无建议」回退替代

- **页面/路由**: `#/input-suggest`（Fruit (suggestTemplate region) 输入框）
- **主题/视口/状态**: light+dark / 1280 / 输入 "gr" 后
- **截图**: `suggest-template2-light.png`（下拉仅一行「无建议」）、`suggest-template2-dark.png`
- **目视描述**: 输入 `gr`（命中 Grape/Guava）后建议下拉不渲染模板项，只显示回退文案「无建议」；同页未配置模板的建议输入在同样输入下正常出列表（Apple/Apricot…）。
- **程序化证据**:
  - 探针: 输入 900ms 后读浮层文本（`_tmp/r2-1d-probes/w5-is6-out.json`）→ `tpl.text = "无建议"`；对照输入 `ap` → 下拉含 `Apple/Apricot/...`（`w5-is2-out.json` popInfo found, 786×208）。
  - 判定: 数据源与 debounce 链路同构（第二项同 url 同 sendOn），失败点在 suggestTemplate 渲染分支。
- **对照基准**: A5（有匹配却渲染无建议=空态误报）；E3 收口口径（suggestTemplate region 为该页演示目标）。
- **严重程度**: P2（demo 核心能力失效）
- **用户影响**: 模板化建议功能不可用/不可评估；真实接入时会静默退化为「无建议」。
- **修复方向**: 排查 input-text suggest 渲染分支对 `suggestTemplate` region 的消费（`$slot.suggestion` 作用域注入），修复后本页两条输入应等价出项。
- **归族**: local → R2-4 批
- **复核状态**: 未复核

**本页正例（记录）**: 全链路键盘可用——ArrowDown 高亮（`data-highlighted` 命中 Apricot）→ Enter 写回（`fruit = apricot` 同帧可见）→ 下拉自动关闭；空态「No matching fruits」（suggestEmpty 配置生效）；clearable 的 × 在有值时可见；Live form values 三行实时更新；下拉与 input 左缘对齐、宽随 input；dark 下拉（选项区）适配（亮底为已裁定族）。

**族实例确认（一句话，不另立项）**: dark 建议浮层暖白亮底 = 宿主 --popover 已裁定族；「无建议」（zh）与页面 en 文案混用 = R2-1d-F4-01 语言割裂族实例。

**存疑项**: clearable 清除点击未能在 3 次探针中稳定复现（首轮探针误将第二输入的值当作清除目标；后续 DOM 扫描未再捕获 `[aria-label=清除]`——按钮疑似仅在特定瞬时状态渲染）。× 图标目视存在，行为待复核 agent 重验。

## 4. 台账回写

- 本卡完成后：ledger.md `input-suggest` 行 status → `carded`；findings 归族后 → `digested`。
