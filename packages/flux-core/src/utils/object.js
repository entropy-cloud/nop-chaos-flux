export function isPlainObject(value) {
    return Object.prototype.toString.call(value) === '[object Object]';
}
export function shallowEqual(left, right) {
    if (Object.is(left, right)) {
        return true;
    }
    if (!left || !right || typeof left !== 'object' || typeof right !== 'object') {
        return false;
    }
    if (Array.isArray(left) !== Array.isArray(right)) {
        return false;
    }
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    if (leftKeys.length !== rightKeys.length) {
        return false;
    }
    return leftKeys.every((key) => Object.is(left[key], right[key]));
}
//# sourceMappingURL=object.js.map