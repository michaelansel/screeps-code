# Architecture & Features Guide

This document provides comprehensive technical details about the codebase structure, patterns, implementation details, and all available features. For general project information, see [README.md](README.md). For development workflow, see [WORK_PROMPT.md](WORK_PROMPT.md). For current development focus, see [FEATURES.md](FEATURES.md).

## Code Structure

- `src/extensions`: Modules for extending global Screeps objects like `Creep`, `StructureSpawn`, `Room`, `Memory`, etc. This is where prototype modifications and new functionalities are added to existing game objects.
- `src/planners`: Contains logic for high-level, strategic decision-making that often spans multiple rooms or oversees complex operations. For example, a planner might decide which rooms to expand to or how to allocate resources across the colony.
- `src/projects`: Defines long-term goals or roles for creeps. A project dictates what a creep should be generally trying to achieve (e.g., 'Harvesting Energy', 'Upgrading Controller', 'Building Structures'). Creeps are typically assigned a single project at a time.
- `src/tasks`: Defines short-term, specific actions that creeps perform to make progress on their assigned project. Tasks are the individual steps like 'move to source', 'harvest energy', 'transfer energy to spawn'. A creep usually executes one task at a time, and tasks are often chained together or selected by the active project.
- `src/utils`: A collection of utility classes and functions that provide common helper functionalities used throughout the codebase, such as logging, error mapping, or custom data structures.

Key files:
- `src/main.ts`: The main entry point of the Screeps AI. It contains the primary game loop (`module.exports.loop`) and orchestrates the execution of creep logic, room logic, and global tasks each tick.
- `src/utils/MemoryBackedClass.ts`: A crucial utility for serializing and deserializing complex class instances into the Screeps `Memory` object. This allows for persistent state of custom objects across game ticks.
- `src/utils/applyMixins.ts`: A helper function used to apply mixin classes to extend the functionality of existing JavaScript/TypeScript classes, notably used for Screeps game object extensions.

# AI Logic

**Overall Architecture:**
The AI employs a hierarchical control system:
1.  **Planners:** (e.g., `SourcePlanner`) At the highest level, planners make strategic decisions, such as assigning energy sources to creeps or managing resource allocation across rooms. They often operate on a global or multi-room scale.
2.  **Projects:** (e.g., `HarvestEnergyProject`) Each creep is typically assigned a single "Project," which represents its long-term goal or role (e.g., "be a harvester," "be an upgrader"). The project determines the creep's general behavior and decides which tasks are appropriate to achieve its goal.
3.  **Tasks:** (e.g., `HarvestEnergyTask`, `DepositEnergyTask`) Tasks are specific, short-term actions a creep performs to make progress on its current project. Examples include moving to a target, harvesting energy, transferring resources, or building a structure. A creep usually focuses on one task at a time, and tasks are often assigned sequentially by the creep's active project.

**Creep Lifecycle and Work Execution:**
- Creeps are spawned, often with an initial project assigned via their memory (see `main.ts` for basic spawning logic).
- The main loop iterates through all creeps, calling a `run()` method on each. This method is typically part of the extended `Creep` functionality (e.g., from `src/extensions/Creep/Logic.ts`).
- Inside its `run()` method, a creep executes logic related to its current project.
- The active project's `run()` method assesses the creep's state and the game environment to decide which task the creep should perform next. It then starts this task (e.g., `creep.startTask(SomeTask)`).
- The assigned task's `run()` method contains the logic for specific game actions (e.g., `creep.harvest(source)`, `creep.moveTo(target)`).
- When a task is completed (e.g., a harvester creep is full of energy), it calls `creep.stopTask()`. This signals the project to evaluate and assign the next appropriate task (e.g., switch from `HarvestEnergyTask` to `DepositEnergyTask`).

**Memory and State Persistence:**
- The AI heavily relies on Screeps `Memory` to store persistent state for creeps, rooms, and global entities across game ticks.
- `CreepMemory` is extended to store information like a creep's current project ID and task configuration.
- Global `Memory` is used for things like system-wide counters (e.g., `Memory.creepCounter`) and memory for planners (e.g., `Memory.SourcePlanner`).
- The `MemoryBackedClass` (`src/utils/MemoryBackedClass.ts`) is a key utility that handles the serialization and deserialization of class instances into and out of `Memory`. This allows custom objects and their states to persist.

