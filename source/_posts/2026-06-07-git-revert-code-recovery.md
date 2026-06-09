---
title: Git Revert 后代码丢失，怎么从仓库底层把文件捞回来
date: 2026-06-07 18:00:00
updated: 2026-06-07 18:00:00
categories: 技术
tags:
- Git
- 版本控制
- 填坑记录
---

这次在做学生管理系统时，因为操作 Pull Request 不小心，走了一遍"合并 → Revert → 代码消失 → 底层恢复"的全流程，记录一下。

## 事情经过

当时我在 `feat-admin-login` 分支上开发管理员登录功能，包括后端登录接口、Token 鉴权、前端登录页面。开发完提了 Pull Request 合到 `master`。

本来一切正常，但后来在测试 PR 流程时（想模拟 Review 拒绝的场景），不小心把合并分支和修复提交一起操作了。之后在 GitHub 上点了 Revert，把整个合并给撤销了。

当时没太在意，继续从 master 切了新分支 `feat-class-student-crud` 准备开发班级和学生的管理功能。结果一跑项目——Java 后端代码全不见了，启动类找不到，编译报错。

## 排查过程

先是 `git log` 看了一下：

```
39ea880 Merge pull request #3 (revert-2-feat-admin-login)
283055d Remove username and password logging in login method
4dd26a7 Merge pull request #2 (feat-admin-login)
```

Revert 的 Merge 确实在历史里。但分支上的 commit 已经找不到了，`feat-admin-login` 本地分支也删了。

再用 `ls` 一看，`SMS-backend/` 目录整个不存在。Maven 编译 0 个源文件。

## 怎么恢复的

最初的想法是"从 git 历史里 checkout 出来"，结果发现文件不在任何可访问的 commit 的 tree 里——因为代码是 staging 后 commit 在 feat-admin-login 分支上的，分支删除 + Revert 之后，这些 commit 就不可达了。

但 git 不会立刻删除对象，只要还没有被 gc 回收，就能从底层对象库里捞出来。

关键命令是 `git rev-list --all --objects`，它会扫描所有还存在的 git 对象（包括不被任何分支引用的）：

```bash
git rev-list --all --objects | grep "\.java$"
```

输出了一堆 blob hash 和文件路径：

```
eb61fa2bec8d33c5f5ef3097d0c5850995fda294 SMS-backend/main/java/com/example/sms/SmsApplication.java
4ff65af088820f69e10cbb8d12b46a119e89707a SMS-backend/main/java/com/example/sms/config/AuthInterceptor.java
...
```

文件还在对象库里，只是没被检出。逐个恢复：

```bash
git cat-file -p <blob-hash> > SMS-backend/main/java/com/example/sms/SmsApplication.java
```

写了个脚本把所有 Java 文件一次性恢复，然后 `./mvnw compile` —— 16 个源文件，编译通过。

额外还要把 `pom.xml` 加上 `<sourceDirectory>` 配置，告诉 Maven 去 `SMS-backend/` 找源码：

```xml
<build>
    <sourceDirectory>SMS-backend/main/java</sourceDirectory>
    <resources>
        <resource>
            <directory>SMS-backend/main/resources</directory>
        </resource>
    </resources>
</build>
```

## 要点总结

- **`git revert` 不是删除历史，而是生成反向提交**。被 revert 的代码还在 git 对象库里存着，只是不在工作目录而已。
- **`git rev-list --all --objects`** 可以扫描所有存活的 git 对象，配合 `grep` 能找到丢失的文件。
- **`git cat-file -p <blob-hash>`** 把对象内容输出到文件，相当于从底层把文件捞出来。
- **恢复之后别忘了配置文件**——这次 pom.xml 的 sourceDirectory 也需要调整，不然 Maven 找不到源码。
- **如果分支被删了 + 被 gc 了，就真的没了**。git 的 gc（垃圾回收）会清理不可达的对象，默认几周后触发。所以发现代码丢失后尽快恢复，别拖太久。

## 教训

Pull Request 的 Revert 按钮点下去之前，想清楚后果。如果只是要修一个小问题，在同一个分支继续提交、重新提 PR 就好，不需要 revert。
