type JsonViewerProps = {
    data: Record<string, unknown> | unknown[];
    defaultExpand?: boolean;
    className?: string;
};
declare function JsonViewer({ data, defaultExpand, className }: JsonViewerProps): import("react/jsx-runtime").JSX.Element;
type DataViewerProps = {
    data: Record<string, unknown> | unknown[];
    defaultExpand?: boolean;
    className?: string;
};
declare function DataViewer({ data, defaultExpand, className }: DataViewerProps): import("react/jsx-runtime").JSX.Element;
export { JsonViewer, DataViewer };
export type { JsonViewerProps, DataViewerProps };
