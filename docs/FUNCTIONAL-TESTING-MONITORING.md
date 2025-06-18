# Functional Testing Monitoring Patterns

> **Source**: Proven patterns from screeps-functest-poc-final that demonstrate reliable bot behavior monitoring

## Core Monitoring Queries

### Game Time Progression
```bash
# Get current game tick
storage.env.get('gameTime').then(t => JSON.stringify(t))
```

### CPU Usage Detection  
```bash
# Get user's last CPU usage
storage.db.users.findOne({_id: '$USER_ID'}).then(u => JSON.stringify(u.lastUsedCpu))
```

### Console Output Count
```bash
# Count console messages from user
storage.db['users.console'].find({user: '$USER_ID'}).then(logs => JSON.stringify(logs.length))
```

### Spawn Status Check
```bash
# Check if spawn is active (spawn.off === false means active)
storage.db['rooms.objects'].findOne({user: '$USER_ID', type: 'spawn'}).then(s => JSON.stringify(s.off))
```

### Game Objects Count
```bash
# Count total objects belonging to user
storage.db['rooms.objects'].find({user: '$USER_ID'}).then(objs => JSON.stringify(objs.length))

# Count specific object types
storage.db['rooms.objects'].find({user: '$USER_ID', type: 'creep'}).then(creeps => JSON.stringify(creeps.length))
```

### User Database Structure
```bash
# Get user object fields
storage.db.users.findOne({_id: '$USER_ID'}).then(u => JSON.stringify(Object.keys(u)))

# Expected fields: ["_id","username","usernameLower","cpu","gcl","cpuAvailable","registeredDate","active","badge","rooms","meta","$loki","lastUsedCpu","lastUsedDirtyTime"]
```

## Memory Access Patterns

### Get Memory for Specific User
```bash
# Get memory state for a specific user
storage.env.get('memory:USER_ID_HERE').then(data => JSON.stringify(data, null, 2))
```

### Get All Users
```bash
# Get list of all users (without memory)
storage.db['users'].find().then(users => JSON.stringify(users.map(u => ({id: u._id, username: u.username}))))
```

### Get All Users with Memory
```bash
# Single command to get all users with their memory data
storage.db['users'].find().then(users => 
  Promise.all(users.map(u => 
    storage.env.get('memory:' + u._id).then(mem => ({
      userId: u._id, 
      username: u.username, 
      memory: mem
    }))
  ))
).then(results => JSON.stringify(results, null, 2))
```

### Memory Storage Pattern
- Memory is stored in `storage.env` with the pattern `memory:USER_ID`
- The memory data can be a string (often empty for inactive bots) or JSON object
- Memory structure follows standard Screeps format: `{creeps: {}, spawns: {}, rooms: {}, ...}`
- User code is stored separately in `storage.db['users.code']` collection

## Evidence-Based Success Criteria

From the POC's proven 6-point evidence system:

1. **Tick Progression** (>20 ticks): `TOTAL_TICK_PROGRESS > 20`
2. **CPU Usage** (>0 CPU): `FINAL_CPU_USAGE > 0` 
3. **Console Output** (>0 messages): `FINAL_CONSOLE_COUNT > 0`
4. **Game Objects** (>2 objects): `TOTAL_OBJECTS > 2`
5. **Code Complexity** (>1000 bytes): `CODE_LENGTH > 1000`
6. **Spawn Active** (spawn.off === false): `SPAWN_STATUS includes "false"`

**Success Threshold**: 4/6 points minimum for production readiness

## Monitoring Pattern Example

```typescript
// Monitor for 60 seconds with 6 checkpoints
for (let i = 1; i <= 6; i++) {
  await sleep(10000); // 10 seconds between checks
  
  const currentTick = await this.curlCli("storage.env.get('gameTime').then(t => JSON.stringify(t))");
  const cpuUsage = await this.curlCli(`storage.db.users.findOne({_id: '${userId}'}).then(u => JSON.stringify(u.lastUsedCpu))`);
  const spawnStatus = await this.curlCli(`storage.db['rooms.objects'].findOne({user: '${userId}', type: 'spawn'}).then(s => JSON.stringify(s.off))`);
  
  const tickProgress = currentTick - startTick;
  const spawnActive = spawnStatus.includes("false");
  
  console.log(`Check ${i}/6: Tick ${currentTick} (+${tickProgress}), CPU ${cpuUsage || 0}, Spawn active: ${spawnActive ? "YES" : "NO"}`);
}
```

