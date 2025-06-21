# Screeps AI - TypeScript Implementation

A TypeScript-based AI for [Screeps](https://screeps.com/) using a modular project/task architecture.

## Quick Start

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm run test

# Run linting
npm run lint

# Deploy to Screeps (configure API first)
npm run upload-main
```

## Project Overview

This Screeps AI uses a **Projects/Tasks framework** where:

- **Projects** define long-term objectives (e.g., "Harvest Energy")
- **Tasks** handle specific actions (e.g., "Move to Source", "Transfer Energy")
- **Creeps** are assigned projects and execute tasks dynamically

### Key Features

- **Advanced Energy Management** with storage-aware builders, smart harvester logic, and infrastructure analysis
- **Dynamic Spawning System** with extension-aware energy calculation and role-specific body scaling
- **Comprehensive Role System** with builders, harvesters, and upgraders working in coordination
- **Road Network Management** with automatic rebuilding of missing/decayed infrastructure
- **RCL Progression Testing** ensuring reliable operation from basic survival through advanced optimization
- **TypeScript** with comprehensive type safety and modern language features
- **Modular Architecture** with clean separation of concerns and extensible design
- **Multi-Layer Testing** with unit tests, integration tests, functional tests, and RCL progression tests
- **Memory Management** with sophisticated persistence and automatic cleanup
- **Runtime Extensions** for enhanced Screeps object capabilities

## Development

This project uses a **single-file development workflow** centered on [`FEATURES.md`](FEATURES.md):

- **📋 [`FEATURES.md`](FEATURES.md)** - Complete development roadmap, current focus, and status tracking
- **🏗️ [`ARCHITECTURE.md`](ARCHITECTURE.md)** - Code structure, patterns, and technical implementation details  
- **🧪 [`TESTING.md`](TESTING.md)** - Comprehensive testing guide

### Current Status

See [`FEATURES.md`](FEATURES.md) for current development focus, completed features, and planned roadmap.

### Contributing

1. Check [`FEATURES.md`](FEATURES.md) for current development focus
2. Read [`ARCHITECTURE.md`](ARCHITECTURE.md) for code patterns and structure
3. Follow the single-file tracking system for all development work
4. Ensure tests pass: `npm run test`
5. Validate code quality: `npm run pre-commit`

**For AI developers**: See [`WORK_PROMPT.md`](WORK_PROMPT.md) for specialized development workflow guidance.

## Architecture

### Core Systems
- **Advanced Energy Management** (`src/utils/EnergySourceManager.ts`, enhanced task system)
- **Role Management** (`src/utils/RoleManager.ts`, comprehensive spawning and body generation)
- **Project/Task Framework** (`src/projects/`, `src/tasks/` - includes BuilderProject, road rebuilding)
- **Source Planning** (`src/planners/SourcePlanner.ts`, capacity-based assignment)
- **Memory Management** (`src/utils/MemoryBackedClass.ts`, sophisticated persistence)
- **Runtime Extensions** (`src/extensions/`, enhanced Creep capabilities)

### Testing Infrastructure
- **Unit Tests** for individual components (279 passing tests)
- **Integration Tests** for component interactions and build pipeline
- **Functional Tests** using containerized ARM64 Screeps server
- **RCL Progression Tests** covering all Room Control Levels (1-8)
- **Code Execution Validation** via test markers and memory monitoring
- **Performance Testing** and scalability validation

See [`TESTING.md`](TESTING.md) for complete testing guide.

## Links

- **Screeps Profile**: https://screeps.com/a/#!/profile/mansel
- **Game Documentation**: https://docs.screeps.com/
- **TypeScript Types**: https://github.com/screeps/typed-screeps
