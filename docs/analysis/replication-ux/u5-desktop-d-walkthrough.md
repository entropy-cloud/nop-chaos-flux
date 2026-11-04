# U5 桌面域 D 三页走查报告（V1/V2/V3）

> Created: 2026-11-04。方法：三步法（自由 critique → A-H grounding → 程序化取证）+ baseline §2.3 desktop 口径（本批无品牌令牌强制，约束为 repl-\* 基线 + §2.2 档位通则）；环境：dev server（http://127.0.0.1:5183）+ playwright chromium，三页视口均 1440×900（各 spec 同款），浅/深双主题（`data-mode='dark'`）+ 交互中间态取证（V1 tickTelemetry 轮询相位二 + 告警 dialog、V2 wizard 三步步进 + steps 八态 + 回滚 dialog、V3 pin 点击围栏判定 + 围栏 region 回显 + 通道 drawer；V3 绘制/轨迹/流媒体按 D4 §6.2 不做交互验收）。探针：`_tmp/u5-walkthrough.mjs` + `_tmp/u5-walkthrough-out.txt`（结构几何/溢出/截断/深色 canvas 采样）、`_tmp/u5-probe3.mjs`（steps 状态色计算值 + 地图要素像素几何）、`_tmp/u5-probe4/5/6/7.mjs`（steps 色失效级联取证：规则加载 ✓、选择器匹配 ✓、computed 仍 initial → bare var 根因锁定）、`_tmp/u5-verify.mjs`（修复后反向验证）。截图：`_tmp/ux-fidelity/u5/`（评审证据，不入库）。约束：packages/ 零改动。

## V1 `iot-telemetry-device`（1440×900）

Findings：

- **Minor（residual，接受）**：告警表 4px 微溢出（sw 1092 / cw 1088，探针 overflow）+ 全部短表头 th sw=cw+4——u2 F-W2-3 / u3 I1/K3 / u4 M1/O2 同族表级常量伪影，滚动承载正常，页面级接受。
- 轮询相位二取证：`__replIotTestHooks.tickTelemetry()`（spec 同款 seed）推进后 tile 三值按正弦相位更新（e2e 交互①数据面硬覆盖）；告警 dialog（560px）详情行 + 关闭/确认双钮（32px）由 e2e 交互②③ 覆盖。
- 深色 echarts 趋势 canvas 采样 `[0,0,0]`（非恒白），曲线/网格完整；图例/轴标签深色低对比 = u4 M1/S2 深色 echarts canvas 族（U6 在案）。

评分卡：A 交互（e2e 7/7 ✓ 轮询相位/告警确认/ACK_FAILED+ALREADY_CLOSED 分支/切设备 BAD/focus ①②）/ B 颜色（浅深 ✓，深色 canvas 零恒白；轴标签低对比按族登记）/ C 布局（过滤→tile×3+质量位→趋势→告警表 ✓）/ D 间隔 ✓ / E 排布 ✓ / F 一致性（status/mapping 配色浅深正确）✓ / G na / H 弹层（告警 dialog + Esc 焦点往返 e2e ✓）。**达标。**

## V2 `iot-ota-rollout`（1440×900）

Findings：

- **F-V2-1（Major，本轮修复）steps 八态状态色全失效**：程序化取证 `steps-indicator-circle` 三态 computed 全同——finish/process/wait 均 `background: rgba(0,0,0,0)` + `border: rgb(2,8,23)`（=currentColor initial 回退），截图目检八圆全灰描边无差。级联取证（probe4/5/6/7）：nop-steps 规则已加载 ✓、元素匹配 `[data-status='finish']` ✓、非 shadow DOM ✓、改 data-status computed 不变 → 声明级失效。根因：`flux-renderers-layout/src/styles.css` 对通道型令牌（`--primary: 217 89% 53%` 等 HSL 分量三元组）**bare `var()` 引用**（steps 指示圆 213-231、connector 133/156、steps 文本 255-273、wizard-step-error 105 共约 12 处），var() 解析为非法色值 → guaranteed-invalid → initial。与 u2 §共性根因 1「裸 HSL 令牌族」同族但发生 在 CSS 声明侧（非 canvas probe）。
  **Fix（页面级 workaround，renderer 侧登记 U6）**：`replication.css` 追加 `.nop-steps`/`.nop-wizard` 等价声明覆盖（`hsl(var(--token))` 包裹，含 wait/process/finish/error 四态、connector、steps-title/description/empty、wizard-step-error），语义与渲染器样式表逐条对应。
  **反向验证（`_tmp/u5-verify.mjs` + 截图 v2-steps-after-light/dark）**：finish/process `rgb(28,110,242)` primary 实心白勾、wait 白底灰描边 muted 字、connector primary 色；深色主题同结构正确。V2 spec 复跑绿（断言零调整）。
