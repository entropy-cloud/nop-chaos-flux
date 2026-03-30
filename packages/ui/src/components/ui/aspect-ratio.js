import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from '../../lib/utils';
function AspectRatio({ ratio, className, ...props }) {
    return (_jsx("div", { "data-slot": "aspect-ratio", style: {
            "--ratio": ratio,
        }, className: cn("relative aspect-(--ratio)", className), ...props }));
}
export { AspectRatio };
//# sourceMappingURL=aspect-ratio.js.map