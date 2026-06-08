---
title: Docker 容器名冲突导致端口映射不生效——记一次 pgvector 启动排查
date: 2026-06-08 13:30:00
updated: 2026-06-08 13:30:00
categories: 技术
tags:
- Docker
- PostgreSQL
- 踩坑记录
- Debug
---

今天启动了一个 pgvector 容器，命令看起完全正确，但 IntelliJ IDEA 怎么都连不上 PostgreSQL。

## 场景

在 Windows 上用 Docker 跑 PostgreSQL（pgvector/pgvector:pg17）：

```bash
docker run -d \
  --name my_pgvector \
  -p 5432:5432 \
  -e POSTGRES_PASSWORD=123456 \
  -v C:/path/to/data:/var/lib/postgresql/data \
  pgvector/pgvector:pg17
```

命令执行完返回了容器 ID，`docker ps` 也显示状态 `Up`，看起来一切正常。但 IDEA 里配好 `localhost:5432`、输入密码后，报连接超时。

## 排查过程

### 第一步：检查容器状态和日志

```bash
docker ps -a --filter name=my_pgvector
docker logs my_pgvector
```

容器确实在跑，日志显示 `database system is ready to accept connections`。PostgreSQL 本身没问题。

但注意到日志里有不同日期的多条记录——6月3日、6月8日 13:07、13:09、13:16，说明容器已经反复启停多次了。这不对劲。

### 第二步：检查端口映射

```bash
docker port my_pgvector
```

**什么也没输出。**

`docker inspect` 看一下详细信息：

```bash
docker inspect my_pgvector --format '{{json .NetworkSettings.Ports}}'
```

输出：
```json
{"5432/tcp":[]}
```

端口映射数组是空的！`-p 5432:5432` 根本没生效。

### 第三步：找根因

`docker ps` 显示端口列只有 `5432/tcp`，正常的映射应该显示 `0.0.0.0:5432->5432/tcp`。

再查创建时间：

```bash
docker inspect my_pgvector --format '{{.Created}}'
```

→ `2026-06-03T16:01:31Z`（6月3日创建的）

那刚才的 `docker run` 为什么没创建新容器？因为**同名容器已经存在**。Docker 报错说名字已占用，但你看到的那个"成功"是它复用了旧容器——一个 6月3日创建的、没有端口映射的旧版本。

## 修复

就两步：

```bash
# 删除旧容器
docker rm -f my_pgvector

# 重新运行（这次会成功创建新容器）
docker run -d \
  --name my_pgvector \
  -p 5432:5432 \
  -e POSTGRES_PASSWORD=123456 \
  -v C:/path/to/data:/var/lib/postgresql/data \
  pgvector/pgvector:pg17
```

验证：

```bash
docker port my_pgvector
# 5432/tcp -> 0.0.0.0:5432
# 5432/tcp -> [::]:5432
```

IDEA 里重新连接，一次成功。

## 复盘

这个坑的根本原因是：**`docker run` 在容器名冲突时不会覆盖已有容器，而是直接报错退出。** 如果你没注意到报错信息（或者在终端输出中被刷走了），就会以为是旧容器在正常运行。

在 Windows Docker Desktop 里，之前停止的容器默认会保留，下次开机可能自动重启。如果你做过实验、留下了旧容器，下次再 `docker run` 同名时就中招了。

### 以后怎么避免

- 不确定时先 `docker rm -f` 再 `docker run`
- 或者用 `docker run --rm`（容器停止后自动删除）
- 启动后立刻 `docker port` 验证端口映射是否生效
- `docker ps` 看端口列，没有 `0.0.0.0:xxx->xxx/tcp` 就要怀疑

## 总结

- Docker 同名容器冲突时 `docker run` 会失败，但失败的提示可能被忽略
- 容器运行中 ≠ 端口映射正确——运行 `docker port <容器名>` 是最直接的验证方式
- Docker Desktop 在 Windows 上会保留旧容器状态，每次实验后记得清理
