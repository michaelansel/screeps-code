import { expect } from "chai";
import * as sinon from "sinon";
import { SourcePlanner } from "planners/SourcePlanner";
import { HarvestEnergyTask } from "tasks/HarvestEnergyTask";

describe("SourcePlanner - Source Capacity", () => {
  let sandbox: sinon.SinonSandbox;
  let mockGame: any;
  let mockMemory: any;
  let sourcePlanner: SourcePlanner;
  let mockRoom: any;
  let mockSource: any;
  let mockTerrain: any;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    
    // Mock terrain
    mockTerrain = {
      get: sandbox.stub()
    };
    
    // Mock source
    mockSource = {
      id: "source1",
      pos: { x: 25, y: 25 },
      room: null // Will be set to mockRoom
    };
    
    // Mock room
    mockRoom = {
      name: "W10N10",
      getTerrain: sandbox.stub().returns(mockTerrain),
      lookForAt: sandbox.stub().returns([]),
      find: sandbox.stub()
    };
    
    // Link source to room
    mockSource.room = mockRoom;
    
    // Mock Game
    mockGame = {
      rooms: { W10N10: mockRoom },
      creeps: {},
      getObjectById: sandbox.stub()
    };
    
    // Mock Memory
    mockMemory = {
      SourcePlanner: {
        creeps: {},
        sourceCapacities: {}
      }
    };
    
    // Set globals
    global.Game = mockGame;
    (global as any).Memory = mockMemory;
    (global as any).TERRAIN_MASK_WALL = 1;
    (global as any).LOOK_STRUCTURES = 'structure';
    (global as any).STRUCTURE_ROAD = 'road';
    (global as any).STRUCTURE_CONTAINER = 'container';
    (global as any).FIND_SOURCES = 1;
    
    // Get singleton instance
    sourcePlanner = SourcePlanner.instance;
  });

  afterEach(() => {
    sandbox.restore();
    // Clear singleton
    (SourcePlanner as any).singleton = undefined;
  });

  describe("calculateSourceCapacity", () => {
    it("should calculate capacity for a source with all positions open", () => {
      // All terrain positions are walkable (not walls)
      mockTerrain.get.returns(0); // Not a wall
      mockRoom.lookForAt.returns([]); // No structures
      
      const capacity = sourcePlanner.getSourceCapacity(mockSource);
      
      expect(capacity).to.equal(8); // All 8 positions around source are available
      expect(mockTerrain.get.callCount).to.equal(8);
    });

    it("should exclude wall positions from capacity", () => {
      // Make some positions walls
      mockTerrain.get.callsFake((x: number, y: number) => {
        // Wall on the left side (x=24)
        if (x === 24) return 1; // TERRAIN_MASK_WALL
        return 0; // Open terrain
      });
      mockRoom.lookForAt.returns([]); // No structures
      
      const capacity = sourcePlanner.getSourceCapacity(mockSource);
      
      expect(capacity).to.equal(5); // 8 positions - 3 walls = 5
    });

    it("should exclude positions with blocking structures", () => {
      mockTerrain.get.returns(0); // All terrain walkable
      
      // Add some blocking structures
      mockRoom.lookForAt.callsFake((type: string, x: number, y: number) => {
        if (x === 24 && y === 25) {
          return [{ structureType: 'spawn' }]; // Blocking structure
        }
        if (x === 26 && y === 25) {
          return [{ structureType: 'extension' }]; // Blocking structure
        }
        return [];
      });
      
      const capacity = sourcePlanner.getSourceCapacity(mockSource);
      
      expect(capacity).to.equal(6); // 8 positions - 2 blocked = 6
    });

    it("should not count roads and containers as blocking", () => {
      mockTerrain.get.returns(0); // All terrain walkable
      
      // Add roads and containers
      mockRoom.lookForAt.callsFake((type: string, x: number, y: number) => {
        if (x === 24 && y === 25) {
          return [{ structureType: 'road' }]; // Non-blocking
        }
        if (x === 26 && y === 25) {
          return [{ structureType: 'container' }]; // Non-blocking
        }
        return [];
      });
      
      const capacity = sourcePlanner.getSourceCapacity(mockSource);
      
      expect(capacity).to.equal(8); // Roads and containers don't block
    });

    it("should handle sources at room edges", () => {
      // Place source at edge
      mockSource.pos = { x: 0, y: 25 };
      mockSource.room = mockRoom;
      
      mockTerrain.get.returns(0); // All terrain walkable
      mockRoom.lookForAt.returns([]); // No structures
      
      const capacity = sourcePlanner.getSourceCapacity(mockSource);
      
      expect(capacity).to.equal(5); // Only 5 positions (3 would be out of bounds)
    });

    it("should handle sources in corners", () => {
      // Place source in corner
      mockSource.pos = { x: 0, y: 0 };
      mockSource.room = mockRoom;
      
      mockTerrain.get.returns(0); // All terrain walkable
      mockRoom.lookForAt.returns([]); // No structures
      
      const capacity = sourcePlanner.getSourceCapacity(mockSource);
      
      expect(capacity).to.equal(3); // Only 3 positions (5 would be out of bounds)
    });

    it("should cache capacity calculations", () => {
      mockTerrain.get.returns(0);
      mockRoom.lookForAt.returns([]);
      
      // First call calculates
      const capacity1 = sourcePlanner.getSourceCapacity(mockSource);
      const terrainCallCount1 = mockTerrain.get.callCount;
      
      // Second call should use cache
      const capacity2 = sourcePlanner.getSourceCapacity(mockSource);
      const terrainCallCount2 = mockTerrain.get.callCount;
      
      expect(capacity1).to.equal(capacity2);
      expect(terrainCallCount2).to.equal(terrainCallCount1); // No additional terrain checks
      expect(mockMemory.SourcePlanner.sourceCapacities.source1).to.equal(8);
    });

    it("should handle a source with only 1 accessible position", () => {
      // All positions blocked except one
      mockTerrain.get.callsFake((x: number, y: number) => {
        // Only position at (26, 25) is open
        if (x === 26 && y === 25) return 0;
        return 1; // Wall
      });
      mockRoom.lookForAt.returns([]);
      
      const capacity = sourcePlanner.getSourceCapacity(mockSource);
      
      expect(capacity).to.equal(1);
    });

    it("should handle a completely inaccessible source", () => {
      // All positions are walls
      mockTerrain.get.returns(1); // TERRAIN_MASK_WALL
      
      const capacity = sourcePlanner.getSourceCapacity(mockSource);
      
      expect(capacity).to.equal(0);
    });
  });

  describe("clearSourceCapacityCache", () => {
    beforeEach(() => {
      // Pre-populate cache in memory
      mockMemory.SourcePlanner.sourceCapacities = {
        source1: 3,
        source2: 2,
        source3: 1
      };
      // Force the planner to load the cache from memory
      const planner = SourcePlanner.instance;
      (planner as any).loadSourceCapacityCache();
    });

    it("should clear specific source from cache", () => {
      const planner = SourcePlanner.instance;
      
      planner.clearSourceCapacityCache("source2");
      
      expect(mockMemory.SourcePlanner.sourceCapacities).to.deep.equal({
        source1: 3,
        source3: 1
      });
    });

    it("should clear entire cache when no sourceId provided", () => {
      const planner = SourcePlanner.instance;
      
      planner.clearSourceCapacityCache();
      
      expect(mockMemory.SourcePlanner.sourceCapacities).to.deep.equal({});
    });
  });

  describe("getSourcesInfo", () => {
    let mockSource2: any;

    beforeEach(() => {
      mockSource2 = {
        id: "source2",
        pos: { x: 40, y: 40 },
        room: mockRoom
      };
      
      mockRoom.find.withArgs(FIND_SOURCES).returns([mockSource, mockSource2]);
      mockTerrain.get.returns(0); // All positions walkable
      mockRoom.lookForAt.returns([]); // No structures
    });

    it("should return info for all sources in room", () => {
      const info = sourcePlanner.getSourcesInfo(mockRoom);
      
      expect(info).to.have.length(2);
      expect(info[0]).to.deep.include({
        source: mockSource,
        capacity: 8,
        assigned: 0
      });
      expect(info[1]).to.deep.include({
        source: mockSource2,
        capacity: 8,
        assigned: 0
      });
    });

    it("should include assigned creep counts", () => {
      // Create mock creeps assigned to sources
      const mockCreep1 = {
        name: "harvester1",
        room: mockRoom,
        task: HarvestEnergyTask
      };
      const mockCreep2 = {
        name: "harvester2",
        room: mockRoom,
        task: HarvestEnergyTask
      };
      
      mockGame.creeps = {
        harvester1: mockCreep1,
        harvester2: mockCreep2
      };
      
      // Mock the assignment data
      mockMemory.SourcePlanner.creeps = {
        harvester1: { task: "HarvestEnergyTask", source: "source1" },
        harvester2: { task: "HarvestEnergyTask", source: "source1" }
      };
      
      mockGame.getObjectById.withArgs("source1").returns(mockSource);
      
      const info = sourcePlanner.getSourcesInfo(mockRoom);
      
      expect(info[0].assigned).to.equal(2); // Two creeps assigned to source1
      expect(info[1].assigned).to.equal(0); // No creeps assigned to source2
    });
  });

  describe("assignSources with capacity", () => {
    let mockCreep1: any, mockCreep2: any, mockCreep3: any, mockCreep4: any;

    beforeEach(() => {
      // Set up sources with different capacities
      mockRoom.find.withArgs(FIND_SOURCES).returns([mockSource]);
      
      // Create mock creeps
      mockCreep1 = {
        name: "harvester1",
        room: mockRoom,
        task: HarvestEnergyTask,
        memory: {}
      };
      mockCreep2 = {
        name: "harvester2",
        room: mockRoom,
        task: HarvestEnergyTask,
        memory: {}
      };
      mockCreep3 = {
        name: "harvester3",
        room: mockRoom,
        task: HarvestEnergyTask,
        memory: {}
      };
      mockCreep4 = {
        name: "harvester4",
        room: mockRoom,
        task: HarvestEnergyTask,
        memory: {}
      };
      
      mockGame.creeps = {
        harvester1: mockCreep1,
        harvester2: mockCreep2,
        harvester3: mockCreep3,
        harvester4: mockCreep4
      };
      
      // All creeps are requesting assignment
      mockMemory.SourcePlanner.creeps = {
        harvester1: { task: "HarvestEnergyTask" },
        harvester2: { task: "HarvestEnergyTask" },
        harvester3: { task: "HarvestEnergyTask" },
        harvester4: { task: "HarvestEnergyTask" }
      };
      
      // Stub HarvestEnergyTask.updateSource
      sandbox.stub(HarvestEnergyTask, 'updateSource');
    });

    it("should respect source capacity limits", () => {
      // Source has capacity for only 2 harvesters
      mockTerrain.get.callsFake((x: number, y: number) => {
        // Only 2 positions are open
        if ((x === 24 && y === 25) || (x === 26 && y === 25)) return 0;
        return 1; // Wall
      });
      
      sourcePlanner.assignSources(mockRoom);
      
      // Check that only 2 creeps were assigned
      const assignedCount = Object.values(mockMemory.SourcePlanner.creeps)
        .filter((data: any) => data.source === "source1").length;
      
      expect(assignedCount).to.equal(2);
    });

    it("should warn when creeps cannot be assigned due to capacity", () => {
      // Source has capacity for only 1 harvester
      mockTerrain.get.callsFake((x: number, y: number) => {
        // Only 1 position is open
        if (x === 24 && y === 25) return 0;
        return 1; // Wall
      });
      
      const loggerWarnStub = sandbox.stub(sourcePlanner['logger'], 'warn');
      
      sourcePlanner.assignSources(mockRoom);
      
      // Should warn about unassigned creeps
      expect(loggerWarnStub.calledWith(sinon.match(/Ran out of space/))).to.be.true;
    });
  });
});