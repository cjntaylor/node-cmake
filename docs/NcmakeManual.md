# ncmake Manual

Usage: `ncmake [options] <command>`

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