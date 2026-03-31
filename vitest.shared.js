"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSharedVitestConfig = createSharedVitestConfig;
var config_1 = require("vitest/config");
var vite_workspace_alias_1 = require("./vite.workspace-alias");
function createSharedVitestConfig(options) {
    return (0, config_1.defineConfig)(__assign(__assign({}, (options.includeWorkspaceAliases === false
        ? {}
        : {
            resolve: {
                alias: vite_workspace_alias_1.workspacePackageAliases
            }
        })), { test: {
            environment: options.environment
        } }));
}
