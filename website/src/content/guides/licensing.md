---
id: "licensing"
title: "许可、下载与发行"
section: "发行与支持"
summary: "区分 SDK 源码许可、运行库许可、仓库访问和二进制发行授权。"
route: "/docs/licensing/"
locale: "zh-CN"
---

许可与发行

<a id="licensing-downloads-and-releases"></a>
# 许可、下载与发行

**简体中文** · [English](licensing.en.md)


源码许可、某个二进制归档的许可、仓库读取权限和平台验证结果是四项独立信息。请按实际使用的版本逐项核对。

| 对象 | 许可 | 访问与发行 |
| --- | --- | --- |
| weapp-container 核心源码 | 核心仓库当前源码采用 Apache-2.0；构建输出的许可随对应发行文件提供。 | 以 [核心仓库 LICENSE](https://github.com/weapp-container/weapp-container/blob/main/LICENSE) 为准。源码许可本身不授予其它仓库或归档的读取权。 |
| Android、iOS、Desktop、Flutter、React Native wrapper | 各 SDK 源码仓库附带 Apache-2.0 LICENSE。 | 源码和本地构建工具可按各自仓库说明取得。npm、pub.dev 或其它公共包服务是否发布，以实际包版本为准。 |
| 预编译 runtime、SDK 与 pack 归档 | 每个归档携带自己的 `RUNTIME-LICENSE`、LICENSE 与第三方 notices；不要用源码许可证替代归档许可。 | 精确版本、哈希和 release repository 记录在锁文件中。旧锁的 `weapp-container/showcase` 只用于读取其中固定的历史资产；新资产写入 `weapp-container/website`。仓库权限不自动授予使用或再分发权。 |
| Website 与固定在线演示 | 站点仓库中的源码许可见其根目录许可文件。演示 runtime 另外遵循实际发布归档携带的许可。 | `container.weapp.dev` 公开固定演示所需的同源文件，不提供通用 SDK、任意 pack 加载服务或 runtime CDN。 |
| 字体与照片 | Noto Sans SC 子集保留 OFL；摄影许可及来源记录在 `PHOTO-LICENSES.json`。 | 再使用前检查各资源自己的 notice 和许可。 |

<a id="download-access"></a>
<a id="repository-access-and-usage-rights"></a>
## 访问权限与许可分开

完整旧发行保存在私有的 `website-private-archive` 和 `runtime-artifacts-private-archive`，新下载器仅对冻结版本定向这些档案，旧锁字节与哈希不变。旧版下载器需要升级。当前公开演示仍附带 Noncommercial Runtime License；它与 Apache-2.0 源码发行分别管理。

GitHub token、仓库成员权限、镜像下载和拿到归档只解决访问，不会修改随归档提供的许可。反过来，源码采用 Apache-2.0 也不会自动开放私有 release、签名材料或已构建的应用。

<a id="binary-availability"></a>
<a id="current-validation-and-release-status"></a>
## 当前验证与发行状态

SDK wrapper 源码当前为 `0.1.0-preview.6.0`，共享协议包为 `0.1.0-preview.5.7`。锁定的 `restricted-showcase` SDK、runtime 和 pack 归档面向固定演示策略，不代表通用 SDK 产品发布。各平台的构建、安装、运行和签名分别显示在[平台状态](/docs/platforms/)中；只有锁中存在的 target 才能下载，未记录的状态不推断为已支持。

旧版 runtime 归档继续使用归档内的历史许可、哈希和发行记录。本次源码版本更新不会把旧二进制改标成新版本，也不会改写历史 release。

<a id="copyright"></a>
<a id="product-identification"></a>
## 产品标识

Weapp Container 是产品名称。仓库名用于定位源码或发行文件，不构成商标授权、商业使用批准或应用商店发布许可。
