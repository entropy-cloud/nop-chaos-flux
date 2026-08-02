# Scope Debug 组件设计

## 1. 组件定位

- `scope-debug` 是调试专用 renderer，用来把当前 render scope 的可见数据快照为 JSON 展示。
- 它只读不写，是「在当前 scope 处放一个探针」的 authoring 工具。
- 它不是产品 UI 组件；默认折叠以最小化对正常页面的干扰。

## 2. 为什么需要 `scope-debug`

- 排查「表达式为什么解析不到值」「某节点的 scope 里到底有什么」时，需要一个零成本插入的本地探针。
- 它应该能在 schema 树任意位置插入，并在 scope 变化时实时刷新。

## 3. Flux 中的 renderer/type 定义

- `type: 'scope-debug'`
- `category: 'advanced'`
- `sourcePackage: '@nop-chaos/flux-renderers-basic'`
- 注册定义: `basic-renderer-definitions.ts`（defaultSchema `{ type: 'scope-debug', title: 'Scope Debug', defaultExpand: false }`）

## 4. schema 设计

```ts
interface ScopeDebugSchema extends BaseSchema {
  type: 'scope-debug';
  title?: string;
  defaultExpand?: boolean;
  dataPaths?: string[];
}
```

- `title`: 头部标题，缺省 'Scope Debug'
- `defaultExpand`: 初始是否展开，缺省 `false`
- `dataPaths`: 订阅收窄路径（只在这些路径变化时触发重渲）；JSON 输出仍为当前 scope 完整可见快照

## 5. 字段分类

- `title`、`defaultExpand`、`dataPaths`: `value`

## 6. 结构语义

`scope-debug` 渲染一个自包含的调试面板：

- 头部（kind 标签 + 标题 + 展开/折叠按钮）
- 主体（`<pre>` 内的 JSON 快照，2 空格缩进）

## 7. Scope 设计

- 只读当前 render scope（`useScopeSelector` 订阅）。
- **折叠时订阅关闭**（`enabled` 门控）：展开前的快照区域显示占位文案「Expand to inspect scope.」，避免常驻序列化开销。
- `dataPaths` 只收窄订阅触发路径，不改变输出内容（调试工具输出完整可见 scope 才是目的）。

## 8. 序列化契约

`scope-debug` 的 JSON 序列化对不可 JSON 化的值有确定性编码，防止崩溃并保持可读性：

| 值类型        | 编码                            |
| ------------- | ------------------------------- |
| `undefined`   | 对象字段省略；数组元素 → `null` |
| function      | `"@function"`                   |
| symbol        | `"@symbol:<description>"`       |
| bigint        | `"@bigint:<value>"`             |
| Error         | `{ name, message, stack }`      |
| 循环引用      | `"@circular"`                   |
| 普通对象/数组 | 递归展开                        |

## 9. DOM 与 marker 契约

- 根节点: `nop-scope-debug` marker + `data-testid`/`data-cid`
- 内部 slot: `scope-debug-header` / `scope-debug-kind` / `scope-debug-title` / `scope-debug-toggle` / `scope-debug-body` / `scope-debug-json`

## 10. a11y

- 展开/折叠按钮使用 `@nop-chaos/ui` `Button`（键盘可操作）并携带 `aria-expanded`。
- JSON 快照为静态文本，无交互焦点需求。

## 11. i18n

- 文案 key: `flux.scopeDebug.debug` / `flux.scopeDebug.expand` / `flux.scopeDebug.collapse`，全部 locale 已声明。
- `title` 由 schema 提供；缺省回退为英文 'Scope Debug'（调试工具语义，与 i18n 基线一致）。

## 12. 风险与取舍

- 主要风险是把它当产品 UI 使用或长期留在生产页面（订阅与序列化开销）。定位为调试工具，文档应持续强调「用完即删」。
- 展开时全量序列化大 scope 有性能开销；`dataPaths` 可缓解触发频率，但输出仍完整。

## 13. 结论

- `scope-debug` 是只读调试探针：默认折叠、展开才订阅、确定性 JSON 编码、无副作用写入。
- 组合用法: 放在 fragment/owner 边界内即可观察该处的精确 lexical scope（如 loop 行内观察行 scope）。
