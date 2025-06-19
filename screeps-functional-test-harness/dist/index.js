"use strict";
/**
 * Screeps Functional Test Harness
 *
 * A reliable functional testing library for Screeps bots using containerized servers.
 * Provides clean separation of concerns with container management, server lifecycle,
 * game state operations, and bot deployment.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = exports.BotManager = exports.GameStateManager = exports.ServerManager = exports.ContainerManager = exports.ScreepsFunctionalTestHarness = void 0;
var ScreepsFunctionalTestHarness_1 = require("./ScreepsFunctionalTestHarness");
Object.defineProperty(exports, "ScreepsFunctionalTestHarness", { enumerable: true, get: function () { return ScreepsFunctionalTestHarness_1.ScreepsFunctionalTestHarness; } });
var ContainerManager_1 = require("./container/ContainerManager");
Object.defineProperty(exports, "ContainerManager", { enumerable: true, get: function () { return ContainerManager_1.ContainerManager; } });
var ServerManager_1 = require("./server/ServerManager");
Object.defineProperty(exports, "ServerManager", { enumerable: true, get: function () { return ServerManager_1.ServerManager; } });
var GameStateManager_1 = require("./game/GameStateManager");
Object.defineProperty(exports, "GameStateManager", { enumerable: true, get: function () { return GameStateManager_1.GameStateManager; } });
var BotManager_1 = require("./bot/BotManager");
Object.defineProperty(exports, "BotManager", { enumerable: true, get: function () { return BotManager_1.BotManager; } });
__exportStar(require("./types"), exports);
// Re-export the main class as default for convenience
var ScreepsFunctionalTestHarness_2 = require("./ScreepsFunctionalTestHarness");
Object.defineProperty(exports, "default", { enumerable: true, get: function () { return ScreepsFunctionalTestHarness_2.ScreepsFunctionalTestHarness; } });
//# sourceMappingURL=index.js.map