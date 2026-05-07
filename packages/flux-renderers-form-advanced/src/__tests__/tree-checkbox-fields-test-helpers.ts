import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { formAdvancedRendererDefinitions } from '../index.js';

export const allFormDefs = [...formRendererDefinitions, ...formAdvancedRendererDefinitions];
