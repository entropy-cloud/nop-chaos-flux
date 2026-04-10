import { useEffect } from 'react';

export function useMouseUpBinding(handleMouseUp: () => void) {
  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseUp]);
}
