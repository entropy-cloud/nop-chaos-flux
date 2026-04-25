import type {
  BaseSchema,
  StaticAnalysisResult,
  TemplateNode,
  TemplateRegion,
  WrapProvidersFn
} from '@nop-chaos/flux-core';

export const PROVIDER_BUILD_ORDER = ['actionScope', 'componentRegistry', 'classAliases'] as const;

export function buildWrapProvidersClosure(providers: TemplateNode['providerPlan']): WrapProvidersFn {
  let fn: WrapProvidersFn = (_wp, _v, ch) => ch;

  for (const kind of PROVIDER_BUILD_ORDER) {
    if (providers?.[kind]) {
      const inner = fn;
      fn = (wp, v, ch) => wp(kind, v[kind], inner(wp, v, ch));
    }
  }

  return fn;
}

function collectDependencies(_node: TemplateNode): readonly string[] {
  return [];
}

function getRegionChildren(region: TemplateRegion): readonly TemplateNode[] {
  if (!region.node) {
    return [];
  }

  if (Array.isArray(region.node)) {
    return region.node;
  }

  return [region.node] as readonly TemplateNode[];
}

function isMetaProgramStatic(metaProgram: TemplateNode['metaProgram']): boolean {
  for (const field of Object.values(metaProgram)) {
    if (field && !field.isStatic) {
      return false;
    }
  }
  return true;
}

export function computeStaticAnalysis(
  node: TemplateNode,
  schema: BaseSchema
): StaticAnalysisResult {
  const renderer = node.component;

  if (!renderer.staticCapable) {
    return {
      isStaticContent: false,
      dependencies: collectDependencies(node)
    };
  }

  if (!node.propsProgram.isStatic) {
    return {
      isStaticContent: false,
      dependencies: collectDependencies(node)
    };
  }

  if (!isMetaProgramStatic(node.metaProgram)) {
    return {
      isStaticContent: false,
      dependencies: collectDependencies(node)
    };
  }

  if (schema.name) {
    return {
      isStaticContent: false,
      dependencies: collectDependencies(node)
    };
  }

  if (Object.keys(node.eventPlans).length > 0) {
    return {
      isStaticContent: false,
      dependencies: collectDependencies(node)
    };
  }

  if (node.scopePlan.kind !== 'inherit') {
    return {
      isStaticContent: false,
      dependencies: collectDependencies(node)
    };
  }

  for (const region of Object.values(node.regions)) {
    for (const child of getRegionChildren(region)) {
      if (!child.staticAnalysis?.isStaticContent) {
        return {
          isStaticContent: false,
          dependencies: collectDependencies(node)
        };
      }
    }
  }

  return { isStaticContent: true, dependencies: [] };
}
