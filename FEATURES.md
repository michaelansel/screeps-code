# Project Workflow

## How We Work
This project uses a two-tier planning system:

- **TODO.md**: Current sprint tasks - immediate, actionable items that are part of our current plan of action. This is our execution queue.
- **FEATURES.md**: Long-term ideas, major refactoring work, and features we might pick up at some point. These need to be broken down into specific tasks before execution.

## Workflow Process
1. **Feature Selection**: When we've cleared the TODO list, we return to FEATURES.md to select the next feature to work on
2. **Task Breakdown**: Selected features get broken down into a series of specific, actionable tasks
3. **Execution**: Tasks move to TODO.md and get executed in order
4. **Completion**: When all tasks for a feature are complete, we return to feature selection

Some features may be small enough to complete in a single shot, going straight from "feature selected" to "do all the implementation work".

# Existing Functional Features

- **Creep Spawning:** Basic worker creeps (`Worker`) are spawned with a predefined body (`[WORK, CARRY, MOVE]`) and assigned the `HarvestEnergyProject`. Spawning includes a counter (`Memory.creepCounter`) for unique naming. (See `main.ts`)
- **Energy Harvesting:** Creeps can perform an `HarvestEnergyTask` to gather energy from sources. This task includes logic to find a source and move towards it if not in range. (See `src/tasks/HarvestEnergyTask.ts`)
- **Energy Depositing (Partial):** The `HarvestEnergyProject` logic includes switching to `DepositEnergyTask` when a creep is full. The `DepositEnergyTask` itself is defined but may require further implementation or integration to specify deposit targets (e.g., Spawn, Extensions). (See `src/projects/HarvestEnergyProject.ts` and `src/tasks/DepositEnergyTask.ts`)
- **Source Planning & Assignment:** The `SourcePlanner` (`src/planners/SourcePlanner.ts`) can assign available energy sources to creeps that request them. It attempts to distribute creeps among sources (currently up to 3 creeps per source).
- **Project/Task Framework:** A system for assigning long-term "Projects" and short-term "Tasks" to creeps, managing their behavior and state. (See `src/projects/` and `src/tasks/`)
- **Memory Management for Objects:** The `MemoryBackedClass` system allows custom class instances to be stored and retrieved from Screeps `Memory`.

# Planned MVP Functional Features

- **Robust Resource Management:**
    - **Efficient Energy Cycle:** Harvesters collect energy and deliver it to dedicated containers near sources or directly to spawns/extensions if no containers exist.
    - **Dedicated Haulers:** Introduce hauler creeps to pick up energy from containers (or dropped by harvesters) and transport it to spawn, extensions, towers, and the controller container.
    - **Storage Management:** Utilize `StructureStorage` and `StructureContainer` effectively for buffering energy and other resources.
- **Defined Creep Roles & Dynamic Spawning:**
    - **Harvester:** Optimized for mining energy at sources (e.g., more `WORK` parts), potentially stationary if containers are used.
    - **Hauler:** Optimized for carrying energy (`CARRY` and `MOVE` parts).
    - **Upgrader:** Dedicated to upgrading the Room Controller, taking energy from a designated container or storage.
    - **Builder:** Constructs new buildings from construction sites and repairs structures. Takes energy from containers/storage.
    - **Repairer (Optional/Combined):** A dedicated creep for repairing structures, or combine this role with Builder.
    - **Dynamic Spawning System:**
        - Spawn creeps based on defined quotas for each role (e.g., 2 harvesters per source, 1 upgrader, 2 builders if construction sites exist).
        - Prioritize spawning based on needs (e.g., harvesters and haulers if energy is critical).
        - Automatically adjust creep body parts based on available energy in spawn/extensions to create more effective creeps as the room develops.
        - Dynamically assign projects to newly spawned creeps based on room needs (not just `HarvestEnergyProject`).
- **Basic Construction & Repair:**
    - **Automated Construction:** Builders automatically find and build construction sites.
    - **Structure Prioritization:** Prioritize building essential structures (spawns, extensions, containers, towers) first.
    - **Automated Repair:** Builders (or dedicated repairers) automatically repair damaged structures, prioritizing critical ones like defenses or containers.
- **Controller Upgrading:**
    - Sustained and efficient upgrading of the Room Controller by dedicated Upgrader creeps.
    - Upgraders should fetch energy from a nearby link, container, or storage.
- **Basic Defense:**
    - **Tower Operation:** If towers are present, they should automatically attack hostile creeps.
    - **Safe Mode Activation:** Automatically trigger safe mode if the spawn is under critical attack (though this is a more advanced MVP feature).
- **Room Planning (Rudimentary):**
    - **Source & Controller Container Placement:** Logic to determine optimal placement for energy containers near sources and the controller.
    - **Extension Placement:** Basic logic for placing extensions (e.g., in a predefined pattern or based on proximity to spawn).
- **Improved Task Management:**
    - **Task Chaining/Queuing:** More sophisticated ways for projects to assign sequences of tasks.
    - **Task Interruption:** Allow tasks to be interrupted if a more urgent need arises (e.g., a harvester switching to deposit if attacked).
- **Basic Source Request Optimization:** When creeps request a source, the system should attempt to assign them to a closer available source if multiple options exist.

# Existing Dev/Workflow Features

