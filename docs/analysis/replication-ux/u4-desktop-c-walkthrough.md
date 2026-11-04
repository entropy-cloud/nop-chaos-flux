# U4 桌面域 C 五页走查报告（M1/M2/S2/O1/O2）

> Created: 2026-11-04。方法：三步法（自由 critique → A-H grounding → 程序化取证）+ baseline §2.3 desktop 口径；环境：dev server（http://127.0.0.1:5183）+ playwright chromium，五页视口均 1440×900（各 spec 同款），浅/深双主题（`data-mode='dark'`）+ 交互中间态取证（M1 手动刷新轮询相位二、O1 wizard 步 1→步 2 低置信高亮、S2 审核弹层渐变主钮）。探针：`_tmp/u4-walkthrough.mjs` + `_tmp/u4-walkthrough-out.txt`（结构几何/溢出/截断/深色 canvas 采样）、`_tmp/u4-verify.mjs`（S2 品牌令牌 + O2 溢出反向验证）、`_tmp/u4-o2col.mjs`（O2 列宽实测）、`_tmp/u4-s2scroll.mjs`（S2 折下四段截图）。截图：`_tmp/ux-fidelity/u4/`（评审证据，不入库）。约束：packages/ 零改动。

## M1 `mes-shopfloor-board`（1440×900）

Findings：

- **Minor（residual，接受）**：停机明细/工单表 4px 微溢出（scrollW 800/796、1074/1070，探针 overflow）——滚动承载正常，u3 I1/K3 同族先例，页面级接受。
- 探针 truncated 条目全部为 sw=cw+4 的统一 4px padding 伪影（含「状态」等短表头），截图目检表头无一处视觉裁切——探针阈值噪声，非缺陷。
- scada 组态（leafer canvas ×3，339×253）与 echarts 趋势 canvas 深色采样 `[0,0,0]`（非恒白），双主题目检组态工位树/主轴电机图形完整；手动刷新相位二截图（KPI 文本与 series 数据面推进）正常；KPI 千分位/完成率 85.0% decimals 面正确。

评分卡：A 交互（e2e 9/9 ✓ 轮询相位/echarts 下钻/scada 组态注入/KPI_UNAVAILABLE 错误分支/focus ①②③）/ B 颜色（浅深 ✓，深色 canvas 零恒白）/ C 布局（notice→KPI×4→趋势+scada→停机面→工单进度 ✓）/ D 间隔 ✓ / E 排布 ✓ / F 一致性 ✓ / G na / H 弹层（下钻 dialog + focus ② e2e ✓）。**达标。**

## M2 `mes-work-reporting`（1440×900）

Findings：

- **Minor（residual，接受）**：作业卡表 4px 微溢出（sw 1092 / cw 1088，探针）——同 M1 族。
- 26 行 8 态分布、状态映射配色（已下发蓝 / 加工中绿 pill）、工时比>1 标红（1.33 rose-600，浅深两主题均正确呈现，截图）；行操作按钮 visible 显隐（RELEASED 只见开工 / RUNNING 见暂停+报工提交）由 e2e 交互①硬覆盖。

评分卡：A 交互（e2e 12/12 ✓ 七交互含守卫双拦截/报工链路/focus ①②③）/ B 颜色（浅深 ✓）/ C 布局（列表→行操作→报工 dialog 动线 ✓）/ D 间隔 ✓ / E 排布 ✓ / F 一致性 ✓ / G na / H 弹层（报工 dialog + 焦点往返 e2e ✓）。**达标。**

## S2 `mall-distribution`（1440×900，本批唯一强制品牌令牌对齐）

Findings：

