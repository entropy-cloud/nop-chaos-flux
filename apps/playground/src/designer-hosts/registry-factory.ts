import { createDefaultRegistry } from '@nop-chaos/flux-react';
import type { RendererRegistry } from '@nop-chaos/flux-core';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerFormRenderers } from '@nop-chaos/flux-renderers-form';
import { registerFormAdvancedRenderers } from '@nop-chaos/flux-renderers-form-advanced';
import { registerContentRenderers } from '@nop-chaos/flux-renderers-content';
import { registerDataRenderers } from '@nop-chaos/flux-renderers-data';
import { registerLayoutRenderers } from '@nop-chaos/flux-renderers-layout';
import {
  registerScadaRenderers,
  registerScadaSymbols,
} from '@nop-chaos/flux-renderers-industrial';
import { registerScadaEditorRenderers } from '@nop-chaos/flux-renderers-industrial/editor';
import { registerWordEditorRenderers } from '@nop-chaos/word-editor-renderers';
import { registerDashboardRenderers } from '@nop-chaos/flux-renderers-dashboard';
import { registerFlowDesignerRenderers } from '@nop-chaos/flow-designer-renderers';
import { registerReportDesignerRenderers } from '@nop-chaos/report-designer-renderers';

/**
 * designer demo host factory（P4.4，plan 558；editor-designer-standard.md §2.8）：
 * registry recipe 声明式——页内 9-12 条逐条 register 调用收敛为单次 factory 消费；
 * recipe 常量为本文件单一声明源（页内一行消费）。
 */

import type { RegisteredRendererDefinition } from '@nop-chaos/flux-core';

/**
 * 注册条目：register 函数（家族注册入口）或 renderer definition（flux-react
 * `createDefaultRegistry` 数组变体语义——`registry.register(definition)`）。
 */
export type DesignerRegistryEntry =
  | ((registry: RendererRegistry) => void)
  | RegisteredRendererDefinition;

export type DesignerRegistryRecipe = {
  register: readonly DesignerRegistryEntry[];
};

export function createDesignerRegistry(recipe: DesignerRegistryRecipe): RendererRegistry {
  const registry = createDefaultRegistry();
  for (const entry of recipe.register) {
    if (typeof entry === 'function') {
      entry(registry);
    } else {
      registry.register(entry);
    }
  }
  return registry;
}

/** word-editor-page（原逐条清单：basic/form/formAdvanced/data/wordEditor）。 */
export const WORD_EDITOR_PAGE_RECIPE: DesignerRegistryRecipe = {
  register: [registerBasicRenderers, registerFormRenderers, registerFormAdvancedRenderers, registerDataRenderers, registerWordEditorRenderers],
};

/** dashboard-demo（basic/content/data/layout/dashboard）。 */
export const DASHBOARD_DEMO_RECIPE: DesignerRegistryRecipe = {
  register: [registerBasicRenderers, registerContentRenderers, registerDataRenderers, registerLayoutRenderers, registerDashboardRenderers],
};

/** scada-editor-demo（basic/layout/scada/scadaSymbols 副作用/scadaEditor）。 */
export const SCADA_EDITOR_DEMO_RECIPE: DesignerRegistryRecipe = {
  register: [
    registerBasicRenderers,
    registerLayoutRenderers,
    registerScadaRenderers,
    () => registerScadaSymbols(),
    registerScadaEditorRenderers,
  ],
};

/** taskflow-designer-page（basic/form/formAdvanced/data/flowDesigner）。 */
export const TASKFLOW_DESIGNER_PAGE_RECIPE: DesignerRegistryRecipe = {
  register: [registerBasicRenderers, registerFormRenderers, registerFormAdvancedRenderers, registerDataRenderers, registerFlowDesignerRenderers],
};

/** report-designer-demo 与 report-designer-host-demo 共用（basic/form/formAdvanced/data/reportDesigner；review m2 去重）。 */
export const REPORT_DESIGNER_DEMO_RECIPE: DesignerRegistryRecipe = {
  register: [registerBasicRenderers, registerFormRenderers, registerFormAdvancedRenderers, registerDataRenderers, registerReportDesignerRenderers],
};
