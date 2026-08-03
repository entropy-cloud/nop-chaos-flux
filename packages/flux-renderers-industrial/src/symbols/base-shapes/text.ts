import { Text } from 'leafer-ui';
import type { ScadaSymbolDefinition } from '../symbol-types.js';
import { toShapeAttrs } from './common.js';

export const scadaTextType = 'scada-text';

export const scadaTextDefinition: ScadaSymbolDefinition = {
  type: scadaTextType,
  name: 'Text',
  category: 'shape',
  props: {
    x: { type: 'number' },
    y: { type: 'number' },
    rotation: { type: 'number' },
    scale: { type: 'number' },
    visible: { type: 'boolean' },
    opacity: { type: 'number' },
    text: { type: 'string' },
    textColor: { type: 'string' },
    textSize: { type: 'number' },
    fontFamily: { type: 'string' },
    fontWeight: { type: 'string' },
    align: { type: 'string' },
  },
  defaults: { x: 0, y: 0, text: '', textColor: '#000000', textSize: 14 },
  create: ({ props }) => {
    const attrs = toShapeAttrs(props);
    if (props.textSize !== undefined) attrs.fontSize = props.textSize;
    if (props.align !== undefined) attrs.textAlign = props.align;
    if (props.fontFamily !== undefined) attrs.fontFamily = props.fontFamily;
    if (props.fontWeight !== undefined) attrs.fontWeight = props.fontWeight;
    if (attrs.fill === undefined && props.textColor !== undefined) attrs.fill = props.textColor;
    if (attrs.text === undefined) attrs.text = '';
    return new Text(attrs);
  },
};
