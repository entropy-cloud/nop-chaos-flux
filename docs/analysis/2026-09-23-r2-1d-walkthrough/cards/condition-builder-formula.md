# [card] page:condition-builder-formula

- **批次**: R2-1d ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/condition-builder-formula` ｜ **载体**: 域 demo 页（`apps/playground/src/pages/condition-builder-formula-page.tsx` + `condition-builder-formula-schema.json`，两个 builder：Formula 值槽（formulas.enabled + seed + formulaForIf）vs 字面量基线）
- **矩阵裁剪**: full（条件行增删/公式编辑联动无条件全查：加行、公式值槽输入、种子回显、组级 if 输入、双 builder 对照、dark、~800）

## 1. 截图清单

| 状态                     | light                     | dark                              |
| ------------------------ | ------------------------- | --------------------------------- |
| 默认 1280 全页           | `full-light-1280.png`     | `full-dark-1280.png`              |
| Formula 行（seed 回显）  | `formula-row-light.png`   | `rows-dark.png`                   |
| 公式输入后（求值错误态） | `formula-typed-light.png` | `rows-dark.png`（错误行同帧可见） |
| 字面量基线行             | `literal-row-light.png`   | 同左（rows-dark 下半）            |
| ~800 宽                  | `rows-800-light.png`      | —                                 |

## 2. A–H 维度勾选表

- A 交互：A1 pass A2 pass（formula 值槽 focus 可达，tabIndex=0；隐藏 value holder 均 tabindex=-1 不劫持 Tab）A3 pass（扫描仅 1×1 隐藏 holder，属 sr-only 模式）A4 n/a A5 pass A6 n/a A7 n/a（无新弹层面）A8 n/a A9 **warn(A9-51)**
- B 颜色：B1 pass B2 pass B3 pass（求值错误=警示呈现）B4 pass B5 pass（行/芯片/if 输入 dark 适配）B6 pass
- C 布局：C1 pass（~800 仅 1px 隐藏 input 噪声）C2 pass C3 pass C4 pass C5 pass C6 n/a
- D 间隔：D1 pass D2–D8 pass
- E 排布：E1 pass（三问可答）E2 pass E3 pass E4 pass（fx 图标+值槽+回显行对齐）E5 pass E6 pass
- F 一致性：F4 **warn（跨页引用 F4-51/F4-52，本页同构复现，不另立项）** 其余 n-a
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

### [R2-1d-A9-51] 合法表达式触发干瘪的「求值错误」提示

- **页面/路由**: `#/condition-builder-formula`（Formula 值槽 builder）
- **主题/视口/状态**: light+dark / 1280 / 公式输入后
- **截图**: `rows-dark.png`（`${data.age} > 18` 下方 `⚠ 求值错误`）、`formula-typed-light.png`
- **目视描述**: 在公式值槽输入语法合法的表达式 `${data.age} > 18` 后，值槽下方出现仅四个字的红色「求值错误」，无原因、无定位；而种子串 `'defaultExpr'` 的回显行「→ 'defaultExpr'」正常显示。
- **程序化证据**:
  - 探针: 输入表达式后读 formula slot 兄弟节点文本（截图 + `w5-cbf-out.json` rowStructure 确认 slot 结构 `data-slot="condition-formula-value"`）
  - 输出: 错误文案 `求值错误`（截图可视）；根因推断 = demo 页 `data={}` 空作用域使 `data.age` 求值失败——语法层面表达式合法。
- **对照基准**: R2-1a「validation 链幻影错误族」同域近亲（formulas 求值链 vs validation 链）；错误提示应可定位（表达式求值惯例：给出失败子表达式/原因）。
- **严重程度**: P3
- **用户影响**: 用户无法区分「写错语法」与「数据未就绪」，在真实接入数据的页面上该提示只在真正错误时出现，影响可控。
- **修复方向**: 错误行附最小原因（如 `data.age 未定义`）；demo 侧给 data 一个带 age 的默认对象使演示路径无错。
- **归族**: watch-only → 台账（R2-1a 幻影错误族的 formula 链扩展观察）
- **复核状态**: 未复核

**本页正例（记录）**: E3 收口三件套全部工作——① `formulas.enabled` 下条件行右侧切换为 fx 值槽（`data-slot="condition-formula-value"`，200px，placeholder「表达式，如 ${age + 1}」）；② `formula: "'defaultExpr'"` 种子在行下以「→ 'defaultExpr'」回显；③ `formulaForIf.enabled` 在组头右侧渲染 if 表达式输入（`data-slot="condition-group-if-formula"`，placeholder「if 表达式，如 ${age > 18}」）；字面量基线 builder 正确**无** formula slot（无回归）；行控件 Tab 可达且 1px 隐藏 holder 均 tabindex=-1；dark 全要素适配；~800 无横向溢出。

**跨页引用**: 操作符触发器裸值 `equal` → R2-1d-F4-51（condition-builder 卡）；介绍文案裸 markdown `###`/反引号 → R2-1d-F4-52（condition-builder 卡）。

## 4. 台账回写

- 本卡完成后：ledger.md `condition-builder-formula` 行 status → `carded`；findings 归族后 → `digested`。
