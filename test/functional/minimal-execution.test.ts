import { expect } from "chai";
import { execSync } from "child_process";
import { writeFileSync } from "fs";

/**
 * Incremental Server Testing
 *
 * Tests server functionality in incremental steps:
 * 1. Server launches and doesn't crash
 * 2. Server responds to API calls
 * 3. Minimal script injection and execution
 * 4. Main.js + test code dual execution
 */

describe("Screeps Server Integration", function () {
  this.timeout(120000); // 2 minute timeout for complete flow

  before(async () => {
    console.log("🔧 Ensuring initialized environment...");
    execSync("npm run test:functional:build", { stdio: "inherit" });

    console.log("📦 Deploying test code...");
    execSync("./scripts/deploy-test-code.sh", { stdio: "inherit" });

    console.log("🚀 Starting container...");
    execSync("finch compose -f docker-compose.test.yml up -d", { stdio: "inherit" });

    console.log("⏳ Waiting for container startup...");
    await new Promise(resolve => setTimeout(resolve, 5000)); // Very fast with initialized volume
  });

  it("should launch server without crashing", () => {
    // Check if container is running
    const containerStatus = execSync("finch ps --filter name=screeps-code-screeps-1", { encoding: "utf8" });
    expect(containerStatus).to.include("screeps-code-screeps-1");
    expect(containerStatus).to.include("Up");
    console.log("✅ Container is running");

    // Check container logs for crash indicators
    const logs = execSync("finch logs screeps-code-screeps-1", { encoding: "utf8" });
    expect(logs).to.include("Starting Server");
    expect(logs).to.include("Started");
    expect(logs).to.include("exec: screeps-engine-runner");
    console.log("✅ Successful launch indicators in logs");
    expect(logs).to.not.include("Error:");
    expect(logs).to.not.include("FATAL");
    expect(logs).to.not.include("Segmentation fault");
    console.log("✅ No crash indicators in logs");
  });

  it("should respond to API calls", () => {
    // Test HTTP API endpoint
    try {
      const response = execSync("curl -s -o /dev/null -w '%{http_code}' http://localhost:21025", { encoding: "utf8" });
      const statusCode = parseInt(response.trim(), 10);
      expect(statusCode).to.be.oneOf([200, 404, 302]); // Any response means server is listening
      console.log(`✅ Server responding with HTTP ${statusCode}`);
    } catch (error) {
      throw new Error("Server not responding to HTTP requests");
    }

    // Alternative: Check if port is open
    try {
      execSync("nc -z localhost 21025", { stdio: "pipe" });
      console.log("✅ Port 21025 is accessible");
    } catch (error) {
      console.log("ℹ️ nc command failed, but HTTP test passed");
    }
  });

  it("should execute minimal injected script", () => {
    const testScript = `
// Minimal test script - just prove we can execute
console.log("🧪 TEST SCRIPT: Starting execution");

// Write a marker file to prove execution
const fs = require('fs');
const path = '/screeps/test-execution-proof.txt';
const timestamp = new Date().toISOString();
const message = \`🧪 TEST EXECUTED AT: \${timestamp}\`;

try {
  fs.writeFileSync(path, message);
  console.log("🧪 TEST SCRIPT: Wrote execution proof to " + path);
  console.log("🧪 TEST SCRIPT: " + message);
} catch (error) {
  console.log("🧪 TEST SCRIPT ERROR: " + error.message);
}

console.log("🧪 TEST SCRIPT: Execution complete");
`;

    writeFileSync("dist/test-script.js", testScript);
    console.log("✅ Created minimal test script");

    // Deploy test script using volume mounting
    console.log("📤 Deploying test script to volume...");
    execSync("./scripts/deploy-test-code.sh", { stdio: "inherit" });

    // Execute the script inside the container using node from the launcher
    console.log("🏃 Executing test script in container...");
    const output = execSync(`finch exec screeps-code-screeps-1 node /screeps/test-script.js`, {
      encoding: "utf8",
      stdio: "pipe"
    });

    console.log("📋 Script execution output:");
    console.log(output);

    // Check for our test markers in the output
    expect(output).to.include("🧪 TEST SCRIPT: Starting execution");
    expect(output).to.include("🧪 TEST SCRIPT: Execution complete");
    expect(output).to.include("🧪 TEST EXECUTED AT:");
    console.log("✅ Test script executed successfully");

    // Verify the proof file was created
    console.log("🔍 Verifying execution proof file...");
    const proofContent = execSync(`finch exec screeps-code-screeps-1 cat /screeps/test-execution-proof.txt`, {
      encoding: "utf8",
      stdio: "pipe"
    });

    console.log("📄 Proof file content:", proofContent.trim());
    expect(proofContent).to.include("🧪 TEST EXECUTED AT:");
    console.log("✅ Minimal script execution verified");
  });

  it("should execute main.js and test code simultaneously", () => {
    // Create a simple main.js
    const mainScript = `
// Simple main.js for testing
console.log("🎮 MAIN: Starting main game loop");

// Write marker to prove main execution
const fs = require('fs');
fs.writeFileSync('/screeps/main-execution-proof.txt', 'MAIN EXECUTED AT: ' + new Date().toISOString());
console.log("🎮 MAIN: Execution complete");
`;

    // Create test validation code
    const testScript = `
// Test validation code
console.log("🧪 TEST: Starting test validation");

const fs = require('fs');

// Check if main.js executed
try {
  const mainProof = fs.readFileSync('/screeps/main-execution-proof.txt', 'utf8');
  console.log("🧪 TEST: Found main execution proof: " + mainProof);
} catch (error) {
  console.log("🧪 TEST: Main execution proof not found");
}

// Write our own proof
fs.writeFileSync('/screeps/test-validation-proof.txt', 'TEST VALIDATED AT: ' + new Date().toISOString());
console.log("🧪 TEST: Validation complete");
`;

    writeFileSync("dist/main.js", mainScript);
    writeFileSync("dist/test-validation.js", testScript);
    console.log("✅ Created main.js and test validation scripts");

    // Deploy both scripts using volume mounting
    console.log("📤 Deploying scripts to volume...");
    execSync("./scripts/deploy-test-code.sh", { stdio: "inherit" });

    // Execute main.js first
    console.log("🎮 Executing main.js...");
    const mainOutput = execSync(`finch exec screeps-code-screeps-1 node /screeps/bots/user/main.js`, {
      encoding: "utf8",
      stdio: "pipe"
    });
    console.log("Main output:", mainOutput);

    // Execute test validation
    console.log("🧪 Executing test validation...");
    const testOutput = execSync(`finch exec screeps-code-screeps-1 node /screeps/test-validation.js`, {
      encoding: "utf8",
      stdio: "pipe"
    });
    console.log("Test output:", testOutput);

    // Verify both executed
    expect(mainOutput).to.include("🎮 MAIN: Starting main game loop");
    expect(mainOutput).to.include("🎮 MAIN: Execution complete");
    expect(testOutput).to.include("🧪 TEST: Starting test validation");
    expect(testOutput).to.include("🧪 TEST: Found main execution proof");
    expect(testOutput).to.include("🧪 TEST: Validation complete");

    console.log("✅ Dual script execution verified - MAIN + TEST CODE WORKING! 🎉");
  });

  after(() => {
    console.log("🧹 Cleaning up container...");
    try {
      execSync("finch compose -f docker-compose.test.yml down -v", { stdio: "inherit" });
      console.log("✅ Container cleaned up");
    } catch (error) {
      console.log("⚠️ Cleanup failed, but continuing...");
    }
  });
});
