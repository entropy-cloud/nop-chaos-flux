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
 * custom `component:` 通道的根由组件自绘，props 通道够不到——对渲染输出 clone
 * 补章 `data-renderer`（组件自带值不覆盖；Fragment/结构性输出跳过）。
 * `wrap: true` 的字段族不在此盖章：其可见根是 FieldFrame（帧根自带三件套），
 * 内层补章会产生同节点双层标记；schema `frameWrap:false` 显式退出帧契约时，
 * 实例锚随之豁免（登记于各审计卡）。
 */
const ensuredDefinitions = new WeakMap<
  object,
  RendererDefinition<BaseSchema, Record<string, unknown>>
>();

const REACT_PROVIDER_TYPE = Symbol.for('react.provider');
const REACT_CONTEXT_TYPE = Symbol.for('react.context');

function isContextProviderElement(output: React.ReactElement): boolean {
  const elementType = output.type as { $$typeof?: symbol } | string | symbol;
  return (
    typeof elementType === 'object' &&
    elementType !== null &&
    (elementType.$$typeof === REACT_PROVIDER_TYPE || elementType.$$typeof === REACT_CONTEXT_TYPE)
  );
}

/** 递归下钻 context Provider 链到宿主元素再盖章（owner 渲染器根常是 Provider 树）。 */
function stampRenderedRoot(
  output: React.ReactElement | null,
  rendererType: string,
): React.ReactElement | null {
  if (!output || output.type === React.Fragment) return output;
  if (typeof output.type === 'string') {
    if ((output.props as Record<string, unknown>)['data-renderer'] !== undefined) {
      return output;
    }
    return React.cloneElement(output as React.ReactElement<Record<string, unknown>>, {
      'data-renderer': rendererType,
    });
  }
  if (isContextProviderElement(output)) {
    const children = (output.props as Record<string, unknown>).children;
    if (!React.isValidElement(children)) return output;
    const stampedChildren = stampRenderedRoot(children, rendererType);
    if (stampedChildren === children) return output;
    return React.cloneElement(output as React.ReactElement<Record<string, unknown>>, {
      children: stampedChildren,
    });
  }
  // 组件元素根（如 ui Button/Badge）：clone 补章，透传 props 的组件即落到 DOM，
  // 不透传的组件静默忽略（无害）。
  if ((output.props as Record<string, unknown>)['data-renderer'] !== undefined) return output;
  return React.cloneElement(output as React.ReactElement<Record<string, unknown>>, {
    'data-renderer': rendererType,
  });
}

function invokeRendererComponent(
  component: unknown,
  componentProps: Record<string, unknown>,
): React.ReactElement | null {
  if (typeof component === 'function') {
    return (
      component as unknown as (p: Record<string, unknown>) => React.ReactElement | null
    )(componentProps);
  }
  const exotic = component as { render?: (p: unknown, ref?: unknown) => React.ReactElement | null };
  if (typeof exotic?.render === 'function') {
    return exotic.render(componentProps, (componentProps as { ref?: unknown }).ref);
  }
  return React.createElement(
    component as React.ComponentType<Record<string, unknown>>,
    componentProps,
  );
}

export function ensureRendererComponent<S extends BaseSchema, P extends Record<string, unknown>>(
  definition: RendererDefinition<S, P>,
): RendererDefinition<S, P> {
  if (definition.component && definition.wrap) {
    // 字段族：FieldFrame 帧根拥有锚点，组件输出根不补章（防双层标记）。
    return definition;
  }

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
          props as unknown as Record<string, unknown>,
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
