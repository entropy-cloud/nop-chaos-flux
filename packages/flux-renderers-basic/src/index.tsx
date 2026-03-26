import React from 'react';
import type {
  BaseSchema,
  RendererComponentProps,
  RendererDefinition,
  RendererRegistry
} from '@nop-chaos/flux-core';
import { hasRendererSlotContent, resolveRendererSlotContent } from '@nop-chaos/flux-react';
import { registerRendererDefinitions } from '@nop-chaos/flux-runtime';

// ============================================
// 统一 Schema 定义
// ============================================

interface PageSchema extends BaseSchema {
  type: 'page';
  title?: string;
  body?: BaseSchema[];
}

interface ContainerSchema extends BaseSchema {
  type: 'container';
  /** 布局方向：row（默认）| column */
  direction?: 'row' | 'column';
  /** 是否换行（仅 row 方向有效） */
  wrap?: boolean;
  /** 对齐方式 */
  align?: 'start' | 'center' | 'end' | 'stretch';
  /** 间距 */
  gap?: number | string;
  body?: BaseSchema[];
}

interface TextSchema extends BaseSchema {
  type: 'text';
  /** 文本内容，支持 ${expression} 表达式 */
  text?: string;
  /** HTML 标签，默认 span */
  tag?: 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'label' | 'div';
}

interface ButtonSchema extends BaseSchema {
  type: 'button';
  label?: string;
  /** 按钮样式变体 */
  variant?: 'default' | 'primary' | 'danger' | 'ghost';
  /** 按钮尺寸 */
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean | string;
}

interface IconSchema extends BaseSchema {
  type: 'icon';
  /** 图标名称（kebab-case） */
  icon?: string;
}

interface BadgeSchema extends BaseSchema {
  type: 'badge';
  text?: string;
  level?: 'info' | 'success' | 'warning' | 'danger';
}

// ============================================
// 工具函数
// ============================================

function classNames(...values: Array<string | undefined | false>) {
  return values.filter(Boolean).join(' ');
}

function resolveDirection(direction?: string) {
  return direction === 'column' ? 'flex-col' : 'flex-row';
}

// ============================================
// 渲染器实现
// ============================================

function PageRenderer(props: RendererComponentProps<PageSchema>) {
  const titleContent = resolveRendererSlotContent(props, 'title');
  const headerContent = resolveRendererSlotContent(props, 'header');
  const footerContent = resolveRendererSlotContent(props, 'footer');

  return (
    <section className={classNames('na-page', props.meta.className)}>
      {hasRendererSlotContent(titleContent) ? (
        <header className="na-page__header">
          <h2>{titleContent}</h2>
        </header>
      ) : null}
      {hasRendererSlotContent(headerContent) ? (
        <div className="na-page__toolbar">{headerContent}</div>
      ) : null}
      <div className="na-page__body">{props.regions.body?.render()}</div>
      {hasRendererSlotContent(footerContent) ? (
        <footer className="na-page__footer">{footerContent}</footer>
      ) : null}
    </section>
  );
}

function ContainerRenderer(props: RendererComponentProps<ContainerSchema>) {
  const direction = props.props.direction === 'column' ? 'column' : 'row';
  const wrap = props.props.wrap === true;
  const align =
    props.props.align === 'start' ||
    props.props.align === 'center' ||
    props.props.align === 'end' ||
    props.props.align === 'stretch'
      ? props.props.align
      : undefined;
  const gap = typeof props.props.gap === 'number' || typeof props.props.gap === 'string' ? props.props.gap : undefined;
  const headerContent = resolveRendererSlotContent(props, 'header');
  const footerContent = resolveRendererSlotContent(props, 'footer');
  const bodyContent = props.regions.body?.render();

  const useFlexChild = wrap || align !== undefined || gap !== undefined || direction !== 'row';

  return (
    <div className={classNames('na-container', props.meta.className)}>
      {hasRendererSlotContent(headerContent) ? <div className="na-container__header">{headerContent}</div> : null}
      {useFlexChild ? (
        <div
          className={classNames(
            'flex',
            resolveDirection(direction),
            wrap && 'flex-wrap',
            align === 'center' && 'items-center justify-center',
            align === 'start' && 'items-start justify-start',
            align === 'end' && 'items-end justify-end',
            align === 'stretch' && 'items-stretch'
          )}
          style={gap !== undefined ? { gap: typeof gap === 'number' ? `${gap}px` : gap } : undefined}
        >
          {bodyContent}
        </div>
      ) : (
        bodyContent
      )}
      {hasRendererSlotContent(footerContent) ? <div className="na-container__footer">{footerContent}</div> : null}
    </div>
  );
}

