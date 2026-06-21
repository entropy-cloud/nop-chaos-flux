# Button 组件设计

## 1. 组件定位

- `button` 是标准动作触发 renderer，用来承接点击、提交、打开弹层和命名空间动作调用。
- 它是 `action`、`submit`、`reset` 等历史 AMIS type 的统一收敛点。

## 2. 与 AMIS 或既有产品的能力对照

- 当前已实现 `label`、`variant`、`size`、`disabled`、`onClick`，以及 `icon`/`rightIcon`（图标前后缀）、`loading`（加载态）、`tooltip`/`disabledTip`（悬浮提示）、`block`（全宽）、`active`（toggle 态）。
- 链接按钮（`href`/`target`）作为后续增强，但仍保持单一 `button` type。

### Flux 决策表

> Flux 决策主语。amis 仅作参考之一，**非标尺**。新增字段**命名对齐 shadcn/ui Button**。Flux 按 `existing-components-improvement-analysis.md` §0.2 原则裁决，命名对齐 X3 基线（`docs/references/naming-conventions.md` §2/§3）。列：`能力 | 采纳 | 不采纳 | 理由`。

| 能力              | 采纳                                                                                                    | 不采纳                                                                                     | 理由                                                                                              |
| ----------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| 基线动作触发      | **实现**：`label`/`disabled`/`onClick`                                                                  | —                                                                                          | 当前基线                                                                                          |
| 视觉变体          | **实现**：`variant`（default/destructive/outline/secondary/ghost/link）                                 | amis `level`（info/success/warning/dark/light/...）                                        | 命名对齐 shadcn Button（X3 §2 `variant` 6 值受控词表）                                            |
| 尺寸              | **实现**：`size`（8 值）                                                                                | —                                                                                          | 当前基线；对齐 shadcn Button size 词表（X3 §2）                                                   |
| 图标              | **实现**：`icon` + `rightIcon`（经 `resolveLucideIconStrict` 解析为 lucide 组件；无效名称不渲染）       | —                                                                                          | 命名对齐 shadcn Button                                                                            |
| 加载态            | **实现**：`loading`（boolean \| expression string；expression 子sume amis `loadingOn`，不新增独立字段） | amis 独立 `loadingOn`                                                                      | 显式状态归属（见 §7），不在按钮内静默持有；truthy 时渲染 `<Spinner>` 替换左图标 + 强制 `disabled` |
| tooltip           | **实现**：`tooltip` + `disabledTip`（disabled 时 `disabledTip` 覆盖 `tooltip`）                         | —                                                                                          | 高频可用性                                                                                        |
| 全宽              | **实现**：`block`（truthy 时 className 追加 `w-full`）                                                  | —                                                                                          | shadcn 命名（X3 §4.1 肯定式布尔）                                                                 |
| toggle 态         | **实现**：`active`（truthy 时 `data-active="true"` + `aria-pressed="true"`）                            | —                                                                                          | 命名对齐 shadcn Button                                                                            |
| 动作触发协议      | **实现**：Flux action graph（`onClick` 事件 + action）                                                  | amis `actionType` 判别树（ajax/dialog/drawer/toast/copy/reload/email/download/saveAs/url） | 走 Flux action graph，点击逻辑不塞进 button（X3 §1/§3）；amis 复杂判别树不引入                    |
| 请求/异步         | —                                                                                                       | **不采纳**：amis 组件级 `api`/`asyncApi`                                                   | 请求下沉 action（X3 §1/§3）                                                                       |
| 全局热键          | —                                                                                                       | **不采纳**：`hotKey`                                                                       | 全局热键属宿主/独立方案                                                                           |
| 倒计时            | —                                                                                                       | **不采纳**：`countDown`/`countDownTpl`                                                     | 低频，引入 localStorage 耦合                                                                      |
| 菜单项模式        | —                                                                                                       | **不采纳**：`isMenuItem`                                                                   | 独立 menu 组件族                                                                                  |
| 选中要求/条件禁用 | —                                                                                                       | **不采纳**：`requireSelected`/`disabledOnAction`                                           | 用 action graph 条件门                                                                            |
| 反馈/消息/载荷    | —                                                                                                       | **不采纳**：`feedback`/`messages`/`payload`                                                | 走 action 层（X3 §3）                                                                             |
| 鼠标进出事件      | —                                                                                                       | **不采纳**：`onMouseEnter`/`onMouseLeave`                                                  | 用 action graph 事件                                                                              |

**BY-DESIGN**：`confirmText` 确认语义走 action 层（不在 button 内置 dialog）；`body` region 暂不开放，自定义内容优先升级 `label` 为 `value-or-region`（见 §6）。

## 3. Flux 中的 renderer/type 定义

