---
title: Java Web 考试复习笔记
date: 2026-05-24 20:45:00
updated: 2026-05-24 20:45:00
categories: 学习笔记
tags:
- Java Web
- Servlet
- JSP
- Cookie
- Session
---

这次整理了一份 Java Web 考试的复习笔记，涵盖了 Tomcat、Servlet、JSP、Cookie、Session、EL 表达式等核心知识点，把原本零散的思维导图重新梳理成了结构化的学习资料。

## Tomcat 基础

### 目录结构

- **bin/** — Tomcat 命令（启动/关闭）
- **conf/** — 配置文件（全局 web.xml 等）
- **lib/** — Tomcat 运行所需的 JAR 包
- **temp/** — 运行时临时文件（清空不影响运行）
- **webapps/** — 应用程序部署目录（支持文件夹、WAR、JAR）

### 全局 web.xml vs 应用 web.xml

在 Tomcat 中，web.xml 有两个主要位置：

1. **Tomcat 全局 web.xml**：位于 `tomcat/conf/` 目录下，定义全局配置信息，适用于所有部署在该 Tomcat 实例上的 Web 应用程序，例如默认的 Servlet 容器初始化参数、安全约束、会话管理等。
2. **Web 应用程序的 web.xml**：位于每个 Web 应用的 `WEB-INF/` 目录下，定义特定于该应用程序的配置信息，例如 Servlet、Filter、Listener 等组件的映射和参数。

> 应用程序级别的 web.xml 优先级更高，会覆盖全局 web.xml 中相同元素的配置。

### 注解配置替代 web.xml

```java
@WebServlet(name="/login", value="login")
```

## Servlet

### 工作流程

客户端请求 → Tomcat 接收 → 查找 Servlet → 调用 service() → 返回响应

![](/images/java-web-review/headers.png)

### 为什么一启动 Tomcat 就会索引到 index.jsp？

在 `apache-tomcat/conf/web.xml` 里面默认配置了欢迎页面列表，所以访问根路径时会自动映射到 welcome-file 列表中的文件。

![](/images/java-web-review/webxml.png)

### 编码处理（防止乱码）

**请求乱码**

```java
request.setCharacterEncoding("utf-8");
```

**响应乱码**

```java
response.setContentType("text/html;charset=UTF-8");
```

> IDEA 的编码方式也要注意。如果编辑器编码为 GBK，编写的文字全是 GBK 编码的，需统一为 UTF-8。

![](/images/java-web-review/idea-encoding.png)

## JSP

### JSP 工作流程

JSP → 翻译为 Servlet (.java) → 编译为 .class → 执行

### 脚本元素

| 语法 | 类型 | 说明 |
| --- | --- | --- |
| `<%-- --%>` | JSP 注释 | 客户端不可见 |
| `<!-- -->` | HTML 注释 | 客户端可见 |
| `<%! %>` | 声明脚本 | 声明成员变量/方法 |
| `<%= %>` | 表达式 | 输出到页面 |
| `<% Java代码 %>` | 代码脚本 | 嵌入 Java 逻辑 |

### 页面指令示例

```jsp
<%@page contentType="text/html;charset=UTF-8" language="java" %>
<html>
<head>
    <title>客户查询</title>
</head>
<body>
    <form action="querybycode.jsp" method="post">
        type_code:<input type="text" name="type_code"/>
        <input type="submit" value="提交"/>
    </form>
</body>
</html>
```

## Cookie

### 工作流程

1. 客户端第一次访问 → 服务器创建 Cookie
2. 服务器将 Cookie 写入响应头（Set-Cookie）
3. 浏览器保存 Cookie
4. 后续请求自动携带 Cookie → 服务器识别客户端

![](/images/java-web-review/cookie.png)

### 常用操作

- `request.getCookies()` — 获取所有 Cookie
- `response.addCookie(cookie)` — 设置 Cookie

## Session

- 服务端存储，用于跟踪用户会话状态
- 每个会话对应唯一的 Session ID
- 通过 `request.getSession()` 获取

## EL 表达式

语法：`${EL表达式}`

作用：简化 JSP 页面中的数据访问，自动在 page、request、session、application 范围查找属性。

## request 对象常用方法

| # | 方法 | 说明 |
| --- | --- | --- |
| 1 | `setAttribute(String name, Object)` | 设置请求属性 |
| 2 | `getAttribute(String name)` | 获取指定属性值 |
| 3 | `getAttributeNames()` | 获取所有属性名集合 |
| 4 | `getCookies()` | 返回所有 Cookie 对象 |
| 5 | `getCharacterEncoding()` | 返回请求字符编码 |
| 6 | `getContentLength()` | 返回请求 Body 长度 |
| 7 | `getHeader(String name)` | 获取指定请求头 |
| 8 | `getHeaders(String name)` | 获取指定请求头的所有值 |
| 9 | `getHeaderNames()` | 获取所有请求头名称 |
| 10 | `getInputStream()` | 返回请求输入流 |
| 11 | `getMethod()` | 获取请求方法（GET/POST） |
| 12 | `getParameter(String name)` | 获取客户端传参 |
| 13 | `getParameterNames()` | 获取所有参数名 |
| 14 | `getParameterValues(String name)` | 获取指定参数的所有值 |
| 15 | `getProtocol()` | 获取协议名称 |
| 16 | `getQueryString()` | 获取查询字符串 |
| 17 | `getRequestURI()` | 获取请求 URI |
| 18 | `getRemoteAddr()` | 获取客户端 IP |
| 19 | `getRemoteHost()` | 获取客户端主机名 |
| 20 | `getSession([Boolean create])` | 获取/创建 Session |
| 21 | `getServerName()` | 获取服务器名 |
| 22 | `getServletPath()` | 获取请求脚本路径 |
| 23 | `getServerPort()` | 获取服务器端口 |
| 24 | `removeAttribute(String name)` | 删除请求属性 |

## response 对象

| 方法 | 说明 |
| --- | --- |
| `request.getRequestDispatcher(path).forward(request, response)` | **转发**（服务器内部跳转，地址栏不变，1 次请求，共享 request） |
| `response.sendRedirect(url)` | **重定向**（客户端跳转，地址栏改变，2 次请求，不共享 request） |

### 转发 vs 重定向对比

| 对比项 | 转发（forward） | 重定向（sendRedirect） |
| --- | --- | --- |
| 发生位置 | 服务器内部 | 客户端 |
| 浏览器地址栏 | 不变 | 改变 |
| 请求次数 | 1 次 | 2 次 |
| 数据共享 | 共享 request | 不共享 request |
| 速度 | 快 | 慢 |

## 总结

这份笔记从 Tomcat 基础入手，一路梳理到 Servlet、JSP、Cookie、Session、EL 表达式，最后整理了 request 和 response 对象的常用方法。把这些知识点从平铺的思维导图整理成带层级和对比表格的结构化笔记，复习起来会清晰很多。考试加油！
