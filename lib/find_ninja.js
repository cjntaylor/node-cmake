/**
 * \brief Asynchronously finds Ninja binary and support file path
 *
 * @Returns An object with 2 elements:
 *             found:          true if Ninja binary is found, false otherwise
 *             vcvarsall_path: path to vcvarsall.bat if Windows and cl.exe is
 *                             not in the path
 *
 * example:
 *    var find_ninja = require('./lib/find_ninja')
 *    find_ninja().then(v => {
 *      console.log('found = ' + v.found);
 *      console.log('vcvarsall_path = ' + v.vcvarsall_path);
 *    });
 */

"use strict";

let which = require('which');
let path = require('path');
let fs = require('fs');
let {spawn, spawnSync} = require('child_process');

module.exports = async function () { // 2 promises to be resolved
  let ninja_promise = new Promise(function (resolve, reject) {
    which('ninja', function (er, resolvedPath) {
      if (er) 
        reject(er);
      else 
        resolve(resolvedPath);
      }
    );
  });

  let support_promise = new Promise(function (resolve, reject) {
    if (process.platform !== 'win32') {
      // if not windows, no compiler support needed (should already be visible)
      resolve("");
    } else {
      // check if msvc compiler is in the environment path
      which('cl', function (er, resolvedPath) {
        if (!er) {
          resolve(""); // msvc compiler is already in the path, good to go
        } else {
          try
          { // search for the latest msvc compiler using vswhere
            // @https://github.com/Microsoft/vswhere
            let vswhere_res = spawnSync(__dirname+'/../res/vswhere', [
              '-format', 'json',
              '-products', '*',
              '-legacy',
              '-latest',
              '-property', 'installationPath'
            ]);
            let vswhere_json = JSON.parse(vswhere_res.stdout.toString());

            // run vcvarsall to add MSVC paths to environmental path
            var vcvarsall = path.join(vswhere_json[0].installationPath, 'VC', 'Auxiliary', 'Build', 'vcvarsall.bat');
            fs.access(vcvarsall, (err) => {
              if (err) {
                reject(err);
              } else {
                resolve(vcvarsall);
              }
            });
          } catch (err) {
            reject(err);
          }
        }
      });
    }
  });

  try
  {
    let ninja_path = await ninja_promise;
    return {found: true, vcvarsall_path: await support_promise};
  } catch (e) {
    return {found: false, vcvarsall_path: ''};
  }
};
