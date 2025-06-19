import { expect } from "chai";
import * as sinon from "sinon";
import { loadByIdFromTable, loadGameObjectById } from "utils/MemoryHelpers";

interface TestObject {
  id: Id<TestObject>;
  name: string;
}

describe("MemoryHelpers", () => {
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe("loadByIdFromTable", () => {
    let lookupTable: { [id: string]: TestObject };

    beforeEach(() => {
      lookupTable = {
        "obj1": { id: "obj1" as Id<TestObject>, name: "Object1" },
        "obj2": { id: "obj2" as Id<TestObject>, name: "Object2" },
        "obj3": { id: "obj3" as Id<TestObject>, name: "Object3" }
      };
    });

    it("should return object when ID exists in table", () => {
      const result = loadByIdFromTable("obj1" as Id<TestObject>, lookupTable);
      
      expect(result).to.not.be.undefined;
      expect(result!.id).to.equal("obj1");
      expect(result!.name).to.equal("Object1");
    });

    it("should return undefined when ID does not exist in table", () => {
      const result = loadByIdFromTable("nonexistent" as Id<TestObject>, lookupTable);
      
      expect(result).to.be.undefined;
    });

    it("should return undefined when ID is undefined", () => {
      const result = loadByIdFromTable(undefined, lookupTable);
      
      expect(result).to.be.undefined;
    });

    it("should handle empty lookup table", () => {
      const emptyTable: { [id: string]: TestObject } = {};
      const result = loadByIdFromTable("obj1" as Id<TestObject>, emptyTable);
      
      expect(result).to.be.undefined;
    });

    it("should work with different object types", () => {
      interface AnotherTestObject {
        id: Id<AnotherTestObject>;
        value: number;
      }

      const anotherTable: { [id: string]: AnotherTestObject } = {
        "item1": { id: "item1" as Id<AnotherTestObject>, value: 42 }
      };

      const result = loadByIdFromTable("item1" as Id<AnotherTestObject>, anotherTable);
      
      expect(result).to.not.be.undefined;
      expect(result!.value).to.equal(42);
    });

    it("should handle null values in table", () => {
      const tableWithNull = {
        "obj1": lookupTable["obj1"],
        "obj2": null as any
      };

      const result1 = loadByIdFromTable("obj1" as Id<TestObject>, tableWithNull);
      const result2 = loadByIdFromTable("obj2" as Id<TestObject>, tableWithNull);

      expect(result1).to.not.be.undefined;
      expect(result1!.name).to.equal("Object1");
      expect(result2).to.be.null;
    });
  });

  describe("loadGameObjectById", () => {
    let mockGame: any;

    beforeEach(() => {
      mockGame = {
        getObjectById: sandbox.stub()
      };
      global.Game = mockGame as any;
    });

    it("should return object when Game.getObjectById finds it", () => {
      const mockObject = { id: "test-id", name: "TestObject" };
      mockGame.getObjectById.withArgs("test-id").returns(mockObject);

      const result = loadGameObjectById("test-id" as Id<any>);

      expect(result).to.equal(mockObject);
      expect(mockGame.getObjectById.calledOnce).to.be.true;
      expect(mockGame.getObjectById.calledWith("test-id")).to.be.true;
    });

    it("should return undefined when Game.getObjectById returns null", () => {
      mockGame.getObjectById.withArgs("nonexistent-id").returns(null);

      const result = loadGameObjectById("nonexistent-id" as Id<any>);

      expect(result).to.be.undefined;
      expect(mockGame.getObjectById.calledOnce).to.be.true;
    });

    it("should return undefined when Game.getObjectById returns falsy value", () => {
      mockGame.getObjectById.withArgs("invalid-id").returns(false);

      const result = loadGameObjectById("invalid-id" as Id<any>);

      expect(result).to.be.undefined;
    });

    it("should return undefined when ID is undefined", () => {
      const result = loadGameObjectById(undefined);

      expect(result).to.be.undefined;
      expect(mockGame.getObjectById.called).to.be.false;
    });

    it("should handle different object types", () => {
      const mockCreep = { 
        id: "creep-id", 
        name: "TestCreep", 
        body: [{ type: "work", hits: 100 }] 
      };
      mockGame.getObjectById.withArgs("creep-id").returns(mockCreep);

      const result = loadGameObjectById("creep-id" as Id<Creep>);

      expect(result).to.equal(mockCreep);
      expect(result!.name).to.equal("TestCreep");
    });

    it("should handle Game.getObjectById throwing an error", () => {
      mockGame.getObjectById.throws(new Error("Game object lookup failed"));

      expect(() => loadGameObjectById("error-id" as Id<any>)).to.throw("Game object lookup failed");
    });

    it("should work with valid screeps object IDs", () => {
      const mockSource = {
        id: "source-id",
        energy: 3000,
        energyCapacity: 3000,
        pos: { x: 25, y: 25, roomName: "W1N1" }
      };
      mockGame.getObjectById.withArgs("source-id").returns(mockSource);

      const result = loadGameObjectById("source-id" as Id<Source>);

      expect(result).to.equal(mockSource);
      expect(result!.energy).to.equal(3000);
    });
  });

  describe("integration scenarios", () => {
    it("should work together for caching and fallback patterns", () => {
      // Simulate a cache lookup that fails, then falls back to Game lookup
      const cache: { [id: string]: TestObject } = {};
      const mockGame = { getObjectById: sandbox.stub() };
      global.Game = mockGame as any;

      const testId = "cached-object" as Id<TestObject>;
      
      // First try cache (should fail)
      let result = loadByIdFromTable(testId, cache);
      expect(result).to.be.undefined;

      // Then try Game lookup (should succeed)
      const gameObject = { id: testId, name: "FromGame" };
      mockGame.getObjectById.withArgs(testId).returns(gameObject);
      
      result = loadGameObjectById(testId);
      expect(result).to.equal(gameObject);
    });
  });
});