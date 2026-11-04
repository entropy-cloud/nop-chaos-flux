# U7 同探针复检 + 覆盖对账报告（plan 851）

> Date: 2026-11-04。方法：U6 归族后终态复检。探针 `_tmp/u7-recheck.mjs`（复用 U2-U6 探针结构：commonChecks 溢出/截断按 u4 勘误阈值 +2→+6、darkCanvasCheck 五点白块采样、S2 品牌令牌取证、V3 围栏 canvas 彩色像素计数），21 页浅/深双主题截图归档 `_tmp/ux-fidelity/recheck/<page>-{light,dark}.png`（42 张），取证数据 `_tmp/ux-fidelity/recheck/u7-recheck-out.json`。补充探针 `_tmp/u7-s2-light.mjs` / `_tmp/u7-s2-kpi.mjs`（浅色品牌令牌 rgb(255,80,0) 销单取证）。
> e2e 硬门：21 页 replication spec 全量 `--retries=0` **209/209 全绿**（5.8m，断言零调整）。

## §1 复检结论统计

- **21/21 页 pass**，uncovered=0；**零新 Blocker / 零新 Major / 零新 fail**。
- A-1（pivot 深色白底）W3/I2/S2 三页取证销单；F1 #4（V3 围栏可视性）取证销单。
- 族 G watch-only residual 七项逐项复核，全部维持 watch-only，Why Not Blocking 均成立（§3）。
- 新登记 1 条 watch 备注（W1 记录行 meta 文本 truncate 省略，设计形态非缺陷，见 §4）。

## §2 21/21 对账表（页 × 走查批 × findings 处置态 × 复检结论）

| 页  | 走查批 | findings 处置态（U1-U6 终态）                                          | 复检取证                                                                                                                                                                  | 复检结论                            |
| --- | ------ | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| W1  | U1     | F-W1-1 fixed（repl-record-row）；F-W1-2/3 residual（壳 chrome 豁免）   | 零 +6 溢出；记录行卡面 ✓；meta 行 truncate 省略（§4 备注）                                                                                                                | pass                                |
| W2  | U2     | F-W2-3 Minor 接受（4px 族）；其余无需修                                | +6 阈值下零溢出（4px 噪声清除）；kanban 横滚载体预期                                                                                                                      | pass                                |
| W3  | U2     | F-W3-1 Major → A-1 fixed（U6）；F-W3-2/3 residual                      | **深色 pivot 画布深底 ✓（白块 0/5 采样）**；表头截断仍 watch                                                                                                              | pass（A-1 销单）                    |
| C1  | U2     | F-C1-1/2 residual 在案                                                 | kanban 横滚载体预期；零截断                                                                                                                                               | pass                                |
| C2  | U2     | F-C2-3 Minor 接受                                                      | 零溢出零截断                                                                                                                                                              | pass                                |
| C3  | U2     | F-C3-1/2 fixed（aspect-ratio + tile 去重标题）；F-C3-4 接受            | 零溢出零截断（funnel 裁切无复发）                                                                                                                                         | pass                                |
| I1  | U3     | F-I1-1 fixed（queryForm actions:[]）；4px 族接受                       | +6 阈值下零溢出                                                                                                                                                           | pass                                |
| I2  | U3     | F-I2-1 fixed（双 y 轴）；F-I2-2 → A-1 fixed；表头截断 residual         | **深色 pivot 深底 ✓**；零 +6 溢出                                                                                                                                         | pass（A-1 销单）                    |
| K1  | U3     | 零 findings                                                            | 零截断；chips 横滚载体预期                                                                                                                                                | pass                                |
| K2  | U3     | F-K2-1 fixed（columnWidth 340 + repl-k2-kanban）；F-K2-2 视口裁决在案  | 零截断；六列横滚载体预期                                                                                                                                                  | pass                                |
| K3  | U3     | 4px 族接受                                                             | +6 阈值下零溢出                                                                                                                                                           | pass                                |
| M1  | U4     | 4px 族接受；truncated +2 噪声勘误在案                                  | +6 阈值下零溢出零截断；深色 canvas 零恒白                                                                                                                                 | pass                                |
| M2  | U4     | 4px 族接受                                                             | +6 阈值下零溢出零截断                                                                                                                                                     | pass                                |
| M3  | U1     | F-M3-1/2/4 fixed；F-M3-3 无需修                                        | swipe-cell 动作轨横滚为交互预期形态；零截断                                                                                                                               | pass                                |
| S1  | U1     | F-S1-1~5 fixed；F-S1-6 接受                                            | 零截断；pull-refresh/scroll 载体预期                                                                                                                                      | pass                                |
| S2  | U4     | F-S2-1 fixed（品牌令牌作用域）；F-S2-2 → A-1 fixed；表头截断 residual  | **浅色 `--repl-mall-price=#ff5000`、金额/KPI gmv `rgb(255,80,0)`、深色 `#ff7a45`、主钮渐变 `linear-gradient(135deg,rgb(255,96,52),rgb(238,10,36))` ✓；深色 pivot 深底 ✓** | pass（A-1 销单 + 品牌令牌销单确认） |
| O1  | U4     | 零溢出零截断；深色低置信浅底 residual                                  | 零溢出零截断维持                                                                                                                                                          | pass                                |
| O2  | U4     | F-O2-1 fixed（列宽收敛）；4px 族接受                                   | +6 阈值下零溢出（44px 溢出无复发）                                                                                                                                        | pass                                |
| V1  | U5     | 4px 族接受；echarts 深色轴标签 residual                                | +6 阈值下零溢出；深色 canvas 零恒白                                                                                                                                       | pass                                |
| V2  | U5     | F-V2-1 → A-2 fixed（渲染器 hsl(var()) 化，页面覆盖块移除）；4px 族接受 | 零溢出；深色 canvas 零恒白                                                                                                                                                | pass                                |
| V3  | U5     | F-V3-1 fixed（zoom/height/半径档位，F1 在册 #4）；basemap/4px residual | **围栏 canvas 彩色采样 304（修复前 12）；三圆盘目检清晰 ✓**                                                                                                               | pass（F1 #4 销单）                  |

