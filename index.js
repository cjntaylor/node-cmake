'use strict';
var fs = require('fs');
var path = require('path');

var _ = require('lodash');
var mothership = require('mothership');

function trueIdentity () { return true; }

function requireCMakeModule (name, conf) {
  // Find the module root by finding the nearest package.json
  // Use the path of the module that required this as the starting point
  var base = path.dirname(module.parent.filename);
  var json = mothership.sync(base, trueIdentity);
  var root;
  if(json) {
    root = path.dirname(json.path);
  }
  else {
    throw Error('Unable to find module root');
  }

  // Allow search path override
  conf = _.merge({}, requireCMakeModule.build, conf || {});

  // Allow single path definitions
  if(!(conf.output instanceof Array)) conf.output = [conf.output];
  if(!(conf.config instanceof Array)) conf.config = [conf.config];

  // Search for the module in the specified locations
  // Nest the searching so that things are tried in succession
  var nativeModule;
  if(!conf.output.some(function searchOutput (output) {
    return conf.config.some(function searchConfig (config) {
      nativeModule = path.join(
        root, output, process.platform, process.arch, config, name + '.node'
      );
      try {
        return fs.statSync(nativeModule);
      }
      catch(e) { return false; }
    });
  })) {
    throw Error('Unable to find native module');
  }

  // Require the native module and return the loaded content
  return require(nativeModule);
}

requireCMakeModule.build = {
  output: [
    'out', 'build'
  ],
  config: [
    'MinSizeRel', 'Release', 'RelWithDebInfo', 'Debug'
  ]
};

module.exports = requireCMakeModule;