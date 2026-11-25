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

Requires a C++17 compiler and CMake 3.21+. macOS minimum is 12.0, Windows is 10 x64, and Linux uses Ubuntu 22.04, glibc 2.35, GTK 3.24 and OpenGL 3.3.

Download the matching Desktop SDK archive from the core prerelease and verify its SHA-256 before extracting it. Archives include C/C++ headers, runtime libraries, licenses and relocatable CMake configuration. A core source checkout is unnecessary.

| Platform | Download | SHA-256 |
| --- | --- | --- |
| macOS universal | [SDK archive](https://github.com/weapp-container/weapp-container/releases/download/runtime-v0.1.0-preview.7.1/desktop-sdk-0.1.0-preview.7.1-macos-universal.tar.gz) | `51523e43c6d7298fbd6798e7de5a55b51428e0eaaa1818f70586b3d49ec16f65` |
| Linux x86_64 | [SDK archive](https://github.com/weapp-container/weapp-container/releases/download/runtime-v0.1.0-preview.7.1/desktop-sdk-0.1.0-preview.7.1-linux-x86_64.tar.gz) | `7bfcc4dbbf75334a6981f3a28c51a39607729423b443f9787db7ab46f75cc1cc` |
| Windows x86_64 | [SDK archive](https://github.com/weapp-container/weapp-container/releases/download/runtime-v0.1.0-preview.7.1/desktop-sdk-0.1.0-preview.7.1-windows-x86_64.tar.gz) | `81a185890d93f1806f2d15c4fcb51bade2ddd96640ce90827e9adde19306126f` |

Maintainers rebuilding the runtime or updating archives should follow the [maintainer source build guide](/en/docs/engineering/weapp-container/docs/sdk-source-build/).

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

The Desktop wrapper source is `0.1.0-preview.7.1`; the core prerelease contains macOS, Linux and Windows SDK tarballs, and archive consumers passed for all three targets. The standalone `sdk-desktop` GitHub release has not been published, and the macOS archive URL in the public CocoaPods Specs returns 404. The published tarballs retain a stale preview.6.0 `WEAPP_DESKTOP_VERSION` macro while their metadata and runtimes are preview.7.1. Current source corrects it while published bytes remain immutable. See the [SDK erratum](/en/docs/engineering/sdk-desktop/index/#published-preview-erratum) and [release record](/en/docs/licensing/). This remains a prerelease with no stable version.

`Session::load`, `navigate`, `back`, `send_message`, `register_host_method`, `complete_host_call`, `set_foreground`, `set_metrics`, `snapshot` and `close`. `View` provides native handles, bounds and visibility updates. Operations returning Status must always check for error codes.
