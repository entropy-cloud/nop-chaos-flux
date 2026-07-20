import DiffMatchPatch from 'diff-match-patch';

const dmp = new DiffMatchPatch();

export type ThreeWayRowType =
  | 'context'
  | 'change-old'
  | 'change-new'
  | 'conflict'
  | 'conflict-start'
  | 'conflict-separator'
  | 'conflict-end';

export interface ThreeWayRow {
  type: ThreeWayRowType;
  oldContent: string;
  middleContent: string;
  newContent: string;
  lineNum: number;
  oldLineNum?: number;
  middleLineNum?: number;
  newLineNum?: number;
}

export interface ConflictZone {
  startLine: number;
  endLine: number;
}

export interface ThreeWayResult {
  rows: ThreeWayRow[];
  conflictZones: ConflictZone[];
}

interface LineTrio {
  oldContent: string;
  middleContent: string;
  newContent: string;
  omMatch: boolean;
  mnMatch: boolean;
}

function buildThreeWayLines(oldContent: string, middleContent: string, newContent: string): LineTrio[] {
  function normalize(s: string) {
    if (s === '') return '';
    return s.endsWith('\n') ? s : s + '\n';
  }
  const normOld = normalize(oldContent);
  const normMid = normalize(middleContent);
  const normNew = normalize(newContent);

  const { chars1: omc1, chars2: omc2, lineArray: omla } = dmp.diff_linesToChars_(normOld, normMid);
  const omDiffs = dmp.diff_main(omc1, omc2, false);
  dmp.diff_charsToLines_(omDiffs, omla);

  const { chars1: mnc1, chars2: mnc2, lineArray: mnla } = dmp.diff_linesToChars_(normMid, normNew);
  const mnDiffs = dmp.diff_main(mnc1, mnc2, false);
  dmp.diff_charsToLines_(mnDiffs, mnla);

  interface RawPair { a: string; b: string; match: boolean }
  function flatten(diffs: DiffMatchPatch.Diff[]): RawPair[] {
    const result: RawPair[] = [];
    let pendingA: string[] | null = null;
    let pendingB: string[] | null = null;

    function flush() {
      if (pendingA && pendingB) {
        for (let i = 0; i < Math.max(pendingA.length, pendingB.length); i++) {
          result.push({ a: pendingA[i] ?? '', b: pendingB[i] ?? '', match: false });
        }
      } else if (pendingA) {
        for (const x of pendingA) result.push({ a: x, b: '', match: false });
      } else if (pendingB) {
        for (const x of pendingB) result.push({ a: '', b: x, match: false });
      }
      pendingA = null; pendingB = null;
    }

    for (const [op, text] of diffs) {
      if (text === '') continue;
      const lines = text.endsWith('\n') ? text.split('\n').slice(0, -1) : text.split('\n');
      if (lines.length === 0 && text === '') continue;
      if (op === 0) {
        flush();
        for (const x of lines) result.push({ a: x, b: x, match: true });
      } else if (op === -1) {
        if (pendingB) { pendingA = lines; flush(); }
        else pendingA = lines;
      } else {
        if (pendingA) { pendingB = lines; flush(); }
        else pendingB = lines;
      }
    }
    flush();
    return result;
  }

  const omPairs = flatten(omDiffs);
  const mnPairs = flatten(mnDiffs);

  const maxLen = Math.max(omPairs.length, mnPairs.length);
  const result: LineTrio[] = [];

  for (let i = 0; i < maxLen; i++) {
    const om = i < omPairs.length ? omPairs[i] : null;
    const mn = i < mnPairs.length ? mnPairs[i] : null;

    if (om && mn) {
      result.push({
        oldContent: om.a,
        middleContent: om.match ? om.a : om.b,
        newContent: mn.b,
        omMatch: om.match,
        mnMatch: mn.match,
      });
    } else if (om) {
      result.push({
        oldContent: om.a,
        middleContent: om.match ? om.a : om.b,
        newContent: om.match ? om.a : om.b,
        omMatch: om.match,
        mnMatch: true,
      });
    } else if (mn) {
      result.push({
        oldContent: mn.a,
        middleContent: mn.a,
        newContent: mn.b,
        omMatch: true,
        mnMatch: mn.match,
      });
    }
  }

  return result;
}

