declare module 'node:fs' {
  export interface Dirent {
    name: string;
    isDirectory(): boolean;
    isFile(): boolean;
    isSymbolicLink(): boolean;
  }
  export function readFileSync(path: string | URL, encoding: string): string;
  export function readdirSync(path: string | URL): string[];
  export function readdirSync(path: string | URL, options: { withFileTypes: true }): Dirent[];
  export function statSync(path: string | URL): { isDirectory(): boolean; isFile(): boolean };
  export function existsSync(path: string | URL): boolean;
  export function writeFileSync(path: string | URL, data: string): void;
  export function mkdirSync(path: string | URL, options?: { recursive?: boolean }): string | undefined;
  export function mkdtempSync(prefix: string): string;
  export function rmSync(path: string | URL, options?: { recursive?: boolean; force?: boolean }): void;
  export function symlinkSync(target: string, path: string, type?: 'dir' | 'file' | 'junction'): void;
}

declare module 'node:os' {
  export function tmpdir(): string;
}

declare module 'node:fs/promises' {
  export function readFile(path: string | URL, encoding: string): Promise<string>;
}

declare module 'node:url' {
  export function fileURLToPath(url: string | URL): string;
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
