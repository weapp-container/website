---
id: "components"
title: "组件与模板兼容性"
section: "API 参考"
summary: "查看 WXML、WXSS、组件关系和交互能力的记录边界。"
route: "/docs/components/"
locale: "zh-CN"
---

模板与组件

<a id="component-and-template-compatibility"></a>
# 组件与模板兼容性

**简体中文** · [English](components.en.md)


打包工具转换模板和样式，运行时负责渲染。组件的实际表现需要结合模板结构、API 和目标平台验证。

<a id="templates"></a>
<a id="wxml-and-wxss"></a>
## WXML 和 WXSS

独立 pack 工具将小程序产物中的 WXML、WXSS 转换成运行时读取的模板 IR 和样式资源。应用可以继续使用自己的小程序开发工具，具体命令见[打包现有小程序](/docs/pack/#own-miniapp)。当前 API 分组目录列出 WXML、WXSS、自定义组件与 slot；不同标签、指令和样式属性需单独验证，当前记录不代表完整微信小程序模板兼容。

<a id="events"></a>
<a id="event-binding"></a>
## 事件绑定

接口清单包含 `bindtap`、`catchtap`、dataset 和 capture-bind 入口。宿主输入经测量好的视图坐标送入渲染 surface，事件中的 page/component target 取决于实际文档树。Android 多指针、iOS one-contact 和 Desktop/Web 输入形态分别记录，宿主滚动协同不跨平台外推。

<a id="component-api"></a>
<a id="component-relationships-and-selection"></a>
## 组件关系与选择

- `Page.selectComponent`
- `Page.selectAllComponents`
- `Component.selectComponent`
- `Component.selectAllComponents`
- `Component.selectOwnerComponent`
- `Component.relations`
- `Component.getRelationNodes`
- `Component.hasBehavior`
- `Component.triggerEvent`

完整名称见 API 分组。嵌套父子关系、owner 向上查找、selector query 的执行时机及组件事件数据需以对应案例和平台实现为准。

<a id="custom-elements"></a>
<a id="custom-component-resources"></a>
## 自定义组件资源

编译结果需要包含组件描述、静态模板、样式表、slots 与 dependencies，且通过 portable pack 的闭包和 SHA-256 校验。支持状态与编译产物格式是两个不同的合约：missing dependency 或无法解析的 runtime schema 应作为打包错误处理，而不是在业务端延迟吞掉。

<a id="examples"></a>
<a id="inspect-recorded-examples"></a>
## 查阅实际案例

[模板事件绑定](/docs/api/event-bindings/) · [组件选择](/docs/api/component-selection/) · [组件关系](/docs/api/component-relations/) · [组件事件](/docs/api/component-events/)
