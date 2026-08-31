# P1 — 参考应用复刻工程规范（总篇）

> Mission: `missions/ui-review.json` · Roadmap: `docs/backlog/ui-review-roadmap.md`（P1 产出文档）
> Last Updated: 2026-08-29（P1 plan `2026-08-29-0419-2` Workstream 1 产出）
> 方法论底稿：`docs/analysis/sundial-ui-reproduction-analysis.md`；接线先例：`docs/plans/457-sundial-replica-interactions-plan.md`、`docs/plans/460-sundial-replica-full-interactions-reimplementation-plan.md`
> 消费方：P2a–P7b 共 12 个复刻子项（6 应用 × a/b 两段）。各 Pi-a 只需按本篇模板执行，不重复发明约定。

## 0. 应用名单与命名分配表

参考应用名单由 roadmap 固定为 6 个，slug 与前缀如下（**所有文件名、CSS 类名、CSS 变量、mock 端点、testid 一律使用本表**，不得自造别名）：

| Pi  | 参考应用         | slug（文件名前缀） | CSS 类/变量前缀 | mock 端点前缀 | 页面 id 示例        |
| --- | ---------------- | ------------------ | --------------- | ------------- | ------------------- |
| P2  | Ant Design Pro   | `antdpro`          | `adp`           | `AntdPro__`   | `antdpro-dashboard` |
| P3  | Cal.com 预约     | `cal`              | `cal`           | `Cal__`       | `cal-booking`       |
| P4  | Linear tracker   | `linear`           | `ln`            | `Linear__`    | `linear-issues`     |
| P5  | Notion database  | `notion`           | `nt`            | `Notion__`    | `notion-database`   |
| P6  | Airtable grid    | `airtable`         | `at`            | `Airtable__`  | `airtable-grid`     |
| P7  | Stripe dashboard | `stripe`           | `st`            | `Stripe__`    | `stripe-payments`   |

法律/品牌边界（roadmap Cross-Cutting 3，全部 Pi 一体适用）：只仿制**布局结构、交互模式、令牌结构**；不复制 logo、品牌资产、原文案、图标原图。文案一律替换为语义等价的自拟中文文案；图标一律用 lucide 近似形；闭源应用以"风格等价物"复刻并在分析篇 §6 记录差异声明。

## 1. 目录与命名规范

全部复刻产物落 `apps/playground/`（沿 Sundial 先例逐项对应）：

| 产物           | 路径                                                                          | 先例                                                            |
| -------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------- |
| 页面 schema    | `apps/playground/src/complex-pages/page-schemas/<slug>-<page>.json`           | `page-schemas/sundial-workbench.json`（19 schema 同目录）       |
| 复刻 CSS       | `apps/playground/src/<slug>-replica/<slug>-replica.css`                       | `apps/playground/src/sundial-replica/sundial-replica.css`       |
| mock 数据/助手 | `apps/playground/src/complex-pages/shared/mock-backend-<slug>.ts`             | `shared/mock-backend-sundial.ts`（从 mock-backend.ts 拆出先例） |
| env 接线       | `shared/showcase-env.ts` 的 fetcher 内追加 `<App>__` 端点分支                 | `Sundial__summary` 等 12 个端点分支                             |
| 注册           | `complex-pages-model.ts` 的 `COMPLEX_PAGE_ENTRIES`，category 用 `app-replica` | sundial 5 页条目（id/title/category/description/features）      |
| mock 后端单测  | `apps/playground/src/complex-pages/__tests__/<slug>-mock-backend.test.ts`     | `__tests__/sundial-mock-backend.test.ts`                        |

硬性规则：

