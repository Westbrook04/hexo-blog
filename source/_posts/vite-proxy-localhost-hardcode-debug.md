---
title: Vite 本地开发代理踩坑：localhost:3000 硬编码导致的 failed to fetch
date: 2026-05-22
tags:
- Vite
- 前后端分离
- 问题排查
categories: 技术实践
---

部署完公司的讯敏官网之后，需要在本地开发后台管理面板。后端在阿里云服务器上正常运行，本地用 Vite 启动 admin 面板，并通过 proxy 把 `/api` 请求转发到远程服务器。

结果登录时直接报了 `failed to fetch`，一看控制台：

```
POST http://localhost:3000/api/admin/login net::ERR_CONNECTION_REFUSED
```

请求打到了本机的 3000 端口，而本机根本没有跑后端服务。

## 根因：DEV 模式下的地址硬编码

排查代码发现，`admin/src/lib/api.js` 里有一段逻辑：

```js
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV && typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:3000`
    : '')
```

这段代码的意思很直白：**开发环境下，API 地址直接拼成 `http://localhost:3000`**。请求变成绝对路径后，直接绕过了 Vite 的 proxy 配置，发向了本机 3000 端口。

而 Vite 的 proxy 配置本来是这样：

```js
proxy: {
  '/api': {
    target: 'https://www.xunminxinxis.com',
    changeOrigin: true,
    secure: false,
  },
},
```

期望的是浏览器请求 `/api/admin/login` 这个相对路径，Vite 开发服务器收到后转发到远程服务器。但由于 `API_BASE_URL` 被硬编码成 `http://localhost:3000`，fetch 拼接出来的是 `http://localhost:3000/api/admin/login`，走了直连，没走代理。

## 修复

去掉 DEV 模式的硬编码，让 API_BASE_URL 在开发环境下保持为空字符串，走相对路径：

```js
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''
```

修复后：
- **开发环境**：请求 `/api/admin/login` → Vite proxy 转发到远程服务器
- **生产环境（Nginx）**：请求 `/api/admin/login` → Nginx 反向代理到后端 3000 端口

两者行为一致，不再区分环境写死地址。

## 另一个小坑：HTTPS 代理证书验证

Vite 的 proxy 底层使用 `http-proxy`，默认会验证目标服务器的 SSL 证书。如果远程服务器用的是 Let's Encrypt 或其他证书，本地 Node.js 环境可能不信任，代理会静默失败。

需要在 proxy 配置加一句：

```js
secure: false
```

告诉 `http-proxy` 跳过证书验证。这只影响本地开发代理，生产环境走 Nginx 不受影响。

## 经验

前后端分离的项目中，API 地址的拼接方式看似小问题，但很容易在切换环境时踩坑。这次的问题本质上是一个原则：

> 开发环境下尽量使用相对路径，让代理工具（Vite proxy / Webpack devServer）去处理转发。不要在代码里根据环境硬编码绝对地址。

否则代理配得再好，请求压根没走代理，等于白配。
