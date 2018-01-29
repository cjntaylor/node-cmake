#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const spawn = require('child_process').spawn;
const yargs = require('yargs');
const which = require('which');
const debug = require('debug')('ncmake');

// Main usage strings
let argparse = yargs
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
  .global(['name', 'output', 'generator', 'arch'])
  .describe('name', 'The executable target (node/iojs)')
  .describe('output', 'The build directory')
  .describe('generator', 'The CMake generator to use')
  .describe('arch', 'The target architecture');

// Commands (task to execute)
argparse = argparse
  .command('help',      'Shows the help dialog')
  .command('build',     'Builds the native addon')
  .command('clean',     'Cleans the build')
  .command('distclean', 'Removes all build files')
  .command('configure', 'Runs CMake to generate the project configuration')
  .command('rebuild',   'Runs clean, configure and build')
  .command('update',    'Copies the NodeJS.cmake from the installed module')
  .command('install',   'Install the native addon');

// Deprecated commands from node-gyp
const compat = 'Deprecated node-gyp command (no-op)';
argparse = argparse
  .command('list', compat)
  .command('remove', compat);

// Mark advanced options
argparse = argparse
  .group(['target', 'dist-url', 'name', 'output', 'generator', 'arch'], 'Advanced:');

// Aliases and settings for the options
argparse = argparse
  .boolean('debug')
  .alias('debug', 'd')
  .alias('help', 'h')
  .alias('output', 'o')
  .alias('generator', 'g')
  .alias('arch', 'a');

// Use Ninja on platforms where it is installed as a default
// (since its significantly faster than make)
let ninja, generator = 'default';
if(process.platform === 'darwin' || process.platform == 'linux') {
  try {
    ninja = which.sync('ninja');
    generator = 'Ninja';
  }
  catch(err) {}
}
debug(`Selecting default generator "${generator}"`);

// Architecture detection parameters
const msvcRegex = /visual\s+studio/i;
const msvcArch = {
  x64: 'x64',
  ia32: 'x86',
  x32: 'x86'
};

// Defaults for options that need them
argparse = argparse
  .default('output', 'build')
  .default('generator', generator)
  .default('debug', false)
  .default('arch', process.arch);

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
    const warn = new Warning('node-gyp deprecated command invoked. ' +
      'This is not supported in node-cmake, consider updating your build');
    warn.code = 0; // Exit cleanly (for tools that still use this command)
    reject(warn);
  });
}

