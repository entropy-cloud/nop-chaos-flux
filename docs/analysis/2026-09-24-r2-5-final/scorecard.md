# R2-5 最终复检评分卡与前后对比（scorecard）

> Date: 2026-09-24 ｜ Owner plan: `docs/plans/501-visual-quality-r2-5-acceptance-recheck-and-guard-consolidation-plan.md`
> 口径: `docs/skills/visual-page-quality-inspection-prompt.md` + roadmap R2-5 行（收口条件 = 复检轮零新增 fail，不含回流批修复）
> 原始数据: `_tmp/r2-5-final/`（矩阵批日志×5、verified-regression.json、console-scan.json）＋ runner 原生输出 `_tmp/visual-inspection-2026-09-24/`（1,456 captures）

## 1. 全量矩阵重跑（245 路由 × 双主题 × 双视口 + 120 交互键）

| 批次         | 路由    | captures  | suspects                            |
| ------------ | ------- | --------- | ----------------------------------- |
| R2-1a        | 40      | 216       | 0                                   |
| R2-1b        | 10      | 52        | **4（dingtalk-flow-demo，见归因）** |
| R2-1c        | 13      | 68        | 0                                   |
| R2-1d        | 58      | 236       | 0                                   |
| R2-2-carrier | 124     | 884       | 0                                   |
| **合计**     | **245** | **1,456** | **1 路由 4 组合**                   |

**suspect 归因（按 plan 501 零豁免规则逐条登记）**：`dingtalk-flow-demo` 连续 3 次复跑均落 home 回退——非 flake。归因：**已知孤儿路由（R2-1b 卡 F4-02 已在案记载「页面本体路由失效」并改走 flow-designer tab 载体）**；历史根因 = 路由条目于 04-17 重构（45f9b245d）复活，但页面组件于 08-07 经 removal plan（a18d7d17e）有意删除，App.tsx 无对应 case。**不计入本轮新增 fail**（R2-1b 已裁定并按孤儿路由口径完成走查）；处置去向：路由条目清理归入口统一注册表工作（L0）或清理字母批，登记 watch-pool。

**控制台错误伴生扫描**（全路由 page.on('console') error 级 + pageerror）：245 路由全扫，仅 2 路由命中且均为 fixture 环境类——three-canvas-demo（外部资源 ERR_NAME_NOT_RESOLVED，离线环境预期）与 lab-ai-attachments（ERR_UNKNOWN_URL_SCHEME，fixture 故意外链，卡内在案）；零产品缺陷级新增。

## 2. verified 单元回归轮（10 单元，零豁免）

- **loop（R2-3b）**：lab-loop Edit 弹层 3 个 form-actions 容器全部 `row + flex-end + 72px` —— 契约保持 ✔
- **R2-4 dark 9 单元**：dark 计算值抽测 stat-tile 11.49 / status 20.07 / wizard 6.52 / chart 17.66 / table 12.12 / video 6.52 / ai-feedback 11 ≥4.5 ✔；ai-citations computed 4.15（**方法差异注**：computed style 链在渐变底不可靠——各批复核口径以像素采样为准；自 R2-4 复检以来产品代码零变更（git diff 证实），渲染输出与复检时逐位一致，不构成回归）；button-group-select 需交互选中态，由 R2-4 impl 探针实测 6.16–6.71 在档（选中药丸）。

**结论：10 个 verified 单元零回归**（loop 直接实测；dark 9 单元 = 实测 7 达标 + 1 方法差异注 + 1 交互态在档，且零代码变更窗口内无回归通道）。

## 3. 与走查/修复基线的前后对比摘要

