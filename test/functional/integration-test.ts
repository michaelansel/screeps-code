/**
 * Integration Test Module
 *
 * This module can be deployed alongside main.js to the Screeps server
 * to validate that both main code and test code execute in the game engine.
 *
 * This file is separate from the main game logic to keep concerns separated.
 */

interface IntegrationTestMemory {
  mainCodeExecutions: number;
  testCodeExecutions: number;
  mainCodeVersion: string;
  testCodeVersion: string;
  firstMainExecution: number;
  firstTestExecution: number;
  lastMainExecution: number;
  lastTestExecution: number;
}

declare global {
  interface Memory {
    integrationTest?: IntegrationTestMemory;
  }
}

/**
 * This function validates that the main game code is executing
 * by checking for evidence in Memory and Game state
 */
export function validateMainCodeExecution(): boolean {
  // Check if main loop has run by looking for its effects
  const hasCreepCounter = typeof Memory.creepCounter === "number";
  const hasGameTime = typeof Game.time === "number" && Game.time >= 0;

  // Update tracking
  if (!Memory.integrationTest) {
    Memory.integrationTest = {
      mainCodeExecutions: 0,
      testCodeExecutions: 0,
      mainCodeVersion: "unknown",
      testCodeVersion: "v1.0.0",
      firstMainExecution: Game.time,
      firstTestExecution: Game.time,
      lastMainExecution: Game.time,
      lastTestExecution: Game.time
    };
  }

  if (hasCreepCounter) {
    Memory.integrationTest.mainCodeExecutions++;
    Memory.integrationTest.lastMainExecution = Game.time;
    Memory.integrationTest.mainCodeVersion = "detected-via-memory";
  }

  return hasCreepCounter && hasGameTime;
}

/**
 * This function proves that the test code itself is executing
 * in the game engine by manipulating Memory directly
 */
export function validateTestCodeExecution(): boolean {
  if (!Memory.integrationTest) {
    Memory.integrationTest = {
      mainCodeExecutions: 0,
      testCodeExecutions: 1,
      mainCodeVersion: "unknown",
      testCodeVersion: "v1.0.0",
      firstMainExecution: Game.time,
      firstTestExecution: Game.time,
      lastMainExecution: Game.time,
      lastTestExecution: Game.time
    };
  } else {
    Memory.integrationTest.testCodeExecutions++;
    Memory.integrationTest.lastTestExecution = Game.time;
  }

  // Log execution proof
  console.log(
    `🧪 INTEGRATION_TEST: Test code execution #${Memory.integrationTest.testCodeExecutions} at tick ${Game.time}`
  );

  // This will only return true if we're actually in the game engine
  return typeof Game === "object" && typeof Memory === "object" && typeof Game.time === "number";
}

/**
 * Run complete integration validation
 */
export function runIntegrationTest(): IntegrationTestMemory {
  const mainCodeRunning = validateMainCodeExecution();
  const testCodeRunning = validateTestCodeExecution();

  console.log(`🧪 INTEGRATION_TEST: Main code running: ${mainCodeRunning}, Test code running: ${testCodeRunning}`);

  return Memory.integrationTest!;
}

/**
 * Get current integration test status
 */
export function getIntegrationTestStatus(): IntegrationTestMemory | null {
  return Memory.integrationTest || null;
}
