<a id="react-native-展示"></a>
# React Native showcase

[简体中文](README.md) · **English**


This host uses the SDK Fabric native view and TurboModule. The demo runs inside the native engine; Metro supplies only the React Native host UI. Local state uses AsyncStorage and the versioned guest bridge. Android back and the close button await storage flush and native close.

Install the exact combined `react-native/android-ios` SDK to `.runtime/sdk/react-native`, then run `node tools/native-react-native-build.mjs --platform android` (or `ios`) from the repository root. Release Android uses Hermes and R8 with a dedicated signing key. iOS defaults to an unsigned simulator build and requires Xcode/CocoaPods.

The host scaffolding comes from the official React Native Community 0.88.0 template; see `TEMPLATE-ORIGIN.json` and `TEMPLATE-LICENSE`. The runtime dependency is local to the reviewed private SDK and does not fetch a source repository.
