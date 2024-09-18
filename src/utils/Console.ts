import { HarvestEnergyTask } from "tasks";
import { Logger } from "./Logger";
import { SourcePlanner } from "planners/SourcePlanner";

export const Console = {
  Logger: () => {
    return Logger.instance;
  },
  LogEverything: () => {
    Console.Logger().setComponentLogLevel("DEFAULT_COMPONENT", "DEBUG");
  },
  SourcePlanner: () => {
    return SourcePlanner.instance;
  },
  resetSourcePlanner: () => {
    Object.values(Game.creeps).forEach(creep => {
      if (creep.task === HarvestEnergyTask) creep.stopTask();
    });
    delete Memory.SourcePlanner?.creeps;
  }
};
