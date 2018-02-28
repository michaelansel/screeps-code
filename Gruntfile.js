module.exports = function(grunt) {
  var config = require('./.screeps.json');

  grunt.loadNpmTasks('grunt-screeps');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-copy');

  grunt.initConfig({
    screeps: {
      // Upload code to screeps.com
      dotcom: {
        options: {
          email: config.email,
          password: config.password,
          branch: 'default',
          ptr: false
        },
        src: ['dist/*.js']
      },
      // Upload code to VPS private server
      // "vps": {
      //   options: {
      //     server: {
      //       host: '10.67.14.7',
      //       port: 21025,
      //       http: true
      //     },
      //     email: 'mansel',
      //     password: 'mansel',
      //     branch: 'default',
      //     ptr: false
      //   },
      //   src: ['dist/*.js']
      // },
      // Upload code to local private server
      // "local": {
      //   options: {
      //     server: {
      //       host: '127.0.0.1',
      //       port: 21025,
      //       http: true
      //     },
      //     email: 'mansel',
      //     password: 'mansel',
      //     branch: 'default',
      //     ptr: false
      //   },
      //   src: ['dist/*.js']
      // }
    },

    // Remove all files from the dist folder.
    clean: {
      'dist': ['dist']
    },

    // Copy all source files into the dist folder, flattening the folder structure by converting path delimiters to periods
    copy: {
      // Pushes the game code to the dist folder so it can be modified before being send to the screeps server.
      screeps: {
        files: [{
          expand: true,
          cwd: 'src/',
          src: '**',
          dest: 'dist/',
          filter: 'isFile',
          rename: function(dest, src) {
            // Change the path name utilize periods for folders
            return dest + src.replace(/\//g, '.');
          }
        }],
      }
    },
  });

  grunt.registerTask('default', ['clean', 'copy:screeps', 'screeps']);
}
