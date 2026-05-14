import React from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import type { DesignerConfig, GraphDocument } from '@nop-chaos/flow-designer-core';
import { t } from '@nop-chaos/flux-i18n';
import type { DesignerPageSchema } from './schemas.js';
import { TreeModeLayoutWrapper } from './designer-tree-mode.js';
import { DesignerPageInner } from './designer-page-inner.js';
import { DesignerPaletteContent } from './designer-palette.js';
import { DesignerCanvasContent } from './designer-canvas.js';

function getRootMetaProps(meta: RendererComponentProps['meta']) {
  return {
    className: meta.className,
    'data-testid': meta.testid || undefined,
    'data-cid': meta.cid != null ? String(meta.cid) : undefined,
  };
}

function readDesignerResolvedProp<T>(
  props: RendererComponentProps<DesignerPageSchema>,
  key: string,
): T | undefined {
  return props.props[key] as T | undefined;
}

export function DesignerPageRenderer(props: RendererComponentProps<DesignerPageSchema>) {
  const config = readDesignerResolvedProp<DesignerConfig>(props, 'config');

  if (!config) {
    return <div {...getRootMetaProps(props.meta)}>{t('flux.flowDesigner.configRequired')}</div>;
  }

  const documentMode = config.documentMode;

  if (documentMode === 'tree') {
    return <TreeModeLayoutWrapper {...props} config={config} />;
  }

  const document = readDesignerResolvedProp<GraphDocument>(props, 'document');
  if (!document) {
    return <div {...getRootMetaProps(props.meta)}>{t('flux.flowDesigner.documentRequired')}</div>;
  }

  return <DesignerPageInner rendererProps={props} document={document} config={config} />;
}

export function DesignerCanvasRenderer(props: RendererComponentProps) {
  return <DesignerCanvasContent rootProps={getRootMetaProps(props.meta)} />;
}

export function DesignerPaletteRenderer(props: RendererComponentProps) {
  return <DesignerPaletteContent rootProps={getRootMetaProps(props.meta)} />;
}
