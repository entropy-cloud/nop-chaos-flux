import type { DiffFile } from '../model/diff-file.js';

export interface DiffStats {
  added: number;
  removed: number;
  total: number;
}

export function computeDiffStats(file: DiffFile): DiffStats {
  let added = 0;
  let removed = 0;
  let total = 0;

  for (const hunk of file.hunks) {
    for (const line of hunk.lines) {
      total++;
      if (line.type === 'add') added++;
      else if (line.type === 'delete') removed++;
    }
  }

  return { added, removed, total };
}
