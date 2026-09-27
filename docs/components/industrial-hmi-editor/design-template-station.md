# 模板库 + 站点/多画面管理设计 design-template-station.md

> 日期：2026-09-26
> 版本：v1（plan 522 / L5.4，gap audit `docs/analysis/2026-09-26-scada-designer-demo-gap-audit.md` §4.3 D2）
> 上游：`design-architecture.md` §4.5（编辑会话 + save/load 提交语义）、`design-renderer.md` §4.1（scada-editor-canvas schema）、gap audit §2.3（clipboard 复用面）、`docs/bugs/` 无（零代码基础全新面）
> 下游：`packages/flux-renderers-industrial/src/editor/{template,station}/`（落地）、toolbox 弹层接线、playground demo

## 1. 组件定位

- 本档定义编辑器两个全新产品面：**模板库**（把选区子树保存为可复用片段 → 列表管理 → 实例化插回画布）与**站点/多画面管理**（一个站点 = 多个画面文档的宿主持久化集合，画面间切换）。
- **约束（gap audit D2 原文）**：不动 serialization 既有格式——模板体与画面文档均为既有 `ScadaConfig`/`ScadaSymbolNode` 结构的**原样复用**，本档不新增任何序列化格式字段。
- **持久化责任边界**：包内**只提供模型 + UI 壳**；落盘（服务端/localStorage/文件）归**宿主**经注入的 storage 回调实现。demo 用包内附带的内存 store。

## 2. 模型契约

### 2.1 模板（template = 可实例化片段）

```typescript
interface ScadaTemplate {
  id: string; // 模板唯一 id（宿主/内存 store 生成）
  name: string; // 显示名（用户输入）
  createdAt: number; // 保存时间戳
  symbols: ScadaSymbolNode[]; // 片段体 = 顶层图元数组（含 group 子树），serialization 原样结构
}

interface ScadaTemplateStorage {
  listTemplates(): Promise<ScadaTemplate[]>;
  saveTemplate(template: ScadaTemplate): Promise<void>;
  deleteTemplate(id: string): Promise<void>;
}
```

- 片段体是**顶层 `ScadaSymbolNode[]`**（同 `ScadaConfig.symbols` 元素结构 + diff `added` 通道同构）——不含 `ScadaConfig` 包皮（variables/viewport 不属于片段语义）。
- **不变式**：保存 = deep clone 选区子树（保存后编辑画布不回流模板，模板保存后改画布不污染模板）；实例化 = deep clone + id 重分配（插入后编辑模板体不回流画布）。

### 2.2 站点/画面（station = 画面集合的宿主持久化契约）

```typescript
interface ScadaScreenMeta {
  id: string; // 画面唯一 id
  name: string; // 显示名
  updatedAt: number; // 最近保存时间戳
}

interface ScadaStation {
  id: string;
  name: string;
  screens: ScadaScreenMeta[]; // 画面元数据集（有序）
}

interface ScadaStationStorage {
  loadStation(): Promise<ScadaStation | null>; // 站点不存在返回 null（UI 引导新建）
  saveStation(station: ScadaStation): Promise<void>; // 元数据整体保存（screens 增删改名）
  loadScreen(screenId: string): Promise<string | null>; // 画面文档 = serializedConfig 字符串（serialization 原样）；未保存返回 null
  saveScreen(screenId: string, serializedConfig: string): Promise<void>;
  deleteScreen(screenId: string): Promise<void>;
}
```

- **画面 = 一个 serialization 文档**：`loadScreen`/`saveScreen` 的载荷就是 `serializeScadaConfig`/`parseScadaConfig` 消费的字符串——**格式零新增**。画面切换 = 「save 当前 working copy → `runtime.load(目标画面文档)`」（既有 load 语义：替换 working copy + 重置 undo 栈，`design-architecture.md` §4.5 边界 3——切换即历史清空，UI 文案显式提示）。
- station 元数据与画面文档分离存储（meta 集合轻量、文档按需加载），是宿主持久化的**建议形态**而非强制（宿主可在一个后端实体上实现双回调）。

## 3. 纯逻辑契约（域核心，无 React / 无 IO 依赖）

### 3.1 选区 → 模板体：`collectTemplateSource(symbols, selection): ScadaSymbolNode[]`

