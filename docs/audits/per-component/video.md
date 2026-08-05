# 审计卡：video（flux-renderers-content）

> 状态: closed
> 审查日期: 2026-08-05
> 审查 plan: `docs/plans/2026-08-04-1757-2-c6-4-content-media-family-audit.md`
> 注册定义: `packages/flux-renderers-content/src/content-renderer-definitions.ts:434` | 渲染器: `packages/flux-renderers-content/src/video.tsx:12` | design.md: `docs/components/video/design.md` | playground: `apps/playground/src/pages/w4a-multimedia-demo.tsx:79`（demo-video + demo-video-empty）+ `apps/playground/src/component-lab/renderers/video-lab-page.tsx`（Phase 3 补）| e2e: `tests/e2e/w4a-multimedia-family.spec.ts:38` + `tests/e2e/component-lab/c6-4-host-surfaces.spec.ts`（本组件宿主场景新增）

## 组件身份

video / flux-renderers-content / VideoSchema（`schemas.ts:310-330`）/ defaultSchema `{type:'video'}` / 表单参与: 否 / widget 媒体展示组件（自样式 figure 壳 + 原生 `<video>`，`src` 只读 prop，`errored` 为局部 UI 态）。

## 18 维审查记录

| #   | 维度                        | 结论 | 证据                                                                                                                                                                                                                                                                                                                                                                                                                             | 发现 |
| --- | --------------------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 1   | Schema 契约                 | pass | VideoSchema（schemas.ts:310-330：src/poster/autoPlay/loop/controls/muted/width/height/title/onLoadError）↔ 注册 fields（content-renderer-definitions.ts:440-451 全清单 prop + title value-or-region + onLoadError event）↔ 渲染器消费（video.tsx:14-32）三方一致；defaultSchema `{type:'video'}` 一致；controls 默认 true 与 schema 注释（:320）一致                                                                             | —    |
| 2   | RendererComponentProps 合规 | pass | 仅读 props.props/meta/events（video.tsx:13-32）；region 内容经 resolveRendererSlotContent/hasRendererSlotContent（:30-31）；无 store 直访、无 ad-hoc context                                                                                                                                                                                                                                                                     | —    |
| 3   | 值所有权三态                | n-a  | 无 value 字段（schemas.ts:310-330 无 value/valueOwnership/valueStatePath）；`src` 为只读 prop；`errored` 为 renderer 局部 UI 态（video.tsx:34，design §7「播放态属于组件局部交互状态」一致）                                                                                                                                                                                                                                     | —    |
| 4   | 表单参与                    | n-a  | 非表单字段（无 name/required/validation）                                                                                                                                                                                                                                                                                                                                                                                        | —    |
| 5   | DOM 与选择器契约            | pass | 根 `nop-video` marker（video.tsx:52/:69）+ data-slot="video" + data-state empty/error（:51/:68）+ testid/cid 透传（:48-49/:66-67）；原生元素 data-slot="video-media"（:72）+ 属性透传 src/poster/autoPlay/loop/controls/muted/onError（:73-79）+ width/height 样式透传（:22-29/:80）；poster img data-slot="video-poster"（:55）；title figcaption data-slot="video-title"（:83）；`check:audit-missing-renderer-markers` 0 命中 | —    |
| 6   | 嵌套 schema 分类            | pass | 08-02 机制核对：src/poster/autoPlay/loop/controls/muted/width/height 全 prop（:441-448）+ title value-or-region（:449）+ onLoadError event（:450）——与 08-02 声明一致；无 deepFields 残留（live grep 零命中）                                                                                                                                                                                                                    | —    |
| 7   | 事件与 action 契约          | pass | onLoadError 派发（video.tsx:40-43，`void onLoadError?.()`）——无 payload 事件，与 image 同族先例（image.tsx:156，C6.1 裁定 pass）一致；error 触发即持久失败态 + 事件派发双路径                                                                                                                                                                                                                                                    | —    |
| 8   | a11y                        | pass | 原生 `<video controls>` 自带播放器语义与键盘操作；figure+figcaption 语义（标题/回退文本可读）；poster alt="" 装饰性（:55）                                                                                                                                                                                                                                                                                                       | —    |
| 9   | i18n                        | pass | 回退文案走 `t()`（video.tsx:58：flux.common.loadFailed/noSource，en-US.ts:19-20 + zh-CN.ts:20-21 存在）；`check:i18n-keys` 通过                                                                                                                                                                                                                                                                                                  | —    |
| 10  | 四态覆盖                    | pass | 空态（无 src → data-state=empty + noSource 回退，:45-61）；错误态（onError → data-state=error + loadFailed 回退 + onLoadError 派发，:45-61，video.test.tsx:70-82 实证）；禁用/加载态 n/a（原生媒体元素）                                                                                                                                                                                                                         | —    |
| 11  | 异步生命周期                | pass | **src 变更即清除 errored**（video.tsx:36-38 useEffect [src]——image P1-1 sticky-errored 同型缺陷在此不存在）；媒体加载失败经原生 onError 同步置错（:40-43）；无 fetch/abort/竞态面；卸载无监听器残留                                                                                                                                                                                                                              | —    |
| 12  | 组合宿主场景                | pass | 单测：video.test.tsx 7 用例（原生元素/属性透传/muted/空态/错误回退+onLoadError/title region）；真实浏览器：w4a demo-video + demo-video-empty（w4a-multimedia-family.spec.ts:38-57）；Phase 3 宿主新增（dialog 内加载 + 错误回退——bug 73 模式专项）                                                                                                                                                                               | —    |
| 13  | 样式契约                    | pass | widget 自样式：video style maxWidth 100% + borderRadius（:24-29）、poster `max-w-full rounded-md`（:55）、回退/标题 text 系（:57/:83）为 widget 内布局；cn() 合并 meta.className（:52/:69）；无 BEM；主题 token 驱动                                                                                                                                                                                                             | —    |
| 14  | React 19 规范               | pass | 无冗余 memo/callback；useEffect 仅外部同步（src 变更重置 errored，:36-38）；无 effect+setState 镜像                                                                                                                                                                                                                                                                                                                              | —    |
| 15  | 性能边界                    | pass | 渲染路径 O(1)；无订阅/监听器（原生元素生命周期）；width/height 仅影响 style 对象                                                                                                                                                                                                                                                                                                                                                 | —    |
| 16  | 测试质量                    | pass | 7 用例断言正确行为（原生元素属性/透传/muted/空态/错误回退+onLoadError 次数/title）；DOM 契约断言（data-slot/data-state/marker class）；**盲区**：src 变更后错误恢复路径零断言（:36-38 实现未锁）；width/height 样式透传零断言 → P2-3 修复时补                                                                                                                                                                                    | P2-3 |
| 17  | 文档对照                    | fail | design.md §4 字段（src/poster/title/autoPlay/loop/controls/muted）**缺 width/height**（VideoSchema:324-327 已实现）；**onLoadError 事件未在 design.md §8 记录**（§8 仅「后续可支持 component:play/pause」）——实现/schema/注册已落地、文档缺记录 → **P2-2**（Phase 2 补文档）                                                                                                                                                     | P2-2 |
| 18  | 注册、包边界与 IO/安全红线  | pass | 单注册（:434）+ src/index.ts:51 导出 + registerContentRenderers（:60）✓；无浏览器 IO 直调（原生媒体元素资源加载非 JS IO API）；无 dangerouslySetInnerHTML；media src 无 XSS 面（javascript: URL 在媒体资源加载上下文不执行脚本）；**component-lab lab 页缺失** → P2-1（Phase 3 补）                                                                                                                                              | P2-1 |

