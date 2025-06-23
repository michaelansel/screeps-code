#!/usr/bin/env node

const { ScreepsAPI } = require('screeps-api');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

/**
 * Smoke test to verify deployed code is running without errors
 * Usage: npm run smoke-test [server] [duration] [shard]
 * Example: npm run smoke-test ptr 60 shard3
 */

const args = process.argv.slice(2);
const server = args[0] || 'ptr';
const duration = parseInt(args[1]) || 60; // seconds
const shard = args[2] || 'shard3';

const CONFIG_PATHS = [
  path.join(process.cwd(), '.screeps.yml'),
  path.join(require('os').homedir(), '.screeps.yml'),
  path.join(require('os').homedir(), '.screeps.json') // fallback
];

async function loadConfig() {
  for (const configPath of CONFIG_PATHS) {
    try {
      if (fs.existsSync(configPath)) {
        if (configPath.endsWith('.yml') || configPath.endsWith('.yaml')) {
          const yamlContent = fs.readFileSync(configPath, 'utf8');
          const config = yaml.load(yamlContent);
          
          if (config.servers && config.servers[server]) {
            return config.servers[server];
          }
        } else {
          const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
          return config;
        }
      }
    } catch (error) {
      continue;
    }
  }
  
  console.error('❌ Failed to load screeps config');
  process.exit(1);
}

async function runSmokeTest() {
  console.log(`🔬 Running smoke test on ${server}/${shard} for ${duration} seconds...`);
  
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
  const startTime = Date.now();
  
  let errorCount = 0;
  let tickCount = 0;
  let lastTick = null;
  let codeActivelyRunning = false;
  let firstLogSeen = false;
  
  const errors = [];
  const healthChecks = {
    gameLoopRunning: false,
    spawningSystem: false,
    creepManagement: false,
    noRecentErrors: true
  };

  console.log(`⏰ Monitoring for ${duration} seconds...`);

  return new Promise((resolve, reject) => {
    socket.on('console', (data) => {
      if (data.shard === shard) {
        firstLogSeen = true;
        const logEntry = {
          timestamp: new Date().toISOString(),
          tick: data.data?.tick,
          messages: data.data?.messages || []
        };
        
        tickCount++;
        
        // Check if we're getting new ticks (code is actively running)
        if (logEntry.tick && logEntry.tick !== lastTick) {
          lastTick = logEntry.tick;
          codeActivelyRunning = true;
        }
        
        // Analyze messages for health indicators
        logEntry.messages.forEach(msg => {
          // Look for game loop indicators
          if (msg.includes('TICK') && msg.includes('START')) {
            healthChecks.gameLoopRunning = true;
          }
          
          // Look for spawning system activity
          if (msg.includes('SPAWNING OPERATIONS') || msg.includes('Spawning') || msg.includes('spawn')) {
            healthChecks.spawningSystem = true;
          }
          
          // Look for creep management
          if (msg.includes('Creeps:') || msg.includes('🤖') || msg.includes('Projects:')) {
            healthChecks.creepManagement = true;
          }
          
          // Check for errors
          if (msg.includes('Error') || msg.includes('TypeError') || msg.includes('ReferenceError')) {
            errorCount++;
            healthChecks.noRecentErrors = false;
            errors.push({
              tick: logEntry.tick,
              timestamp: logEntry.timestamp,
              message: msg
            });
            console.log(`🚨 Error detected at tick ${logEntry.tick}: ${msg}`);
          }
        });
        
        // Show progress every 10 ticks
        if (tickCount % 10 === 0) {
          const elapsed = Math.floor((Date.now() - startTime) / 1000);
          console.log(`📊 Progress: ${elapsed}s elapsed, ${tickCount} ticks, ${errorCount} errors`);
        }
      }
    });

    socket.on('auth', async (data) => {
      console.log('🔐 Socket authenticated');
      const userInfo = await api.me();
      socket.subscribe(`user:${userInfo.username}/console`, () => {
        console.log(`👂 Subscribed to console logs for ${shard}`);
      });
    });

    socket.on('error', (error) => {
      console.error('🔌 Socket error:', error);
      reject(error);
    });

    socket.connect();
    
    // Run smoke test for specified duration
    setTimeout(() => {
      socket.disconnect();
      
      const elapsedTime = (Date.now() - startTime) / 1000;
      
      console.log('\n🔬 Smoke Test Results:');
      console.log(`⏰ Duration: ${elapsedTime.toFixed(1)}s`);
      console.log(`📊 Ticks monitored: ${tickCount}`);
      console.log(`🚨 Errors detected: ${errorCount}`);
      
      // Analyze results
      const results = {
        success: true,
        summary: {
          duration: elapsedTime,
          ticksMonitored: tickCount,
          errorsDetected: errorCount,
          codeActivelyRunning,
          firstLogSeen
        },
        healthChecks,
        errors: errors.slice(-5), // Last 5 errors
        recommendations: []
      };
      
      // Determine if smoke test passes
      if (!firstLogSeen) {
        console.log(`❌ FAIL: No console output detected`);
        results.success = false;
        results.recommendations.push('Check if code is uploaded and running');
      } else if (!codeActivelyRunning) {
        console.log(`❌ FAIL: Code does not appear to be actively running (no tick progression)`);
        results.success = false;
        results.recommendations.push('Check for fatal errors preventing game loop execution');
      } else if (errorCount > 0) {
        console.log(`❌ FAIL: ${errorCount} error(s) detected in running code`);
        results.success = false;
        results.recommendations.push('Fix detected errors before considering deployment successful');
      } else if (tickCount < Math.max(5, duration / 6)) {
        console.log(`⚠️  WARN: Low tick count (${tickCount}) - code may be running slowly`);
        results.recommendations.push('Monitor performance - code may have efficiency issues');
      } else {
        console.log(`✅ PASS: Code running without errors`);
      }
      
      // Health check summary
      console.log('\n🏥 Health Checks:');
      Object.entries(healthChecks).forEach(([check, passed]) => {
        const status = passed ? '✅' : '❌';
        const description = {
          gameLoopRunning: 'Game loop executing',
          spawningSystem: 'Spawning system active', 
          creepManagement: 'Creep management working',
          noRecentErrors: 'No recent errors'
        }[check];
        console.log(`${status} ${description}`);
      });
      
      if (results.recommendations.length > 0) {
        console.log('\n💡 Recommendations:');
        results.recommendations.forEach(rec => console.log(`   • ${rec}`));
      }
      
      if (errorCount > 0) {
        console.log('\n🚨 Recent Errors:');
        errors.slice(-3).forEach(error => {
          console.log(`   Tick ${error.tick}: ${error.message}`);
        });
      }
      
      // Save results
      const outputDir = path.join(__dirname, '..', 'debug-logs');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const outputFile = path.join(outputDir, `smoke-test-${server}-${shard}-${timestamp}.json`);
      fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
      
      console.log(`\n📄 Full results saved to: ${outputFile}`);
      
      // Exit with appropriate code
      if (results.success) {
        console.log('\n🎉 Smoke test PASSED! Deployment appears successful.');
        resolve(results);
      } else {
        console.log('\n💥 Smoke test FAILED! Deployment has issues.');
        reject(new Error('Smoke test failed'));
      }
    }, duration * 1000);
  });
}

// Main execution
if (require.main === module) {
  runSmokeTest()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { runSmokeTest };