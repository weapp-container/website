---
id: "docs/engineering/weapp-container/security"
title: "Security Issue Report"
section: "Project and maintenance"
summary: "Security Issue Report. Versioned engineering reference from weapp-container/weapp-container."
route: "/docs/engineering/weapp-container/security/"
locale: "en"
sourceRepository: "weapp-container/weapp-container"
sourceCommit: "2c815f079426f3ff9910ed1433eb1f53b1961f3c"
sourcePath: "SECURITY.en.md"
---

<a id="安全问题报告"></a>
# Security Issue Report

[简体中文](/docs/engineering/weapp-container/security/) · **English**


Do not disclose exploitable vulnerabilities, credentials, or user data in public issue submissions. Report vulnerabilities privately via [GitHub Private Vulnerability Report](https://github.com/weapp-container/weapp-container/security/advisories/new) to maintainers; this feature should be enabled when the repository is made public.

The report includes affected commits, platform versions, minimal reproduction steps, impact, and recommended remediation. Remove tokens, personal directories, device identifiers, and business data. After verification by maintainers, coordination for patching and disclosure will proceed. No formal response time or long-term support commitments are provided for the current development version.

Mini-program code, host registration capabilities, and external resources fall within the security boundary. Deployers should restrict host privileges, network access, and file permissions, and adhere to validation and ownership agreements specified by each component.
