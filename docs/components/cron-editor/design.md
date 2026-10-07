# cron-editor 组件设计

> Status: targetContract（已立约未实现；执行路线见 `docs/backlog/cron-scheduling-roadmap.md`）
> Owner package: `@nop-chaos/flux-renderers-form`
> ui primitive: `@nop-chaos/ui`（Button / Input / Select / NativeSelect / Checkbox / Tabs / Badge / Label / ScrollArea …）
> 方言基准: nop-entropy 严格 6 段 cron（秒 分 时 日 月 周）+ Quartz 兼容扩展 `L` / `W` / `#` + 可选第 7 段年
> AMIS 源 type: 无（Flux-Only；见 `docs/analysis/2026-08-04-control-gap-survey.md` 候选行）

## 1. 组件定位

- `cron-editor` 是定时计划编辑表单字段 renderer：把「何时触发」编辑为 nop 调度引擎可直接消费的 cron 表达式，并补足 cron 字符串本身表达不了的**锚点周期**与**重复范围**。
- 值 = `CronScheduleValue` 对象（`cron` 为本体，`repeat` / `range` 为配套结构化字段），**值 owner = 表单字段**。
- 服务场景：定时任务、报表调度、告警规则、消息推送、数据同步等低代码平台的计划配置。
- **边界裁定**：
  - 解析 / 序列化 / 校验 / 下次触发计算 = **纯 helper**（不含 IO、不含调度状态），不重造调度引擎——最终触发判定由 nop `io.nop.job` 引擎负责，本组件的预览仅是只读推导。
  - 不实现 RRULE/iCal 重复规则引擎；不承担时区换算；不承担任务执行策略（overlap/misfire）。

## 2. 与 AMIS 或既有产品的能力对照

- **AMIS**：无标准 `cron-editor` 类型（survey 记录「最接近 Flux：无」），cron 在 AMIS 生态通常退化为 `input-text`。
- **nop 前端现状**：`cronExpr` 是纯文本输入，无任何可视化编辑器；引擎解析器要求严格 6 段。
- **对标物**：Microsoft Outlook「约会重复周期」对话框 / Windows 任务计划程序（下称 Office）、Quartz cron、DataEase 与 react-js-cron 一类可视化 cron 构建器。

### 2.1 nop 方言语法基线（扩展后的契约）

| #   | 字段       | 取值                                                    | 说明                  |
| --- | ---------- | ------------------------------------------------------- | --------------------- |
| 1   | 秒         | 0-59                                                    | 必填段                |
| 2   | 分         | 0-59                                                    |                       |
| 3   | 时         | 0-23                                                    |                       |
| 4   | 日         | 1-31 + `L` `L-n` `nW` `LW`                              | `?` 允许且等价 `*`    |
| 5   | 月         | 1-12 或 `JAN`-`DEC`                                     |                       |
| 6   | 周         | 0-7 或 `SUN`-`SAT`（0/7=周日）+ `d#N` + `dL` + 单独 `L` | `?` 允许且等价 `*`    |
| 7   | 年（可选） | 1970-2099 + `a-b` + `*/n`                               | 缺省省略（保持 6 段） |

- 支持 `*` `,` `-` `/`（含 `a/n` 起点步进）；月名 / 周名大小写不敏感；连续空格合法。
- **日与周为 AND 语义**（与 Quartz `?` 互斥、POSIX OR 均不同）——编辑器 UI 必须按「同时满足」呈现，不显示 Quartz 式「二选一」提示。
- **不支持**：5 段 Unix、`@daily` 等别名、内联时区。
- 诊断级错误：段数不符、越界、倒置区间、步进 ≤0、`?` 出现在非日/周位、`L`/`W`/`#` 用错字段、永不匹配（如 `0 0 0 30 2 ?`，nop 运行期会 runaway，编辑器**前置拦截**）。

### 2.2 Office 能力对照与处置

| Office 能力                                                           | 处置                                                                                                            |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 每天 / 每 N 天 / 仅工作日；每周 + 周几多选；每月第 N 天；每年指定日期 | 现有 6 段可表达 → 编辑器直出                                                                                    |
| 每月第 X 个周几、每月最后一天 / 最后周几、N 号遇周末就近工作日        | **扩 nop 语法**：`#` `L` `nL` `L-n` `LW` `nW`（Quartz 兼容，Java 端与 TS 端同步实现）                           |
| 每 N 年                                                               | **扩 nop 语法**：可选第 7 段年                                                                                  |
| 每 N 周（隔周）、每 N 天跨月连续节律                                  | **cron 族（含 Quartz/Spring）均无法表达** → 值对象 `repeat` 字段 + nop `TriggerSpec` 锚点字段承接               |
| 重复范围（开始 / 结束 / 次数）                                        | 值对象 `range` 字段 + nop `TriggerSpec` 已有的 `minScheduleTime` / `maxScheduleTime` / `maxExecutionCount` 承接 |
| 持续时长、时区、单次例外、运行时策略                                  | **不采纳**（cron 之外的配套能力，调度引擎另有 misfire / calendar 机制）                                         |

