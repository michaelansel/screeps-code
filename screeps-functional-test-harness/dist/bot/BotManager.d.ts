/**
 * Bot code deployment and management
 */
import { ServerManager } from '../server/ServerManager';
import { GameStateManager } from '../game/GameStateManager';
import { DeploymentResult, ExecutionResult, MonitorOptions } from '../types';
export declare class BotManager {
    private serverManager;
    private gameStateManager;
    private testRoom;
    private lastDeployment;
    constructor(serverManager: ServerManager, gameStateManager: GameStateManager);
    /**
     * Deploy bot code to the server
     */
    deployBot(codePath: string, options?: {
        username?: string;
        room?: string;
        cpu?: number;
        cpuAvailable?: number;
    }): Promise<DeploymentResult>;
    /**
     * Monitor bot execution and collect evidence
     */
    monitorExecution(userId: string, options: MonitorOptions): Promise<ExecutionResult>;
    /**
     * Get the last deployment info
     */
    getLastDeployment(): DeploymentResult;
    /**
     * Check if there's a valid deployment without throwing
     */
    hasValidDeployment(): boolean;
    /**
     * Clear deployment state (useful after server reset)
     */
    clearDeployment(): void;
    /**
     * Set test room for deployments
     */
    setTestRoom(roomName: string): void;
    /**
     * Get current test room
     */
    getTestRoom(): string;
    /**
     * Utility sleep function
     */
    private sleep;
}
//# sourceMappingURL=BotManager.d.ts.map