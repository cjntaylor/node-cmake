#!/usr/bin/env node
var fs = require('fs');
var path = require('path');
var spawn = require('child_process').spawn;
var yargs = require('yargs');
var which = require('which');

var buildDir = 'build';

// Main usage strings
var argparse = yargs
  .usage('$0 [options] <command>');

// Primary options
// Where appropriate, node-gyp argument names have been retained for
// compatibility. All unsupported options will be ignored by the parser.
argparse = argparse
  .global(['debug', 'target', 'dist-url'])
  .describe('debug', 'Build with debug symbols')
  .describe('target', 'Version of Node.js to use')
  .describe('dist-url', 'Set the download server for dependencies');

// New options unique to CMake / ncmake
argparse = argparse
  .global(['generator', 'name'])
  .describe('name', 'The executable target (node/iojs)')
  .describe('generator', 'The CMake generator to use');

// Commands (task to execute)
argparse = argparse
  .command('help',      'Shows the help dialog')
  .command('build',     'Builds the native addon')
  .command('clean',     'Cleans the build')
  .command('distclean', 'Removes all build files')
  .command('configure', 'Runs CMake to generate the project configuration')
  .command('rebuild',   'Runs clean, configure and build')
  .command('update',    'Copies the NodeJS.cmake from the installed module');

// Deprecated commands from node-gyp
var compat = 'Deprecated node-gyp command (no-op)';
argparse = argparse
  .command('install', compat)
  .command('list', compat)
  .command('remove', compat);

// Mark advanced options
argparse = argparse
  .group(['target', 'dist-url', 'name', 'generator'], 'Advanced:');

// Aliases and settings for the options
argparse = argparse
  .boolean('debug')
  .alias('debug', 'd')
  .alias('help', 'h')
  .alias('generator', 'g');

// Use Ninja on platforms where it is installed as a default
// (since its significantly faster than make)
var ninja, generator = 'default';
if(process.platform === 'darwin' || process.platform == 'linux') {
  try {
    ninja = which.sync('ninja');
    generator = 'Ninja';
  }
  catch(err) {}
}

// Defaults for options that need them
argparse = argparse
  .default('generator', generator)
  .default('debug', false);

// Exactly one command must be specified
argparse = argparse.demandCommand(1, 1);

// Support a version string, and a help argument (in addition to
// the help command)
argparse = argparse.version();
argparse = argparse.help();

// Warning type - used to differentiate output in promise chain
function Warning(msg) { this.message = msg; }

// Catch-all function for node-gyp deprecated commands
function deprecated() {
  return new Promise(function (resolve, reject) {
    var warn = new Warning('node-gyp deprecated command invoked. ' +
      'This is not supported in node-cmake, consider updating your build');
    warn.code = 0; // Exit cleanly (for tools that still use this command)
    reject(warn);
  });
}

