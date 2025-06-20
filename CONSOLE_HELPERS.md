# Console Project Assignment Helpers

The Console utility (exposed as `C` in the game console) now includes powerful helpers for manually managing creep project assignments during gameplay.

## Available Commands

### Basic Information
```javascript
// List all available projects
C.listProjects()
// Output: 📋 Available Projects:
//   • HarvestEnergyProject
//   • BuilderProject
//   • UpgradeControllerProject
//   • DoNothingProject

// List all creeps and their current projects
C.listCreeps()
// Output: 🤖 All Creeps and their Projects:
//   • Harvester1: HarvestEnergyProject | Energy: 50/50
//   • Builder1: BuilderProject | Energy: 25/50
//   • Worker1: NO PROJECT | Energy: 0/50

// Show detailed project status overview
C.projectStatus()
// Output: 📊 Detailed Project Status:
//   🤖 Total Creeps: 3
//   📋 Project Assignments:
//     HarvestEnergyProject (1): Harvester1
//     BuilderProject (1): Builder1
//   🚨 Creeps WITHOUT Projects (1):
//     • Worker1
```

### Project Assignment

```javascript
// Assign project to a specific creep
C.assignProject('Harvester1', 'UpgradeControllerProject')
// Output: ✅ Assigned UpgradeControllerProject to Harvester1

// Assign project with custom configuration
C.assignProject('Builder1', 'BuilderProject', { repairThreshold: 0.8 })
// Output: ✅ Assigned BuilderProject to Builder1

// Assign project to multiple creeps using wildcard patterns
C.assignProjectToPattern('Harvester*', 'HarvestEnergyProject')
// Output: 🎯 Assigning HarvestEnergyProject to 2 creeps matching 'Harvester*':
//         ✅ Assigned HarvestEnergyProject to Harvester1
//         ✅ Assigned HarvestEnergyProject to Harvester2
//         ✅ Successfully assigned HarvestEnergyProject to 2/2 creeps

// Assign project to all creeps of a specific role
C.assignProjectToRole('Builder', 'BuilderProject')
// Output: 🎯 Assigning BuilderProject to 2 creeps matching 'Builder*':
//         ✅ Assigned BuilderProject to Builder1
//         ✅ Assigned BuilderProject to Builder2
//         ✅ Successfully assigned BuilderProject to 2/2 creeps
```

## Error Handling

The helpers include comprehensive error handling:

```javascript
// Non-existent creep
C.assignProject('FakeCreep', 'HarvestEnergyProject')
// Output: ❌ Creep 'FakeCreep' not found

// Non-existent project
C.assignProject('Harvester1', 'FakeProject')
// Output: ❌ Project 'FakeProject' not found. Available projects: HarvestEnergyProject, BuilderProject, UpgradeControllerProject, DoNothingProject

// No creeps matching pattern
C.assignProjectToPattern('NonExistent*', 'HarvestEnergyProject')
// Output: ❌ No creeps found matching pattern 'NonExistent*'
```

## Task Management

The helpers automatically handle task stopping:
- If a creep has a running task, it will be stopped before assigning the new project
- You'll see messages like: `🛑 Stopped current task for Harvester1`
- If task stopping fails, you'll see: `⚠️ Could not stop current task for Harvester1: [error details]`

## Use Cases

1. **Quick Testing**: Quickly switch creep roles during development/testing
2. **Emergency Management**: Reassign creeps during crises (e.g., all builders to repair during attack)
3. **Performance Tuning**: Experiment with different project distributions
4. **Debugging**: Isolate specific creeps with DoNothingProject to debug issues
5. **Manual Optimization**: Override automatic role assignment when needed

## Examples

```javascript
// Emergency: All creeps help with building
C.assignProjectToPattern('*', 'BuilderProject')

// Switch all upgraders to harvesters
C.assignProjectToRole('Upgrader', 'HarvestEnergyProject')

// Put problematic creep in safe state for debugging
C.assignProject('Harvester3', 'DoNothingProject')

// Assign specific repair threshold to builders
C.assignProjectToRole('Builder', 'BuilderProject', { repairThreshold: 0.9 })
```

## Notes

- All changes take effect immediately on the next tick
- The automatic project assignment system in main.ts will not override manually assigned projects
- Use `C.projectStatus()` to verify assignments worked as expected
- Project configurations are preserved when reassigning the same project type