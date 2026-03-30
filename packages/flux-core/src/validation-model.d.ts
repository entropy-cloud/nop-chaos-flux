import type { CompiledFormValidationField, CompiledFormValidationModel, CompiledValidationBehavior, CompiledValidationNode, CompiledValidationNodeKind } from './types';
export declare function isCompiledValidationFieldNode(node: CompiledValidationNode | undefined): node is CompiledValidationNode & {
    kind: Exclude<CompiledValidationNodeKind, 'form'>;
    controlType: string;
    behavior: CompiledValidationBehavior;
};
export declare function toCompiledValidationField(node: CompiledValidationNode, fallbackBehavior: CompiledValidationBehavior): CompiledFormValidationField | undefined;
export declare function getCompiledValidationField(model: CompiledFormValidationModel | undefined, path: string): CompiledFormValidationField | undefined;
export declare function buildCompiledValidationFieldMap(nodes: Record<string, CompiledValidationNode> | undefined, fallbackBehavior: CompiledValidationBehavior): Record<string, CompiledFormValidationField>;
export declare function buildCompiledValidationDependentMap(nodes: Record<string, CompiledValidationNode> | undefined): Record<string, string[]>;
export declare function buildCompiledValidationOrder(nodes: Record<string, CompiledValidationNode> | undefined, rootPath: string | undefined): string[];
export declare function buildCompiledFormValidationModel(input: {
    behavior: CompiledValidationBehavior;
    nodes: Record<string, CompiledValidationNode> | undefined;
    rootPath?: string;
}): CompiledFormValidationModel | undefined;
export declare function getCompiledValidationTraversalOrder(model: CompiledFormValidationModel | undefined): string[];
export declare function getCompiledValidationDependents(model: CompiledFormValidationModel | undefined, path: string): string[];
export declare function getCompiledValidationNode(model: CompiledFormValidationModel | undefined, path: string): CompiledValidationNode | undefined;
export declare function getCompiledValidationNodeMap(model: CompiledFormValidationModel | undefined): Record<string, CompiledValidationNode> | undefined;
export declare function getCompiledValidationRootPath(model: CompiledFormValidationModel | undefined): string | undefined;
export declare function hasCompiledValidationNodes(model: CompiledFormValidationModel | undefined): boolean;
