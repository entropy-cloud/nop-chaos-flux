# C2 — 能力差距汇总与分级裁决（滚动文档）

> Last Updated: 2026-08-19（**初版裁决**；后续各 Pi-b closure 以追加方式回写本文件，不重开状态）
> Mission: `missions/ui-review.json` · Roadmap: `docs/backlog/ui-review-roadmap.md`（C2 产出文档）
> 输入：C1 压力预判、R1 差距清单、plan 460 B8 runtime 语义发现、sundial 分析 G1-G5 既有登记

## 0. 裁决级别定义

| 级别                  | 含义                                                                     | 实施载体                           |
| --------------------- | ------------------------------------------------------------------------ | ---------------------------------- |
| **L1 CSS 可解**       | playground/schema 层样式即可，无 renderer/runtime 改动                   | 复刻页 CSS + schema 组合           |
| **L2 渲染器语义增强** | 既有 renderer 加语义字段/区域（plan-first：renderer 定义字段属保护区域） | 独立 plan（D1 产品化）             |
| **L3 新原语**         | 新 renderer type / ui 组件入 `ui/src/index.ts`（ask-first）              | 独立 plan（D1 产品化）             |
| **L4 runtime 能力**   | 编译器/scope/action/表面运行时语义                                       | 独立 plan + flux-core 保护区域流程 |

## 1. 初版裁决表（2026-08-19）

| ID        | 缺口                                                             | 级别                               | 证据来源                                                                                                            | 裁决理由 / 影响面                                                                 | 状态                           |
| --------- | ---------------------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------ |
| G-A       | 页面模板层（PageHeader/查询区/result 预设）                      | **L2**                             | R1§2.2/§3、C1-10                                                                                                    | 语义件而非运行时能力；AMIS CRUD wrapper 同级对标                                  | 待 P2 回写                     |
| G-B1      | ⌘K 命令面板原语                                                  | **L3**                             | C1-2、R1§2.4                                                                                                        | ui `command` 模块已有底座、无 renderer type                                       | 待 P4 回写                     |
| G-B2      | 键盘导航框架（chord/peek/多选/键盘重排）                         | **L4**                             | C1-2/5、R1§3 交互深度 2 分                                                                                          | 焦点管理与全局快捷键是运行时横切能力                                              | 待 P4 回写                     |
| G-B3      | 批量操作栏语义（选择集绑定 + 批量动作）                          | **L2~L3**                          | C1-3/7                                                                                                              | crud 已有选择集；"批量栏"缺语义件与选择集 scope 契约                              | 待 P6/P7 回写                  |
| G-C       | 多视图数据库（视图切换状态机 + filter 面板联动 + 行内新建）      | **L2**（状态机 L4 风险）           | C1-4                                                                                                                | tab+visible 可模拟但重渲染与视图配置持久化需语义化                                | 待 P5 回写                     |
| G-D       | 网格编辑深度（单元格编辑器矩阵/列菜单/分组/行高）                | **L2**                             | C1-3/4、R1§2.4                                                                                                      | input-table 底座有；矩阵完整度与列菜单语义缺失                                    | 待 P6 回写                     |
| G-E       | 高密度排版（密度档位/等宽计数/语义色状态/chip 筛选条）           | **L1 为主 + 密度档 L2**            | C1-3/8                                                                                                              | sundial 复刻已证 CSS 令牌可解；密度档位值得一个语义字段                           | 待 P7 回写                     |
| G-F (=G5) | hover/选中态 schema 表达（`option-row` 通用原语候选）            | **L3**                             | sundial G5 预登记（分析文档建议 option-row）、plan460 双渲染实践（settings rail 5 行×2 份实测成本）、C1 §2 五页命中 | 双渲染模拟的维护成本已实测                                                        | **已裁决，D1 候选首项**        |
| G-F2      | className 表达式绑定（`${flag ? 'a' : 'b'}`）                    | **L3**（编译器求值边界 → L4 风险） | roadmap 预登记、G5 同根                                                                                             | 与 option-row 互补（样式态 vs 行为态）                                            | D1 候选                        |
| G-H       | 移动端主组件族（vs Vant 80+）                                    | **L2**（量大）                     | R1§2.5 既有分析                                                                                                     | 非本 roadmap P 系列范围；保留裁决防丢                                             | 挂起（P 系列外）               |
| G-I       | 暗色回归 + 运行时主题切换                                        | **L1 + 小 L4**（切换器暴露）       | R1§3 主题化 4 分注                                                                                                  | tokens 已有 4 调色板，缺回归与切换入口                                            | R2 顺带 + D1 记录              |
| G-J       | resizable 面板 schema 化                                         | **L3**                             | C1-1、AGENTS.md 组件清单（ResizablePanelGroup 已宣传，缺 renderer type 暴露）                                       | 底座在 ui 包，缺 schema 原语                                                      | 构想库存（C1 §3）              |
| G-K       | 流程图节点数据驱动着色                                           | **L2**                             | C1-7                                                                                                                | graph renderer 语义字段                                                           | 构想库存（C1 §3）              |
| G3-余     | input-date 行触发形态                                            | **L2**（优化项）                   | sundial 分析 G3                                                                                                     | 非阻塞优化                                                                        | 挂起（优化）                   |
| G-L       | dialog 影子写限制（dialog 内改页面 scope 无原语，plan460 B8 #2） | **L4 观察项**                      | plan460 B8 语义发现                                                                                                 | 现可用 closeDialog{surfaceId} / 页面级 hook 回写绕过；若 P 系列复刻高频撞墙则升格 | 观察中                         |
| G-M       | hook 时刻裸 scope 变量求值不可靠（B8 #3）                        | **L4 观察项**                      | plan460 B8 语义发现 #3                                                                                              | 正确姿势已文档化（data→form→$formData）；根因未深挖                               | 观察中（建议 deep-audit 候选） |