- `type: 'button'`
- `category: 'actions'`
- `sourcePackage: '@nop-chaos/flux-renderers-basic'`
- 当前 fields：`onClick` 为 `event`；`disabled` 为 `meta`；`loading`/`block`/`active` 为 `prop`（boolean，`valueType: 'boolean'`）；`icon`/`rightIcon`/`tooltip`/`disabledTip` 为 `prop`

## 4. schema 设计

- 导出字段：`label`、`variant`、`size`、`disabled`（基线）+ `icon?: string`、`rightIcon?: string`、`loading?: boolean | string`、`tooltip?: string`、`disabledTip?: string`、`block?: boolean`、`active?: boolean | string`（E2e 新增）。
- `loading`/`active` 接受 expression string（`${...}`）以子sume amis `loadingOn`/条件态，不新增独立 `loadingOn` 字段——expression 经 runtime 求值为 boolean 后进入 `props.props.loading`/`active`。
- `icon`/`rightIcon` 为 lucide icon 名称（kebab-case），经 `resolveLucideIconStrict` 解析；无效名称返回 `null` → 不渲染图标，label 正常显示（Failure Path `icon-name-invalid`）。
- `href`/`target`（link 导航）暂未实现，归后续增强。

## 5. 字段分类

- `label`: `value`
- `variant`、`size`: `value`
- `onClick`: `event`
- `disabled`: 由 meta 和显式 prop 共同决定
- `icon`、`rightIcon`、`tooltip`、`disabledTip`: `value`（string，renderer 层消费）
- `loading`、`block`、`active`: `value`（boolean | expression string；`kind: 'prop', valueType: 'boolean'`，runtime 求值后进入 `props.props`）

## 6. regions 与 slot 约定

- 首版不需要 region。
- 如果未来需要复杂按钮内容，优先考虑 `label` 的 `value-or-region` 升级，而不是新增 `body` 与 `label` 双轨。

## 7. 运行期状态归属

- `button` 不维护业务状态。
- `loading` 遵循 `local`/`controlled` 或 semantic-owner-explicit-tracking 的明确归属，而不是在按钮内静默持有。具体：owner 通过 `loading: true` / `loading: '${isSaving}'`（expression）显式控制；button renderer 不监听 onClick 触发的 async action 来自推断 pending 态。
- `loading` truthy 时 renderer 强制 `disabled = disabled || loading` 并以 `<Spinner>` 替换左图标位置（Failure Path `loading-active`：loading 态 onClick 不触发）。
- 不应因为 `onClick` 触发了一个 async action graph，就让按钮自动推断"主操作 pending"。
- 对于 form submit 这类语义 owner 明确的场景，按钮可以投影 owner state；对于 generic action，pending 应来自显式 tracked interaction state。
- 当前统一契约下，trigger control 只需要 `disabled`，不应额外引入 `readOnly`。

## 8. 事件、动作与组件句柄能力

- 当前唯一正式事件入口是 `onClick`。
- 点击后的业务执行走 `ActionSchema`，不应把字符串脚本重新引回 schema。
- `example.json` 应至少展示一个最小 `onClick` 用法，避免文档声明与示例脱节。

## 9. 数据源、表达式、导入能力接入点

- `label`、`disabled` 等值字段可来自表达式。
- 更复杂的异步动作由 action runtime 负责，不由按钮自己发请求。

## 10. 样式与 DOM marker 约定

- 根节点复用 `@nop-chaos/ui` Button 的 `variant` 和 `size`（`data-slot="button"`），不引入 `nop-button` marker（与既有 widget-markers 契约一致——shadcn/ui 原语不追加 `nop-` 前缀）。
- 不要在 DSL 里再发明 `btnLevel`、`buttonMode` 这类平行命名。
- 图标：`icon`/`rightIcon` 渲染为 `<svg data-icon="inline-start"|"inline-end" aria-hidden size=16 strokeWidth=1.8>`，复用 ui Button CSS 已有的 `[&_svg]` + `has-data-[icon=inline-start|inline-end]` padding 调整。
- loading：`<Spinner data-icon="inline-start" role="status">` 替换左图标，复用同一 padding 约定。
- active：truthy 时 root 追加 `data-active="true"` + `aria-pressed="true"`（视觉态由 `data-[active]:` 样式表达）。
- block：truthy 时 className 追加 `w-full`。
- tooltip：`tooltip`/`disabledTip` 任一有值时，button 以 `<Tooltip><TooltipTrigger render={<Button/>}><TooltipContent>` 包裹；同时 button 设 `data-tooltip` 属性镜像解析后的文案（便于测试 + disabled 态下 base-ui portal 不挂载时的稳定可测点）。

## 11. 实现拆分建议

- renderer 负责 schema 到 `@nop-chaos/ui` Button props 的映射。
- action 适配和确认提示逻辑应放到共享 action 层。

## 12. 风险、取舍与后续阶段

- `button` 很容易吸收过多行为型能力，需要持续拒绝把所有动作类型拆成新 renderer。
- 若引入链接模式，需要清晰区分导航动作和普通 click action 的优先级。
