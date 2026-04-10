const COMPILED_CID_STATE = Symbol('compiled-cid-state');

export interface CompiledCidState {
  nextCid: number;
  nextTemplateNodeId: number;
  byId: Map<string, number>;
  idPaths: Map<string, string[]>;
  duplicateIds: Set<string>;
}

type ObjectWithCompiledCidState = {
  [COMPILED_CID_STATE]?: CompiledCidState;
};

export function createCompiledCidState(nextCid = 0): CompiledCidState {
  return {
    nextCid,
    nextTemplateNodeId: 0,
    byId: new Map<string, number>(),
    idPaths: new Map<string, string[]>(),
    duplicateIds: new Set<string>()
  };
}

export function attachCompiledCidState(target: object, state: CompiledCidState): void {
  const record = target as ObjectWithCompiledCidState;

  if (record[COMPILED_CID_STATE] === state) {
    return;
  }

  Object.defineProperty(record, COMPILED_CID_STATE, {
    value: state,
    enumerable: false,
    configurable: true,
    writable: false
  });
}

export function getCompiledCidState(target: object | null | undefined): CompiledCidState | undefined {
  if (!target) {
    return undefined;
  }

  return (target as ObjectWithCompiledCidState)[COMPILED_CID_STATE];
}
