# Flux 模块代码检查汇总（SUMMARY）

- 汇总日期：2026-08-20
- mission：`flux-check-roadmap.md`（A–J 十个批次全部 done）
- 范围：36 个包 + apps/playground + 基线工具证据，共 37 份报告（本目录 `00`–`36`）
- 性质：**只读审计**，全程未修改任何产品代码（git 状态仅有 `docs/audits/check/` 新增）

## 总量

| 严重级  | 数量 | 说明                                                |
| ------- | ---- | --------------------------------------------------- |
| P0 缺陷 | 22   | 含 4 条跨包双归因（见下），去重后约 18 条独立缺陷链 |
| P1 隐患 | 113  |                                                     |
| P2 风险 | 206  |                                                     |
| P3 提示 | 296  |                                                     |
| 合计    | 637  | 每条均有 file:line + 代码摘录 + 影响推理            |

## 分包统计

| #   | 包                      | P0  | P1  | P2  | P3  | #   | 包                           | P0  | P1  | P2  | P3  |
| --- | ----------------------- | --- | --- | --- | --- | --- | ---------------------------- | --- | --- | --- | --- |
| 01  | flux-core               | 0   | 2   | 3   | 11  | 19  | renderers-scheduling         | 1   | 8   | 9   | 8   |
| 02  | flux-formula            | 2   | 3   | 5   | 12  | 20  | renderers-industrial         | 1   | 3   | 4   | 10  |
| 03  | flux-compiler           | 0   | 4   | 7   | 8   | 21  | renderers-map                | 0   | 3   | 5   | 9   |
| 04  | flux-action-core        | 0   | 4   | 5   | 10  | 22  | renderers-graph              | 1   | 2   | 5   | 8   |
| 05  | flux-runtime            | 0   | 3   | 5   | 9   | 23  | renderers-pivot              | 1   | 3   | 4   | 6   |
| 06  | flux-react              | 1   | 3   | 6   | 8   | 24  | editor-core                  | 0   | 1   | 6   | 8   |
| 07  | flux-i18n               | 0   | 1   | 2   | 6   | 25  | flux-code-editor             | 1   | 4   | 6   | 6   |
| 08  | flux-bundle             | 0   | 1   | 0   | 3   | 26  | flow-designer-core           | 1   | 3   | 8   | 13  |
| 09  | ui                      | 0   | 2   | 5   | 10  | 27  | spreadsheet-core             | 1   | 9   | 12  | 9   |
| 10  | renderers-basic         | 0   | 2   | 3   | 9   | 28  | report-designer-core         | 0   | 4   | 5   | 7   |
| 11  | renderers-layout        | 0   | 4   | 3   | 9   | 29  | word-editor-core             | 1   | 2   | 5   | 8   |
| 12  | renderers-form          | 1   | 2   | 7   | 9   | 30  | flow-designer-renderers      | 2   | 5   | 9   | 8   |
| 13  | renderers-form-advanced | 0   | 2   | 7   | 7   | 31  | spreadsheet-renderers        | 1   | 5   | 9   | 6   |
| 14  | renderers-data          | 0   | 3   | 6   | 11  | 32  | report-designer-renderers    | 1   | 3   | 8   | 7   |
| 15  | renderers-content       | 0   | 3   | 5   | 11  | 33  | word-editor-renderers        | 1   | 5   | 8   | 11  |
| 16  | renderers-mobile        | 1   | 1   | 6   | 7   | 34  | apps/playground              | 0   | 4   | 5   | 7   |
| 17  | renderers-dashboard     | 2   | 2   | 9   | 7   | 35  | nop-debugger                 | 1   | 3   | 5   | 7   |
| 18  | renderers-ai            | 1   | 1   | 5   | 8   | 36  | tailwind-preset+theme-tokens | 0   | 3   | 4   | 3   |

## P0 清单（22 条，按主题分组）

### 数据丢失 / 数据污染（最高修复优先级）

1. `27-F-01` spreadsheet-core `sortRange` 带 `hasHeader` 排序一次即永久清空表头行；`31-F-06` 确认已发布的 `spreadsheet:sortRange` action 可直达该路径。
2. `33-F-01`（↔ `29-F-01`）word-editor 只读页画布可编辑，篡改经 `debouncedSave` 持久化写入 localStorage 并污染 hostScope（core 未传导 readonly + renderers 无防御，双包归因）。
3. `23-F-01` pivot 过滤器 `JSON.stringify` 签名丢弃函数属性，filterRules 语义修改后双通道全部跳过，过滤器永久失效。
4. `02-F-01` formula 混合 optional 链 `user?.profile.name` 在 user 为 null 时整链抛错而非返回 undefined。
5. `02-F-02` formula `$Date.now()`/`$Math.random()` 被 static-eval 编译期折叠 + runtime 缓存 → 全生命周期返回同一编译期常量（05-F-06 确认无缓存隔离，13 号确认 upload 等消费面）。

### 交互瘫痪（确定性功能失效）

6. `16-F-01` mobile pull-refresh `touch-action: pan-x` 使长列表真机无法垂直滚动（契约文档级缺陷）。
7. `19-F-01` Gantt 网格滚动容器 ref 接错目标，虚拟化窗口冻结在 offset 0、滚动同步双向失效。
8. `22-F-01` graph `panOnScroll` 绑定替换 wheel.zoom handler，默认配置滚轮只能平移不能缩放。
9. `30-F-01` flow-designer graph 模式 `updateNodeData` 命令无处理分支，节点属性编辑全线失败。
10. `17-F-01` dashboard `resizePanel` 对 w/n 轴 5/8 个句柄方向反转（测试固化了错误语义）。
11. `17-F-02` dashboard 运行态硬编码 `canvasWidth=1200`，非 1200px 宿主必溢出/留白。
12. `25-F-01` code-editor mount-only effect + 共用 ref 槽位，`diffValue` 异步到达时 diff 视图永不创建。
13. `31-F-01` spreadsheet-renderers 选区硬编码 `100×26`，超界工作表排序/清除静默截断。
14. `32-F-01` report-designer 画布硬编码 `30×10`，超出模板静默截断不可编辑。
15. `20-F-01` industrial pipe-junction 不消费 `props.custom`，连线增量 diff 被丢弃、新连线不可见。