**Runtime Object Extension:**
- The codebase extends global Screeps objects (like `Creep`, `StructureSpawn`, etc.) at runtime. This is initiated in `main.ts` with `useExtensions(discoverExtendables(global as object));`.
- Extensions add new methods and properties to these objects, providing a richer, more object-oriented API to interact with game entities. This is primarily managed in the `src/extensions/` directory.

# Key TypeScript Patterns

This codebase utilizes several advanced TypeScript patterns and features, some of which are specific to the challenges of developing a Screeps AI. Understanding these is crucial for working with the code.

**1. `MemoryBackedClass.ts` (Serialization for Screeps Memory):**
   - **Purpose:** The primary role of `MemoryBackedClass` (located in `src/utils/`) is to enable the storage and retrieval of complex class instances within the Screeps `Memory` object. Raw `Memory` can only store JSON-compatible data, so custom objects need a serialization and deserialization mechanism.
   - **How it Works (General Overview):**
     - It uses JavaScript Proxies extensively to intercept property access (gets and sets) on objects.
     - When a property of a memory-backed object is set, the proxy ensures the value is also written to the underlying `Memory` object in a serialized format.
     - When a property is accessed, the proxy can load it from `Memory` if it hasn't been accessed yet during the current tick.
     - It employs `SerDeFunctions` (Serialize/Deserialize functions) which define how specific properties or entire objects are converted to and from their memory representation. This includes handling references to game objects (by storing their IDs) and other custom classes.
   - **Complexity:** This class is one of the most complex parts of the codebase. Its heavy use of generics, proxies, and dynamic property manipulation can be challenging to debug. The `FEATURES.md` file includes plans to potentially rewrite or simplify it. When working with classes that extend `MemoryBackedClass`, pay close attention to how their data is defined and managed by the `SerDeFunctions`.

**2. Mixin Pattern for Extending Game Objects:**
   - **Purpose:** To add new functionalities (methods and properties) to global Screeps game objects like `Creep`, `Spawn`, `Room`, etc., without directly modifying their original prototypes in a way that's hard to manage.
   - **Implementation:**
     - Extension modules are defined in `src/extensions/` (e.g., `src/extensions/Creep/`). These modules contain classes (e.g., `CreepBaseExtensionClass`, `CreepLogicExtensionClass`).
     - The `src/utils/applyMixins.ts` function takes a target class (e.g., the global `Creep` constructor) and an array of "base" constructor functions (the extension classes). It copies properties (methods, accessors) from the prototypes of the base constructors to the prototype of the target class.
     - `src/extensions/Creep.ts` (and similar files for other objects) orchestrates this by calling `applyMixins` to combine all desired extension classes onto the base Screeps object.
   - **Type Safety:** TypeScript declaration merging (`declare global`) is used to inform the TypeScript compiler about these new properties and methods, ensuring type safety when using the extended objects.

**3. Global Namespace Augmentations (`declare global`):**
   - **Purpose:** To extend existing global interfaces or add new ones, particularly for Screeps game objects and memory structures. This allows TypeScript to understand the shape of these objects after they've been modified by extensions or to define the structure of `Memory`, `CreepMemory`, etc.
   - **Usage:** You'll find `declare global { ... }` blocks in many files, especially within the `src/extensions/` directory (e.g., `src/extensions/CreepMemory.ts`, `src/extensions/Memory.ts`).
   - **Example:**
     ```typescript
     // In src/extensions/CreepMemory.ts
     declare global {
       interface CreepMemory {
         project?: MyProjectMemory; // Adds 'project' to CreepMemory
         task?: MyTaskMemory;       // Adds 'task' to CreepMemory
       }
     }
     ```
   - This is a standard TypeScript feature for working with code that modifies global scope or for describing external JavaScript libraries.

**4. Use of `Symbol` for Unique Type Identification:**
   - **Purpose:** Symbols (e.g., `ProjectBehaviorSymbol`, `TaskBehaviorSymbol` found in `src/projects/Project.ts` and `src/tasks/Task.ts`) are used to create unique identifiers for specific behavior types.
   - **Benefit:** This helps in distinguishing different kinds of project or task objects at runtime in a way that is more robust than using string constants, as Symbols are guaranteed to be unique. It can be useful for type guards or ensuring that the correct kind of behavior is being invoked.

# Coding Guidelines

