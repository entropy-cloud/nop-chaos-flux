export declare function resolveClassAliases(className: string | undefined, aliases: Record<string, string> | undefined, visited?: Set<string>): string;
export declare function mergeClassAliases(parent: Record<string, string> | undefined, child: Record<string, string> | undefined): Record<string, string> | undefined;
