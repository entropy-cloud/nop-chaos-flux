import { useState } from 'react';

export function JsonViewer(props: { data: unknown; maxDepth?: number; defaultExpanded?: number }) {
  const maxDepth = props.maxDepth ?? 3;
  const defaultExpanded = props.defaultExpanded ?? 1;
  return (
    <div className="ndbg-entry-expanded">
      <JsonNode data={props.data} path="$" depth={0} maxDepth={maxDepth} defaultExpanded={defaultExpanded} />
    </div>
  );
}

function JsonNode(props: { data: unknown; path: string; depth: number; maxDepth: number; defaultExpanded: number }) {
  const { data, depth, maxDepth, defaultExpanded } = props;
  const [collapsed, setCollapsed] = useState(depth >= defaultExpanded);

  if (data === null || data === undefined) {
    return <span className="ndbg-json-null">{String(data)}</span>;
  }
  if (typeof data === 'string') {
    return <span className="ndbg-json-string">&quot;{data.length > 500 ? data.slice(0, 500) + '…' : data}&quot;</span>;
  }
  if (typeof data === 'number') {
    return <span className="ndbg-json-number">{String(data)}</span>;
  }
  if (typeof data === 'boolean') {
    return <span className="ndbg-json-boolean">{String(data)}</span>;
  }
  if (depth >= maxDepth) {
    return <span className="ndbg-json-null">...</span>;
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return <span>[]</span>;
    }
    const displayItems = data.length > 50 ? data.slice(0, 10) : data;
    const hasMore = data.length > 50;
    return (
      <div>
        <span className="ndbg-json-toggle" onClick={() => setCollapsed((value) => !value)}>
          {collapsed ? `▶ Array(${data.length})` : `▼ Array(${data.length})`}
        </span>
        {!collapsed && (
          <div style={{ paddingLeft: 12 }}>
            {displayItems.map((item, index) => (
              <div key={index}>
                <span className="ndbg-json-key">{index}: </span>
                <JsonNode data={item} path={`${props.path}[${index}]`} depth={depth + 1} maxDepth={maxDepth} defaultExpanded={defaultExpanded} />
              </div>
            ))}
            {hasMore && <span className="ndbg-json-null">... and {data.length - 10} more items</span>}
          </div>
        )}
      </div>
    );
  }

  if (typeof data === 'object') {
    const entries = Object.entries(data as Record<string, unknown>);
    if (entries.length === 0) {
      return <span>{'{}'}</span>;
    }
    return (
      <div>
        <span className="ndbg-json-toggle" onClick={() => setCollapsed((value) => !value)}>
          {collapsed ? `▶ Object{${entries.length}}` : `▼ Object{${entries.length}}`}
        </span>
        {!collapsed && (
          <div style={{ paddingLeft: 12 }}>
            {entries.map(([key, value]) => (
              <div key={key}>
                <span className="ndbg-json-key">{key}: </span>
                <JsonNode data={value} path={`${props.path}.${key}`} depth={depth + 1} maxDepth={maxDepth} defaultExpanded={defaultExpanded} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return <span>{String(data)}</span>;
}
