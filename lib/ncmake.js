#!/usr/bin/env node
'use strict';
var path = require('path');
var spawn = require('child_process').spawn;

var _ = require('lodash');
var mothership = require('mothership');
var which = require('which');
var rimraf = require('rimraf');
var mkdirp = require('mkdirp');

// Make sure that the arguments are valid
function usage (code) {
  console.log('Usage: ' + path.relative(process.cwd(), process.argv[1]) + 
    ' [options] <build-directory>');
  process.exit(code || 1);
}
if(process.argv.length < 3) usage();

// Find the cmake executable
var cmake = which.sync('cmake');

// Define default arguments for the program
var args = {
  args: {
    generate: [],
    build: []
  },
  generator: {},
  flags: {},
  arch: process.arch,
  platform: process.platform,
  config: 'MinSizeRel',
  build: false,
  clean: false
};

// Process command line arguments
var rarg = process.argv.slice(2, process.argv.length);
var next = null;
var variantSet = false;
var versionSet = false;
rarg.map(function parseArguments (arg) {
  var argu = arg.toUpperCase();
  if(next) {
    _.set(args, next, arg);
    next = null;
  }
  else if(_.startsWith(argu, '-D')) {
    arg = arg.substr(2).split('=');
    args.flags[arg[0]] = arg[1];
  }
  else if(argu === '--BUILD') {
    args.build = true;
  }
  else if(argu === '--CLEAN-FIRST') {
    args.clean = true;
  }
  else if(argu === '--CONFIG') {
    next = 'config';
  }
  else if(argu === '--TARGET') {
    next = 'target';
  }
  else if(argu === '-C') {
    next = 'standard';
  }
  else if(argu === '-Z') {
    args.download = true;
  }
  else if(argu === '-NZ') {
    args.download = false;
  }
  else if(argu === '-G') {
    next = 'generator.name';
  }
  else if(argu === '-T') {
    next = 'generator.toolset';
  }
  else if(argu === '-A') {
    next = 'arch';
  }
  else if(argu === '-P') {
    next = 'platform';
  }
  else if(argu === '-S') {
    next = 'variant';
    variantSet = true;
  }
  else if(argu === '-V') {
    next = 'version';
    versionSet = true;
  }
  else {
    args.args[args.build ? 'build' : 'generate'].push(arg);
  }
});

if(variantSet && !versionSet) {
  console.log('Variant set without version - aborting build');
  process.exit(1);
}

// If there are no extra arguments, use the default folder
if((args.args.build.length+args.args.generate.length) === 0) {
  args.directory = 'out';
}
// Otherwise the last argument MUST be the build directory
else args.directory = process.argv[process.argv.length-1];

// Load the configuration options from the package.json
function trueIdentity () { return true; }
var json = mothership.sync(process.cwd(), trueIdentity);
var base = (json.pack || {}).cmake || {};

// Merge together arguments and configuration
var conf = _.merge({}, base.default || {}, base[process.platform] || {}, args);

// Convert version shortcut to installed version
if(conf.version && conf.version === 'installed') {
  conf.version = process.version.substr(1);
}

// Set generator if not set
if(!conf.generator.name) {
  // Use Xcode on OSX as the generator
  if(conf.platform === 'darwin') {
    conf.generator.name = 'Xcode';
  }
  // Use Ninja as the generator if its available as an executable
  // (except on windows, where MSVC (the default) should be used)
  else if(conf.platform !== 'win32') {
    try {
      which.sync('ninja');
      conf.generator.name = 'Ninja';
      conf.verbose = '-v';
    }
    catch(e) {}
  }
}

// Build type should always match config
// Ignored by generators that use configuration
conf.flags.CMAKE_BUILD_TYPE = conf.config;

// Allow download overloading
// Bit of a complicated case, since false is a valid value
if(conf.flags.NodeJS_DOWNLOAD && _.isUndefined(conf.download)) {
  conf.download = (
    conf.flags.NodeJS_DOWNLOAD.toUpperCase() === 'ON' ||
    conf.flags.NodeJS_DOWNLOAD.toUpperCase() === 'TRUE'
  );
}
else if(!_.isUndefined(conf.download)) 
  conf.flags.NodeJS_DOWNLOAD = (conf.download) ? 'On' : 'Off';

// Configure CXX standard to use
if(conf.flags.NodeJS_CXX_STANDARD && !conf.standard) {
  conf.standard = conf.flags.NodeJS_CXX_STANDARD;
}
else if(conf.standard) conf.flags.NodeJS_CXX_STANDARD = conf.standard;

