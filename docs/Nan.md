# Nan support

To simplify building of cross-version node modules, [Nan](https://github.com/nodejs/nan) is always included as a project dependency. In your module native sources, just add:

```C
#include <nan.h>
```

node-cmake always depends on the newest version of nan and makes that package available. If you delcare your own version in your `package.json`, this version will be used instead.