// The list of accepted commands (mirror node-gyp's API)
const commands = {
  help: function () {
    return new Promise(function (resolve) {
      argparse.showHelp();
      resolve();
    });
  },
  distclean: function (argv, cmake) {
    return new Promise(function (resolve, reject) {
      const args = ['-E', 'remove_directory', argv.output];
      debug('Execute', cmake, args);
      const distclean = spawn(cmake, args, {
        stdio: 'inherit'
      });
      function handleError(code) {
        if(code !== 0) { // An Error object will also not equal 0
          const err = new Error('Unable to remove build directory');
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
    const args = ['--build', argv.output, '--target', 'clean'];
    args.push('--config', (argv.debug) ? 'Debug' : 'Release');
    return new Promise(function (resolve, reject) {
      fs.exists(path.join(argv.output, 'CMakeCache.txt'), function (exists) {
        if(exists) {
          // Silently clean the project, do nothing on faiure (no-op)
          debug('Execute', cmake, args);
          const clean = spawn(cmake, args, {
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
    const args = ['-DCMAKE_BUILD_TYPE=' + ((argv.debug) ? 'Debug' : 'Release')];
    
    // Under MSVC specifically, attempt to pass the architecture flag of the current version
    // of node to cmake. This should attempt to use an MSVC that will compile node modules
    // compatible with this version
    // From: https://gitlab.kitware.com/cmake/cmake/issues/16339
    if (process.platform === 'win32' &&
	(argv.generator === 'default' || msvcRegex.test(argv.generator)) && msvcArch[argv.arch]) {
      args.push('-A');
      args.push(msvcArch[argv.arch]);
    }

    if(argv.generator !== 'default') args.push('-G', argv.generator);
    if(argv.target) args.push('-DNODEJS_VERSION=' + argv.target);
    if(argv.distUrl) args.push('-DNODEJS_URL="' + argv.distUrl + '"');
    if(argv.name) args.push('-DNODEJS_NAME="' + argv.name + '"');
    args.push.apply(args, argv._.slice(1)); // Include any additional arguments passed to ncmake
    args.push('..');

    return new Promise(function (resolve, reject) {
      // Use CMake as a cross-platform mkdir to create the build directory
      const margs = ['-E', 'make_directory', argv.output];
      debug('Execute', cmake, margs);
      const mkdir = spawn(cmake, margs, {
        stdio: 'inherit'
      });
      function handleError(code) {
        if(code !== 0) {
          const err = new Error('Unable to create build directory');
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
        debug('Execute', cmake, args);
        const configure = spawn(cmake, args, {
          cwd: path.resolve(argv.output),
          stdio: 'inherit'
        });
        function handleError(code) {
          if(code !== 0) {
            const err = new Error('Unable to configure project');
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
    const args = ['--build', argv.output, '--config', (argv.debug) ? 'Debug' : 'Release'];
    return new Promise(function (resolve, reject) {
      fs.exists(path.join(argv.output, 'CMakeCache.txt'), function (exists) {
        if(exists) {
          debug('Execute', cmake, args);
          const build = spawn(cmake, args, {
            stdio: 'inherit'
          });
          function handleError(code) {
            if(code !== 0) {
              const err = new Error('Build failed');
              err.code = 7;
              return reject(err);
            }
            return resolve();
          }
          build.on('exit',  handleError);
          build.on('error', handleError);
        }
        else {
          const err = new Error('Project is not configured, ' +
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
      const source = path.resolve(path.join(__dirname, '..', 'NodeJS.cmake'));
      const output = path.resolve('NodeJS.cmake');
      const rd = fs.createReadStream(source);
      rd.on('error', function (rerr) {
        const err = new Error('Unable to read NodeJS.cmake');
        err.code = 9;
        reject(err);
      });
      const wr = fs.createWriteStream(output);
      wr.on('error', function (rerr) {
        const err = new Error('Unable to write NodeJS.cmake');
        err.code = 9;
        reject(err);
      });
      wr.on('close', function (rerr) {
        if(rerr) {
          const err = new Error('Unknown I/O error');
          err.code = 9;
          reject(err);
        }
        resolve();
      });
      rd.pipe(wr);
    });
  },
  install: function (argv, cmake) {
    // Run CMake build to install the project (generator agnostic)
    const args = [
      '--build', argv.output, '--config', (argv.debug) ? 'Debug' : 'Release',
      '--target', 'install'
    ];
    return new Promise(function (resolve, reject) {
      fs.exists(path.join(argv.output, 'CMakeCache.txt'), function (exists) {
        if (exists) {
          debug('Execute', cmake, args);
          const build = spawn(cmake, args, {
            stdio: 'inherit'
          });
          function handleError(code) {
            if (code !== 0) {
              const err = new Error('Build failed');
              err.code = 7;
              return reject(err);
            }
            return resolve();
          }
          build.on('exit', handleError);
          build.on('error', handleError);
        }
        else {
          const err = new Error('Project is not configured, ' +
            'Run \'configure\' command first');
          err.code = 6;
          return reject(err);
        }
      });
    });
  },
  list: deprecated,
  remove: deprecated
};

// Find the cmake binary on the user's path
let cmake;
try {
  cmake = which.sync('cmake');
}
catch(e) {
  console.error('CMake binary could not be found. Please verify your PATH.');
  process.exit(127);
}

// Finalize command line arguments
const argv = argparse.argv;
debug('Arguments', argv);

// Parse the first plain-argument as the command to execute
const cmd  = argparse.argv._[0].toLowerCase();
debug('Command', cmd);
const func = commands[cmd];
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