- 对 selection 中每个 id，取其**最顶层被选祖先**（选中父 + 选中子并存时只收父，防重复嵌套保存）；无选中祖先则取节点自身。
- 输出 deep clone（`cloneNodeDeep` 语义，clipboard 同源）；未命中任何节点的 selection 返回 `[]`（UI 显示「先选中图元」）。

### 3.2 模板 → 画布节点：`instantiateTemplateNodes(nodes, existingIds, startCounter, offset?)`

- **复用 clipboard 管线**（`toolbox/clipboard.ts` `buildClipboardPaste`，零重复实现）：deep clone + id 碰撞自增（`-copy-<n>` 后缀，含 group 子树 + connection target/id 重写）+ 位移偏移（缺省 `PASTE_OFFSET` +20/+20，模板插入可用 `{0,0}` 原位插入）。
- 返回 `{ nodes, newIds, counterConsumed }`——调用方经 `runtime.addWorkingSymbol` 逐个入栈（单 undo entry 由既有 addWorkingSymbol 语义保证……多节点逐个调用产多条 entry，属可接受 M1 语义，见 §7 边界）。

### 3.3 内存 store：`createInMemoryTemplateStorage()` / `createInMemoryStationStorage()`

- Map 承载 + Promise 化回调 + `id` 生成器（`tpl-<n>` / `scr-<n>`）；demo / 单测 / e2e 共用。非持久化（刷新即失），不替代宿主存储。

## 4. UI 契约（toolbox 弹层，plan 521 U1/U2/U3 同型）

### 4.1 模板库弹层（`EditorTemplateDialog`）

- 入口：toolbox 新增「模板」按钮（`toolbox-btn-template`）→ Dialog（`scada-editor-toolbox-template` slot）。
- 三段：① 保存区（名称输入 + `保存选区为模板` 按钮，selection 为空时 disabled）→ 组装 `ScadaTemplate` → `storage.saveTemplate`；② 模板列表（名称 + `插入` + `删除`，空态文案）；③ 关闭。
- `插入` → `instantiateTemplateNodes` → 逐个 `runtime.addWorkingSymbol` → 状态条反馈插入数。
- storage 未注入时弹层显示「未接入模板存储」提示（UI 壳可独立存在，宿主按需接线）。

### 4.2 站点/画面弹层（`EditorStationDialog`）

- 入口：toolbox 新增「画面」按钮（`toolbox-btn-station`）→ Dialog（`scada-editor-toolbox-station` slot）。
- 行为：
  - 打开时 `loadStation()`；null → 显示「新建站点」（名称输入 → `saveStation({screens:[]})`）。
  - 画面列表（name/updatedAt + `切换` + `删除`）+ `新建画面`（名称输入）。
  - `保存当前画面`：`serializeScadaConfig(workingCopy)` → `saveScreen(当前画面id, serialized)` + 更新 meta `updatedAt` → `saveStation`。
  - `切换`：先保存当前画面（自动，防丢编辑）→ `loadScreen(目标)` → `runtime.load(serialized)`（文档 null = 从未保存 → `runtime.load({version:1,variables:[],symbols:[]})` 空场景）。
  - 当前画面 id 属弹层本地 state（打开时缺省取 `screens[0]`；**不入 session**——多画面管理是宿主/站点域状态，编辑会话只认 working copy，R5 边界不破）。
- 画面/站点操作不进 undo 栈（load 语义本身清栈；元数据操作不是画布编辑操作）。

## 5. schema 契约

`ScadaEditorCanvasSchema` 新增两个可选 **host 注入 props**（对象通道，D-1 同型——宿主以对象字面量注入回调，不经编译期深求值，fields 注册 `kind:'ignored'`，renderer 侧 `props.schema.<key>` raw 读取 + props 通道兜底）：

| prop              | 类型                   | 缺省                            |
| ----------------- | ---------------------- | ------------------------------- |
| `templateStorage` | `ScadaTemplateStorage` | undefined（弹层显式提示未接入） |
| `stationStorage`  | `ScadaStationStorage`  | undefined（同上）               |

