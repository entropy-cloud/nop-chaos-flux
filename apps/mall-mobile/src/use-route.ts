import { useCallback, useEffect, useState } from 'react';
import { parseRoute, buildRoute, type RouteSpec } from './route-model';

function readCurrentRoute(): RouteSpec {
  return parseRoute(window.location.hash || '#/');
}

function applyRoute(spec: RouteSpec, replace = false) {
  const hash = buildRoute(spec);
  const bare = hash.startsWith('#') ? hash.slice(1) : hash;
  const next = `${window.location.pathname}${window.location.search}#${bare}`;
  if (replace) {
    window.location.replace(next);
  } else {
    window.location.assign(next);
  }
}

export function useRoute(): [RouteSpec, (spec: RouteSpec, opts?: { replace?: boolean }) => void] {
  const [route, setRoute] = useState<RouteSpec>(readCurrentRoute);

  useEffect(() => {
    const handleHashChange = () => setRoute(readCurrentRoute());
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = useCallback((spec: RouteSpec, opts?: { replace?: boolean }) => {
    applyRoute(spec, opts?.replace ?? false);
  }, []);

  return [route, navigate];
}

export function back(): void {
  window.history.back();
}
