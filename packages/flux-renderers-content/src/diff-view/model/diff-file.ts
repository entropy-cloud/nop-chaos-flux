export type DiffLineType = 'add' | 'delete' | 'context' | 'hunk' | 'conflict-start' | 'conflict-separator' | 'conflict-end';

export interface DiffLine {
  type: DiffLineType;
  content: string;
  oldLineNum?: number;
  newLineNum?: number;
}

export interface DiffHunk {
  header: string;
  lines: DiffLine[];
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
}

export interface DiffFile {
  hunks: DiffHunk[];
  oldFileName?: string;
  newFileName?: string;
}