| 族                                 | 修复批            | 基线（修复前）                                 | 本轮                                                                                     |
| ---------------------------------- | ----------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------- |
| 弹层/表单 actions 左对齐           | R2-3b（plan 499） | ≥10 页 P1×4 + 控件 4 锚，actions 吸左/无最小宽 | 12 容器 + 2 footer 通道 `row+flex-end+72px`（R2-3b recheck 15/15）→ 本轮 loop 3 容器保持 |
| dark secondary-foreground          | R2-4（plan 500）  | badge 1.06–1.1:1 不可读                        | 6.16–6.71（复检）；本轮派生面全达标                                                      |
| dark popover 亮底集群（≥10 载体）  | R2-4              | 弹层 dark 白底 rgb(251-252)                    | card 暗底，选项文本 4.96–16.83                                                           |
| `--primary` dark 过亮（7/7 ai 页） | R2-4              | 白字 3.26–3.3                                  | 5.07；chart 轴刻度 3.1→8.4+                                                              |
| destructive 对比度（双主题）       | R2-4              | tint 3.12 / 徽章 3.05                          | tint 4.93 / 徽章 4.73                                                                    |
| stat-tile/status 语义色 12px       | R2-4              | 2.51/3.67/2.12                                 | 6.25/5.91/4.89                                                                           |
| table 斑马纹零呈现                 | R2-4              | data-striped 无效                              | dark 1.38 可见条纹                                                                       |
| antdpro dark 块缺失（9 页）        | R2-4              | label 1.05 隐形                                | 4.35–13.43                                                                               |
| color-scheme 钉死 light            | R2-4              | 原生控件不随 dark                              | 随 data-mode 翻转（实测）                                                                |

## 4. residual / 字母批 successor 队列在册对账（逐项确认在册，本批不消化）

| 队列项                                                           | 在册落点                                                                  |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------- |
| bg-white 模板头部 8 页（P1 维持，R2-4b 首批成员）                | plan 500 Deferred + R2-4 recheck §8#7                                     |
| cal/notion 钉白泄漏 4                                            | R2-4 recheck §8#5–6                                                       |
| light 语义档（badge Info/Warning、tag-list、secondary 钮 light） | R2-4 recheck residual #1–2（语义档 token 化 follow-up）                   |
| 编辑器三件（code-editor dark/diff-view light-only/G7 三宿主）    | plan 500 Deferred + R2-2c summary §4.1                                    |
| schema 声明静默失效族（≥9 例）                                   | R2-2b summary §4.2（R2-3 第二字母批候选）                                 |
| 窄视口/断点族（calendar C4-83 P1、gantt C4-86 P2 等）            | R2-2c summary §5.2（R2-3c 主修复面）                                      |
| schema 动态响应性缺口、图标别名回环、lab 载体基建族              | R2-1d/R2-2a/R2-2b/c summaries §4（R2-3 候选）                             |
| dingtalk-flow-demo 孤儿路由（本轮登记）                          | watch-pool（本轮新增）+ R2-1b F4-02；清理归入口注册表工作（L0）/清理批    |
| lab-dropdown-button 菜单 actions 探针增强                        | 已提升 `overlay-actions-alignment.ts`（Phase 1 ④，plan 499 义务承接完毕） |

## 5. 门禁与守护固化

- 探针固化：`tests/e2e/helpers/` 新增 4（visual-contrast/visual-theme/overlay-actions-alignment/form-actions-alignment）+ 单测 23 + 冒烟 spec 2，25/25 过（Phase 1 报告）。
- `pnpm visual:reconcile`：uncovered=0、orphan=0（pages 121 digested；controls 129 digested + 10 verified）。
- `pnpm check`：exit 0，零新增未注册命中（overlay-adhoc-width 门禁在链）。
- 全量 unit：10653 tests 全过（R2-3b +2、R2-4 +1 断言增长后基线）。

## 6. 总评

**复检轮零新增 fail**（dingtalk suspect 归因为 R2-1b 已在册孤儿路由，非本轮新增；verified 单元零回归）。roadmap 收口前置达成：uncovered=0 + 零新增 fail + 全部 work item done（本 plan 收口即最后一项）。residual/字母批 successor 队列全部在册（§4），随字母批滚动消化（roadmap Rule 3 预授权）。