function TextRenderer(props: RendererComponentProps<TextSchema>) {
  const text = props.props.text;
  const tag =
    props.props.tag === 'span' ||
    props.props.tag === 'p' ||
    props.props.tag === 'h1' ||
    props.props.tag === 'h2' ||
    props.props.tag === 'h3' ||
    props.props.tag === 'h4' ||
    props.props.tag === 'h5' ||
    props.props.tag === 'h6' ||
    props.props.tag === 'label' ||
    props.props.tag === 'div'
      ? props.props.tag
      : 'span';
  const Tag: keyof React.JSX.IntrinsicElements = tag;

  return <Tag className={classNames('na-text', props.meta.className)}>{String(text ?? '')}</Tag>;
}

function ButtonRenderer(props: RendererComponentProps<ButtonSchema>) {
  const label = props.props.label;
  const variant: NonNullable<ButtonSchema['variant']> =
    props.props.variant === 'primary' || props.props.variant === 'danger' || props.props.variant === 'ghost'
      ? props.props.variant
      : 'default';
  const size: NonNullable<ButtonSchema['size']> =
    props.props.size === 'sm' || props.props.size === 'lg' ? props.props.size : 'md';

  const variantClasses = {
    default: 'na-button',
    primary: 'na-button na-button--primary',
    danger: 'na-button na-button--danger',
    ghost: 'na-button na-button--ghost'
  };

  const sizeClasses = {
    sm: 'na-button--sm',
    md: 'na-button--md',
    lg: 'na-button--lg'
  };

  return (
    <button
      className={classNames(variantClasses[variant], sizeClasses[size], props.meta.className)}
      type="button"
      onClick={() => void props.events.onClick?.()}
      disabled={props.meta.disabled}
    >
      {String(label ?? props.meta.label ?? 'Button')}
    </button>
  );
}

function IconRenderer(props: RendererComponentProps<IconSchema>) {
  const icon = typeof props.props.icon === 'string' ? props.props.icon : undefined;
  // 实际实现会根据 icon 名称渲染对应的 SVG 或字体图标
  return <i className={classNames('na-icon', `na-icon--${icon}`, props.meta.className)} data-icon={icon} />;
}

function BadgeRenderer(props: RendererComponentProps<BadgeSchema>) {
  const text = props.props.text;
  const level: NonNullable<BadgeSchema['level']> =
    props.props.level === 'success' || props.props.level === 'warning' || props.props.level === 'danger'
      ? props.props.level
      : 'info';

  const levelClasses = {
    info: 'na-badge na-badge--info',
    success: 'na-badge na-badge--success',
    warning: 'na-badge na-badge--warning',
    danger: 'na-badge na-badge--danger'
  };

  return <span className={classNames(levelClasses[level], props.meta.className)}>{String(text ?? '')}</span>;
}

// ============================================
// 渲染器定义导出
// ============================================

export const basicRendererDefinitions: RendererDefinition[] = [
  {
    type: 'page',
    component: PageRenderer,
    regions: ['body', 'header', 'footer'],
    fields: [{ key: 'title', kind: 'value-or-region', regionKey: 'title' }]
  },
  {
    type: 'container',
    component: ContainerRenderer,
    regions: ['body', 'header', 'footer']
  },
  {
    type: 'text',
    component: TextRenderer,
    fields: [{ key: 'text', kind: 'prop' }]
  },
  {
    type: 'button',
    component: ButtonRenderer,
    fields: [{ key: 'onClick', kind: 'event' }]
  },
  {
    type: 'icon',
    component: IconRenderer
  },
  {
    type: 'badge',
    component: BadgeRenderer
  }
];

export function registerBasicRenderers(registry: RendererRegistry) {
  return registerRendererDefinitions(registry, basicRendererDefinitions);
}
