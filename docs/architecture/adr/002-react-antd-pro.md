# ADR-002 React 18 + Ant Design Pro

## 状态

`accepted`

## 背景

项目前端需要在企业微信 H5 中快速搭建管理型界面，并保持一定的响应式能力和工程规范。

## 决策

采用 React 18、Ant Design Pro、Redux Toolkit、RTK Query 作为前端基础栈。

## 影响

- 优点：组件和管理后台模式成熟，便于快速交付。
- 代价：移动端体验需做定向收敛，不能照搬桌面后台布局。
- 后续：优先用 RTK Query 管理服务端状态，避免自定义异步样板代码泛滥。
