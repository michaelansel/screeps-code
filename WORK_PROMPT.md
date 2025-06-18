# Screeps Development Work Session Guide

> **Clear, actionable guidance for starting development work in this repository**

## 🚀 Quick Start (30 seconds)

1. **Check current focus**: Read [`FEATURES.md`](FEATURES.md) "Current Development Focus" section
2. **Understand the codebase**: Browse [`ARCHITECTURE.md`](ARCHITECTURE.md) for technical details
3. **Review patterns**: Check [`QUICK-REFERENCE.md`](QUICK-REFERENCE.md) for common code patterns
4. **Plan your approach**: Write 2-3 sentence implementation plan
5. **Start coding**: Follow the development workflow below

## ⚡ Essential Commands

```bash
npm run test        # Run all tests (use frequently during development)
npm run test:unit   # Fast unit tests only (~150ms)
npm run lint        # TypeScript + ESLint validation  
npm run pre-commit  # Full validation before committing
npm run build       # Production build
```

## 🎯 Development Workflow

### 1. Check Priority (FEATURES.md)
- Look at "Current Development Focus" section
- If empty, pick next feature from "Planned" sections
- Update status to 🚧 **IN PROGRESS** when starting

### 2. Research Existing Patterns
- Study similar implementations in the codebase
- Check [`ARCHITECTURE.md`](ARCHITECTURE.md) for design patterns
- Look at existing tests in `test/unit/` for testing patterns

### 3. Implement with Testing
- Write small, focused changes
- Run `npm run test:unit` frequently (very fast)
- Follow existing code conventions and patterns
- Add unit tests for new functionality

### 4. Document and Update
- Update [`FEATURES.md`](FEATURES.md) with progress
- Add any discoveries to appropriate documentation
- Keep commit messages descriptive

### 5. Validate and Commit
- Run `npm run pre-commit` before committing
- All tests must pass, no lint errors
- Commit with descriptive message

## 📋 Key Project Files

- **[`FEATURES.md`](FEATURES.md)** - Current development focus and roadmap (central source of truth)
- **[`ARCHITECTURE.md`](ARCHITECTURE.md)** - Technical implementation details and patterns
- **[`TESTING.md`](TESTING.md)** - Testing guide and infrastructure  
- **[`QUICK-REFERENCE.md`](QUICK-REFERENCE.md)** - Code patterns and common tasks
- **[`README.md`](README.md)** - Project overview and quick start

## 🧪 Testing Strategy

- **Test Count**: 156 unit tests, 37 integration tests, 4+ functional tests
- **Coverage**: Critical components fully tested
- **Speed**: Unit tests run in ~150ms, use frequently
- **Patterns**: Mirror `src/` structure in `test/unit/`

## 💡 Development Principles

### Focus & Quality
- Work on one feature at a time to completion
- Keep changes small and focused
- Run tests frequently - they're fast!
- Follow existing patterns and conventions

### Documentation
- Update [`FEATURES.md`](FEATURES.md) as you progress
- Document "why" decisions, not just "what"
- Add new patterns to [`QUICK-REFERENCE.md`](QUICK-REFERENCE.md)

### Architecture Awareness
- **Project/Task Framework**: Long-term goals vs short-term actions
- **Memory Management**: Persistent state via `MemoryBackedClass`
- **Extensions**: Runtime augmentation of Screeps objects
- **Type Safety**: Full TypeScript with strict checks

## 🔍 Common Workflows

### Adding a New Task
1. Study existing tasks in `src/tasks/`
2. Create new task extending `TaskBehavior`
3. Add unit tests mirroring existing patterns
4. Register task and update exports
5. Add to [`QUICK-REFERENCE.md`](QUICK-REFERENCE.md) examples

### Adding a New Project  
1. Study existing projects in `src/projects/`
2. Create new project extending `ProjectBehavior`
3. Define task transitions and logic
4. Add comprehensive unit tests
5. Document usage patterns

### Debugging Issues
- Use `Logger.enable("*")` for verbose logging
- Check [`TESTING.md`](TESTING.md) for test troubleshooting
- Use functional tests for end-to-end validation
- Leverage TypeScript compiler for type errors

