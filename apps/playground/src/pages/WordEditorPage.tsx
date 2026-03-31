import { lazy, Suspense } from 'react'

interface WordEditorPageProps {
  onBack: () => void
}

const WordEditorPageLazy = lazy(() =>
  import('@nop-chaos/word-editor-renderers').then(mod => ({ default: mod.WordEditorPage }))
)

export function WordEditorPage({ onBack }: WordEditorPageProps) {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--nop-body-copy)]">Loading Word Editor...</p>
      </div>
    }>
      <WordEditorPageLazy onBack={onBack} />
    </Suspense>
  )
}
