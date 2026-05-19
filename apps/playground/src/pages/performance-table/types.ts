export type PerformanceMode = 'table-only' | 'scope-read-stress' | 'full-stress';

export type RenderMetrics = {
  commitCount: number;
  totalActualDuration: number;
  lastActualDuration: number;
  averageActualDuration: number;
  maxActualDuration: number;
  lastCommitAt: number;
  commitRevision: number;
};

export type BatchRunSummary = {
  label: string;
  steps: number;
  schedulingDurationMs: number;
  quiescenceWaitMs: number;
  totalDurationMs: number;
  commitsDelta: number;
  totalCommitMs: number;
  avgCommitMs: number;
  maxCommitMs: number;
};

export type PerfRow = {
  id: string;
  index: number;
  username: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  status: 'online' | 'offline' | 'busy';
  active: boolean;
  verified: boolean;
  progress: number;
  region: 'apac' | 'emea' | 'amer';
  notes: string;
  tags: string[];
  tagsText: string;
  permissions: string[];
  score: number;
  scoreBand: 'low' | 'mid' | 'high';
  children: Array<{ id: string; label: string; value: string }>;
};

export type PerfLineItem = {
  itemKey: string;
  sku: string;
  qty: number;
  note: string;
};

export const INITIAL_METRICS: RenderMetrics = {
  commitCount: 0,
  totalActualDuration: 0,
  lastActualDuration: 0,
  averageActualDuration: 0,
  maxActualDuration: 0,
  lastCommitAt: 0,
  commitRevision: 0,
};

export function createRow(index: number): PerfRow {
  const role = index % 3 === 0 ? 'admin' : index % 3 === 1 ? 'editor' : 'viewer';
  const status = index % 4 === 0 ? 'busy' : index % 2 === 0 ? 'online' : 'offline';
  const region = index % 3 === 0 ? 'apac' : index % 3 === 1 ? 'emea' : 'amer';
  const tags = [`tag-${index % 5}`, `grp-${index % 7}`, role];
  const score = 50 + (index % 50);
  const scoreBand: PerfRow['scoreBand'] = score < 60 ? 'low' : score < 85 ? 'mid' : 'high';
  const permissions = index % 2 === 0 ? ['read', 'write'] : ['read'];

  return {
    id: `user-${index}`,
    index,
    username: `user_${index}`,
    email: `user_${index}@perf.dev`,
    role,
    status,
    active: index % 2 === 0,
    verified: index % 5 !== 0,
    progress: (index * 7) % 100,
    region,
    notes: `Row ${index} note with ${status} / ${region}`,
    tags,
    tagsText: tags.join(', '),
    permissions,
    score,
    scoreBand,
    children: [
      { id: `child-${index}-0`, label: 'Primary', value: `${role}-${status}` },
      { id: `child-${index}-1`, label: 'Region', value: region },
    ],
  };
}

export function createRows(count: number): PerfRow[] {
  return Array.from({ length: count }, (_, index) => createRow(index + 1));
}

export function createLineItems(count: number): PerfLineItem[] {
  return Array.from({ length: count }, (_, index) => ({
    itemKey: `line-${index + 1}`,
    sku: `SKU-${String(index + 1).padStart(3, '0')}`,
    qty: (index % 5) + 1,
    note: `Line item ${index + 1}`,
  }));
}

export function createBatchTransform() {
  return (currentRows: PerfRow[]): PerfRow[] =>
    currentRows.map((row, idx) => {
      if (idx % 3 === 0) {
        const nextTags = [...row.tags, `batch-${idx % 5}`];
        const score = ((row.score + idx + 9) % 100) + 1;
        const scoreBand = (
          score < 60 ? 'low' : score < 85 ? 'mid' : 'high'
        ) as PerfRow['scoreBand'];
        return {
          ...row,
          active: !row.active,
          verified: !row.verified,
          score,
          scoreBand,
          progress: (row.progress + idx + 11) % 100,
          tags: nextTags,
          tagsText: nextTags.join(', '),
          notes: `${row.notes} *`,
        };
      }
      return row;
    });
}

export function getModeDescription(mode: PerformanceMode): string {
  switch (mode) {
    case 'table-only':
      return 'Mounts a 1000-row dataset through a paged visible table only. Use this as the closest same-page baseline for visible table-cell and row-scope cost.';
    case 'scope-read-stress':
      return 'Mounts the paged table plus broad aggregate formulas and full-scope serialization via scope-debug. Use this to compare against materialize-heavy `scope.read()` style workloads.';
    case 'full-stress':
      return 'Mounts the paged table plus aggregate, nested loop, scope-state, and editable-form stress blocks for same-environment comparison.';
  }
}
