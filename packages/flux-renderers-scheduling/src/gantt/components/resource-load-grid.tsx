import React from 'react';
import type { GanttId, GanttResource } from '../gantt.types.js';
import type { ResourceLoadResult } from './resource-load.js';

interface ResourceLoadGridProps {
  resources: Map<GanttId, GanttResource>;
  loadResults: ResourceLoadResult[];
}

export function ResourceLoadGrid({ resources, loadResults }: ResourceLoadGridProps) {
  const loadMap = new Map(loadResults.map((r) => [r.resourceId, r]));

  return (
    <div className="nop-gantt-resource-grid h-full overflow-auto border-r border-gray-200" data-slot="gantt-resource-grid">
      <table className="w-full border-collapse table-fixed">
        <thead>
          <tr>
            <th className="sticky top-0 z-10 bg-gray-100 border-b px-2 py-1.5 text-left text-xs font-semibold text-gray-600">
              {'Resource'}
            </th>
            <th className="sticky top-0 z-10 bg-gray-100 border-b px-2 py-1.5 text-right text-xs font-semibold text-gray-600 w-16">
              {'Load'}
            </th>
          </tr>
        </thead>
        <tbody>
          {Array.from(resources.values()).map((resource) => {
            const load = loadMap.get(resource.id);
            const totalLoad = load?.totalLoad ?? 0;
            const loadColor = totalLoad < 30 ? 'text-green-600' : totalLoad < 70 ? 'text-yellow-600' : 'text-red-600';
            return (
              <tr
                key={String(resource.id)}
                className="border-b border-gray-100 hover:bg-blue-50/50"
                data-slot="gantt-resource-row"
                data-resource-id={String(resource.id)}
              >
                <td className="border-r px-2 py-1 text-xs truncate">{resource.text}</td>
                <td className={`px-2 py-1 text-xs text-right font-mono ${loadColor}`}>
                  {Math.round(totalLoad)}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
