Node CMake
==========

A CMake-based build system for node.js native modules, for CMake >= v3.1.

## Motivation

The current build system for node native modules is
[node-gyp](https://github.com/nodejs/node-gyp), which is based on the google
project gyp. While this does provide a consistent build environment in
line with the node build system, it has its own share of problems:

1. Cross platform library integration. As most node native modules are 
designed to expose some system-level interface to an existing library or
framework, its very common to need to include other libraries and headers
as dependencies of the module. Under gyp, these must be specified manually
for each platform and architecture.

2. Integration with other build systems. Gyp is very much its own system
and doesn't play nice with existing builds. Common practice is to manually
convert the existing build to gyp, adding developer overhead and complexity.
While gyp is designed to generate build files, outside visual studio its
support is limited in the IDE space.

3. Turing completeness. Gyp is a strictly declarative build system. Any
conditional building is done through supported declarative syntax. For
complicated builds, this adds a lot of complexity and overhead for something
as simple as handing build conditions outside of architecture and platform (
Optional libraries, plugin based builds, nested conditions, etc.)

4. Depdencies. Gyp requires python to run, which is non-trival under windows,
and is a constant source of frustration and configuration issues for those
users.

And probably the most important of all:

4. Future stability. Google has rapidly been migrating v8 to 
[gn](https://chromium.googlesource.com/chromium/src/tools/gn/), leaving the
future of gyp and its supportability questionable. Its clear that if gyp is 
to remain, node will likely have to take ownership of the project, as all of 
google's resources have been diverted to improving gn. Its also been made 
clear that gn isn't really intended to be used outside of chromium and isn't
being exposed. Throw [bazel](http://bazel.io/) in the mix, and even gn's 
future is unstable.

node-cmake addresses these concerns by providing a node module build system
built on top of [CMake](https://cmake.org). CMake, like gyp, is a meta-build 
system, generating build files for the actual build tools and
IDEs on each platform. It does this by using its own platform agnostic and
turing complete syntax for describing the build process in general terms,
and converting that syntax to the correct build instructions.

CMake has long been a counter-argument and 
[competitor](https://gyp.gsrc.io/docs/GypVsCMake.md) 
to gyp. While the arguments outlined there are well reasoned, there are many
arguments as to why CMake is good build system for cross platform builds:

1. No dependencies. All that is required to use CMake is to install it, and
whatever build environment is necessary for your platform (typically,
visual studio / xcode / gcc). 

2. Library search. CMake provides a cross-platform and standardized way to
find and link against external libraries, both those built with CMake and
those built with other systems. It provides sensible defaults and looks in
standard, correct places on each platform, and can be tuned for specific
edge cases. If a library builds with CMake, their builds can be combined
to build dependencies along with the main code.

3. Stability and Integration. CMake has been in development far longer than
gyp, and strives to maintain backwards compability across releases. Its an
independent project that is used by a large number of big name projects
and will be supported for a long time. It receives regular updates that
improve and add functionality to make building more consistent, and to
address changes to platform specific variations and complexity. It also
nicely integrates with visual studio, xcode and especially IDEs like
Jetbrain's CLion IDE and KDevelop, which use CMake as their native build
environment.

This project is similar in goals to 
[cmake-js](https://www.npmjs.com/package/cmake-js), with one major difference.
Where that project has a node-centric focus, node-cmake relies strictly on
CMake to download and configure node for building native extensions. This
is done to support capabilites that are hard or impossible to integrate with
`cmake-js`, namely toolchain support for cross-platform builds, and integration
with other cmake projects and build environments (like catkin for ROS), which
don't know about or potentially need a node interpreter to build.

node-cmake is designed to provide full parity with `node-gyp` outside of
the names and arguments of binaries; modules will still need to be updated to
use it, but all of `node-gyp`'s capabilities are supported.

## Usage

To use this package, add the module `node-cmake` to your package.json
as a development dependency:

    npm install --save-dev node-cmake

Then add a `CMakeLists.txt` file to the root of your module that contains
the following at a minimum (\<REPLACE\> with your own definitions):

```CMake
cmake_minimum_required(VERSION 3.1)

project(<NAME OF MODULE>)

list(APPEND CMAKE_MODULE_PATH 
    ${CMAKE_CURRENT_SOURCE_DIR}/node_modules/node-cmake
)

find_package(NodeJS)

add_nodejs_module(${PROJECT_NAME} <SOURCE AND HEADER FILES GO HERE>)
```

The `CMakeLists.txt` file is the main build script for CMake, and has the
same purpose as the `binding.gyp` file in `node-gyp`.

The `list(APPEND ...)` command tells CMake how to find the FindNodeJS.cmake
script and must point to the directory containing this file. As written
the variable `${CMAKE_CURRENT_SOURCE_DIR}` is a CMake variable referring to
the directory that contains the `CMakeLists.txt` file being processed, or in
this case, the root directory of your module. Since npm will install the 
`node-cmake` dependency underneath the `node_modules` directory, this tells
CMake to look in the directory of this module for other scripts.

The `find_package` command tells CMake that we want to find node as a
dependency of our project. This command optionally takes arguments which
are specified below. Typically, these arguments shouldn't be used unless
necessary, to provide maximum flexibility for version and variant builds.

Due to the complexity of creating a node module, and the strict requirements
about the naming and placement of the shared library, node-cmake provides
a CMake function for creating a node module, `add_nodejs_module`, similar to 
the `add_executable` and `add_library` commands native to CMake. This command 
ensures that the built shared library uses the correct build settings and 
flags on each platform. It creates a shared library `target`, specified by the
first argument, that can be used identically to any other CMake `target`. In
the example above, the target will be called '\<NAME OF MODULE\>' 

CMake has extensive documentation online, which can be
found [here](https://cmake.org/documentation) for various versions of CMake.
node-cmake REQUIRES CMake >= 3.1, but any newer version is also supported.

## Nan Support

To simplify building of cross-version node modules, 
[Nan](https://github.com/nodejs/nan) is always included as a project 
dependency. In your module native sources, just

```C++
#include <nan.h>
```

At the top of any header/source file that requires this functionality.
The version included with node-cmake will always be the newest available
version of Nan. To use your own version, specify it as a dependency of your
module:

    npm install --save-dev nan

This version will be used instead of the dependency specified by node-cmake.

## Building

node-cmake can be built by invoking CMake with its usual syntax, optimally
using an out-of-source build folder. This involves creating a folder,
navigating to that directory, and then running the `cmake` executable, with
an arugument to the folder containing the root `CMakeLists.txt`:

    mkdir build
    cd build
    cmake ..

To simplify integration with npm, this module provides an executable script
called 'ncmake' that automates this process. Adding the following section:

```JSON
"scripts": {
    "install": "ncmake --build"
}
```

to your `package.json` is typically all that is required to build. Additonal
flags and options that can be passed to ncmake are outlined below. If you
add additional non-optional arguments to this command, you MUST specify the
build directory as the last argument (typically `out`).

Once you've added this to your module, just run `npm install` to build.

## Running

node-cmake also provides a simple javascript module to simplify the 
finding and loading of the built native module in your own scripts. It exposes
a single function similar to `require` with the same effects. Calling

```JavaScript
require('node-cmake')('<NAME OF MODULE>')
```

will return the native module to you if it can be found in the standard
locations used by this module for building. This function handles loading
the correct module for your platform and architecture, and searches both
multiple build paths and mulitple configuration paths to find the
native library. Additional options can be passed to this function to control
these search parameters; see the `index.js` file in this directory for
more information.

## Variants

node-cmake supports the concept of variants to allow building modules for
alternate node environments, such as

* [IO.js](https://iojs.org) - Now merged back into node (legacy support)
* [NW.js](http://nwjs.io)
* [Electron](http://electron.atom.io)

These variants can be specified using their short names to `ncmake` using the
`-s` flag. If a variant is specified, a version MUST also be specified using
the `-v` flag.

* Electron = electron
* IOJS = iojs
* NW.js = nw
* Node = node

Variants are stored in the `variants` folder and can be easily added or
updated. If you are an owner of a variant and would like to request
modifications or removal, or would like to add your own, please issue a
pull request or feature request to that effect.

## Versions

Each variant maintains their own version range, which is handled properly
by the variant. Versions are specified without the leading 'v' prefix, and
must specify all three components:

    [MAJOR].[MINOR].[PATCH]

Two additional version 'shortcuts' are supported, which
have logical effects:

* latest    - Use the latest version for a variant. Requires downloading an 
              additional file to determine this at runtime.
* installed - Only applies to the default 'node' variant; uses the 
              version of the running node interpreter.

## Example

An example project is provided in the `example` folder. Follow the directions
in its README.md to build it correctly.

## NCMake Manual

    ncmake [options] [build_directory]

    Create a build directory for CMake, run the CMake configuration, and
    optionally build the project.

    This command can non-option arguments. If no non-option arguments are
    specified, the default build directory is assumed (out). If any
    non-option arguments are specified, the build directory relative to the
    current working directory MUST be specified as the last argument.

    Options (All case insensitive):

    --config      Set the build configuration. Can be one of 'MinSizeRel',
                  'RelWithDebInfo', 'Release' or 'Debug'; or a custom
                  CMake build type. See the CMake documentation for more
                  information.

                  Default: MinSizeRel

    --build       Build the project in addition to configuration

    --clean-first Clean the project before building

    --target      Build the specified target. Used for building specific
                  modules, components and libraries. See the CMake
                  documentation for more information.

    -C <STD>      Set the C++ standard to <STD> level. Can be one of
                  (98, 11, 14). 

                  Default: Unset, which uses the default level defined by CMake
                  or the version required by the variant/version being built.

    -Z/-NZ        Force the node sources required for building the module to
                  be / not be downloaded. Useful if you want to use downloaded
                  sources instead of the ones included on your platform. On
                  some platforms/variants, sources must always be downloaded.

    -G <NAME>     Set the CMake generator name. See the CMake documentation for 
                  more information. Used primarily on windows to specify the 
                  version of visual studio to build with (if not the default)

                  Default: Unset

    -T <NAME>     Set the toolset name for the generator. Used by some
                  generators to configure the compiler used to build the
                  sources.

                  Default: Unset

    -S <VARIANT>  Set the variant to build the module for. Used when
                  building the module for variants other than Node.js

                  Default: node

    -V <VERSION>  Set the version of the variant to build against. Must
                  be specified when the variant is specified. Can also
                  be the special versions 'installed' and 'latest' when
                  appropriate.

                  Default: installed

    Advanced Options (All case insensitive):

    -A <ARCH>     Set the target architecture for the node module. Useful
                  when cross-compiling. Can be any valid output from
                  'process.arch'

                  Default: process.arch

    -P <PLATFORM> Set the target platform for the node module. Useful when
                  cross-compiling. Can be any valid output from
                  'process.platform'

                  Default: process.platform

## find_package Manual

This is an advanced configuration and is primarily supported for exotic
builds strictly in CMake. Generally, this functionality should not be used,
relying on `ncmake` to build via npm.

The NodeJS find_package command uses the VERSION and COMPONENTS arguments
to support build-defined versions and variants. 

Specify the version immediately after `NodeJS` to hard-code a version 
requirement:

```CMake
find_package(NodeJS 0.12.7)
```

To specify a variant, use ONE of the variant keywords above in all caps:

```CMake
find_package(NodeJS 0.12.3 COMPONENTS NWJS)
```

The version must always be specified when using a component.
 