- **F-S2-1（Major，强制项，本轮修复）品牌令牌缺席**：走查取证整页零商城品牌令牌——`--repl-mall-price` 在页面作用域 undefined（探针 brandForensics.replMallPriceVar='(undefined)'），KPI 金额（分销 GMV ￥225,253 / 佣金总额 ￥6,136）与佣金列数值均为中性前景色（rgb(2,8,23)），主操作按钮为默认 variant（primaryBtnsFound=1，无品牌渐变）——违反 baseline §2.3 desktop 族「商城品牌色仅用于 S2」（用于即强制，缺席即差距）。
  **Fix（等价类移植裁决落地）**：
  - `replication.css` 新增 `.repl-mall-dist` 页面级令牌作用域：`--repl-mall-price`（light `#ff5000` / dark `#ff7a45`）+ `--repl-mall-gradient`（`linear-gradient(135deg,#ff6034,#ee0a24)`），镜像 §2.1 表浅/深双套；`.repl-mall-amount` 金额面（价格色 600 + tabular-nums，§2.2 三段式价格的 desktop 表格/弹层等价单色面）；`.repl-mall-btn-buy` 品牌渐变主钮（desktop 档位：沿用按钮自身圆角/高度，不套移动胶囊）；`.repl-mall-section` 区块卡 r14/padding12（§2.2 mall-section 档位）。类名沿用 repl- 与 --repl-mall- 前缀，零上游 `.mall-*` 类名。
  - `mall-distribution.json`：根 flex 加 `className: repl-mall-dist`；佣金明细列与下钻表佣金列 cell 加 `repl-mall-amount`；审核弹层金额行拆为「分销商」muted + 「提现佣金」`repl-mall-amount`；通过打款 / 保存规则两主钮加 `repl-mall-btn-buy`；merchant/platform 权限区块卡 `rounded-lg p-4` → `repl-mall-section border`。
  - **反向验证（探针 `_tmp/u4-verify.mjs`）**：root 作用域 `--repl-mall-price` light `#ff5000` / dark `#ff7a45`；佣金列 `.repl-mall-amount` computed `rgb(255,80,0)`；KPI gmv 数值 `rgb(255,80,0)`；审核弹层通过打款 `background-image: linear-gradient(135deg, rgb(255,96,52), rgb(238,10,36))`。S2 spec 复跑 11/11 绿（断言零调整）。
- **F-S2-2（Minor→renderer 级登记，u3 F-I2-2 同族）深色 pivot 画布白底**：`data-mode='dark'` 下 pivot（VTable canvas 1088×320）采样 `[255,255,255]`——与 u2 F-W3-1 / u3 F-I2-2 完全同族（canvas 渲染器 probe 裸 HSL 分量令牌恒回退 light），并入既有 U6 登记，不重复立条。qrcode 白底为二维码本体语义，非缺陷。
- **Minor（residual）**：pivot 分销商列头/行头截断（「蓝海…」「星辉…」）——u2 F-W3-3 列宽启发式族，U6 pivot 族在案。
- 折下四段目检（crud/pivot/merchant 区块/rules，浅深）：分销关系树三级展开 ✓、qrcode 128² ✓、佣金规则 input-table 五列 ✓。

评分卡：A 交互（e2e 11/11 ✓ 筛选/导出含空集拒绝/pivot 下钻/规则校验/提现审核/权限裁剪/批次结算/focus ①②）；五 spec 复跑 S2 11/11 绿（断言零调整）。/ B 颜色（品牌令牌对齐收口后 ✓：价格橙三段式等价面、品牌渐变主钮、浅深双套；深色 pivot 白底 = F-S2-2 renderer 级登记裁决）/ C 布局（KPI→趋势→筛选→明细→导出→透视→权限区块→规则 ✓）/ D 间隔 ✓ / E 排布 ✓ / F 一致性（品牌令牌落地后与 S1 同源 ✓）/ G na / H 弹层（审核 dialog + 下钻 dialog e2e ✓）。**达标（F-S2-2 按 renderer 级 Failure Path 处置登记）。**

## O1 `doc-ocr-workbench`（1440×900）

Findings：

