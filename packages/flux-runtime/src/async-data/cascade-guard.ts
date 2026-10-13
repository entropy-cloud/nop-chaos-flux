export interface CascadeGuard {
  tryEnter(): boolean;
  leave(): void;
  getDepth(): number;
  setDepth(value: number): void;
}

export function createCascadeGuard(limit: number): CascadeGuard {
  let depth = 0;

  return {
    tryEnter() {
      if (depth >= limit) {
        return false;
      }

      depth += 1;
      return true;
    },
    leave() {
      depth = Math.max(0, depth - 1);
    },
    getDepth() {
      return depth;
    },
    setDepth(value: number) {
      depth = Math.max(0, value);
    },
  };
}
