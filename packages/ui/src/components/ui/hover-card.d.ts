import { PreviewCard as PreviewCardPrimitive } from "@base-ui/react/preview-card";
declare function HoverCard({ ...props }: PreviewCardPrimitive.Root.Props): import("react/jsx-runtime").JSX.Element;
declare function HoverCardTrigger({ ...props }: PreviewCardPrimitive.Trigger.Props): import("react/jsx-runtime").JSX.Element;
declare function HoverCardContent({ className, side, sideOffset, align, alignOffset, ...props }: PreviewCardPrimitive.Popup.Props & Pick<PreviewCardPrimitive.Positioner.Props, "align" | "alignOffset" | "side" | "sideOffset">): import("react/jsx-runtime").JSX.Element;
export { HoverCard, HoverCardTrigger, HoverCardContent };
