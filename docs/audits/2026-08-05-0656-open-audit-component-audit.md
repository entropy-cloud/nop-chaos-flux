# Open-Ended Adversarial Audit — Mission `component-audit`

> Audit Status: planned（原 open，2026-08-06 处理：P1 发现 F1/F2 已路由——F1 覆盖的扫描 P0/P1 由 `docs/plans/2026-08-06-0529-1-gate-truthfulness-and-finding-routing.md`、`2026-08-06-0529-2-scan-p1-doc-drift-and-coverage.md` 收口，F2 由 `2026-08-06-0529-3-button-href-security-remediation.md` 收口；P2 发现 F3/F4 已移入 `docs/backlog/component-audit-roadmap.md` Follow-up Backlog）
> Audit Type: open-ended
> Mission: component-audit

> 审查日期：2026-08-06（HEAD `07e4a7fc`）
> 方法：按 `docs/skills/open-ended-adversarial-review-prompt.md` 开放式对抗审查。先读 `AGENTS.md`、`docs/index.md`、`react19-best-practices-review.md`、mission json、roadmap、component-audit-checklist、本轮 mission 自有 multi-audit 扫描结果，再对 live 代码/门禁脚本/审计卡/plan 做交叉验证。本轮以「异常信号驱动的追踪」为主：门禁脚本真实退出码、审计卡裁决一致性、plan 基线 vs live 门禁、发现的路由去向。
> 去重：已浏览 `docs/analysis/2026-08-05-multi-audit-component-audit/`（mission 自有 multi-audit 扫描，R1 阶段），其已覆盖的发现（workspace-manifest-deps 5 错误本身、use-designer-shortcuts 零覆盖、oversized gate 命中本身、boundaries.md 漂移、NaN/API surface/terminology 等）不重复报告；本报告只报告**其未覆盖或与其矛盾**的部分。

---

## 发现

### [P1] Multi-audit 扫描的 P0/P1 发现无路由去向，且 CR/CV/CG plan 的基线断言与 live 门禁直接矛盾

**P1 一句话理由**：mission 自有 multi-audit 扫描（R1）发现的硬门禁 P0 与多个 P1 未被任何 plan/roadmap/审计卡引用，CR plan 反而断言「无 open P1 backlog」，CV/CG plan 的 pre-existing red 基线（14 文件）已落后 live（16 文件）——存在 P0 缺陷被静默吸收进「pre-existing red 记录」而无人修复的实质风险。

- **在哪里**：
  - `docs/analysis/2026-08-05-multi-audit-component-audit/01-dependency-graph.md`（维度01-01：`check:workspace-manifest-deps` 5 处未声明 workspace import，评定 P0 硬门禁）；`14-test-coverage.md`（维度14-1 use-designer-shortcuts 零覆盖 P1；维度14-2 oversized gate FAIL P1）；`16-doc-code-consistency.md`（维度01-02 boundaries.md 漂移 P1）
  - `docs/plans/2026-08-06-0329-1-cr-*.md:18`：**「P1 债务：全部 C 阶段 P1 均已同 plan 修复（live 核对：无 open P1 backlog），CR 无 P1 修复义务」**
  - `docs/plans/2026-08-06-0329-2-cv-*.md:73`：`pnpm check` pre-existing red 集只记 `check:oversized-code-files 14 文件 >700 行`
  - `docs/plans/2026-08-06-0343-1-cg-*.md:37`：**「不处理 `pnpm check` 既有 pre-existing red……治理归属 successor，非本 plan 修复面」**
- **是什么**：CR/CV/CG 三个 plan 的起草与独立 review（08-06 03:29–03:43）均发生在 multi-audit 扫描（08-05 目录、R1 态）之后，但三个 plan 都未引用扫描结果，且断言与 live 门禁矛盾。live 实测（本审查执行）：
  - `node scripts/check-workspace-manifest-deps.mjs` → **exit 1**，5 条 ERROR（form ×2、scheduling ×3）——硬门禁 FAIL，且是扫描裁定为 P0 的项；
  - `node scripts/check-oversized-code-files.mjs` → **exit 1**，16 文件超 700 行（非 plan 所记 14 文件），其中 `tests/e2e/component-lab/coverage-manifest-entries.ts`（816 行）由 mission 自身 commit `aa56bd20`（C8.2）创建，`wizard-renderer.tsx` 734→774 亦为 mission C5.1 期间增长（08-04 log 自述）——「pre-existing red」归类不成立，至少 2 个新命中是 mission 自己引入的；
  - `useDesignerShortcuts`（`packages/flow-designer-renderers/src/use-designer-shortcuts.ts`）全仓测试引用 = **0**（扫描 P1 属实）。
