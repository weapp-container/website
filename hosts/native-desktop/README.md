# C++ native hosts

CMake consumes `WeappContainer::Desktop` from an exact installed SDK prefix.
macOS uses AppKit/Metal, Windows uses Win32/WGL and Linux uses GTK3/OpenGL.
Each UI retains its event loop until the SDK emits `Closed`; JSON demo state
and native text editing use the shared fenced bridge protocol.

Run `node tools/native-consumer-build.mjs --platform macos|windows|linux`.
The app receives the verified shared pack directory as its only CLI argument.
The runtime's compiled policy independently rejects arbitrary packs. Build/link,
GUI execution, actual GPU and operating system signing remain separate checks.

The nlohmann JSON header is MIT licensed. Its original version, source and byte
hash are retained in `third_party/nlohmann/SOURCE.json` with its license.
