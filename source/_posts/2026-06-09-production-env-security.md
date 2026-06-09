---
title: 生产环境配置安全：别把 .env 当成普通配置文件
date: 2026-06-09 12:55:00
updated: 2026-06-09 12:55:00
categories: 技术
tags:
- 配置安全
- Docker
- 生产部署
- 环境变量
- DevOps
---

今天在准备把一个 Spring Boot + React 项目部署到宝塔面板时，顺手检查了一份 `.env` 配置。表面看只是填几个数据库密码、Redis 密码、对象存储账号、AI API Key，但越看越觉得：**生产配置不是能跑就行，而是要先假设它会被复制、截图、提交、贴进聊天窗口，然后再设计防线。**

这篇记录一下这次整理出来的配置安全要点。

## .env 不是普通配置文件

很多人刚开始部署项目时，会把 `.env` 当成"运行参数集合"：

```env
POSTGRES_PASSWORD=xxx
REDIS_PASSWORD=xxx
AI_API_KEY=xxx
S3_SECRET_KEY=xxx
```

技术上没错，应用确实需要这些值才能启动。但从安全角度看，`.env` 里放的是系统边界：

- 数据库密码决定谁能读写业务数据
- Redis 密码影响缓存、队列、限流和会话状态
- 对象存储密钥影响用户上传文件、简历、知识库文档
- AI API Key 直接对应费用额度和模型调用权限

所以 `.env` 不能像普通 YAML、JSON、README 一样随手复制。它应该只存在于服务器、CI 密钥库或本地私密环境里。

## 第一条规则：泄露过的 Key 直接作废

这次最典型的问题是：真实 API Key 被贴到了对话里。

哪怕只是发给自己的 AI 助手，严格来说也应该视为泄露。因为你很难保证这些内容不会进入：

- 聊天记录
- 截图
- 终端历史
- 日志系统
- 文档记录
- 浏览器缓存
- 复制粘贴历史

处理方式很简单：**不要纠结有没有被滥用，直接去服务商后台重置。**

比如：

```text
旧 API Key：吊销
新 API Key：重新生成
.env：替换成新值
服务器：重启服务
```

这比事后查账单、查调用日志、怀疑哪里泄露要干净得多。

## 强随机密码，不要自己编

很多人会写出看起来"很强"的密码，比如带年份、项目名、符号的组合。这种密码比 `123456` 好，但它仍然有人类规律。

生产环境更推荐让系统生成：

```bash
openssl rand -hex 32
```

它会生成 64 位十六进制字符串，适合直接放进 `.env`：

```env
POSTGRES_PASSWORD=生成一条
REDIS_PASSWORD=生成另一条
APP_STORAGE_SECRET_KEY=再生成一条
APP_AI_CONFIG_ENCRYPTION_KEY=继续生成一条
```

重点是：**每个用途都单独生成，不要复用。**

数据库密码、Redis 密码、对象存储密钥、应用加密密钥不是一回事。一个泄露，不应该连带拖垮所有组件。

## 本地配置和生产配置要分开

开发环境里常见这种配置：

```env
POSTGRES_HOST=localhost
REDIS_HOST=localhost
APP_STORAGE_ENDPOINT=http://localhost:9000
```

本地跑没问题。但如果项目用 Docker Compose 上生产，容器之间应该通过服务名访问：

```env
POSTGRES_HOST=postgres
REDIS_HOST=redis
APP_STORAGE_ENDPOINT=http://minio:9000
```

这个差异很重要。

`localhost` 在容器里不是宿主机，也不是另一个容器，而是容器自己。很多线上连接失败，本质就是把本地 `.env` 原封不动搬到了服务器。

我现在会习惯拆成两份：

```text
.env.example      # 提交到 Git，只写变量名和示例
.env              # 本地使用，不提交
.env.production   # 服务器使用，不提交
```

`.env.example` 只放占位值：

```env
AI_API_KEY=replace_me
POSTGRES_PASSWORD=replace_me
REDIS_PASSWORD=replace_me
```

不要把真实值写进示例文件。

## Docker Compose 也会埋坑

`.env` 安全不只看 `.env` 文件本身，还要看 `docker-compose.yml` 怎么用它。

比如这种写法很危险：

```yaml
environment:
  POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-password}
```

它的意思是：如果没配置 `POSTGRES_PASSWORD`，就用默认值 `password`。