覆盖对账：21 页 × 走查批（U1×3 / U2×5 / U3×5 / U4×5 / U5×3）全部入表，每页 findings 处置态与复检结论一一对应，**uncovered=0**。

## §3 族 G watch-only residual 七项复核

| 项                            | 复检证据                                                                         | 结论                                                                         |
| ----------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| 4px 表格盒模型伪影            | 探针阈值 +2→+6（u4 勘误落地）后 21 页零 +6 溢出命中（横滚/swipe 载体除外）       | 仍 watch-only；Why Not Blocking 成立（常量伪影非破损，且已从探针噪声中消除） |
| 深色 echarts 轴标签低对比     | 各页 darkCanvas 白块采样 0（echarts 深色底正确）；标签对比未变                   | 仍 watch-only；归 chart 渲染器 owner，可读性降级非不可读                     |
| V3 深色 basemap 恒浅灰        | recheck dark 截图确认底板浅灰、矢量/pin 主题化正常                               | 仍 watch-only；静态 PNG 资产无主题分岔通道，产品级裁决                       |
| O1 深色低置信浅底             | `--repl-low-confidence-bg` 无深色套（本轮 css 未变动，U6 裁决保留）              | 仍 watch-only；对比可读、语义 preserved                                      |
| W1 表单桌面形态 / 无导航头    | recheck 截图确认形态不变                                                         | 仍 watch-only；壳 chrome 差异豁免在案（baseline §2.3）                       |
| pivot 表头截断                | W3 dark 截图「门磁…/B20…/A-01…」仍省略；+6 阈值下 truncated 零命中（省略号形态） | 仍 watch-only；长表头换行策略归 VTable 主题裁决，明细表可达全值              |
| steps process/finish 同色实心 | U6 后 css 未变动（A-2 修复后状态色正确，同色实心为设计形态）                     | 仍 watch-only；勾/数字/描边三态可辨，非缺陷                                  |

## §4 新发现分级处置裁决

- **Blocker / Major：零**。无需按 roadmap §8 拆批（Failure Path recheck-new-major 未触发）。
- **Minor / watch 备注（登记 1 条，不立项）**：W1 `wms-pda-receiving` 记录行 meta 文本（`text-sm truncate`，如「PUTAWAY · 门磁报警器 ×9 ·…」）在 341px 画布内省略截断（sw≈342 / cw≈208）。裁决：**设计形态非缺陷**——span 自带 `truncate` 类即有意省略，移动卡片密度下首段语义（动作 · 物料 · 数量）可读，完整值经 swipe 操作/详情可达；与族 G「pivot 表头截断」同性质，登记 watch 备注不修。
- 复检期间的溢出命中全部为**预期滚动载体**：kanban 横滚容器（W2/C1/K2）、swipe-cell 动作轨（W1/M3）、mobile scroll 载体（S1 pull-refresh/goods rail）、K1 prompt chips 横滚——非缺陷。

## §5 F1 #4（围栏可视性）销单确认

- 取证：`_tmp/u7-recheck.mjs` fenceCheck——fence map canvas（h=358，zoom 9.8/height 360 修复态）彩色采样 **304**（U5 修复前基线 12，×25）；`iot-geofence-videowall-light.png` 目检三蓝色圆盘清晰可辨、全入屏。
- 结论：F1 在册 #4「围栏 region 视觉不显」**销单确认**；几何档位修复（schema zoom/height + mock 半径）稳定生效。

## §6 全量验证数字

- 21 页 replication spec `--retries=0`：**209/209 passed**（5.8m，exit 0）。
- `pnpm check`：**exit 0**（零新增红；scripts 静检 200 passed）。
- 截图归档：`_tmp/ux-fidelity/recheck/` 42 张（21 页 × 浅/深）+ 取证 JSON。
- 探针零页面改动、零 spec 改动、零 packages/ 改动（复检轮 Non-Goal 遵守）。
