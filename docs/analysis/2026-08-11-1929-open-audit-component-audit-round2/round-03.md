# Round 03 — 审计卡去重核验与残余细化（barcode/wizard/steps/timeline 卡）

> 执行批次：`2026-08-11-1929-open-audit-component-audit-round2`（mission `component-audit-round2` 开放式对抗审查）
> 视角：契约考古学家（审计卡 vs live 代码 vs 文档三方核验）
> 去重背景：对 round-01/02 全部 P1/P0 候选逐条回查 `docs/audits/per-component/` 卡片与 CR plan 修复记录，确认未登记/为残余。

## 发现 R3-F1（P2）— timeline 审计卡已过时：卡声称「无 value/defaultValue/owner 状态」，live 代码已有完整三态 ownership

- **在哪里**：`docs/audits/per-component/timeline.md` dim 3（"无 owner 状态（display-only）…无 value/defaultValue/valueOwnership 声明"）vs `timeline-renderer.tsx:135-161`（computeInitial/scope 分支/`renderScope.update(statePath, next ?? null)` 全在）+ `process-display-definitions.ts:98-139`（value/defaultValue/valueOwnership/valueStatePath 已声明）。
- **是什么**：C5.2 之后 timeline 获得 owner 三态（与 steps 同型），但卡片未更新——后续读者按卡判断 timeline "display-only" 会漏掉 scope 模式的全部行为（含 round-01 R1-F5 的 null 复活模式第三实例）。
- **修复方向**：卡片补记 owner 三态落地 + 对应 P2（R1-F5 第三实例）。
- **信心水平**：确定（卡文本 vs live 代码直读）。

## 发现 R3-F2（P2）— barcode-input 审计卡 closure 声称文档漂移已同步，live design.md 仍保留「continuousScan 默认 true」与「wasmUrl 默认公共 CDN」

- **在哪里**：`docs/audits/per-component/barcode-input.md` P3-1（"文档漂移…→ 状态: fixed（CR plan Phase 4 dim 17 同步）"）vs `docs/components/barcode-input/design.md:40`（"是否连续扫描（默认 true）"）与 `:42`（"默认使用公共 CDN"）；代码 `barcode-input.tsx:346`（`resolved.continuousScan === true`，默认 false）与 `prepare-wasm-utils.ts:13-16`（fail-closed，无 wasmUrl 即抛错）。
- **是什么**：卡声称的 doc 同步未覆盖这两个字段——closure 证据与文件实际状态矛盾（与 multi-audit P2-34 同模式）；离线横幅问题（round-01 R1-F9）也只在文档侧标注「未实现」，UI 横幅文本（"scans will auto-submit when reconnected"）仍向用户承诺不存在的行为。
- **修复方向**：design.md 两处同步为实际默认值；离线横幅文案改为「本地暂存」；卡 closure 证据补注。
- **信心水平**：确定（三方直读）。

## 发现 R3-F3（P2）— wizard 卡 P1-2 修复后文档文本被改写回「when numeric and no matching key」，与实现（数值永不 key 匹配）再次漂移

- **在哪里**：`docs/audits/per-component/wizard.md` P1-2（"实现：schemas.ts JSDoc + definitions 描述改「0-based index」"）vs 当前 `schemas.ts:33`（"0-based index **when numeric and no matching key**"）。
- **是什么**：卡证明 P1-2（1-based vs 0-based 漂移）已修；但当前文档措辞「key or index（0-based index when numeric and no matching key）」暗示数值先尝试 key 匹配，与实现（wizard-renderer.tsx:92-94 数值直接 clamp 为 index）不符——即 round-01 R1-F7 的文档契约漂移是 P1-2 修复后的**二次漂移**（新文本引入），非旧问题重报。
- **修复方向**：并入 R1-F7 收口（数值先 key 匹配或文档去掉 "when numeric and no matching key" 措辞）。
- **信心水平**：确定。

## 本轮核验结论

- round-01 的 R1-F1（barcode 检测死循环）不在 barcode 卡任何条目内（卡 dim 11 只记 double-dispatch/result 不清除，均已修）——新发现确认。
- round-01 的 R1-F3（wizard 提交期间导航竞态）与卡 P3-3（同 tick 双击 Next）不同——P3-3 是重复提交防护，本发现是导航与提交交错，未登记。
- round-01 的 R1-F8（stepError 不渲染）为卡 P2-2 修复的残余：错误盒已存在，但只显示通用 i18n 串，catch 分支捕获的真实 `error.message`（wizard-renderer.tsx:438）仍不进 UI。
- round-01 的 R1-F6（collapse 种子倒序）：steps 卡 P2-2 证明 C5.2 只修了 steps/button-group，collapse 未登记——确认新实例。
- round-02 的 R2-F1（相对日期集成断裂）在 input-date 卡仅出现「resolveRelativeDate 同步求值」一句，无集成断裂登记——确认新发现。
