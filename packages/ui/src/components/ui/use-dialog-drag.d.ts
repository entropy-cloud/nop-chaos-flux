import * as React from 'react';
interface Offset {
    x: number;
    y: number;
}
interface UseDialogDragOptions {
    enabled?: boolean;
    offsetRef?: React.MutableRefObject<Offset>;
    baseTransform?: string;
}
export declare function useDialogDrag(options?: UseDialogDragOptions, forwardedRef?: React.ForwardedRef<HTMLDivElement>): {
    contentRef: (node: HTMLDivElement | null) => void;
    handlePointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
    resetPosition: () => void;
};
export {};
