Native Addon
============

The native addon, adjusted to use Nan for cross-variant compatibility, 
from the node.js documentation site for 
[Addons](https://nodejs.org/api/addons.html).

## Development Setup

This module requires node-cmake and is a part of node-cmake's distribution.
Now that node-cmake is published to npm, it is no longer necessary to
use `npm link` as the dependency can be directly downloaded.

However, this is the best way to test development changes to the project. 
From the root of this project run:

    npm link

Then, in this folder, run:

    npm link node-cmake

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