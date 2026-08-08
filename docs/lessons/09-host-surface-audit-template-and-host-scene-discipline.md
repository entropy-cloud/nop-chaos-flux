# Host 大面审计模板方法：18 维降维 + H1–H7 designer 特有维度 + 每面 ≥1 真实浏览器宿主场景

## Problem Context

第一轮逐组件审计（113 卡）以「注册 renderer type」为审计单元；第二轮 host 大面审计（4 个设计器大面：flow-designer / spreadsheet / report-designer / word-editor，8 包，37 张卡）的审计单元是「面（surface feature）」，而 host 面组件不是注册渲染器、没有 per-component 卡先例。直接套 18 维组件清单会发现大量维度「对不上号」（如「表单参与」「schema 类型」对画布/工具栏语义失真）。第二轮 D0 为此定义了 host 面审计模板（checklist v2 §6），D3.1–D3.4 四轮执行后回写模板有效性。

## Initial Judgment

"host 大面就是一堆大组件，按 18 维清单逐个打勾就行。"

## Why It Looked Plausible

- host 面也是 React 组件，18 维里的 DOM 契约、事件 ctx、i18n、性能边界等维度看起来通用；
- 第一轮 18 维清单已经沉淀了成熟的检查要点，直接复用成本最低。

## Why It Was Wrong

- **审计单元错位**：host 面是「面」不是「注册 type」——schema 契约（维度 1）在 host 面变成面级 `define*PageSchema`/manifest 注册核对，表单参与（维度 4）大部分面 n/a，注册/导出面（维度 18）要换成 core/renderers 包边界与 INV-1 env IO 核对。硬套 18 维产生大量「n/a 凑行」，关键的面专属风险（host 契约双向核对、事务 undo 语义、拖拽 pointercancel、剪贴板降级、e2e 可操作性、MA4.3 测试覆盖缺口）反而没有对应维度。
- **宿主场景纪律需要独立强化**：组件轮「每卡 ≥1 真实浏览器场景」升级为「每面 ≥1」，且 host 面更依赖真实宿主页（第一轮组件在 component-lab 的 dialog/form 内组合即可，host 面需要独立 playground 宿主页 + route + spec——spreadsheet 面从 0 独立 spec 到 10 用例、report-designer 新增独立宿主页 `#/report-designer-host`）。
- **面级风险在 18 维之外**：`deriveHostSnapshot` 同步、StrictMode 下 core dispose（bug 112）、undo 不回传画布（bug 111）这类「面级投影/生命周期」缺陷不在任何组件级维度里。

## Decisive Evidence

- **D0 模板**：checklist v2 §6（18 维降维表 + H1–H7 designer 特有维度 + host 面卡模板 + §6.4 保护区域地图），37 张卡全部按此模板产出（`docs/audits/host-surface/*.md`，全 closed）。
- **每面 ≥1 真实浏览器宿主场景纪律**：D3.1 新增 2 spec 5 用例、D3.2 新增独立宿主页 + spec 10 用例、D3.3 新增独立宿主页 + spec 5 用例、D3.4 新增 recovery spec 6 用例——覆盖矩阵见 `docs/audits/host-surface/surface-inventory.md` 各节，DV 全量 host-surfaces 133/0。
- **H 维度命中实绩**：H2（事务 undo）→ rd-1/rd-6 P1 bug 111（undo 不回传画布）；H3（拖拽）→ 各面拖拽完整性核对；H4（键盘）→ ss-8 P2 Escape 关面板；H5（剪贴板）→ fd-11 pasteClipboard 命令缺口（bug 91）；H7（MA4.3 缺口回归）→ fd-7/ss-2/rd-1/we-6 补测与登记。
- **bug 73 模式在 host 面的延续**：ss-6 冻结窗格真实浏览器滚动不固定（单测无法覆盖 position:sticky 与滚动容器交互）、rd-1 StrictMode core dispose、we-4 数据集面板真机交互——均以 e2e 确认点收口。

## Correct Decision Rule

host 大面审计用「18 维降维 + H1–H7」模板（checklist v2 §6），不直接套组件级 18 维；每面必须带 ≥1 真实浏览器宿主场景（独立宿主页优先，programmatic DOM 断言禁截图）；审计卡记录面级投影/生命周期风险（host snapshot 同步、StrictMode、undo 传播）——这类风险是 host 面最高产缺陷类别。

## Preventive Checklist

- 新建 host 大面审计前先读 checklist v2 §6（维度降维 + H1–H7 + 模板），不重复发明；
- 每面核对清单至少含：host 契约双向核对（H1）、事务 undo 语义（H2）、拖拽 pointercancel（H3）、键盘完整性（H4）、剪贴板（H5）、e2e 可操作性（H6）、MA4.3 缺口回归（H7）；
- 每面 ≥1 真实浏览器宿主场景；无独立宿主页的大面（如 spreadsheet 曾 0 独立 spec）必须先补宿主页再审计，禁止「单测绿 = 面可用」；
- 审计卡落 `docs/audits/host-surface/<surface>.md`，汇总索引同步 `docs/audits/round2-index.md`。

## Related Files / Docs

- `docs/audits/component-audit-checklist.md`（v2 §6 host 大面模板，D0 新增；DG 2026-08-09 修订回写）
- `docs/audits/host-surface/`（37 卡 + README + surface-inventory 覆盖矩阵）
- `docs/audits/round2-index.md`（汇总索引，DG 建成）
- `docs/bugs/107`（ss-6 冻结渲染）、`111`（undo 不回传画布）、`112`（StrictMode core dispose）
