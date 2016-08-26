// hello.cc
#include <nan.h>

namespace demo {

NAN_METHOD(hello) {
  info.GetReturnValue().Set(Nan::New("world").ToLocalChecked());
}

NAN_MODULE_INIT(init) {
    NAN_EXPORT(target, hello);
}

NODE_MODULE(MODULE_NAME, init)

}  // namespace demo