- **TypeScript:** Codebase is written in TypeScript, providing static typing and modern JavaScript features.
- **Compilation & Bundling:** `tsconfig.json` is configured for TypeScript compilation. Rollup is implied by comments in `main.ts` for bundling.
- **Linting:** ESLint is configured (`.eslintrc.js`) with TypeScript-specific rules and Prettier integration for code quality and consistency.
- **Code Formatting:** Prettier (`.prettierrc`) is used for automated code formatting.
- **Unit Testing Setup (Basic):** A `test/` directory exists with some unit tests (e.g., `main.test.ts`, `SourcePlanner.test.ts`), indicating a testing environment is set up (likely Mocha, given `globals.ts` and typical Screeps test setups).
- **Error Mapping:** `ErrorMapper.ts` is used to map JavaScript errors back to original TypeScript source code lines for easier debugging.
- **Runtime Object Extensions:** A system (`src/extensions/`, `applyMixins.ts`) is in place to extend global Screeps objects like `Creep` with custom methods and properties at runtime.
- **Modular Structure:** The codebase is organized into logical modules (extensions, planners, projects, tasks, utils).

# Planned MVP Dev/Workflow Features

- **Enhanced Testing Framework:**
    - **Migrate to Jest:** Replace or augment the current test setup with Jest, utilizing `screeps-jest` for mocking game globals and improved test utilities.
    - **Comprehensive Unit Tests:** Increase test coverage for all critical modules, especially AI logic (planners, projects, tasks) and utility functions.
    - **Integration Tests:** Develop basic integration tests to verify interactions between different modules (e.g., creep completes a task, project assigns a new one).
- **Refactor Core Systems:**
    - **`MemoryBackedClass` Refactor/Replacement:** Address the complexity of `MemoryBackedClass.ts`. This could involve simplifying its API, improving its internal logic, or exploring alternative approaches for memory management.
    - **Tasking Abstraction Clarity:** Refine the interaction between `Task`, `Project`, and creep memory (e.g., `TaskHelpers.loadConfig`, `CreepTaskingExtension`) to create a clearer and more robust abstraction layer for how tasks are configured and managed.
- **Improved Debugging & Observability:**
    - **Enhanced Logging:** More configurable logging levels, potentially with the ability to filter logs by creep, room, or module.
    - **Visualizations:** Integrate with Screeps visualizers or develop custom tools to display AI state, creep intentions, room plans, etc., on the game map.
    - **Game Console Utilities:** Add more global helper functions accessible via the Screeps game console for inspecting state, manually triggering actions, or debugging.
- **Documentation & Onboarding:**
    - **Automated API Documentation:** Set up TypeDoc or a similar tool to generate HTML documentation from TSDoc comments.
    - **Contribution Guide:** A simple `CONTRIBUTING.md` outlining how to set up the development environment, run tests, and submit changes.
- **Build & Deployment Pipeline:**
    - **Automated Builds:** Script for reliable and repeatable builds.
    - **Pre-commit Hooks:** Implement pre-commit hooks (e.g., using Husky) to run linters, formatters, and quick tests before allowing a commit.
    - **CI/CD (Continuous Integration/Continuous Deployment):**
        - Set up a basic CI pipeline (e.g., using GitHub Actions) to automatically run tests and linters on every push/pull request.
        - Optionally, CD to automatically deploy code to a private Screeps server or a specific branch upon merging to main.
- **Simulation & Sandbox Environment:**
    - **Screeps Private Server:** Encourage use of a local private server for faster testing and iteration.
    - **Simulation Tools:** Explore or develop tools for simulating specific scenarios or testing AI logic without needing a full game environment (if feasible and beneficial).
- **Version Control Practices:**
    - **Clear Commit History:** Enforce conventional commit messages or similar standards for a clean and understandable git history.
    - **Branching Strategy:** Define a simple branching strategy (e.g., feature branches, develop branch, main branch).

## Later Dev/Workflow Features

- **Git History Cleanup:** Rework initial commit into an empty merge commit for a clearer starting point (maybe use an empty Initial Commit).
- **Test Build Optimization:** Suppress esbuild size warnings for test files while preserving them for main build output.

## Later Functional Features
- **Advanced Spawn Queue Management:** Implement a priority-based spawn queue, allowing the system to wait for resources if needed for critical creeps rather than just spawning cheaper alternatives.
- **Advanced Source Assignment Optimization:** Optimize source assignment in `SourcePlanner` based on creep `WORK` parts, travel distance/path cost, and current saturation, rather than simple counts.
- **Dynamic Source Utilization:** Adjust the number of creeps per source dynamically based on factors like source energy capacity, regeneration rate, or the efficiency of existing harvesters.
- **Inter-Room Operations:** Logic for creeps to operate in, or move resources between, multiple rooms (e.g., remote mining, supporting new colonies).
- **Market Operations:** Automated buying/selling of resources on the Screeps market.
- **Combat AI:** More sophisticated combat logic, including squad formations, kiting, and targeted attacks/retreats.
- **Automated Room Expansion:** Logic to identify and claim new rooms, and to bootstrap basic operations in them.
- **Power Creep Management:** Integration and utilization of power creeps and their abilities.
- **Lab Management:** Automated management of labs for boosting creeps or producing advanced resources.
