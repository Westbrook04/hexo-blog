---
title: Git 多平台身份管理：同时使用 GitHub 和 Gitee 不冲突
date: 2026-05-23 15:30:00
updated: 2026-05-23 15:30:00
categories: 技术实践
tags:
- Git
- SSH
- 环境配置
---

国内开发者经常要同时用 GitHub（国际）和 Gitee（国内），但 Git 的全局配置 `user.name` 和 `user.email` 全局只有一套。如果两个平台用不同的名字或邮箱，每次切换仓库都要手动改，很麻烦。

下面是我用的方案：**`includeIf` + SSH 多 key 配置**，一次配好，后续无感。

## 一、核心思路

按目录自动切换身份：在 `~/github/` 下的仓库自动用 GitHub 身份，其他所有目录默认用 Gitee 身份。

实现依赖 Git 的 `includeIf` 条件包含功能，它会在读取全局配置后再根据条件加载额外的配置文件，后者覆盖前者。

## 二、Git 配置

默认身份设为 Gitee（最常用），放在 `~/.gitconfig`：

```ini
[user]
    name = 刘正威
    email = 11799741+westbrook04@user.noreply.gitee.com

[includeIf "gitdir:~/github/"]
    path = ~/.gitconfig-github
```

GitHub 专用身份写在单独的文件 `~/.gitconfig-github`：

```ini
[user]
    name = Liu Zhengwei
    email = 11799741+westbrook04@users.noreply.github.com
```

这样只要把 GitHub 仓库 clone 到 `~/github/` 目录下，commit 时自动走 GitHub 身份；其他仓库（包括 `~/dotfiles/` 等）全部默认用 Gitee。

### 更多目录拆分

如果有更多平台需要区分，可以继续加：

```ini
[includeIf "gitdir:~/work/"]
    path = ~/.gitconfig-work
[includeIf "gitdir:~/github/"]
    path = ~/.gitconfig-github
```

## 三、SSH 配置

GitHub 和 Gitee 的 SSH 连接也要区分，虽然可以用同一个密钥，但最好在 SSH config 里显式声明，方便以后按需更换密钥。

`~/.ssh/config`：

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

两个平台用同一个 `id_ed25519` 密钥完全可以，只需要把公钥分别添加到两个平台的 SSH keys 设置页面即可。

需要注意的是加上 `User git`——GitHub 和 Gitee 的 SSH 协议都是通过 `git` 用户连接的，不写的话 SSH 会用当前系统用户名，可能导致连接失败。

## 四、验证配置

配置完成后，两步确认一切正常。

先确认 SSH 连接：

```bash
ssh -T git@github.com
# Hi Westbrook04! You've successfully authenticated...

ssh -T git@gitee.com
# Hi 刘正威! You've successfully authenticated...
```

再确认 Git 身份是否按目录自动切换：

```bash
cd ~/github/some-repo && git config user.name
# Liu Zhengwei

cd ~/dotfiles && git config user.name
# 刘正威
```

## 五、踩坑记录

### 1. includeIf 的路径语法

`gitdir:` 后面的路径是相对于 `~` 的，不用写完整路径。`~/github/` 正确，`/c/Users/name/github/` 虽然也能用但不够可移植。

路径末尾的 `/` 不能少——它表示匹配目录下的所有子目录，不加 `/` 则匹配字面路径。

### 2. SSH 配置文件权限

Windows Git Bash 下 SSH 对私钥文件的权限要求很严格。如果遇到 `Load key ... Permission denied` 的错误，检查私钥权限是否被改成了 644。需要改为 600：

```bash
chmod 600 ~/.ssh/id_ed25519
```

Windows 上的 Git Bash 有时会因为 ACL 问题导致权限不对，可以用 `ls -la` 检查。

### 3. 邮箱用 noreply

GitHub 和 Gitee 都提供了 noreply 邮箱功能，在 Settings → Emails 里开启「保持我的邮箱地址私密」后，平台会给你一个 `id+username@users.noreply.github.com` 之类的邮箱。用这个地址提交就不会暴露个人邮箱。

## 六、总结

这套配置的核心就两个文件：`~/.gitconfig` 用 `includeIf` 分目录管理身份，`~/.ssh/config` 分 Host 管理密钥。配好之后，日常在两个平台之间切换完全没有感知，也不需要任何手动操作。

配合 dotfiles 管理的话，这些配置还可以一键同步到新电脑——这就是另一个话题了。
