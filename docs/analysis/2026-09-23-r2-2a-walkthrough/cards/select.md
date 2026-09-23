# [card] control:select

- **批次**: R2-2a ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/lab/select` ｜ **载体**: lab 页（7 场景：inline options / skill / optionTemplate / choice family composite / falsy value / remote search fail / controlled echo）
- **矩阵裁剪**: simplified（matrixReason：本波重点控件，下拉开态全查（选项列表/选中高亮/键盘高亮/搜索态/远端失败态/模板项/窄视口）；裁掉的状态：glass 皮肤、disabled/readonly 变体（fixture 未布置）、multiple 模式 combobox（fixture 内为 button-group-select 承载）、移动端 select-mobile 渲染分支）

## 1. 截图清单

| 状态                          | light                                                              | dark（真 data-mode）                                            |
| ----------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------- |
| 默认 1280×800 s1/s3           | `default-s1-light-1280.png` / `default-s3-template-light-1280.png` | `default-s1-dark-1280.png`                                      |
| 下拉开（viewport 全景，5 项） | `dropdown-open-s1-viewport-light-1280.png`                         | `dropdown-open-s1-viewport-dark-1280-fixed.png`（亮底弹层实拍） |
| 下拉开（场景块）              | `dropdown-open-s1-light-1280.png`                                  | `dropdown-open-s1-dark-1280.png`                                |
| 键盘 ArrowDown 高亮态         | `dropdown-kb-arrow-highlight-s1-light-1280.png`                    | —                                                               |
| 选中 Canada 回写              | `picked-canada-s1-light-1280.png` / `afterPickShot`                | —                                                               |
| optionTemplate 富项开态       | `template-open-s3-fixed-light-1280.png`                            | —                                                               |
| falsy 0 选中                  | `falsy-zero-s5-light-1280.png`                                     | —                                                               |
| 远端搜索开态（ap→2 项）       | `remote-open-s6-fixed-light-1280.png`                              | —                                                               |
| 远端失败（fail）              | `remote-fail-s6-light-1280.png`                                    | —                                                               |
| 下拉开 800×900                | `dropdown-open-s1-light-800.png`                                   | —                                                               |
| 默认 800×900                  | `default-s1-light-800.png`                                         | —                                                               |

（截图落点前缀 `_tmp/visual-inspection-2026-09-23/r2-2a/select/`；`*-fixed*` 为修正探针后重拍批次，早期 `remote-search-ap-s6-light-1280.png` 因选择器命中隐藏节点作废）

## 2. A–H 维度勾选表

- A 交互：A1 pass（item hover/`data-highlighted` accent 高亮 bg `rgb(236,243,254)`）A2 pass（Esc 关后焦点返回 combobox-trigger，`focusAfterEsc: BUTTON/combobox-trigger/inScenario true`）A3 pass（item 28px 高、trigger 32px）A4 n/a A5 pass（远端失败有 select-error 槽 + 空态"未找到结果"文案）A6/A8 n/a A7 pass（Esc 可关、焦点回落；点选项后关闭）A9 pass（点选/键盘 Enter 提交均回写触发器文本，falsy 0 回写 native-zero）
- B 颜色：B1 pass B2 pass（选中行浅蓝底+check）B3 pass B4 pass B5 **warn（已知族 --popover dark 亮底引用，附新实例）** dark 下拉弹层整面亮底 `rgb(251,250,249)`、选中行反为深底白字（`dropdown-open-s1-viewport-dark-1280-fixed.png`）B6 pass
- C 布局：C1 **warn（C1-61 引用，本卡实例）** select-wrapper/input-group 4–5px 微溢出（s1/s5，1280 与 800 同值）；sr-only input overX 16 为有意隐藏白名单 C2 pass C3 pass C4 pass（800 宽下开弹层 w=锚点宽、left/right 不溢出视口）C5 pass C6 n/a
- D 间隔：D1 pass（choice family 场景字段间隙全 16px）D5 pass（label→控件 8px）其余 n/a/pass
- E 排布：E1–E5 pass E6 n/a
- F 一致性：F1–F3 n/a/pass F4 **warn（已知族 F4-11 引用）** "搜索失败。""未找到结果"中文 F5 n/a
- G 设计器：n/a
- H 弹层：H1 pass（弹层宽=锚点 918/946px 无失控档位问题）H2 n/a H3 pass（bottom 460 ≤ 792）H4 n/a H5 n/a（无 footer）H6 pass（项高 28 全一致）H7 pass（content padding 一致）H8 pass（combobox-list 内滚动）H9 pass（800 视口不溢出、anchor 宽收缩正常）

## 3. 发现条目

（无新立项。下拉的 dark 亮底与微溢出均归已知族/本波已立项条目，见第 4 节；select 下拉开态本身质量良好——本波重点走查结论。）

## 4. 已知族命中（引用，不另立项）

- **宿主级 `--popover` dark 亮底（已知族）**：新实例证据——`data-mode=dark` 下 `combobox-content` computed `backgroundColor: rgb(251,250,249)`（与 light 完全同值），item 文字 `rgb(103,87,76)`；选中项呈"亮底上深蓝高亮条"反差形态（`dropdown-open-s1-viewport-dark-1280-fixed.png`）。input-text suggest 弹层同值（该卡 B5 节），两处互证。修复后需本卡 B5/H 列复检。
- **C1-61 input-group 尾缀微溢出**（本波 password 卡立项）：select-wrapper/input-group overX 4/5 实例×2 场景。
- **F4-11 i18n zh-CN 回退（已知族）**：远端失败"搜索失败。"、空态"未找到结果"。
- **A3 小目标（已知族）**：choice family 场景内 checkbox 16×16 / switch 32×18 / radio 16×16（他卡控件，本页同屏实例）。
- 计划内锚点复检通过：**falsy value 契约**（选 Zero(value=0) 后 live echo "native-zero"、触发器显示 Zero，0 未被当作空选）；**远端搜索链路**（'ap'→Apple/Apricot 2 项，'fail'→select-error 槽可见）；**optionTemplate**（icon+双行+badge 富项在弹层内正常渲染）；**键盘链路**（ArrowDown 设 data-highlighted、Enter 提交第二项、Esc 关+焦点回落）。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-select` → carded（卡列填本路径）；findings 归族后 → digested。