// Configure version and variant
if(conf.flags.NodeJS_VARIANT && !conf.variant) {
  conf.variant = conf.flags.NodeJS_VARIANT;
}
else if(conf.variant) conf.flags.NodeJS_VARIANT = conf.variant;
if(conf.flags.NodeJS_VERSION && !conf.version) {
  conf.version = conf.flags.NodeJS_VERSION;
}
else if(conf.version) conf.flags.NodeJS_VERSION = conf.version;

// Always specify node architecture properties
// Other means of resolving these are for external CMake invocation
conf.flags.NodeJS_PLATFORM = conf.platform;
conf.flags.NodeJS_ARCH     = conf.arch;

// Platform should match architecture on windows
if(process.platform === 'win32') {
  if(conf.arch === 'ia32') conf.generator.arch = 'win32';
  else conf.generator.arch = conf.arch;
}

// Resolve the build location, and the path from there to the working directory
var buildDir = path.resolve(path.join(
  conf.directory, conf.platform, conf.arch
));
var buildRel = path.relative(buildDir, process.cwd());

// Load the configuration in the build directory
var build = {};
try {
  build = require(path.join(buildDir, 'build'));
}
catch(e) {}

// Convert CMake booleans to actual boolean
build.download = (build.download && (
  build.download.toUpperCase() === 'ON' ||
  build.download.toUpperCase() === 'TRUE'
));

// Build the arguments set for cmake
args = {
  generate: [],
  build: []
};
if(conf.generator.name) {
  args.generate.push('-G', conf.generator.name);
}
if(conf.generator.toolset) {
  args.generate.push('-T', conf.generator.toolset);
}
if(conf.generator.arch) {
  args.generate.push('-A', conf.generator.arch);
}
_.forEach(conf.flags, function buildFlag (value, flag) {
  args.generate.push('-D' + flag + '=' + value);
});
args.generate.push(buildRel);
args.build.push('--build', buildDir);
if(conf.target) {
  args.build.push('--target', conf.target);
}
args.build.push('--config', conf.config);
if(conf.clean) {
  args.build.push('--clean-first');
}
if(conf.verbose) {
  args.build.push('--', conf.verbose);
}

// Workaround to build target architecture on Xcode, which doesnt respect
// the platform generation (yet)
if(conf.generator.name === 'Xcode') {
  var osxarch;
  if(conf.arch === 'x64') {
    osxarch = 'x86_64';
  }
  else if(conf.arch === 'ia32') {
    osxarch = 'i386';
  }
  else {
    console.log('Invalid architecture ' + conf.arch);
    process.exit(2);
  }
  args.build.push('--', '-arch', osxarch);
}

function buildModule() {
  // Always create the build directory if necessary
  mkdirp(buildDir, function makeBuildDirectory (err) {
    if(err) throw err;

    var setupProc;
    var buildProc;

    function afterSetup () {
      buildProc = spawn(cmake, args.build, { stdio: 'inherit' });
      buildProc.on('exit', function handleExitCodeDone (code) {
        process.exit(code);
      });
    }

    // If we're not building, or the build configuration does not match the
    // current configuration, generate the project
    if(!conf.build || 
      conf.config   !== build.build_type ||
      conf.variant  && conf.variant  !== build.variant ||
      conf.version  && conf.version  !== build.version ||
      !_.isUndefined(conf.download) && conf.download !== build.download ||
      conf.standard && conf.standard !== build.standard) {

      setupProc = spawn(cmake, args.generate, { 
        cwd: buildDir, stdio: 'inherit' 
      });
      setupProc.on('exit', function handleBadExitCode (code) {
        if(code !== 0) process.exit(code);
      });
    }

    // Invoke the cmake build
    if(conf.build) {
      if(setupProc) {
        setupProc.on('exit', afterSetup);
      }
      else afterSetup();
    }
  });
}

// If the build changes in a way that is incompatible with the previous build
// then remove the build directory (if it exists) before building

// XXX: (conf.generator.arch && conf.generator.arch !== build.platform )
// Build now uses architecture specific folders
if(!build.build_type ||
   (conf.generator.name     && conf.generator.name     !== build.generator) ||
   (conf.generator.toolset  && conf.generator.toolset  !== build.toolset  )) {
  rimraf(buildDir, function afterRemove (err) {
    if(err) throw err;
    build = {};
    buildModule();
  });
}
else buildModule();