const fs = require('fs');
const path = require('path');

module.exports = function(config) {
    console.log('🤖 FileBot mod loading...');
    
    // Hook into the CLI to add our custom commands
    if (config.cli) {
        // Store original createSandbox function
        const originalCreateSandbox = config.cli.createSandbox;
        
        // Override createSandbox to add our filebot object
        config.cli.createSandbox = function(cb) {
            // Call original to get base sandbox
            const sandbox = originalCreateSandbox.call(this, cb);
            
            // Add our filebot object with file operations
            sandbox.filebot = {
                // Read a JavaScript file and inject it as bot code
                inject: function(filepath, userId, options = {}) {
                    try {
                        // Read the JavaScript file
                        const botCode = fs.readFileSync(filepath, 'utf8');
                        
                        const roomName = options.room || 'W5N5';
                        const userName = options.username || `FileBot_${Date.now()}`;
                        
                        // Create user if userId not provided
                        if (!userId) {
                            userId = `filebot_${Date.now()}`;
                        }
                        
                        // Create user
                        const userResult = sandbox.storage.db.users.insert({
                            _id: userId,
                            username: userName,
                            usernameLower: userName.toLowerCase(),
                            cpu: options.cpu || 100,
                            gcl: options.gcl || 1,
                            cpuAvailable: options.cpuAvailable || 10000,
                            registeredDate: new Date().toISOString(),
                            active: true,
                            badge: {
                                type: 1,
                                color1: '#ff0000',
                                color2: '#00ff00', 
                                color3: '#0000ff',
                                flip: false,
                                param: 1
                            },
                            rooms: [roomName]
                        });
                        
                        // Inject code
                        const codeResult = sandbox.storage.db['users.code'].insert({
                            user: userId,
                            modules: {
                                main: botCode
                            },
                            branch: options.branch || 'default',
                            activeWorld: true,
                            activeSim: true
                        });
                        
                        // Create spawn with unique coordinates (ACTIVE!)
                        const timestamp = Date.now();
                        const uniqueX = (options.x || 25) + (timestamp % 10);
                        const uniqueY = (options.y || 25) + Math.floor((timestamp % 100) / 10);
                        
                        const spawnResult = sandbox.storage.db['rooms.objects'].insert({
                            _id: `spawn_${userId}`,
                            room: roomName,
                            type: 'spawn',
                            x: uniqueX,
                            y: uniqueY,
                            user: userId,
                            name: options.spawnName || 'FileSpawn',
                            hits: 5000,
                            hitsMax: 5000,
                            spawning: null,
                            notifyWhenAttacked: false,
                            store: {
                                energy: 300
                            },
                            storeCapacityResource: {
                                energy: 300
                            },
                            off: false  // CRITICAL: Active spawn
                        });
                        
                        // Create controller with unique coordinates  
                        const controllerResult = sandbox.storage.db['rooms.objects'].insert({
                            _id: `controller_${userId}`,
                            room: roomName,
                            type: 'controller',
                            x: uniqueX + 5,
                            y: uniqueY + 5,
                            user: userId,
                            level: options.level || 1,
                            progress: 0,
                            progressTotal: 200,
                            hits: 0,
                            hitsMax: 0,
                            downgradeTime: 5000,
                            upgradeBlocked: 0
                        });
                        
                        // Create source with unique coordinates
                        const sourceResult = sandbox.storage.db['rooms.objects'].insert({
                            _id: `source_${userId}`,
                            room: roomName,
                            type: 'source',
                            x: uniqueX - 5,
                            y: uniqueY - 5,
                            energy: 3000,
                            energyCapacity: 3000,
                            ticksToRegeneration: 300
                        });
                        
                        return {
                            success: true,
                            message: `FileBot injected successfully from ${filepath}`,
                            userId: userId,
                            username: userName,
                            room: roomName,
                            coordinates: {spawn: {x: uniqueX, y: uniqueY}, controller: {x: uniqueX + 5, y: uniqueY + 5}, source: {x: uniqueX - 5, y: uniqueY - 5}},
                            codeLength: botCode.length,
                            userCreated: userResult._id,
                            codeInjected: codeResult._id,
                            spawnCreated: spawnResult._id,
                            controllerCreated: controllerResult._id,
                            sourceCreated: sourceResult._id
                        };
                        
                    } catch (error) {
                        return {
                            success: false,
                            error: error.message,
                            stack: error.stack
                        };
                    }
                },
                
                // Help function
                help: function() {
                    return `
FileBot Mod Commands:
- filebot.inject(filepath, userId, options) - Inject single-file bot code
- filebot.help() - Show this help

Example:
  filebot.inject('/screeps/main.js', 'testbot123', {
    username: 'TestBot',
    room: 'W5N5',
    x: 25, y: 25
  })
                    `;
                }
            };
            
            console.log('✅ FileBot commands added to console sandbox');
            return sandbox;
        };
        
        console.log('✅ FileBot mod loaded successfully');
    } else {
        console.log('❌ FileBot mod: CLI not available');
    }
};