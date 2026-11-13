---
id: "docs/engineering/website/docs/archived-evidence"
title: "历史交付与证据"
section: "验证与兼容性"
summary: "历史交付与证据。来自 weapp-container/website 的版本化工程说明。"
route: "/docs/engineering/website/docs/archived-evidence/"
locale: "zh-CN"
sourceRepository: "weapp-container/website"
sourceCommit: "c487eff31a98ca75905b66676909cde218e9fb42"
sourcePath: "docs/archived-evidence.md"
---

<a id="historical-delivery-and-evidence"></a>
# 历史交付与证据

**简体中文** · [English](/en/docs/engineering/website/docs/archived-evidence/)


开源源码快照保留维护文档、许可、测试输入和历史产物锁定信息。旧部署收据、设备采集、完整截图、二进制、符号及构建日志保存在维护者的私有归档，不包含在公开 Git 历史。

完整旧仓库使用私有的 `weapp-container/website-private-archive` 名称保留 GitHub
仓库身份、历史引用、Release 与 Actions。新的 `website` 使用独立身份，只接收审定
main 历史。新下载工具只将冻结版本定向私有档案，旧版工具需要升级。

`platforms/status.json`、固定 lock 和下列摘要描述历史候选，不代表当前源码重新完成了平台验收。已有产物的版本、SHA-256 和随附许可保持原样；开源版本需要单独从源码构建、验证和发版。

- [Duo 历史摘要](/docs/engineering/website/docs/duo-verification/)
- [Duo 全屏历史摘要](/docs/engineering/website/docs/duo-fullscreen-verification/)
- [部署流程](/docs/engineering/website/docs/deployment/)
