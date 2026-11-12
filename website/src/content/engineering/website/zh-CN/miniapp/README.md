---
id: "docs/engineering/website/miniapp/index"
title: "一包七宿主"
section: "项目与维护"
summary: "一包七宿主。来自 weapp-container/website 的版本化工程说明。"
route: "/docs/engineering/website/miniapp/index/"
locale: "zh-CN"
sourceRepository: "weapp-container/website"
sourceCommit: "43c9a0c31d57a75930742fe63c50e17045c3a206"
sourcePath: "miniapp/README.md"
---

<a id="one-pack-seven-hosts"></a>
# 一包七宿主

**简体中文** · [English](/en/docs/engineering/website/miniapp/index/)


Weapp 容器展示的本机 WXML/WXSS/CommonJS 应用程序。的
单条路线有探索、商店、点餐、产品、提包、结帐、订单
列表和订单详细信息屏幕。渲染表面遵循实际的宿主窗口尺寸。本地
`hostLayout` 安全插入和活动保留区域独立保护内容
背景的
。解析的物理栏边缘可实现侧边导航；
否则，相同的业务导航使用顶部和底部栏。滚动区域
重新计算
和 product/menu 列，而不替换会话。图像在本地捆绑。

源已使用本机 WeChat 文件格式。运行存储库的
`tools/build-miniapp.mjs` 使用经过审查的私有工具链来转换 JS 和
将冻结的本机文件传递给正式的 `container-pack` 工具。建设者
通过 `--project` 传递项目，因此 `container.config.json` 声明 Skia。
记录没有调用`weapp-vite`编译器；不指定编译器属性
执行或符合本机源包。不要创作便携式
用手显现。网站和每个本机宿主加载相同的经过验证的字节。

该示例没有使用子包或自定义块策略。这个小产品
目录受益于一种源和一种共享状态模型。容器设置
保持在标准 `app.json` 之外。没有上游编译器或运行时实现
被复制到此存储库中。

请参阅 [BRIDGE.md](/docs/engineering/website/miniapp/bridge/) 了解宿主输入、状态持久性、生命周期和启动
查询详情。订单和付款完全是模拟的。所有演示身份
和地址数据均为虚构；访问者应避免输入真实的个人数据。
