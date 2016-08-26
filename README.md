Node CMake
==========

A CMake-based build system for Node.js native modules, for CMake >= v3.1. 

Newly rewritten for 2.0!

##### New Features

* Drop-in execution compatibility with the `node-gyp` binary
* Standardization with the `node-gyp` output and format. Should work better with tools that expect node-gyp's behaviour
* Simplified, portable and customizable configuration script
* Better recovery from failed downloads and builds
* Generalized support for Node.js variants. This supports additional variant types that are compatible with the Node.js release server structure (SHAs defined for all resources hosted on the download server, headers and .lib files located in standard locations).

##### Removed Features

* `find_package` support. The module loading technique used in 1.0 was flawed for specific module structures and setup (deeply nested native dependencies). The new technique is to run `ncmake update` to copy the configuration script into your project. This means that projects will not stay in sync with updates automatically. Be sure to run `ncmake update` when updating `node-cmake` to a new version.
* `ncmake` command line arguments. `ncmake` now follows and extends the `node-gyp` command line interface. Please update your build files to use the new syntax (`ncmake --build` => `ncmake rebuild`). For more info, see the [manual](docs/NcmakeManual.md).
* Support for NW.js - The NW.js release server is not compliant to the Node.js release server structure. Workaround for the NW.js naming conventions have been included in the update, but the server SHA file does not include checksums for all resources, leaving no way to validate downloads. The SHASUMS256.txt file on the server needs to be updated to include these entries to be used with this tool.

## Usage

To use this package, add the module `node-cmake` to your package.json as a development dependency:

    npm install --save-dev node-cmake

Run `ncmake update` to copy the file `NodeJS.cmake` from this module into your project. Then add a `CMakeLists.txt` file to the root of your module that contains at least the following (\<REPLACE\> with your own definitions):

```CMake
cmake_minimum_required(VERSION 3.1)

project(<NAME OF MODULE> VERSION 1.0.0)

include(NodeJS.cmake)
nodejs_init()

add_nodejs_module(${PROJECT_NAME} <SOURCE AND HEADER FILES GO HERE>)
```

This `CMakeLists.txt` file is the main build script for CMake, and replaces your existing `binding.gyp` file from `node-gyp`. It defines the build process for this project, including how to configure Node.js, and how to build your project components (modules, libraries, etc.)

The NodeJS.cmake file, included by relative path in this example, is a self-contained configuration tool for downloading the dependencies for building Node.js native modules, and configuring cmake to build them:

`nodejs_init` configures the version of Node.js to use for building. By default, this is the currently installed version of node on your platform. This function can take a number of advanced options (see [Documentation](#documentation)). This function must be called before any other function provided by the script.

`add_nodejs_module` is a helper function for configuring CMake to build a node module based on the currently configured version of node. It takes the name of a `target` to create, along with a list of source files to build. All arguments after the `target` name are treated as sources.

CMake has extensive documentation online, which can be found [here](https://cmake.org/documentation).

## Building

node-cmake has been updated to provide a drop-in replacement for node-gyp's interface. To build your module, use the command `ncmake rebuild`, which cleans, configures and builds the module.

This can be integrated into npm via its "scripts" directive:

```JSON
"scripts": {
    "install": "ncmake rebuild"
}
```

## Running

node-cmake also provides a simple javascript module to simplify the  finding and loading of the built native module in your own scripts. It exposes a single function similar to `require` with the same effects. Calling

```JavaScript
require('node-cmake')('<NAME OF MODULE>')
```

will load and return the named native module by searching in standard build locations. A second boolean can be passed to this function to configure loading of debug builds by default (if available).

## Example

An example project is provided in the `example` folder. Follow the directions in its README.md to build it correctly.

## Documentation

* [ncmake Manual](docs/NcmakeManual.md)
* [NodeJS.cmake Manual](docs/NodeJSCmakeManual.md)
* [Nan support](docs/Nan.md)

## Motivation

This tool was developed as a replacement for [node-gyp](https://github.com/nodejs/node-gyp), the current Node.js build system. Google has stopped working on its core, the gyp build tool, to focus on its replacement [gn](https://chromium.googlesource.com/chromium/src/tools/gn) and the future of gyp is uncertain.

CMake also provides a number of benefits over gyp:

  * Does not depend on python 
  * Extensive cross-platform utilities for finding and using other libraries and packages (the find_* family of commands, and the package system). 
  * Native IDE support (CLion, KDevelop), and good support for platform IDEs (Visual Studio, Xcode, Eclipse)
  * Easy integration with other projects and build systems
  * Cross-compilation via toolchains