- **Minor（residual，接受）**：固件表/进度矩阵各 4px 微溢出（sw 1092/1088、1060/1056）——同 V1 族。

评分卡：A 交互（e2e 7/7 ✓ wizard 三步/必填拦截/FAILED 分叉/回滚链/门控推进/focus ①②）/ B 颜色（浅深 ✓；F-V2-1 修复后 steps 三态着色正确）/ C 布局（固件表→灰度指派 wizard→灰度进度 steps+timeline+矩阵+门控 ✓）/ D 间隔 ✓ / E 排布（三步动线 + 八态轴 ✓）/ F 一致性（修复后状态色与 primary/destructive 令牌同源）✓ / G na / H 弹层（回滚 dialog：空原因拦截→ROLLED_BACK alert e2e ✓）。**达标。**

## V3 `iot-geofence-videowall`（1440×900，新 type 临时形态页）

Findings：

- **F-V3-1（Major，F1 在册 #4 收口，本轮根因修复）围栏 region 圆形要素视觉不显**：正式取证（`_tmp/u5-probe3.mjs`）——fence map（zoom 9，高 240）三围栏圆在屏半径仅 **3.1 / 4.6 / 5.7 px**（mercator 分辨率 305.7 m/px，800-1500m 半径的几何必然）；canvas 像素扫描 641×238 仅 **12** 个采样点为彩色（蓝 #1e88e5 填充色存在但亚感知）；截图目检围栏回显面只见灰色底板 + 针尖蓝点，"围栏回显"语义不可读。三围栏跨度 ~50km 与可见圆需 zoom≥11 的视图冲突（zoom 11 时 B/C 圆心出屏）。
  **Fix（页面级：schema zoom/height + mock 半径档位）**：schema fence map `zoom 9→9.8`、`height 240→360`（放大视图 + 覆盖三围栏 50km 跨度）、center `[121.76,31.13]→[121.76,31.14]`（质心微调保三圆全入屏）；mock `IOT_FENCES` 半径 `800/1200/1500m → 2000/3000/4000m`（园区级围栏档位，业务形态不变）。checkFence 判定面复核：DEV-1001 距心 146m 仍围栏内、DEV-1002 距心 ~6.2km 仍围栏外（spec 断言零依赖 radius 具体值，逐条核对在案）。
  **反向验证（`_tmp/u5-verify.mjs` + 截图 v3-fence-after-light/dark）**：zoom 9.8 实测半径 **13.3 / 20 / 26.5 px**，三圆全入屏（inView true×3），canvas 彩色采样 12→**330**（×27.5）；目检三蓝色圆盘清晰可辨。
- **Minor（residual，接受）**：事件表 4px 微溢出（sw 647/643）——同族。
- **Minor（residual，renderer/资产级登记）深色主题地图底板恒浅灰**：`data-mode='dark'` 下两图 canvas 采样 `[238,242,245]`——basemap 为静态 PNG 资产（`map-tile-blank.png`），map 渲染器 basemap 配置无主题分岔通道（schema 单 url），矢量层/pin 照常主题化；U6 canvas/raster 恒 light 族登记（与 F-W3-1 同族证据补充），页面侧无资产切换通道。
- pin 点击 → checkFence 判定文本（`设备 DEV-1001 · 张江园区 · 围栏内 · 距中心 146 m`）、事件表按设备过滤、通道 drawer（tree 4 路在线）由 e2e 交互①④/focus ③ + 走查取证双覆盖；video ×4 本地 mp4 存在面 e2e 交互②覆盖（流媒体交互按 D4 §6.2 不验收）。

