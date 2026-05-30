---
title: 把 Claude Code 部署到云服务器，用飞书在手机上随时调用
date: 2026-05-30 22:01:30
updated: 2026-05-30 22:01:30
categories: 技术实践
tags:
  - Claude Code
  - 飞书机器人
  - DeepSeek
  - 阿里云
  - Linux
---

今天租了半年阿里云轻量服务器，想干一件事：把 Claude Code 部署到云上，再接一个飞书机器人，这样在手机上随时能调用它干活，还能让它读到我本地积累的那套记忆文件。折腾了一晚上，踩了不少坑，记录一下整个过程。

## 先想清楚要什么

一开始我说的是"部署 claude，claude 接入 DeepSeek V4"，但这里有个认知必须先掰扯清楚，不然装完会失望。

"Claude" 其实是两层意思：

- **Claude 模型**（claude-opus、claude-sonnet）：Anthropic 训练的那个大脑，智能水平高。要用它必须有 Anthropic 的 key。
- **Claude Code**：一个 agent 外壳，能读写文件、跑命令、用记忆系统、做多步任务。它的后端模型可以换成任何 Anthropic 兼容的 API。

我手里只有 DeepSeek 的 key，所以最终方案是：**Claude Code 的 agent 能力 + 我的记忆文件 + 工具，但思考的大脑是 DeepSeek V4**。框架是 Claude，智能来源是 DeepSeek，这俩拼一起完全能用。

## 服务器选型的几个原理

顺手记一下配置怎么选，逻辑其实很简单：

- **CPU 看并发不看速度**：我这种 IO 密集型（全是 API 调用）2 核够用，计算密集型才吃核
- **内存最容易成瓶颈**：宁可内存多买也别 CPU 多买，不够直接 OOM
- **带宽看传什么**：纯 API 调用是文本，3Mbps 绰绰有余
- **地区决定连通性**：要调海外 API 必须选香港/新加坡节点，国内节点连不通

## 加 swap 救内存

服务器只有 1.6G 内存，实际可用 1.2G。Claude Code 是 Node 应用，跑起来吃几百 M，很容易触顶。先加 2G swap：

```bash
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile && echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

写进 `/etc/fstab` 是为了开机自动挂载，不然重启就没了。

## 装 Claude Code 并接入 DeepSeek

Node 环境装好后，全局装 Claude Code：

```bash
npm install -g @anthropic-ai/claude-code
```

接入 DeepSeek 的关键是几个环境变量。DeepSeek 提供了 Anthropic 兼容端点，所以 Claude Code 几乎零改动就能指过去：

```bash
export ANTHROPIC_BASE_URL="https://api.deepseek.com/anthropic"
export ANTHROPIC_AUTH_TOKEN="你的-deepseek-key"
export ANTHROPIC_MODEL="deepseek-v4-pro"
export ANTHROPIC_SMALL_FAST_MODEL="deepseek-v4-flash"
```

注意 base_url 结尾是 `/anthropic`，不要画蛇添足加 `/v1`，那是 OpenAI 兼容格式的，加了会报错。

## root 用不了 skip-permissions

测试 headless 模式时撞了一堵墙：

```bash
claude -p "测试" --dangerously-skip-permissions
```

root 用户下 Claude Code 直接拒绝使用 `--dangerously-skip-permissions`，这是它的安全设计。解决办法是建一个普通用户专门跑它：

```bash
useradd -m -s /bin/bash claude
```

之后所有 Claude Code 调用都用这个 claude 用户的身份，既能用 skip-permissions，也更安全。

## 同步记忆文件的路径玄机

我本地的记忆文件想原封不动搬到服务器，但 Claude Code 的自动记忆目录路径里带着工作目录的 hash。本地是 `C--Users-13406`，服务器工作目录不同，路径就对不上。

办法是先让 Claude Code 在目标工作目录里跑一次，看它生成的真实路径：

```bash
su - claude -c 'cd ~/workspace && claude -p "测试"; find ~/.claude -type d'
```

结果路径是：

```
/home/claude/.claude/projects/-home-claude-workspace/memory
```

把记忆文件丢进这个目录就能被加载。验证时让它读记忆回答"我在备考什么"，它准确复述了我的刷题计划和"AI禁用手写优先"的规则，说明记忆同步成功。

这里还踩了个小坑：用 root 通过 SFTP 上传的文件属主是 root，claude 用户改不动，需要回到 root 身份 `chown -R claude:claude` 把属主改回来。

## 飞书机器人用长连接，省掉公网 HTTPS

飞书事件回调默认要走公网 HTTPS，需要域名 + 证书，麻烦。但飞书支持**长连接模式**：服务器主动连飞书，不需要域名、不开放端口、不配 webhook。对小服务器这是最省事的方案。

代码层面用 `lark-oapi` 的 ws 客户端：

```python
ws_client = lark.ws.Client(
    FEISHU_APP_ID,
    FEISHU_APP_SECRET,
    event_handler=event_handler,
    log_level=lark.LogLevel.INFO,
)
ws_client.start()
```

在飞书开放平台把事件订阅方式选成"使用长连接接收事件"，加上 `接收消息 v2.0` 事件和 `im:message` 权限，发布版本即可。

## 让 bot 调用 Claude Code 而不是直接调 API

最后一步是改造 bot：收到飞书消息后，不再直接调 DeepSeek API，而是 fork 一个 `claude -p` 子进程，让它以 agent 身份在 workspace 里干活：

```python
cmd = [
    CLAUDE_BIN, "-p", prompt,
    "--dangerously-skip-permissions",
    "--output-format", "json",
]
result = subprocess.run(cmd, cwd=WORKSPACE, capture_output=True, text=True, timeout=180)
```

几个关键处理：

- **整个 bot 服务改用 claude 用户运行**（systemd 里 `User=claude`），否则子进程还是 root 身份，用不了 skip-permissions
- **注入当前日期**：headless 模式下模型不知道"今天"是几号，要在 prompt 里手动塞进去，不然它算备考第几天会算错
- **异步处理**：Claude Code 干活要几十秒，先回一句"思考中"再开线程处理，避免飞书消息超时
- **连续会话**：用返回的 `session_id` 配合 `--resume`，让多轮对话能记住上下文

## 一个踩了好几次的坑

整晚最反复的不是技术难点，而是 `cat > file << EOF` 这种 heredoc 写文件的方式总是莫名失败，文件没写进去。后来改成本地生成文件、用 SFTP 拖上去覆盖，反而稳定。环境变量 `MEM=... && mv ...` 写一行也踩坑——前面的赋值只对当前命令临时生效，后面 `$MEM` 是空的，得分行写。

## 收获

这次最大的体会是把"Claude Code"和"Claude 模型"拆开看：前者是可以自托管、可以换后端的 agent 框架，后者才是那个昂贵的大脑。两者解耦之后，玩法一下子打开了——用便宜的 DeepSeek 驱动 Claude Code 的工具能力，再用飞书长连接把入口搬到手机上，整套下来成本极低，却能在任何地方调用一个带着我全部记忆、能读写文件的 agent。

接下来打算让它在手机上帮我做刷题日志的记录和备考验收，把这套记忆系统真正用起来。
