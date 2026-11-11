# Swift/UIKit host

The app consumes the exact installed Swift package in `.runtime/sdk/ios`, embeds
the native Metal view and owns UIKit text dialogs, state persistence and async
close. `node tools/native-consumer-build.mjs --platform ios` generates its Xcode
project and compiles for the simulator without signing. The result is a compile
check; device IPA signing and actual simulator/device execution are independent.