- 经 `props.props` → `EditorToolboxPanel` → 两弹层透传（toolbox region 自定义时由宿主 region 自行消费 storage——默认弹层只是参考实现）。
- 包公共面（`/editor` subpath）导出：`ScadaTemplate`/`ScadaTemplateStorage`/`ScadaStation`/`ScadaStationStorage` 类型 + `createInMemoryTemplateStorage`/`createInMemoryStationStorage` 工厂。

## 6. i18n

新增键（zh/en，`industrial.scada.editor.template.*` / `.station.*` + toolbox label 短键 `template`/`station`）：标题/描述/保存/插入/删除/空态/未接入存储/新建站点/新建画面/切换/保存当前画面/切换提示（undo 栈清空）/名称占位 等；详见 locales 落地。

## 7. 边界与风险

| 项                         | 裁定                                                                                                                                  |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 多节点模板插入的 undo 粒度 | 逐节点 `addWorkingSymbol` 产 N entry（M1 可接受；合并单 entry 需 mutator 层批量通道，归后继按需）                                     |
| storage 异步与弹层竞态     | 弹层 open 时拉取一次 + 操作后刷新；不做乐观锁/冲突合并（宿主持久化域职责）                                                            |
| 模板跨站点/跨画面引用      | 片段体是纯结构复用——bindings 引用的点 id 不随模板走（目标画面无该点声明时 validate 给 dangling 反馈，行为与手工绘制一致，不特殊处理） |
| serialization 格式         | **零新增字段**（模板体/画面文档均为既有结构）；`ScadaTemplate`/`ScadaStation` 信封是宿主存储域对象，不进 `serialization/`             |
| R5 双态隔离                | 模板/画面操作是画布编辑操作（edit 域）；preview 态弹层入口随 toolbox inert（既有 disabled 门禁覆盖）                                  |

## 8. 实现拆分

```
packages/flux-renderers-industrial/src/editor/
├── template/
│   ├── template-model.ts          # 类型 + collectTemplateSource + instantiateTemplateNodes + 内存 store
│   ├── template-model.test.ts
│   ├── template-dialog.tsx        # EditorTemplateDialog（UI 壳）
│   └── template-dialog.test.tsx
├── station/
│   ├── station-model.ts           # 类型 + 内存 store
│   ├── station-model.test.ts
│   ├── station-dialog.tsx         # EditorStationDialog（UI 壳）
│   └── station-dialog.test.tsx
├── toolbox/toolbox-panel.tsx      # 两按钮 + 两弹层接线（修改）
├── schemas.ts                     # templateStorage/stationStorage props（修改）
├── renderer-definitions.ts        # fields 注册 kind:'ignored'（修改）
├── scada-editor-canvas.tsx        # storage 读取 + 透传（修改）
└── index.ts                       # 公共面导出（修改）
```

## 9. 非目标

- 模板缩略图/分类/检索（列表平铺即可，需求未立）。
- 站点多租户/权限/服务端协议（宿主域）。
- 画面文档版本历史/对比（undo 栈是会话内语义，跨会话历史归宿主）。
- 模板 bindings 点引用自动重映射（§7 裁定：行为与手工绘制一致）。

## 10. 自检记录（设计 → 实现前置 gate）

| 核对项                                           | 结论                                                                               |
| ------------------------------------------------ | ---------------------------------------------------------------------------------- |
| serialization 既有格式零改动（D2 约束）          | PASS（§2.1/§2.2/§7：模板体 = `ScadaSymbolNode[]`，画面 = serializedConfig 字符串） |
| 持久化归宿主（包内无 IO）                        | PASS（§1/§3.3：storage 回调注入 + 内存 store 仅 demo/测试）                        |
| 保存/实例化双向 deep-clone 不变量                | PASS（§2.1 不变式 + §3.2 复用 clipboard 管线）                                     |
| id 碰撞/connection 重写不重复实现                | PASS（§3.2 复用 `buildClipboardPaste`）                                            |
| 画面切换 = 既有 load 语义（清栈显式提示）        | PASS（§2.2/§4.2）                                                                  |
| R5：多画面状态不入 session、preview 态弹层 inert | PASS（§4.2/§7）                                                                    |
| storage 缺省可用（UI 壳独立存在）                | PASS（§4.1 未接入提示）                                                            |
