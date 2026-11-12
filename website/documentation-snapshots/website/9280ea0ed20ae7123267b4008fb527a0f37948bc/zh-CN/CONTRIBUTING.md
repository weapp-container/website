<a id="participate-in-development"></a>
# 参与开发

**简体中文** · [English](CONTRIBUTING.en.md)


使用 Node.js 24.18+ 和仓库固定的 pnpm。运行 `pnpm install --frozen-lockfile`、
`pnpm runtime:public`、`pnpm test`、`pnpm exec tsc --noEmit` 和 `pnpm build`。
固定公开演示不需要 GitHub token；构建失败时不要关闭哈希或路径检查。

提交 API 文档变更时附上版本化接口和测试来源；没有平台覆盖证据的行为标为待核验。
请勿提交本机日志、凭据、设备标识、签名文件或原始内部发行归档。
新增下载资产必须使用新版本和精确哈希，保留第三方许可与来源。

提交 PR 即表示你有权按本仓库许可证贡献相关内容。