export function computeThreeWayDiff(
  oldContent: string,
  middleContent: string,
  newContent: string,
): ThreeWayResult {
  if (oldContent === middleContent && middleContent === newContent) {
    const lines = oldContent === '' ? [] : oldContent.split('\n');
    const rows: ThreeWayRow[] = lines.map((line, i) => ({
      type: 'context', oldContent: line, middleContent: line, newContent: line,
      lineNum: i + 1, oldLineNum: i + 1, middleLineNum: i + 1, newLineNum: i + 1,
    }));
    return { rows, conflictZones: [] };
  }

  const trios = buildThreeWayLines(oldContent, middleContent, newContent);

  const rows: ThreeWayRow[] = [];
  let rowNum = 0;

  function emit(type: ThreeWayRowType, trio: LineTrio, idx: number) {
    rowNum++;
    rows.push({
      type,
      oldContent: trio.oldContent,
      middleContent: trio.middleContent,
      newContent: trio.newContent,
      lineNum: rowNum,
      oldLineNum: idx,
      middleLineNum: idx,
      newLineNum: idx,
    });
  }

  for (let i = 0; i < trios.length; i++) {
    const t = trios[i];
    if (t.omMatch && t.mnMatch) {
      emit('context', t, i + 1);
    } else if (!t.omMatch && t.mnMatch) {
      emit('change-old', t, i + 1);
    } else if (t.omMatch && !t.mnMatch) {
      emit('change-new', t, i + 1);
    } else {
      emit('conflict', t, i + 1);
    }
  }

  const conflictZones: ConflictZone[] = [];
  let inConflict = false;
  let conflictStart = 0;
  for (const row of rows) {
    if (row.type === 'conflict') {
      if (!inConflict) { conflictStart = row.lineNum; inConflict = true; }
    } else {
      if (inConflict) { conflictZones.push({ startLine: conflictStart, endLine: row.lineNum - 1 }); inConflict = false; }
    }
  }
  if (inConflict) conflictZones.push({ startLine: conflictStart, endLine: rows.length });

  if (conflictZones.length === 0) {
    return { rows, conflictZones };
  }

  const finalRows: ThreeWayRow[] = [];
  let insertOffset = 0;
  for (const zone of conflictZones) {
    const adjustedStart = zone.startLine + insertOffset;
    const adjustedEnd = zone.endLine + insertOffset;
    const before = finalRows.slice(0, adjustedStart - 1);
    const zonePart = rows.slice(adjustedStart - 1, adjustedEnd);
    const after = rows.slice(adjustedEnd);

    const startRow: ThreeWayRow = { type: 'conflict-start', oldContent: '', middleContent: '', newContent: '', lineNum: before.length + 1 };
    const sepRow: ThreeWayRow = { type: 'conflict-separator', oldContent: '', middleContent: '', newContent: '', lineNum: before.length + zonePart.length + 2 };
    const endRow: ThreeWayRow = { type: 'conflict-end', oldContent: '', middleContent: '', newContent: '', lineNum: before.length + zonePart.length * 2 + 3 };

    finalRows.length = 0;
    finalRows.push(...before, startRow, ...zonePart, sepRow, ...zonePart.map(r => ({ ...r, oldLineNum: r.oldLineNum, middleLineNum: undefined, newLineNum: r.newLineNum })), endRow, ...after);
    insertOffset += zonePart.length + 3;
  }

  if (finalRows.length === 0) finalRows.push(...rows);

  const updatedZones: ConflictZone[] = [];
  let ic = false;
  let cs = 0;
  for (const r of finalRows) {
    const isConflictRow = r.type === 'conflict' || r.type === 'conflict-start' || r.type === 'conflict-separator' || r.type === 'conflict-end';
    if (isConflictRow) {
      if (!ic) { cs = r.lineNum; ic = true; }
    } else {
      if (ic) { updatedZones.push({ startLine: cs, endLine: r.lineNum - 1 }); ic = false; }
    }
  }
  if (ic) updatedZones.push({ startLine: cs, endLine: finalRows.length });

  return { rows: finalRows, conflictZones: updatedZones };
}
