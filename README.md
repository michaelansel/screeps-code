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

- **TypeScript** with type safety
- **Modular Architecture** with separation of concerns  
- **Testing** with unit tests, integration tests, and functional tests
- **Memory Management** with persistence and cleanup
- **Runtime Extensions** for Screeps object capabilities
- **Server Testing** with containerized environment

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
- **Project/Task Framework** (`src/projects/`, `src/tasks/`)
- **Source Planning** (`src/planners/SourcePlanner.ts`)  
- **Memory Management** (`src/utils/MemoryBackedClass.ts`)
- **Runtime Extensions** (`src/extensions/`)

### Testing Infrastructure
- **Unit Tests** for individual components
- **Integration Tests** for component interactions and build pipeline  
- **Functional Tests** using containerized Screeps server
- **Code Execution Validation** via test markers
- **Performance Testing** and memory validation

See [`TESTING.md`](TESTING.md) for complete testing guide.

## Links

- **Screeps Profile**: https://screeps.com/a/#!/profile/mansel
- **Game Documentation**: https://docs.screeps.com/
- **TypeScript Types**: https://github.com/screeps/typed-screeps
