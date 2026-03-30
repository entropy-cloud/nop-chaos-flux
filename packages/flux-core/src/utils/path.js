import { isPlainObject } from './object';
export function parsePath(path) {
    if (!path) {
        return [];
    }
    const normalized = path.replace(/\[(\d+)\]/g, '.$1');
    return normalized
        .split('.')
        .map((segment) => segment.trim())
        .filter(Boolean);
}
export function getIn(input, path) {
    if (!path) {
        return input;
    }
    return parsePath(path).reduce((current, segment) => {
        if (current == null || typeof current !== 'object') {
            return undefined;
        }
        return current[segment];
    }, input);
}
export function setIn(input, path, value) {
    if (!path) {
        return isPlainObject(value) ? value : input;
    }
    const segments = parsePath(path);
    const clone = Array.isArray(input) ? [...input] : { ...input };
    let cursor = clone;
    for (let index = 0; index < segments.length; index += 1) {
        const segment = segments[index];
        const nextSegment = segments[index + 1];
        const shouldCreateArray = nextSegment != null && /^\d+$/.test(nextSegment);
        if (index === segments.length - 1) {
            cursor[segment] = value;
            break;
        }
        const next = cursor[segment];
        const nextClone = Array.isArray(next)
            ? [...next]
            : isPlainObject(next)
                ? { ...next }
                : shouldCreateArray
                    ? []
                    : {};
        cursor[segment] = nextClone;
        cursor = nextClone;
    }
    return clone;
}
//# sourceMappingURL=path.js.map