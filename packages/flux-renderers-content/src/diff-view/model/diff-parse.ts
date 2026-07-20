import DiffMatchPatch from 'diff-match-patch';
import type { DiffFile, DiffHunk, DiffLine, DiffLineType } from './diff-file.js';

const dmp = new DiffMatchPatch();

export interface RawDiff {
  hunks: {
    header: string;
    lines: { type: DiffLineType; content: string; oldLineNum?: number; newLineNum?: number }[];
    oldStart: number;
    oldLines: number;
    newStart: number;
    newLines: number;
  }[];
  oldFileName?: string;
  newFileName?: string;
}

const HUNK_HEADER_RE = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$/;

export function parseUnifiedDiff(input: string): RawDiff[] {
  if (!input || typeof input !== 'string') return [];

  const results: RawDiff[] = [];
  const lines = input.split('\n');
  const len = lines.length;

  let currentFile: RawDiff | null = null;
  let currentHunk: RawDiff['hunks'][number] | null = null;
  let oldLineCounter = 0;
  let newLineCounter = 0;

  for (let i = 0; i < len; i++) {
    const line = lines[i];

    if (line.startsWith('diff --git ')) {
      if (currentHunk && currentFile) {
        currentFile.hunks.push(currentHunk);
        currentHunk = null;
      }
      if (currentFile) {
        results.push(currentFile);
      }
      currentFile = { hunks: [] };
      continue;
    }

    if (line.startsWith('--- ')) {
      if (!currentFile) currentFile = { hunks: [] };
      currentFile.oldFileName = line.slice(4);
      continue;
    }

    if (line.startsWith('+++ ')) {
      if (!currentFile) currentFile = { hunks: [] };
      currentFile.newFileName = line.slice(4);
      continue;
    }

    const hunkMatch = HUNK_HEADER_RE.exec(line);
    if (hunkMatch) {
      if (currentHunk && currentFile) {
        currentFile.hunks.push(currentHunk);
      }
      if (!currentFile) currentFile = { hunks: [] };
      const oldStart = parseInt(hunkMatch[1], 10);
      const oldLines = hunkMatch[2] ? parseInt(hunkMatch[2], 10) : 1;
      const newStart = parseInt(hunkMatch[3], 10);
      const newLines = hunkMatch[4] ? parseInt(hunkMatch[4], 10) : 1;
      const header = hunkMatch[5]?.trim() || '';
      currentHunk = {
        header: `@@ -${oldStart},${oldLines} +${newStart},${newLines} @@${header ? ' ' + header : ''}`,
        lines: [],
        oldStart,
        oldLines,
        newStart,
        newLines,
      };
      oldLineCounter = oldStart;
      newLineCounter = newStart;
      continue;
    }

    if (currentHunk) {
      let type: DiffLineType;
      let content: string;

      if (line.startsWith('+')) {
        type = 'add';
        content = line.slice(1);
      } else if (line.startsWith('-')) {
        type = 'delete';
        content = line.slice(1);
      } else if (line.startsWith('\\')) {
        type = 'context';
        content = line;
      } else {
        type = 'context';
        content = line.startsWith(' ') ? line.slice(1) : line;
      }

      const diffLine: DiffLine = {
        type,
        content,
        oldLineNum: type === 'add' ? undefined : oldLineCounter,
        newLineNum: type === 'delete' ? undefined : newLineCounter,
      };
      currentHunk.lines.push(diffLine);

      if (type === 'add') {
        newLineCounter++;
      } else if (type === 'delete') {
        oldLineCounter++;
      } else {
        oldLineCounter++;
        newLineCounter++;
      }
    }
  }

  if (currentHunk && currentFile) {
    currentFile.hunks.push(currentHunk);
  }
  if (currentFile) {
    results.push(currentFile);
  }

  return results;
}

export function parseToDiffFile(input: string): DiffFile {
  const raws = parseUnifiedDiff(input);
  if (raws.length === 0) {
    return createSimpleDiffFile(input);
  }
  const raw = raws[0];
  return {
    hunks: raw.hunks.map((h) => ({
      header: h.header,
      lines: h.lines.map((l) => ({
        type: l.type,
        content: l.content,
        oldLineNum: l.oldLineNum,
        newLineNum: l.newLineNum,
      })),
      oldStart: h.oldStart,
      oldLines: h.oldLines,
      newStart: h.newStart,
      newLines: h.newLines,
    })),
    oldFileName: raw.oldFileName,
    newFileName: raw.newFileName,
  };
}

export function computeDiffFile(oldContent: string, newContent: string): DiffFile {
  if (oldContent === newContent) {
    const lines = oldContent.split('\n');
    const total = lines.length;
    return {
      hunks: [{
        header: `@@ -1,${total} +1,${total} @@`,
        lines: lines.map((content) => ({
          type: 'context' as DiffLineType,
          content,
          oldLineNum: undefined,
          newLineNum: undefined,
        })),
        oldStart: 1,
        oldLines: total,
        newStart: 1,
        newLines: total,
      }],
    };
  }

  const diffs = dmp.diff_main(oldContent, newContent);
  dmp.diff_cleanupSemantic(diffs);

  const hunks: DiffHunk[] = [];
  let currentHunkLines: DiffLine[] = [];
  let oldLineNum = 1;
  let newLineNum = 1;
  let hunkOldStart = 1;
  let hunkNewStart = 1;

  function flushHunk() {
    if (currentHunkLines.length === 0) return;
    const oldLines = currentHunkLines.filter((l) => l.type !== 'add').length;
    const newLines = currentHunkLines.filter((l) => l.type !== 'delete').length;
    hunks.push({
      header: `@@ -${hunkOldStart},${oldLines || 1} +${hunkNewStart},${newLines || 1} @@`,
      lines: currentHunkLines,
      oldStart: hunkOldStart,
      oldLines,
      newStart: hunkNewStart,
      newLines,
    });
    currentHunkLines = [];
  }

  for (const [op, text] of diffs) {
    const textLines = text.split('\n');
    if (op === 0) {
      for (const line of textLines) {
        currentHunkLines.push({
          type: 'context',
          content: line,
          oldLineNum,
          newLineNum,
        });
        oldLineNum++;
        newLineNum++;
      }
    } else if (op === -1) {
      const lines = text.split('\n');
      if (currentHunkLines.length === 0) {
        hunkOldStart = oldLineNum;
        hunkNewStart = newLineNum;
      }
      for (const line of lines) {
        currentHunkLines.push({
          type: 'delete',
          content: line,
          oldLineNum,
          newLineNum: undefined,
        });
        oldLineNum++;
      }
    } else if (op === 1) {
      const lines = text.split('\n');
      if (currentHunkLines.length === 0) {
        hunkOldStart = oldLineNum;
        hunkNewStart = newLineNum;
      }
      for (const line of lines) {
        currentHunkLines.push({
          type: 'add',
          content: line,
          oldLineNum: undefined,
          newLineNum,
        });
        newLineNum++;
      }
    }
  }

  flushHunk();

  return { hunks };
}

function createSimpleDiffFile(input: string): DiffFile {
  const inputLines = input.split('\n');
  const lines: DiffLine[] = inputLines.map((content) => ({
    type: 'context' as DiffLineType,
    content,
    oldLineNum: undefined,
    newLineNum: undefined,
  }));

  const total = lines.length;
  return {
    hunks: [
      {
        header: `@@ -1,${total} +1,${total} @@`,
        lines,
        oldStart: 1,
        oldLines: total,
        newStart: 1,
        newLines: total,
      },
    ],
  };
}
