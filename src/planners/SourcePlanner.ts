import { BackingMemoryRecord, MemoryBackedClass, SerDeFunctions } from "utils/MemoryBackedClass";
import { HarvestEnergyTask, Tasks } from "tasks";
import { TaskBehavior, TaskId } from "tasks/Task";
import { IdMap } from "utils/IdMap";
import { Logger } from "utils/Logger";

interface SourcePlannerCreepData {
  task: TaskBehavior<TaskId>;
  source?: Source;
}
type SourcePlannerCreepDataMemory = BackingMemoryRecord<SourcePlannerCreepData>;

type SourcePlannerCreeps = Record<string, SourcePlannerCreepData>;
type SourcePlannerCreepsMemory = Record<string, SourcePlannerCreepDataMemory>;
export interface SourcePlannerMemory {
  creeps?: SourcePlannerCreepsMemory;
  sourceCapacities?: Record<string, number>; // Cache source capacities by source ID
}

export class SourcePlanner extends MemoryBackedClass {
  // Singleton
  private static singleton: SourcePlanner;
  public static get instance(): SourcePlanner {
    if (!SourcePlanner.singleton) {
      SourcePlanner.singleton = new SourcePlanner();
    }
    return SourcePlanner.singleton;
  }

  private creeps: SourcePlannerCreeps;
  private logger: Logger;
  private sourceCapacityCache: Record<string, number> = {};

  private constructor() {
    super();
    this.logger = Logger.get("SourcePlanner");
    this.creeps = this.proxyMapOfRecords<SourcePlannerCreepData>(
      this.proxySourcePlannerCreepData.bind(this),
      this.fetchCreepsMemory.bind(this),
      {},
      {}
    );
    this.loadSourceCapacityCache();
  }

  private fetchMemory(): SourcePlannerMemory {
    if (Memory.SourcePlanner === undefined) Memory.SourcePlanner = {};
    return Memory.SourcePlanner;
  }

  private fetchCreepsMemory(): SourcePlannerCreepsMemory {
    const memory = this.fetchMemory();
    if (memory.creeps === undefined) memory.creeps = {};
    return memory.creeps;
  }

  private loadSourceCapacityCache(): void {
    const memory = this.fetchMemory();
    if (memory.sourceCapacities) {
      this.sourceCapacityCache = memory.sourceCapacities;
    }
  }

  private saveSourceCapacityCache(): void {
    const memory = this.fetchMemory();
    memory.sourceCapacities = this.sourceCapacityCache;
  }

