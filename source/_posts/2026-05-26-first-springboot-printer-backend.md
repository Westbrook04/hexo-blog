---
title: 第一次独立接手后端项目：打印机合并后端从零搭建
date: 2026-05-26 11:20:00
updated: 2026-05-26 11:20:00
categories: 技术实践
tags:
- Spring Boot
- 后端开发
- 项目搭建
- 自动化测试
- 技术选型
---

这次接手了一个打印机合并项目的后端开发，需求很模糊——总监只说了"三个打印机用三个APP太麻烦，合并成一个"，剩下全靠自己摸索。记录一下从零到一搭起来的完整过程，包括技术选型、项目结构和测试规范。

## 需求沟通：模糊需求的应对方式

总监和前端给的信息很零散："先做 BL60"、"模板要存后端"、"参考别人的打印机软件"。没有文档，没有接口定义。

解决方法是不要等需求，自己出方案让总监确认。分三次沟通：

- 第一次确认大方向（合并三个打印机）
- 第二次带着方案去约 15 分钟过一遍
- 第三次开发中有卡点再问

跟前端协调时最重要的是先定接口再各干各的，后端先出一版接口文档，前端按接口开发。

## 技术选型：Java SpringBoot 而不是 Node

技术选择上直接选了 Java SpringBoot，三个理由：

1. **为华为 OD 做准备**——国内后端市场 Java 占绝对主流，SpringBoot 是 OD 的技术栈
2. **框架约束强**——Controller/Service/Repository 层次分明，不担心写歪
3. **测试生态成熟**——JUnit 5 + Mockito + TestContainers 一套标准

Node.js 适合快速原型和 BFF 层，但这个项目是模板 CRUD + 用户数据管理，属于 SpringBoot 最擅长的领域。至于 Maven 还是 Gradle，选了 Maven——面试标配、中文资料多、SpringBoot 官方文档全用 Maven 示例，不需要在构建工具上花时间。

## 项目结构规范

本地项目管理不能全堆在桌面。建了清晰的项目目录：

```
C:\Users\13406\
  projects\printer-backend\   ← 项目代码
  github\                     ← 开源项目
  Desktop\                    ← 只放临时文件
```

项目内按 SpringBoot 标准分层：

```
src/main/java/com/printer/
  controller/        ← REST 接口
  service/           ← 业务逻辑
  repository/        ← 数据库操作
  model/             ← 实体类
  config/            ← 配置
```

## 第一个业务：模板 CRUD

模板是打印机的核心数据——用户保存的纸张大小、打印参数、布局配置等。用 JPA 自动建表，H2 内存库做开发环境，Hibernate ddl-auto: update 自动同步实体和表结构。

Templates 表字段：id、name、printerType、content（JSON格式存参数）、paperSize、createdAt、updatedAt。

接口包括标准的增删改查：GET 列表（支持按 printerType 筛选）、GET 单个、POST 创建、PUT 更新、DELETE 删除。

## 测试规范

测试分两层：

**单元测试**（TemplateServiceTest）——用 Mockito 模拟 Repository 层，只测 Service 的业务逻辑，不启动服务器，毫秒级执行。覆盖正常流程和异常情况（查不存在的 ID 抛异常）。

**接口测试**（TemplateControllerTest）——用 MockMvc 启动轻量级 Spring 上下文，测 HTTP 请求和响应的正确性，包括状态码和返回体 JSON 的字段校验。

跑测试只需要一条命令：`./mvnw test`（Maven Wrapper 自动下载对应版本，不依赖本地 Maven 安装）。

本地手动验证用 Postman，按接口顺序测一轮（创建→列表→筛选→单个→更新→删除），确认返回值符合预期再 commit。

## 开发流程总结

```
接任务 → 搞清需求（出方案让总监确认）→
定接口文档（给前端同步）→ 后端开发 + 写单元测试 →
Postman 手动验证一轮 → 跑全部测试 →
commit → push（CI 自动构建）
```

独立接手一个模糊需求的项目，最关键的不是技术能力，而是主动出方案的能力。等需求文档永远等不到，自己出一版让老板点头才是实战中的常态。
