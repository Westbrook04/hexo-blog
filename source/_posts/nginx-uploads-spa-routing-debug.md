---
title: Nginx 反向代理静态上传文件踩坑：/uploads 被前端路由吃掉
date: 2026-05-22 17:20:00
tags:
- Nginx
- Node.js
- 部署复盘
- 问题排查
categories: 技术实践
---

这次给讯敏官网处理上传图片访问问题时，现象看起来很怪：图片 URL 明明是对的，服务器上的图片文件也确实存在，但浏览器打开之后出来的不是图片，而是整个官网首页。

一开始如果只盯着后端代码，很容易怀疑是 Express 静态目录没配对，或者上传接口返回的地址有问题。但这次真正的问题不在 Node 服务，而在 Nginx 对 `/uploads` 的路由匹配上。

## 现象

项目后端使用 Express 提供上传文件访问：

```js
app.use('/uploads', express.static(uploadRoot))
app.use('/api/uploads', express.static(uploadRoot))
```

上传接口返回的图片地址也是标准的相对路径：

```js
url: `/uploads/images/${req.file.filename}`
```

本地直接访问后端端口时，图片能正常打开，例如：

```text
http://127.0.0.1:3000/uploads/images/xxx.jpg
```

但通过正式域名访问时：

```text
https://www.xunminxinxis.com/uploads/images/xxx.jpg
```

返回的却是官网首页，而不是图片。

## 先判断问题在哪一层

这个问题其实可以很快分层定位。

如果下面两个地址结果不同：

```text
http://127.0.0.1:3000/uploads/images/xxx.jpg
https://www.xunminxinxis.com/uploads/images/xxx.jpg
```

并且前者能打开图片，后者却回到了首页，就说明：

- 后端服务本身没问题
- 图片文件也确实存在
- 问题发生在域名入口这一层
- 也就是 Nginx 或宝塔站点配置把这个请求转走了

这一步很关键。很多排查会在后端代码里绕很久，但实际上只要对比“直连后端”和“走域名入口”的结果，就能立刻判断是服务问题还是代理问题。

## 根因

根因是：`/uploads` 没有被 Nginx 以更高优先级命中，结果请求被前端单页应用的站点规则接住了，最后回退到了 `index.html`。

单页应用部署时，站点里经常会有类似这种规则：

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

这条规则的作用是：

- 如果请求的是真实静态文件，就返回文件
- 如果请求的路径在磁盘上不存在，就回退到 `index.html`
- 这样前端路由比如 `/news/1`、`/product/2` 才能正常刷新

问题就在这里。

对于 Nginx 来说，`/uploads/images/xxx.jpg` 这个路径如果没有被更明确的 `location` 先接住，就可能继续走站点默认规则。当前端站点根目录下并没有这个文件时，`try_files` 就会把它回退到 `/index.html`，于是浏览器看到的就不是图片，而是官网页面。

## 为什么加了 `location /uploads/` 还不一定够

这次继续排查时发现，即使已经有下面这段配置，也还是可能不生效：

```nginx
location /uploads/ {
    proxy_pass http://127.0.0.1:3000;
}
```

原因有两个常见点。

第一，`/uploads` 和 `/uploads/` 不是完全一样的请求。

如果访问的是 `/uploads`，而 Nginx 只配置了 `/uploads/`，就不一定能按预期落到这条规则里。

第二，没有使用 `^~` 时，其他规则仍然可能继续参与匹配，尤其是站点里还有更宽泛的 `/` 规则，或者有别的正则规则时，最终结果可能不是你以为的那条。

这次最终修复时，核心就是把 `/api/` 和 `/uploads/` 都明确成高优先级前缀匹配，同时把 `/uploads` 本身做一次重定向。

## 最终可用配置

最后使用的配置如下：

```nginx
location = /uploads {
    return 301 /uploads/;
}

location ^~ /api/ {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location ^~ /uploads/ {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location / {
    try_files $uri $uri/ /index.html;
}
```

这几条配置背后的作用分别是：

- `location = /uploads`：把不带斜杠的 `/uploads` 统一跳到 `/uploads/`
- `location ^~ /uploads/`：告诉 Nginx，凡是以 `/uploads/` 开头的请求，优先走这条，不再继续拿去和别的模糊规则比
- `location ^~ /api/`：同理，所有接口请求都直接反向代理到 Node
- `location /`：只负责前端站点和单页应用回退

这样一来，职责边界就很清楚了：

- `/api/*` 归后端
- `/uploads/*` 归后端
- `/` 以及前端页面路由归静态站点

## 这次问题的本质

这次问题的本质不是“图片读不到”，而是“图片请求被当成了前端页面路由处理”。

也就是说，请求链路实际上变成了：

```text
浏览器请求 /uploads/images/xxx.jpg
        ->
Nginx 没有正确命中上传文件代理规则
        ->
落到前端站点 location /
        ->
try_files 找不到真实文件
        ->
回退到 /index.html
        ->
浏览器展示官网首页
```

所以从表现上看像是“地址没问题但图片打不开”，实际上返回值根本不是图片，而是一份 HTML 页面。

## 怎么快速验证是不是这个问题

以后遇到类似问题，我会优先用下面这套方法判断：

### 1. 先直连后端端口

例如：

```text
http://127.0.0.1:3000/uploads/images/xxx.jpg
```

如果能打开图片，说明 Express 静态目录和文件路径没问题。

### 2. 再访问正式域名

例如：

```text
https://www.xunminxinxis.com/uploads/images/xxx.jpg
```

如果这里回到首页，说明是 Nginx 入口层的问题。

### 3. 看返回内容类型

如果返回头是：

```text
Content-Type: text/html
```

那几乎可以确定你拿到的是网页，不是图片。

正常图片应该类似：

```text
Content-Type: image/jpeg
Content-Type: image/png
```

## 一个部署上的经验

前后端分离项目部署到 Nginx 时，不要只想着“前端能打开、接口能请求”就算结束了。像上传文件、下载文件、站点回退路由这些路径，实际上都是不同类型的流量，必须提前划清边界。

对这类项目来说，一般至少要明确好三类入口：

- `/api/` 给后端接口
- `/uploads/` 给后端静态文件
- `/` 给前端页面

只要这三类路径没有明确分开，后面就很容易出现：

- 接口被前端站点接住
- 静态资源被回退到首页
- 下载链接打开成网页
- 刷新子路由出现 404

## 总结

这次问题最后能解决，不是因为改了后端逻辑，而是因为把路由匹配顺序理清了。

真正要记住的是这两个点：

1. 直连后端能访问，走域名不能访问，优先查 Nginx
2. 单页应用的 `try_files ... /index.html` 很容易把本该给后端的路径吃掉

部署这类项目时，`/api/`、`/uploads/`、`/` 最好从一开始就单独配置清楚，不然后面排查时表面现象会很绕。
