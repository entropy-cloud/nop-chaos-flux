function isNumericPathSegment(segment) {
    return typeof segment === 'string' && /^\d+$/.test(segment);
}
export function transformArrayIndexedPath(path, arrayPath, transformIndex) {
    if (path === arrayPath) {
        return path;
    }
    const prefix = `${arrayPath}.`;
    if (!path.startsWith(prefix)) {
        return path;
    }
    const remainder = path.slice(prefix.length);
    const [indexSegment, ...rest] = remainder.split('.');
    if (!isNumericPathSegment(indexSegment)) {
        return path;
    }
    const nextIndex = transformIndex(Number(indexSegment));
    if (nextIndex === undefined) {
        return undefined;
    }
    return [arrayPath, String(nextIndex), ...rest].filter(Boolean).join('.');
}
export function remapBooleanState(input, arrayPath, transformIndex) {
    const next = {};
    for (const [path, value] of Object.entries(input)) {
        const nextPath = transformArrayIndexedPath(path, arrayPath, transformIndex);
        if (nextPath) {
            next[nextPath] = value;
        }
    }
    return next;
}
export function remapErrorState(input, arrayPath, transformIndex) {
    const next = {};
    for (const [path, errors] of Object.entries(input)) {
        const nextPath = transformArrayIndexedPath(path, arrayPath, transformIndex);
        if (!nextPath) {
            continue;
        }
        const nextErrors = [];
        for (const error of errors) {
            const mappedPath = transformArrayIndexedPath(error.path, arrayPath, transformIndex);
            if (!mappedPath) {
                continue;
            }
            const mappedOwnerPath = error.ownerPath
                ? transformArrayIndexedPath(error.ownerPath, arrayPath, transformIndex) ?? error.ownerPath
                : error.ownerPath;
            const mappedRelatedPaths = error.relatedPaths?.map((relatedPath) => {
                const fullRelatedPath = relatedPath.includes('.') || !path.startsWith(arrayPath) ? relatedPath : `${arrayPath}.${relatedPath}`;
                const mappedRelatedPath = transformArrayIndexedPath(fullRelatedPath, arrayPath, transformIndex);
                if (!mappedRelatedPath) {
                    return relatedPath;
                }
                return relatedPath.includes('.') || !mappedRelatedPath.startsWith(`${arrayPath}.`)
                    ? mappedRelatedPath
                    : mappedRelatedPath.slice(arrayPath.length + 1);
            });
            nextErrors.push({
                ...error,
                path: mappedPath,
                ownerPath: mappedOwnerPath,
                relatedPaths: mappedRelatedPaths
            });
        }
        if (nextErrors.length > 0) {
            next[nextPath] = nextErrors;
        }
    }
    return next;
}
//# sourceMappingURL=form-path-state.js.map