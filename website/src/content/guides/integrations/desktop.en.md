---
id: "integrations/desktop"
title: "C++ Desktop"
section: "Platform integrations"
summary: "Integrate C++ sessions, child views, and native presenters."
route: "/docs/integrations/desktop/"
locale: "en"
---

Desktop / C++17

<a id="c-desktop-sdk-接入"></a>
# C++ Desktop SDK integration

[简体中文](desktop.md) · **English**


The C++ SDK for macOS, Windows, and Linux provides typed sessions, event callbacks, verified pack sources, and native child-view APIs.

<a id="requirements"></a>
<a id="编译目标"></a>
## Build requirements

Requires C++17 compiler and CMake 3.21+. macOS Minimum 12.0, platform rendering uses AppKit/Metal; Windows 10 x64 adapter uses C++20; Linux runs baseline Ubuntu 22.04, glibc 2.35, GTK 3.24, and OpenGL 3.3. The target system must have a corresponding runtime lock and matching architecture.

Execute in the clean checkout root directory of the public core repository. For the complete environment, native library slices and licensing steps, see [Build from source](/en/docs/engineering/weapp-container/docs/sdk-source-build/).

Build Apple Silicon macOS below. For other triple and target pairings, see the source code build page; Windows/Linux must be built on the corresponding system.

```bash
pnpm sdk:build:native -- --target aarch64-apple-darwin --profile release
pnpm sdk:licenses -- --target aarch64-apple-darwin
pnpm sdk:build:desktop -- --target macos-arm64 --pack artifacts/hello-pack --verify
```

Windows and Linux desktop targets are built and verified on the respective operating systems. `--skip-consumer` is only packaged and does not prove that the real GUI surface can be started.

<a id="cmake"></a>
<a id="连接-cmake-consumer"></a>
## Link a CMake consumer

```cmake
find_package(WeappContainerDesktop CONFIG REQUIRED)
target_link_libraries(my_app PRIVATE WeappContainer::Desktop)
```

The SDK provides relocatable CMake exports. The wrapper file, target platform runtime, C/C++ headers and runtime license are also retained during installation. Distribute the complete verified installation directory with its applicable license and notices.

<a id="session"></a>
<a id="session-和原生-view"></a>
## Session and Native View

```cpp
#include <weapp/desktop.hpp>
#include <stdexcept>

using namespace weapp::desktop;

struct MiniAppHost {
  std::shared_ptr<Session> session;
  std::unique_ptr<View> view;
  bool closed = false;

  static void check(const Status& status) {
    if (!status) throw std::runtime_error(status.code + ": " + status.message);
  }

  void attach(void* native_parent, const std::string& private_directory) {
    Config config;
    config.storage_root = private_directory;
    config.storage_key = "my-app/account-42";
    Status status;
    session = Session::create(config, status);
    check(status);
    view = View::create(session, native_parent, {0, 0, 360, 640}, status);
    check(status);
    session->on_event([this](const Event& event) {
      if (event.type == EventType::Closed) closed = true;
      // Handle Message, HostCall, and Error here; callbacks must not throw.
    });
  }

  void load(const std::string& verified_pack) { check(session->load(verified_pack)); }
  void begin_close() { check(session->close()); }
};
```

After creating the View, wait for the actual layout to be positive before calling `load()`; GTK will return `ERR_NOT_LAID_OUT` when loading before the first layout allocation. The SDK installs a session timer, which usually does not require calling `pump()` every tick. After closing, continue running the main loop and wait for `EventType::Closed` before releasing View and Session.

<a id="main-api"></a>
<a id="主要接口"></a>
## Main APIs

**Version and Release Status**

Desktop wrapper source code is `0.1.0-preview.6.0`. The current SDK runtime lock has macOS and Linux entries, but no Windows runtime; the Showcase status is macOS, desktop running passed, Linux partially passed, and Windows pending. Just because the C++ interface is visible does not mean that the corresponding platform archive has been released.

`Session::load`, `navigate`, `back`, `send_message`, `register_host_method`, `complete_host_call`, `set_foreground`, `set_metrics`, `snapshot` and `close`. `View` provides native handles, bounds and visibility updates. Operations returning Status must always check for error codes.