## 2. D1 产品化输入预清单（按裁决级别 + 价值排序）

1. **G-F option-row 通用原语**（L3，证据最厚：sundial G5 预登记 + B8 实测 + C1 五页命中）
2. **G-B1 command-palette renderer**（L3，P4 前置依赖）
3. **G-A 页面模板预设族**（L2，P2 前置依赖：PageHeader/QueryFilter/result）
4. **G-B2 键盘导航框架**（L4，P4 依赖，需 flux-core 保护区域流程）
5. G-F2 className 表达式绑定（L3，与 1 同 plan 可行）
6. G-B3/G-C/G-D 语义件族（L2，P5/P6 回写后定形）

## 3. 回写区（各 Pi-b closure 追加，勿动上方初版）

### 回写 ① — R2 一致性审查（2026-08-29，plan `2026-08-28-1701-1-r2-consistency-audit.md` Phase 5）

> 首个回写。授权链: G-I 行"**R2 顺带**"（承接 R0 §3 "4 调色板 dark 逐变量对齐度留 R2 抽查"遗留）→ R2 plan Phase 5 义务产出。C2 状态不重开，本段仅追加证据与素材。

**G-I 证据回写（dark token 对齐度抽查，HEAD `0f183874a`）**:

- token 结构对称性: `packages/theme-tokens/src/styles.css` 四块（classic/glass × light/dark）逐变量完全对称——每块 56 变量，四个方向（classic L↔D、glass L↔D、classic↔glass 同 mode）均零缺失零多出（探针 `_tmp/dark-token-symmetry-inspect.mjs`）。
- 值级抽查: 10 个关键语义变量（background/foreground/primary/danger/warning/success/info/border/muted/accent）在 dark 块均为调谐真暗色，无 light 照抄；`*-bg` 族 dark 为 `* 30% 20%` 暗底，gray 阶整体反转。模式无关常量（`--primary-foreground` 等白前景）为合理设计非照抄；glass 对的 `--secondary`（dark 下浅薰衣草作高亮前景）建议知会但可接受。
- 复杂页暗色抽查（4 页抽样）: 2/4 合格——standard-crud 全 token 零硬编码、dashboard 6 处中间调强调色可接受；sundial-workbench / sundial-settings 为自述 light-only 的复刻页（`--sd-*` 硬编码 + schema 118/151 处裸色值），dark 不适配（属复刻页迭代范畴，非 token 层回归）。
- **对 G-I 裁决的影响**: "暗色回归"的 token 层风险低于初判（结构已对齐），G-I 真实缺口收窄为 ①运行时主题切换入口缺失（L4 小项，playground `main.tsx:13-15` 硬编码 light）；②复刻页 light-only（L1）；③渲染器亮色假设散点（scheduling 固定白前景/kanban `bg-white`/`color-mix(...,white)` 等——已入 R2 发现清单 P2 路由修复，无需新增 C2 项）。

**共性素材回写（供 D1 产品化排序参考）**:

- R2 共性族"状态已发射、样式零消费"（button-group 选中态、TableRow 选中、calendar 拖拽悬停、notice-bar 变体等，276 条发现中的高频族）与 **G-F（option-row 原语）** 同源——schema 层无选中/hover 态表达通道、渲染器层有状态无样式，双向佐证 G-F 作 D1 首项的优先级。
- R2 共性族"键盘等价路径缺失"（icon-picker 200+ Tab 停留点、dashboard 画布面板无方向键移动/缩放、page 侧栏拖拽把手不可聚焦）为 **G-B2（键盘导航框架，L4）** 追加实证面。
