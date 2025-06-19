/**
 * FileBot mod for Screeps server - enables code injection for testing
 */

module.exports = function(config) {
  console.log('FileBot mod loading...');
  
  if (config.backend && config.backend.on) {
    config.backend.on('expressPreConfig', function(app) {
      console.log('FileBot: Setting up express routes');
      
      // Add filebot global object
      global.filebot = {
        inject: function(filename, userId, options) {
          try {
            console.log(`FileBot: Injecting code for user ${userId}`);
            
            const fs = require('fs');
            const _ = require('lodash');
            const { ScreepsAPI } = require('screeps');
            
            if (!fs.existsSync(filename)) {
              console.error(`FileBot: File not found: ${filename}`);
              return { success: false, error: 'File not found' };
            }
            
            const code = fs.readFileSync(filename, 'utf8');
            console.log(`FileBot: Read ${code.length} bytes from ${filename}`);
            
            // Use the storage system to inject code
            const storage = config.common.storage;
            
            // Create user if doesn't exist
            return storage.db.users.findOne({ _id: userId }).then(user => {
              if (!user) {
                console.log(`FileBot: Creating user ${userId}`);
                return storage.db.users.insert({
                  _id: userId,
                  username: options.username || 'TestBot',
                  cpu: options.cpu || 100,
                  cpuAvailable: options.cpuAvailable || 10000,
                  gcl: 1,
                  credits: 0,
                  lastUsedCpu: 0
                });
              }
              return user;
            }).then(() => {
              // Set user code
              console.log(`FileBot: Setting code for user ${userId}`);
              return storage.db['users.code'].findOne({ user: userId }).then(existing => {
                const codeDoc = {
                  user: userId,
                  modules: {
                    main: code
                  },
                  timestamp: new Date(),
                  hash: require('crypto').createHash('md5').update(code).digest('hex')
                };
                
                if (existing) {
                  return storage.db['users.code'].update({ user: userId }, { $set: codeDoc });
                } else {
                  return storage.db['users.code'].insert(codeDoc);
                }
              });
            }).then(() => {
              // Initialize user memory if specified
              if (options.memory) {
                console.log(`FileBot: Setting initial memory for user ${userId}`);
                return storage.env.set(`memory:${userId}`, JSON.stringify(options.memory));
              }
            }).then(() => {
              // Generate room if specified
              if (options.room) {
                console.log(`FileBot: Generating room ${options.room} for user ${userId}`);
                return storage.db.rooms.findOne({ _id: options.room }).then(room => {
                  if (!room) {
                    // Create basic room structure
                    const roomData = {
                      _id: options.room,
                      status: 'normal',
                      active: true
                    };
                    return storage.db.rooms.insert(roomData);
                  }
                }).then(() => {
                  // Add spawn for user in room
                  return storage.db['rooms.objects'].findOne({ 
                    user: userId, 
                    type: 'spawn',
                    room: options.room 
                  }).then(spawn => {
                    if (!spawn) {
                      const spawnData = {
                        _id: `spawn_${userId}_${Date.now()}`,
                        user: userId,
                        type: 'spawn',
                        room: options.room,
                        x: 25,
                        y: 25,
                        name: 'Spawn1',
                        energy: 300,
                        energyCapacity: 300,
                        spawning: null,
                        store: { energy: 300 },
                        off: false
                      };
                      return storage.db['rooms.objects'].insert(spawnData);
                    }
                  });
                });
              }
            }).then(() => {
              console.log(`FileBot: Successfully injected code for user ${userId}`);
              return {
                success: true,
                userId: userId,
                codeSize: code.length,
                room: options.room || 'sim',
                timestamp: new Date().toISOString()
              };
            }).catch(error => {
              console.error(`FileBot: Error injecting code:`, error);
              return {
                success: false,
                error: error.message,
                userId: userId
              };
            });
          } catch (error) {
            console.error(`FileBot: Exception in inject:`, error);
            return {
              success: false,
              error: error.message
            };
          }
        },
        
        help: function() {
          return {
            commands: {
              'filebot.inject(filename, userId, options)': 'Inject bot code from file',
              'filebot.help()': 'Show this help'
            },
            options: {
              username: 'Bot username (default: TestBot)',
              room: 'Target room (default: sim)', 
              cpu: 'CPU limit (default: 100)',
              cpuAvailable: 'Available CPU (default: 10000)',
              memory: 'Initial memory object'
            }
          };
        }
      };
      
      console.log('FileBot: Global filebot object created');
    });
  }
  
  console.log('FileBot mod loaded successfully');
};