- **为什么值得关心**：CV Phase 1 的机制是「先记录既有 pre-existing red 集，再核对新增命中」——由于基线数字（14）与实况（16）不符、且 workspace-manifest-deps 完全不在任何 plan 记录中，CV 执行时要么把 mission 自引门禁错误归为 pre-existing，要么把扫描 P0 当「新增命中」临时记录；而 CG 明确把治理推给「successor」，CR 明确「无 P1 修复义务」——三 plan 之间这条 P0 没有 owner。mission 以「full-green」收尾的承诺（AGENTS.md 提交规范）将被一条未命名拥有者的硬门禁 FAIL 击穿。
- **信心水平**：确定（门禁退出码与计数已 live 复现；三个 plan 文本均已读；全仓 grep 无路由引用）。

### [P1] 同根安全缺陷（href `javascript:` URI）在 link 裁定 P0 立即修复、在 button 裁定 P2-3 延后 CR——裁决不一致且漏洞 live 暴露中

**P1 一句话理由**：同一根因、同为「任意 URL/XSS 面」的安全缺陷，`content/link` 按 mission checklist 的 P0 定义（安全漏洞、任意 URL）当轮自动修复（bug 80），`basic/button` 却裁定 P2-3「shared 归 CR」，live 代码至今仍直出 `href`——违反 mission 自身 checklist §3 的 P0 裁决规则。

- **在哪里**：
  - `docs/audits/per-component/link.md`（维度 7/18：`href` 无 URL 协议校验 → **P0-1**，同轮修复）
  - `packages/flux-renderers-content/src/link.tsx:25-32`（`isSafeNavigationUrl` 门禁，bug 80）
  - `docs/audits/per-component/button.md:40`：**P2-3 href URL 协议校验缺失（`button.tsx:227-232`；与 content `link.tsx` 同源，根因公共）→ 状态: open（shared，归 CR 集中裁决；本 plan 仅记录）**
  - `packages/flux-renderers-basic/src/button.tsx:238-244`：`<a href={props.props.href} target={props.props.target}>` 直出，无任何协议校验（live 复核确认）
- **是什么**：同根同型缺陷（数据绑定 href 可注入 `javascript:`/`data:` URI 点击执行），link 被裁 P0 并立即修复（`isSafeNavigationUrl`，`docs/bugs/80`），button 被裁 P2-3 且审计卡仍 `open`、组件卡却已 `closed`。button 卡自己写明「与 content link.tsx 同源，根因公共」。CR plan Goals 确实列入了 button 协议校验（已登记），但：
  1. 按 checklist §3 P0 定义（安全漏洞/XSS/任意 URL → 审计当轮自动修复，不等批量），C1.3 轮本应裁 P0 并 test-first 修复，实际只登记；
  2. 裁决不一致（同缺陷 link=P0、button=P2-3）使「安全红线」维度的可信度受损；
  3. 自 08-03 C1.3 起该漏洞面在 live 代码中长期暴露，直到 CR 执行（计划中、未开始）。
- **为什么值得关心**：低代码引擎的 schema 常由服务端/第三方配置驱动，`href` 绑定数据源记录时 `javascript:` URI 是既定 XSS 攻击面（link 卡同款论证）。同缺陷在 C6.1 被当作 P0 当天修掉，在 C1.3 却排队三周进 CR——要么 link 的 P0 是误裁（则 bug 80 属过度），要么 button 的 P2-3 是漏裁（则当前存在未修安全面），两者必居其一，都是裁决系统性问题。
- **信心水平**：确定（代码与两张卡均已 live 复核；CR 已登记故修复路径存在，但裁决不一致与暴露时长是事实）。

### [P2] mission json 组件计数陈旧：`missions/component-audit.json` 写 112，roadmap C0 已更正为 113

**P2 一句话理由**：mission 定义文件未随 C0 裁定同步（`button-group-select` 注册后 112→113），属文档漂移，非行为缺陷。

- **在哪里**：`missions/component-audit.json:3`（「对全部 9 个 renderer 包的 112 个注册组件」）vs `docs/backlog/component-audit-roadmap.md:63,109`（「组件合计 **113** 个注册组件……差异（form 20→21 计入 button-group-select）已回写本表」）
- **是什么**：mission json 的 description 仍写 112 个注册组件，C0 已按 live 注册定义核对更正为 113 并回写 roadmap；审计卡实际 113 张（`docs/audits/per-component/` 113 卡 + README），与 roadmap 一致，仅 mission 定义文件陈旧。
- **为什么值得关心**：mission json 是 mission-driver 的权威输入，计数陈旧会在后续 mission 复盘/续跑时造成「少审计 1 个组件」的误读；修正成本一行。
- **信心水平**：确定。

### [P2] `swipe-cell.tsx:46-50` 的 `openStateRef` effect-mirror 冗余：handlers 已在同一调用内同步写 ref

