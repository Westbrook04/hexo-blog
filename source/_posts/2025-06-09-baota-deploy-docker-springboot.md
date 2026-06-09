---
title: Docker 项目部署到宝塔面板的实战记录
date: 2025-06-09 23:00:00
updated: 2025-06-09 23:00:00
categories: 技术
tags:
  - 宝塔面板
  - Docker部署
  - Spring Boot
  - 生产环境
  - 运维
  - Java
---

今天把一个 Spring Boot 4.0 + Spring AI + PostgreSQL(pgvector) + React 的全栈 AI 面试项目部署到宝塔面板，踩了几个典型坑，记录一下。

## 项目背景

项目叫 Candid，技术栈比较新：

- **后端**：Spring Boot 4.0 / Java 21 / Spring AI / Gradle
- **前端**：React 18 + TypeScript + Vite
- **数据库**：PostgreSQL 16 + pgvector（向量检索）
- **缓存**：Redis 7
- **存储**：MinIO（S3 兼容对象存储）
- **编排**：Docker Compose，前后端各一个多阶段 Dockerfile

整套服务共 6 个容器：postgres、redis、minio、minio-init、app（后端）、frontend（前端）。

## 生产环境部署原则

第一次上生产，给自己定了几个硬规矩：

**1. 端口不能全开**

默认 docker-compose.yml 里 postgres、redis、minio 都把端口映射到宿主机了。生产环境这些内部服务不需要对外暴露，改成 `expose` 就行，只让前端 80 和后端 8080 映射出来。

**2. 密码不能留默认**

postgres 默认 password、minio 默认 minioadmin——这种不改直接上线等于裸奔。全部换成随机生成的强密码，且走 `.env` 环境变量注入。

**3. 加日志限制**

Docker 默认日志是不限大小的，跑一段时间能撑爆磁盘。每个 service 加上 `logging` 配置，限制单文件 10M、保留 3 份。

**4. 健康检查**

依赖关系配 `depends_on` + `condition: service_healthy`，确保 postgres 完全就绪了后端才启动，避免连接被拒。

## 最大的坑：基础镜像 Tag 找不到了

构建后端镜像时直接报错：

```
target app: failed to solve: eclipse-temurin:21-jre: not found
```

查了一下，`eclipse-temurin:21-jre` 这个浮动 tag 已经被 Docker Hub 移除了。不只是我遇到，Metabase 的 issue 里也有人在抱怨。Eclipse Temurin 项目不再维护不带具体 OS 版本的浮动 tag。

解决方案：改成具体的 OS 版本 tag——`eclipse-temurin:21-jre-noble`（基于 Ubuntu Noble）。

同样的问题也出现在 Gradle 构建镜像上，`gradle:8.14-jdk21` 可能不存在，稳妥起见降成 `gradle:8.13-jdk21`。

改完之后构建就正常了。

## 宝塔部署流程

项目修好后，在宝塔上的部署步骤很清晰：

1. **上传项目**到 `/www/wwwroot/Candid`
2. **配置 .env**——改密码、改 host 为 Docker 内部服务名（postgres、redis、minio，不是 localhost）
3. **宝塔 Docker → Compose**——新建项目，选择路径，自动读取 docker-compose.yml 和 .env，一键启动
4. **配反向代理**——宝塔网站添加域名，指向 `127.0.0.1:80`（前端容器），配 SSL

## 几个值得记住的点

- **国内服务器拉 Docker Hub** 大概率要配镜像加速，阿里云/腾讯云/中科大都行
- `.env` 文件 `chmod 600`，API Key 不能裸奔
- 先 `docker compose up -d postgres redis minio` 等基础设施就绪，再启 app 和 frontend，比一起启更容易排查问题
- 出问题时 `docker compose logs app` 看后端日志，Spring Boot 的报错一般能直接定位

## 复盘

这次部署本身流程不复杂，技术上就是 Docker Compose 一键的事。真正花时间的反而是几件"小事"：基础镜像 tag 失效、端口要不要开、日志会不会撑爆磁盘。这些东西文档里不一定写，但上线前漏一个都可能出问题。

好在项目本身 Docker 化做得比较完整，Dockerfile 多阶段构建、健康检查、依赖编排都配好了，改掉镜像 tag 和几个安全配置就能跑。下次再部署类似项目，先检查镜像 tag 有效性、先关不必要的端口、先配日志限制——这三件事做好了，能少半夜惊醒好几次。
