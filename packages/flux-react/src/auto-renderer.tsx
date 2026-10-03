import React from 'react';
import type {
  BaseSchema,
  RendererComponentProps,
  RendererResolvedProps,
} from '@nop-chaos/flux-core';
import type { RendererDefinition } from './react-contracts.js';

export function createAutoRendererComponent<
  S extends BaseSchema = BaseSchema,
  P extends Record<string, unknown> = RendererResolvedProps<S>,
>(
  ReactComponent: React.ComponentType<Readonly<P>>,
  options?: { rendererType?: string },
): (props: RendererComponentProps<S, P>) => React.ReactElement | null {
  return function AutoRenderer(props: RendererComponentProps<S, P>) {
    const uiProps: Record<string, unknown> = { ...props.props };

    for (const [key, handler] of Object.entries(props.events)) {
      if (handler) {
        uiProps[key] = (event: unknown) => handler(event);
      }
    }

    return React.createElement(ReactComponent, {
      ...(uiProps as P),
      disabled: props.props.disabled,
      className: props.props.className,
      'data-testid': props.props.testid || undefined,
      'data-cid': props.props.cid || undefined,
      'data-renderer': options?.rendererType || undefined,
    } as P);
  };
}

/**
 * DOM 结构契约（renderer-markers-and-selectors.md "Universal Root Anchors"）：
 * 渲染器根统一携带 `data-renderer`/`data-cid`。custom `component:` 通道的根
 * 由组件自绘，无法经 props 通道注入——这里对渲染输出做 clone 补章（组件已
 * 自带的值不覆盖；Fragment/结构性输出跳过）。`data-cid` 不在此补章——它由
 * 既有通道提供（AutoRenderer props 注入/组件手写/FieldFrame 链），补章会造成
 * 同节点双层 cid，破坏工具链对 cid 唯一性的假设（field-frame 契约）。
 */
function stampRenderedRoot(
  output: React.ReactElement | null,
  rendererType: string,
): React.ReactElement | null {
  if (!output || output.type === React.Fragment) return output;
  if ((output.props as Record<string, unknown>)['data-renderer'] !== undefined) return output;
  return React.cloneElement(output as React.ReactElement<Record<string, unknown>>, {
    'data-renderer': rendererType,
  });
}

/**
 * 渲染 definition.component 的输出（不引入额外组件层）：普通函数组件直接调用；
 * forwardRef/exotic 对象调其 `render(props, ref)`（React 19 ref 走 props）；
 * 其余形态走 createElement 兜底（此时无法拦截输出根，stamp 不可达，由卡面豁免）。
 */
function invokeRendererComponent(
  inner: unknown,
  props: RendererComponentProps<BaseSchema, Record<string, unknown>>,
): React.ReactElement | null {
  if (typeof inner === 'function') {
    return (
      inner as unknown as (
        p: RendererComponentProps<BaseSchema, Record<string, unknown>>,
      ) => React.ReactElement | null
    )(props);
  }
  const exotic = inner as { render?: (p: unknown, ref?: unknown) => React.ReactElement | null };
  if (typeof exotic?.render === 'function') {
    return exotic.render(props, (props as { ref?: unknown }).ref);
  }
  return React.createElement(
    inner as React.ComponentType<RendererComponentProps<BaseSchema, Record<string, unknown>>>,
    props,
  );
}

const ensuredDefinitions = new WeakMap<
  object,
  RendererDefinition<BaseSchema, Record<string, unknown>>
>();

export function ensureRendererComponent<S extends BaseSchema, P extends Record<string, unknown>>(
  definition: RendererDefinition<S, P>,
): RendererDefinition<S, P> {
  // 记忆化：同一 definition 重复 ensure（如测试注册表合并同一数组两次）必须
  // 返回同一包装对象，保持注册表 `existing !== definition` 的身份豁免语义。
  const cached = ensuredDefinitions.get(definition) as RendererDefinition<S, P> | undefined;
  if (cached) return cached;

  const rendererType: string = definition.type;
  const inner: unknown = definition.component
    ? definition.component
    : createAutoRendererComponent<S, P>(
        definition.reactComponent as React.ComponentType<Readonly<P>>,
        { rendererType },
      );

  const ensured: RendererDefinition<S, P> = {
    ...definition,
    component: (props: RendererComponentProps<S, P>) =>
      stampRenderedRoot(
        invokeRendererComponent(
          inner,
          props as unknown as RendererComponentProps<BaseSchema, Record<string, unknown>>,
        ),
        rendererType,
      ),
  };
  ensuredDefinitions.set(
    definition,
    ensured as unknown as RendererDefinition<BaseSchema, Record<string, unknown>>,
  );
  return ensured;
}