**P2 一句话理由**：ref 镜像 effect 与 handler 内同步写 ref 重复实现同一状态同步，注释还将其描述为「同步更新」的承担者（实际承担者是 handler），属冗余代码 + 误导性注释。

- **在哪里**：`packages/flux-renderers-mobile/src/swipe-cell.tsx:41-50`（useEffect 镜像 `openState → openStateRef`，注释声称「ref is updated synchronously on every state transition」）；对照 `:129`、`:142`（closeCell/openCell 均先同步写 ref 再 setOpenState），全文件 `setOpenState` 仅此两处且都被同一 handler 内 ref 赋值覆盖。
- **是什么**：`openStateRef` 的同步性由 handler 内的 `openStateRef.current = 'closed'/'open-left'` 保证；`:46-50` 的 effect 只在 commit 后重放相同值，对快速连续手势的守卫无增量贡献（ref 早已是新值）。此 effect 既非「外部同步」场景，也不承担注释声称的职责。
- **为什么值得关心**：本文件正是 MA-02（StrictMode 双派发）教训的产物，effect-mirror 模式本身是 react19-best-practices-review.md 反对的「effect+state 镜像」；此处虽无害（幂等赋值），但注释把职责归于错误代码，后续维护者可能据此在新组件复制该冗余模式。纯净化项。
- **信心水平**：很可能（唯一风险：未来若新增第三条 `setOpenState` 路径，effect 才有意义；当前无）。

---

## 总评

这个 mission 的执行密度和纪律性令人印象深刻——113 张卡全 closed、CX-1..CX-12 共性修复全部落地、每族宿主场景 + bug-73 专项、独立 closure audit 证据链完整，我抽查的 swipe-cell/notice-bar/use-touch/gantt 修复均与卡内声明一致，不是「纸面 green」。**最值得关注的方向有三**：

1. **门禁红绿灯与 plan 文本的脱节**（F1）。mission 用「workspace 32tc/32build/32lint + 59 test」四命令定义 full-green，但仓库自己的 `pnpm check` 链（含 `check:workspace-manifest-deps`、`check:oversized-code-files`）当下就是红的，且这三条红里有 mission 自己引入的（coverage-manifest-entries.ts）。CR「无 P1 修复义务」、CV「记录 pre-existing」、CG「归 successor」——三个 plan 恰好把这条 P0 推出门外。若 mission 以 CV 的「0 failed + full-green 提交」收尾，而 `pnpm check` 仍红，则「full-green」一词在仓库语境下的可信度将被稀释。修复成本极低（manifest devDeps 补 3 个包、拆 1 个 816 行 manifest 文件），建议 CR/CV 任一方显式认领。
2. **安全裁决的一致性**（F2）。同一根因缺陷在 C6.1 是 P0 当天修，在 C1.3 是 P2-3 排队进 CR。安全类发现需要跨 plan 的 severity 对账机制（或至少 checklist 里写明「同根同型缺陷跨族时以已裁定 severity 为准」），否则漏洞修复时效取决于「哪个族先审到」。
3. **mission 自有审计产物的路由闭环**（F1 后半）。multi-audit 扫描 R1 结果已落盘但无任何 plan/roadmap/卡引用，而 CR/CV/CG 的基线断言与扫描结论直接冲突。审计产物的「发现→裁决→认领」链路需要显式环节（如 roadmap 加一行「扫描结果裁决归 CR Phase 0」），否则每次扫描的 P0/P1 都可能成为下一轮的「pre-existing red」。

## 盲区自评

- **未执行全量 `pnpm test`/`pnpm test:e2e`**：本审查只跑了静态门禁脚本（含 `check:audit-*` 全家，均 exit 0 或按预期命中）与 `check-active-doc-code-anchors`（exit 0，302 文档锚点有效），未跑 full suite（时间成本与 CV 职责重叠）。若 CV 前发现「单测绿但门禁红」之外的行为回归，本轮会漏。
- **未逐卡核验 113 张卡的 18 维结论**：只抽查了 swipe-cell/gantt/link/button 四张卡与代码对账。卡的「结论/证据」列与 live 代码的逐维一致性只验证了约 3%；对 closure audit 的「独立复核」质量本身未做 meta-审计。
- **multi-audit 扫描处于 R1/待复核态**：其 8 个维度文件中除已列条目外还有若干 P2（NaN 宽度、unpkg CDN 默认 URL、terminology 词条等）与更多 P1 候选未逐条核对 live；若下一轮从「扫描裁决」切入，建议先补完 R2 复核再决定路由。
- **未做性能/并发类探针**（大列表、并发 dispatch、streaming backpressure）：本轮无此类信号出现，盲区自认。