These guidelines are a mix of enforced linting rules, TypeScript compiler settings, and observed best practices within the repository. Adhering to them will help maintain code quality, consistency, and readability.

**1. TypeScript Strictness & Configuration:**
   - **`strict: true`:** The `tsconfig.json` has `strict` mode enabled. This turns on a suite of type-checking options (`noImplicitAny`, `strictNullChecks`, `alwaysStrict`, etc.). Write code that conforms to these stricter checks.
   - **Module System:** The codebase uses `Node16` for `module` and `moduleResolution`. Ensure imports and exports follow this system.
   - **Explicit Types:** While `explicit-function-return-type` is currently off in ESLint, aim to use explicit types for function parameters and return types where it improves clarity, especially for public APIs and complex functions.

**2. ESLint & Prettier Enforcement:**
   - **Linting:** The project uses ESLint with a comprehensive set of rules (see `.eslintrc.js`), including `@typescript-eslint/recommended`, `plugin:import`, and `prettier`.
   - **Formatting:** Prettier is used for automatic code formatting. Ensure your code is formatted by Prettier before committing (often via an IDE plugin or a pre-commit hook).
   - **Key ESLint Rules (Examples - refer to `.eslintrc.js` for the full set):**
     - **`@typescript-eslint/explicit-member-accessibility`:** Class members (properties, methods) must have explicit accessibility modifiers (`public`, `private`, `protected`).
     - **`@typescript-eslint/no-explicit-any`:** Avoid using `any` where possible. If `any` is necessary, consider if a more specific type or `unknown` could be used instead. There's an `eslint-disable` for this in `MemoryBackedClass.ts` that should be handled with care.
     - **`camelcase`:** Use camelCase for variables and function names. Class names should be PascalCase.
     - **`id-blacklist`:** Avoid generic type names like `Number`, `String`, `Boolean`. Use TypeScript's primitive types (`number`, `string`, `boolean`) or specific `Id<T>` types for Screeps object IDs.
     - **`max-classes-per-file: ["error", 1]`:** Each file should contain only one class definition.
     - **`no-underscore-dangle`:** Generally, avoid dangling underscores in identifiers. It's currently allowed for `allowAfterThis` and has specific exceptions (e.g., `__fromMemory__`, `__toMemory__` in `MemoryBackedClass`). Use underscores intentionally, for example, to mark private members if not using the `private` keyword (though `private` is preferred).

