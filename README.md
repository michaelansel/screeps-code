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

# Deploy to Screeps (configure API first)
npm run upload-main
```

## Getting Started

1. **New to this project?** Start with [Strategy](docs/strategy/STRATEGY.md) to understand game objectives
2. **Want to contribute?** Read [WORK_PROMPT.md](docs/development/WORK_PROMPT.md) for development workflow
3. **Need debugging help?** See [CONSOLE_HELPERS.md](docs/development/CONSOLE_HELPERS.md) for in-game tools
4. **Looking for specific docs?** Check the documentation structure below

## Documentation

Our documentation is organized by concern level:

- **[Strategy](docs/strategy/STRATEGY.md)** - Game objectives and desired behaviors
- **[Architecture](docs/architecture/ARCHITECTURE.md)** - Bot logic design and component interactions
- **[Implementation](docs/implementation/IMPLEMENTATION.md)** - TypeScript code patterns and conventions
- **[Framework](docs/framework/FRAMEWORK.md)** - Reusable development tools and patterns
- **[Development](docs/development/)** - Development process, features, and debugging tools

## Current Features

- Energy management with storage-aware harvesting, opportunistic pickup, and building
- Dynamic role system (harvester, builder, upgrader) with RCL-based scaling
- Project/Task architecture for organized creep behavior
- Comprehensive test suite (unit, integration, and functional tests)
- Memory persistence framework for game state management

See [FEATURES.md](docs/development/FEATURES.md) for current development focus.

## Links

- **Screeps Profile**: https://screeps.com/a/#!/profile/mansel
- **Game Documentation**: https://docs.screeps.com/
- **TypeScript Types**: https://github.com/screeps/typed-screeps