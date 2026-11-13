---
id: "components"
title: "Components and templates"
section: "API reference"
summary: "WXML, WXSS, component relations, and interaction compatibility boundaries."
route: "/docs/components/"
locale: "en"
---

TEMPLATES AND COMPONENTS

<a id="组件与模板兼容性"></a>
# Component and template compatibility

[简体中文](components.md) · **English**


The packaging tool converts templates and styles and is responsible for rendering at runtime. The actual performance of the component needs to be verified in combination with the template structure, API and target platform.

<a id="templates"></a>
<a id="wxml-和-wxss"></a>
## WXML and WXSS

The independent pack tool converts WXML and WXSS in the mini-program product into template IR and style resources that are read at runtime. Applications can continue to use their own mini-program development tools. For specific commands, see [Packaging existing mini-programs](/en/docs/pack/#own-miniapp). The current API group directory lists WXML, WXSS, custom components and slots; different tags, instructions and style attributes need to be verified separately, and the current record does not mean that the complete WeChat mini-program template is compatible.

<a id="events"></a>
<a id="事件绑定"></a>
## Event Binding

The interface list includes `bindtap`, `catchtap`, dataset and capture-bind entries. The host inputs the measured view coordinates into the rendering surface, and the page/component target in the event depends on the actual document tree. Android multi-pointer, iOS one-contact and Desktop/Web input forms are recorded separately, and host scrolling collaboration does not extrapolate across platforms.

<a id="component-api"></a>
<a id="组件关系与选择"></a>
## Component relationships and selection

- `Page.selectComponent`
- `Page.selectAllComponents`
- `Component.selectComponent`
- `Component.selectAllComponents`
- `Component.selectOwnerComponent`
- `Component.relations`
- `Component.getRelationNodes`
- `Component.hasBehavior`
- `Component.triggerEvent`

See the API group for the full name. The nested parent-child relationship, owner upward search, selector query execution timing and component event data must be subject to the corresponding case and platform implementation.

<a id="custom-elements"></a>
<a id="自定义组件资源"></a>
## Custom component resources

The compilation result needs to include component description, static template, style sheet, slots and dependencies, and pass the closure of portable pack and SHA-256 verification. Support status and compilation product format are separate contracts: missing dependencies or unresolved runtime schema should be handled as packaging errors, rather than being delayed on the business side.

<a id="examples"></a>
<a id="查阅实际案例"></a>
## Inspect recorded examples

[Template event binding](/en/docs/api/event-bindings/) · [Component selection](/en/docs/api/component-selection/) · [Component relationship](/en/docs/api/component-relations/) · [Component event](/en/docs/api/component-events/)