- 零溢出零截断（探针 common 空——五页中唯一全清）。
- wizard 四步步进中间态（步 1 原件对照 image+image-compare 拖拽分割线 → 步 2 字段确认）：步 2 低置信 wrapper 背景程序化取证 `rgb(254,226,226)`（= `--repl-low-confidence-bg` 解析值，仅 invoiceNo 生效）+ 置信度三档 badge 计数（低 1 / 中 3 / 高 2，配色 #b91c1c/#b45309/#15803d）+ labelRemark「0441-2O26-7781」原值浮显 ✓。
- **Minor（residual，接受）**：深色主题低置信高亮仍为浅色底（`--repl-low-confidence-bg` 静态浅红），值文本深色于浅红底上——对比可读、低置信「高亮读出」语义 preserved；O1 为新 type 临时形态页（G19/G20 收窄裁决在案），深色 soft 底令牌化归 U6 令牌归族一并收敛。

评分卡：A 交互（e2e 9/9 ✓ wizard 步进/低置信阻断/校正写回/明细增改/回流提交含失败分支/focus ①②③）/ B 颜色（浅 ✓；深色低置信浅底 = 上述 residual 裁决）/ C 布局（左原件右 wizard 双栏 ✓）/ D 间隔 ✓ / E 排布（四步动线 ✓）/ F 一致性（badge 三档 ✓）/ G（新 type 临时形态，G19/G20 在案）/ H 弹层（preview dialog + surface 焦点往返 e2e ✓）。**达标。**

## O2 `doc-hitl-inbox`（1440×900）

Findings：

- **F-O2-1（Minor→本轮修复）明细表横溢 44px、高危列折角裁切**：探针 overflow sw 1132 / cw 1088；截图（两主题）最右「高危」徽章列在首屏被视口缘裁半（变更摘要列长文本「供应商主数据变更：银行账号 + 信用额度」撑宽撑出）。
  **Fix（页面级）**：schema 列宽收敛（审批单号 120→110、提交时间 140→120、变更摘要 200→180）+ mock 最长摘要串「银行账号 + 信用额度」→「银行账户」（mock 形态在 scope；spec 仅断言表头集合，反向核对零依赖）。复测：列宽实测 sum=1088=容器宽，sw 1092（-40px），徽章列完整入屏；余 4px 为 M1/I1/K3 同族微溢出（接受，见 residual）。
- 前置 10 行按剩余时限升序、高危徽章（error/neutral 双态）、HITL 卡与 AI 预留区块由 e2e 交互⑤/前置硬覆盖。

评分卡：A 交互（e2e 9/9 ✓ 跨页批量/staleness 禁批/驳回必填/三视图/HITL 卡/SoD 拦截/focus ①②）/ B 颜色（浅深 ✓）/ C 布局（筛选→列表→行点击审批动线 ✓）/ D 间隔 ✓ / E 排布（时限升序动线 ✓）/ F 一致性（高危列裁切修复后 ✓）/ G na / H 弹层（审批 dialog + 焦点链 e2e ✓）。**达标。**

## 残留 residual（均带 Why Not Blocking）

| 残留                                                            | 归属                                | Why Not Blocking                                                                                                 |
| --------------------------------------------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| S2 深色 pivot 画布白底（F-S2-2，并入 u2 F-W3-1 / u3 F-I2-2 族） | U6 令牌归族                         | 根因已登记（canvas 渲染器 probe 裸 HSL 分量令牌恒回退 light）；令牌格式收敛一处改全族受益，页面级无法重绘 canvas |
| S2 pivot 行头/列头截断（「蓝海…」）                             | U6 pivot 族                         | 同 u2 F-W3-3 在案；列宽启发式渲染器行为，数值可读                                                                |
| M1/M2 表 4px 微溢出（M1 两处 4px + O2 修后余 4px）              | 页面级接受                          | 滚动条承载，非结构破损（u2 F-W2-3 / u3 I1/K3 同族先例；4px 为表 border/padding 常量伪影）                        |
| O1 深色低置信高亮浅色底                                         | U6 令牌归族                         | 对比可读、低置信高亮语义 preserved；`--repl-low-confidence-bg` 深色 soft 化随 U6 变量归族一并收敛                |
| M1/S2 深色 echarts 轴标签低对比                                 | U6 canvas 族（F-W3-1 同族证据补充） | canvas 内文本随恒 light 回退族收敛；轴值仍可辨认，浅色为主口径自洽                                               |

