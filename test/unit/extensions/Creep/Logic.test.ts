import { expect } from "chai";
import * as sinon from "sinon";
import { CreepLogicExtensionClass } from "extensions/Creep/Logic";

describe("CreepLogicExtension", () => {
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe("isFullOfEnergy", () => {
    it("should return true when creep is at full capacity with only energy", () => {
      const mockCreep = {
        store: {
          getCapacity: sandbox.stub().returns(100),
          getUsedCapacity: sandbox.stub().withArgs(RESOURCE_ENERGY).returns(100)
        }
      };

      const extendedCreep = Object.create(CreepLogicExtensionClass.prototype);
      Object.assign(extendedCreep, mockCreep);

      expect(extendedCreep.isFullOfEnergy).to.be.true;
    });

    it("should return false when creep has free capacity", () => {
      const mockCreep = {
        store: {
          getCapacity: sandbox.stub().returns(100),
          getUsedCapacity: sandbox.stub().withArgs(RESOURCE_ENERGY).returns(50)
        }
      };

      const extendedCreep = Object.create(CreepLogicExtensionClass.prototype);
      Object.assign(extendedCreep, mockCreep);

      expect(extendedCreep.isFullOfEnergy).to.be.false;
    });

    it("should return false when creep is full of non-energy resources", () => {
      // This tests the bug fix mentioned in the code comment
      const mockCreep = {
        store: {
          getCapacity: sandbox.stub().returns(100),
          getUsedCapacity: sandbox.stub().withArgs(RESOURCE_ENERGY).returns(0)
        }
      };

      const extendedCreep = Object.create(CreepLogicExtensionClass.prototype);
      Object.assign(extendedCreep, mockCreep);

      expect(extendedCreep.isFullOfEnergy).to.be.false;
    });

    it("should return false when creep is partially full of energy and other resources", () => {
      const mockCreep = {
        store: {
          getCapacity: sandbox.stub().returns(100),
          getUsedCapacity: sandbox.stub().withArgs(RESOURCE_ENERGY).returns(50)
          // Total used capacity would be 100 (50 energy + 50 minerals)
        }
      };

      const extendedCreep = Object.create(CreepLogicExtensionClass.prototype);
      Object.assign(extendedCreep, mockCreep);

      expect(extendedCreep.isFullOfEnergy).to.be.false;
    });

    it("should return false when creep has zero capacity", () => {
      const mockCreep = {
        store: {
          getCapacity: sandbox.stub().returns(0),
          getUsedCapacity: sandbox.stub().withArgs(RESOURCE_ENERGY).returns(0)
        }
      };

      const extendedCreep = Object.create(CreepLogicExtensionClass.prototype);
      Object.assign(extendedCreep, mockCreep);

      expect(extendedCreep.isFullOfEnergy).to.be.false;
    });

    it("should handle edge case with small amounts of energy", () => {
      const mockCreep = {
        store: {
          getCapacity: sandbox.stub().returns(1),
          getUsedCapacity: sandbox.stub().withArgs(RESOURCE_ENERGY).returns(1)
        }
      };

      const extendedCreep = Object.create(CreepLogicExtensionClass.prototype);
      Object.assign(extendedCreep, mockCreep);

      expect(extendedCreep.isFullOfEnergy).to.be.true;
    });
  });

  describe("inheritance", () => {
    it("should properly extend CreepBaseExtensionClass", () => {
      expect(CreepLogicExtensionClass.prototype).to.be.an.instanceof(Object);
      expect(new CreepLogicExtensionClass()).to.have.property("creep");
    });
  });
});
