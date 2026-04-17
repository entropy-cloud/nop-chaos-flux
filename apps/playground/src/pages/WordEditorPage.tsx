import { useMemo } from 'react'
import { createFormulaCompiler } from '@nop-chaos/flux-formula'
import { createSchemaRenderer, createDefaultEnv, createDefaultRegistry } from '@nop-chaos/flux-react'
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic'
import { registerFormRenderers } from '@nop-chaos/flux-renderers-form'
import { registerFormAdvancedRenderers } from '@nop-chaos/flux-renderers-form-advanced'
import { registerDataRenderers } from '@nop-chaos/flux-renderers-data'
import { registerWordEditorRenderers } from '@nop-chaos/word-editor-renderers'

const registry = createDefaultRegistry()
registerBasicRenderers(registry)
registerFormRenderers(registry)
registerFormAdvancedRenderers(registry)
registerDataRenderers(registry)
registerWordEditorRenderers(registry)

const SchemaRenderer = createSchemaRenderer()
const env = createDefaultEnv()
const formulaCompiler = createFormulaCompiler()

interface WordEditorPageProps {
  onBack: () => void
}

export function WordEditorPage({ onBack }: WordEditorPageProps) {
  const envWithNavigate = useMemo(() => ({
    ...env,
    navigate: (to: string | number) => {
      if (to === -1) {
        onBack()
      }
    },
  }), [onBack])

  return (
    <SchemaRenderer
      schema={{
        type: 'word-editor-page',
        title: 'Word Editor',
        onBack: { action: 'navigate', args: { back: true } }
      } as any}
      registry={registry}
      env={envWithNavigate}
      formulaCompiler={formulaCompiler}
    />
  )
}
