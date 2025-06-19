/**
 * Basic usage example for Screeps Functional Test Harness
 */

import { ScreepsFunctionalTestHarness } from '../src';

async function basicExample() {
  console.log('🧪 Starting basic example...');
  
  const harness = new ScreepsFunctionalTestHarness({
    timeout: 120000 // 2 minutes
  });

  try {
    // Step 1: Setup environment
    console.log('📦 Setting up test environment...');
    await harness.setup();
    console.log('✅ Environment ready');

    // Step 2: Deploy bot code
    console.log('🚀 Deploying bot...');
    const deployment = await harness.deployBot('./examples/sample-bot.js', {
      username: 'ExampleBot',
      room: 'W10N10'
    });

    if (!deployment.success) {
      console.error('❌ Deployment failed:', deployment.error);
      return;
    }

    console.log(`✅ Bot deployed successfully: ${deployment.userId}`);

    // Step 3: Monitor execution
    console.log('⏱️  Monitoring execution...');
    const execution = await harness.monitorExecution(deployment.userId, {
      duration: 60, // 1 minute
      expectations: { minTicks: 10 }
    });

    console.log(`📊 Execution results:
      - Ticks advanced: ${execution.ticksAdvanced}
      - CPU used: ${execution.cpuUsed}
      - Spawn active: ${execution.spawnActive}
      - Memory initialized: ${execution.memoryInitialized}
      - Console output: ${execution.consoleOutput.length} messages`);

    // Step 4: Check memory state
    console.log('🧠 Checking memory...');
    const memory = await harness.getMemoryState(deployment.userId);
    
    if (memory) {
      console.log('📝 Memory contents:', JSON.stringify(memory, null, 2));
      
      // Check specific patterns
      const patterns = await harness.checkMemoryPatterns(deployment.userId, {
        'initialized': true,
        'creepCounter': null, // Check existence
        'projects': null
      });
      
      console.log('🔍 Memory pattern validation:', patterns);
    } else {
      console.log('ℹ️  No memory data found');
    }

    // Step 5: Get game objects
    console.log('🎮 Checking game objects...');
    const gameObjects = await harness.getGameObjects(deployment.userId);
    console.log(`🏗️  Game objects:
      - Spawns: ${gameObjects.spawns.length}
      - Creeps: ${gameObjects.creeps.length}
      - Sources: ${gameObjects.sources.length}
      - Total: ${gameObjects.total}`);

    // Step 6: Memory manipulation example
    console.log('✏️  Testing memory manipulation...');
    await harness.mergeMemory(deployment.userId, {
      exampleComplete: true,
      timestamp: Date.now()
    });

    const updatedMemory = await harness.getMemoryState(deployment.userId);
    console.log('📝 Updated memory:', updatedMemory?.exampleComplete ? 'Success' : 'Failed');

    console.log('🎉 Basic example completed successfully!');

  } catch (error) {
    console.error('❌ Error during example:', error);
  } finally {
    // Always cleanup
    console.log('🧹 Cleaning up...');
    await harness.cleanup();
    console.log('✅ Cleanup complete');
  }
}

// Run the example
if (require.main === module) {
  basicExample().catch(console.error);
}