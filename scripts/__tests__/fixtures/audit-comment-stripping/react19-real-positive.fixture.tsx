import { useCallback, useMemo } from 'react';
import React from 'react';

export function RealUsage() {
  const cb = useCallback(() => {
    return 1;
  }, []);
  const v = useMemo(() => cb(), [cb]);
  return <div>{v}</div>;
}

export const Wrapped = React.memo(RealUsage);
