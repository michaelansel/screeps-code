/**
 * Container runtime management for Screeps server
 */
import { ContainerRuntime, ServerConfig } from '../types';
export declare class ContainerManager {
    private runtime;
    private config;
    constructor(config?: ServerConfig);
    /**
     * Detect available container runtime (Docker or Finch)
     */
    private detectRuntime;
    /**
     * Get container runtime info
     */
    getRuntime(): ContainerRuntime;
    /**
     * Execute container command with proper runtime
     */
    exec(command: string, timeout?: number): string;
    /**
     * Execute compose command
     */
    compose(command: string, timeout?: number): string;
    /**
     * Execute command inside container
     */
    execContainer(containerName: string, command: string, timeout?: number): string;
    /**
     * Build container if needed
     */
    buildContainer(): Promise<void>;
    /**
     * Start containers
     */
    startContainers(): Promise<void>;
    /**
     * Stop containers
     */
    stopContainers(): Promise<void>;
    /**
     * Check if containers are running
     */
    isRunning(): boolean;
    /**
     * Get container logs
     */
    getLogs(containerName: string, lines?: number): string;
    /**
     * Copy file to container
     */
    copyToContainer(containerName: string, hostPath: string, containerPath: string): void;
}
//# sourceMappingURL=ContainerManager.d.ts.map