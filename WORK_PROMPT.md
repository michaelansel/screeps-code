# Screeps Development Work Session Prompt

This prompt is designed to maximize development effectiveness and maintain project quality.

## The Optimized Prompt

**"Start a focused development session on the Screeps codebase. Check TODO.md for the next priority item and create a concrete plan to address it. Research existing code patterns before implementing. Run tests frequently. Document workflow discoveries and decisions as you learn. Keep refactoring minimal - only what's needed for the current task. If you discover larger refactoring needs or new features, add them to the appropriate list (TODO.md for immediate tasks, FEATURES.md for long-term ideas). Proactively update todo status and add newly discovered tasks. Ask clarifying questions early. Now execute the plan systematically."**

## Core Development Principles

### 🎯 Focus & Execution
- **Single task focus**: Work on one TODO item at a time to completion
- **Plan first**: Create concrete approach before coding
- **Research patterns**: Study existing code before implementing new features
- **Ask early**: Clarify requirements upfront to avoid rework

### 📋 Task Management
- **TODO.md**: Check for next priority, update status in real-time
- **Proactive discovery**: Add new tasks as you uncover them
- **Scope boundaries**: Keep current task minimal, defer larger work to separate items
- **Clear categorization**: TODO.md for immediate work, FEATURES.md for future ideas

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
1. **Check priority**: Read TODO.md top item
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
- **TODO.md**: Current sprint tasks (immediate work)
- **FEATURES.md**: Long-term ideas and major refactoring
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