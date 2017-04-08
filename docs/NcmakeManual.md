# ncmake Manual

Usage: `ncmake [options] <command> (-- [cmake options])`

Only a single command is interpreted. Options should precede the command but can occur in any order.

| **Command**   | **Description**
|:--------------|:--------------------------------------------------------
| `help`        | Shows the help dialog
| `build`       | Builds the native addon
| `clean`       | Cleans the build
| `distclean`   | Removes all build files
| `configure`   | Runs CMake to generate the project configuration
| `rebuild`     | Runs clean, configure and build
| `update`      | Copies the NodeJS.cmake from the installed module
| `install`     | Deprecated `node-gyp` command (no-op)
| `list`        | Deprecated `node-gyp` command (no-op)
| `remove`      | Deprecated `node-gyp` command (no-op)


## Command Options

`node-gyp` accepts the following command options:

| **Command**                       | **Description**
|:----------------------------------|:------------------------------------------
| `-d`, `--debug`                   | Make Debug build (default=Release)
| `-h`, `--help`                    | Shows the help dialog
| `--version`                       | Shows the version of ncmake

### Advanced options

| **Command**                       | **Description**
|:----------------------------------|:------------------------------------------
| `--target`                        | Node version to build for (default="installed")
| `--dist-url`                      | Download dependencies from custom URL
| `--name`                          | The executable target name (default="node")
| `-g`, `--generator`               | The CMake generator to use

#### CMake options

Additional options can be passed to CMake during any configure step by passsing a `--` separator
followed by any arguments. This is useful to set additional parameters (`-D` flags) unique to your project.

Ncmake translates several of its own options into `-D` flags passed to cmake. The default behaviour of cmake is that the last value passed via command line wins. Ncmake uses the flag `-DCMAKE_BUILD_TYPE`, which is set to ensure the binary output directory matches node-gyp's behaviour. If you override this property, ncmake makes no guarantee of proper execution. To ensure proper execution, use the `-d` flag to switch between `Debug` and `Release` output instead of setting the value directly. **YOU HAVE BEEN WARNED.**

### Deprecated options

All deprecated options are silently ignored

| **Command**                       | **Description**
|:----------------------------------|:------------------------------------------
| `-j n`, `--jobs n`                | Ignored
| `--silly`, `--loglevel=silly`     | Ignored
| `--verbose`, `--loglevel=verbose` | Ignored
| `--silent`, `--loglevel=silent`   | Ignored
| `--release`, `--no-debug`         | Default
| `-C $dir`, `--directory=$dir`     | Ignored
| `--make=$make`                    | Ignored
| `--thin=yes`                      | Ignored
| `--arch=$arch`                    | Ignored
| `--tarball=$path`                 | Ignored
| `--ensure`                        | Ignored
| `--proxy=$url`                    | Ignored
| `--cafile=$cafile`                | Ignored
| `--nodedir=$path`                 | Ignored
| `--python=$path`                  | Ignored
| `--msvs_version=$version`         | Ignored
| `--solution=$solution`            | Ignored

# Examples

    ncmake rebuild -d

Build the module in debug mode

    ncmake --target v6.2.1 rebuild

Build a module targeting `v6.2.1` of Node.js

    ncmake rebuild -- -DMY_PROJECT_ARG=10

Build a module, passing additional arguments directly to cmake.
