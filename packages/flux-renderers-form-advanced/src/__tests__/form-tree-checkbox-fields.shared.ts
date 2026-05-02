import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { formAdvancedRendererDefinitions } from '../index';

export const allFormDefs = [...formRendererDefinitions, ...formAdvancedRendererDefinitions];
