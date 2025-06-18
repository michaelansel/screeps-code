import { expect } from "chai";
import { CreepBaseExtensionClass } from "extensions/Creep/Base";

describe("CreepBaseExtension", () => {
  describe("CreepBaseExtensionClass", () => {
    it("should provide creep property access", () => {
      // Create a mock instance that extends CreepBaseExtensionClass
      class TestExtension extends CreepBaseExtensionClass {
        public getCreepId(): Id<Creep> {
          return this.creep.id;
        }

        public getCreepName(): string {
          return this.creep.name;
        }
      }

      // Create a mock creep object
      const mockCreep = {
        id: "test-creep-id" as Id<Creep>,
        name: "TestCreep1"
      };

      // Apply the extension to the mock creep
      const extendedCreep = Object.create(TestExtension.prototype);
      Object.assign(extendedCreep, mockCreep);

      // Test that the creep property works correctly
      expect(extendedCreep.getCreepId()).to.equal("test-creep-id");
      expect(extendedCreep.getCreepName()).to.equal("TestCreep1");
    });

    it("should handle type casting correctly", () => {
      class TestExtension extends CreepBaseExtensionClass {
        public testCreepAccess(): boolean {
          // This should not throw type errors when properly extended
          return this.creep !== null && this.creep !== undefined;
        }
      }

      const extendedCreep = Object.create(TestExtension.prototype);
      expect(extendedCreep.testCreepAccess()).to.be.true;
    });

    it("should work with inheritance chain", () => {
      // First level extension
      class FirstExtension extends CreepBaseExtensionClass {
        public firstMethod(): string {
          return "first";
        }
      }

      // Second level extension
      class SecondExtension extends FirstExtension {
        public secondMethod(): string {
          return this.firstMethod() + "-second";
        }
      }

      const extendedCreep = Object.create(SecondExtension.prototype);
      expect(extendedCreep.firstMethod()).to.equal("first");
      expect(extendedCreep.secondMethod()).to.equal("first-second");
    });
  });
});
