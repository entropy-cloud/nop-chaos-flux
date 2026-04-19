import { useCallback, useEffect, useState } from 'react';
import { parseRoute, buildRoute, type RouteSpec } from './route-model';

function readCurrentRoute(): RouteSpec {
  return parseRoute(window.location.hash || '#/');
}

function applyRoute(spec: RouteSpec) {
  const hash = buildRoute(spec);
  const bare = hash.startsWith('#') ? hash.slice(1) : hash;
  window.location.replace(`${window.location.pathname}${window.location.search}#${bare}`);
}

export function useRoute(): [RouteSpec, (spec: RouteSpec) => void] {
  const [route, setRoute] = useState<RouteSpec>(readCurrentRoute);

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(readCurrentRoute());
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = useCallback((spec: RouteSpec) => {
    applyRoute(spec);
  }, []);

  return [route, navigate];
}
