# Documentation Philosophy & Workflow

This document captures our approach to documentation-first development and the relationships between different types of documentation.

## Documentation Hierarchy

We maintain a clear hierarchy of documentation that reflects different levels of thinking and decision-making:

### 1. **Strategy** (`docs/strategy/`)
**What we want to achieve and why**
- Game strategy and priorities (STRATEGY.md)
- Recovery and emergency procedures (RECOVERY-STRATEGY.md)
- High-level gameplay philosophy and trade-offs

### 2. **Architecture** (`docs/architecture/`)
**How the system is designed to achieve the strategy**
- System design and component relationships (ARCHITECTURE.md)
- Design patterns and abstractions
- Technical approach to implementing strategy

### 3. **Implementation** (`docs/implementation/`)
**Specific code details and patterns**
- Code organization and conventions (IMPLEMENTATION.md)
- API references and examples (QUICK-REFERENCE.md)
- Technical details for developers

### 4. **Features** (`docs/development/FEATURES.md`)
**Work planning and execution tracking**
- Cross-cuts all other documentation types
- Tracks what needs to be implemented to realize strategy/architecture
- Records development progress and decisions

## Documentation-First Workflow

### The Flow of Changes

Changes can originate at any level, but they must flow through the documentation hierarchy:

```
Strategy Change → Architecture Review → Feature Planning → Implementation
     ↓                    ↓                    ↓               ↓
  Update strategy docs  Update arch docs   Add to FEATURES.md  Code + tests
```

### Example Workflows

#### 1. Strategy-Driven Change
1. **Strategy decision**: "We want faster emergency recovery"
2. **Architecture impact**: Review if current architecture supports this
3. **Feature planning**: Add specific features to FEATURES.md (e.g., "Emergency spawning system")
4. **Implementation**: Code the features
5. **Documentation update**: Update all levels to reflect new reality

#### 2. Simple Configuration Change
1. **Strategy decision**: "Increase harvester count from 2 to 3"
2. **Architecture impact**: None - current system supports this
3. **Feature planning**: Add "Update harvester quota configuration" to FEATURES.md
4. **Implementation**: Change a constant
5. **Documentation update**: Update strategy docs with new numbers

#### 3. Feature-Discovered Architectural Change
1. **Feature work**: "Add link network management"
2. **Discovery**: This requires major changes to energy flow architecture
3. **Stop and document**: Update ARCHITECTURE.md with proposed energy network design
4. **Strategy review**: Does this align with our energy management strategy?
5. **Resume**: Continue with clear architectural foundation

#### 4. Implementation-Discovered Architectural Issue
1. **Implementation**: Working on a specific feature
2. **Discovery**: Current architecture makes this unnecessarily complex
3. **Pause**: Document the architectural problem and proposed solution
4. **Architecture update**: Revise ARCHITECTURE.md with better approach
5. **Feature update**: Update FEATURES.md with revised implementation plan
6. **Resume**: Implement with clean architecture

## Key Principles

### 1. Documentation Before Implementation
- **Large changes**: Must be documented architecturally before coding
- **Strategy changes**: Must be recorded before implementation planning
- **Complex features**: Architecture impact must be assessed before starting

### 2. FEATURES.md as Central Hub
- **All work flows through FEATURES.md**: Whether it's strategy, architecture, or implementation
- **Feature list reflects current reality**: What's planned, in progress, completed
- **Cross-references other docs**: Links to relevant strategy/architecture documentation

### 3. Living Documentation
- **Update during work**: Don't wait until the end to document decisions
- **Record discoveries**: When implementation reveals architectural insights, document them
- **Capture trade-offs**: Explain why decisions were made, not just what was decided

### 4. Hierarchy Consistency
- **Strategy drives architecture**: Architectural decisions should support strategic goals
- **Architecture drives implementation**: Code should reflect documented design patterns
- **Implementation informs strategy**: Real-world results should influence future strategy

## Documentation Workflow Examples

### Starting a New Feature
1. **Check strategy alignment**: Does this feature support our documented strategy?
2. **Review architectural fit**: How does this fit with existing architecture?
3. **Plan in FEATURES.md**: Add feature with clear scope and approach
4. **Document architectural changes**: If needed, update ARCHITECTURE.md first
5. **Implement**: Code with clear architectural foundation

