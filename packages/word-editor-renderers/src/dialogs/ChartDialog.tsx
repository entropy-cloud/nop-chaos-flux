import { useState } from 'react'
import type { DocChart, ChartType } from '@nop-chaos/word-editor-core'
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  NativeSelect,
  NativeSelectOption,
  ScrollArea,
  ChartContainer,
  ChartTooltip,
  ChartLegend,
  ChartTooltipContent,
  ChartLegendContent
} from '@nop-chaos/ui'
import * as RechartsPrimitive from 'recharts'

interface ChartDialogProps {
  open: boolean
  onClose: () => void
  onSave: (chart: DocChart) => void
  initialData?: DocChart | null
}

const mockData = [
  { name: 'Jan', value: 100 },
  { name: 'Feb', value: 200 },
  { name: 'Mar', value: 150 },
  { name: 'Apr', value: 180 },
  { name: 'May', value: 120 }
]

const chartConfig = {
  value: {
    label: 'Value',
    color: 'hsl(var(--primary))'
  }
} as const

export function ChartDialog({ open, onClose, onSave, initialData }: ChartDialogProps) {
  const [chartName, setChartName] = useState(() => initialData?.chartName ?? '')
  const [chartType, setChartType] = useState<ChartType>(() => initialData?.chartType ?? 'bar')
  const [datasetId, setDatasetId] = useState(() => initialData?.datasetId ?? '')
  const [categoryField, setCategoryField] = useState(() => initialData?.categoryField ?? '')
  const [valueField, setValueField] = useState(() => initialData?.valueField?.join(', ') ?? '')
  const [seriesField, setSeriesField] = useState(() => initialData?.seriesField?.join(', ') ?? '')
  const [showChartName, setShowChartName] = useState(() => initialData?.showChartName ?? true)

  const handleSave = () => {
    if (!chartName.trim()) {
      return
    }

    onSave({
      id: initialData?.id || `chart_${Date.now()}`,
      chartName: chartName.trim(),
      chartType,
      showChartName,
      datasetId: datasetId.trim() || '',
      categoryField: categoryField.trim() || '',
      valueField: valueField.split(',').map(v => v.trim()).filter(v => v),
      seriesField: seriesField.split(',').map(v => v.trim()).filter(v => v) || undefined
    })
    onClose()
  }

  const renderChartPreview = () => {
    const commonProps = {
      data: mockData,
      margin: { top: 10, right: 10, left: 10, bottom: 10 }
    }

    switch (chartType) {
      case 'bar':
        return (
          <RechartsPrimitive.BarChart {...commonProps}>
            <RechartsPrimitive.CartesianGrid strokeDasharray="3 3" />
            <RechartsPrimitive.XAxis dataKey="name" />
            <RechartsPrimitive.YAxis />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <RechartsPrimitive.Bar dataKey="value" fill="var(--color-value)" />
          </RechartsPrimitive.BarChart>
        )
      case 'line':
        return (
          <RechartsPrimitive.LineChart {...commonProps}>
            <RechartsPrimitive.CartesianGrid strokeDasharray="3 3" />
            <RechartsPrimitive.XAxis dataKey="name" />
            <RechartsPrimitive.YAxis />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <RechartsPrimitive.Line dataKey="value" stroke="var(--color-value)" />
          </RechartsPrimitive.LineChart>
        )
      case 'pie':
        return (
          <RechartsPrimitive.PieChart {...commonProps}>
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <RechartsPrimitive.Pie data={mockData} dataKey="value" nameKey="name" fill="var(--color-value)" />
          </RechartsPrimitive.PieChart>
        )
      case 'area':
        return (
          <RechartsPrimitive.AreaChart {...commonProps}>
            <RechartsPrimitive.CartesianGrid strokeDasharray="3 3" />
            <RechartsPrimitive.XAxis dataKey="name" />
            <RechartsPrimitive.YAxis />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <RechartsPrimitive.Area dataKey="value" fill="var(--color-value)" />
          </RechartsPrimitive.AreaChart>
        )
      case 'scatter':
        return (
          <RechartsPrimitive.ScatterChart {...commonProps}>
            <RechartsPrimitive.CartesianGrid strokeDasharray="3 3" />
            <RechartsPrimitive.XAxis dataKey="name" />
            <RechartsPrimitive.YAxis dataKey="value" />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <RechartsPrimitive.Scatter data={mockData} fill="var(--color-value)" />
          </RechartsPrimitive.ScatterChart>
        )
      default:
        return null
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogContent size="lg" className="flex flex-col max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Chart' : 'Create Chart'}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          <ScrollArea className="flex-1">
            <div className="p-1 space-y-4">
              <div>
                <Label>Chart Name <span className="text-destructive">*</span></Label>
                <Input
                  value={chartName}
                  onChange={(e) => setChartName(e.target.value)}
                  placeholder="Enter chart name"
                  size="sm"
                />
              </div>

              <div>
                <Label>Chart Type</Label>
                <NativeSelect
                  value={chartType}
                  onChange={(e) => setChartType(e.target.value as ChartType)}
                  className="w-full"
                >
                  <NativeSelectOption value="bar">Bar</NativeSelectOption>
                  <NativeSelectOption value="line">Line</NativeSelectOption>
                  <NativeSelectOption value="pie">Pie</NativeSelectOption>
                  <NativeSelectOption value="scatter">Scatter</NativeSelectOption>
                  <NativeSelectOption value="area">Area</NativeSelectOption>
                </NativeSelect>
              </div>

              <div>
                <Label>Dataset ID</Label>
                <Input
                  value={datasetId}
                  onChange={(e) => setDatasetId(e.target.value)}
                  placeholder="Select dataset (e.g., dataset1)"
                  size="sm"
                />
              </div>

              <div>
                <Label>Category Field</Label>
                <Input
                  value={categoryField}
                  onChange={(e) => setCategoryField(e.target.value)}
                  placeholder="Category field name (e.g., category)"
                  size="sm"
                />
              </div>

              <div>
                <Label>Value Fields</Label>
                <Input
                  value={valueField}
                  onChange={(e) => setValueField(e.target.value)}
                  placeholder="Comma-separated values (e.g., value1, value2)"
                  size="sm"
                />
              </div>

              <div>
                <Label>Series Field (Optional)</Label>
                <Input
                  value={seriesField}
                  onChange={(e) => setSeriesField(e.target.value)}
                  placeholder="Comma-separated series (e.g., series1, series2)"
                  size="sm"
                />
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="showChartName"
                  checked={showChartName}
                  onCheckedChange={(checked) => setShowChartName(checked === true)}
                />
                <Label htmlFor="showChartName" className="cursor-pointer">Show chart name</Label>
              </div>

              <div>
                <Label>Preview</Label>
                <div className="mt-2 border rounded-lg p-4 bg-background">
                  <ChartContainer config={chartConfig}>
                    <RechartsPrimitive.ResponsiveContainer width="100%" height={200}>
                      {renderChartPreview()}
                    </RechartsPrimitive.ResponsiveContainer>
                  </ChartContainer>
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={!chartName.trim()}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
