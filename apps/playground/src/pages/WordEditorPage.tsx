import { useMemo } from 'react'
import { createFormulaCompiler } from '@nop-chaos/flux-formula'
import { createSchemaRenderer, createDefaultEnv, createDefaultRegistry } from '@nop-chaos/flux-react'
import { createActionScope } from '@nop-chaos/flux-runtime'
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
  const actionScope = useMemo(() => {
    const scope = createActionScope({ id: 'word-editor-page-action-scope' })
    scope.registerNamespace('word-editor', {
      kind: 'host',
      listMethods() {
        return ['navigate-back']
      },
      invoke(method) {
        if (method === 'navigate-back') {
          onBack()
          return { ok: true }
        }
        return { ok: false, error: new Error(`Unknown word-editor method: ${method}`) }
      }
    })
    return scope
  }, [onBack])

  return (
    <SchemaRenderer
      schema={{
        type: 'word-editor-page',
        title: 'Word Editor',
        onBack: { action: 'word-editor:navigate-back' }
      } as any}
      registry={registry}
      env={env}
      formulaCompiler={formulaCompiler}
      actionScope={actionScope}
    />
  )
}