开发时很方便，生产时很危险。因为一旦服务器忘了放 `.env`，服务仍然能启动，只是带着默认弱密码启动。

更好的方式是生产环境不要给敏感项兜底：

```yaml
environment:
  POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
```

让它缺失时直接启动失败。

配置安全里有个很实用的原则：**秘密配置宁可缺失报错，也不要静默降级成弱默认值。**

## 内网服务不要暴露公网

宝塔部署时还有一个常见误区：为了方便调试，把所有端口都映射出去。

例如：

```yaml
ports:
  - "5432:5432"
  - "6379:6379"
  - "9000:9000"
```

这样数据库、Redis、对象存储都暴露到了公网。哪怕有密码，也是在给扫描器机会。

生产环境更推荐：

```yaml
expose:
  - "5432"
```

或者只绑定本机：

```yaml
ports:
  - "127.0.0.1:18080:80"
```

公网入口只保留宝塔 Nginx 的 `80/443`，应用、数据库、Redis、MinIO 都在内网或 Docker 网络里通信。

## 需要专门保护的几类配置

这次检查下来，我会把生产 `.env` 分成几类来看。

第一类是基础设施密码：

```env
POSTGRES_PASSWORD=
REDIS_PASSWORD=
APP_STORAGE_ACCESS_KEY=
APP_STORAGE_SECRET_KEY=
```

它们要强随机、互不复用、不能有默认值。

第二类是外部服务 Key：

```env
AI_BAILIAN_API_KEY=
PROVIDER_DEEPSEEK_API_KEY=
PROVIDER_KIMI_API_KEY=
```

它们泄露后不仅影响安全，还可能直接产生费用。

第三类是应用内部加密密钥：

```env
APP_AI_CONFIG_REQUIRE_ENCRYPTION_KEY=true
APP_AI_CONFIG_ENCRYPTION_KEY=
```

这类密钥容易被忽略。很多项目开发时会有 fallback key，方便本地启动。但生产环境必须强制配置，否则数据库里保存的 Provider API Key 可能只是用开发默认密钥加密。

第四类是访问边界：

```env
CORS_ALLOWED_ORIGINS=https://your-domain.com
```

生产不要继续保留一堆 `localhost`，也不要为了省事写成 `*`。

## 一个更稳的生产配置清单

整理后，我更愿意用这种思路准备生产配置：

```env
# 外部模型服务
AI_BAILIAN_API_KEY=新生成的真实Key
PROVIDER_DEEPSEEK_API_KEY=新生成的真实Key
PROVIDER_KIMI_API_KEY=
PROVIDER_GLM_API_KEY=

# PostgreSQL
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=interview_guide
POSTGRES_USER=postgres
POSTGRES_PASSWORD=随机强密码

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=随机强密码

# S3 / MinIO
APP_STORAGE_ENDPOINT=http://minio:9000
APP_STORAGE_ACCESS_KEY=随机用户名
APP_STORAGE_SECRET_KEY=随机强密码
APP_STORAGE_BUCKET=interview-guide
APP_STORAGE_REGION=us-east-1

# 应用加密
APP_AI_CONFIG_REQUIRE_ENCRYPTION_KEY=true
APP_AI_CONFIG_ENCRYPTION_KEY=随机强密钥

# 浏览器访问边界
CORS_ALLOWED_ORIGINS=https://your-domain.com
```

这里的重点不是变量名，而是规则：

- 真实值不进 Git
- 敏感值不写默认兜底
- 生产主机名用容器服务名
- 每个密码单独生成
- 泄露过的 Key 直接重置
- CORS 和公网入口只放真实域名

## 总结

这次最大的感受是：配置安全不是上线前最后一项"顺手检查"，而是部署方案的一部分。

一个项目能不能安全上生产，不只看代码有没有 bug，也看这些细节：

- `.env` 有没有被提交
- 默认密码有没有被带到线上
- 数据库和 Redis 有没有暴露公网
- API Key 泄露后有没有及时轮换
- 生产和本地配置有没有混用
- 应用内部加密密钥有没有强制配置

以后再部署类似项目，我会先问一句：**如果这份配置文件现在被截图发出去，最坏会发生什么？**

如果答案是"数据库、文件、AI 额度都可能失控"，那就说明它还没准备好上生产。
