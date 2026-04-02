import * as React from "react"
import { JsonView, allExpanded, defaultStyles } from "react-json-view-lite"
import { stringify } from "yaml"
import { cn } from "../../lib/utils"

type JsonViewerProps = {
  data: Record<string, unknown> | unknown[]
  defaultExpand?: boolean
  className?: string
}

function JsonViewer({ data, defaultExpand = true, className }: JsonViewerProps) {
  return (
    <div className={cn("json-viewer", className)}>
      <JsonView
        data={data}
        shouldExpandNode={defaultExpand ? allExpanded : undefined}
        style={defaultStyles}
      />
    </div>
  )
}

type DataViewerProps = {
  data: Record<string, unknown> | unknown[]
  defaultExpand?: boolean
  className?: string
}

function DataViewer({ data, defaultExpand = true, className }: DataViewerProps) {
  const [format, setFormat] = React.useState<"json" | "yaml">("json")

  const yamlText = React.useMemo(() => {
    try {
      return stringify(data, { lineWidth: 0 })
    } catch {
      return ""
    }
  }, [data])

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex flex-col space-y-2">
        <div className="grid w-full grid-cols-2 gap-2">
          <button 
            onClick={() => setFormat("json")}
            className="px-4 py-2 rounded-md bg-muted hover:bg-muted/80"
          >
            JSON
          </button>
          <button 
            onClick={() => setFormat("yaml")}
            className="px-4 py-2 rounded-md bg-muted hover:bg-muted/80"
          >
            YAML
          </button>
        </div>
        <div className="overflow-auto min-h-[300px] max-h-[calc(100vh-200px)]">
          {format === "json" ? (
            <JsonViewer data={data} defaultExpand={defaultExpand} />
          ) : (
            <pre className="font-mono text-xs leading-relaxed whitespace-pre">{yamlText}</pre>
          )}
        </div>
      </div>
    </div>
  )
}

export { JsonViewer, DataViewer }
export type { JsonViewerProps, DataViewerProps }
