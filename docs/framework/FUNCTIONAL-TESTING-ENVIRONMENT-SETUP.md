# Functional Testing Environment Setup Guide

> **Source**: Proven patterns from screeps-functest-poc-final that demonstrate comprehensive test environment setup methods

## Overview

This guide provides a complete reference for setting up Screeps functional testing environments. The patterns shown have been proven to handle complex bot deployment scenarios and eliminate shell parameter expansion issues through systematic environment preparation.

## Table of Contents

1. [Container Infrastructure Setup](#container-infrastructure-setup)
2. [FileBot Mod Installation](#filebot-mod-installation) 
3. [Room and Object Creation](#room-and-object-creation)
4. [User and Bot Management](#user-and-bot-management)
5. [Game State Control](#game-state-control)
6. [Complex Code Deployment](#complex-code-deployment)
7. [Environment Validation](#environment-validation)
8. [Cleanup and Restoration](#cleanup-and-restoration)

---

## Container Infrastructure Setup

### Clean Environment Preparation

**Build and start from scratch:**
```bash
echo "🧹 Preparing clean container environment..."

# Complete cleanup
finch compose -f docker-compose.steamkey.yml down -v 2>/dev/null || true

# Build fresh container image
echo "🔨 Building container image from scratch..."
finch compose -f docker-compose.steamkey.yml build --no-cache

# Start infrastructure
echo "🚀 Starting server infrastructure..."
finch compose -f docker-compose.steamkey.yml up -d

# Wait for server readiness
echo "⏳ Waiting for server initialization..."
for i in {1..30}; do
  if finch exec screeps curl -s -d "storage.env.get('gameTime')" >/dev/null 2>&1; then
    echo "✅ Server is ready!"
    break
  fi
  if [ $i -eq 30 ]; then
    echo "❌ Server failed to start within timeout"
    exit 1
  fi
  sleep 2
done
```

### Network and Volume Management

**Configure persistent storage and networking:**
```bash
# Check existing volumes
VOLUMES=$(finch volume ls | grep screeps || echo "No existing volumes")
echo "Existing volumes: $VOLUMES"

# Create named volume for data persistence (optional)
if [ "$PERSIST_DATA" = "true" ]; then
  finch volume create screeps-test-data
  echo "✅ Persistent volume created"
fi

# Verify network connectivity
NETWORK_STATUS=$(finch compose -f docker-compose.steamkey.yml exec screeps curl -s http://localhost:21026/cli -d "1+1" 2>/dev/null || echo "FAILED")
if [ "$NETWORK_STATUS" = "2" ]; then
  echo "✅ Network connectivity verified"
else
  echo "❌ Network connectivity failed"
  exit 1
fi
```

---

## FileBot Mod Installation

### Install and Verify Custom Mod Loading

**Complete FileBot mod setup:**
```bash
echo "📦 Installing FileBot mod..."

# Create mod directory and copy files
finch exec screeps mkdir -p /screeps/mods
finch compose -f docker-compose.steamkey.yml cp filebot-mod.js screeps:/screeps/mods/
finch compose -f docker-compose.steamkey.yml cp advanced-bot.js screeps:/screeps/

# Configure mod loading
MOD_CONFIG='cat > /screeps/mods.json << '\''EOF'\''
{
  "mods": [
    "mods/screeps-launcher-cli.js",
    "mods/filebot-mod.js"
  ],
  "bots": {}
}
EOF'

finch exec screeps bash -c "$MOD_CONFIG"

# Restart server to load mods
echo "🔄 Restarting server to load mods..."
finch compose -f docker-compose.steamkey.yml restart screeps

# Verify mod loading
echo "⏳ Waiting for mod loading..."
sleep 20
for i in {1..20}; do
  if finch exec screeps curl -s -d "typeof filebot" 2>/dev/null | grep -q "object"; then
    echo "✅ FileBot mod loaded successfully!"
    break
  fi
  if [ $i -eq 20 ]; then
    echo "❌ FileBot mod failed to load"
    exit 1
  fi
  sleep 2
done
```

---

## Room and Object Creation

### Basic Room Generation

**Create and open a new room:**
```bash
# Generate room terrain and open for use
finch exec screeps curl -s -d "map.generateRoom('$TEST_ROOM')"
finch exec screeps curl -s -d "map.openRoom('$TEST_ROOM')"

# Verify room creation
ROOM_INFO=$(finch exec screeps curl -s -d "storage.db.rooms.findOne({_id: '$TEST_ROOM'}).then(r => JSON.stringify(r))")
echo "Room created: $(echo "$ROOM_INFO" | jq -r '.status')"
```

### Advanced Spawn Creation with Unique Coordinates

**Create spawn with collision-resistant coordinates:**
```bash
# Generate unique coordinates to prevent conflicts
TIMESTAMP=$(date +%s)
SPAWN_X=$((25 + (TIMESTAMP % 10)))
SPAWN_Y=$((25 + ((TIMESTAMP % 100) / 10)))
SPAWN_ID="unique_spawn_${TIMESTAMP}"

CREATE_SPAWN="storage.db['rooms.objects'].insert({
  _id: '$SPAWN_ID',
  room: '$TEST_ROOM',
  type: 'spawn',
  x: $SPAWN_X,
  y: $SPAWN_Y,
  user: '$TEST_USER_ID',
  name: 'UniqueSpawn$TIMESTAMP',
  energy: 300,
  energyCapacity: 300,
  hits: 5000,
  hitsMax: 5000,
  spawning: null,
  store: {energy: 300},
  storeCapacityResource: {energy: 300},
  off: false
})"

finch exec screeps curl -s -d "$CREATE_SPAWN"
echo "✅ Spawn created at unique coordinates: ($SPAWN_X, $SPAWN_Y)"
```

### Energy Source Distribution

**Create multiple energy sources:**
```bash
# Primary energy source
SOURCE1_ID="test_source1_$(date +%s)"
CREATE_SOURCE1="storage.db['rooms.objects'].insert({
  _id: '$SOURCE1_ID',
  room: '$TEST_ROOM',
  type: 'source',
  x: 20,
  y: 20,
  energy: 3000,
  energyCapacity: 3000,
  ticksToRegeneration: 300
})"

# Secondary energy source for economy testing
SOURCE2_ID="test_source2_$(date +%s)"
CREATE_SOURCE2="storage.db['rooms.objects'].insert({
  _id: '$SOURCE2_ID',
  room: '$TEST_ROOM',
  type: 'source',
  x: 35,
  y: 35,
  energy: 3000,
  energyCapacity: 3000,
  ticksToRegeneration: 300
})"

finch exec screeps curl -s -d "$CREATE_SOURCE1"
finch exec screeps curl -s -d "$CREATE_SOURCE2"
echo "✅ Dual energy source economy created"
```

---

## User and Bot Management

### Advanced User Profile Creation

**Create user with complete profile using FileBot:**
```bash
# Using FileBot mod for comprehensive user creation
USER_CREATION="filebot.createUser('$TEST_USER_ID', {
  username: 'CompleteTestBot',
  cpu: 100,
  gcl: 2,
  cpuAvailable: 10000,
  badge: {
    type: 1,
    color1: '#ff0000',
    color2: '#00ff00',
    color3: '#0000ff',
    flip: false,
    param: 1
  },
  room: '$TEST_ROOM'
})"

RESULT=$(finch exec screeps curl -s -d "$USER_CREATION")
echo "User creation result: $RESULT"
```

### Multi-User Test Scenarios

**Create competitive test environment:**
```bash
# Create two competing users
USER1_ID="test_user1_$(date +%s)"
USER2_ID="test_user2_$(date +%s)"

# User 1 - Red team
CREATE_USER1="storage.db.users.insert({
  _id: '$USER1_ID',
  username: 'RedTeam',
  usernameLower: 'redteam',
  cpu: 100,
  gcl: 1,
  cpuAvailable: 10000,
  active: true,
  rooms: ['$TEST_ROOM']
})"

# User 2 - Blue team  
CREATE_USER2="storage.db.users.insert({
  _id: '$USER2_ID',
  username: 'BlueTeam',
  usernameLower: 'blueteam',
  cpu: 100,
  gcl: 1,
  cpuAvailable: 10000,
  active: true,
  rooms: ['$TEST_ROOM']
})"

finch exec screeps curl -s -d "$CREATE_USER1"
finch exec screeps curl -s -d "$CREATE_USER2"

echo "✅ Competitive test environment created"
echo "Red team: $USER1_ID"
echo "Blue team: $USER2_ID"
```

---

## Game State Control

### Simulation Management

**Pause simulation for controlled setup:**
```bash
echo "⏸️  Pausing simulation for setup..."
finch exec screeps curl -s -d "system.pauseSimulation()"

# Verify pause status
PAUSE_STATUS=$(finch exec screeps curl -s -d "storage.env.get('gameTime').then(t => JSON.stringify(t))" | jq -r '.')
echo "Game paused at tick: $PAUSE_STATUS"
```

**Resume simulation after setup:**
```bash
echo "▶️  Resuming simulation..."
finch exec screeps curl -s -d "system.resumeSimulation()"

# Confirm tick progression
sleep 3
NEW_TICK=$(finch exec screeps curl -s -d "storage.env.get('gameTime').then(t => JSON.stringify(t))" | jq -r '.')
echo "Simulation resumed - current tick: $NEW_TICK"
```

### Tick Baseline Capture

**Establish timing baselines for behavioral testing:**
```bash
# Capture initial game state
echo "📊 Capturing baseline game state..."
BASELINE_TICK=$(finch exec screeps curl -s -d "storage.env.get('gameTime').then(t => JSON.stringify(t))" | jq -r '.')
BASELINE_TIME=$(date +%s)

echo "Baseline established:"
echo "- Game tick: $BASELINE_TICK"
echo "- Real time: $BASELINE_TIME"
echo "- Test room: $TEST_ROOM"

# Function for calculating deltas during test
calculate_progress() {
  CURRENT_TICK=$(finch exec screeps curl -s -d "storage.env.get('gameTime').then(t => JSON.stringify(t))" | jq -r '.')
  CURRENT_TIME=$(date +%s)
  
  TICK_DELTA=$((CURRENT_TICK - BASELINE_TICK))
  TIME_DELTA=$((CURRENT_TIME - BASELINE_TIME))
  
  echo "Progress: +$TICK_DELTA ticks in ${TIME_DELTA}s"
}
```

---

## Complex Code Deployment

### FileBot Integration for Zero Shell Expansion

**Deploy complex bots without shell parameter expansion issues:**
```bash
# FileBot injection eliminates shell parameter expansion issues
INJECTION_RESULT=$(finch exec screeps curl -s -d "filebot.inject('/screeps/advanced-bot.js', '$TEST_USER_ID', {
  username: 'AdvancedBot',
  room: '$TEST_ROOM',
  cpu: 100,
  cpuAvailable: 10000
})")

# Extract injection details
SUCCESS=$(echo "$INJECTION_RESULT" | jq -r '.success')
CODE_LENGTH=$(echo "$INJECTION_RESULT" | jq -r '.codeLength')
USER_ID=$(echo "$INJECTION_RESULT" | jq -r '.userId')

if [ "$SUCCESS" = "true" ]; then
  echo "✅ FileBot injection successful"
  echo "- Code length: $CODE_LENGTH bytes"
  echo "- User ID: $USER_ID"
else
  echo "❌ FileBot injection failed"
  exit 1
fi
```

### Multi-Module Bot Architecture

**Deploy modular bot with multiple JavaScript modules:**
```bash
# Deploy modular bot with shared utilities
MODULAR_DEPLOYMENT=$(finch exec screeps curl -s -d "filebot.injectMultiFile('/screeps/modular-bot/', '$TEST_USER_ID', {
  username: 'ModularBot',
  room: '$TEST_ROOM',
  mainFile: 'main.js',
  includeFiles: ['harvester.js', 'builder.js', 'roleManager.js']
})")

# Verify all modules loaded
MODULE_COUNT=$(echo "$MODULAR_DEPLOYMENT" | jq -r '.moduleCount')
MODULES_LIST=$(echo "$MODULAR_DEPLOYMENT" | jq -r '.modules | keys | join(", ")')

echo "✅ Modular bot architecture deployed"
echo "- Modules loaded: $MODULE_COUNT"
echo "- Module files: $MODULES_LIST"
```

---

## Environment Validation

### Comprehensive Environment Health Check

**Validate complete environment setup:**
```bash
echo "🔍 Validating test environment..."

# Check all required objects exist
ROOM_VALIDATION=$(finch exec screeps curl -s -d "
storage.db['rooms.objects'].find({room: '$TEST_ROOM'}).then(objs => {
  const spawns = objs.filter(o => o.type === 'spawn');
  const sources = objs.filter(o => o.type === 'source');
  const controllers = objs.filter(o => o.type === 'controller');
  
  return JSON.stringify({
    totalObjects: objs.length,
    spawns: spawns.length,
    sources: sources.length,
    controllers: controllers.length,
    spawnActive: spawns[0] ? !spawns[0].off : false,
    sourceEnergy: sources[0] ? sources[0].energy : 0
  });
})")

# Parse validation results
TOTAL_OBJECTS=$(echo "$ROOM_VALIDATION" | jq -r '.totalObjects')
SPAWNS=$(echo "$ROOM_VALIDATION" | jq -r '.spawns')
SOURCES=$(echo "$ROOM_VALIDATION" | jq -r '.sources')
SPAWN_ACTIVE=$(echo "$ROOM_VALIDATION" | jq -r '.spawnActive')

echo "Environment validation:"
echo "- Total objects: $TOTAL_OBJECTS"
echo "- Spawns: $SPAWNS (active: $SPAWN_ACTIVE)"
echo "- Sources: $SOURCES"

if [ "$SPAWNS" -gt 0 ] && [ "$SOURCES" -gt 0 ] && [ "$SPAWN_ACTIVE" = "true" ]; then
  echo "✅ Environment validation passed"
else
  echo "❌ Environment validation failed"
  exit 1
fi
```

### Evidence-Based Setup Validation

**Collect comprehensive setup evidence:**
```bash
echo "📊 Collecting environment setup evidence..."

# Gather comprehensive environment metrics
SETUP_EVIDENCE=$(finch exec screeps curl -s -d "
Promise.all([
  storage.env.get('gameTime'),
  storage.db['rooms.objects'].find({room: '$TEST_ROOM'}),
  storage.db.users.findOne({_id: '$TEST_USER_ID'}),
  storage.db['users.code'].findOne({user: '$TEST_USER_ID'})
]).then(results => JSON.stringify({
  gameTime: results[0],
  roomObjects: results[1].length,
  userExists: !!results[2],
  codeInjected: !!results[3],
  spawns: results[1].filter(o => o.type === 'spawn').length,
  sources: results[1].filter(o => o.type === 'source').length,
  controllers: results[1].filter(o => o.type === 'controller').length
}))
")

# Evaluate setup success
ROOM_OBJECTS=$(echo "$SETUP_EVIDENCE" | jq -r '.roomObjects')
USER_EXISTS=$(echo "$SETUP_EVIDENCE" | jq -r '.userExists')
CODE_INJECTED=$(echo "$SETUP_EVIDENCE" | jq -r '.codeInjected')
SPAWNS=$(echo "$SETUP_EVIDENCE" | jq -r '.spawns')

SETUP_SCORE=0
[ "$ROOM_OBJECTS" -gt 2 ] && SETUP_SCORE=$((SETUP_SCORE + 1))
[ "$USER_EXISTS" = "true" ] && SETUP_SCORE=$((SETUP_SCORE + 1))
[ "$CODE_INJECTED" = "true" ] && SETUP_SCORE=$((SETUP_SCORE + 1))
[ "$SPAWNS" -gt 0 ] && SETUP_SCORE=$((SETUP_SCORE + 1))

echo "Setup evidence score: $SETUP_SCORE/4"
if [ "$SETUP_SCORE" -ge 3 ]; then
  echo "✅ Environment setup validation passed"
else
  echo "❌ Environment setup validation failed"
  exit 1
fi
```

---

## Cleanup and Restoration

### Post-Test Cleanup

**Clean up test environment:**
```bash
echo "🧹 Cleaning up test environment..."

# Remove test objects
CLEANUP_OBJECTS="storage.db['rooms.objects'].removeWhere({room: '$TEST_ROOM'})"
finch exec screeps curl -s -d "$CLEANUP_OBJECTS"

# Remove test users (optional)
if [ "$REMOVE_TEST_USERS" = "true" ]; then
  CLEANUP_USERS="storage.db.users.removeWhere({_id: '$TEST_USER_ID'})"
  finch exec screeps curl -s -d "$CLEANUP_USERS"
fi

# Restore original room assignments (if backed up)
if [ -n "$ORIGINAL_ROOMS" ]; then
  RESTORE_ROOMS="storage.db.users.update({_id: '$EXISTING_USER'}, {\$set: {rooms: $ORIGINAL_ROOMS}})"
  finch exec screeps curl -s -d "$RESTORE_ROOMS"
fi

echo "✅ Test environment cleanup completed"
```

### Complete Infrastructure Teardown

**Complete infrastructure cleanup:**
```bash
echo "🗑️ Tearing down container infrastructure..."

# Pause simulation before shutdown
finch exec screeps curl -s -d "system.pauseSimulation()" 2>/dev/null || true

# Graceful shutdown with volume cleanup
finch compose -f docker-compose.steamkey.yml down -v

# Remove test images (optional)
if [ "$REMOVE_IMAGES" = "true" ]; then
  finch image rm screepers/screeps-launcher:steamkey 2>/dev/null || true
fi

echo "✅ Complete infrastructure teardown completed"
```

---

## Summary

This guide provides proven patterns for:

- **Container Infrastructure**: Clean builds, network setup, volume management
- **FileBot Mod Integration**: Complex code deployment without shell expansion
- **Game Environment Setup**: Rooms, objects, users, and economies
- **State Management**: Simulation control and baseline capture
- **Evidence-Based Validation**: Comprehensive setup verification
- **Complete Lifecycle**: Setup, execution, and cleanup procedures

These patterns eliminate shell parameter expansion issues and provide reliable, reproducible testing environments suitable for any bot complexity level.

## Memory State Validation

### Comprehensive Memory Monitoring

**Validate user memory initialization:**
```bash
echo "🧠 Validating memory state for user: $TEST_USER_ID"

# Get memory data for the test user
MEMORY_DATA=$(finch exec screeps curl -s -d "storage.env.get('memory:$TEST_USER_ID').then(data => JSON.stringify(data, null, 2))")

if [ "$MEMORY_DATA" = "null" ] || [ "$MEMORY_DATA" = '""' ]; then
  echo "❌ User memory not initialized"
  exit 1
else
  echo "✅ User memory initialized"
  echo "Memory size: $(echo "$MEMORY_DATA" | wc -c) bytes"
fi
```

### Multi-User Memory Analysis

**Monitor all users and their memory states:**
```bash
echo "👥 Analyzing all users with memory..."

# Get all users with their memory data
ALL_USERS_MEMORY=$(finch exec screeps curl -s -d "
storage.db['users'].find().then(users => 
  Promise.all(users.map(u => 
    storage.env.get('memory:' + u._id).then(mem => ({
      userId: u._id, 
      username: u.username, 
      memory: mem,
      hasMemory: mem !== null && mem !== ''
    }))
  ))
).then(results => JSON.stringify(results, null, 2))
")

# Parse and analyze results
TOTAL_USERS=$(echo "$ALL_USERS_MEMORY" | jq '. | length')
ACTIVE_USERS=$(echo "$ALL_USERS_MEMORY" | jq '[.[] | select(.hasMemory == true)] | length')

echo "Total users: $TOTAL_USERS"
echo "Users with active memory: $ACTIVE_USERS"

# Show detailed memory stats for active users
echo "$ALL_USERS_MEMORY" | jq -r '.[] | select(.hasMemory == true) | "User: \(.username) (ID: \(.userId)) - Memory: \(.memory | tostring | length) bytes"'
```

### Memory Pattern Validation

**Check for specific memory structures:**
```bash
# Validate expected memory structure
MEMORY_VALIDATION=$(finch exec screeps curl -s -d "
storage.env.get('memory:$TEST_USER_ID').then(memory => {
  if (!memory) return JSON.stringify({valid: false, reason: 'No memory found'});
  
  const parsed = typeof memory === 'string' ? JSON.parse(memory) : memory;
  const validation = {
    valid: true,
    hasCreepCounter: 'creepCounter' in parsed,
    hasCreeps: 'creeps' in parsed && typeof parsed.creeps === 'object',
    creepCount: parsed.creeps ? Object.keys(parsed.creeps).length : 0,
    structure: Object.keys(parsed)
  };
  
  return JSON.stringify(validation);
})
")

MEMORY_VALID=$(echo "$MEMORY_VALIDATION" | jq -r '.valid')
HAS_CREEP_COUNTER=$(echo "$MEMORY_VALIDATION" | jq -r '.hasCreepCounter')
CREEP_COUNT=$(echo "$MEMORY_VALIDATION" | jq -r '.creepCount')

if [ "$MEMORY_VALID" = "true" ] && [ "$HAS_CREEP_COUNTER" = "true" ]; then
  echo "✅ Memory validation passed"
  echo "- Creep counter: present"
  echo "- Creep count: $CREEP_COUNT"
else
  echo "❌ Memory validation failed"
  exit 1
fi
```

## CLI Access Pattern

All setup commands use the standard CLI access pattern:
```bash
finch compose -f docker-compose.yml exec -T screeps curl -s http://localhost:21026/cli -d "COMMAND"
```

The CLI endpoint provides access to:
- `storage.db.*` - Database collections
- `storage.env.*` - Environment variables and memory data
- `system.*` - System controls (pause, reset, etc.)
- `map.*` - Room generation functions
- `filebot.*` - FileBot mod functions (when loaded)

### Memory Access Specifics
- User memory: `storage.env.get('memory:USER_ID')`
- Memory is stored as JSON strings that may need parsing
- Empty/inactive users often have null or empty string memory
- Memory structure follows standard Screeps format: `{creeps: {}, spawns: {}, rooms: {}, ...}`

---

## Memory State Preloading

> **⚠️ Caution**: Memory preloading should be used carefully in functional tests. While useful for testing specific scenarios, it may mask initialization bugs or create unrealistic test conditions. Consider whether testing natural memory initialization is more valuable for your use case.

### Simple Memory Updates

#### Complete Memory Replacement
```bash
# Replace entire memory state for a user
USER_ID="your_test_user_id"
NEW_MEMORY='{"creepCounter": 5, "creeps": {"TestCreep": {"role": "harvester"}}, "testFlag": true}'

finch exec screeps curl -s -d "storage.env.set('memory:$USER_ID', JSON.stringify($NEW_MEMORY)).then(() => 'Memory updated successfully')"
```

#### Clear/Reset Memory
```bash
# Reset user memory to empty state
finch exec screeps curl -s -d "storage.env.set('memory:$USER_ID', '{}').then(() => 'Memory cleared')"
```

#### Merge with Existing Memory
```bash
# Add new fields while preserving existing memory
finch exec screeps curl -s -d "
storage.env.get('memory:$USER_ID').then(data => {
  const current = JSON.parse(data || '{}');
  Object.assign(current, {
    newField: 'newValue',
    testMode: true,
    preloadedAt: Date.now()
  });
  return storage.env.set('memory:$USER_ID', JSON.stringify(current));
}).then(() => 'Memory merged successfully')
"
```

### Complex Memory Manipulation

#### Update Specific Memory Paths
```bash
# Update nested memory structures
finch exec screeps curl -s -d "
storage.env.get('memory:$USER_ID').then(data => {
  const mem = JSON.parse(data || '{}');
  
  // Initialize creeps object if needed
  mem.creeps = mem.creeps || {};
  
  // Add new creep with specific configuration
  mem.creeps.PreloadedWorker = {
    role: 'harvester',
    project: {id: 'HarvestEnergyProject'},
    task: {id: 'HarvestEnergyTask', config: {source: 'source_id_123'}}
  };
  
  // Update global counters
  mem.creepCounter = (mem.creepCounter || 0) + 1;
  
  return storage.env.set('memory:$USER_ID', JSON.stringify(mem));
}).then(() => 'Memory path updated')
"
```

#### Bulk Update Multiple Users
```bash
# Apply memory changes to all users (useful for test cleanup)
finch exec screeps curl -s -d "
storage.db['users'].find().then(users => 
  Promise.all(users.map(u => 
    storage.env.set('memory:' + u._id, JSON.stringify({
      bulk: 'update',
      userId: u._id,
      resetAt: Date.now(),
      testEnvironment: true
    }))
  ))
).then(() => 'Bulk memory update complete')
"
```

### FileBot-Based Complex Memory Preloading

For complex memory states, use FileBot to avoid shell escaping issues:

#### Create Memory Template File
```bash
# Create a memory template file
cat > /tmp/complex-memory.json << 'EOF'
{
  "creepCounter": 10,
  "creeps": {
    "Worker1": {
      "role": "harvester",
      "project": {"id": "HarvestEnergyProject"},
      "task": {"id": "HarvestEnergyTask", "config": {"source": "source_12345"}},
      "memory": {"sourceId": "source_12345", "targetId": "spawn_main"}
    },
    "Worker2": {
      "role": "builder", 
      "project": {"id": "BuildProject"},
      "task": {"id": "BuildTask", "config": {"constructionSiteId": "site_67890"}},
      "memory": {"constructionSiteId": "site_67890"}
    }
  },
  "rooms": {
    "W12N12": {
      "sources": ["source_12345", "source_67890"],
      "spawns": ["spawn_main"],
      "level": 1
    }
  },
  "SourcePlanner": {
    "creeps": {
      "Worker1": {"task": "HarvestEnergyTask", "source": "source_12345"},
      "Worker2": {"task": "HarvestEnergyTask", "source": "source_67890"}
    }
  },
  "testScenario": "advanced_harvesting",
  "preloadedAt": 1639123456789
}
EOF

# Copy to container
finch compose -f docker-compose.functional.yml cp /tmp/complex-memory.json screeps:/screeps/
```

#### FileBot Memory Injection Method
```bash
# Create FileBot method for memory preloading
cat > /tmp/memory-loader.js << 'EOF'
// FileBot extension for memory preloading
filebot.loadMemory = function(filePath, userId) {
  try {
    const fs = require('fs');
    const memoryData = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(memoryData);
    
    return storage.env.set('memory:' + userId, JSON.stringify(parsed))
      .then(() => ({
        success: true,
        userId: userId,
        memorySize: memoryData.length,
        structure: Object.keys(parsed)
      }))
      .catch(err => ({
        success: false,
        error: err.message
      }));
  } catch (err) {
    return Promise.resolve({
      success: false,
      error: err.message
    });
  }
};
EOF

# Copy to container and reload FileBot
finch compose -f docker-compose.functional.yml cp /tmp/memory-loader.js screeps:/screeps/
finch exec screeps bash -c "cat /screeps/memory-loader.js >> /screeps/mods/filebot-mod.js"

# Restart to reload the extended FileBot
finch compose -f docker-compose.functional.yml restart screeps
sleep 20

# Use the FileBot memory loader
RESULT=$(finch exec screeps curl -s -d "filebot.loadMemory('/screeps/complex-memory.json', '$USER_ID')")
echo "Memory preload result: $RESULT"
```

### Memory Preloading Patterns

#### Scenario-Based Preloading
```bash
# Preload memory for specific test scenarios

# Scenario 1: Bot with established economy
ECONOMY_MEMORY='{
  "creepCounter": 15,
  "creeps": {
    "Harvester1": {"role": "harvester", "assigned": "source_1"},
    "Harvester2": {"role": "harvester", "assigned": "source_2"}, 
    "Hauler1": {"role": "hauler", "route": ["source_1", "spawn"]},
    "Upgrader1": {"role": "upgrader", "assigned": "controller"}
  },
  "economy": {"level": 3, "energy": 800, "structures": 12}
}'

# Scenario 2: Bot in crisis (low energy, damaged structures)
CRISIS_MEMORY='{
  "creepCounter": 3,
  "creeps": {
    "LastHarvester": {"role": "harvester", "emergency": true}
  },
  "crisis": {"energy": 50, "damagedStructures": 5, "mode": "emergency"}
}'

# Apply scenario memory
finch exec screeps curl -s -d "storage.env.set('memory:$USER_ID', '$ECONOMY_MEMORY').then(() => 'Economy scenario loaded')"
```

#### Memory Validation After Preloading
```bash
# Verify memory was loaded correctly
VERIFICATION=$(finch exec screeps curl -s -d "
storage.env.get('memory:$USER_ID').then(data => {
  const mem = JSON.parse(data || '{}');
  return JSON.stringify({
    loaded: true,
    creepCount: Object.keys(mem.creeps || {}).length,
    hasCounter: 'creepCounter' in mem,
    scenario: mem.testScenario || 'unknown',
    size: JSON.stringify(mem).length
  });
})
")

echo "Memory verification: $VERIFICATION"
```

### Best Practices for Memory Preloading

1. **Document the Why**: Always comment why specific memory states are being preloaded
2. **Validate After Loading**: Verify the memory was set correctly before proceeding
3. **Use Realistic Data**: Ensure preloaded memory represents realistic game states
4. **Consider Natural Flow**: Test both preloaded and naturally-initialized scenarios
5. **Clean Up**: Reset memory state between tests to avoid pollution
6. **FileBot for Complexity**: Use FileBot pattern for large or complex memory structures

### Cleanup and Reset Patterns

```bash
# Reset all test users to clean state
finch exec screeps curl -s -d "
storage.db['users'].find().then(users => 
  Promise.all(users.filter(u => u.username.includes('Test')).map(u => 
    storage.env.set('memory:' + u._id, '{}')
  ))
).then(() => 'Test user memories cleared')
"

# Verify cleanup
finch exec screeps curl -s -d "
storage.db['users'].find().then(users => 
  Promise.all(users.map(u => 
    storage.env.get('memory:' + u._id).then(mem => ({
      userId: u._id,
      username: u.username,
      memoryEmpty: !mem || mem === '{}' || mem === ''
    }))
  ))
).then(results => JSON.stringify(results.filter(r => !r.memoryEmpty)))
"
```