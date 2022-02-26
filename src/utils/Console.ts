import { SourcePlanner } from "planners/SourcePlanner";

export const Console = {
    SourcePlanner: () => { return SourcePlanner.instance; },
    resetSourcePlanner: () => {
        Object.values(Game.creeps).forEach((creep) => { creep.memory.source = undefined }); delete Memory.SourcePlanner?.creeps;
    },
};
