---
title: Docker Compose 项目部署前的服务器需求分析与台式机临时方案
date: 2026-06-08 22:30:00
updated: 2026-06-08 22:30:00
categories: 技术实践
tags:
  - Docker
  - 部署
  - frp
  - 内网穿透
  - InterviewGuide
---

这次花时间完整梳理了一个 Spring Boot + React 全栈项目的部署需求。目的是在正式上线前把"需要什么样的服务器、怎么配、有没有更低成本的测试方案"这几个问题彻底搞清楚。

## 项目是什么

InterviewGuide（智能 AI 面试官平台），技术栈是 Java 21 / Spring Boot 4.0 / React 18 / PostgreSQL 16 + pgvector / Redis 7 / MinIO。功能包括简历分析、文字和语音模拟面试、RAG 知识库、面试日程管理。

部署用的是 Docker Compose，一共 6 个服务：

| 服务 | 镜像/技术 | 端口 |
|------|-----------|------|
| 后端 | Spring Boot 4.0 + Java 21 | 8080 |
| 前端 | React + Nginx（多阶段构建） | 80 |
| 数据库 | pgvector/pgvector:pg16 | 5432 |
| 缓存/队列 | redis:7 | 6379 |
| 对象存储 | minio/minio | 9000 (API) / 9001 (控制台) |
| 存储初始化 | minio/mc（一次性任务） | - |

## 服务器资源需求怎么算

分析这种项目，思路是从每个 Docker 容器的内存占用 + 计算特征倒推，而不是拍脑袋。

**内存是最容易成瓶颈的**，先算它：

| 组件 | 预估内存 |
|------|----------|
| JVM（Spring Boot，虚拟线程） | 1.5 - 2 GB |
| PostgreSQL + pgvector（HNSW 索引） | 1.5 - 2 GB |
| Redis | 256 - 512 MB |
| MinIO | 256 MB |
| Nginx | ~50 MB |
| OS + Docker 开销 | 1 - 1.5 GB |

算下来最低 4 GB，推荐 8 GB。pgvector 走 HNSW 索引 + 1024 维 COSINE 向量搜索，vector 索引在内存里的开销不能忽略，所以 2 GB 给 PG 是比较稳的。

**CPU 不需要很强**：这个项目本质是 IO 密集型（调用外部 AI API、文件上传下载），单靠虚拟线程就能扛住并发，2 核能跑，4 核绰绰有余。

**存储**：40 GB SSD 起步。项目文件本身不大，但用户上传的简历、知识库文档会慢慢增长。

## 云服务器方案

| 服务商 | 推荐机型 | 月费参考 |
|--------|----------|----------|
| 阿里云 ECS | ecs.c7.xlarge（4C8G） | ¥300-400 |
| 腾讯云 CVM | S5.MEDIUM4（2C4G 起步） | ¥200-300 |
| 京东云 | 轻量应用服务器 4C8G | ¥200-300 |

## 上线前必须改的配置

分析项目配置时发现了几个容易遗漏的坑：

**1. 敏感信息不能留默认值**

`.env` 里的 API Key、数据库密码、对象存储凭证必须全部替换。项目默认用的是 `minioadmin/minioadmin`、`password` 这种，直接上线等于裸奔。

**2. ddl-auto 必须关**

`application.yml` 里 `spring.jpa.hibernate.ddl-auto: update` 只适合开发环境。生产环境改成 `false`，否则表结构被自动修改的风险很大。

**3. pgvector schema 初始化关闭**

`initialize-schema: true` 同样开发用可以，生产关掉，手动管理数据库变更。

**4. 外部 API 依赖要确认**

这个项目依赖阿里云百炼的 DashScope API（LLM + 语音识别 + 语音合成），语音面试走 WebSocket 连 `dashscope.aliyuncs.com`。部署服务器必须能出站访问阿里云。

**5. HTTPS + WSS**

语音面试的 WebSocket 在公网环境必须走 WSS（WebSocket Secure），依赖 HTTPS 证书。可以上 Let's Encrypt 免费搞定。

**6. 超时配置对齐**

AI 请求可能很慢（几十秒甚至上百秒），Nginx 已经配了 300s 超时，但如果前面还有 CDN 或 SLB，也要同步调大，否则会被提前断开。

## 台式机当临时服务器的方案

前期测试不需要直接买云服务器。自己的台式机就能跑全套 Docker Compose，只差一个问题：**公网访问**。

家里宽带要么没有公网 IP，要么运营商封了 80/443 端口。解决方案是内网穿透：

### 快速上手：cpolar

适合临时测试，不需要额外服务器：

```bash
winget install cpolar
cpolar authtoken 你的token
cpolar http 80
```

会得到一个公网地址，发给测试用户就能访问。

### 更稳定：frp

需要一台有公网 IP 的轻量云服务器（最低配 1C1G，约 ¥50/月）做跳板。服务端配置：

```ini
# frps.ini — 云服务器上
[common]
bind_port = 7000
vhost_http_port = 8080
```

客户端配置：

```ini
# frpc.ini — 台式机上
[common]
server_addr = 你的云服务器IP
server_port = 7000

[web]
type = http
local_port = 80
custom_domains = 你的域名
```

### Windows 防火墙放行

```powershell
netsh advfirewall firewall add rule name="Docker 80" dir=in action=allow protocol=tcp localport=80
netsh advfirewall firewall add rule name="Docker 8080" dir=in action=allow protocol=tcp localport=8080
```

### 几个注意点

- 关掉系统休眠，不然半夜自己睡了谁都访问不了
- 设置 Windows Update 的工作时段，避免自动重启
- 台式机不用 7×24 开机，跟测试方约好时间段就行

## 复盘

这次分析的收获是形成了一套"拿到 docker-compose.yml 怎么快速估算服务器配置"的思路：先拆服务清单 → 逐个估算内存 → 判断计算特征（IO 密集还是 CPU 密集）→ 定配置。最核心的一条经验是：**内存先算够，CPU 不用过度配置**——大部分业务项目的瓶颈在内存和网络 IO，而不是 CPU 核心数。