  /**
   * Calculate how many creeps can harvest from a source simultaneously
   * by checking walkable positions around the source
   */
  private calculateSourceCapacity(source: Source): number {
    // Check if we have a cached value
    if (this.sourceCapacityCache[source.id] !== undefined) {
      return this.sourceCapacityCache[source.id];
    }

    const terrain = source.room.getTerrain();
    let walkablePositions = 0;

    // Check all 8 positions around the source
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue; // Skip the source position itself

        const x = source.pos.x + dx;
        const y = source.pos.y + dy;

        // Check if position is within room bounds
        if (x < 0 || x > 49 || y < 0 || y > 49) continue;

        // Check if terrain is walkable (not a wall)
        if (terrain.get(x, y) !== TERRAIN_MASK_WALL) {
          // Check if there's a blocking structure (besides roads/containers)
          const structures = source.room.lookForAt(LOOK_STRUCTURES, x, y);
          const hasBlockingStructure = structures.some(structure => {
            // Roads and containers don't block movement
            return structure.structureType !== STRUCTURE_ROAD && 
                   structure.structureType !== STRUCTURE_CONTAINER;
          });

          if (!hasBlockingStructure) {
            walkablePositions++;
          }
        }
      }
    }

    // Cache the result
    this.sourceCapacityCache[source.id] = walkablePositions;
    this.saveSourceCapacityCache();

    this.logger.info(`Source ${source.id} can support ${walkablePositions} harvesters`);
    return walkablePositions;
  }

  private proxySourcePlannerCreepData(
    fetchMemory: () => BackingMemoryRecord<SourcePlannerCreepDataMemory>,
    cache?: SourcePlannerCreepData
  ): SourcePlannerCreepData | undefined {
    const serde: SerDeFunctions<SourcePlannerCreepData> = {
      task: {
        required: true,
        fromMemory: (m: SourcePlannerCreepDataMemory) => {
          return this.loadByIdFromTable(m.task, Tasks);
        },
        toMemory: (m: SourcePlannerCreepDataMemory, task: TaskBehavior<TaskId>) => {
          m.task = task.id;
          return true;
        }
      },
      source: {
        required: false,
        fromMemory: (m: SourcePlannerCreepDataMemory) => {
          return this.loadGameObjectById(m.source);
        },
        toMemory: (m: SourcePlannerCreepDataMemory, source: Source | undefined) => {
          if (source === undefined) {
            m.source = undefined;
          } else {
            m.source = source.id;
          }
          return true;
        }
      }
    };
    return this.proxyGenericRecord<SourcePlannerCreepData>(serde, fetchMemory, {} as SourcePlannerCreepData, cache);
  }

  private _addRequest(creep: Creep) {
    if (creep.task === null) {
      this.logger.warn(`Ignoring source request from ${creep.name} because task is null`);
    } else {
      this.creeps[creep.name] = {
        task: creep.task
      };
    }
  }

  private _assignCreepToSource(creep: Creep, source: Source) {
    this.creeps[creep.name].source = source;
  }

  private requestingCreeps(): Creep[] {
    for (const name in this.creeps) {
      // Only maintain request until task changes
      if (name in Game.creeps && Game.creeps[name].task === this.creeps[name].task) {
        continue;
      } else {
        // Creep is dead or has changed task
        this.logger.debug("cleaning up old creep data for " + name);
        delete this.creeps[name];
      }
    }
    return Object.keys(this.creeps).map(name => {
      return Game.creeps[name];
    });
  }

  private requestingCreepsInRoom(room: Room): Creep[] {
    return this.requestingCreeps().filter(creep => {
      return creep.room.name === room.name;
    }); // TODO compare objects directly?
  }

  private sourcesInRoom(room: Room): Source[] {
    const sources = room.find(FIND_SOURCES);
    return sources;
  }

  private unassignedCreepsInRoom(room: Room): Creep[] {
    const allCreeps = this.requestingCreepsInRoom(room);
    const unassignedCreepsInRoom = allCreeps.filter(creep => {
      return this.creeps[creep.name].source === undefined;
    });
    return unassignedCreepsInRoom;
  }

  private creepsBySourceInRoom(room: Room): Map<Source, Creep[]> {
    const allRequestingCreeps = this.requestingCreepsInRoom(room);
    const unassignedCreepsMap = allRequestingCreeps.reduce((map: { [name: string]: Creep }, creep: Creep) => {
      map[creep.name] = creep;
      return map;
    }, {});
    const creepsBySource = new IdMap<Source, Creep[]>();
    // Rebuild assignment index
    for (const creep of allRequestingCreeps) {
      const creepData = this.creeps[creep.name];
      if (creepData.source !== undefined) {
        this.logger.debug(`${creep.name} previously assigned to ${creepData.source.id}`);
        const assignedCreeps = creepsBySource.get(creepData.source) || [];
        assignedCreeps.push(creep);
        creepsBySource.set(creepData.source, assignedCreeps);
        delete unassignedCreepsMap[creep.name];
      }
    }
    return creepsBySource;
  }

  // Request SourcePlanner to assign a Source by the end of the tick; may or may not happen
  public requestSourceAssignment(creep: Creep): void {
    this.logger.info(`${creep.name} would like to harvest from an available Source`);
    this._addRequest(creep);
    // TODO if source assigned, return it
  }

  // Request SourcePlanner to assign Creeps to Sources in a given room
  public assignSources(room: Room): void {
    const sources: Source[] = this.sourcesInRoom(room);
    const unassignedCreeps: { [name: string]: Creep } = this.unassignedCreepsInRoom(room).reduce(
      (map: { [key: string]: Creep }, data: Creep) => {
        const key: string = data.name;
        map[key] = data;
        return map;
      },
      {}
    );
    const creepsBySource: Map<Source, Creep[]> = this.creepsBySourceInRoom(room);

    const allSourcesInMap = sources.reduce((output: boolean, source: Source) => {
      return output && creepsBySource.has(source);
    }, true);
    this.logger.debug("All Sources in Map? ", allSourcesInMap);
    this.logger.debug("Source.length vs Map.length", sources.length, Array.from(creepsBySource.keys()).length);

    const noCreepsAssigned = sources.reduce((output: boolean, source: Source) => {
      return output && (creepsBySource.get(source) || []).length === 0;
    }, true);
    this.logger.debug("No Creeps Assigned? ", noCreepsAssigned);

    // TODO Optimize requests based on number of WORK parts and path distance to Source
    for (const source of sources) {
      const assignedCreeps = creepsBySource.get(source) || [];
      creepsBySource.set(source, assignedCreeps);
      
      // Calculate the actual capacity of this source based on geography
      const sourceCapacity = this.calculateSourceCapacity(source);
      
      if (assignedCreeps.length > sourceCapacity) {
        this.logger.warn(`Recorded state oversubscribes ${source.id}. Expected: ${sourceCapacity} ; Actual: ${assignedCreeps.length}`);
      } else {
        this.logger.debug(`Source[${source.id}]: ${assignedCreeps.length}/${sourceCapacity}`);
      }
      
      while (assignedCreeps.length < sourceCapacity && Object.keys(unassignedCreeps).length > 0) {
        const nextCreepName = Object.keys(unassignedCreeps)[0];
        const nextCreep = unassignedCreeps[nextCreepName];
        if (nextCreep === undefined) break; // this should be impossible, so bail rather than possibly infinite loop
        this.logger.info(`Assigning ${nextCreep.name} to Source[${source.id}] (${assignedCreeps.length + 1}/${sourceCapacity})`);
        assignedCreeps.push(nextCreep);
        delete unassignedCreeps[nextCreepName];
      }
    }
    // Persist the plan
    for (const source of creepsBySource.keys()) {
      const creeps = creepsBySource.get(source);
      if (creeps === undefined) continue;
      for (const creep of creeps) {
        this.logger.debug(`Persisting assignment: ${creep.name} assigned to Source[${source.id}]`);
        // Save in planner memory
        this._assignCreepToSource(creep, source);
        // Save in creep memory
        // TODO this is an incredibly leaky abstraction
        if (creep.task === HarvestEnergyTask) {
          HarvestEnergyTask.updateSource(creep, source);
        }
      }
    }
    if (Object.keys(unassignedCreeps).length > 0) {
      this.logger.warn(
        "Ran out of space at Sources for waiting creeps: " +
          Object.values(unassignedCreeps)
            .map(creep => {
              return creep.name;
            })
            .join(", ")
      );
    }
  }

  /**
   * Get the capacity of a source (how many creeps can harvest simultaneously)
   * @param source The source to check
   * @returns The number of creeps that can harvest from this source
   */
  public getSourceCapacity(source: Source): number {
    return this.calculateSourceCapacity(source);
  }

  /**
   * Clear the source capacity cache for a specific source or all sources
   * Useful when room structures change
   * @param sourceId Optional source ID to clear, or undefined to clear all
   */
  public clearSourceCapacityCache(sourceId?: string): void {
    if (sourceId) {
      delete this.sourceCapacityCache[sourceId];
      this.logger.info(`Cleared capacity cache for source ${sourceId}`);
    } else {
      this.sourceCapacityCache = {};
      this.logger.info(`Cleared all source capacity cache`);
    }
    this.saveSourceCapacityCache();
  }

  /**
   * Get information about all sources in a room with their capacities
   * @param room The room to analyze
   * @returns Array of source info objects
   */
  public getSourcesInfo(room: Room): Array<{ source: Source; capacity: number; assigned: number }> {
    const sources = this.sourcesInRoom(room);
    const creepsBySource = this.creepsBySourceInRoom(room);
    
    return sources.map(source => ({
      source,
      capacity: this.calculateSourceCapacity(source),
      assigned: (creepsBySource.get(source) || []).length
    }));
  }
}
