# NodeJS.cmake Manual

# Defaults

Default options used by the init function when not otherwise specified (via ncmake or via arguments to [nodejs_init](#nodejsinit--options--)):

```CMake
set(NODEJS_DEFAULT_URL https://nodejs.org/download/release)
set(NODEJS_DEFAULT_VERSION installed)
set(NODEJS_VERSION_FALLBACK latest)
set(NODEJS_DEFAULT_NAME node)
set(NODEJS_DEFAULT_CHECKSUM SHASUMS256.txt)
set(NODEJS_DEFAULT_CHECKTYPE SHA256)
```

# Functions

## `nodejs_init([options])`

Configures the version of Node.js to use when running the build. Downloads required dependencies (headers, libraries) from a distribution server and configures
a number of variables for use in other functions.

#### Arguments

All options can be overridden on the command line via `NODEJS_<OPTION>` properties passed to CMake. [ncmake](NcmakeManual.md) sets these via its command line flags.

* **URL** - The location of the distribution server to download dependencies from. Expects a layout similar to the one used by Node.js. (Default: [https://nodejs.org/download/release](https://nodejs.org/download/release))
* **NAME** - The name of the main binary for the Node.js variant. (Default: `node`)
* **VERSION** - The version of Node.js (or variant) to build against. Typically starts with a `v` followed by semver (e.g. v6.4.0). Two special version strings can be used:
    * **installed** - Use the currently installed version of Node.js (Default)
    * **latest** - Interrogate the server for the latest version of Node.js. Requires that the distribution server has a `latest` folder at the same level as the other version specific folders
* **CHECKSUM** - The name of the checksum file to download from the distribution server. (Default: `SHASUMS256.txt`)
* **CHECKTYPE** - The type of checksum used by the checksum file. See the CMake `file(DOWNLOAD)` documentation for options. (Default: `SHA256`)

#### Output

Sets the following variables:

* **NODEJS_VERSION** - The resolved version of Node.js to use
* **NODEJS_SOURCES** - A list of required sources to link into native modules
* **NODEJS_INCLUDE_DIRS** - The set of include directories for native modules
* **NODEJS_LIBRARIES** - The set of dependencies required for native modules
* **NODEJS_LINK_FLAGS** - Link flags to set when building modules
* **NODEJS_DEFINITIONS** - Compile definitions to set when building modules

#### Example

```CMake
nodejs_init(
    URL https://atom.io/download/atom-shell
    NAME iojs
    VERSION v1.3.4
)
```

Configures the system to build Node.js modules compatible with electron, version 1.3.4.

## `add_nodejs_module(<NAME> <SOURCES>...)`

Creates a new CMake `target` to build a node native module (shared library) from the provided sources. The `<NAME>` target can be used like any other shared library target produced by `add_library`. The target is pre-configured to use the output variables of [nodejs_init](#nodejsinit--options--) to build the module against the configured version of Node.js.

#### Arguments

* **`<NAME>`** The name of the module to create. Exposed to the build as the define `MODULE_NAME`since this much match exactly to the parameter passed to `NODE_MODULE`
* **`<SOURCES>...`** The list of sources to build into the module. All parameters after the name are treated as additional arguments to `add_library`, see the CMake documentation for details.

#### Output

A new `target` named `<NAME>` that builds the node module.

## `find_path_parent(<NAME> <BASE> <PATH>)`

Finds a path suffix `<NAME>` by searching upward from `<BASE>`, setting the
variable `<PATH>` to the result (or False if not found).

#### Arguments

* **`<NAME>`** - The path suffix to search for
* **`<BASE>`** - The path to start searching from
* **`<PATH>`** - The name of a CMake variable to set to the result

#### Output

The found path, or False

#### Example

```CMake
find_path_parent(
    node_modules
    ${CMAKE_CURRENT_SOURCE_DIR}
    NODE_MODULES_PATH
)
```

Sets `${NODE_MODULES_PATH}` to the closest `node_modules` folder relative to `${CMAKE_CURRENT_SOURCE_DIR}`, starting from `${CMAKE_CURRENT_SOURCE_DIR}` moving upward (parent directory).

## `find_nodejs_module(<NAME> <BASE> <PATH>)`

A shortcut for `find_path_parent(node_modules/<NAME> <BASE> <PATH>)`

# Internal Functions

## `nodejs_generate_delayload_hook()`
## `download_file()`

Internal functions used by `nodejs_init`.