const SS_CELL = 'ss-cell';
const FONT_WEIGHT_MAP = {
    bold: 'ss-bold',
};
const FONT_STYLE_MAP = {
    italic: 'ss-italic',
};
const TEXT_DECORATION_MAP = {
    underline: 'ss-underline',
    'line-through': 'ss-strike',
};
const TEXT_ALIGN_MAP = {
    center: 'ss-align-center',
    right: 'ss-align-right',
};
const VERTICAL_ALIGN_MAP = {
    top: 'ss-valign-top',
    bottom: 'ss-valign-bottom',
};
const BORDER_STYLE_MAP = {
    solid: 'ss-border-solid',
    dashed: 'ss-border-dashed',
    dotted: 'ss-border-dotted',
    double: 'ss-border-double',
};
export function mapCellStyle(style) {
    if (!style) {
        return { className: SS_CELL, style: {} };
    }
    const classes = [SS_CELL];
    const inlineStyle = {};
    if (style.fontWeight && FONT_WEIGHT_MAP[style.fontWeight]) {
        classes.push(FONT_WEIGHT_MAP[style.fontWeight]);
    }
    if (style.fontStyle && FONT_STYLE_MAP[style.fontStyle]) {
        classes.push(FONT_STYLE_MAP[style.fontStyle]);
    }
    if (style.textDecoration && TEXT_DECORATION_MAP[style.textDecoration]) {
        classes.push(TEXT_DECORATION_MAP[style.textDecoration]);
    }
    if (style.textAlign && TEXT_ALIGN_MAP[style.textAlign]) {
        classes.push(TEXT_ALIGN_MAP[style.textAlign]);
    }
    if (style.verticalAlign && VERTICAL_ALIGN_MAP[style.verticalAlign]) {
        classes.push(VERTICAL_ALIGN_MAP[style.verticalAlign]);
    }
    if (style.wrapText) {
        classes.push('ss-wrap');
    }
    if (style.borderStyle && BORDER_STYLE_MAP[style.borderStyle]) {
        classes.push(BORDER_STYLE_MAP[style.borderStyle]);
    }
    if (style.fontSize != null) {
        inlineStyle.fontSize = typeof style.fontSize === 'number' ? `${style.fontSize}px` : style.fontSize;
    }
    if (style.fontFamily) {
        inlineStyle.fontFamily = style.fontFamily;
    }
    if (style.fontColor) {
        inlineStyle.color = style.fontColor;
    }
    if (style.backgroundColor) {
        inlineStyle.backgroundColor = style.backgroundColor;
    }
    if (style.textIndent != null) {
        inlineStyle.textIndent = typeof style.textIndent === 'number' ? `${style.textIndent}px` : style.textIndent;
    }
    appendBorderStyle(inlineStyle, 'borderTop', style.borderTop);
    appendBorderStyle(inlineStyle, 'borderRight', style.borderRight);
    appendBorderStyle(inlineStyle, 'borderBottom', style.borderBottom);
    appendBorderStyle(inlineStyle, 'borderLeft', style.borderLeft);
    if (style.borderColor) {
        if (!style.borderTop && !style.borderRight && !style.borderBottom && !style.borderLeft) {
            inlineStyle.borderColor = style.borderColor;
        }
    }
    if (style.borderWidth != null) {
        if (!style.borderTop && !style.borderRight && !style.borderBottom && !style.borderLeft) {
            inlineStyle.borderWidth = typeof style.borderWidth === 'number' ? `${style.borderWidth}px` : style.borderWidth;
        }
    }
    return {
        className: classes.join(' '),
        style: inlineStyle,
    };
}
function appendBorderStyle(target, prefix, border) {
    if (!border)
        return;
    const w = typeof border.width === 'number' ? `${border.width}px` : border.width;
    target[`${prefix}Width`] = w;
    target[`${prefix}Style`] = border.style;
    target[`${prefix}Color`] = border.color;
}
//# sourceMappingURL=cell-style-map.js.map