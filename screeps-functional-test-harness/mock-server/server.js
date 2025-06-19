/**
 * Mock Screeps server for testing the functional test harness
 * Simulates the essential Screeps server APIs
 */

const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(bodyParser.text({ type: '*/*' }));
app.use(bodyParser.json());

// Mock game state
let gameState = {
  gameTime: 1,
  paused: false,
  lastCpu: 0,
  users: new Map(),
  memory: new Map(),
  rooms: new Map(),
  objects: new Map()
};

// FileBot simulation
const filebot = {
  inject: function(filename, userId, options) {
    try {
      console.log(`FileBot: Injecting code for user ${userId} from ${filename}`);
      
      if (!fs.existsSync(filename)) {
        return { success: false, error: 'File not found' };
      }
      
      const code = fs.readFileSync(filename, 'utf8');
      
      // Create user
      gameState.users.set(userId, {
        _id: userId,
        username: options.username || 'TestBot',
        cpu: options.cpu || 100,
        cpuAvailable: options.cpuAvailable || 10000,
        code: code,
        lastUsedCpu: Math.floor(Math.random() * 20) + 5
      });
      
      // Initialize memory
      if (options.memory) {
        gameState.memory.set(userId, options.memory);
      } else {
        gameState.memory.set(userId, {
          initialized: false
        });
      }
      
      // Create room and spawn if specified
      if (options.room) {
        if (!gameState.rooms.has(options.room)) {
          gameState.rooms.set(options.room, {
            _id: options.room,
            status: 'normal',
            active: true
          });
        }
        
        // Add spawn
        const spawnId = `spawn_${userId}_${Date.now()}`;
        gameState.objects.set(spawnId, {
          _id: spawnId,
          user: userId,
          type: 'spawn',
          room: options.room,
          name: 'Spawn1',
          energy: 300,
          energyCapacity: 300,
          store: { energy: 300 },
          off: false
        });
        
        // Add some sources
        for (let i = 0; i < 2; i++) {
          const sourceId = `source_${options.room}_${i}`;
          gameState.objects.set(sourceId, {
            _id: sourceId,
            type: 'source',
            room: options.room,
            energy: 3000,
            energyCapacity: 3000
          });
        }
      }
      
      console.log(`FileBot: Successfully injected ${code.length} bytes for user ${userId}`);
      return {
        success: true,
        userId: userId,
        codeSize: code.length,
        room: options.room || 'sim'
      };
    } catch (error) {
      console.error('FileBot injection error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  help: function() {
    return {
      commands: {
        'filebot.inject(filename, userId, options)': 'Inject bot code from file'
      }
    };
  }
};

// Make filebot global for CLI access
global.filebot = filebot;

// Simulate game progression
setInterval(() => {
  if (!gameState.paused) {
    gameState.gameTime++;
    
    // Simulate bot execution by updating memory
    for (const [userId, user] of gameState.users) {
      const memory = gameState.memory.get(userId) || {};
      
      // Simulate memory initialization
      if (!memory.initialized) {
        memory.initialized = true;
        memory.tick = gameState.gameTime;
        memory.creepCounter = 0;
        memory.projects = [];
        memory.testHarness = {
          started: gameState.gameTime,
          version: '1.0.0'
        };
        console.log(`Mock: Initialized memory for user ${userId} at tick ${gameState.gameTime}`);
      }
      
      // Update current tick
      memory.currentTick = gameState.gameTime;
      
      // Simulate some activity
      if (gameState.gameTime % 50 === 0) {
        memory.creepCounter = (memory.creepCounter || 0) + 1;
        console.log(`Mock: User ${userId} spawned creep ${memory.creepCounter} at tick ${gameState.gameTime}`);
      }
      
      gameState.memory.set(userId, memory);
      
      // Update CPU usage
      user.lastUsedCpu = Math.floor(Math.random() * 20) + 5;
    }
  }
}, 100); // 10 ticks per second

// CLI endpoint
app.post('/cli', (req, res) => {
  const command = req.body;
  console.log(`CLI Command: ${command}`);
  
  try {
    let result;
    
    // Handle specific commands
    if (command.includes('storage.env.get(\'gameTime\')')) {
      result = JSON.stringify(gameState.gameTime);
    } else if (command.includes('storage.env.get(\'paused\')')) {
      result = JSON.stringify(gameState.paused);
    } else if (command.includes('storage.env.get(\'lastCpu\')')) {
      result = JSON.stringify(gameState.lastCpu);
    } else if (command.includes('system.pauseSimulation()')) {
      gameState.paused = true;
      result = 'OK';
    } else if (command.includes('system.resumeSimulation()')) {
      gameState.paused = false;
      result = 'OK';
    } else if (command.includes('system.resetAllData()')) {
      gameState.users.clear();
      gameState.memory.clear();
      gameState.rooms.clear();
      gameState.objects.clear();
      gameState.gameTime = 1;
      result = 'OK';
    } else if (command.includes('storage.env.get(\'memory:')) {
      const userIdMatch = command.match(/memory:([^']+)/);
      if (userIdMatch) {
        const userId = userIdMatch[1];
        const memory = gameState.memory.get(userId);
        result = memory ? JSON.stringify(memory) : 'null';
      } else {
        result = 'null';
      }
    } else if (command.includes('storage.env.set(\'memory:')) {
      const userIdMatch = command.match(/memory:([^']+)/);
      const valueMatch = command.match(/set\([^,]+,\s*'(.+)'\)/);
      if (userIdMatch && valueMatch) {
        const userId = userIdMatch[1];
        const value = JSON.parse(valueMatch[1]);
        gameState.memory.set(userId, value);
        result = JSON.stringify({ success: true });
      } else {
        result = JSON.stringify({ success: false, error: 'Invalid set command' });
      }
    } else if (command.includes('storage.db.users.findOne')) {
      const userIdMatch = command.match(/_id:\s*'([^']+)'/);
      if (userIdMatch) {
        const userId = userIdMatch[1];
        const user = gameState.users.get(userId);
        result = user ? JSON.stringify(user) : 'null';
      } else {
        result = 'null';
      }
    } else if (command.includes('storage.db[\'rooms.objects\'].find')) {
      const userIdMatch = command.match(/user:\s*'([^']+)'/);
      if (userIdMatch) {
        const userId = userIdMatch[1];
        const userObjects = Array.from(gameState.objects.values()).filter(obj => obj.user === userId);
        result = JSON.stringify(userObjects);
      } else {
        const allObjects = Array.from(gameState.objects.values());
        result = JSON.stringify(allObjects);
      }
    } else if (command.includes('storage.db[\'rooms.objects\'].findOne')) {
      const userIdMatch = command.match(/user:\s*'([^']+)'/);
      const typeMatch = command.match(/type:\s*'([^']+)'/);
      if (userIdMatch && typeMatch) {
        const userId = userIdMatch[1];
        const type = typeMatch[1];
        const obj = Array.from(gameState.objects.values()).find(o => o.user === userId && o.type === type);
        result = obj ? JSON.stringify({ off: obj.off || false }) : 'null';
      } else {
        result = 'null';
      }
    } else if (command.includes('storage.db[\'users.console\'].find')) {
      const userIdMatch = command.match(/user:\s*'([^']+)'/);
      if (userIdMatch) {
        const userId = userIdMatch[1];
        // Return some mock console logs
        const logs = [
          `Test bot initialized at tick ${gameState.gameTime - 10}`,
          `Test bot running: tick ${gameState.gameTime - 5}`,
          `Test bot running: tick ${gameState.gameTime}`
        ];
        result = JSON.stringify(logs);
      } else {
        result = JSON.stringify([]);
      }
    } else if (command.includes('map.generateRoom')) {
      const roomMatch = command.match(/generateRoom\('([^']+)'\)/);
      if (roomMatch) {
        const roomName = roomMatch[1];
        gameState.rooms.set(roomName, {
          _id: roomName,
          status: 'normal',
          active: true
        });
      }
      result = 'OK';
    } else if (command.includes('map.openRoom')) {
      result = 'OK';
    } else if (command.includes('filebot.inject')) {
      // Parse filebot.inject command
      const match = command.match(/filebot\.inject\('([^']+)',\s*'([^']+)',\s*({[^}]+})\)/);
      if (match) {
        const [, filename, userId, optionsStr] = match;
        const options = eval(`(${optionsStr})`); // Safe in this mock context
        const injectResult = filebot.inject(filename, userId, options);
        result = JSON.stringify(injectResult);
      } else {
        result = JSON.stringify({ success: false, error: 'Invalid inject command' });
      }
    } else if (command.includes('filebot.help')) {
      result = JSON.stringify(filebot.help());
    } else if (command.includes('typeof filebot')) {
      result = '"object"';
    } else {
      // Try to evaluate as JavaScript
      result = eval(command);
      if (typeof result !== 'string') {
        result = JSON.stringify(result);
      }
    }
    
    res.send(result || 'OK');
  } catch (error) {
    console.error('CLI Error:', error);
    res.status(500).send(`Error: ${error.message}`);
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    gameTime: gameState.gameTime,
    users: gameState.users.size,
    paused: gameState.paused
  });
});

// Start server
const PORT = 21026;
app.listen(PORT, () => {
  console.log(`Mock Screeps server running on port ${PORT}`);
  console.log(`Game time: ${gameState.gameTime}, Paused: ${gameState.paused}`);
  console.log('CLI endpoint: POST /cli');
  console.log('Health endpoint: GET /health');
});