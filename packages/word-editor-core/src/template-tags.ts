export interface TemplateTag {
  name: string;
  kind: 'tag-open' | 'tag-close' | 'tag-selfclose';
  label: string;
  description: string;
  labelKey?: string;
  descriptionKey?: string;
  defaultAttrs?: Record<string, string>;
}

export const BUILTIN_TEMPLATE_TAGS: TemplateTag[] = [
  {
    name: 'c:if',
    kind: 'tag-open',
    label: 'If Condition',
    description: 'Conditional block — renders content if test is true',
    labelKey: 'flux.wordEditor.templateTag.ifCondition',
    descriptionKey: 'flux.wordEditor.templateTagDesc.ifCondition',
    defaultAttrs: { test: '' },
  },
  {
    name: 'c:if',
    kind: 'tag-close',
    label: 'End If',
    description: 'Close conditional block',
    labelKey: 'flux.wordEditor.templateTag.endIf',
    descriptionKey: 'flux.wordEditor.templateTagDesc.endIf',
  },
  {
    name: 'c:for',
    kind: 'tag-open',
    label: 'For Loop',
    description: 'Iterate over a collection',
    labelKey: 'flux.wordEditor.templateTag.forLoop',
    descriptionKey: 'flux.wordEditor.templateTagDesc.forLoop',
    defaultAttrs: { items: '', var: 'item' },
  },
  {
    name: 'c:for',
    kind: 'tag-close',
    label: 'End For',
    description: 'Close for loop',
    labelKey: 'flux.wordEditor.templateTag.endFor',
    descriptionKey: 'flux.wordEditor.templateTagDesc.endFor',
  },
  {
    name: 'c:forEach',
    kind: 'tag-open',
    label: 'For Each',
    description: 'Iterate over a collection (forEach alias)',
    labelKey: 'flux.wordEditor.templateTag.forEach',
    descriptionKey: 'flux.wordEditor.templateTagDesc.forEach',
    defaultAttrs: { items: '', var: 'item' },
  },
  {
    name: 'c:forEach',
    kind: 'tag-close',
    label: 'End ForEach',
    description: 'Close forEach loop',
    labelKey: 'flux.wordEditor.templateTag.endForEach',
    descriptionKey: 'flux.wordEditor.templateTagDesc.endForEach',
  },
  {
    name: 'c:choose',
    kind: 'tag-open',
    label: 'Choose',
    description: 'Multi-branch conditional (switch-like)',
    labelKey: 'flux.wordEditor.templateTag.choose',
    descriptionKey: 'flux.wordEditor.templateTagDesc.choose',
  },
  {
    name: 'c:choose',
    kind: 'tag-close',
    label: 'End Choose',
    description: 'Close choose block',
    labelKey: 'flux.wordEditor.templateTag.endChoose',
    descriptionKey: 'flux.wordEditor.templateTagDesc.endChoose',
  },
  {
    name: 'c:when',
    kind: 'tag-open',
    label: 'When',
    description: 'Condition branch inside c:choose',
    labelKey: 'flux.wordEditor.templateTag.when',
    descriptionKey: 'flux.wordEditor.templateTagDesc.when',
    defaultAttrs: { test: '' },
  },
  {
    name: 'c:when',
    kind: 'tag-close',
    label: 'End When',
    description: 'Close when block',
    labelKey: 'flux.wordEditor.templateTag.endWhen',
    descriptionKey: 'flux.wordEditor.templateTagDesc.endWhen',
  },
  {
    name: 'c:otherwise',
    kind: 'tag-open',
    label: 'Otherwise',
    description: 'Default branch inside c:choose',
    labelKey: 'flux.wordEditor.templateTag.otherwise',
    descriptionKey: 'flux.wordEditor.templateTagDesc.otherwise',
  },
  {
    name: 'c:otherwise',
    kind: 'tag-close',
    label: 'End Otherwise',
    description: 'Close otherwise block',
    labelKey: 'flux.wordEditor.templateTag.endOtherwise',
    descriptionKey: 'flux.wordEditor.templateTagDesc.endOtherwise',
  },
  {
    name: 'c:set',
    kind: 'tag-open',
    label: 'Set Variable',
    description: 'Set a variable in the template scope',
    labelKey: 'flux.wordEditor.templateTag.setVariable',
    descriptionKey: 'flux.wordEditor.templateTagDesc.setVariable',
    defaultAttrs: { var: '', value: '' },
  },
  {
    name: 'c:set',
    kind: 'tag-close',
    label: 'End Set',
    description: 'Close set block',
    labelKey: 'flux.wordEditor.templateTag.endSet',
    descriptionKey: 'flux.wordEditor.templateTagDesc.endSet',
  },
  {
    name: 'c:out',
    kind: 'tag-selfclose',
    label: 'Output Value',
    description: 'Output an expression value (self-closing)',
    labelKey: 'flux.wordEditor.templateTag.outputValue',
    descriptionKey: 'flux.wordEditor.templateTagDesc.outputValue',
    defaultAttrs: { value: '' },
  },
];

export function findTagDefinition(
  name: string,
  kind: TemplateTag['kind'],
): TemplateTag | undefined {
  return BUILTIN_TEMPLATE_TAGS.find((tag) => tag.name === name && tag.kind === kind);
}

export function getOpeningTag(name: string): TemplateTag | undefined {
  return findTagDefinition(name, 'tag-open');
}

export function getClosingTag(name: string): TemplateTag | undefined {
  return findTagDefinition(name, 'tag-close');
}

export function getMatchingCloseTag(openTag: TemplateTag): TemplateTag | undefined {
  return findTagDefinition(openTag.name, 'tag-close');
}