### Flux 决策表

| 能力                                         | 采纳                                     | 不采纳               | 理由                                                                            |
| -------------------------------------------- | ---------------------------------------- | -------------------- | ------------------------------------------------------------------------------- |
| 可视化频率档位（每天/每周/每月/每年/自定义） | **实现**：`mode: 'visual'`               | —                    | 对齐 Office 心智模型，是「可视化构建」的核心价值                                |
| 6/7 段分段编辑器（秒级可见）                 | **实现**（自定义档位）                   | —                    | 高级用户需要步进/多值精确控制，且 nop 引擎需要秒段                              |
| 原始文本模式 + 实时诊断                      | **实现**：`mode: 'text'`                 | —                    | 复制粘贴既有表达式是高频路径                                                    |
| 下次触发时间预览（未来 N 次）                | **实现**：`showPreview` / `previewCount` | —                    | 计划类配置必须可验证；纯本地推导，零 IO                                         |
| 锚点周期（每 N 天/周）                       | **实现**：`repeat`                       | —                    | Office 核心能力，cron 字符串表达不了                                            |
| 重复范围                                     | **实现**：`range`                        | —                    | 与 nop `TriggerSpec` 三字段一一对应                                             |
| 常用预设                                     | **实现**：`presets`                      | —                    | 覆盖 nop 真实存量表达式形态                                                     |
| 每 N 周 / 年段等语法进 cron 字符串           | **实现**（年段）                         | 每 N 周**不进** cron | 每 N 周需要周锚点，任何 cron 方言都没有周字段；硬塞进字符串会造出非标方言       |
| RRULE / iCal 重复规则                        | —                                        | **不采纳**           | 与 nop 调度契约（cron 字符串 + TriggerSpec）不匹配，引入第二套重复规则词汇表    |
| 时区选择                                     | —                                        | **不采纳（首版）**   | nop `TriggerSpec` 无 timezone 字段、引擎走 JVM 默认时区；先保持口径一致，见 §12 |
| 持续时长 / 运行时策略 / 例外日期             | —                                        | **不采纳**           | 属任务执行配置而非触发时刻，归宿主与调度引擎                                    |
| 5 段 Unix 兼容模式                           | —                                        | **不采纳**           | nop 引擎严格 6 段；放行 5 段只会把错误推迟到后端注册任务时暴露                  |
| `@daily` / `@every 1h` 别名                  | —                                        | **不采纳**           | nop 引擎不支持；保持单一词汇表                                                  |

## 3. Flux 中的 renderer/type 定义

- `type: 'cron-editor'`
- `category: 'form'`
- `sourcePackage: '@nop-chaos/flux-renderers-form'`
- 定义模块：`renderers/cron-editor-renderer-definitions.ts`（sibling definitions module 先例同 signature / date，避免主文件超行数红线），组件 `CronEditorRenderer`，`wrap: true`。
- `propContracts` = `formFieldContracts` + cron 专属契约（`mode` / `showRepeat` / `showRange` / `showPreview` / `previewCount` / `presets`），`fields` = `formFieldRules` + 同名 `SchemaFieldRule`；regions/events **不进** `propContracts`。
- `validation` 走表单字段规则（`createFieldValidation()` + `validateInputFieldSchema` 先例），诊断文案由组件级 `schemaValidator` 附加（cron 专属错误码见 §4）。

## 4. schema 设计

```typescript
/** 编辑器值：cron 为本体，repeat/range 为 cron 表达不了的配套结构 */
interface CronScheduleValue {
  /** 6 段或 7 段（含可选年）表达式，必填 */
  cron: string;
  /** 锚点周期：自 anchor 起每 every 个 unit 触发一次（cron 族无法表达每 N 周/跨月每 N 天） */
  repeat?: {
    every: number; // >= 1
    unit: 'day' | 'week';
    anchor?: string; // YYYY-MM-DD；缺省回退 range.start，两者皆缺 → cron-repeat-anchor-missing
  };
  /** 重复范围：end 与 count 互斥（同时出现 → cron-range-conflict） */
  range?: {
    start?: string; // YYYY-MM-DD
    end?: string; // YYYY-MM-DD
    count?: number; // >= 1
  };
}

interface CronEditorSchema extends InputSchema {
  type: 'cron-editor';
  /** 默认值 / 受控值 */
  value?: CronScheduleValue;
  /** 编辑模式，缺省 'visual' */
  mode?: 'visual' | 'text';
  /** 是否显示「重复周期」区块，缺省 true */
  showRepeat?: boolean;
  /** 是否显示「重复范围」区块，缺省 true */
  showRange?: boolean;
  /** 是否显示下次触发预览，缺省 true */
  showPreview?: boolean;
  /** 预览条数，缺省 5，clamp 1-20 */
  previewCount?: number;
  /** 覆盖内置预设 */
  presets?: { label: string; value: CronScheduleValue }[];
}
```

