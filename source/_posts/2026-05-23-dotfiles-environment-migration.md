---
title: 用 Dotfiles 解决换电脑的环境迁移焦虑
date: 2026-05-23 14:30:00
updated: 2026-05-23 14:30:00
categories: 技术实践
tags:
- Dotfiles
- 环境管理
- Git
---

## 一、背景

一台电脑用了四年，配置、别名、脚本、编辑器设置，全是时间和习惯的积累。想到以后要换新电脑，最大的焦虑不是硬件性能，而是「那些年攒下来的环境怎么搬」。

这个问题的核心可以拆解成三个维度：

- **环境配置**：`.bashrc`、`.gitconfig`、SSH 配置、VS Code 设置
- **数据和文档**：笔记、知识库、浏览器书签
- **本地服务**：数据库、Nginx、定时任务

## 二、核心思路：把配置代码化

理想状态下，换新电脑只需要做三件事：装包管理器、装 Git、跑一个脚本。

这套思路落到实操就是 **dotfiles**——把所有用户级配置文件集中到一个 Git 仓库管理。下面是我搭建 dotfiles 的完整过程。

## 三、dotfiles 仓库结构

```
~/dotfiles/
├── bash/
│   ├── bashrc           # 别名、PATH
│   └── bash_profile
├── git/
│   ├── gitconfig        # Git 全局配置
│   └── gitconfig-github # GitHub 专用身份
├── ssh/
│   └── config           # 多平台 SSH 密钥管理
├── vscode/
│   └── settings.json    # VS Code 完整配置
├── npmrc
├── condarc
├── minttyrc
├── install.sh           # 新电脑一键安装脚本
└── .gitignore
```

每个文件都是从系统原有位置复制过来的原始配置，`install.sh` 负责在新机器上把它们部署回正确位置，同时自动备份旧文件。

## 四、解决 GitHub 和 Gitee 身份冲突

这是实际踩到的一个坑。Git 全局配置只能设一套 name 和 email，但我既用 Gitee（国内）也用 GitHub（国外），提交者的身份信息应该自动匹配不同平台。

解决方案是用 Git 的 `includeIf` 条件包含：

```ini
# ~/.gitconfig — 默认身份为 Gitee
[user]
    name = 刘正威
    email = xxx@gitee.com

# ~/github/ 下的仓库自动切到 GitHub 身份
[includeIf "gitdir:~/github/"]
    path = ~/.gitconfig-github
```

```ini
# ~/.gitconfig-github
[user]
    name = Liu Zhengwei
    email = xxx@users.noreply.github.com
```

这样一来，`~/github/` 目录下的仓库自动用 GitHub 身份，其他所有目录默认用 Gitee 身份，互不干扰。

同时 SSH 配置也做了对应的多 key 管理：

```
Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519

Host gitee.com
  HostName gitee.com
  User git
  IdentityFile ~/.ssh/id_ed25519
```

两边可以共用同一个 ed25519 密钥，只需要把公钥分别添加到 GitHub 和 Gitee 的 SSH keys 页面即可。

## 五、新电脑恢复流程

当那一天真的来了，只需要跑这几步：

```bash
# 1. 安装 Git
# 2. 克隆 dotfiles
git clone https://gitee.com/Westbrook04/dotfiles.git ~/dotfiles
# 3. 一键部署所有配置
bash ~/dotfiles/install.sh
```

脚本会备份旧文件（如果有的话），然后把所有配置复制到正确位置。

## 六、补充：其他几类数据的迁移思路

除了 dotfiles 覆盖的环境配置之外，这次梳理过程中还总结了其他几类数据怎么处理：

| 类型 | 方案 |
|------|------|
| 笔记/文档 | Obsidian + 同步盘（或飞书/Notion），不再落本地 |
| 密码/密钥 | Bitwarden 或 1Password，换机只需登录 |
| 浏览器 | Chrome/Edge 登录账号同步书签和扩展 |
| 本地服务 | Docker Compose 管理，数据卷打包迁移 |
| 定时任务 | `crontab -l > backup`，存进 dotfiles |
| 全局工具 | `brew bundle dump` / `pip freeze` 导出清单 |

## 七、复盘

这次做 dotfiles 最核心的收获不是技术细节，而是思维方式的变化：**把电脑当成可替换的执行者，而不是不可复制的孤岛**。

之前总觉得旧电脑有价值是因为「用习惯了」，但仔细想想，「习惯」其实就是那些配置文件。只要配置在、数据在云端、服务能容器化，换电脑就只是一个重新部署的过程，而不是从头开始。

下一步计划是把手头跑在本地的一些服务（主要是数据库和开发环境）逐步 Docker 化，让整个开发环境真正做到「一次配置，到处恢复」。
