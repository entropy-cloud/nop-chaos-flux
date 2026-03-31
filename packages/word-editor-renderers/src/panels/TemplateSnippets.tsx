import { Code2, GitBranch, Repeat, GitMerge, Settings, FileOutput } from 'lucide-react'
import { BUILTIN_TEMPLATE_TAGS } from '@nop-chaos/word-editor-core'
import { ScrollArea } from '@nop-chaos/ui'

interface TemplateSnippetsProps {
  onInsertTag: (tagName: string) => void
}

const TAG_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'c:if': GitBranch,
  'c:for': Repeat,
  'c:forEach': Repeat,
  'c:choose': GitMerge,
  'c:when': GitBranch,
  'c:otherwise': GitMerge,
  'c:set': Settings,
  'c:out': FileOutput
}

export function TemplateSnippets({ onInsertTag }: TemplateSnippetsProps) {
  const filteredTags = BUILTIN_TEMPLATE_TAGS.filter(
    tag => tag.kind === 'tag-open' || tag.kind === 'tag-selfclose'
  )

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-[var(--nop-border)]">
        <h2 className="text-sm font-semibold text-[var(--nop-text-strong)]">Template Tags</h2>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-3">
          {filteredTags.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
              <Code2 className="w-8 h-8 text-[var(--nop-body-copy)] opacity-50 mb-2" />
              <p className="text-xs text-[var(--nop-body-copy)] opacity-70">
                No template tags found
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredTags.map((tag) => {
                const Icon = TAG_ICONS[tag.name] || Code2
                return (
                  <button
                    key={`${tag.name}-${tag.kind}`}
                    type="button"
                    onClick={() => onInsertTag(tag.name)}
                    className="w-full text-left rounded-lg border border-[var(--nop-border)] p-3 hover:border-[var(--nop-accent)] hover:bg-[var(--nop-surface-soft)] transition-all duration-160 outline-none focus:ring-2 focus:ring-[var(--nop-accent)] focus:ring-opacity-30"
                  >
                    <div className="flex items-start gap-3">
                      <Icon className="w-5 h-5 text-[var(--nop-accent)] flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-medium text-[var(--nop-text-strong)]">
                            {tag.label}
                          </h3>
                          <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-[var(--nop-surface-soft)] text-[var(--nop-body-copy)] border border-[var(--nop-border)]">
                            {tag.name}
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--nop-body-copy)] line-clamp-2">
                          {tag.description}
                        </p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
