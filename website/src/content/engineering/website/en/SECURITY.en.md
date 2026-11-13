---
id: "docs/engineering/website/security"
title: "Security Report"
section: "Project and maintenance"
summary: "Security Report. Versioned engineering reference from weapp-container/website."
route: "/docs/engineering/website/security/"
locale: "en"
sourceRepository: "weapp-container/website"
sourceCommit: "88b099619334a4fb751e7e9f089c6ee9d7ef60d5"
sourcePath: "SECURITY.en.md"
---

<a id="安全报告"></a>
# Security Report

[简体中文](/docs/engineering/website/security/) · **English**


Do not post vulnerability details, credentials, device information, or business data in public Issues.
Report vulnerabilities through the core repository's [GitHub Private Vulnerability Report](https://github.com/weapp-container/weapp-container/security/advisories/new)
Contact maintainers. Reports should include version, minimal reproduction, impact, and recommended fixes.

Network, pack, host message, and file access restrictions in the online demo are part of the security boundary.
Security patches must preserve release hash verification, same-origin policies, and credential isolation during downloads.