**3. Naming Conventions:**
   - **Classes & Interfaces:** `PascalCase` (e.g., `HarvestEnergyProject`, `TaskConfig`).
   - **Methods & Functions:** `camelCase` (e.g., `runTask`, `getSourceById`).
   - **Variables & Properties:** `camelCase` (e.g., `currentSource`, `creepCount`).
   - **Constants:** `UPPER_SNAKE_CASE` if they are true global constants (e.g., `MAX_CREEPS_PER_SOURCE`). For internal "constants" within a class or module, `camelCase` or `PascalCase` (if it's an enum-like object) might be appropriate.
   - **Type Aliases:** `PascalCase` (e.g., `ProjectId`, `TaskId`).

**4. Logging:**
   - Utilize the provided `Logger` utility (`src/utils/Logger.ts`) for logging messages.
   - Use appropriate log levels (`debug`, `info`, `warn`, `error`).
   - Provide context in log messages (e.g., creep name, room name, relevant IDs).

**5. Memory Management:**
   - Be mindful when reading from and writing to `Memory`. It's a global, stringified JSON object and can become a performance bottleneck if not managed carefully.
   - When working with classes that extend `MemoryBackedClass`, understand how they serialize/deserialize data to avoid unintended side effects or performance issues.

**6. Comments and Documentation:**
   - **TSDoc:** Use TSDoc comments (`/** ... */`) for public-facing classes, methods, and complex functions. This helps with understanding and can be used for future documentation generation (e.g., with TypeDoc).
   - **Inline Comments:** Use `//` for clarifying complex or non-obvious logic within functions.
   - **Clarity for Complex Code:** Areas like `MemoryBackedClass` or intricate AI decision logic benefit greatly from clear, explanatory comments.

**7. Screeps-Specific Practices:**
   - **`Id<T>` Type:** Use the `Id<T>` type (e.g., `Id<Creep>`, `Id<Source>`) for storing Screeps game object IDs to maintain type safety.
   - **Error Handling:** Use `ErrorMapper.wrapLoop` for the main loop to get proper source-mapped stack traces. Consider try/catch blocks for critical operations where Screeps API calls might fail unexpectedly.

**8. TODOs and Code Evolution:**
   - Address `TODO` comments in the code. If you encounter a `TODO`, understand its implication.
   - Be aware of the items in `FEATURES.md`, as they represent planned improvements or refactorings (e.g., rewriting `MemoryBackedClass`, improving the tasking abstraction).

By following these guidelines, we can ensure the codebase remains maintainable, robust, and easier for all contributors to work with.

---
## Interfaces and Memory Schemas

This section details the key TypeScript interfaces used throughout the project and, crucially, how they map to the data structures (schemas) stored in the global Screeps `Memory` object. Understanding these interfaces and schemas is vital for debugging, extending existing functionalities, and ensuring data consistency.

The persistence of complex objects and their state across game ticks is primarily managed by the `MemoryBackedClass` utility (see `src/utils/MemoryBackedClass.ts`). This class, and those that extend it, handle the serialization (converting live objects to a storable format) and deserialization (reconstructing live objects from stored data) processes.

### Global `Memory` Object

The global `Memory` object is the root for all persistent data in Screeps. Its structure is augmented by this codebase via `src/extensions/Memory.ts`. Key top-level properties include:

*   **`Memory.creeps`: (Built-in)**
    *   **Type:** `{ [creepName: string]: CreepMemory }`
    *   **Description:** Standard Screeps object containing memory for each living creep. The structure of individual `CreepMemory` objects is detailed below.
*   **`Memory.rooms`: (Built-in)**
    *   **Type:** `{ [roomName: string]: RoomMemory }`
    *   **Description:** Standard Screeps object for room-specific memory. (Note: This codebase may or may not extensively use `RoomMemory` yet; if it does, its structure should also be defined via global augmentation).
*   **`Memory.spawns`: (Built-in)**
    *   **Type:** `{ [spawnName: string]: SpawnMemory }`
    *   **Description:** Standard Screeps object for spawn-specific memory.
*   **`Memory.flags`: (Built-in)**
    *   **Type:** `{ [flagName: string]: FlagMemory }`
    *   **Description:** Standard Screeps object for flag-specific memory.

*Custom properties defined in `src/extensions/Memory.ts` (`MemoryExtension` interface):*

*   **`Memory.creepCounter?: number`**
    *   **Type:** `number` (optional)
    *   **Purpose:** Used by `main.ts` to generate unique names for newly spawned creeps. Incremented each time a creep is spawned.
*   **`Memory.SourcePlanner?: SourcePlannerMemory`**
    *   **Type:** `SourcePlannerMemory` (optional, structure defined in `src/planners/SourcePlanner.ts`)
    *   **Purpose:** Stores persistent data for the `SourcePlanner` module, such as creep assignments to sources. See the "Module-Specific Memory" subsection for more details on its internal structure.
*   *(Other top-level keys may be added by new modules and should be documented here.)*

### `CreepMemory` Object

The `CreepMemory` object (`Memory.creeps[creepName]`) stores data specific to each creep. Its structure is augmented by `src/extensions/CreepMemory.ts` and `src/extensions/Creep/Tasking.ts`.

*Standard Screeps properties (e.g., `_move`) are present but not detailed here.*

*Custom properties defined in `CreepMemoryExtension` and related interfaces:*

*   **`creep.memory.project?: CreepProjectMemory`**
    *   **Type:** `CreepProjectMemory` (optional)
    *   **Interface (`CreepProjectMemory` from `src/extensions/Creep/Tasking.ts`):**
        ```typescript
        interface CreepProjectMemory {
          id: ProjectId; // e.g., "HarvestEnergyProject" as Id<Project>
          config?: ProjectConfig<any>; // Project-specific configuration
        }
        ```
    *   **Purpose:** Stores the ID of the creep's current assigned project and any configuration data that project requires. The `config` object's structure is defined by the specific project's `ProjectConfig` interface.
*   **`creep.memory.task?: CreepTaskMemory`**
    *   **Type:** `CreepTaskMemory` (optional)
    *   **Interface (`CreepTaskMemory` from `src/extensions/Creep/Tasking.ts`):**
        ```typescript
        interface CreepTaskMemory {
          id: TaskId; // e.g., "HarvestEnergyTask" as Id<Task>
          config?: TaskConfig<any>; // Task-specific configuration
        }
        ```
    *   **Purpose:** Stores the ID of the creep's current active task and its configuration. The `config` object's structure is defined by the specific task's `TaskConfig` interface (e.g., `HarvestEnergyTaskConfig` might store a `source: Id<Source>`).
*   *(Other properties may be added directly to `CreepMemory` by specific tasks or projects, but the `project` and `task` structures are the primary way configurations are managed.)*

### `MemoryBackedClass` and Data Serialization

Many complex objects in this framework, especially those that need to persist state across ticks (like Planners or potentially more complex Project/Task controllers if they were to manage multiple creeps or entities), extend `MemoryBackedClass`. This class provides the mechanisms for serializing their state into Screeps `Memory` and deserializing it back into live objects.

**Key Concepts:**

*   **`BackingMemoryRecord<T extends object>`:**
    *   **Type:** Generic type defined in `src/utils/MemoryBackedClass.ts`.
    *   **Purpose:** This type represents the *shape of the data as it is actually stored in Screeps `Memory`*. It's a transformation of the live class `T`.
    *   **Transformation Rules (General):**
        *   Properties holding primitive types (string, number, boolean) are usually stored as-is.
        *   Properties holding references to Screeps game objects (e.g., `Source`, `Creep`, `Structure`) are stored as their `Id<GameObjectType>`. For example, a `source: Source` property in a live object becomes `source: Id<Source>` in its `BackingMemoryRecord`.
        *   Properties holding instances of other registered types (like `Task` or `Project` instances themselves, if they were to be stored directly rather than just their IDs for config) are stored by their unique registration ID.
        *   Arrays of such objects would be stored as arrays of their serialized forms (e.g., arrays of IDs).
        *   Nested objects are recursively transformed into their own `BackingMemoryRecord` representations.
    *   **Example:** If a live class has `public mySource: Source;`, its corresponding `BackingMemoryRecord` would likely have `mySource?: Id<Source>;`.

*   **`SerDeFunctions<T extends object>` (Serialization/Deserialization Functions):**
    *   **Type:** Generic type defined in `src/utils/MemoryBackedClass.ts`.
    *   **Purpose:** This crucial structure provides the specific logic for converting each property (or the entire object) between its live representation in the class instance and its serialized representation in the `BackingMemoryRecord`.
    *   **Structure:** It can be an object where each key corresponds to a property in `T`, and the value is an object with:
        *   `required: boolean`: Indicates if the property is mandatory.
        *   `fromMemory: (memory: BackingMemoryRecord<T>) => T[Property] | undefined`: A function that takes the raw memory record and reconstructs the live property. For example, it might use `Game.getObjectById()` for an `Id<Source>` to get the live `Source` object.
        *   `toMemory: (memory: BackingMemoryRecord<T>, value: T[Property]) => boolean`: A function that takes the live property's value and writes its serialized form into the raw memory record. For example, it might store `source.id` if `value` is a `Source` object.
    *   Alternatively, for objects with very custom or holistic serialization, `SerDeFunctions` can be an object with two main functions:
        *   `__fromMemory__: (memory: BackingMemoryRecord<T>) => T | undefined`: Deserializes the entire object at once.
        *   `__toMemory__: (memory: BackingMemoryRecord<T>, value: T) => boolean`: Serializes the entire object at once.
    *   **Usage:** `MemoryBackedClass` uses these functions internally when its proxy intercepts property access or when instances are explicitly loaded or saved.

**How it Works (Simplified):**
1.  A class (e.g., `SourcePlanner`) extends `MemoryBackedClass`.
2.  It defines its properties (e.g., `private creeps: Record<string, SourcePlannerCreepData>`).
3.  It provides `SerDeFunctions` for its properties that need special handling (e.g., `SourcePlannerCreepData` has `SerDeFunctions` to handle `task` and `source` properties, converting them to/from IDs).
4.  When `SourcePlanner.instance` is first accessed or when its properties are modified, `MemoryBackedClass` (often through JavaScript Proxies set up by methods like `proxyMapOfRecords` or `proxyGenericRecord`) interacts with the corresponding part of `Memory` (e.g., `Memory.SourcePlanner`).
5.  The `SerDeFunctions` are invoked to translate data:
    *   On read (get): If data is not in the live object yet, it's read from `Memory` (e.g., `Id<Source>`) and transformed by `fromMemory` (e.g., into a `Source` object).
    *   On write (set): The live value (e.g., a `Source` object) is transformed by `toMemory` (e.g., into an `Id<Source>`) and written to `Memory`.

This mechanism allows for complex, stateful objects to exist as live instances during a tick while ensuring their essential data is persisted in `Memory` in a format that Screeps can handle. Developers working with classes extending `MemoryBackedClass` must be aware of how their class properties are mapped to memory via their `SerDeFunctions`.

### Project Configuration (`ProjectConfig`)

Projects define long-term goals for creeps. Some projects may require specific configuration parameters to tailor their behavior.

*   **Interface Pattern:** Project-specific configurations are defined by interfaces that extend the base `ProjectConfig<T extends ProjectId>` interface (from `src/projects/Project.ts`).
    ```typescript
    // src/projects/Project.ts
    export interface ProjectConfig<T extends ProjectId> {
      readonly type: typeof ProjectConfigSymbol; // Used for type discrimination
      readonly id: T; // The ID of the project this config is for
    }
    ```
*   **Storage Schema:** The configuration object for a creep's active project is stored within its `CreepMemory` at the path: `creep.memory.project.config`.
    ```typescript
    // Part of CreepProjectMemory in src/extensions/Creep/Tasking.ts
    // creep.memory.project = {
    //   id: ProjectId,
    //   config?: ProjectConfig<any> // <--- Here
    // }
    ```
*   **Example (`HarvestEnergyProjectConfig`):**
    While `HarvestEnergyProjectConfig` in `src/projects/HarvestEnergyProject.ts` is currently an empty interface (meaning it requires no specific configuration beyond the standard `id`), if it needed parameters, it would look like this:
    ```typescript
    // Hypothetical example:
    // export interface HarvestEnergyProjectConfig extends ProjectConfig<typeof HarvestEnergyProjectId> {
    //   preferredSourceContainerId?: Id<StructureContainer>;
    //   maxEnergyToHarvest?: number;
    // }

    // If a creep were assigned this project with such a config, its memory might look like:
    // creep.memory.project = {
    //   id: "HarvestEnergyProject" as ProjectId,
    //   config: {
    //     type: ProjectConfigSymbol, // This symbol might not be directly stored in memory; type checking is more at compile/runtime assignment
    //     id: "HarvestEnergyProject" as ProjectId,
    //     preferredSourceContainerId: "someContainerId" as Id<StructureContainer>
    //   }
    // }
    ```
    The actual data stored in `Memory` for the `config` object will only contain the properties defined in the specific `XProjectConfig` interface (e.g., `preferredSourceContainerId`). The `type` and `id` fields from the base `ProjectConfig` are more for TypeScript type safety during code execution rather than explicit storage, though the `id` of the project itself is stored in `creep.memory.project.id`.

### Task Configuration (`TaskConfig`)

Tasks are short-term actions. Like projects, tasks can have specific configuration parameters.

*   **Interface Pattern:** Task-specific configurations are defined by interfaces extending `TaskConfig<T extends TaskId>` (from `src/tasks/Task.ts`).
    ```typescript
    // src/tasks/Task.ts
    export interface TaskConfig<T extends TaskId> {
      readonly type: typeof TaskConfigSymbol;
      readonly id: T;
    }
    ```
*   **Storage Schema:** A creep's active task configuration is stored at: `creep.memory.task.config`.
    ```typescript
    // Part of CreepTaskMemory in src/extensions/Creep/Tasking.ts
    // creep.memory.task = {
    //   id: TaskId,
    //   config?: TaskConfig<any> // <--- Here
    // }
    ```
*   **Example (`HarvestEnergyTaskConfig`):**
    The `HarvestEnergyTask` requires knowing which source to target.
    ```typescript
    // src/tasks/HarvestEnergyTask.ts
    export interface HarvestEnergyTaskConfig extends TaskConfig<typeof HarvestEnergyTaskId> {
      source: Id<Source>; // ID of the source to harvest from
    }

    // When a creep is performing HarvestEnergyTask, its memory would look like:
    // creep.memory.task = {
    //   id: "HarvestEnergyTask" as TaskId,
    //   config: {
    //     // type: TaskConfigSymbol, // Similar to ProjectConfig, type/id are for TS
    //     // id: "HarvestEnergyTask" as TaskId,
    _        source: "actualSourceIdValue" as Id<Source> // This is what's stored
    //   }
    // }
    ```
    As with projects, the `creep.memory.task.config` object in `Memory` will contain the specific properties defined in the task's `XTaskConfig` (e.g., `source`). The `type` and `id` from the base `TaskConfig` are primarily for TypeScript's benefit. The task's `id` is stored alongside at `creep.memory.task.id`.

When implementing new projects or tasks that require persistent settings, define a corresponding `XProjectConfig` or `XTaskConfig` interface and ensure these settings are populated in `creep.memory.project.config` or `creep.memory.task.config` when the project/task is started. The `MemoryBackedClass` system does not directly manage these sub-properties of `CreepMemory` by default; they are typically handled by the `CreepTaskingExtension` logic when starting tasks/projects.

### Module-Specific Memory (Example: `SourcePlannerMemory`)

Larger, persistent modules or "planners" often require their own dedicated space within the global `Memory` object to store their state. The `SourcePlanner` module provides a good example of this pattern.

*   **Storage Location:** Planner-specific memory is typically stored under a unique key directly within the global `Memory` object. For `SourcePlanner`, this is `Memory.SourcePlanner`.
    *   This key (`SourcePlanner`) is defined in the `MemoryExtension` interface in `src/extensions/Memory.ts`.

*   **Interface (`SourcePlannerMemory`):**
    The structure of this memory segment is defined by an interface, typically within the module's main file.
    ```typescript
    // src/planners/SourcePlanner.ts
    export interface SourcePlannerMemory {
      creeps?: SourcePlannerCreepsMemory; // Stores data about creeps relevant to source planning
    }

    // Supporting interfaces also defined in SourcePlanner.ts:
    // export type SourcePlannerCreepsMemory = Record<string, SourcePlannerCreepDataMemory>;
    // export type SourcePlannerCreepDataMemory = BackingMemoryRecord<SourcePlannerCreepData>;
    //
    // interface SourcePlannerCreepData {
    //   task: TaskBehavior<TaskId>; // Live object: the task itself
    //   source?: Source;            // Live object: the assigned source
    // }
    ```

*   **Schema in `Memory` (for `Memory.SourcePlanner`):**
    The `SourcePlanner` class extends `MemoryBackedClass` and uses its mechanisms (like `proxyMapOfRecords` and `proxyGenericRecord` along with `SerDeFunctions`) to manage the serialization of its live data (e.g., `SourcePlanner.instance.creeps`) into `Memory.SourcePlanner`.
    Based on `SourcePlannerCreepData` and its `SerDeFunctions`:
    *   The `task` property (which is a `TaskBehavior<TaskId>` in the live object) is stored as its `TaskId` (a string ID).
    *   The `source` property (a `Source` object) is stored as its `Id<Source>` (a string ID).

    Therefore, the actual data in `Memory.SourcePlanner.creeps` would look something like this:
    ```json
    // Memory.SourcePlanner = {
    //   "creeps": {
    //     "CreepName1": {
    //       "task": "HarvestEnergyTask", // TaskId
    //       "source": "sourceId1"       // Id<Source>
    //     },
    //     "CreepName2": {
    //       "task": "SomeOtherTask",
    //       // "source" might be undefined if not assigned
    //     }
    //     // ... and so on for other creeps tracked by the planner
    //   }
    // }
    ```

*   **Management:**
    *   The `SourcePlanner` itself is responsible for defining, accessing, and managing the data within `Memory.SourcePlanner`.
    *   It uses `MemoryBackedClass` utilities to ensure that its internal state (e.g., the `this.creeps` property in the `SourcePlanner` instance) is correctly loaded from and saved to `Memory.SourcePlanner` during its operations.

This pattern of dedicating a top-level key in `Memory` to a specific module, defining an interface for that module's memory structure, and using `MemoryBackedClass` (if the module itself is complex and stateful) is a recommended approach for managing module-specific persistent data.

### Maintaining Consistency

As the codebase evolves, new features will be added, and existing ones may be modified. This will inevitably lead to changes in data structures and memory schemas. Maintaining consistency between TypeScript interfaces and the actual data stored in `Memory` is crucial for preventing bugs and ensuring smooth development.

**Key Practices:**

1.  **Update TypeScript Interfaces First:**
    *   Whenever you intend to change the structure of data stored in `Memory` (be it `CreepMemory`, global `Memory` extensions, or module-specific memory like `SourcePlannerMemory`), **always start by updating the corresponding TypeScript interface(s)**.
    *   For example, if adding a new property to `CreepMemory`, first add it to the `CreepMemoryExtension` interface in `src/extensions/CreepMemory.ts` (or a more specific interface if applicable).
    *   This ensures that the TypeScript compiler can help you identify all the places in the code that need to be adjusted to handle the new or modified structure.

2.  **Synchronize `SerDeFunctions`:**
    *   If the data structure being changed is managed by a class extending `MemoryBackedClass`, you **must** update the `SerDeFunctions` for that class to correctly handle the serialization and deserialization of the new or modified properties.
    *   Ensure that the `fromMemory` and `toMemory` functions accurately reflect how the live object's property maps to its `BackingMemoryRecord` representation and vice-versa.

3.  **Clear Naming and Scope:**
    *   When defining interfaces for memory structures (e.g., `MyModuleMemory`), use clear and descriptive names.
    *   Keep the scope of memory structures as localized as possible. If data is only used by one module, it should reside within that module's dedicated memory segment (e.g., `Memory.MyModule`) rather than cluttering `CreepMemory` or the root of `Memory` unnecessarily.

4.  **Consider Data Migration (for Breaking Changes):**
    *   If you make a significant, non-backward-compatible change to a memory schema (e.g., renaming a critical property, changing its data type fundamentally), creeps or structures with the old memory format might cause errors.
    *   For such scenarios, consider implementing a simple versioning system or migration logic:
        *   Store a `version` number within your memory structure (e.g., `Memory.MyModule.version = 1;`).
        *   When your module loads, it checks the version. If the version is outdated, it runs a migration function to convert the old data to the new format before proceeding.
        ```typescript
        // Example snippet for migration logic
        // if (Memory.MyModule && Memory.MyModule.version < 2) {
        //   // Perform migration from v1 to v2
        //   Memory.MyModule.newProperty = Memory.MyModule.oldProperty;
        //   delete Memory.MyModule.oldProperty;
        //   Memory.MyModule.version = 2;
        // }
        ```
    *   This is more advanced but can be crucial for long-running Screeps games where codebase updates are frequent. For simpler changes, ensuring default values or graceful handling of missing properties might be sufficient.

5.  **Test Memory-Related Changes:**
    *   Thoroughly test any changes that impact memory structures.
    *   Pay attention to edge cases:
        *   What happens when a creep is spawned for the first time with the new memory structure?
        *   What happens when a creep with an older version of `CreepMemory` (if applicable and no migration is in place) runs new code?
        *   Ensure data is being saved and reloaded correctly across ticks.

By diligently following these practices, you can minimize issues related to memory desynchronization and keep the codebase robust and maintainable.

# Development Principles

## RCL-Aware Feature Design

**Core Principle**: Build the right features for the current room situation and Room Control Level (RCL).

### Implementation Guidelines

1. **Tiered Feature Development**: Every new feature should consider RCL progression and room needs:
   - **Early RCL (1-3)**: Focus on basic survival - energy harvesting, spawning, basic construction
   - **Mid RCL (4-6)**: Infrastructure development - roads, containers, extensions, defenses
   - **High RCL (7-8)**: Advanced optimization - labs, terminals, complex logistics

2. **Dynamic Scaling**: Features should scale appropriately with RCL:
   - **Builder Role Example**: 1 builder at low RCL, 2 builders at RCL 4+
   - **Work Assignment**: Prioritize critical infrastructure before luxury features
   - **Resource Allocation**: Energy budgets should match room capabilities

3. **Situational Awareness**: Features should respond to current room conditions:
   - **Construction Priority**: Build construction sites before repair work
   - **Defensive Scaling**: Increase builders when under attack or infrastructure damaged
   - **Economic Efficiency**: Don't waste resources on premature optimization

4. **Progressive Complexity**: Implement features incrementally:
   - Start with minimum viable functionality for early RCL
   - Add sophistication as RCL increases and room stabilizes
   - Avoid over-engineering for scenarios the room hasn't reached yet

### Examples in Codebase

- **RoleManager**: Builder quotas based on RCL and construction needs
- **BuilderProject**: Skips walls/ramparts (fortification logic for later)
- **Spawning Priority**: Harvesters → Builders → Upgraders (survival first)

This principle ensures efficient development that matches Screeps progression dynamics and avoids premature optimization.
