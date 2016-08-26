'use strict';
var fs = require('fs');
var path = require('path');

function requireNativeModule(name, debug) {
  // Search relative to the file that included this one
  var base = path.dirname(module.parent.filename);
  
  // Suffixes to search for (in each mode)
  // Both are used, debug just changes which is tried first
  var search = {
    debug: path.join('build', 'Debug', name + '.node'),
    release: path.join('build', 'Release', name + '.node')
  };

  var root = base;
  var location;
  var same = 0;
  var found = false;
  
  // Walk upward to the root of the current drive
  while(same < 2 || found) {
    try {
      location = path.join(root, (debug) ? search.debug : search.release);
      found = fs.statSync(location);
    }
    catch(e) {}
    if(!found) {
      try {
        location = path.join(root, (debug) ? search.release : search.debug);
        found = fs.statSync(location);
      }
      catch(e) {}
    }
    if(found) break;
    root = path.dirname(root);
    if(root == path.dirname(root)) same++;
  }

  if(!found) throw new Error('Unable to find native module');
  return require(location);
}

module.exports = requireNativeModule;