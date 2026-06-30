# 自定义扩展

## 注册自定义渲染器

```typescript
import { registry, type RendererComponentProps, type BaseSchema } from '@nop-chaos/flux-core';
import { useRendererRuntime, useRenderScope } from '@nop-chaos/flux-react';

interface MySchema extends BaseSchema {
  type: 'my-component';
  msg?: string;
}

function MyRenderer(props: RendererComponentProps<MySchema>) {
  const { props: resolved, meta, regions } = props;
  const runtime = useRendererRuntime();
  const scope = useRenderScope();

  if (!meta.visible) return null;

  return (
    <div data-testid={meta.testid} className={meta.className}>
      {resolved.msg}
      {regions.body?.render()}
    </div>
  );
}

// 注册
registry.register({ type: 'my-component', component: MyRenderer });

// 使用: {"type":"my-component","msg":"hello"}
```

## 注册自定义表单项

```typescript
import { registry, type RendererComponentProps } from '@nop-chaos/flux-core';
import { useCurrentForm, useRenderScope } from '@nop-chaos/flux-react';

interface MyInputSchema extends BaseSchema {
  type: 'my-input';
  label?: string;
  value?: string;
}

function MyInputRenderer(props: RendererComponentProps<MyInputSchema>) {
  const { props: resolved, meta, events } = props;
  const form = useCurrentForm();
  const scope = useRenderScope();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    form?.setValue(resolved.name || '', e.target.value);
  };

  return (
    <div data-testid={meta.testid}>
      <label>{resolved.label}</label>
      <input value={resolved.value || ''} onChange={handleChange} />
    </div>
  );
}

registry.register({ type: 'my-input', component: MyInputRenderer });

// 使用: {"type":"my-input","name":"f1","label":"自定义"}
```

## 注册自定义动作 (命名空间)

```typescript
import { type ActionSchema, type ActionContext } from '@nop-chaos/flux-core';

// 在宿主中注册命名空间
runtime.createActionScope().registerNamespace('myActions', {
  hello: async (args: Record<string, unknown>, ctx: ActionContext) => {
    ctx.runtime.env.notify('success', `Hello ${args.name}!`);
    return { success: true };
  },
});

// 使用:
// {"action":"myActions:hello","args":{"name":"World"}}
```
