import React from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import type { IconSchema } from './schemas';
import { classNames } from './utils';

export function IconRenderer(props: RendererComponentProps<IconSchema>) {
  const icon = typeof props.props.icon === 'string' ? props.props.icon : undefined;
  // 实际实现会根据 icon 名称渲染对应的 SVG 或字体图标
  return <i className={classNames('nop-icon', `nop-icon--${icon}`, props.meta.className)} data-icon={icon} />;
}
