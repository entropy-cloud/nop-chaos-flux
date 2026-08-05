# 审计卡：qrcode（flux-renderers-content）

> 状态: closed
> 审查日期: 2026-08-05
> 审查 plan: `docs/plans/2026-08-04-1757-2-c6-4-content-media-family-audit.md`
> 注册定义: `packages/flux-renderers-content/src/content-renderer-definitions.ts:479` | 渲染器: `packages/flux-renderers-content/src/qrcode.tsx:16` | design.md: `docs/components/qrcode/design.md` | playground: `apps/playground/src/pages/w4a-multimedia-demo.tsx:103`（demo-qrcode + demo-qrcode-empty + demo-qrcode-alt）+ `apps/playground/src/component-lab/renderers/qrcode-lab-page.tsx`（Phase 3 补）| e2e: `tests/e2e/w4a-multimedia-family.spec.ts:96` + `tests/e2e/component-lab/c6-4-host-surfaces.spec.ts`（本组件宿主场景新增）

## 组件身份

qrcode / flux-renderers-content / QrCodeSchema（`schemas.ts:360-375`）/ defaultSchema `{type:'qrcode'}` / 表单参与: 否 / widget 二维码展示组件（`qrcode` npm 包 canvas 渲染；value 只读 prop，`failed` 为局部 UI 态；canvas 重绘 echo 值变化）。

## 18 维审查记录

| #   | 维度                        | 结论 | 证据                                                                                                                                                                                                                                                                                                                                                                                                    | 发现 |
| --- | --------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 1   | Schema 契约                 | pass | QrCodeSchema（schemas.ts:360-375：value/size/level/foreground/background/label/onLoadError）↔ 注册 fields（content-renderer-definitions.ts:485-493：value/size/level/foreground/background prop + label value-or-region + onLoadError event）↔ 渲染器消费（qrcode.tsx:18-38）三方一致；defaultSchema `{type:'qrcode'}` 一致；level 白名单 L/M/Q/H + 默认 M（schemas.ts:358/:367 ↔ qrcode.tsx:9-14）一致 | —    |
| 2   | RendererComponentProps 合规 | pass | 仅读 props.props/meta/events（qrcode.tsx:17-38）；label region 经 resolveRendererSlotContent/hasRendererSlotContent（:36-37）；无 store 直访、无 ad-hoc context                                                                                                                                                                                                                                         | —    |
| 3   | 值所有权三态                | pass | **qrcode value 渲染 echo**：value 只读 prop（:19-24 字符串强转），canvas 经 useEffect 依赖 [valueStr, size, level, foreground, background] 重绘（:49-71）——**值变化 → canvas 重绘 echo**（display-only，无写回路径）；`failed` 为 renderer 局部 UI 态（:41）；无 valueOwnership/valueStatePath 声明即有意设计（display-only 组件）                                                                      | —    |
| 4   | 表单参与                    | n-a  | 非表单字段（无 name/required/validation）                                                                                                                                                                                                                                                                                                                                                               | —    |
| 5   | DOM 与选择器契约            | pass | 根 `nop-qrcode` marker（qrcode.tsx:80/:103）+ data-slot="qrcode" + data-state empty/error（:79/:102）+ testid/cid 透传（:76-77/:100-101）；canvas data-slot="qrcode-canvas" + role="img" + aria-label（:105-111）；label figcaption data-slot="qrcode-label"（:90/:113）；回退块 data-slot="qrcode-fallback"（:83）；`check:audit-missing-renderer-markers` 0 命中                                      | —    |
| 6   | 嵌套 schema 分类            | pass | 08-02 机制核对：value/size/level/foreground/background 全 prop（:486-490）+ label value-or-region（:491）+ onLoadError event（:492）——与 08-02 声明一致；无 deepFields 残留（live grep 零命中）                                                                                                                                                                                                         | —    |
| 7   | 事件与 action 契约          | pass | onLoadError 派发（qrcode.tsx:60-66，catch 内 `void onLoadError?.()`）——无 payload 事件，与 image 同族先例一致；toCanvas 失败 → failed UI + 事件派发双路径；失败诊断 DEV-only console.warn（:64-66，design §8「与 onLoadError 同处 catch、互不冲突」一致）                                                                                                                                               | —    |
| 8   | a11y                        | pass | canvas role="img" + aria-label（:108-109，label region 字符串化或 `QR code for ${valueStr}` 兜底）；回退文本可读；无交互控件                                                                                                                                                                                                                                                                            | —    |
| 9   | i18n                        | pass | 回退文案走 `t()`（qrcode.tsx:87：flux.common.loadFailed/noValue，en-US.ts:19/:25 + zh-CN.ts:20/:26 存在）；`check:i18n-keys` 通过                                                                                                                                                                                                                                                                       | —    |
| 10  | 四态覆盖                    | pass | 空态（value 空/缺失 → data-state=empty + noValue 回退，:73-96，qrcode.test.tsx:63-80 实证）；错误态（toCanvas 失败 → data-state=error + loadFailed 回退 + onLoadError 派发，:73-96，qrcode.test.tsx:132-149 实证）；禁用/加载态 n/a（无交互/无异步加载面——canvas 生成为本地同步库调用）                                                                                                                 | —    |
| 11  | 异步生命周期                | pass | toCanvas Promise 竞态保护：AbortController + catch 内 aborted 短路（qrcode.tsx:54/:61——AUDIT-13 豁免注明，canvas 重绘幂等）；**value 变更重置 failed**（:50 setFailed(false)——错误后可恢复，qrcode.test.tsx 错误路径实证 + Phase 3 宿主实证 value 更新重绘）；卸载 abort（:68-70）；无 fetch/裸 Promise（void 调用）                                                                                    | —    |
| 12  | 组合宿主场景                | pass | 单测：qrcode.test.tsx 9 用例（canvas/数值强转/空态×2/非法 level 回退/L/M/Q/H/label region/尺寸回退/失败回退+onLoadError 次数）；真实浏览器：w4a demo-qrcode + empty + alt（w4a-multimedia-family.spec.ts:96-129，含 toDataURL 值差异实证）；Phase 3 宿主新增（value 更新 canvas 重绘）                                                                                                                  | —    |
| 13  | 样式契约                    | pass | widget 自样式（inline-flex 布局 :80/:103、fallback 块 bg-muted/text-muted-foreground :85、canvas rounded-md :110）；cn() 合并 meta.className（:80/:103）；无 BEM；主题 token 驱动                                                                                                                                                                                                                       | —    |
| 14  | React 19 规范               | pass | 无冗余 memo/callback；useEffect 仅外部同步（canvas 重绘，:49-71）；无 effect+setState 镜像（failed 由 catch 事件驱动）                                                                                                                                                                                                                                                                                  | —    |
| 15  | 性能边界                    | pass | 重绘频率受 effect deps 精确控制（valueStr/size/level/foreground/background 变化才重绘）；canvas 尺寸 DEFAULT_SIZE 128 常量（:10）；无监听器/订阅                                                                                                                                                                                                                                                        | —    |
| 16  | 测试质量                    | pass | 9 用例断言正确行为（canvas 渲染/强转/空态/level 回退/白名单/label/尺寸回退/失败回退+onLoadError）；DOM 契约断言（data-slot/data-state/marker class）；**盲区**：value 变更重绘（echo）零行为断言（既有测试仅首渲染——toCanvas 调用次数/新值传入未锁）→ P2-3 修复时补；失败后 value 变更恢复（setFailed(false)）零断言 → P2-3 同补                                                                        | P2-3 |
| 17  | 文档对照                    | pass | design.md §4 字段 ↔ QrCodeSchema 一致；§5 分类（value/size/level/foreground/background value + label value-or-region）↔ 注册 fields 一致；§8 onLoadError 事件（payload 过大/颜色非法等触发 + failed UI 维持 + 早期缺事件补齐记录）↔ qrcode.tsx:60-66 + schemas.ts:372-373 一致；§10 nop-qrcode marker ↔ :80/:103 一致；§12「不保留 qr-code 独立 type」↔ 注册单条目一致                                  | —    |
| 18  | 注册、包边界与 IO/安全红线  | pass | 单注册（:479）+ src/index.ts:53 导出 + registerContentRenderers（:60）✓；**qrcode canvas 渲染无 IO**（无 fetch/localStorage/外部请求——qrcode 库为本地纯计算）；无 dangerouslySetInnerHTML；**component-lab lab 页缺失** → P2-1（Phase 3 补）                                                                                                                                                            | P2-1 |

