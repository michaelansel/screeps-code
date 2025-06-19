"use strict";
/**
 * Container runtime management for Screeps server
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContainerManager = void 0;
const child_process_1 = require("child_process");
class ContainerManager {
    runtime;
    config;
    constructor(config = {}) {
        this.config = {
            containerImage: 'screepers/screeps-launcher:functional',
            composeFile: './docker-compose.functional.yml',
            ports: { game: 21025, cli: 21026 },
            timeout: 120000,
            ...config
        };
        this.runtime = this.detectRuntime();
    }
    /**
     * Detect available container runtime (Docker or Finch)
     */
    detectRuntime() {
        try {
            (0, child_process_1.execSync)('finch --version', { stdio: 'pipe' });
            return { name: 'finch', available: true };
        }
        catch {
            try {
                (0, child_process_1.execSync)('docker --version', { stdio: 'pipe' });
                return { name: 'docker', available: true };
            }
            catch {
                throw new Error('No container runtime found. Install Docker or Finch.');
            }
        }
    }
    /**
     * Get container runtime info
     */
    getRuntime() {
        return this.runtime;
    }
    /**
     * Execute container command with proper runtime
     */
    exec(command, timeout = this.config.timeout) {
        const fullCommand = `${this.runtime.name} ${command}`;
        return (0, child_process_1.execSync)(fullCommand, {
            encoding: 'utf8',
            stdio: 'pipe',
            timeout
        });
    }
    /**
     * Execute compose command
     */
    compose(command, timeout = this.config.timeout) {
        return this.exec(`compose -f ${this.config.composeFile} ${command}`, timeout);
    }
    /**
     * Execute command inside container
     */
    execContainer(containerName, command, timeout = this.config.timeout) {
        return this.compose(`exec -T ${containerName} ${command}`, timeout);
    }
    /**
     * Build container if needed
     */
    async buildContainer() {
        console.log('🔨 Building Screeps server container...');
        try {
            this.compose('build screeps');
            console.log('✅ Container built successfully');
        }
        catch (error) {
            throw new Error(`Failed to build container: ${error}`);
        }
    }
    /**
     * Start containers
     */
    async startContainers() {
        console.log('🚀 Starting Screeps server...');
        try {
            this.compose('up -d');
            console.log('✅ Containers started');
        }
        catch (error) {
            throw new Error(`Failed to start containers: ${error}`);
        }
    }
    /**
     * Stop containers
     */
    async stopContainers() {
        console.log('🛑 Stopping containers...');
        try {
            this.compose('down -v');
            console.log('✅ Containers stopped');
        }
        catch (error) {
            console.warn('Failed to stop containers:', error);
        }
    }
    /**
     * Check if containers are running
     */
    isRunning() {
        try {
            const result = this.compose('ps -q');
            return result.trim().length > 0;
        }
        catch {
            return false;
        }
    }
    /**
     * Get container logs
     */
    getLogs(containerName, lines = 50) {
        try {
            return this.compose(`logs --tail ${lines} ${containerName}`);
        }
        catch (error) {
            return `Failed to get logs: ${error}`;
        }
    }
    /**
     * Copy file to container
     */
    copyToContainer(containerName, hostPath, containerPath) {
        // Create directory first
        const dir = containerPath.substring(0, containerPath.lastIndexOf('/'));
        this.execContainer(containerName, `mkdir -p ${dir}`);
        // Then copy the file
        this.compose(`cp "${hostPath}" ${containerName}:${containerPath}`);
    }
}
exports.ContainerManager = ContainerManager;
//# sourceMappingURL=ContainerManager.js.map