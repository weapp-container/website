---
id: "integrations/react-native"
title: "React Native SDK 接入"
section: "平台集成"
summary: "通过 Fabric View 和 WeappContainerController 接入 Android 与 iOS。"
route: "/docs/integrations/react-native/"
locale: "zh-CN"
---

React Native / TypeScript

<a id="react-native-sdk-integration"></a>
# React Native SDK 接入

**简体中文** · [English](react-native.en.md)


React Native 包将原生 session 控制器通过 TurboModule 暴露给 TypeScript，并通过 Fabric 视图承载原生画面。

<a id="requirements"></a>
<a id="prepare-native-dependencies-from-current-source-code"></a>
## 从当前源码准备原生依赖

先从公开核心仓库及固定 SDK 子模块构建 Android/iOS 或对应 Desktop SDK，再生成本地 reviewed manifest。框架包装层会核验原生归档和安装收据，不会隐式下载匹配不明的历史二进制。[源码构建](/docs/engineering/weapp-container/docs/sdk-source-build/)提供完整打包、离线准备和框架构建顺序。以下示例使用该流程生成的本地 SDK。

<a id="create-view"></a>
<a id="1-install-sdk"></a>
## 1. 安装 SDK

使用 React Native 0.88.0 新架构、React 19.3.x 和 TypeScript 5.9.3。原生目标为 Android API 26+ 与 iOS 16+；Android 应用只启用 `arm64-v8a` 与 `x86_64`。

已有带原生依赖的 SDK 分发包时，在 React Native 应用中安装本地归档：

```bash
npm install /absolute/packages/weapp-container-react-native-0.1.0-preview.7.0.tgz
cd ios
pod install
```

将 `hello-pack/` 放到 Android 的 `android/app/src/main/assets/hello-pack/`，或作为完整资源文件夹加入 iOS target。SDK 归档获取与源码打包见[React Native SDK README](https://github.com/weapp-container/sdk-react-native/blob/main/README.md)；这里的文件名不表示 npm registry 已发布。

<a id="mount-load"></a>
<a id="2-create-controller"></a>
## 2. 创建 Controller

由页面或路由的初始化逻辑执行一次，使用 state/ref 保留实例：

```tsx
import {
  WeappContainerController,
  WeappContainerView,
  type ContainerEvent,
} from '@weapp-container/react-native';

const controller = await WeappContainerController.create({
  storage: {key: 'catalog/account-7'},
});
const unsubscribe = controller.subscribe((event: ContainerEvent) => {
  if (event.type === 'error') console.error(event.payload);
});
await controller.registerHostMethod('app.openProfile', async (payload) => ({
  profile: payload,
}));
```

<a id="controller-api"></a>
<a id="3-mount-the-view-and-load-it"></a>
## 3. 挂载视图并加载

将保留的 Controller 传给 JSX 中的视图：

```tsx
<WeappContainerView
  controller={controller}
  style={{height: 480, width: '100%'}}
  onSurfaceError={error => console.error(error.code, error.message)}
/>
```

视图挂载后调用加载；SDK 等待原生 surface 的有效布局：

```typescript
await controller.load({asset: 'hello-pack'});
```

结束功能时关闭会话：

```typescript
unsubscribe();
await controller.flushStorage();
await controller.close();
```

React effect cleanup 不能返回 Promise，应把异步关闭交给页面的会话管理逻辑；若创建期间组件已经卸载，新实例创建完成后应立即关闭。完整的 React 挂载与关闭处理见[示例 App.tsx](https://github.com/weapp-container/sdk-react-native/blob/main/example/App.tsx)。

<a id="release-consumer"></a>
## 控制器 API

- `create(configuration)`：使用稳定 storage key 或明确选择 memoryOnly。
- `registerHostMethod(name, handler)`：登记不占用 `wx.` 命名空间的宿主 handler。回调收到 AbortSignal。
- `load(source, options)`：从绝对本地目录或 app assets 加载已验证 pack。
- `subscribe(listener)`：订阅 ready、navigation、message、error、closed 和 presented 事件。
- `sendMessage`、`navigate`、`back`、`setForeground`、`state`、`capabilities`：驱动与观察会话。
- `flushStorage` 和 `close`：保证状态写回后关闭 native owner。

<a id="build-a-standalone-consumer"></a>
## 构建 consumer

**版本和授权状态**

`@weapp-container/react-native` 源码当前为 `0.1.0-preview.7.0`，采用 Apache-2.0。准备工具默认读取同版本公开锁，旧 preview.5.3 锁仅用于历史兼容。本地构建仍须核验配套原生输入；npm 发布、Android Central 依赖和双端公开消费尚未全部完成，见[发行记录](/docs/engineering/weapp-container/docs/public-sdk-release/)。

发行构建运行 TypeScript、React Native Codegen 和包文件审核。独立 consumer 消耗完整 npm archive 和预先准备的原生 SDK，不应该隐式依赖工作区内的核心运行时代码。

```bash
node tools/create-consumer.mjs \
  --package /absolute/path/authorized-sdk.tgz \
  --out /absolute/path/new-consumer
```

消费者生成成功只证明所指定的包和工程已准备完毕。独立 Android/iOS 编译、GPU 呈现、真机生命周期和发布签名各自另行记录。
