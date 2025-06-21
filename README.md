# Screeps AI - TypeScript Implementation

A TypeScript-based AI for [Screeps](https://screeps.com/) using a modular project/task architecture with comprehensive testing and development tools.

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

## Documentation Structure

This project organizes documentation by concern level, from high-level strategy to low-level implementation details:

### 📋 [Strategy](docs/strategy/STRATEGY.md)
Game objectives and desired behaviors using Screeps terminology:
- Energy economy goals (harvest at generation rate)
- RCL progression strategy (upgrade controllers efficiently)
- Resource management priorities
- Operational behaviors and victory conditions

### 🏗️ [Architecture](docs/architecture/ARCHITECTURE.md)
Bot logic design using framework terminology (language-agnostic):
- Planner/Project/Task hierarchy
- Component interactions and decision flows
- Energy management and role systems
- Scaling and adaptation strategies

### 💻 [Implementation](docs/implementation/IMPLEMENTATION.md)
TypeScript-specific code details and patterns:
- Interfaces and class structures
- Coding conventions and file organization
- Memory management and type safety
- Testing patterns and performance optimization

### 🔧 [Framework](docs/framework/FRAMEWORK.md)
Portable development tools for any Screeps player:
- MemoryBackedClass system for state persistence
- Runtime extension patterns for game objects
- Project/Task behavior framework
- Functional testing infrastructure

### 🚀 [Development](docs/development/)
Development process and workflow tools:
- **[FEATURES.md](docs/development/FEATURES.md)** - Current development focus and roadmap
- **[WORK_PROMPT.md](docs/development/WORK_PROMPT.md)** - Development workflow and session guide
- **[CONSOLE_HELPERS.md](docs/development/CONSOLE_HELPERS.md)** - In-game debugging and management tools

## Getting Started

1. **Understand the Strategy**: Read [Strategy](docs/strategy/STRATEGY.md) to understand game objectives
2. **Learn the Architecture**: Review [Architecture](docs/architecture/ARCHITECTURE.md) for bot logic design
3. **Explore Implementation**: Check [Implementation](docs/implementation/IMPLEMENTATION.md) for TypeScript details
4. **Use the Framework**: Browse [Framework](docs/framework/FRAMEWORK.md) for reusable tools
5. **Follow Development Process**: See [WORK_PROMPT.md](docs/development/WORK_PROMPT.md) for workflow

## Key Features

### Advanced Energy Management
- **Storage-Aware Builders & Upgraders**: Intelligent choice between harvesting vs withdrawing from storage
- **Smart Harvester Storage Logic**: Harvesters deposit into storage when infrastructure supports it
- **Infrastructure Analysis**: Room condition assessment for optimal energy flow strategies
- **Extension-Aware Spawning**: Dynamic body scaling based on total room energy capacity

### Comprehensive Role System
- **Builder Role**: Construction and repair with RCL-aware scaling and road rebuilding
- **Harvester Role**: Energy gathering with source assignment and storage integration
- **Upgrader Role**: Controller upgrading with storage energy withdrawal
- **Dynamic Quotas**: Role counts adjust based on room conditions and infrastructure

### Testing Infrastructure
- **279 Unit Tests**: Fast component testing with comprehensive coverage
- **Integration Tests**: Component interaction validation
- **Functional Tests**: End-to-end validation in real Screeps server environment
- **RCL Progression Tests**: Validation across all Room Control Levels (1-8)

### Development Framework
- **Project/Task Architecture**: Hierarchical behavior system for creep management
- **Memory Management**: MemoryBackedClass for persistent state across ticks
- **Runtime Extensions**: Clean API additions to Screeps objects
- **Type Safety**: Full TypeScript with strict checking and modern features

## Current Status

- **Production Ready**: Complete energy management and role systems
- **Comprehensive Testing**: 279+ tests covering unit, integration, and functional validation
- **Clean Architecture**: Well-separated concerns with clear documentation hierarchy
- **Active Development**: See [FEATURES.md](docs/development/FEATURES.md) for current focus

## Architecture Overview

The bot uses a three-layer hierarchy:

1. **Planners** (Strategic): Make high-level decisions across rooms (SourcePlanner, RoleManager)
2. **Projects** (Tactical): Manage long-term creep roles (HarvestEnergyProject, BuilderProject)
3. **Tasks** (Operational): Handle specific actions (HarvestEnergyTask, BuildTask)

This separation enables clear testing at each level and flexible adaptation to changing game conditions.

## Development Workflow

This project uses a **documentation-driven development** approach:

1. **Strategy First**: Define what you want to achieve in game terms
2. **Architecture Design**: Plan the bot logic to achieve those goals
3. **Implementation**: Write TypeScript code following established patterns
4. **Framework Evolution**: Extract reusable patterns for future use

See [WORK_PROMPT.md](docs/development/WORK_PROMPT.md) for detailed development guidance.

## Links

- **Screeps Profile**: https://screeps.com/a/#!/profile/mansel
- **Game Documentation**: https://docs.screeps.com/
- **TypeScript Types**: https://github.com/screeps/typed-screeps