### 渲染/性能级失效

16. `18-F-01` AI 流式渲染在 React Compiler 构建下因引用稳定 + 元素 memo cache 整体 bail out，token 不逐帧上屏（vitest 未启用 Compiler 故全绿掩盖）。
17. `06-F-01`（↔ `12-F-01`）FormRenderer 渲染期创建 form runtime + runtime 构造尾部同步 publish 写 store → React "Cannot update a component while rendering" 警告 + tearing 风险（双包归因，06 侧定位 flux-react 渲染路径无过错）。
18. `26-F-01`（↔ `30-F-02`）flow-designer `setViewport` 每帧 pushHistory + 全文档深拷贝，一次平移冲掉全部 undo 历史；renderers 侧 onMove 无有效门控 100% 暴露。
19. `35-F-01` nop-debugger 的 `render:start/end`、`action:end` 事件全仓无生产发射端，Overview 渲染指标恒为空（契约断裂被测试假事件掩盖）。
20. `10-F-01`（P1 定级但为基线失败根因）renderers-basic 受控 surface 字面量 `open:true` 分支 dialog 永久卸载不可重开 —— 即基线偏离 2 的 surface-event-ctx 测试失败根因。

> 跨包双归因对：`06/12`（渲染期写 store）、`26/30`（viewport 历史风暴）、`29/33`（readonly 失效）、`01/10/15`（XSS URL 守卫，01 定 P1）。去重后独立 P0 链约 18 条。

## 跨包主题链（修复时建议按链处理）

1. **渲染期副作用**：06/12（创建 runtime + 同步写 store）。修复方向：首次 publish 延迟到 microtask（05 号报告建议）。
2. **非确定性表达式折叠**：02（static-eval）→ 05/13 消费面核实成立。root fix 在 formula 层加非确定性标记并禁止折叠。
3. **shallowEqual 语义边界**：01-F-02（Date/RegExp/Map 恒等）→ 05-F-05 修正真实消费链为 `structuralShareData`。root fix 在 flux-core。
4. **URL 安全校验绕过**：01-F-01（前导空白 `javascript:`）→ 10/15 两处消费点可达。root fix 在 flux-core，测试补消费侧用例。
5. **设计器"demo 尺寸硬编码"同型缺陷**：31（100×26）与 32（30×10），且 27-F-03（frozen/filters 不平移）、28-F-04（元数据键不平移）同属"结构变更后派生状态失同步"家族。
6. **undo/历史污染家族**：24（事务期间可 undo/commit）、26/30（viewport 帧污染）、27（no-op 入栈）、28-F-03（changed=false 仍压栈）、31-F-04（公式栏逐字符入栈）。
7. **i18n 回退链**：07-F-02（bridge 剥前缀骗过未命中判断）→ 09-F-01（ui 回退表死代码）→ 36（暗色双机制分裂）。三条同链，root fix 在 flux-i18n bridge。
8. **受控/非受控生命周期**：10-F-01（surface 字面量 open）、25-F-02/F-03（code-editor reset/外部值同步）、33-F-05（恢复快照遮蔽受控文档）。
9. **门禁盲区**：`check:audit-event-dispatch-ctx` 静态门禁未覆盖 surface-event-ctx 动态行为（基线偏离 2）；`check:i18n-keys` 跨语言对等仅警告不拦截（07-F-03）。

## 基线偏离（00 号报告）

1. `pnpm check` exit 1：`flux-renderers-layout/wizard-renderer.tsx` 716 行，2026-08-12（commit 4152e4840）引入的未注册 ERROR 级超限回归（DV 基线 08-09 之后）。初版误归因 playground 文件（grep 子串 `red` 误匹配 "shared"），已按 34 号质疑修正。
2. `pnpm test` exit 1：`flux-renderers-basic` surface-event-ctx 1 用例失败，root cause 已归因 `use-surface-renderer.ts:213-223`（= `10-F-01`）。**已解决（2026-08-24）**：按 10-F-01 契约修订分支落地（对齐并行 worktree `66476513d` plan 460 B1 已裁决的测试修订，保留 plan 459/460 拆除语义），全量 `pnpm test` 68/68 绿，见 `00-baseline-tooling.md` 偏离 2 解决注记。

## 修复优先级建议（供后续 plan 排期，本 mission 不修复）

1. **先修数据丢失链**：27/31（sort 表头清空 + action 暴露）、29/33（只读篡改持久化）、23（pivot 过滤失效）、02（公式求值两处）。
2. **再修交互瘫痪**：16/19/22/30-F-01/17/25/31-F-01/32-F-01/20-F-01。
3. **性能与渲染语义**：18（Compiler 流式）、06/12（渲染期写 store）、26/30（viewport 风暴）。
4. **门禁修复项**：wizard-renderer.tsx 拆分（恢复 `pnpm check` exit 0）+ surface-event-ctx 修复（恢复单测全绿）——这两项同时是恢复 DV 基线可信度的前置。
5. 修复一律另立 plan（受保护区域 plan-first），引用本目录对应报告的 finding 编号。
