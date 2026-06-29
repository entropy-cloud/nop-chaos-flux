declare module 'node:fs' {
  export function readFileSync(path: string | URL, encoding: string): string;
  export function readdirSync(path: string | URL): string[];
  export function statSync(path: string | URL): { isDirectory(): boolean; isFile(): boolean };
  export function existsSync(path: string | URL): boolean;
}

declare module 'node:path' {
  export function extname(path: string): string;
  export function join(...paths: string[]): string;
  export function dirname(path: string): string;
  export function relative(from: string, to: string): string;
}

interface ImportMeta {
  dirname: string;
}
