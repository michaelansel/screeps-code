import { expect } from "chai";
import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

/**
 * Bot Validation Integration Test
 *
 * Validates that the bot build process produces valid Screeps code.
 * This is an integration test because it tests the build pipeline,
 * not individual units of code.
 */

describe("Bot Build Integration", function () {
  let botCode: string;
  let botPath: string;

  before(() => {
    // Build the bot
    console.log("🔨 Building bot code...");
    execSync("npm run build", { stdio: "pipe" });

    // Read the built code
    botPath = join(process.cwd(), "dist/main.js");
    botCode = readFileSync(botPath, "utf8");

    console.log(`✅ Bot built successfully: ${botCode.length} bytes`);
  });

  it("should produce substantial bot code", () => {
    expect(botCode.length).to.be.greaterThan(100000, "Bot code should be substantial");
  });

  it("should contain main loop function", () => {
    expect(botCode).to.include("loop", "Bot must export main loop function");
  });

  it("should integrate with Screeps API", () => {
    expect(botCode).to.include("Game.time", "Bot should use Game.time");
    expect(botCode).to.include("Game.spawns", "Bot should access spawns");
    expect(botCode).to.include("Game.creeps", "Bot should manage creeps");
    expect(botCode).to.include("Memory", "Bot should use Memory system");
  });

  it("should have proper module exports for Screeps", () => {
    expect(botCode).to.include("module.exports", "Bot needs CommonJS exports");
    expect(botCode).to.include("loop: exports.loop", "Bot must export loop function");
  });

  it("should include error handling", () => {
    expect(botCode).to.include("ErrorMapper", "Bot should have error mapping");
    expect(botCode).to.include("try", "Bot should have error handling");
  });

  it("should include core game mechanics", () => {
    expect(botCode).to.include("WORK", "Bot should use WORK body parts");
    expect(botCode).to.include("CARRY", "Bot should use CARRY body parts");
    expect(botCode).to.include("MOVE", "Bot should use MOVE body parts");
    expect(botCode).to.include("spawn", "Bot should have spawning logic");
    expect(botCode).to.include("creepCounter", "Bot should have creep counting");
  });

  it("should save bot for external testing", () => {
    const testBotPath = join(process.cwd(), "test-bot-output.js");
    writeFileSync(testBotPath, botCode);

    const savedCode = readFileSync(testBotPath, "utf8");
    expect(savedCode).to.equal(botCode);

    console.log("✅ Bot code saved for external testing:");
    console.log(`   📁 File: ${testBotPath}`);
    console.log(`   📊 Size: ${botCode.length} bytes`);
    console.log("");
    console.log("🧪 MANUAL TESTING INSTRUCTIONS:");
    console.log("1. Start a Screeps server (screeps-launcher or official)");
    console.log("2. Copy the bot code from test-bot-output.js to the server");
    console.log("3. Deploy to a test room with spawn and energy source");
    console.log("4. Watch for creep spawning and energy harvesting behavior");
    console.log("5. Check console logs for game tick messages");
  });
});
