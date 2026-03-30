import * as React from "react"
import { JsonView, allExpanded, defaultStyles } from "react-json-view-lite"
import "react-json-view-lite/dist/index.css"
import { stringify } from "yaml"
import { cn } from "../../lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs"

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
      <Tabs
        value={format}
        onValueChange={(v) => setFormat(v as "json" | "yaml")}
      >
        <TabsList variant="line" className="shrink-0">
          <TabsTrigger value="json">JSON</TabsTrigger>
          <TabsTrigger value="yaml">YAML</TabsTrigger>
        </TabsList>
        <TabsContent value="json" className="overflow-auto min-h-[300px] max-h-[calc(100vh-200px)]">
          <JsonViewer data={data} defaultExpand={defaultExpand} />
        </TabsContent>
        <TabsContent value="yaml" className="overflow-auto min-h-[300px] max-h-[calc(100vh-200px)]">
          <pre className="font-mono text-xs leading-relaxed whitespace-pre">{yamlText}</pre>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export { JsonViewer, DataViewer }
export type { JsonViewerProps, DataViewerProps }