## Available Database Collections

From `Object.keys(storage.db)`:
- `users` - User accounts and metadata
- `users.code` - User bot code  
- `users.console` - Console output logs
- `rooms.objects` - All game objects (spawns, creeps, etc.)
- `rooms` - Room data
- `rooms.terrain` - Room terrain info
- `market.orders`, `transactions` - Economy data
- `leaderboard.*` - Ranking data

## Memory Storage Notes

## Memory Monitoring Examples

### Basic Memory Validation
```typescript
// Check if user has initialized memory
const memory = await harness.getMemoryState(userId);
expect(memory).to.not.be.null;
expect(memory).to.have.property('creepCounter');
```

### Pattern-Based Memory Testing
```typescript
// Test specific memory patterns
const patterns = await harness.checkMemoryPatterns(userId, {
  'creepCounter': null,        // Check if exists (any value)
  'creeps.Worker1.project': 'HarvestEnergyProject',  // Check nested value
  'creeps': null,              // Check if creeps object exists
  'nonExistent': 'test'        // This should fail
});

expect(patterns.creepCounter).to.be.true;
expect(patterns['creeps.Worker1.project']).to.be.true;
expect(patterns.nonExistent).to.be.false;
```

### Memory Statistics Analysis
```typescript
// Get comprehensive memory statistics
const memoryStats = await harness.getMemoryStats(userId);
expect(memoryStats.exists).to.be.true;
expect(memoryStats.hasCreepCounter).to.be.true;

console.log(`Memory size: ${memoryStats.size} bytes`);
console.log(`Creep count: ${memoryStats.creepCount}`);
console.log(`Structure: ${memoryStats.memoryStructure.join(', ')}`);
```

### Multi-User Memory Analysis
```typescript
// Get all users with their memory data
const allUsers = await harness.getAllUsersWithMemory();
const activeUsers = allUsers.filter(u => u.memory && Object.keys(u.memory).length > 0);

console.log(`Found ${activeUsers.length} active users with memory`);
```

### Memory Preloading Examples

```typescript
// Simple memory preloading
const preloadedState = {
  creepCounter: 3,
  creeps: {
    "TestWorker": {
      role: "harvester",
      project: { id: "HarvestEnergyProject" }
    }
  },
  testMode: true
};

const result = await harness.preloadMemory(userId, preloadedState);
expect(result.success).to.be.true;

// Memory merging (preserves existing data)
await harness.mergeMemory(userId, {
  economy: { level: 2, energy: 500 },
  additionalFlags: { debugMode: true }
});

// Clear memory for cleanup
await harness.clearMemory(userId);

// Bulk cleanup for test users
const clearedCount = await harness.bulkClearTestUserMemory();
console.log(`Cleared ${clearedCount} test user memories`);
```

## Command Line Usage

All monitoring commands use the standard CLI access pattern:
```bash
# Replace 'CONTAINER_NAME' with your actual container name
finch exec CONTAINER_NAME curl -s http://localhost:21026/cli -d "COMMAND"
```

### Real Examples
```bash
# Get all users
finch exec screeps-server-1 curl -s http://localhost:21026/cli -d "storage.db['users'].find().then(users => JSON.stringify(users.map(u => ({id: u._id, username: u.username}))))"

# Get memory for specific user  
finch exec screeps-server-1 curl -s http://localhost:21026/cli -d "storage.env.get('memory:USER_ID_HERE').then(data => JSON.stringify(data, null, 2))"

# Get all users with memory
finch exec screeps-server-1 curl -s http://localhost:21026/cli -d "storage.db['users'].find().then(users => Promise.all(users.map(u => storage.env.get('memory:' + u._id).then(mem => ({userId: u._id, username: u.username, memory: mem}))))).then(results => JSON.stringify(results, null, 2))"
```

✅ **Memory Detection Now Available**: Unlike previous limitations, the new memory access pattern using `storage.env.get('memory:USER_ID')` provides reliable access to user memory state in private servers. This enables comprehensive memory-based validation in functional tests.

## CLI Access Patterns

All queries must be executed inside the container:
```bash
finch compose -f docker-compose.yml exec -T screeps curl -s http://localhost:21026/cli -d "QUERY"
```

The CLI endpoint executes JavaScript in the server context with access to:
- `storage.db.*` - Database collections
- `storage.env.*` - Environment variables  
- `system.*` - System controls (pause, reset, etc.)
- `map.*` - Room generation functions
- `filebot.*` - FileBot mod functions (when loaded)