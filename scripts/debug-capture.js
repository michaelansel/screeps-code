#!/usr/bin/env node

const { ScreepsAPI } = require('screeps-api');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

/**
 * Debug capture tool for Screeps console logs
 * Usage: npm run debug:capture [server] [duration] [shard]
 * Example: npm run debug:capture ptr 30 shard3
 */

const args = process.argv.slice(2);
const server = args[0] || 'ptr';
const duration = parseInt(args[1]) || 30; // seconds
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
        console.log(`📁 Loading config from: ${configPath}`);
        
        if (configPath.endsWith('.yml') || configPath.endsWith('.yaml')) {
          const yamlContent = fs.readFileSync(configPath, 'utf8');
          const config = yaml.load(yamlContent);
          
          // Transform YAML format to screeps-api format
          if (config.servers && config.servers[server]) {
            const serverConfig = config.servers[server];
            return {
              email: serverConfig.username, // if using username/password
              password: serverConfig.password,
              token: serverConfig.token, // if using token
              server: server,
              ...serverConfig
            };
          }
        } else {
          // JSON format
          const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
          return config;
        }
      }
    } catch (error) {
      console.log(`⚠️  Could not load ${configPath}: ${error.message}`);
      continue;
    }
  }
  
  console.error('❌ Failed to load screeps config');
  console.error('Tried the following paths:');
  CONFIG_PATHS.forEach(p => console.error(`   ${p}`));
  console.error('Make sure you have configured screeps-api with: npx screeps-api config');
  process.exit(1);
}

async function captureConsole() {
  console.log(`🔧 Starting debug capture for ${server}/${shard} for ${duration} seconds...`);
  
  const config = await loadConfig();
  
  // Initialize API with server configuration - token auth is automatic
  const api = new ScreepsAPI({
    ...config
  });
  
  // Test connection and get user info
  try {
    console.log(`🔐 Testing connection to ${server}...`);
    const userInfo = await api.me();
    console.log(`✅ Connected as ${userInfo.username} (GCL: ${userInfo.gcl})`);
  } catch (error) {
    console.error(`❌ Failed to connect to ${server}:`, error.message);
    console.error('Config used:', JSON.stringify({
      host: config.host,
      secure: config.secure,
      ptr: config.ptr,
      hasToken: !!config.token
    }, null, 2));
    process.exit(1);
  }

  // Create output directory
  const outputDir = path.join(__dirname, '..', 'debug-logs');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputFile = path.join(outputDir, `${server}-${shard}-${timestamp}.log`);
  
  const logs = [];
  let errorCount = 0;
  let tickCount = 0;
  
  console.log(`📝 Capturing logs to: ${outputFile}`);
  console.log(`⏰ Will capture for ${duration} seconds...`);

  // Subscribe to console logs
  const socket = api.socket;
  
  socket.on('console', (data) => {
    if (data.shard === shard) {
      const logEntry = {
        timestamp: new Date().toISOString(),
        tick: data.data?.tick,
        messages: data.data?.messages || []
      };
      
      logs.push(logEntry);
      tickCount++;
      
      // Count errors
      const errorMessages = data.data?.messages?.filter(msg => 
        msg.includes('Error') || msg.includes('TypeError') || msg.includes('ReferenceError')
      ) || [];
      
      if (errorMessages.length > 0) {
        errorCount += errorMessages.length;
        console.log(`🚨 Captured ${errorMessages.length} error(s) at tick ${data.data?.tick}`);
        errorMessages.forEach(msg => console.log(`   ${msg}`));
      }
      
      // Show progress every 10 ticks
      if (tickCount % 10 === 0) {
        console.log(`📊 Progress: ${tickCount} ticks, ${errorCount} errors captured`);
      }
    }
  });

  socket.on('auth', async (data) => {
    console.log('🔐 Socket authenticated');
    // Subscribe to console for the specific shard
    const userInfo = await api.me();
    socket.subscribe(`user:${userInfo.username}/console`, () => {
      console.log(`👂 Subscribed to console logs for ${shard}`);
    });
  });

  socket.on('error', (error) => {
    console.error('🔌 Socket error:', error);
  });

  socket.on('disconnect', () => {
    console.log('🔌 Socket disconnected');
  });

  // Connect socket
  await new Promise((resolve, reject) => {
    socket.connect();
    socket.on('auth', resolve);
    socket.on('error', reject);
  });

  // Capture for the specified duration
  await new Promise(resolve => setTimeout(resolve, duration * 1000));

  // Disconnect and save results
  socket.disconnect();
  
  const summary = {
    server,
    shard,
    captureStart: new Date(Date.now() - duration * 1000).toISOString(),
    captureEnd: new Date().toISOString(),
    duration: duration,
    ticksCaptured: tickCount,
    errorsFound: errorCount,
    logs: logs
  };

  fs.writeFileSync(outputFile, JSON.stringify(summary, null, 2));
  
  console.log('\n📋 Capture Complete!');
  console.log(`📊 Summary:`);
  console.log(`   Ticks captured: ${tickCount}`);
  console.log(`   Errors found: ${errorCount}`);
  console.log(`   Output file: ${outputFile}`);
  
  if (errorCount > 0) {
    console.log('\n🚨 Errors detected! Here are the most recent:');
    const recentErrors = logs
      .flatMap(log => log.messages || [])
      .filter(msg => msg.includes('Error') || msg.includes('TypeError') || msg.includes('ReferenceError'))
      .slice(-5);
    
    recentErrors.forEach(error => console.log(`   ${error}`));
  }

  return outputFile;
}

