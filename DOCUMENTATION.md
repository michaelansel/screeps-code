# Code Structure

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
   - **Complexity:** This class is one of the most complex parts of the codebase. Its heavy use of generics, proxies, and dynamic property manipulation can be challenging to debug. The `TODO.md` file includes an item to potentially rewrite or simplify it. When working with classes that extend `MemoryBackedClass`, pay close attention to how their data is defined and managed by the `SerDeFunctions`.

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
   - Be aware of the items in `TODO.md`, as they represent planned improvements or refactorings (e.g., rewriting `MemoryBackedClass`, improving the tasking abstraction).

By following these guidelines, we can ensure the codebase remains maintainable, robust, and easier for all contributors to work with.