## 发现清单

- [P0] 无
- [P1] 无
- [P2-1] component-lab lab 页缺失（维度 18 缺口）→ 状态: fixed（Phase 3 新增 `video-lab-page.tsx`）
- [P2-2] design.md §4 缺 width/height 字段记录 + §8 未记录 onLoadError 事件（实现/schema/注册已落地，文档缺记录）→ 状态: fixed（Phase 2 补 design.md §4/§8 文档）
- [P2-3] 测试盲区：src 变更后错误恢复路径 + width/height 样式透传零断言 → 状态: fixed（Phase 2 新增「clears the error state and retries when src changes after a load failure」+「passes width and height through as inline styles」用例，video.test.tsx 7 → 9）
- [P3-1] 失败/空态回退文本无 aria-live 公告（媒体错误为被动场景）→ keep

## 组合宿主场景（真实浏览器验证）

- 场景: 媒体元素在 dialog 内加载 + 错误回退（host-media-dialog/host-media-error，Phase 3，bug 73 模式专项）| 断言: c6-4-host-surfaces.spec.ts——openDialog 打开媒体面板：data URI video 正常加载（video-media 元素存在 + muted 属性）+ 缺失 src 显示 error 回退 + onLoadError probe 派发；dialog 关闭后重新打开无异常 | 结果: **pass**（Phase 3 宿主全绿）

## 修复记录

- P2-2（Phase 2 文档）：`docs/components/video/design.md` §4 补 width/height、§8 补 onLoadError 事件记录
- P2-3（Phase 2 测试）：video.test.tsx 新增 2 用例（src 变更恢复 + width/height 透传）
- 验证: `pnpm --filter @nop-chaos/flux-renderers-content typecheck/build/lint/test` 全绿（267 tests 含新增回归）

## Closure

- 全卡复查（Phase 4）：18 维表结论与最终代码一致；P0 ×0 / P1 ×0 / P2 ×3（lab 页 fixed、design.md 文档 fixed、测试盲区 fixed）/ P3 ×1 keep；卡状态 `closed`
- 独立 closure audit: pass（mission-driver CLOSURE_VERIFY fresh session `MISSION_DRIVER:2026-08-05-065620-mission-driver`，2026-08-05——live repo 核对卡结论与最终代码一致；详见 plan `2026-08-04-1757-2` Closure Audit Evidence）
