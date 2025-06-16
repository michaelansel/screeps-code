# Testing Documentation

## Overview
This project uses Mocha for unit testing with TypeScript compilation via esbuild. Tests are located in the `test/unit/` directory and mirror the `src/` directory structure.

## Test Commands
```bash
# Run all tests
npm run test

# Run only unit tests (same as npm run test)
npm run test-unit

# Run linting and tests (pre-commit check)
npm run pre-commit
```

## Test Structure
- **Test files**: `test/unit/**/*.test.ts`
- **Test globals**: `test/unit/globals.ts` - Sets up Screeps game object extensions
- **Mock objects**: `test/unit/mock.ts` - Provides mock Game, Memory, and Creep objects
- **Build output**: `dist-test/` - Compiled test files (auto-generated)

## Testing Framework Setup
- **Testing**: Mocha with Chai assertions
- **Mocking**: Sinon for stubs/spies
- **Compilation**: esbuild bundles tests with source maps
- **Extensions**: Custom globals setup for Screeps object extensions

## Writing Tests

### Basic Test Structure
```typescript
import { expect } from "chai";
import { globalsSetup, globalsCleanup } from "../globals";

describe("ModuleName", () => {
  beforeEach(() => {
    globalsSetup();
  });

  afterEach(() => {
    globalsCleanup();
  });

  it("should do something", () => {
    // Test implementation
    expect(result).to.equal(expected);
  });
});
```

### Test File Organization
Tests should mirror the source directory structure:
```
src/
├── projects/
│   └── HarvestEnergyProject.ts
└── tasks/
    └── DepositEnergyTask.ts

test/unit/
├── projects/
│   └── HarvestEnergyProject.test.ts
└── tasks/
    └── DepositEnergyTask.test.ts
```

## Current Test Coverage
- ✅ `main.ts` - Main game loop
- ✅ `extensions/Creep/Tasking.ts` - Creep task management
- ✅ `planners/SourcePlanner.ts` - Source assignment logic
- ✅ `projects/DoNothingProject.ts` - No-op project behavior
- ✅ `projects/HarvestEnergyProject.ts` - Energy harvesting project logic
- ✅ `projects/Project.ts` - Project base class, helpers, and registry
- ✅ `tasks/DepositEnergyTask.ts` - Energy depositing task
- ✅ `tasks/DoNothingTask.ts` - No-op task behavior
- ✅ `tasks/HarvestEnergyTask.ts` - Energy harvesting task
- ✅ `tasks/Task.ts` - Task base class, helpers, and config management
- ✅ `utils/Logger.ts` - Logging utilities
- ✅ `utils/MemoryBackedClass.ts` - Memory persistence

**Test Statistics**: 83 passing tests, 9 pending tests

### Test Coverage Summary
- **Projects**: 3/4 modules tested (75% coverage)
- **Tasks**: 3/4 modules tested (75%) 
- **Core Systems**: 100% coverage of main logic, planning, and tasking framework
- **Base Classes**: 100% coverage of Project and Task infrastructure

## Missing Test Coverage
See TODO.md for current priority modules that need test coverage.

## Test Development Workflow
1. Identify module needing tests
2. Create corresponding test file in `test/unit/`
3. Set up test structure with globals and mocks
4. Write comprehensive test cases
5. Run tests: `npm run test`
6. Ensure tests pass before committing

## Debugging Tests
- Tests compile with source maps for debugging
- Use `console.log()` in tests for debugging output
- Check `dist-test/` for compiled test files if needed

## Pre-commit Testing
The `pre-commit` script runs:
1. TypeScript compilation check (`tsc --noEmit`)
2. ESLint validation
3. Project build
4. Full test suite

All must pass before committing changes.