async function analyzeCapture(logFile) {
  console.log(`\n🔍 Analyzing capture: ${logFile}`);
  
  const data = JSON.parse(fs.readFileSync(logFile, 'utf8'));
  
  // Extract all errors with context
  const errors = [];
  
  data.logs.forEach((logEntry, index) => {
    const errorMessages = logEntry.messages?.filter(msg => 
      msg.includes('Error') || msg.includes('TypeError') || msg.includes('ReferenceError')
    ) || [];
    
    if (errorMessages.length > 0) {
      // Get context from previous and next log entries
      const contextBefore = data.logs.slice(Math.max(0, index - 2), index);
      const contextAfter = data.logs.slice(index + 1, Math.min(data.logs.length, index + 3));
      
      errors.push({
        tick: logEntry.tick,
        timestamp: logEntry.timestamp,
        errors: errorMessages,
        contextBefore: contextBefore.flatMap(l => l.messages || []),
        contextAfter: contextAfter.flatMap(l => l.messages || [])
      });
    }
  });

  if (errors.length > 0) {
    console.log(`\n🐛 Found ${errors.length} error occurrence(s):`);
    
    errors.forEach((error, i) => {
      console.log(`\n--- Error ${i + 1} (Tick ${error.tick}) ---`);
      console.log('Context before:');
      error.contextBefore.slice(-3).forEach(msg => console.log(`  ${msg}`));
      console.log('ERROR:');
      error.errors.forEach(msg => console.log(`  🚨 ${msg}`));
      console.log('Context after:');
      error.contextAfter.slice(0, 3).forEach(msg => console.log(`  ${msg}`));
    });

    // Save detailed analysis
    const analysisFile = logFile.replace('.log', '-analysis.json');
    fs.writeFileSync(analysisFile, JSON.stringify({ 
      summary: data,
      errorAnalysis: errors 
    }, null, 2));
    
    console.log(`\n📊 Detailed analysis saved to: ${analysisFile}`);
    return analysisFile;
  } else {
    console.log('\n✅ No errors found in the capture!');
    return null;
  }
}

// Main execution
if (require.main === module) {
  captureConsole()
    .then(analyzeCapture)
    .then(() => {
      console.log('\n🎉 Debug capture complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Capture failed:', error.message);
      process.exit(1);
    });
}

module.exports = { captureConsole, analyzeCapture };