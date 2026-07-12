import * as React from 'react';
import { JsonView, allExpanded, defaultStyles } from 'react-json-view-lite';
import { stringify } from 'yaml';
import { Tabs, TabsList, TabsTrigger } from './tabs.js';
import { cn } from '../../lib/utils.js';

type JsonViewerProps = {
  data: Record<string, unknown> | unknown[];
  defaultExpand?: boolean;
  /** When set, expand only nodes whose depth is below `expandLevel` (0 = collapse all nested). */
  expandLevel?: number;
  className?: string;
};

function JsonViewer({
  data,
  defaultExpand = true,
  expandLevel,
  className,
}: JsonViewerProps) {
  const shouldExpandNode =
    typeof expandLevel === 'number'
      ? (level: number) => level < expandLevel
      : defaultExpand
        ? allExpanded
        : (level: number) => level === 0;
  return (
    <div className={cn('nop-json-viewer json-viewer', className)}>
      <JsonView
        data={data}
        shouldExpandNode={shouldExpandNode as never}
        style={defaultStyles}
      />
    </div>
  );
}

type DataViewerProps = {
  data: Record<string, unknown> | unknown[];
  defaultExpand?: boolean;
  className?: string;
};

function DataViewer({ data, defaultExpand = true, className }: DataViewerProps) {
  const [format, setFormat] = React.useState<'json' | 'yaml'>('json');

  const yamlText = (() => {
    try {
      return stringify(data, { lineWidth: 0 });
    } catch {
      return '';
    }
  })();

  return (
    <div className={cn('flex flex-col', className)}>
      <div className="flex flex-col space-y-2">
        <Tabs value={format} onValueChange={(value) => setFormat(value as 'json' | 'yaml')}>
          <TabsList className="grid w-full grid-cols-2 gap-2">
            <TabsTrigger value="json">JSON</TabsTrigger>
            <TabsTrigger value="yaml">YAML</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="overflow-auto min-h-[300px] max-h-[calc(100vh-200px)]">
          {format === 'json' ? (
            <JsonViewer data={data} defaultExpand={defaultExpand} />
          ) : (
            <pre className="font-mono text-xs leading-relaxed whitespace-pre">{yamlText}</pre>
          )}
        </div>
      </div>
    </div>
  );
}

export { JsonViewer, DataViewer };
export type { JsonViewerProps, DataViewerProps };
