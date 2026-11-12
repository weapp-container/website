---
id: "start"
title: "快速开始"
section: "开始使用"
summary: "三步接入：生成独立测试包、选择 SDK、挂载视图并加载。"
route: "/docs/start/"
locale: "zh-CN"
---

开始使用

<a id="quick-start"></a>
# 快速开始

**简体中文** · [English](start.en.md)


准备一个小程序包，在应用里放入 SDK 视图，再加载这个包。已有小程序可以继续使用自己的开发工具。

<a id="prepare-source"></a>
<a id="1-prepare-a-test-package"></a>
## 1. 准备一个测试包

先用独立示例跑通接入。安装 Node.js 24.x，执行下面三条命令即可，不需要安装 npm 依赖或小程序构建框架。

```bash
git clone https://github.com/weapp-container/sdk-contract.git
cd sdk-contract
node fixtures/make-acceptance-pack.mjs --out ../hello-pack
```

生成的 `hello-pack/` 包含 `manifest.json` 和 `blobs/sha256/`。示例页面提供点击计数、滚动和宿主消息，适合检查 SDK 是否接通。

已经有自己的小程序？直接阅读[打包现有小程序](/docs/pack/#own-miniapp)。原生 JS/WXML/WXSS 目录可直接作为打包输入；使用 TypeScript、Vue 或 React 时，先用现有工具生成小程序产物。

<a id="choose-host"></a>
<a id="2-add-sdk-to-the-application"></a>
## 2. 把 SDK 加到应用

按应用使用的语言或框架选择一份指南。各端都加载同一种 portable pack，平台页会说明安装 SDK 和放置 `hello-pack/` 的位置。

- [Android：Kotlin Session + 原生 View](/docs/integrations/android/)
- [iOS：Swift Session + UIKit](/docs/integrations/ios/)
- [桌面：C++ Session + 原生子视图](/docs/integrations/desktop/)
- [Flutter：Controller + Widget](/docs/integrations/flutter/)
- [React Native：Controller + Fabric View](/docs/integrations/react-native/)

<a id="create-session"></a>
<a id="3-mount-the-view-and-load-the-package"></a>
## 3. 挂载视图，加载包

1. 创建一个 Session 或 Controller，并注册需要的宿主方法。
2. 把 SDK 视图放进应用布局，提供明确的宽高。
3. 调用平台 SDK 的 `load`，传入应用资源中的包或本地包目录。

各平台的可复制代码见上面的集成指南。会话由页面或路由持有，避免每次界面重绘都重建。页面隐藏时通知前后台状态；结束使用时等待 `flushStorage` 和异步关闭。

**使用当前预览版**

测试包生成成功只代表输入已准备好。实际加载需要匹配版本的运行库。当前源码可从公开核心仓库构建，不需要历史归档凭据，详见[源码构建](/docs/engineering/weapp-container/docs/sdk-source-build/)。已有预编译归档的权限和许可证按各自发行处理；网站在线演示仅允许固定包，不能用来加载这里生成的测试包。详见[许可、下载与发行](/docs/licensing/)和[平台状态](/docs/platforms/)。

<a id="next-steps"></a>
## 下一步

- [打包自己的小程序、配置能力](/docs/pack/)
- [通过 SDK 导航和收发消息](/docs/sdk-api/)
- [查询小程序 API 与组件兼容性](/docs/api/)
- [加载失败时排查问题](/docs/troubleshooting/)