- 继承字段：`name` / `label` / `placeholder` / `required` / `disabled` / `readOnly` / `hidden` / `clearable` / `className` / `testid` / `description` 与字段级 `onChange`。
- 日期一律 `YYYY-MM-DD` 纯日期（无时区漂移）；时间部分只存在于 cron 的时分秒段。
- 诊断错误码（i18n 双语，`flux.cron.*` 命名空间）：`fieldCount`（须 6/7 段）、`badToken`、`outOfRange`、`invertedRange`、`stepInvalid`、`questionMark`（`?` 只许日/周位）、`unsupportedToken`（`L`/`W`/`#` 用错字段、别名、5 段输入）、`impossible`（永不匹配，error 级拦截）、`repeatAnchorMissing`、`rangeConflict`。

### 与 AMIS 对照

- AMIS 无对应类型，无字段可对齐；本 schema 是 Flux-Only 契约，不存在 AMIS 兼容包袱。
- 值形状对齐本仓复合字段先例（`condition-builder` 值为对象、`combo`/`key-value` 为结构化值），不是 amis 的字符串编码字段（无 `joinValues`/`delimiter` 一类）。

### 示例

见同目录 `example.json`（三实例：基础 cron、隔周 + 次数、text 模式 + `L` 语法）。

## 5. 字段分类

- `name` / `value`：值字段（`value` 类型 `CronScheduleValue`，`stringAdapter` 不适用，走对象值适配）。
- `mode` / `showRepeat` / `showRange` / `showPreview` / `previewCount` / `presets`：`value`（静态值或表达式值）。
- `label`：`value-or-region`；`placeholder` / `required` / `disabled` / `readOnly` / `clearable`：`value`。
- `onChange`：`event`。
- regions：无（首版不开放子片段模板）。

> 值变更经 form runtime 写回 store，字段级 `onChange` 语义由 form 族统一约定。

## 6. regions 与 slot 约定

- 无 region（自包含控件，不接受子 schema 模板）。
- 内部 slot（`data-slot`）：`segment-group`、`segment`、`text-input`、`diagnostics`、`presets`、`frequency`、`repeat`、`range`、`preview`。

## 7. 运行期状态归属

- **值与校验**：form runtime（`useFormFieldFromProps` → `handlers.onChange`），对象值整体提交。
- **本地态（local）**：text 模式的非法草稿、当前焦点段、预览游标；这些不进 scope。
- **派生态（render-time derivation）**：频率档位、分段编辑器各段取值、预设高亮——全部由 `value.cron` 实时 parse 得出，**不写回成镜像 state**（无 effect 同步，无双源不一致）。
- 识别不了的表达式（如含 `*/10` 复杂步进）→ 档位自动落「自定义」，分段编辑器照常编辑；切换到向导档位时由向导重编译 cron，旧表达式被覆盖属于预期交互。

## 8. 事件、动作与组件句柄能力

- 事件：字段级 `onChange`（form 族统一），无专有事件契约。
- 组件句柄（须与 `componentCapabilityContracts` 成对声明）：
  - `clear`：清空值（提交 `undefined`）。
  - `reset`：回绑当前绑定值。
  - `focus`：聚焦当前模式的主输入（text 输入 / 首个分段）。
- 不提供 `open`（控件非弹层主交互）；预设应用、档位切换均为普通 UI 交互，不额外开句柄。

## 9. 数据源、表达式、导入能力接入点

- 无外部数据源、无网络 IO、无动态 import、无存储访问（INV-1/2 满足：IO 零需求）。
- `value` / `mode` / `presets` 等字段可接表达式；预设与文案可由宿主注入。
- 预览计算是**本地纯推导**（浏览器本地时区），不请求后端。

**宿主映射契约（CronScheduleValue → nop `TriggerSpec`）**

