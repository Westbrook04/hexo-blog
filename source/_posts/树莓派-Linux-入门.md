---
title: 树莓派 Linux 入门
date: 2026-05-21 13:33:47
tags:
---

# 树莓派Linux入门

可以把树莓派当成一台练习机，边用边学，不用一开始就背概念。

## 学习路线

1. 先熟悉命令行基本操作
2. 再学文件、权限、进程、网络
3. 最后学服务、日志、自动启动和脚本

## 第一阶段：常用命令

先把这些命令用熟：

pwd

ls

cd

touch

mkdir

cp

mv

rm

cat

grep

重点理解：

- `pwd`：当前目录在哪里
- `ls`：目录里有什么
- `cd`：怎么进入目录
- `touch/cp/mv/rm`：怎么创建、复制、移动、删除文件
- `cat`：怎么看文件内容
- `grep`：怎么搜索内容

## 第二阶段：看系统状态

这些命令很重要：

whoami

hostname

uname -a

top

ps aux

df -h

free -h

ip addr

重点理解：

- `whoami`：你是谁
- `hostname`：机器叫什么
- `uname -a`：系统版本
- `ps aux`：现在有哪些进程在运行
- `top`、`free -h`：CPU 和内存情况
- `df -h`：磁盘剩余多少
- `ip addr`：网络地址

## 第三阶段：学权限

Linux 的核心之一是权限：

ls -l

chmod

chown

sudo

重点看懂：

- `r w x` 分别是什么
- 文件和目录权限有什么区别
- 为什么有些命令要 `sudo`

练习方法：

1. 新建一个文件
2. 用 `ls -l` 看权限

```YAML
total 40
drwxrwxr-x 2 west west 4096 May  2 17:28 Desktop
drwxr-xr-x 3 west west 4096 May  6 06:53 Documents
drwxr-xr-x 2 west west 4096 May  5 04:03 Downloads
drwxr-xr-x 2 west west 4096 May  2 17:28 Music
drwxrwxr-x 3 west west 4096 May  5 14:20 path
drwxr-xr-x 2 west west 4096 May  2 17:28 Pictures
drwxr-xr-x 2 west west 4096 May  2 17:28 Public
drwxr-xr-x 2 west west 4096 May  2 17:28 Templates
drwxrwxr-x 5 west west 4096 May  5 14:36 test
drwxr-xr-x 2 west west 4096 May  2 17:28 Videos
```

1. 用 `chmod 644`、`chmod 755` 改一下
2. 观察变化

## 第四阶段：学进程和服务

systemctl status ssh

systemctl start ssh

systemctl stop ssh

journalctl -u ssh

重点理解：

- 什么是服务
- 什么是守护进程
- 出问题时怎么看日志

## 第五阶段：学网络

ping 192.168.3.1

ss -tuln

ssh user@ip

wget

curl

重点理解：

- 能不能联网
- 哪些端口在监听
- 怎么远程登录
- 怎么下载和查看内容

## 最适合的练习方式

每天做一个小任务，比如：

1. 创建一个目录并整理文件
2. 用 SSH 登录树莓派
3. 查系统信息
4. 看 CPU 和内存
5. 改一个文件权限
6. 找到 SSH 服务日志
7. 写一个简单脚本自动执行命令

## 推荐的实战项目

如果想真正学会 Linux，可以按这个顺序做：

1. 搭一个树莓派共享文件夹
2. 安装一个简单 Web 服务
3. 配置开机自启
4. 用 `cron` 定时执行任务
5. 看日志排查问题
6. 写 shell 脚本自动化维护

## 最小学习目标

先把这 4 个目标打通：

1. 能在 SSH 里自由切换目录和查看文件
2. 能看懂 `ls -l` 和 `chmod`
3. 能查系统状态和网络地址
4. 能用 `systemctl` 看服务状态

## 下一步

如果想继续，可以做一个“树莓派 Linux 入门 7 天练习表”，每天 15 分钟，照着做就行。