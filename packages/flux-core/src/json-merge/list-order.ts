/** One entry of the merged list: where it came from in base and in delta. */
export interface ListMergeSlot {
  /** Index into base, or `-1` when the entry only exists in delta. */
  readonly baseIndex: number;
  /** Index into delta, or `-1` when the entry is untouched base content. */
  readonly deltaIndex: number;
}

/**
 * Rebuild list order from identity matches. The result honours three rules:
 *
 * 1. delta order wins;
 * 2. unmatched base entries keep their relative order where possible;
 * 3. a new delta entry lands immediately after the base entry it follows.
 *
 * Each matched base entry acts as an anchor representing itself plus everything
 * up to the next anchor, which is what rule 3 falls out of.
 *
 * @param baseCount number of entries in the base list
 * @param deltaIndexes for each delta entry, its index in base, or `-1` if new
 */
export function planListMerge(
  baseCount: number,
  deltaIndexes: readonly number[],
): ListMergeSlot[] {
  const deltaCount = deltaIndexes.length;
  const slots: ListMergeSlot[] = [];

  let matched = 0;
  for (const index of deltaIndexes) {
    if (index >= 0) matched++;
  }

  if (matched === baseCount) {
    for (let i = 0; i < deltaCount; i++) {
      slots.push({ baseIndex: deltaIndexes[i], deltaIndex: i });
    }
    return slots;
  }

  if (matched === 0) {
    for (let i = 0; i < baseCount; i++) slots.push({ baseIndex: i, deltaIndex: -1 });
    for (let i = 0; i < deltaCount; i++) slots.push({ baseIndex: -1, deltaIndex: i });
    return slots;
  }

  const baseIndexes = new Array<number>(baseCount).fill(-1);
  for (let i = 0; i < deltaCount; i++) {
    const baseIndex = deltaIndexes[i];
    if (baseIndex >= 0) baseIndexes[baseIndex] = i;
  }

  for (let i = 0; i < deltaCount; i++) {
    slots.push({ baseIndex: deltaIndexes[i], deltaIndex: i });
  }

  let cursor = 0;
  for (let i = 0; i < baseCount; i++) {
    const deltaIndex = baseIndexes[i];
    if (deltaIndex < 0) {
      slots.splice(cursor, 0, { baseIndex: i, deltaIndex: -1 });
      cursor++;
    } else {
      cursor = findInsertPos(slots, deltaIndex);
    }
  }

  return slots;
}

/**
 * Locate the insertion point that follows the given delta anchor, stepping over
 * the new delta entries that were already placed right after it.
 */
function findInsertPos(slots: readonly ListMergeSlot[], deltaIndex: number): number {
  for (let i = Math.max(deltaIndex, 0); i < slots.length; i++) {
    if (slots[i].deltaIndex !== deltaIndex) continue;
    for (let j = i + 1; j < slots.length; j++) {
      if (slots[j].baseIndex < 0) {
        i++;
      } else {
        break;
      }
    }
    return i + 1;
  }
  return slots.length;
}