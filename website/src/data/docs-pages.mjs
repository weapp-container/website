export const docsPages = [
  { path: '/docs/', title: '文档首页', section: '文档', summary: 'Weapp Container 开发文档、集成指南与 API 参考。' },
  { path: '/docs/start/', title: '快速开始', section: '开始使用', summary: '三步接入：生成独立测试包、选择 SDK、挂载视图并加载。' },
  { path: '/docs/architecture/', title: '运行架构与生命周期', section: '开始使用', summary: '了解 JS 引擎、Skia 呈现、宿主视图和会话资源的生命周期边界。' },
  { path: '/docs/pack/', title: '配置与 portable pack', section: '开始使用', summary: '用独立工具打包原生小程序或已有框架产物，配置能力并校验资源。' },
  { path: '/docs/integrations/', title: '接入方式', section: '平台集成', summary: '比较原生 Android、iOS、桌面、Flutter、React Native 和在线演示。' },
  { path: '/docs/integrations/android/', title: 'Android', section: '平台集成', summary: '以 Kotlin Session 与 View 将运行库嵌入 Android 应用。' },
  { path: '/docs/integrations/ios/', title: 'iOS', section: '平台集成', summary: '以 Swift Session 和 UIKit 视图接入 iOS。' },
  { path: '/docs/integrations/desktop/', title: 'C++ Desktop', section: '平台集成', summary: '用 C++ Session、原生子视图与平台呈现器接入桌面。' },
  { path: '/docs/integrations/flutter/', title: 'Flutter', section: '平台集成', summary: '通过 weapp_container Controller 和 Widget 接入五个平台。' },
  { path: '/docs/integrations/react-native/', title: 'React Native SDK 接入', section: '平台集成', summary: '通过 Fabric View 和 WeappContainerController 接入 Android 与 iOS。' },
  { path: '/docs/integrations/web/', title: 'Web 在线演示', section: '平台集成', summary: '了解固定在线体验的运行范围及通用 Web SDK 的当前状态。' },
  { path: '/docs/integrations/harmony/', title: 'HarmonyOS 示例', section: '平台集成', summary: '查看 ArkTS Showcase 示例与当前构建、安装和运行验证状态。' },
  { path: '/docs/sdk-api/', title: '宿主 SDK API', section: 'API 参考', summary: '跨平台 Session、Controller、View、事件和宿主消息 API 概览。' },
  { path: '/docs/api/', title: '小程序 API 与能力', section: 'API 参考', summary: '按能力组检索 API、宿主覆盖、引擎覆盖和 conformance 证据。' },
  { path: '/docs/api/capability-defaults/', title: '运行时默认能力', section: 'API 参考', summary: '查看运行时 manifest 能力默认值，以及尚无逐平台状态的条目。' },
  { path: '/docs/components/', title: '组件与模板兼容性', section: 'API 参考', summary: '查看 WXML、WXSS、组件关系和交互能力的记录边界。' },
  { path: '/docs/platforms/', title: '平台状态与支持边界', section: '发行与支持', summary: '按平台查看构建、安装、运行与签名状态。' },
  { path: '/docs/licensing/', title: '许可、下载与发行', section: '发行与支持', summary: '区分 SDK 源码许可、运行库许可、仓库访问和二进制发行授权。' },
  { path: '/docs/troubleshooting/', title: '故障排查', section: '发行与支持', summary: '排查 manifest、哈希、宿主生命周期、布局与渲染问题。' },
];

export const docsNavigation = [
  { title: '开始使用', paths: ['/docs/start/', '/docs/architecture/', '/docs/pack/'] },
  { title: '平台集成', paths: ['/docs/integrations/', '/docs/integrations/android/', '/docs/integrations/ios/', '/docs/integrations/desktop/', '/docs/integrations/flutter/', '/docs/integrations/react-native/', '/docs/integrations/web/', '/docs/integrations/harmony/'] },
  { title: 'API 参考', paths: ['/docs/sdk-api/', '/docs/api/', '/docs/api/capability-defaults/', '/docs/components/'] },
  { title: '发行与支持', paths: ['/docs/platforms/', '/docs/licensing/', '/docs/troubleshooting/'] },
];

const english = [
  ['Documentation', 'Documentation', 'Developer documentation, integration guides, and API references.'],
  ['Quick start', 'Get started', 'Create an independent test pack, choose an SDK, mount a view, and load the pack.'],
  ['Architecture and lifecycle', 'Get started', 'JavaScript engines, presentation, host views, and session resource ownership.'],
  ['Configuration and portable packs', 'Get started', 'Package native mini-programs or existing builds, configure capabilities, and verify resources.'],
  ['Integrations', 'Platform integrations', 'Compare Android, iOS, desktop, Flutter, React Native, and browser demonstrations.'],
  ['Android', 'Platform integrations', 'Embed Kotlin sessions and native views in Android applications.'],
  ['iOS', 'Platform integrations', 'Integrate Swift sessions and UIKit views.'],
  ['C++ Desktop', 'Platform integrations', 'Integrate C++ sessions, child views, and native presenters.'],
  ['Flutter', 'Platform integrations', 'Use Dart controllers and widgets across supported native targets.'],
  ['React Native integration', 'Platform integrations', 'Integrate Fabric views and controllers on Android and iOS.'],
  ['Web demonstration', 'Platform integrations', 'Understand the fixed browser demonstration and general Web SDK boundaries.'],
  ['HarmonyOS example', 'Platform integrations', 'Existing ArkTS example and its actual build, installation, and runtime status.'],
  ['Host SDK APIs', 'API reference', 'Sessions, controllers, views, events, and host messaging across SDKs.'],
  ['Mini-program APIs and capabilities', 'API reference', 'API names, host coverage, engines, and conformance evidence by capability group.'],
  ['Default runtime capabilities', 'API reference', 'Manifest defaults and entries without independent platform coverage records.'],
  ['Components and templates', 'API reference', 'WXML, WXSS, component relations, and interaction compatibility boundaries.'],
  ['Platform status and boundaries', 'Releases and support', 'Build, installation, runtime, and signing results by target.'],
  ['Licensing, downloads, and releases', 'Releases and support', 'Source licensing, archive terms, repository access, and binary availability.'],
  ['Troubleshooting', 'Releases and support', 'Diagnose manifests, hashes, lifecycle, layout, and rendering problems.'],
];
export function localizedDocsPages(locale) {
  return docsPages.map((page, index) => locale === 'en' ? {...page, path: `/en${page.path}`, title: english[index][0], section: english[index][1], summary: english[index][2]} : page);
}
export function localizedDocsNavigation(locale) {
  return docsNavigation.map((section, index) => ({
    ...section,
    title: locale === 'en' ? ['Get started', 'Platform integrations', 'API reference', 'Releases and support'][index] : section.title,
    paths: section.paths.map(path => locale === 'en' ? `/en${path}` : path),
  }));
}