## ❌ Avoid These Pitfalls
- Don't skip running tests - they're very fast
- Don't forget to update [`FEATURES.md`](FEATURES.md) progress
- Don't break existing patterns without good reason
- Don't commit without running `npm run pre-commit`

---

## 📊 Current Project Status

**Test Coverage**: 156 unit tests (⬆ from 83) covering all critical components  
**Architecture**: Stable Project/Task framework with full TypeScript safety  
**Infrastructure**: Complete testing pipeline with unit/integration/functional tests  
**Documentation**: Comprehensive guides for all aspects of development

Ready for feature development and expansion!

## Core Development Principles

### 🎯 Focus & Execution
- **Single task focus**: Work on one TODO item at a time to completion
- **Plan first**: Create concrete approach before coding
- **Research patterns**: Study existing code before implementing new features
- **Ask early**: Clarify requirements upfront to avoid rework

### 📋 Task Management
- **FEATURES.md**: Check current focus, update status and progress in real-time
- **Proactive discovery**: Add new tasks as you uncover them
- **Scope boundaries**: Keep current task minimal, defer larger work to separate items
- **Single source**: FEATURES.md contains all planning, tracking, and status information

### 🧪 Quality Gates
- **Test-driven workflow**: Run `npm run test` frequently during development
- **Pre-commit validation**: Always run `npm run pre-commit` before committing
- **Type safety**: Ensure `npm run lint` passes with zero errors
- **Pattern consistency**: Follow existing code conventions and architecture

### 📚 Documentation
- **Live updates**: Document decisions and discoveries as you work
- **Workflow capture**: Update process docs when you learn new patterns
- **Knowledge sharing**: Record insights for future developers
- **Context preservation**: Explain the "why" behind decisions

### 🔧 Refactoring Strategy
- **Minimal scope**: Only refactor what's necessary for current task
- **Separate concerns**: Large refactoring gets its own dedicated task
- **Progressive improvement**: Many small, focused changes over time
- **Safety first**: Always have tests before refactoring

## Execution Workflow

### 🚀 Session Startup (30 seconds)
1. **Check priority**: Read FEATURES.md "Current Development Focus" section
2. **Plan approach**: Write 2-3 sentence implementation plan
3. **Research context**: Scan related existing code
4. **Set boundaries**: Identify what's in/out of scope

### 🔄 Development Loop (repeat)
1. **Implement**: Small, focused change
2. **Test**: Run `npm run test` 
3. **Document**: Update relevant docs if needed
4. **Discover**: Add new tasks to TODO/FEATURES as found
5. **Validate**: Check progress against plan

### ✅ Task Completion
1. **Final validation**: `npm run pre-commit`
2. **Update status**: Mark TODO item complete
3. **Document learnings**: Update workflow docs if applicable
4. **Commit**: If requested by user

### 🔍 Quality Checkpoints
- **Every change**: Does this follow existing patterns?
- **Every test run**: Are all tests passing?
- **Every discovery**: Should this be a separate task?
- **Every decision**: Is this documented somewhere?

## Quick Reference

### Essential Commands
```bash
npm run test        # Run tests (use frequently)
npm run pre-commit  # Full validation before commit
npm run lint        # TypeScript + ESLint check
npm run build       # Production build
```

### Project Structure
- **FEATURES.md**: Complete development roadmap and current focus
- **TESTING.md**: Test workflow and patterns
- **DOCUMENTATION.md**: Project architecture and design decisions
- **src/**: Source code organized by domain
- **test/unit/**: Mirror structure of src/

### Success Metrics
- ✅ **Focused delivery**: One TODO item completed per session
- ✅ **Quality maintained**: All tests pass, no lint errors
- ✅ **Knowledge captured**: Decisions and patterns documented
- ✅ **Progress visible**: TODO status reflects actual work state
- ✅ **Scope controlled**: Big ideas deferred to appropriate lists

Use this prompt to maintain high development velocity while preserving code quality and project organization.