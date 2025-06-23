#!/usr/bin/env node

const { ScreepsAPI } = require('screeps-api');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

/**
 * Quick status check to see if code is currently running with errors
 * Usage: npm run status [server] [shard]
 * Example: npm run status ptr shard3
 */

const args = process.argv.slice(2);
const server = args[0] || 'ptr';
const shard = args[1] || 'shard3';

async function loadConfig() {
  const configPath = path.join(process.cwd(), '.screeps.yml');
  const yamlContent = fs.readFileSync(configPath, 'utf8');
  const config = yaml.load(yamlContent);
  return config.servers[server];
}

async function quickStatusCheck() {
  console.log(`🔍 Quick status check for ${server}/${shard}...`);
  
  const config = await loadConfig();
  const api = new ScreepsAPI({ ...config });
  
  try {
    const userInfo = await api.me();
    console.log(`✅ Connected as ${userInfo.username}`);
  } catch (error) {
    console.error(`❌ Failed to connect to ${server}:`, error.message);
    process.exit(1);
  }

  const socket = api.socket;
  let errorCount = 0;
  let tickCount = 0;
  let lastTick = null;
  let gameLoopActive = false;
  let recentMessages = [];

  console.log(`⏰ Monitoring for 15 seconds...`);

  return new Promise((resolve) => {
    socket.on('console', (data) => {
      if (data.shard === shard) {
        const logEntry = {
          tick: data.data?.tick,
          messages: data.data?.messages || []
        };
        
        tickCount++;
        
        // Track tick progression
        if (logEntry.tick && logEntry.tick !== lastTick) {
          lastTick = logEntry.tick;
          gameLoopActive = true;
        }
        
        // Store recent messages
        logEntry.messages.forEach(msg => {
          recentMessages.push({ tick: logEntry.tick, message: msg });
          if (recentMessages.length > 50) recentMessages.shift(); // Keep last 50
          
          // Check for errors
          if (msg.includes('Error') || msg.includes('TypeError') || msg.includes('ReferenceError')) {
            errorCount++;
            console.log(`🚨 Error at tick ${logEntry.tick}: ${msg.substring(0, 100)}${msg.length > 100 ? '...' : ''}`);
          }
        });
      }
    });

    socket.on('auth', async (data) => {
      console.log('🔐 Connected to game console');
      const userInfo = await api.me();
      socket.subscribe(`user:${userInfo.username}/console`);
    });

    socket.on('error', (error) => {
      console.error('🔌 Socket error:', error);
      resolve({ success: false, error: error.message });
    });

    socket.connect();
    
    // Quick 15-second check
    setTimeout(() => {
      socket.disconnect();
      
      const status = {
        server,
        shard,
        timestamp: new Date().toISOString(),
        gameLoopActive,
        ticksObserved: tickCount,
        errorsDetected: errorCount,
        lastTick,
        recentActivity: recentMessages.slice(-10) // Last 10 messages
      };
      
      console.log('\n📊 Status Summary:');
      console.log(`🎮 Game loop: ${gameLoopActive ? '✅ Active' : '❌ Inactive'}`);
      console.log(`📈 Ticks observed: ${tickCount}`);
      console.log(`🚨 Errors detected: ${errorCount}`);
      
      if (lastTick) {
        console.log(`⏰ Last tick: ${lastTick}`);
      }
      
      // Determine overall status
      let overallStatus;
      if (!gameLoopActive && tickCount === 0) {
        overallStatus = 'NO_ACTIVITY';
        console.log('\n🔴 Status: NO ACTIVITY - Code not running or no output');
      } else if (!gameLoopActive) {
        overallStatus = 'STALLED';
        console.log('\n🟡 Status: STALLED - Receiving logs but no tick progression');
      } else if (errorCount > 0) {
        overallStatus = 'ERRORS_ACTIVE';
        console.log('\n🟠 Status: ERRORS ACTIVE - Code running but with errors');
      } else {
        overallStatus = 'HEALTHY';
        console.log('\n🟢 Status: HEALTHY - Code running without errors');
      }
      
      status.overallStatus = overallStatus;
      
      // Show recent activity sample
      if (recentMessages.length > 0) {
        console.log('\n📝 Recent Activity Sample:');
        recentMessages.slice(-3).forEach(entry => {
          const preview = entry.message.substring(0, 80);
          console.log(`   Tick ${entry.tick}: ${preview}${entry.message.length > 80 ? '...' : ''}`);
        });
      }
      
      resolve(status);
    }, 15000);
  });
}

// Main execution
if (require.main === module) {
  quickStatusCheck()
    .then((status) => {
      const exitCode = ['HEALTHY', 'STALLED'].includes(status.overallStatus) ? 0 : 1;
      process.exit(exitCode);
    })
    .catch((error) => {
      console.error('Status check failed:', error.message);
      process.exit(1);
    });
}

module.exports = { quickStatusCheck };