评分卡：A 交互（e2e 7/7 ✓ 双地图要素/pin→checkFence/事件过滤/轮询增量/视频存在面/focus ①②③）/ B 颜色（浅 ✓；深色底板恒浅灰 = 上条 residual 登记；矢量/pin 主题化 ✓）/ C 布局（左地图面 pin+围栏回显+事件+timeline、右视频墙 2×2 ✓）/ D 间隔 ✓ / E 排布（3fr/2fr 双栏 ✓）/ F 一致性（事件 status 三态、围栏圆 primary 蓝与 pin 同源 ✓）/ G（新 type 临时形态，G19/G20 在案；绘制/轨迹/流媒体收窄不验收）/ H 弹层（通道 drawer 焦点落入 + Esc e2e ✓）。**达标（F-V3-1 修复收口）。**

## 残留 residual（均带 Why Not Blocking）

| 残留                                                      | 归属                        | Why Not Blocking                                                                                                                         |
| --------------------------------------------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| V1/V2/V3 表 4px 微溢出 + th sw=cw+4 伪影                  | 页面级接受                  | 滚动条承载，非结构破损（u2-u4 五批同族先例；表 border/padding 常量，U7 探针阈值 +2→+6 建议已在 u4 登记）                                 |
| V1/V2 深色 echarts 轴标签/图例低对比                      | U6 canvas 族（F-W3-1 同族） | canvas 内文本随恒 light 回退族收敛；曲线与数值可辨认，浅色为主口径自洽                                                                   |
| V3 深色两图底板恒浅灰（静态 PNG basemap，无主题分岔通道） | U6 canvas/raster 族         | 矢量层/pin 深色正常，底板为资产级通道缺失；页面 schema 无主题切换位，登记后 U6 统一（如 renderer 支持 basemap per-theme 或深色瓦片资产） |
| V2 steps process 态与 finish 态实心同色（仅数字/勾区分）  | 渲染器设计形态              | 状态已可辨（勾/数字/描边三态），mock projectStepItems 语义如此，非缺陷                                                                   |

## 共性根因（U6 / improvement-analysis 登记建议条目）

1. V1/V2 深色 echarts、V3 深色 basemap——u2 §共性根因 1（恒 light canvas/raster 族）已登记，本轮补 V3 静态资产通道缺失证据，不重复立条。
2. **（新增建议）渲染器样式表 bare var() × 通道型令牌**：「improvement-analysis 2026-11-04：flux-renderers-layout/src/styles.css 约 12 处对 HSL 分量三元组令牌（--primary/--border/--destructive/--muted-foreground/--background 等）直接 bare var() 引用（steps 指示圆状态色 213-231、connector 133/156、steps 文本 255-273、wizard-step-error 105），var() 解析非法 → initial 回退，steps 八态/wizard 错误文本着色全失效（U5 F-V2-1 取证：规则加载且匹配但 computed 恒 initial）。U5 已在 replication.css 以 hsl(var()) 等价声明页面级覆盖（playground 全局生效）；建议 U6 渲染器侧统一改为 hsl(var(--token)) 后移除该覆盖块。」
3. V3 围栏可视性根因为**几何档位失配**（50km 跨度视图 × 百米级半径圆），非渲染器缺陷——页面级 zoom/height/半径档位修复已收口，无归族项；F1 #4 可销。

## 修复 diff 清单

- `apps/playground/src/complex-pages/page-schemas/iot-geofence-videowall.json`：fence map `zoom 9→9.8`、`height 240→360`、`center [121.76,31.13]→[121.76,31.14]`（F-V3-1）。
- `apps/playground/src/complex-pages/shared/mock-backend-repl-iot-v3.ts`：`IOT_FENCES` radiusMeters `800/1200/1500 → 2000/3000/4000`（F-V3-1 配套；checkFence 内外判定与 spec 断言零影响核对在案）。
- `apps/playground/src/complex-pages/shared/replication.css`：追加 `.nop-steps`/`.nop-wizard` hsl(var()) 状态色覆盖块（F-V2-1 页面级 workaround，注释内零 `*/` 字面风险字符）。
- 三 spec：零改动（无物理前置诉求、断言零调整）。
- `packages/` 全程零改动。

## 验证

- 三 spec focused `--retries=0`：**21 passed**（V1 7 / V2 7 / V3 7——以实跑 21 计；修复后全绿，spec 文件零改动）。
- `pnpm typecheck` ✓；`pnpm lint` ✓（45 cached）；`pnpm --filter @nop-chaos/flux-playground test` **569/569** ✓。
- `styles.css` dev 请求 200（replication.css 追加块无 postcss 注释闭合风险）。
