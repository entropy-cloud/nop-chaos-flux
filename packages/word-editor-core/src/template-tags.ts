export interface TemplateTag {
  name: string
  kind: 'tag-open' | 'tag-close' | 'tag-selfclose'
  label: string
  description: string
  defaultAttrs?: Record<string, string>
}

export const BUILTIN_TEMPLATE_TAGS: TemplateTag[] = [
  {
    name: 'c:if',
    kind: 'tag-open',
    label: 'If Condition',
    description: 'Conditional block — renders content if test is true',
    defaultAttrs: { test: '' }
  },
  {
    name: 'c:if',
    kind: 'tag-close',
    label: 'End If',
    description: 'Close conditional block'
  },
  {
    name: 'c:for',
    kind: 'tag-open',
    label: 'For Loop',
    description: 'Iterate over a collection',
    defaultAttrs: { items: '', var: 'item' }
  },
  {
    name: 'c:for',
    kind: 'tag-close',
    label: 'End For',
    description: 'Close for loop'
  },
  {
    name: 'c:forEach',
    kind: 'tag-open',
    label: 'For Each',
    description: 'Iterate over a collection (forEach alias)',
    defaultAttrs: { items: '', var: 'item' }
  },
  {
    name: 'c:forEach',
    kind: 'tag-close',
    label: 'End ForEach',
    description: 'Close forEach loop'
  },
  {
    name: 'c:choose',
    kind: 'tag-open',
    label: 'Choose',
    description: 'Multi-branch conditional (switch-like)'
  },
  {
    name: 'c:choose',
    kind: 'tag-close',
    label: 'End Choose',
    description: 'Close choose block'
  },
  {
    name: 'c:when',
    kind: 'tag-open',
    label: 'When',
    description: 'Condition branch inside c:choose',
    defaultAttrs: { test: '' }
  },
  {
    name: 'c:when',
    kind: 'tag-close',
    label: 'End When',
    description: 'Close when block'
  },
  {
    name: 'c:otherwise',
    kind: 'tag-open',
    label: 'Otherwise',
    description: 'Default branch inside c:choose'
  },
  {
    name: 'c:otherwise',
    kind: 'tag-close',
    label: 'End Otherwise',
    description: 'Close otherwise block'
  },
  {
    name: 'c:set',
    kind: 'tag-open',
    label: 'Set Variable',
    description: 'Set a variable in the template scope',
    defaultAttrs: { var: '', value: '' }
  },
  {
    name: 'c:set',
    kind: 'tag-close',
    label: 'End Set',
    description: 'Close set block'
  },
  {
    name: 'c:out',
    kind: 'tag-selfclose',
    label: 'Output Value',
    description: 'Output an expression value (self-closing)',
    defaultAttrs: { value: '' }
  }
]

export function findTagDefinition(name: string, kind: 'tag-open' | 'tag-close'): TemplateTag | undefined {
  return BUILTIN_TEMPLATE_TAGS.find(
    tag => tag.name === name && tag.kind === kind
  )
}

export function getOpeningTag(name: string): TemplateTag | undefined {
  return findTagDefinition(name, 'tag-open')
}

export function getClosingTag(name: string): TemplateTag | undefined {
  return findTagDefinition(name, 'tag-close')
}

export function getMatchingCloseTag(openTag: TemplateTag): TemplateTag | undefined {
  return findTagDefinition(openTag.name, 'tag-close')
}