// The list of accepted commands (mirror node-gyp's API)
var commands = {
  help: function () {
    return new Promise(function (resolve) {
      argparse.showHelp();
      resolve();
    });
  },
  distclean: function (argv, cmake) {
    return new Promise(function (resolve, reject) {
      var distclean = spawn(cmake, ['-E', 'remove_directory', buildDir], {
        stdio: 'inherit'
      });
      function handleError(code) {
        if(code !== 0) { // An Error object will also not equal 0
          var err = new Error('Unable to remove build directory');
          err.code = 8;
          return reject(err);
        }
        return resolve();
      }
      distclean.on('exit' , handleError);
      distclean.on('error', handleError);
    });
  },
  clean: function (argv, cmake) {
    // Run CMake clean if the project has been "configured"
    var args = ['--build', buildDir, '--target', 'clean'];
    args.push('--config', (argv.debug) ? 'Debug' : 'Release');
    return new Promise(function (resolve, reject) {
      fs.exists(path.join(buildDir, 'CMakeCache.txt'), function (exists) {
        if(exists) {
          // Silently clean the project, do nothing on faiure (no-op)
          var clean = spawn(cmake, args, {
            stdio: 'ignore'
          });
          function handleError(code) { return resolve(); }
          clean.on('exit',  handleError);
          clean.on('error', handleError);
        }
        else resolve();
      });
    });
  },
  configure: function (argv, cmake) {
    var args = [];
    args.push('-DCMAKE_BUILD_TYPE=' + ((argv.debug) ? 'Debug' : 'Release'));
    if(argv.generator !== 'default') args.push('-G', argv.generator);
    if(argv.target) args.push('-DNODEJS_VERSION=' + argv.target);
    if(argv.distUrl) args.push('-DNODEJS_URL="' + argv.distUrl + '"');
    if(argv.name) args.push('-DNODEJS_NAME="' + argv.name + '"');
    args.push.apply(args, argv._.slice(1)); // Include any additional arguments passed to ncmake
    args.push('..');

    return new Promise(function (resolve, reject) {
      // Use CMake as a cross-platform mkdir to create the build directory
      var mkdir = spawn(cmake, ['-E', 'make_directory', buildDir], {
        stdio: 'inherit'
      });
      function handleError(code) {
        if(code !== 0) {
          var err = new Error('Unable to create build directory');
          err.code = 3;
          return reject(err);
        }
        return resolve();
      }
      mkdir.on('exit',  handleError);
      mkdir.on('error', handleError);
    }).then(function () {
      return new Promise(function (resolve, reject) {
        // Run CMake to configure the project
        var configure = spawn(cmake, args, {
          cwd: path.resolve(buildDir),
          stdio: 'inherit'
        });
        function handleError(code) {
          if(code !== 0) {
            var err = new Error('Unable to configure project');
            err.code = 4;
            return reject(err);
          }
          return resolve();
        }
        configure.on('exit',  handleError);
        configure.on('error', handleError);
      });
    });
  },
  build: function (argv, cmake) {
    // Run CMake build to build the project (generator agnostic)
    var args = ['--build', buildDir];
    args.push('--config', (argv.debug) ? 'Debug' : 'Release');
    return new Promise(function (resolve, reject) {
      fs.exists(path.join(buildDir, 'CMakeCache.txt'), function (exists) {
        if(exists) {
          var build = spawn(cmake, args, {
            stdio: 'inherit'
          });
          function handleError(code) {
            if(code !== 0) {
              var err = new Error('Build failed');
              err.code = 7;
              return reject(err);
            }
            return resolve();
          }
          build.on('exit',  handleError);
          build.on('error', handleError);
        }
        else {
          var err = new Error('Project is not configured, ' +
            'Run \'configure\' command first');
          err.code = 6;
          return reject(err);
        }
      });
    });
  },
  rebuild: function (argv, cmake) {
    // Per node-gyp, run clean, then configure, then build
    return commands.clean(argv, cmake)
      .then(function () {
        return commands.configure(argv, cmake);
      })
      .then(function () {
        return commands.build(argv, cmake);
      });
  },
  update: function (argv, cmake) {
    return new Promise(function (resolve, reject) {
      // The CMake script is relative to this utility when installed
      var source = path.resolve(path.join(__dirname, '..', 'NodeJS.cmake'));
      var output = path.resolve('NodeJS.cmake');
      var rd = fs.createReadStream(source);
      rd.on('error', function (err) {
        var err = new Error('Unable to read NodeJS.cmake');
        err.code = 9;
        reject(err);
      });
      var wr = fs.createWriteStream(output);
      wr.on('error', function (err) {
        var err = new Error('Unable to write NodeJS.cmake');
        err.code = 9;
        reject(err);
      });
      wr.on('close', function (err) {
        if(err) {
          var err = new Error('Unknown I/O error');
          err.code = 9;
          reject(err);
        }
        resolve();
      });
      rd.pipe(wr);
    });
  },
  install: deprecated,
  list: deprecated,
  remove: deprecated
};

// Find the cmake binary on the user's path
var cmake;
try {
  cmake = which.sync('cmake');
}
catch(e) {
  console.error('CMake binary could not be found. Please verify your PATH.');
  process.exit(127);
}

// Finalize command line arguments
var argv = argparse.argv;

// Parse the first plain-argument as the command to execute
var cmd  = argparse.argv._[0].toLowerCase();
var func = commands[cmd];
((func) ? func(argv, cmake) : Promise.reject(
  new Error('Invalid command \'' + cmd + '\'')
))
// On success, exit cleanly
.then(function () {
  process.exit(0);
})
// Otherwise, log the error and exit with a status code
.catch(function (err) {
  if(err instanceof Warning) console.warn(err.message);
  else console.error(err.message);
  process.exit(err.code || 2);
});
