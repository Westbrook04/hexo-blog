---
title: 用500行Python把Claude塞进飞书群聊
date: 2026-05-31 12:21:12
updated: 2026-05-31 12:21:12
categories: 技术实践
tags:
  - 飞书
  - Claude
  - Python
  - 机器人
  - 自动化
---

## 为什么搞这个

我平时用 Claude Code 配合 lark-cli 干活挺顺手的——查日程、约会议、搜文档，命令行里敲几句就行。但问题来了：**我在飞书聊天框里跟机器人说话，它只会发消息，完全听不懂我在说啥。**

差距在哪？本地 Claude Code 有大脑（自然语言理解）+ 全套 API 能力（日历、文档、消息），而飞书机器人只有一个发消息的躯壳。我想让聊天框里的机器人也变聪明。

## 先想清楚再动手

最直接的想法是搞 webhook——飞书把消息事件推送到我的服务器，我处理完再回复。但一细想就头大：

- 飞书事件订阅**强制要求 HTTPS 公网 URL**
- 我的开发机在内网，得搭隧道（cloudflared / ngrok）
- 要写 Express 服务、要验签、要配飞书后台事件订阅
- 整套下来 300+ 行代码 + 一堆配置，维护成本不低

然后我换了个思路：**轮询。** lark-cli 本身就能读消息（`im +chat-messages-list`），我写个死循环每 30 秒拉一次不就完了？

| | webhook 方案 | 轮询方案 |
|---|---|---|
| 需要 HTTPS 公网 | ✅ 必须 | ❌ 不用 |
| 飞书后台配置 | 事件订阅 + 验签 | 啥都不用改 |
| 代码量 | ~300 行 | ~150 行核心 |
| 延迟 | 实时 | 最多 30 秒 |
| 额外组件 | Express + 隧道服务 | 无 |

30 秒延迟对我来说完全能接受，又不是做交易系统。果断选轮询。

## 架构

```
飞书聊天框 ──发消息──► 飞书服务器
                         │
          每 30 秒拉一次 (lark-cli im +chat-messages-list)
                         │
                         ▼
                  poll_bot.py
                    ├─ 过滤：群聊只看 @机器人的
                    ├─ Claude NLU（bare 模式，~3s）
                    ├─ 执行动作（调 lark-cli）
                    └─ 回复到飞书
```

就一个 Python 脚本，三个核心模块：

```python
# 1. 拉消息
def fetch_messages(chat_id, since_message_id=None):
    cmd = f"im +chat-messages-list --chat-id {chat_id} --as bot --format json"
    ok, data = lark(cmd)
    # 返回新消息列表

# 2. Claude 理解意图（--bare 模式，快 + 便宜）
def claude_nlu(user_message, chat_id, sender_name):
    # claude -p "prompt" --bare --output-format json --system-prompt "..."
    return {"action": "run_lark", "command": "calendar +agenda"}

# 3. 执行 + 回复
def execute_action(action, message_id):
    lark(action["command"])
    reply_message(message_id, "✅ 执行完成")
```

## Claude --bare 是关键

一开始用 `claude -p` 直接调，发现每次 NLU 要等 17 秒、花 $0.11。排查发现是因为 Claude Code 默认加载了巨大的系统提示词（20000+ tokens），包括文件树、环境变量、skill 列表等等。

换成 `--bare` 模式后：

| | 默认模式 | --bare 模式 |
|---|---|---|
| 延迟 | 17 秒 | **3 秒** |
| 费用 | $0.11/次 | **$0.008/次** |
| 输入 tokens | 20,172 | **1,231** |

13 倍差价，而且 3 秒响应体感已经很好了。

`--bare` 会跳过所有 hooks、LSP、CLAUDE.md 自动发现、memory，只保留最核心的 API 调用能力。对于 NLU 这种只需要「理解意图 → 输出 JSON」的简单任务，正好合适。

## 群聊和私聊的处理

飞书消息里自带 `chat_id` 前缀区分：
- `oc_xxx` → 群聊 → 只看 `@机器人` 的消息
- `ou_xxx` → 私聊 → 全部响应

```python
def should_process(msg):
    if msg["chat_id"].startswith("oc_"):  # 群聊
        mentions = msg.get("mentions", [])
        bot_mentioned = any(m["id"] == BOT_APP_ID for m in mentions)
        return bot_mentioned
    return True  # 私聊全收
```

mentions 数组是飞书自动解析的，`@机器人` 之后消息里会带 `"mentions": [{"id": "cli_aa90...", "name": "Claude助手"}]`。

## 加上定时提醒

之前用 Claude Code 的 CronCreate 做 OD 备考每日提醒，现在直接做到 bot 里了。reminders.json 里存配置：

```json
{
  "reminders": [
    {
      "time": "09:00",
      "message": "📚 早上好！今天别忘了刷OD算法题～",
      "chat_id": "oc_3192aba4b83a492816a61ac8d13ce83b",
      "last_fired_date": ""
    }
  ]
}
```

bot 每秒轮询时同步检查当前时间，命中就推送，同一天只推一次。

添加提醒只需要一行命令：

```bash
python3 poll_bot.py --add-reminder "09:00" "📚 该刷OD题了"
```

## 跑起来

```bash
cd ~/feishu-bot
nohup python3 -u poll_bot.py > bot.log 2>&1 &
tail -f bot.log  # 看实时日志
```

输出像这样：

```
🤖 Claude助手 启动
   监听: {'oc_3192aba4b83a492816a61ac8d13ce83b'}
   间隔: 30s
   用户: 刘正威

──────────────────────────────────────
[12:30:15] 刘正威: 帮我查一下明天的日程
  → {"action":"run_lark","command":"calendar +agenda --date 2026-06-01"}
  ✓ executed → 明天有3个会...
```

## 总结

三个收获：

1. **不是所有场景都需要 webhook。** 轮询虽然「不够高级」，但对于个人助手这种对延迟不敏感的场景，足够用且维护成本低一个数量级。
2. **Claude --bare 是真省。** 同样是 NLU，bare 快 5 倍便宜 13 倍。以后所有非交互式的简单调用都用 bare。
3. **把现有能力桥接到聊天框，比从头造一个机器人简单得多。** lark-cli 已经封装好了日历、文档、消息的全套 API，bot 只管「收消息 → 丢给 Claude → 执行命令 → 回复」，500 行就搞定了。
