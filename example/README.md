Native Addon
============

The native addon, adjusted to use Nan for cross-variant compatibility, 
from the node.js documentation site for 
[Addons](https://nodejs.org/api/addons.html).

## Setup

Since this requires node-cmake and its part of node-cmake's package,
`npm link` is required to provide the dependencies correctly. From
the root of this project run:

    npm link

Then, in this folder, run:

    npm link node-cmake

This must be done prior to trying to build this module, or it will fail

## Building

Once setup is complete, just run `npm install`. The module will build a
version appropriate to the system and architecture for your node executable.

## Running

This just exposes a module that directly exposes the native addon, dealing
with finding the correct module for the platform across different output
directories and build configurations.

A good way to validate that it is working is to run from this folder:

    node -p "require('./index').hello()"

If everything worked correctly, you should see it print "world".