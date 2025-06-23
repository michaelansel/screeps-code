#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Analyze existing debug capture files
 * Usage: npm run debug:analyze <log-file>
 * Example: npm run debug:analyze debug-logs/ptr-shard3-2024-01-15T10-30-00-000Z.log
 */

const args = process.argv.slice(2);
const logFile = args[0];

if (!logFile) {
  console.log('Usage: npm run debug:analyze <log-file>');
  console.log('Example: npm run debug:analyze debug-logs/ptr-shard3-2024-01-15T10-30-00-000Z.log');
  process.exit(1);
}

if (!fs.existsSync(logFile)) {
  console.error(`❌ File not found: ${logFile}`);
  process.exit(1);
}

function analyzeLogFile(filePath) {
  console.log(`🔍 Analyzing: ${filePath}`);
  
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  console.log(`📊 Capture Summary:`);
  console.log(`   Server: ${data.server}`);
  console.log(`   Shard: ${data.shard}`);
  console.log(`   Duration: ${data.duration}s`);
  console.log(`   Ticks: ${data.ticksCaptured}`);
  console.log(`   Errors: ${data.errorsFound}`);
  
  if (data.errorsFound === 0) {
    console.log('✅ No errors found in this capture!');
    return;
  }

  // Extract all errors with context
  const errors = [];
  const errorPatterns = {};
  
  data.logs.forEach((logEntry, index) => {
    const errorMessages = logEntry.messages?.filter(msg => 
      msg.includes('Error') || msg.includes('TypeError') || msg.includes('ReferenceError')
    ) || [];
    
    if (errorMessages.length > 0) {
      // Classify error patterns
      errorMessages.forEach(error => {
        // Extract error type and message
        const match = error.match(/^(\w+Error): (.+?)(?:\s+at|$)/);
        if (match) {
          const [, errorType, errorMsg] = match;
          const pattern = `${errorType}: ${errorMsg.substring(0, 50)}${errorMsg.length > 50 ? '...' : ''}`;
          errorPatterns[pattern] = (errorPatterns[pattern] || 0) + 1;
        }
      });

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

  // Show error patterns
  console.log(`\n🐛 Error Patterns Found:`);
  Object.entries(errorPatterns)
    .sort(([,a], [,b]) => b - a)
    .forEach(([pattern, count]) => {
      console.log(`   ${count}x: ${pattern}`);
    });

  // Show most recent errors with context
  console.log(`\n📝 Recent Errors with Context:`);
  
  const recentErrors = errors.slice(-3); // Show last 3 error occurrences
  
  recentErrors.forEach((error, i) => {
    console.log(`\n--- Error ${i + 1} (Tick ${error.tick}) ---`);
    
    if (error.contextBefore.length > 0) {
      console.log('Context before:');
      error.contextBefore.slice(-2).forEach(msg => console.log(`  ${msg}`));
    }
    
    console.log('🚨 ERROR:');
    error.errors.forEach(msg => console.log(`  ${msg}`));
    
    if (error.contextAfter.length > 0) {
      console.log('Context after:');
      error.contextAfter.slice(0, 2).forEach(msg => console.log(`  ${msg}`));
    }
  });

  // Save detailed analysis if it doesn't exist
  const analysisFile = filePath.replace('.log', '-analysis.json');
  if (!fs.existsSync(analysisFile)) {
    const analysis = {
      summary: data,
      errorPatterns,
      errorDetails: errors,
      analysisTimestamp: new Date().toISOString()
    };
    
    fs.writeFileSync(analysisFile, JSON.stringify(analysis, null, 2));
    console.log(`\n💾 Detailed analysis saved to: ${analysisFile}`);
  }

  // Provide debugging hints
  console.log(`\n💡 Debugging Hints:`);
  
  if (errorPatterns['TypeError: Cannot read property'] || errorPatterns['TypeError: Cannot read properties of undefined']) {
    console.log('   • Check for undefined object access - add defensive null checks');
  }
  
  if (errorPatterns['ReferenceError:']) {
    console.log('   • Check for undefined variables/constants - ensure proper initialization');
  }
  
  const spawnErrors = Object.keys(errorPatterns).some(p => p.includes('spawn') || p.includes('energy'));
  if (spawnErrors) {
    console.log('   • Spawn-related errors detected - check energy availability and spawn state');
  }

  const memoryErrors = Object.keys(errorPatterns).some(p => p.includes('memory') || p.includes('Memory'));
  if (memoryErrors) {
    console.log('   • Memory-related errors detected - check memory structure initialization');
  }
  
  console.log('\n🎯 Next Steps:');
  console.log('   1. Review the error patterns above');
  console.log('   2. Check the source code at the line numbers in stack traces');
  console.log('   3. Add defensive checks for undefined values');
  console.log('   4. Test fixes locally before deploying');
  console.log('   5. Run another capture after deployment to verify fixes');
}

// Main execution
if (require.main === module) {
  try {
    analyzeLogFile(logFile);
    console.log('\n🎉 Analysis complete!');
  } catch (error) {
    console.error('\n❌ Analysis failed:', error.message);
    process.exit(1);
  }
}

module.exports = { analyzeLogFile };