1. **schema 文件名** = `<slug>-<page>.json`，页面 id 与文件名（去 `.json`）一致；一个复刻页面一个 JSON，禁止多页共用一个 schema 文件。
2. **CSS 变量与类前缀**：`<slug>-replica.css` 内令牌全部声明在 `.<abbr>-root, .<abbr>-dialog` 两个作用域（dialog 走 portal 渲染在 root 子树外，变量必须在 dialog 子树可解析——sundial-replica.css 19–46 行令牌块先例）；变量名 `--<abbr>-*`，类名 `.<abbr>-*`。
3. **testid**：schema 中所有 e2e 需要断言的节点必须带 `data-testid="<slug>-<语义名>"`（如 `sundial-task-today-1`）；e2e 只认 testid，不认样式类。
4. **className 双轨**：schema 的 `className` 可直接写 Tailwind 工具类（JSON 已在 Tailwind content 扫描范围）；`<slug>-*` 专有视觉类只放复刻 CSS。两者不得互相替代——布局/间距用 Tailwind 工具类，品牌专有视觉（令牌化颜色、专有形态）用复刻类。
5. **mock 端点**：URL 形如 `/r/<App>__<op>`，fetcher 分支按 `url.includes('/r/<App>__<op>') && method === 'get'|'post'` 匹配（showcase-env.ts 481–620 行先例）；数据集规模必须让分页表格默认页大小 10 时至少 3 页。
6. **页面注册描述**：`description` 写清复刻了哪些区块与数据来源（端点名）、`features` 列 4 个左右关键机制标签（先例格式）。

## 2. mock 后端与 e2e 模板约定

### 2.1 mock 后端扩展方式（沿 plans 457/460 接线模式）

1. 新实体/数据集放 `shared/mock-backend-<slug>.ts`（类型 + `create<Slug><Entity>()` 工厂 + 过滤/排序助手）；`mock-backend.ts` 只在 ≤10 行的胶水（re-export、共享类型）时允许触碰，防止回涨超 500 行治理线。
2. `showcase-env.ts` 的 `createShowcaseEnv()` fetcher 内追加 `<App>__` 分支：读操作 `get` 返回记录/列表，写操作 `post` 修改 in-memory db（同一 session 内跨页可观察——sundial settings 保存先例）。
3. 写操作语义对齐 nop `findPage/get/save/delete` 惯例；列表端点支持 keyword/状态/分页/排序参数（`filterUsers`/`sortRows` 先例模式可直接复用）。
4. mock 数据集必须为"结构真实"：字段型别覆盖该应用分析篇 §4 交互清单需要的全部状态（选中/禁用/逾期/失败等），否则 e2e 无法锁定交互契约。

### 2.2 e2e spec 命名与骨架

- Pi-a（静态复刻）建 `tests/e2e/<slug>-replica-visual.spec.ts`；Pi-b（交互接线）**在同一 spec 追加用例**（sundial 先例：457/460 交互直接落 `sundial-replica-visual.spec.ts`），文件超 ~500 行再拆 `<slug>-replica-interactions.spec.ts`。
- 骨架（沿 `sundial-replica-visual.spec.ts`，逐段照抄改 slug）：

```ts
import { expect, test } from './fixtures.js';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const ARTIFACTS_DIR = 'tests/e2e/artifacts/<slug>-replica';

async function openPage(page, pageId, label) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`#/complex-pages/${pageId}`, { waitUntil: 'commit' });
  await expect(page.getByTestId('complex-page-title')).toContainText(label, { timeout: 15_000 });
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
  await page.waitForTimeout(800);
}
```

- 断言纪律：**pass/fail 判定必须是程序化断言**（`getByTestId().toBeVisible()` / `toHaveAttribute('data-selected','true')` / `getComputedStyle` / `page.evaluate()`）；`snap()` 截图仅作视觉证据附件，不构成测试证明。
- 用例编号 `<序号> <页面> — <区块/交互>`；每个复刻页至少 1 条初屏结构用例；Pi-b 的每条核心交互（分析篇 §4 清单逐条）至少 1 条先红后绿用例。

### 2.3 验证命令

```bash
pnpm --filter @nop-chaos/flux-playground test -- <slug>-mock-backend   # mock 单测
npx playwright test tests/e2e/<slug>-replica-visual.spec.ts --reporter=list
```

## 3. 分析篇文档模板（每个应用一篇，文件名 `<slug 简名>.md`）

> 已定稿的 6 篇：`ant-design-pro.md` / `cal-booking.md` / `linear.md` / `notion-database.md` / `airtable-grid.md` / `stripe-dashboard.md`。新篇一律复制本节骨架后填写。

```md
# <应用名> 复刻分析（P<n> 输入）

> 分析对象：<应用/页面范围>（开源状态：开源可读源码 | 闭源风格等价物）
> 调研日期：YYYY-MM-DD（来源见 §8；链接失效时记录替代来源）
> 上游：R1 §<x> 评分、C1-<n> 构想、C2 <缺口行>；下游：P<n>a / P<n>b

## 1. 应用概述

