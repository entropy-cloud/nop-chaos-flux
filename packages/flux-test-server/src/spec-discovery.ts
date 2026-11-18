import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';

export interface SpecDiscoveryArgs {
  spec?: string;
  dir?: string;
}

export function collectSpecFiles(args: SpecDiscoveryArgs): string[] {
  if (args.spec) return [path.resolve(args.spec)];
  const dir = path.resolve(args.dir ?? 'tests/e2e/flux');
  const out: string[] = [];
  const walk = (d: string) => {
    for (const name of readdirSync(d)) {
      const full = path.join(d, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (name.endsWith('.flux-spec.ts')) out.push(full);
    }
  };
  walk(dir);
  return out.sort();
}