## 共性根因（U6 / improvement-analysis 登记建议条目）

1. S2 深色 pivot 白底、S2 pivot 表头截断、M1/S2 深色 echarts 轴标签低对比——u2 §共性根因 1（裸 HSL 令牌 × canvas probe 族）与 residual 已登记，本轮补 S2/M1 证据，不重复立条。
2. **（新增建议）商城品牌令牌页面作用域缺席**：「improvement-analysis 2026-11-04：desktop 商城域页（S2）无任何品牌令牌通道——`--repl-mall-*` 现仅定义于 `.repl-mobile-canvas-screen`（mobile 画布作用域），desktop 页无等价作用域可继承，导致 S2 金额/主钮/KPI 全中性面（U4 F-S2-1 取证）。U4 已按等价类移植裁决落地页面级 `.repl-mall-dist` 作用域 + `.repl-mall-amount/.repl-mall-btn-buy/.repl-mall-section` 等价类；建议 U6 把 `--repl-mall-*` 令牌组上提为 replication.css 共享作用域（`:root` + `[data-mode='dark']`），mobile 画布与 desktop 商城域页共用一套定义。」
3. **（勘误登记）表格 4px 微溢出为表级常量伪影**：「U2/U3/U4 四批 8 页均测得 sw=cw+4 的统一微溢出（含全部短表头 th scrollWidth+4），目检零视觉裁切——非真实内容溢出，系表 border/padding 盒模型常量。建议 U7 复检把探针 overflow 阈值由 +2px 调至 +6px，避免每批重复登记同族噪声。」

## 修复 diff 清单

- `apps/playground/src/complex-pages/page-schemas/mall-distribution.json`：根 flex `className: repl-mall-dist`；佣金列/下钻佣金列 cell `repl-mall-amount`；审核弹层金额行拆分 + `repl-mall-amount`；通过打款/保存规则 `repl-mall-btn-buy`；merchant/platform 区块卡 `repl-mall-section border`（F-S2-1）。
- `apps/playground/src/complex-pages/shared/replication.css`：新增 `.repl-mall-dist` 令牌作用域（浅/深）、`.repl-mall-amount`、`.repl-mall-dist` KPI 数值选择器、`.repl-mall-btn-buy`（desktop 档位）、`.repl-mall-section`（F-S2-1）。
- `apps/playground/src/complex-pages/page-schemas/doc-hitl-inbox.json`：审批单号 110 / 提交时间 120 / 变更摘要 180（F-O2-1）。
- `apps/playground/src/complex-pages/shared/mock-backend-repl-doc.ts`：changeSummary 长串「银行账号 + 信用额度」→「银行账户」（F-O2-1 配套，spec 断言零依赖核对在案）。
- 五页 spec：零改动（无物理前置诉求、断言零调整）。

## 验证

- 五 spec focused `--retries=0`：**50 passed**（M1 9 / M2 12 / S2 11 / O1 9 / O2 9；首跑即全绿，schema/css/mock 修复后全量复跑，spec 文件零改动）。
- `pnpm typecheck` ✓；`pnpm lint` ✓（45/46 cached）；`pnpm --filter @nop-chaos/flux-playground test` **569/569** ✓。
- 中途事件（Failure Path 实录）：`replication.css` 注释内 `repl-*/--repl-mall-*` 字面 `*/` 提前闭合注释块 → postcss Unclosed block → dev server styles.css 500 → 五页白屏；就地修正注释措辞后复验全绿（styles.css 恢复 200，探针复跑通过）。
- `packages/` 全程零改动。
