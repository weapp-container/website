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

要求 C++17 编译器与 CMake 3.21+。macOS 最低 12.0；Windows 10 x64；Linux Ubuntu 22.04、glibc 2.35、GTK 3.24 和 OpenGL 3.3。

从核心 prerelease 下载对应平台的 Desktop SDK 归档，核对 SHA-256 后解压。归档包含 C/C++ headers、运行库、许可和可迁移 CMake 配置，无需下载核心仓库源码。

| 平台 | 下载 | SHA-256 |
| --- | --- | --- |
| macOS universal | [SDK archive](https://github.com/weapp-container/weapp-container/releases/download/runtime-v0.1.0-preview.7.1/desktop-sdk-0.1.0-preview.7.1-macos-universal.tar.gz) | `51523e43c6d7298fbd6798e7de5a55b51428e0eaaa1818f70586b3d49ec16f65` |
| Linux x86_64 | [SDK archive](https://github.com/weapp-container/weapp-container/releases/download/runtime-v0.1.0-preview.7.1/desktop-sdk-0.1.0-preview.7.1-linux-x86_64.tar.gz) | `7bfcc4dbbf75334a6981f3a28c51a39607729423b443f9787db7ab46f75cc1cc` |
| Windows x86_64 | [SDK archive](https://github.com/weapp-container/weapp-container/releases/download/runtime-v0.1.0-preview.7.1/desktop-sdk-0.1.0-preview.7.1-windows-x86_64.tar.gz) | `81a185890d93f1806f2d15c4fcb51bade2ddd96640ce90827e9adde19306126f` |

维护者需要重建运行库或更新归档时，才按[维护者源码构建指南](/docs/engineering/weapp-container/docs/sdk-source-build/)构建并验证目标系统。

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

Desktop wrapper 源码为 `0.1.0-preview.7.1`；核心 prerelease 提供 macOS、Linux 和 Windows SDK tarball，三个目标的公开归档消费者均已通过。独立 `sdk-desktop` GitHub release 尚未发布，公开 CocoaPods Specs 中 macOS 固定归档 URL 返回 404。已发布 tarball 的 `WEAPP_DESKTOP_VERSION` 宏仍为 preview.6.0，而元数据和运行库为 preview.7.1；当前源码已修正，已发布字节保持不变。详见 [SDK 勘误](/docs/engineering/sdk-desktop/index/#published-preview-erratum)与[发行记录](/docs/licensing/)。当前仍是预览版，没有稳定版。

`Session::load`、`navigate`、`back`、`send_message`、`register_host_method`、`complete_host_call`、`set_foreground`、`set_metrics`、`snapshot` 与 `close`。`View` 提供原生句柄、边界与可见性更新。返回 Status 的操作必须始终检查错误码。
