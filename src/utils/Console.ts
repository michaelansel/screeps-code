import { SourcePlanner } from "planners/SourcePlanner";
import { Logger } from "./Logger";

export const Console = {
    Logger: () => { return Logger.instance; },
    SourcePlanner: () => { return SourcePlanner.instance; },
    resetSourcePlanner: () => {
        Object.values(Game.creeps).forEach((creep) => { creep.memory.source = undefined }); delete Memory.SourcePlanner?.creeps;
    },
};
