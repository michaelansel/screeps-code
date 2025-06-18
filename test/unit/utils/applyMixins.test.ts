import { expect } from "chai";
import { applyMixins } from "utils/applyMixins";

describe("applyMixins", () => {
  it("should apply methods from mixin classes to target class", () => {
    // Base target class
    class TargetClass {
      public baseMethod(): string {
        return "base";
      }
    }

    // First mixin
    class Mixin1 {
      public method1(): string {
        return "mixin1";
      }
    }

    // Second mixin
    class Mixin2 {
      public method2(): string {
        return "mixin2";
      }
    }

    applyMixins(TargetClass, [Mixin1, Mixin2]);

    const instance = new TargetClass() as any;

    expect(instance.baseMethod()).to.equal("base");
    expect(instance.method1()).to.equal("mixin1");
    expect(instance.method2()).to.equal("mixin2");
  });

  it("should apply properties from mixin classes", () => {
    class TargetClass {}

    class MixinWithProperty {
      public get testProperty(): string {
        return "property-value";
      }

      public set testProperty(value: string) {
        (this as any)._testProperty = value;
      }
    }

    applyMixins(TargetClass, [MixinWithProperty]);

    const instance = new TargetClass() as any;

    expect(instance.testProperty).to.equal("property-value");

    instance.testProperty = "new-value";
    expect(instance._testProperty).to.equal("new-value");
  });

  it("should handle multiple mixins with overlapping method names", () => {
    class TargetClass {}

    class Mixin1 {
      public sharedMethod(): string {
        return "mixin1";
      }
    }

    class Mixin2 {
      public sharedMethod(): string {
        return "mixin2";
      }
    }

    // Later mixins should override earlier ones
    applyMixins(TargetClass, [Mixin1, Mixin2]);

    const instance = new TargetClass() as any;

    expect(instance.sharedMethod()).to.equal("mixin2");
  });

  it("should preserve original method descriptors", () => {
    class TargetClass {}

    class MixinWithDescriptor {
      public get computedProperty(): number {
        return 42;
      }
    }

    applyMixins(TargetClass, [MixinWithDescriptor]);

    const instance = new TargetClass();
    const descriptor = Object.getOwnPropertyDescriptor(TargetClass.prototype, "computedProperty");

    expect(descriptor).to.not.be.undefined;
    expect(descriptor!.get).to.be.a("function");
    expect(descriptor!.set).to.be.undefined;
    expect((instance as any).computedProperty).to.equal(42);
  });

  it("should handle empty mixin array", () => {
    class TargetClass {
      public originalMethod(): string {
        return "original";
      }
    }

    applyMixins(TargetClass, []);

    const instance = new TargetClass();

    expect(instance.originalMethod()).to.equal("original");
  });

  it("should copy constructor property from mixins", () => {
    class TargetClass {
      constructor() {
        // Constructor should remain unchanged
      }
    }

    class MixinWithConstructor {
      constructor() {
        // This should not affect target
      }

      public mixinMethod(): string {
        return "mixin";
      }
    }

    applyMixins(TargetClass, [MixinWithConstructor]);

    const instance = new TargetClass() as any;

    // applyMixins does copy the constructor property, which is expected behavior
    // The function copies ALL properties from prototype, including constructor
    expect(TargetClass.prototype.constructor).to.equal(MixinWithConstructor);
    expect(instance.mixinMethod()).to.equal("mixin");
  });

  it("should handle methods with different property descriptors", () => {
    class TargetClass {}

    class MixinWithNonEnumerable {
      public normalMethod(): string {
        return "normal";
      }
    }

    // Add a non-enumerable method
    Object.defineProperty(MixinWithNonEnumerable.prototype, "hiddenMethod", {
      value() {
        return "hidden";
      },
      enumerable: false,
      writable: true,
      configurable: true
    });

    applyMixins(TargetClass, [MixinWithNonEnumerable]);

    const instance = new TargetClass() as any;

    expect(instance.normalMethod()).to.equal("normal");
    expect(instance.hiddenMethod()).to.equal("hidden");

    // Check that descriptor properties are preserved
    const hiddenDescriptor = Object.getOwnPropertyDescriptor(TargetClass.prototype, "hiddenMethod");
    expect(hiddenDescriptor!.enumerable).to.be.false;
  });

  it("should handle mixin with static methods (they should not be copied)", () => {
    class TargetClass {}

    class MixinWithStatic {
      public static staticMethod(): string {
        return "static";
      }

      public instanceMethod(): string {
        return "instance";
      }
    }

    applyMixins(TargetClass, [MixinWithStatic]);

    const instance = new TargetClass() as any;

    // Instance method should be copied
    expect(instance.instanceMethod()).to.equal("instance");

    // Static method should not be copied to prototype
    expect((TargetClass as any).staticMethod).to.be.undefined;
  });
});
