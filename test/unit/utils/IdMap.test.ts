import { expect } from "chai";
import { IdMap } from "utils/IdMap";

interface TestObject {
  id: Id<TestObject>;
  name: string;
}

describe("IdMap", () => {
  let idMap: IdMap<TestObject, string>;
  let obj1: TestObject;
  let obj2: TestObject;

  beforeEach(() => {
    idMap = new IdMap<TestObject, string>();
    obj1 = { id: "test-id-1" as Id<TestObject>, name: "Object1" };
    obj2 = { id: "test-id-2" as Id<TestObject>, name: "Object2" };
  });

  describe("constructor", () => {
    it("should create an empty map", () => {
      expect(idMap.size).to.equal(0);
    });
  });

  describe("set and get", () => {
    it("should store and retrieve values by object key", () => {
      idMap.set(obj1, "value1");
      idMap.set(obj2, "value2");

      expect(idMap.get(obj1)).to.equal("value1");
      expect(idMap.get(obj2)).to.equal("value2");
    });

    it("should return this when setting values", () => {
      const result = idMap.set(obj1, "value1");
      expect(result).to.equal(idMap);
    });

    it("should return undefined for non-existent keys", () => {
      const obj3 = { id: "test-id-3" as Id<TestObject>, name: "Object3" };
      expect(idMap.get(obj3)).to.be.undefined;
    });

    it("should handle objects with same ID as equivalent", () => {
      const obj1Copy = { id: "test-id-1" as Id<TestObject>, name: "Object1Copy" };
      
      idMap.set(obj1, "original");
      idMap.set(obj1Copy, "copy");

      // Should overwrite because they have the same ID
      expect(idMap.get(obj1)).to.equal("copy");
      expect(idMap.get(obj1Copy)).to.equal("copy");
    });
  });

  describe("has", () => {
    it("should return true for existing keys", () => {
      idMap.set(obj1, "value1");
      expect(idMap.has(obj1)).to.be.true;
    });

    it("should return false for non-existent keys", () => {
      expect(idMap.has(obj1)).to.be.false;
    });

    it("should work with objects that have same ID", () => {
      const obj1Copy = { id: "test-id-1" as Id<TestObject>, name: "Object1Copy" };
      
      idMap.set(obj1, "value");
      expect(idMap.has(obj1Copy)).to.be.true;
    });
  });

  describe("delete", () => {
    it("should remove existing entries", () => {
      idMap.set(obj1, "value1");
      idMap.set(obj2, "value2");

      const result = idMap.delete(obj1);

      expect(result).to.be.true;
      expect(idMap.has(obj1)).to.be.false;
      expect(idMap.has(obj2)).to.be.true;
      expect(idMap.size).to.equal(1);
    });

    it("should return false for non-existent entries", () => {
      const result = idMap.delete(obj1);
      expect(result).to.be.false;
    });
  });

  describe("size", () => {
    it("should return correct size", () => {
      expect(idMap.size).to.equal(0);

      idMap.set(obj1, "value1");
      expect(idMap.size).to.equal(1);

      idMap.set(obj2, "value2");
      expect(idMap.size).to.equal(2);

      idMap.delete(obj1);
      expect(idMap.size).to.equal(1);
    });
  });

  describe("clear", () => {
    it("should remove all entries", () => {
      idMap.set(obj1, "value1");
      idMap.set(obj2, "value2");

      idMap.clear();

      expect(idMap.size).to.equal(0);
      expect(idMap.has(obj1)).to.be.false;
      expect(idMap.has(obj2)).to.be.false;
    });
  });

  describe("keys", () => {
    it("should return iterator of keys", () => {
      idMap.set(obj1, "value1");
      idMap.set(obj2, "value2");

      const keys = Array.from(idMap.keys());

      expect(keys).to.have.length(2);
      expect(keys).to.include(obj1);
      expect(keys).to.include(obj2);
    });

    it("should return empty iterator for empty map", () => {
      const keys = Array.from(idMap.keys());
      expect(keys).to.have.length(0);
    });
  });

  describe("values", () => {
    it("should return iterator of values", () => {
      idMap.set(obj1, "value1");
      idMap.set(obj2, "value2");

      const values = Array.from(idMap.values());

      expect(values).to.have.length(2);
      expect(values).to.include("value1");
      expect(values).to.include("value2");
    });

    it("should return empty iterator for empty map", () => {
      const values = Array.from(idMap.values());
      expect(values).to.have.length(0);
    });
  });

  describe("Symbol.toStringTag", () => {
    it("should have correct string tag", () => {
      expect(idMap[Symbol.toStringTag]).to.equal("IdMap");
    });
  });

  describe("unimplemented methods", () => {
    it("should throw error for forEach", () => {
      expect(() => idMap.forEach(() => {})).to.throw("Method not implemented.");
    });

    it("should throw error for entries", () => {
      expect(() => idMap.entries()).to.throw("Method not implemented.");
    });

    it("should throw error for Symbol.iterator", () => {
      expect(() => idMap[Symbol.iterator]()).to.throw("Method not implemented.");
    });
  });

  describe("edge cases", () => {
    it("should handle overwriting values", () => {
      idMap.set(obj1, "original");
      idMap.set(obj1, "updated");

      expect(idMap.get(obj1)).to.equal("updated");
      expect(idMap.size).to.equal(1);
    });

    it("should maintain reference to original key object", () => {
      const obj1Copy = { id: "test-id-1" as Id<TestObject>, name: "Copy" };
      
      idMap.set(obj1, "value");
      idMap.set(obj1Copy, "updated");

      const keys = Array.from(idMap.keys());
      expect(keys[0]).to.equal(obj1Copy); // Should be the last object set
      expect(keys[0].name).to.equal("Copy");
    });
  });
});