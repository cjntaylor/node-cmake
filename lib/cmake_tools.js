/**
 * \brief Asynchronously finds CMake binary
 *
 * @Returns A path string to CMake binary/batch file
 * @Throws An error if CMake file is not found
 *
 *
 *
 * example:
 *    var find_ninja = require('./lib/find_ninja')find_ninja().then(v => {
 *      console.log('found = ' + v.found);
 *      console.log('vcvarsall_path = ' + v.vcvarsall_path);
 *    });
 */

"use strict";

let debug = require('debug')('ncmake');
let which = require('which');
let path = require('path');
let fs = require('fs');
let util = require('util');
let {spawn} = require('child_process');

function run_cmake_promise(cmake, args, output) {
  return new Promise(function (resolve, reject) {
    // Run CMake to configure the project
    debug('Execute', cmake, args);
    var configure = spawn(cmake, args, {
      cwd: path.resolve(argv.output),
      stdio: 'inherit'
    });
    function handleError(code) {
      if (code !== 0) {
        return reject(code);
      }
      return resolve();
    }
    configure.on('exit', handleError);
    configure.on('error', handleError);
  });
}
module.exports.run_cmake_promise = run_cmake_promise;

var set_output_dir_promise = function (cmake, output) {
  return new Promise(function (resolve, reject) {
    // Use CMake as a cross-platform mkdir to create the build directory
    var margs = ['-E', 'make_directory', output];
    debug('Execute', cmake, margs);
    var mkdir = spawn(cmake, margs, {stdio: 'inherit'});
    function handleError(code) {
      if (code !== 0) {
        var err = new Error('Unable to create build directory');
        err.code = 3;
        return reject(err);
      }
      return resolve(path.resolve(output));
    }
    mkdir.on('exit', handleError);
    mkdir.on('error', handleError);
  });
};
module.exports.set_output_dir_promise = set_output_dir_promise;

module.exports.configure = async function (argv, ninja) { // 2 promises to be resolved

  // first and foremost get path of CMake
  let cmake_path = await new Promise(function (resolve, reject) {
    which('cmake', function (er, resolvedPath) {
      if (er) 
        reject(er);
      else 
        resolve(resolvedPath);
      }
    );
  });

  // if ninja requires to set up msvc paths, configure the batch file
  if (argv.generator.toLowerCase() === 'ninja' && ninja.vcvarsall_path) {
    // create output directory (if not already exists) as specified by
    let outdir_promise = set_output_dir_promise(cmake_path, argv.output);

    let outdir = await outdir_promise;

    await new Promise(function (resolve, reject) {
      let cmake = cmake_path;
      cmake_path = outdir + '\\cmake_ninja_msvc.bat';

      fs.exists(cmake_path, function (exists) {
        if (!exists) {
          let bat_file = fs.createWriteStream(cmake_path, function (err) {
            if (err) 
              reject(err);
            }
          );
          bat_file.on('close', function () {
            resolve();
          });

          bat_file.write('@ECHO OFF\n');
          bat_file.write('call where /Q cl\n');
          bat_file.write('if ERRORLEVEL 1 (\n');
          bat_file.write(util.format('  call "%s" %s\n', ninja.vcvarsall_path, (process.arch === 'ia32')
            ? 'x32'
            : process.arch)); // msvc currently runs only on ia32/x32/x64
          bat_file.write(')\n');
          bat_file.end(util.format('call "%s" \%*\n', cmake));
        }
        else
        {
          resolve();
        }});
      });
    }
    return cmake_path;
  }