<产品定位、核心流程（→ 驱动的页面清单）>

## 2. 设计令牌结构

### 2.1 色彩（浅/深、语义色、品牌色；表格：令牌 | 值 | 用途）

### 2.2 排版（字号/字重/等宽用法）

### 2.3 间距/圆角/控件尺寸/密度

### 2.4 交互习惯（hover/按压/焦点/过渡）

### 2.5 图标（风格、网格、线性宽；只记录规格，不复制原图）

## 3. 页面清单与复杂度排序（sundial §3 口径：页面复杂度 × 与低代码能力的差距）

| 页面 | 复杂度 ★ | 说明（区块构成） |

## 4. 核心交互清单

<逐条编号 I1、I2…；键盘交互逐键位列出（快捷键 | 行为 | 备注），供 P<n>b 逐条做能力映射与 e2e>

## 5. 能力映射初稿

| 参考元素 | flux 原语（schema 落点） | 保真度预估 | C2 对照 |
（保真度取值：高 / 中高 / 中 / 低 / 需新原语；C2 对照填 G-\* 行 id，无对应行写 "无"；补充说明作行内括注，不单列备注列）

## 6. 可复刻边界（闭源应用附差异声明）

### 6.1 可复刻（结构/交互/令牌层逐项）

### 6.2 差异声明

- 令牌偏离：<原版值 → 复刻策略>
- 布局偏离：<…>
- 交互偏离：<…>
- 文案与图标：全部替换为自拟中文文案 + lucide 近似图标，不使用任何品牌资产

## 7. 转 C2 候选

<调研中新撞见、C2 未登记的能力缺口；只登记不做裁决，供 P<n>b 回写时一并处理；无则写 "无">

## 8. 调研来源

- 🌐/📊/⚡ <URL / 文档 / 源码路径>（YYYY-MM-DD；失效替代来源注明）
```

## 4. 验收维度清单（每个 Pi-a / Pi-b 收口前自查）

### 4.1 测试档位（roadmap Cross-Cutting 6）

| 段   | 档位                     | 最低证明                                                                           |
| ---- | ------------------------ | ---------------------------------------------------------------------------------- |
| Pi-a | `建议有测`               | mock 后端单测全绿 + e2e 初屏结构用例全绿；纯分析文档项 Not applicable 并注明理由   |
| Pi-b | `必须自动化`（先红后绿） | 分析篇 §4 交互清单逐条有 e2e 断言；交互契约（选中态/键盘/批量/编辑器矩阵）无一豁免 |

### 4.2 AI 模板感治理（roadmap Cross-Cutting 7，R2 skill 两维）

- **产品完成度**：复刻页不得出现"demo 占位"按钮；hover/选中/空态/加载/错误态按分析篇 §4 清单成对实现；数据经 mock 端点流动（非写死在 schema 的展示数组，纯展示 rail 类除外）。
- **视觉原创性**：复刻页不得呈现"默认组件堆叠"模板感——验收时对照分析篇 §2 令牌表抽查：密度（行高/间距档）、圆角、语义色、等宽字用法是否与原版结构一致；抽查不过即打回。

### 4.3 样式契约（roadmap Cross-Cutting 4）

- 复刻新 CSS 一律落 `apps/playground/src/<slug>-replica/<slug>-replica.css`：playground 层 scope 专用类 + CSS 变量，不改 renderer 内部。
- 确需 renderer 能力时走语义字段 + marker 输出（`collapse` tone/count/leading 先例），由独立 plan（D1 流程）承载；**禁止**依赖 renderer 内部 DOM 结构的 CSS 覆盖回流进 renderer 包。
- 主题独立性：复刻页若声明 light-only（如 sundial 先例），必须在 CSS 头注与分析篇 §6 差异声明中明示。

## 5. 两段式边界（Pi-a / Pi-b 分工）

- **Pi-a = 分析 + 静态复刻**：消费本规范与分析篇，产出 schema + CSS + mock 读端点 + 初屏 e2e；交互只做到"可见可点"的静态形态。
- **Pi-b = 交互接线 + 测试**：补全写端点与交互状态机，分析篇 §4 清单逐条 e2e 锁定（先红后绿）；closure 时按 roadmap Cross-Cutting 5 以追加方式回写 C2，并把"预测缺口 vs 实测缺口"对照记入该应用分析篇。
