# Standard Work Session Prompt

Use this prompt to start productive work sessions on the Screeps codebase.

## The Prompt

**"Grab the next todo item and make a plan for addressing it. Ask questions as needed. Update the documentation as you learn and decide things. Be sure to run the tests. Since this is your first code change, expect that you need to do a lot of workflow documentation. Minimize refactoring to the minimal amount required to accomplish your task, but if it seems like more refactoring is in order, add a separate task to the todo list or even to features.md if it is _really_ big refactoring. You can do that in general: add new items to the todo list or features.md as you come up with them in the course of doing a specific task. Now go do the work."**

## Key Principles

### Task Management
- ✅ Always check TODO.md for next priority item
- ✅ Update todo list as you discover new tasks
- ✅ Move major refactoring ideas to FEATURES.md
- ✅ Document decisions and learnings

### Quality Assurance
- ✅ Run tests after changes: `npm run test`
- ✅ Run pre-commit checks: `npm run pre-commit`
- ✅ Ensure TypeScript compilation: `npm run lint`

### Documentation
- ✅ Update workflow docs as you learn
- ✅ Document new patterns or conventions
- ✅ Keep TESTING.md current with testing practices

### Refactoring Guidelines
- ✅ **Minimal refactoring**: Only what's needed for the current task
- ✅ **Separate concerns**: Big refactoring gets its own TODO/FEATURES item
- ✅ **Progressive improvement**: Small, focused changes

### Discovery Process
- ✅ Ask questions when requirements are unclear
- ✅ Research existing patterns before implementing
- ✅ Add new tasks as you discover them
- ✅ Plan before coding

## Workflow Checklist

### Before Starting
- [ ] Check TODO.md for current priority
- [ ] Understand the requirement fully
- [ ] Plan the approach
- [ ] Identify potential new tasks/refactoring

### During Work
- [ ] Follow existing code patterns
- [ ] Write/update tests as needed
- [ ] Document decisions
- [ ] Add discovered tasks to appropriate lists

### After Completion
- [ ] Run tests: `npm run test`
- [ ] Run pre-commit: `npm run pre-commit`
- [ ] Update documentation
- [ ] Mark todo items complete
- [ ] Commit changes if requested

## Common Commands
```bash
# Run tests
npm run test

# Full validation (pre-commit)
npm run pre-commit

# Build project
npm run build

# Lint code
npm run lint
```

This prompt and checklist ensure consistent, high-quality development sessions.