### Discovering an Architectural Need
1. **Pause implementation**: Don't continue with unclear architecture
2. **Document the problem**: What architectural issue did you discover?
3. **Propose solution**: How should the architecture change?
4. **Update ARCHITECTURE.md**: Record the new design approach
5. **Update FEATURES.md**: Revise implementation plan if needed
6. **Resume implementation**: Continue with clear architectural guidance

### Strategy Evolution
1. **Document strategy change**: Update STRATEGY.md with new priorities
2. **Assess architectural impact**: Does current architecture support new strategy?
3. **Plan architectural changes**: What needs to change to support new strategy?
4. **Update FEATURES.md**: Add features needed to implement strategy changes
5. **Implementation**: Execute the planned changes

## Anti-Patterns to Avoid

### ❌ Implementation-First Development
- Coding without clear architectural foundation
- Making architectural changes without documentation
- Letting implementation details drive strategy

### ❌ Stale Documentation
- Documentation that doesn't reflect current implementation
- Strategy documents that don't match actual system behavior
- Architecture docs that describe ideal rather than actual state

### ❌ Documentation Silos
- Features planned without considering strategy alignment
- Architecture changes without strategy review
- Implementation decisions that ignore documented architecture

## Benefits of This Approach

### 1. **Clear Decision Context**
- Every change has documented rationale
- Trade-offs are explicit and traceable
- New team members can understand current state

### 2. **Architectural Integrity**
- Implementation reflects intentional design
- Changes are evaluated against documented principles
- System evolution is guided by clear vision

### 3. **Strategic Alignment**
- Features support documented gameplay strategy
- Resources are allocated according to priorities
- Implementation details serve strategic goals

### 4. **Efficient Development**
- Less rework due to architectural clarity
- Fewer conflicts between different system parts
- Clear scope boundaries for features

## Documentation Quality Standards

### Timeless vs Temporal Content

All documentation should strive to be **timeless** - describing enduring principles, patterns, and strategies rather than specific historical events or bugs.

#### ✅ **Timeless Content** (Preferred)
- **General problems and solutions**: "How to handle energy shortages" not "How we fixed the energy bug"
- **Strategic principles**: "Speed over efficiency during recovery" not "We changed the recovery algorithm"  
- **Design patterns**: "Use capability-based spawning" not "We replaced the old role system"
- **Enduring trade-offs**: "Memory vs CPU optimization" not "Why we refactored the cache"

#### ❌ **Temporal Content** (Avoid)
- **Bug fix histories**: "We discovered X was broken and fixed it by doing Y"
- **Implementation timelines**: "First we tried X, then we changed to Y"
- **Historical decisions**: "We used to do X but now we do Y because..."
- **Specific incidents**: "When the PTR room got stuck, we learned..."

### Strategy Documents
- **Timeless problem definitions**: What challenges will always exist in this domain?
- **Enduring principles**: What approaches will remain valid regardless of implementation?
- **Clear priorities**: What matters most and why, in ways that won't change
- **Explicit trade-offs**: What we're willing to sacrifice, as general principles
- **Measurable goals**: How we know if strategy is working, using criteria that persist

### Architecture Documents  
- **System relationships**: How components should interact (not how they evolved)
- **Design patterns**: Consistent approaches to common problems
- **Extension points**: How system can evolve in the future
- **Timeless abstractions**: Core concepts that remain stable across implementations

### Implementation Documents
- **Current patterns**: How to accomplish tasks with existing code
- **API examples**: How to use system components as they exist now
- **Development guidance**: How to maintain code quality going forward
- **Code conventions**: Standards that should persist across changes

### Feature Planning
- **Clear scope**: What's included and excluded
- **Dependencies**: What must happen first
- **Success criteria**: How to know when feature is complete
- **Strategic rationale**: Why this feature supports timeless goals

This documentation-first approach ensures that our codebase evolution is intentional, well-reasoned, and aligned with our strategic goals while maintaining architectural integrity.