## 发现清单

- [P0] 无
- [P1] 无
- [P2-1] component-lab lab 页缺失（维度 18 缺口）→ 状态: fixed（Phase 3 新增 `qrcode-lab-page.tsx`）
- [P2-2] canvas aria-label 兜底 `QR code for ${valueStr}` 暴露 value 原文（:109）——value 语义为可公开展示的二维码内容，与视觉编码内容一致，非敏感泄漏 → keep（P3 级观察）
- [P2-3] 测试盲区：value 变更重绘 echo + 失败后恢复零行为断言 → 状态: fixed（Phase 2 新增「re-renders the canvas when the value changes」+「recovers from a failed render when the value changes」用例——qrcode.test.tsx 9 → 11；Phase 3 宿主实证 toDataURL 变化）
- [P3-1] 空值（undefined/null/''）三态路径合并为一（:19-24 强转 + :51 valueStr.length 守卫）——语义等价 → keep

## 组合宿主场景（真实浏览器验证）

- 场景: qrcode value 更新 canvas 重绘（host-qrcode-update，Phase 3）| 断言: c6-4-host-surfaces.spec.ts——scope 按钮切换 value：canvas toDataURL 变化（新旧码矩阵不同）+ label 随值更新；切回空值 → 空态回退；再切有效值 → canvas 恢复（失败后恢复路径真机实证） | 结果: **pass**（Phase 3 宿主全绿）

## 修复记录

- P2-3（Phase 2 测试）：qrcode.test.tsx 新增 2 用例（value 变更重绘 + 失败后恢复）
- 验证: `pnpm --filter @nop-chaos/flux-renderers-content typecheck/build/lint/test` 全绿（267 tests 含新增回归）

## Closure

- 全卡复查（Phase 4）：18 维表结论与最终代码一致；P0 ×0 / P1 ×0 / P2 ×2（lab 页 fixed、测试盲区 fixed）/ P3 ×2 keep；卡状态 `closed`
- 独立 closure audit: pass（mission-driver CLOSURE_VERIFY fresh session `MISSION_DRIVER:2026-08-05-065620-mission-driver`，2026-08-05——live repo 核对卡结论与最终代码一致；详见 plan `2026-08-04-1757-2` Closure Audit Evidence）
