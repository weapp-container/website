# 网站构建、部署与回滚

开源准备仅交付源码，不更新现有网站。站点使用 Astro / React 和静态资源，演示由 Worker、QuickJS/WASM、CanvasKit 与 portable pack 组成。源码基本检查无需发行物凭据：

```sh
pnpm --ignore-workspace install --frozen-lockfile
pnpm --ignore-workspace test
pnpm --ignore-workspace exec tsc --noEmit
```

## 显式构建输入

完整站点需要构建器、审核字体、pack 和运行库。核心源码构建入口见[核心 README](https://github.com/weapp-container/weapp-container#readme)，站点各端工具见 [platforms](platforms.md)。现有 `platforms/web-runtime.pin.json` 及 SDK lock 锁定历史候选归档，安装器继续校验精确版本、大小、SHA-256、许可和 inventory。它们不会自动选择本地任意运行库或更改旧产物许可。

历史归档仍需原有访问权限；公开源码 CI 不运行这个下载流程。`Historical Web candidate (manual)`、原生和重组装工作流仅保留为手动入口，使用前必须准备匹配输入和必要凭据。新的开源运行库要先从源码构建、验证，再显式更新 pins；不得把旧的发布回执当作新构建结果。

`prepare-web.mjs` 准备固定输入，`pnpm build` 构建并由 `verify-site.mjs` 校验依赖闭包、字体覆盖、pack blobs、文件大小和公开文件边界。字体来源、子集步骤和 OFL 许可、前端依赖与照片来源均须保留。完整构建需要通过站点测试、类型检查及实际浏览器检查后才能部署。

## 发布与回滚

部署权限通过运行环境提供，不写入源码。发布者先保存前一版本和静态目录 inventory，在 staging 独立验证真实 Worker、会话退休、业务流程、中文输入、恢复、主题、折叠、旋转及性能，再发布并验证生产。设备预设、模拟器、真机、单元测试各自记录范围。

每次发布保存源码提交、工具链、运行库目录哈希、pack root、策略哈希、部署版本、上一版本和验收结果。失败样本保留，不能以 smoke 或自动重试替代失败的性能或交互门禁。回滚应选取已保存的精确部署版本和已验证静态快照。

历史部署 ID、原始性能样本和回执保存在[私有档案](archived-evidence.md)。公开页面的平台状态应依据新版本的独立验证更新。
