import { DEFAULT_COMPONENT, Logger } from "utils/Logger";
import sinon, { assert } from "sinon";

describe("Logger", () => {
  afterEach(() => {
    sinon.restore();
  });

  it("should output when all logging is enabled", () => {
    Logger.instance.setComponentLogLevel(DEFAULT_COMPONENT, "DEBUG");
    const consoleLog = sinon.fake();
    Logger.instance.setOutputFunction(consoleLog);
    Logger.instance.debug("test");
    assert.calledOnce(consoleLog);
  });

  it("should output if component is enabled", () => {
    Logger.instance.setComponentLogLevel(DEFAULT_COMPONENT, "ERROR");
    Logger.instance.setComponentLogLevel("test", "DEBUG");
    const consoleLog = sinon.fake();
    Logger.instance.setOutputFunction(consoleLog);
    Logger.get("test").debug("test");
    assert.calledOnce(consoleLog);
  });

  it("should output if parent component is enabled", () => {
    Logger.instance.setComponentLogLevel(DEFAULT_COMPONENT, "DEBUG");
    Logger.instance.setComponentLogLevel("test", "ERROR");
    const consoleLog = sinon.fake();
    Logger.instance.setOutputFunction(consoleLog);
    Logger.get("test").debug("test");
    assert.calledOnce(consoleLog);
  });

  it("should not output if all components are disabled", () => {
    Logger.instance.setComponentLogLevel(DEFAULT_COMPONENT, "ERROR");
    Logger.instance.setComponentLogLevel("test", "ERROR");
    const consoleLog = sinon.fake();
    Logger.instance.setOutputFunction(consoleLog);
    Logger.get("test").debug("test");
    assert.notCalled(consoleLog);
  });

  it("should remember the logging configuration across ticks");
});
