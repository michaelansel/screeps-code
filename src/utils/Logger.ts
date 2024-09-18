interface LogInterface {
  debug(message: string, ...data: any[]): void;
  info(message: string, ...data: any[]): void;
  warn(message: string, ...data: any[]): void;
  error(message: string, ...data: any[]): void;
}

const LogLevels: LogLevel[] = ["DEBUG", "INFO", "WARN", "ERROR"];

type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

export const DEFAULT_COMPONENT: string = "DEFAULT_COMPONENT";

export class Logger implements LogInterface {
  public static _instance: Logger;
  public static get instance() {
    if (this._instance === undefined) {
      this._instance = new Logger(DEFAULT_COMPONENT);
    }
    return this._instance;
  }

  public static get(component: string) {
    return new Logger(component, Logger.instance);
  }

  private _componentLogLevels: { [component: string]: LogLevel } = { DEFAULT_COMPONENT: "ERROR" };
  protected get componentLogLevels(): { [component: string]: LogLevel } {
    if (this.parent) {
      return this.parent.componentLogLevels;
    } else {
      return this._componentLogLevels;
    }
  }
  public getComponentLogLevel(component: string): LogLevel {
    if (this.parent) {
      return this.parent.getComponentLogLevel(component);
    } else {
      if (component in this.componentLogLevels) {
        return this.componentLogLevels[component];
      } else {
        return this.componentLogLevels[DEFAULT_COMPONENT];
      }
    }
  }
  public setComponentLogLevel(component: string, level: LogLevel): void {
    if (this.parent) {
      this.parent.setComponentLogLevel(component, level);
    } else {
      this._componentLogLevels[component] = level;
    }
  }

  private output: (...data: any[]) => void = console.log;
  private component: string;
  private parent: Logger | undefined;
  private constructor(component: string, parent?: Logger) {
    this.component = component;
    this.parent = parent;
  }

  public setOutputFunction(func: (...data: any[]) => void): void {
    if (this.parent !== undefined) {
      this.parent.setOutputFunction(func);
    } else {
      this.output = func;
    }
  }

  public debug(message: string, ...data: any[]): void {
    this.emitLogMessage("DEBUG", message, data);
  }
  public info(message: string, ...data: any[]): void {
    this.emitLogMessage("INFO", message, data);
  }
  public warn(message: string, ...data: any[]): void {
    this.emitLogMessage("WARN", message, data);
  }
  public error(message: string, ...data: any[]): void {
    this.emitLogMessage("ERROR", message, data);
  }

  protected isLogLevelActive(component: string, level: LogLevel) {
    const configLevel = LogLevels.indexOf(this.getComponentLogLevel(component));
    const testLevel = LogLevels.indexOf(level);
    return testLevel >= configLevel;
  }

  protected emitLogMessage(level: LogLevel, message: string, data: any[], forceEmit: boolean = false) {
    const shouldEmitLog = forceEmit || this.isLogLevelActive(this.component, level);
    if (this.parent !== undefined) {
      this.parent.emitLogMessage(level, `${this.component}: ${message}`, data, shouldEmitLog);
    } else {
      if (shouldEmitLog) {
        this.output(`${level} - ${message}`, data);
      }
    }
  }
}
