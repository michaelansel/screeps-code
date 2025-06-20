import { HarvestEnergyTask } from "tasks";
import { Logger } from "./Logger";
import { SourcePlanner } from "planners/SourcePlanner";
import { Projects } from "projects/Project";
import { ProjectId } from "projects/Project";

export const Console = {
  Logger: () => {
    return Logger.instance;
  },
  LogEverything: () => {
    Console.Logger().setComponentLogLevel("DEFAULT_COMPONENT", "DEBUG");
  },
  SourcePlanner: () => {
    return SourcePlanner.instance;
  },
  resetSourcePlanner: () => {
    Object.values(Game.creeps).forEach(creep => {
      if (creep.task === HarvestEnergyTask) creep.stopTask();
    });
    delete Memory.SourcePlanner?.creeps;
  },
  
  /**
   * Display source capacity information for all rooms
   */
  sourceInfo: () => {
    console.log("📊 Source Capacity Analysis:");
    
    for (const roomName in Game.rooms) {
      const room = Game.rooms[roomName];
      const sourcesInfo = SourcePlanner.instance.getSourcesInfo(room);
      
      console.log(`\n🏠 Room ${roomName}:`);
      sourcesInfo.forEach((info, index) => {
        const utilization = info.assigned > 0 ? 
          `(${Math.round(info.assigned / info.capacity * 100)}% utilized)` : '';
        console.log(`  Source ${index + 1}: ${info.assigned}/${info.capacity} harvesters ${utilization}`);
      });
      
      const totalCapacity = sourcesInfo.reduce((sum, info) => sum + info.capacity, 0);
      const totalAssigned = sourcesInfo.reduce((sum, info) => sum + info.assigned, 0);
      console.log(`  Total: ${totalAssigned}/${totalCapacity} positions filled`);
    }
  },
  
  /**
   * Clear source capacity cache
   * @param sourceId Optional source ID to clear, or undefined to clear all
   */
  clearSourceCache: (sourceId?: string) => {
    SourcePlanner.instance.clearSourceCapacityCache(sourceId);
    console.log(sourceId ? 
      `✅ Cleared capacity cache for source ${sourceId}` : 
      `✅ Cleared all source capacity cache`);
  },
  
  // ========== PROJECT ASSIGNMENT HELPERS ==========
  
  /**
   * List all available projects that can be assigned to creeps
   */
  listProjects: () => {
    console.log("📋 Available Projects:");
    Object.keys(Projects).forEach(projectId => {
      console.log(`  • ${projectId}`);
    });
    return Object.keys(Projects);
  },
  
  /**
   * List all creeps and their current project assignments
   */
  listCreeps: () => {
    console.log("🤖 All Creeps and their Projects:");
    Object.entries(Game.creeps).forEach(([name, creep]) => {
      const projectId = creep.memory.project?.id || "NO PROJECT";
      const energy = `${creep.store[RESOURCE_ENERGY]}/${creep.store.getCapacity()}`;
      console.log(`  • ${name}: ${projectId} | Energy: ${energy}`);
    });
    return Object.keys(Game.creeps);
  },
  
  /**
   * Assign a project to a specific creep
   * @param creepName - Name of the creep to assign project to
   * @param projectId - ID of the project to assign
   * @param config - Optional project configuration
   */
  assignProject: (creepName: string, projectId: string, config: any = {}) => {
    const creep = Game.creeps[creepName];
    if (!creep) {
      console.log(`❌ Creep '${creepName}' not found`);
      return false;
    }
    
    if (!Projects[projectId as ProjectId]) {
      console.log(`❌ Project '${projectId}' not found. Available projects: ${Object.keys(Projects).join(', ')}`);
      return false;
    }
    
    // Stop current task if running
    if (creep.task) {
      try {
        creep.stopTask();
        console.log(`🛑 Stopped current task for ${creepName}`);
      } catch (error) {
        console.log(`⚠️  Could not stop current task for ${creepName}: ${error}`);
      }
    }
    
    // Assign new project
    creep.memory.project = {
      id: projectId as ProjectId,
      config: config
    };
    
    console.log(`✅ Assigned ${projectId} to ${creepName}`);
    return true;
  },
  
  /**
   * Assign a project to multiple creeps by name pattern
   * @param namePattern - Pattern to match creep names (supports wildcards with *)
   * @param projectId - ID of the project to assign
   * @param config - Optional project configuration
   */
  assignProjectToPattern: (namePattern: string, projectId: string, config: any = {}) => {
    if (!Projects[projectId as ProjectId]) {
      console.log(`❌ Project '${projectId}' not found. Available projects: ${Object.keys(Projects).join(', ')}`);
      return [];
    }
    
    const regex = new RegExp(namePattern.replace(/\*/g, '.*'));
    const matchingCreeps = Object.keys(Game.creeps).filter(name => regex.test(name));
    
    if (matchingCreeps.length === 0) {
      console.log(`❌ No creeps found matching pattern '${namePattern}'`);
      return [];
    }
    
    console.log(`🎯 Assigning ${projectId} to ${matchingCreeps.length} creeps matching '${namePattern}':`);
    
    const successful = [];
    for (const creepName of matchingCreeps) {
      if (Console.assignProject(creepName, projectId, config)) {
        successful.push(creepName);
      }
    }
    
    console.log(`✅ Successfully assigned ${projectId} to ${successful.length}/${matchingCreeps.length} creeps`);
    return successful;
  },
  
  /**
   * Assign projects to all creeps of a specific role
   * @param rolePrefix - Role prefix (e.g., "Harvester", "Builder", "Upgrader")
   * @param projectId - ID of the project to assign
   * @param config - Optional project configuration
   */
  assignProjectToRole: (rolePrefix: string, projectId: string, config: any = {}) => {
    return Console.assignProjectToPattern(`${rolePrefix}*`, projectId, config);
  },
  
  /**
   * Show detailed project status for all creeps
   */
  projectStatus: () => {
    console.log("📊 Detailed Project Status:");
    
    const projectStats: Record<string, string[]> = {};
    const creepsWithoutProjects: string[] = [];
    
    Object.entries(Game.creeps).forEach(([name, creep]) => {
      const projectId = creep.memory.project?.id;
      if (projectId) {
        if (!projectStats[projectId]) {
          projectStats[projectId] = [];
        }
        projectStats[projectId].push(name);
      } else {
        creepsWithoutProjects.push(name);
      }
    });
    
    console.log(`\n🤖 Total Creeps: ${Object.keys(Game.creeps).length}`);
    
    if (creepsWithoutProjects.length > 0) {
      console.log(`\n🚨 Creeps WITHOUT Projects (${creepsWithoutProjects.length}):`);
      creepsWithoutProjects.forEach(name => console.log(`  • ${name}`));
    }
    
    console.log(`\n📋 Project Assignments:`);
    Object.entries(projectStats).forEach(([projectId, creepNames]) => {
      console.log(`  ${projectId} (${creepNames.length}): ${creepNames.join(', ')}`);
    });
    
    return { projectStats, creepsWithoutProjects };
  }
};
