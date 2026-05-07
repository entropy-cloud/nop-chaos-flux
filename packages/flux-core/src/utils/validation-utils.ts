import type { ValidationError } from '../types/validation.js';

export function validationErrorsEqual(
  left: ValidationError[] | undefined,
  right: ValidationError[] | undefined,
): boolean {
  if (left === right) {
    return true;
  }

  if (!left || !right || left.length !== right.length) {
    return false;
  }

  return left.every((error, index) => {
    const candidate = right[index];

    if (!candidate) {
      return false;
    }

    const leftRelatedPaths = error.relatedPaths ?? [];
    const rightRelatedPaths = candidate.relatedPaths ?? [];

    return (
      candidate.path === error.path &&
      candidate.rule === error.rule &&
      candidate.message === error.message &&
      candidate.ruleId === error.ruleId &&
      candidate.sourceKind === error.sourceKind &&
      leftRelatedPaths.length === rightRelatedPaths.length &&
      leftRelatedPaths.every((path, relatedIndex) => path === rightRelatedPaths[relatedIndex])
    );
  });
}