| 值字段        | TriggerSpec                                                                                                                                                         |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cron`        | `cronExpr`（VARCHAR(100) 字符串列）                                                                                                                                 |
| `repeat`      | `repeatAnchorEvery`（int ≥1）+ `repeatAnchorUnit`（`day`\|`week`）+ `repeatAnchorDate`（`YYYY-MM-DD`，plan 537 定名；anchor 缺省回退 `range.start` 属宿主装配语义） |
| `range.start` | `minScheduleTime`（epoch ms）                                                                                                                                       |
| `range.end`   | `maxScheduleTime`（epoch ms）                                                                                                                                       |
| `range.count` | `maxExecutionCount`                                                                                                                                                 |

映射责任在**宿主动作/表达式层**（提交时拆列），renderer 只负责编辑与校验；因此绑定单字符串列的存量表单可只读 `value.cron`。

## 10. 样式与 DOM marker 约定

- 根 marker：`nop-cron-editor`；根节点由 FieldFrame 包裹，`data-slot="field-control"` 由 FieldFrame 输出，根不重复。
- 内部结构一律 `data-slot`（见 §6），状态用 `data-*` / `aria-*`（如 `data-invalid`、`aria-live="polite"` 诊断区），**无 BEM**。
- Widget renderer：内部布局类属于视觉设计的一部分（分段 chips、档位栅格、预览列表），自包含样式；布局跨区块的间距走 `stack-*` / `hstack-*` 别名或 schema `className`。
- 类名合并用 `cn()`（`@nop-chaos/ui`），不引裸 HTML 代替 ui 组件。

## 11. 实现拆分建议

依据 `docs/references/renderer-implementation-guidelines.md`：

| 层                    | 落点                                                                                                                          | 职责                                                                                          |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 纯 helper 模块        | `src/cron/` 子目录（`parse` / `serialize` / `diagnostics` / `next-run` / `repeat 过滤` / `range 截断` / 档位派生 / 预设数据） | 全部确定性逻辑，可独立单测；next-run 是 nop Spring 实现的 TS 移植（含 `matchesDay` 动态谓词） |
| local controller hook | `useCronEditorController`（同包内）                                                                                           | text 草稿、焦点段、档位交互、预览游标、提交门控                                               |
| renderer view         | `renderers/cron-editor-renderer.tsx`                                                                                          | JSX、`@nop-chaos/ui` 组合、slot 布局、事件转发、句柄注册                                      |
| 定义模块              | `renderers/cron-editor-renderer-definitions.ts`                                                                               | type / propContracts / fields / validation / capability contracts                             |

- 单文件行数目标 ≤500（warn 红线），向导档位与区块如导致膨胀，按「区块子组件」继续在 view 层拆分，**不**把纯逻辑塞进组件。
- 不新建包（Checklist G 不适用）；不新建平行组件协议。

## 12. 风险、取舍与后续阶段

- **跨仓契约漂移**：Java 端语法扩展与 TS 端移植必须吃同一份黄金向量集，否则编辑器放行的表达式后端拒收——对账由路线图工作项 C7 收口。
- **值结构化 vs 存量字符串列**：`cronExpr` 是字符串列，`repeat`/`range` 需宿主拆列映射（§9）；绑定单列的宿主可只读 `value.cron`，不构成破坏性变更。
- **时区口径**：预览用浏览器时区，nop 引擎用 JVM 默认时区；两端不一致时预览会偏移。首版保持口径暴露（文档标注），`timezone` 字段与 nop `TriggerSpec` 扩展留后续。
- **首版不吸附 minDate/maxDate**：范围区块的日期上下界约束记为后续阶段（避免首版字段面过大）。
- **两段交付**：v1（text + 分段编辑 + 诊断 + 预览）与 v2（Office 频率档位 + repeat/range 区块 + 预设）分属两个工作项，避免单文件与单 plan 超载。
- 后续阶段候选：视觉复核基线、设计器属性面板适配、宿主集成示例、`timezone` 字段（需 nop 侧同名字段先落地）。

## 原则审计（日期：2026-10-06，审计人：文档立约，实现期复审）

- **INV-1 IO 边界**：零外部 IO（无 fetch/XHR/WebSocket/存储/window.open/动态 import），预览为本地纯推导。✅
- **INV-2 新 IO 类型**：无。✅
- **INV-3 复用边界**：表单值走 FormRuntime；UI 走 `@nop-chaos/ui`；不自建调度/数据请求通道。✅
- **INV-4 内部 state**：草稿与焦点为 local，派生态 render-time 计算，不进 schema-visible scope。✅
- **INV-5 契约边界**：签名 `(props: RendererComponentProps<CronEditorSchema>) => RendererRenderOutput`，数据只读 `props.props` / `meta` / `events` / `helpers`，响应式读走 selector hooks，不直连 store。✅
- **Checklist A-G**：A/B/C/D/E/F 按上述各节成立；**G 不适用（零新包）**。
- **例外与未决项**：值对象到 `TriggerSpec` 的映射责任在宿主（§9）。~~Java 侧字段定名待 C3 落定后回写本节~~（已闭环 2026-10-07，plan 537：`repeatAnchorEvery`/`repeatAnchorUnit`/`repeatAnchorDate`，见 §9 映射表）。残余：锚点字段暂无 `NopJobSchedule` 实体/ORM 列（dao 实体路径无法持久化锚点配置，程序化 `TriggerSpec` 可达），宿主拆列归 C7 宿主映射示例工作面。
