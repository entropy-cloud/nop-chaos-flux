# 自定义渲染器 React Hooks 速查

> 编写自定义渲染器时，从 `@nop-chaos/flux-react` 导入标准 Hooks。**禁止**直接访问 store 或自建 Context 传递这些数据。
> 注册示例见 `design-patterns/custom.md`，完整类型签名见 `docs/references/quick-reference.md`。

---

## 核心 Hooks

| Hook                                       | 返回                  | 用途                                 |
| ------------------------------------------ | --------------------- | ------------------------------------ |
| `useRendererRuntime()`                     | `RendererRuntime`     | 获取运行时实例                       |
| `useRenderScope()`                         | `ScopeRef`            | 获取当前作用域引用                   |
| `useScopeSelector(selector, eqFn?, opts?)` | `T`                   | 响应式读取作用域数据（细粒度重渲染） |
| `useActionDispatcher()`                    | `Runtime['dispatch']` | 获取动作派发函数                     |

### useScopeSelector

```tsx
const userName = useScopeSelector((data) => data.user?.name);
const count = useScopeSelector(
  (data) => data.items?.length ?? 0,
  Object.is,
  { paths: ['items'] }, // 可选：限定监听路径以优化性能
);
```

`options` 字段：`{ enabled?: boolean; fallback?: T; paths?: readonly string[] }`

---

## 表单 Hooks

| Hook                             | 返回                            | 用途                                    |
| -------------------------------- | ------------------------------- | --------------------------------------- |
| `useCurrentForm()`               | `FormRuntime \| undefined`      | 获取最近的表单运行时                    |
| `useCurrentFormState(selector)`  | `T`                             | 响应式读取表单 store 状态               |
| `useCurrentFormErrors()`         | `ValidationError[]`             | 当前表单全部错误                        |
| `useCurrentFormError(path)`      | `ValidationError \| undefined`  | 指定路径的错误                          |
| `useCurrentFormFieldState(path)` | `FormFieldPresentationSnapshot` | 字段状态（disabled/required/showError） |
| `useFieldError(path)`            | `ValidationError \| undefined`  | 字段错误                                |

### 表单读写示例

```tsx
function MyInput(props: RendererComponentProps<MyInputSchema>) {
  const { props: resolved, meta } = props;
  const form = useCurrentForm();

  const value = useCurrentFormState((s) => s.values[resolved.name]);
  const fieldState = useCurrentFormFieldState(resolved.name);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    form?.setValue(resolved.name, e.target.value);
  };

  return (
    <input value={value ?? ''} onChange={handleChange} disabled={fieldState.effectiveDisabled} />
  );
}
```

### FormRuntime 常用方法

```ts
form.setValue(name, value)      // 设置单值
form.setValues({ a: 1, b: 2 })  // 批量设置
form.submit()                   // 触发提交
form.reset(values?)             // 重置
form.validateForm(reason?)      // 全表校验
form.appendValue(path, value)   // 数组追加
form.removeValue(path, index)   // 数组删除
form.moveValue(path, from, to)  // 数组移动
```

---

## 上下文 Hooks

| Hook                         | 返回                       | 用途               |
| ---------------------------- | -------------------------- | ------------------ |
| `useCurrentPage()`           | `PageRuntime \| undefined` | 获取当前页面运行时 |
| `useCurrentSurfaceRuntime()` | `SurfaceRuntime`           | 获取当前 surface   |
| `useCurrentNodeMeta()`       | `ResolvedNodeMeta`         | 当前节点元信息     |
| `useCurrentNodeInstance()`   | `NodeInstance`             | 当前节点实例       |
| `useCurrentActionScope()`    | `ActionScope`              | 获取动作作用域     |
| `useFormLayout()`            | `FormLayoutContextValue`   | 表单布局上下文     |

---

## 工具 Hooks

| Hook                       | 返回                             | 用途                 |
| -------------------------- | -------------------------------- | -------------------- |
| `useSchemaProps<S>(props)` | `RendererResolvedProps<S>`       | 类型安全 props 桥接  |
| `useRenderFragment()`      | `(input, options?) => ReactNode` | 渲染临时 schema 片段 |

---

## RendererComponentProps 数据来源

自定义渲染器函数签名 `(props: RendererComponentProps<S>) => ReactNode`，从 `props` 各通道读取数据：

| 来源              | 用途                                                        |
| ----------------- | ----------------------------------------------------------- |
| `props.props`     | 已解析的 schema 值（label, variant…）                       |
| `props.meta`      | 已解析的元状态（disabled, visible, className, testid）      |
| `props.regions`   | 预编译子区域句柄（`regions.body.render()`）                 |
| `props.events`    | schema 事件处理器（`events.onClick`）                       |
| `props.reactions` | `kind: 'reaction'` 字段的混合句柄（`dispatch()`/`force()`） |
| `props.helpers`   | 稳定运行时工具（render, evaluate, dispatch, createScope）   |

### 典型模式

```tsx
function MyRenderer(props: RendererComponentProps<MySchema>) {
  const { props: resolved, meta, regions, events, helpers } = props;
  const runtime = useRendererRuntime();
  const scope = useRenderScope();

  if (!meta.visible) return null;

  const body = regions.body?.render();
  const onClick = events.onClick;

  return (
    <div data-testid={meta.testid} className={cn('my-renderer', meta.className)}>
      {resolved.label}
      {body}
    </div>
  );
}
```
