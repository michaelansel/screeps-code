import { expect } from "chai";
import { globalsCleanup, globalsSetup } from "test/unit/globals";
import { PickupEnergyTask } from "../../../src/tasks/PickupEnergyTask";
import type { PickupEnergyTaskConfig } from "../../../src/tasks/PickupEnergyTask";
import sinon from "sinon";

// Additional constants for PickupEnergyTask tests
(global as any).FIND_DROPPED_RESOURCES = 'find_dropped_resources';
(global as any).FIND_TOMBSTONES = 'find_tombstones';
(global as any).RESOURCE_ENERGY = 'energy';

describe("PickupEnergyTask", () => {
  let creep: Creep;
  let resource: Resource<ResourceConstant>;
  let tombstone: Tombstone;

  beforeEach(() => {
    globalsSetup();
    
    // Create creep using the test pattern
    creep = new Creep("test" as Id<Creep>);
    
    // Mock creep properties and methods
    (creep as any).name = "test-creep";
    (creep as any).store = {
      getFreeCapacity: sinon.stub().returns(50),
      getUsedCapacity: sinon.stub().returns(0),
    };
    (creep as any).pos = {
      getRangeTo: sinon.stub().returns(2),
      findInRange: sinon.stub().returns([]),
      findClosestByPath: sinon.stub().returns(null),
    };
    (creep as any).moveTo = sinon.stub().returns(0);
    (creep as any).pickup = sinon.stub().returns(0);
    (creep as any).withdraw = sinon.stub().returns(0);
    (creep as any).stopTask = sinon.stub();

    // Mock resource
    resource = {
      id: "resource1" as Id<Resource<ResourceConstant>>,
      resourceType: RESOURCE_ENERGY,
      amount: 100,
      pos: { x: 25, y: 25 } as any,
    } as any;

    // Mock tombstone
    tombstone = {
      id: "tombstone1" as Id<Tombstone>,
      store: {
        [RESOURCE_ENERGY]: 200,
      },
      pos: { x: 26, y: 26 } as any,
    } as any;

    // Mock Game.getObjectById
    global.Game = {
      getObjectById: (id: string) => {
        if (id === resource.id) return resource;
        if (id === tombstone.id) return tombstone;
        return null;
      },
    } as any;
  });

  afterEach(() => {
    globalsCleanup();
  });

  describe("resource pickup", () => {
    it("should pick up dropped resources when in range", () => {
      (creep.pos.getRangeTo as sinon.SinonStub).returns(1);
      const pickupStub = (creep.pickup as sinon.SinonStub).returns(0);

      const config: PickupEnergyTaskConfig = {
        target: resource.id,
        targetType: 'resource',
      } as any;

      PickupEnergyTask.run(creep, config);
      
      expect(pickupStub.calledWith(resource)).to.be.true;
      // Verify config was cleared after successful pickup
      expect(config.target).to.be.undefined;
      expect(config.targetType).to.be.undefined;
    });

    it("should move to resource when out of range", () => {
      (creep.pos.getRangeTo as sinon.SinonStub).returns(3);
      const moveToStub = (creep.moveTo as sinon.SinonStub).returns(0);

      const config: PickupEnergyTaskConfig = {
        target: resource.id,
        targetType: 'resource',
      } as any;

      PickupEnergyTask.run(creep, config);
      expect(moveToStub.calledWith(resource)).to.be.true;
    });
  });

  describe("tombstone withdrawal", () => {
    it("should withdraw from tombstone when in range", () => {
      (creep.pos.getRangeTo as sinon.SinonStub).returns(1);
      const withdrawStub = (creep.withdraw as sinon.SinonStub).returns(0);

      const config: PickupEnergyTaskConfig = {
        target: tombstone.id,
        targetType: 'tombstone',
      } as any;

      PickupEnergyTask.run(creep, config);
      expect(withdrawStub.calledWith(tombstone, 'energy')).to.be.true;
      
      // Verify config was cleared after successful withdraw
      expect(config.target).to.be.undefined;
      expect(config.targetType).to.be.undefined;
    });

    it("should move to tombstone when out of range", () => {
      (creep.pos.getRangeTo as sinon.SinonStub).returns(3);
      const moveToStub = (creep.moveTo as sinon.SinonStub).returns(0);

      const config: PickupEnergyTaskConfig = {
        target: tombstone.id,
        targetType: 'tombstone',
      } as any;

      PickupEnergyTask.run(creep, config);
      expect(moveToStub.calledWith(tombstone)).to.be.true;
    });
  });

  describe("target finding", () => {
    it("should find both resources and tombstones when no target configured", () => {
      const findInRangeStub = (creep.pos.findInRange as sinon.SinonStub);
      findInRangeStub.withArgs('find_dropped_resources', 5).returns([resource]);
      findInRangeStub.withArgs('find_tombstones', 5).returns([tombstone]);
      
      (creep.pos.findClosestByPath as sinon.SinonStub).returns(resource);
      (creep.pos.getRangeTo as sinon.SinonStub).returns(3);
      const moveToStub = (creep.moveTo as sinon.SinonStub).returns(0);

      PickupEnergyTask.run(creep, {} as any);
      
      // Should find both types and move to closest
      expect(moveToStub.called).to.be.true;
    });
  });

  describe("edge cases", () => {
    it("should stop task when creep is full", () => {
      (creep.store.getFreeCapacity as sinon.SinonStub).returns(0);
      const stopTaskStub = (creep.stopTask as sinon.SinonStub);

      PickupEnergyTask.run(creep, {} as any);
      expect(stopTaskStub.called).to.be.true;
    });

    it("should clear target when it no longer exists", () => {
      const config: PickupEnergyTaskConfig = {
        target: "nonexistent" as any,
        targetType: 'resource',
      } as any;

      global.Game.getObjectById = () => null;
      const stopTaskStub = (creep.stopTask as sinon.SinonStub);

      PickupEnergyTask.run(creep, config);
      expect(config.target).to.be.undefined;
      expect(config.targetType).to.be.undefined;
      expect(stopTaskStub.called).to.be.true;
    });
  });
});