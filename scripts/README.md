# Debug Tools

## Console Log Capture

Automatically capture console logs from live Screeps servers for debugging production issues.

### Setup

The debug tools use the same configuration as `npx screeps-api` - no additional setup required!

1. **Ensure you have a `.screeps.yml`** file in your project root with your API token:
   ```yaml
   servers:
     main:
       host: screeps.com
       secure: true
       token: 'your-api-token-here'
     ptr:
       host: screeps.com
       secure: true
       token: 'your-api-token-here'
       ptr: true
   ```

2. **Get your API token** from the Screeps game:
   - Go to Account Settings → API Access
   - Generate a token if you don't have one
   - Copy the token to your `.screeps.yml`

3. **Verify setup** by testing upload:
   ```bash
   npm run upload-ptr  # Should work without errors
   ```

**Note**: The debug tools use the same authentication as the upload commands.

### Usage

**Quick capture PTR logs:**
```bash
npm run debug:ptr
```

**Quick capture main server logs:**
```bash
npm run debug:main  
```

**Custom capture:**
```bash
npm run debug:capture [server] [duration] [shard]

# Examples:
npm run debug:capture ptr 60 shard3    # Capture PTR shard3 for 60 seconds
npm run debug:capture main 45 shard2   # Capture main shard2 for 45 seconds
```

### Output

The tool generates two files in `debug-logs/`:

1. **Raw capture file** (`ptr-shard3-2024-01-15T10-30-00-000Z.log`): Complete JSON with all captured logs
2. **Analysis file** (`ptr-shard3-2024-01-15T10-30-00-000Z-analysis.json`): Detailed error analysis with context

### Features

- **Real-time monitoring**: Shows errors as they happen during capture
- **Context preservation**: Captures 2 ticks before/after each error for debugging
- **Error analysis**: Automatically identifies and categorizes different error types
- **Multiple server support**: Works with both main and PTR servers
- **Shard-specific**: Can target specific shards for focused debugging

### Example Workflow

When you encounter a production issue:

1. **Start capture**: `npm run debug:ptr`
2. **Let it run**: The tool captures for 30 seconds by default
3. **Review output**: Errors are shown in real-time and saved to files
4. **Use for debugging**: Share the analysis file or use it to reproduce issues locally

### Integration with Claude Code

This tool is designed to work seamlessly with development workflow:

1. Run capture when issues are reported
2. Use the captured logs to identify root causes
3. Fix issues locally and test
4. Deploy fixes and verify with another capture

The captured data provides the full context needed to debug production issues without manual log monitoring.

## Smoke Testing & Status Monitoring

Automatically verify that deployed code is running without errors.

### Quick Status Check

Get instant feedback on current code status:

```bash
npm run status:ptr     # Quick 15-second status check for PTR
npm run status:main    # Quick 15-second status check for main
```

**Status Types:**
- 🟢 **HEALTHY**: Code running without errors
- 🟠 **ERRORS_ACTIVE**: Code running but with errors  
- 🟡 **STALLED**: Receiving logs but no tick progression
- 🔴 **NO_ACTIVITY**: Code not running or no console output

### Smoke Testing

Comprehensive post-deployment verification:

```bash
npm run smoke-test:ptr    # 60-second smoke test for PTR
npm run smoke-test:main   # 60-second smoke test for main  
```

**What it checks:**
- ✅ Console output being generated
- ✅ Game loop actively progressing through ticks
- ✅ Spawning system functioning
- ✅ Creep management working
- ✅ No runtime errors occurring

### Enhanced Deployment

Deploy with automatic verification:

```bash
npm run deploy:ptr     # Build → Upload → Smoke Test
npm run deploy:main    # Build → Upload → Smoke Test
```

This replaces the manual upload process with:
1. **Build** - Compile TypeScript to JavaScript
2. **Upload** - Deploy to Screeps server
3. **Smoke Test** - Verify deployment succeeded and code runs error-free

**Benefits:**
- 🛡️ **Catch deployment issues early** - Know immediately if upload broke something
- 📊 **Deployment confidence** - Green smoke test = successful deployment
- 🚨 **Error detection** - Automatically detect runtime errors after deployment
- 📈 **Health monitoring** - Verify all major systems are functioning

### Integration with Development Workflow

**Before deployment:**
```bash
npm run build && npm run test     # Verify code compiles and tests pass
```

**Deploy with confidence:**
```bash
npm run deploy:ptr                # Deploy with automatic verification
```

**Debug issues:**
```bash
npm run debug:ptr                 # Capture detailed error logs if needed
```

**Monitor ongoing health:**
```bash
npm run status:ptr               # Quick health check anytime
```