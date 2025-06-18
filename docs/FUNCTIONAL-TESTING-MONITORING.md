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

⚠️ **Memory Detection Limitation**: The global `Memory` object used in bot code is not easily accessible through the CLI in private servers. The POC evidence system does not rely on Memory detection, focusing instead on observable behaviors (CPU, objects, ticks, console).

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