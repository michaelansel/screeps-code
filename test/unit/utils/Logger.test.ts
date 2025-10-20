import { DEFAULT_COMPONENT, Logger } from "utils/Logger";
import { assert } from "chai";
import sinon from "sinon";

describe("Logger", () => {
  afterEach(() => {
    sinon.restore();
  });

  it("should output when all logging is enabled", () => {
    Logger.instance.setComponentLogLevel(DEFAULT_COMPONENT, "DEBUG");
    const consoleLog = sinon.fake();
    Logger.instance.setOutputFunction(consoleLog);
    Logger.instance.debug("test");
    sinon.assert.calledOnce(consoleLog);
  });

  it("should output if component is enabled", () => {
    Logger.instance.setComponentLogLevel(DEFAULT_COMPONENT, "ERROR");
    Logger.instance.setComponentLogLevel("test", "DEBUG");
    const consoleLog = sinon.fake();
    Logger.instance.setOutputFunction(consoleLog);
    Logger.get("test").debug("test");
    sinon.assert.calledOnce(consoleLog);
  });

  it("should output if parent component is enabled", () => {
    Logger.instance.setComponentLogLevel(DEFAULT_COMPONENT, "DEBUG");
    Logger.instance.setComponentLogLevel("test", "ERROR");
    const consoleLog = sinon.fake();
    Logger.instance.setOutputFunction(consoleLog);
    Logger.get("test").debug("test");
    sinon.assert.calledOnce(consoleLog);
  });

  it("should not output if all components are disabled", () => {
    Logger.instance.setComponentLogLevel(DEFAULT_COMPONENT, "ERROR");
    Logger.instance.setComponentLogLevel("test", "ERROR");
    const consoleLog = sinon.fake();
    Logger.instance.setOutputFunction(consoleLog);
    Logger.get("test").debug("test");
    sinon.assert.notCalled(consoleLog);
  });

  it("should remember the logging configuration across ticks", () => {
    // Set up logging configuration
    Logger.instance.setComponentLogLevel("test", "DEBUG");
    Logger.instance.setComponentLogLevel("another", "WARN");

    // Simulate tick boundary by creating a new Logger instance
    // In the real game, the Logger singleton would be recreated each tick
    // For this test, we need to reset the singleton and verify it loads from Memory

    // Reset the singleton for testing
    // eslint-disable-next-line no-underscore-dangle, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    (Logger as any)._instance = undefined;

    // Create new instance (should load from memory)
    const newLogger = Logger.instance;

    // Verify configuration was restored
    assert.equal(newLogger.getComponentLogLevel("test"), "DEBUG");
    assert.equal(newLogger.getComponentLogLevel("another"), "WARN");
  });
});
