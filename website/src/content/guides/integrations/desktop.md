---
id: "integrations/desktop"
title: "C++ Desktop"
section: "平台集成"
summary: "用 C++ Session、原生子视图与平台呈现器接入桌面。"
route: "/docs/integrations/desktop/"
locale: "zh-CN"
---

桌面 / C++17

<a id="c-desktop-sdk-integration"></a>
# C++ Desktop SDK 接入

**简体中文** · [English](desktop.en.md)


macOS、Windows 与 Linux 的 C++ SDK 提供 typed Session、事件回调、固定 pack source 和原生 child View API。

<a id="requirements"></a>
<a id="build-requirements"></a>
## 编译目标

要求 C++17 编译器与 CMake 3.21+。macOS 最低 12.0，平台呈现使用 AppKit/Metal；Windows 10 x64 适配器使用 C++20；Linux 的运行基线为 Ubuntu 22.04、glibc 2.35、GTK 3.24 和 OpenGL 3.3。目标系统必须有对应 runtime lock 和匹配架构。

在公开核心仓库的干净 checkout 根目录执行。完整环境、原生切片及许可步骤见[源码构建](/docs/engineering/weapp-container/docs/sdk-source-build/)。

下面构建 Apple Silicon macOS。其它 triple 与目标配对见源码构建页；Windows/Linux 必须在对应系统构建。

```bash
pnpm sdk:build:native -- --target aarch64-apple-darwin --profile release
pnpm sdk:licenses -- --target aarch64-apple-darwin
pnpm sdk:build:desktop -- --target macos-arm64 --pack artifacts/hello-pack --verify
```

Windows 与 Linux 桌面目标在相应操作系统上构建和验证。`--skip-consumer` 只打包，不证明真实 GUI surface 能启动。

<a id="cmake"></a>
<a id="link-a-cmake-consumer"></a>
## 连接 CMake consumer

```cmake
find_package(WeappContainerDesktop CONFIG REQUIRED)
target_link_libraries(my_app PRIVATE WeappContainer::Desktop)
```

SDK 提供 relocatable CMake exports。安装时同时保留 wrapper 文件、目标 platform runtime、C/C++ headers 与 runtime license。只将已授权的验证后目录发给目标用户。

<a id="session"></a>
<a id="session-and-native-view"></a>
## Session 和原生 View

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

创建 View 后等待实际布局为正，再调用 `load()`；GTK 在首次 layout 分配前加载会返回 `ERR_NOT_LAID_OUT`。SDK 安装会话定时器，通常不需要在每个 tick 调用 `pump()`。关闭后继续运行主循环并等待 `EventType::Closed`，再释放 View 和 Session。

<a id="main-api"></a>
<a id="main-apis"></a>
## 主要接口

**版本与发行状态**

Desktop wrapper 源码为 `0.1.0-preview.6.0`。当前 SDK runtime lock 有 macOS 与 Linux 条目，没有 Windows runtime；Showcase 状态为 macOS 桌面运行通过、Linux 部分通过、Windows 待运行。C++ 接口可见不代表对应平台 archive 已发行。

`Session::load`、`navigate`、`back`、`send_message`、`register_host_method`、`complete_host_call`、`set_foreground`、`set_metrics`、`snapshot` 与 `close`。`View` 提供原生句柄、边界与可见性更新。返回 Status 的操作必须始终检查错误码。
