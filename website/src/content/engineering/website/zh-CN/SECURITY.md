---
id: "docs/engineering/website/security"
title: "安全报告"
section: "项目与维护"
summary: "安全报告。来自 weapp-container/website 的版本化工程说明。"
route: "/docs/engineering/website/security/"
locale: "zh-CN"
sourceRepository: "weapp-container/website"
sourceCommit: "88b099619334a4fb751e7e9f089c6ee9d7ef60d5"
sourcePath: "SECURITY.md"
---

<a id="security-report"></a>
# 安全报告

**简体中文** · [English](/en/docs/engineering/website/security/)


请勿在公开 Issue 粘贴漏洞利用细节、凭据、设备信息或业务数据。
通过核心仓库的 [GitHub 私密漏洞报告](https://github.com/weapp-container/weapp-container/security/advisories/new)
联系维护者。报告请包含版本、最小复现、影响与修复建议。

固定在线演示的网络、pack、宿主消息和文件访问限制属于安全边界。
安全修复应保留发行哈希验证、同源限制及下载时的凭据隔离。
