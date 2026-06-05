---
title: Spring、Spring MVC、Spring Boot 究竟什么关系？
date: 2026-06-03 17:00:00
updated: 2026-06-03 17:00:00
categories: 技术
tags:
  - Spring
  - Spring Boot
  - Spring MVC
  - Java
  - 框架
---

刚开始学 Java 后端的时候，Spring、Spring MVC、Spring Boot 这三个名字经常让人一头雾水。它们到底是什么关系？这篇一次说清楚。

![Spring Logo](/images/spring-stack/spring-logo.svg)

## 三者的定位

### 1. Spring Framework（Spring 核心框架）

Spring 是 Java 企业级应用的全栈式开发框架，核心功能：

- **IoC（控制反转）/ DI（依赖注入）** —— 容器管理对象生命周期，让你不用手动 `new` 对象
- **AOP（面向切面编程）** —— 把日志、事务、权限等横切关注点模块化
- **事务管理** —— 声明式事务支持
- **数据访问** —— JDBC、ORM（如 MyBatis、JPA）的集成
- **Web 支持** —— 基础的 Web 功能

> 特点：功能全面，但配置复杂（早期全是 XML）

### 2. Spring MVC

Spring MVC 是 Spring 框架中的一个 Web 模块，专注解决 Web 层的开发问题：

- **MVC 架构** —— Model（数据模型）、View（视图）、Controller（控制器）分离
- **DispatcherServlet** —— 前端控制器，统一请求分发
- **注解支持** —— `@Controller`、`@RequestMapping` 等
- **视图解析** —— 支持 JSP、Thymeleaf、FreeMarker 等

> 本质：Spring 的一个子模块，只在做 Web 项目时需要用到

### 3. Spring Boot

Spring Boot 是 Spring 的扩展，目标是让你**快速创建独立、生产级的 Spring 应用**：

- **自动配置** —— 根据依赖自动配置 Bean，不用手写配置类
- **起步依赖** —— 一键引入一组相关依赖，不用操心版本号
- **嵌入式容器** —— 内置 Tomcat/Jetty，直接 `java -jar` 运行
- **Actuator** —— 应用监控和管理端点
- **简化配置** —— `application.properties` / `application.yml`

> 本质：一个"快速启动器"，它内部还是用的 Spring 和 Spring MVC

## 三者的关系

一句话概括：

```
Spring Boot = Spring + 自动配置 + 嵌入式容器 + 生产就绪特性
Spring MVC  = Spring 的 Web 开发模块
```

可以用这个层次结构理解：

```
┌─────────────────────────────────────────────┐
│              Spring Cloud                    │  ← 微服务治理
├─────────────────────────────────────────────┤
│              Spring Boot                     │  ← 快速启动器（自动配置）
├─────────────────────────────────────────────┤
│   Spring Framework（含 Spring MVC 等模块）    │  ← 核心能力
├─────────────────────────────────────────────┤
│              JVM + 操作系统                    │
└─────────────────────────────────────────────┘
```

## 对比总结

| 特性 | Spring | Spring MVC | Spring Boot |
|------|--------|------------|-------------|
| **定位** | 完整的企业框架 | Web 框架 | 快速开发脚手架 |
| **配置** | 复杂（XML/注解） | 需要配置 | 自动配置（极少配置） |
| **启动** | 需部署到外部容器 | 需部署到外部容器 | 内置容器，独立运行 |
| **依赖管理** | 手动管理 | 手动管理 | 起步依赖，版本协调 |
| **学习曲线** | 陡峭 | 中等 | 平缓 |

## 实际使用场景

**学习路径**：Spring → Spring MVC → Spring Boot

**传统项目**：Spring + Spring MVC + XML 配置（现在很少见了）

**现代开发**：Spring Boot + Spring MVC（内置）+ 自动配置

**微服务**：Spring Boot + Spring Cloud

## 一句话总结

- **Spring**：提供 IoC、AOP 等核心功能
- **Spring MVC**：基于 Spring 的 Web 开发框架（MVC 模式）
- **Spring Boot**：让 Spring 开发更简单的"快速启动器"

> 现代 Java 开发通常直接使用 Spring Boot，它会自动集成 Spring 和 Spring MVC 等必要组件。**你只需要写业务代码，剩下的交给 Boot。**
