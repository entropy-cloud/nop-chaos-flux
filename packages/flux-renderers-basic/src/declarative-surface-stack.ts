const openDeclarativeSurfaceIds: string[] = [];
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

function removeSurface(id: string) {
  const index = openDeclarativeSurfaceIds.lastIndexOf(id);
  if (index >= 0) {
    openDeclarativeSurfaceIds.splice(index, 1);
  }
}

export function registerDeclarativeSurface(id: string) {
  removeSurface(id);
  openDeclarativeSurfaceIds.push(id);
  notify();
}

export function unregisterDeclarativeSurface(id: string) {
  removeSurface(id);
  notify();
}

export function isDeclarativeSurfaceActive(id: string) {
  return openDeclarativeSurfaceIds[openDeclarativeSurfaceIds.length - 1] === id;
}

export function isDeclarativeSurfaceActiveInSnapshot(id: string, snapshot: string) {
  const ids = snapshot.split('|').filter(Boolean);
  return ids[ids.length - 1] === id;
}

export function subscribeDeclarativeSurfaceStack(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getDeclarativeSurfaceStackSnapshot() {
  return openDeclarativeSurfaceIds.join('|');
}
