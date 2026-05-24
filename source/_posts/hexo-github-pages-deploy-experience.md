---
title: Hexo 博客部署到 GitHub Pages 的一次实战记录
date: 2026-05-21
tags:
- Hexo
- GitHub Pages
- 部署复盘
categories: 技术实践
---

今天把自己的 Hexo 博客部署到 GitHub Pages，原本以为仓库已经传到 GitHub 上，博客地址应该就能直接访问，结果打开 `https://westbrook04.github.io/hexo-blog/` 时只看到了一个 `404` 页面。

这次排查下来发现，Hexo 部署到 GitHub Pages 这件事看起来简单，但真正容易出问题的地方并不在写文章，而是在“仓库存在”和“站点已经发布”这两个概念很容易被混在一起。GitHub 上有仓库，并不代表博客已经能被公网访问。

## 先说现象

我当时的目标很明确，就是把本地的 Hexo 项目发到 GitHub Pages，然后通过固定地址访问博客。但实际情况是：

- 仓库已经存在于 GitHub
- 本地项目也能正常运行
- 访问 Pages 地址时却是 `404`

刚开始很容易怀疑是域名写错了，或者 Hexo 主题有问题，但这次真正的原因并不在这里。

## 这次排查到的几个关键问题

### 1. 只有源码仓库，没有真正的发布流程

最核心的问题是：仓库里虽然有 Hexo 的源码，但 GitHub Pages 并不会自动把这些源码变成可访问的网站。

如果没有额外配置，GitHub 只会把它当作一个普通代码仓库。也就是说，`source`、`themes`、`_config.yml` 这些文件只是博客工程本身，不是最终可访问的静态页面。

这一步如果没有部署流程，Pages 地址返回 `404` 就很正常。

### 2. 仓库里没有 `gh-pages` 分支，也没有自动部署工作流

排查时又确认了一点：仓库里既没有专门放静态页面的 `gh-pages` 分支，也没有 GitHub Actions 自动构建和发布流程。

这说明一件事：GitHub 上根本还没有接收到 Hexo 生成出来的 `public` 目录内容。没有生成后的静态资源，自然也就没有网页可访问。

### 3. Hexo 的站点地址配置需要和仓库路径一致

Hexo 不是只要能生成页面就够了，站点配置里的 `url` 和 `root` 也必须和最终访问路径匹配。

因为我用的是项目仓库方式部署，也就是博客地址里带仓库名：

```text
https://westbrook04.github.io/hexo-blog/
```

所以配置里应该写成：

```yml
url: https://westbrook04.github.io/hexo-blog
root: /hexo-blog/
```

如果这里不对，常见结果就是页面能打开，但样式、脚本或者图片路径全错；如果部署本身也没完成，那就会和这次一样，先表现成 `404`。

## 最后采用的解决方案

这次我没有走手动维护 `gh-pages` 分支的方式，而是直接用了 GitHub Actions 自动部署。原因很简单：源码分支和发布流程分开之后，后续只需要正常写文章、提交代码，剩下的构建和发布交给 GitHub 自动完成，维护成本更低。

这次最终的修复方案分成三步：

### 第一步，修正 Hexo 配置

在 `_config.yml` 里把站点地址改成和 GitHub Pages 完全一致：

```yml
url: https://westbrook04.github.io/hexo-blog
root: /hexo-blog/
```

这一步的作用是告诉 Hexo：生成出来的所有静态资源，都要以 `/hexo-blog/` 作为根路径。

### 第二步，新增 GitHub Pages 工作流

在仓库里新增 `.github/workflows/pages.yml`，让 GitHub 在每次推送到 `master` 分支后自动执行：

1. 拉取仓库代码
2. 安装依赖
3. 运行 `hexo generate`
4. 上传 `public` 目录
5. 发布到 GitHub Pages

这样仓库就不只是“存代码”，而是真正具备了“自动发布博客”的能力。

### 第三步，在 GitHub 仓库设置里启用 Pages

除了工作流文件本身，还需要去仓库设置里把 Pages 的来源切换成 `GitHub Actions`。

路径是：

```text
Settings > Pages > Build and deployment > Source > GitHub Actions
```

这一步很多人容易漏掉。工作流已经写了，但如果 Pages 没有切到 `GitHub Actions`，站点照样不会正常发布。

## 这套流程以后可以直接复用

如果以后我再新建一个 Hexo 博客，基本可以直接按下面这套步骤走。

### 1. 先准备 Hexo 项目并确认本地能运行

本地至少要能正常执行：

```bash
npm run build
```

如果本地都不能成功生成，先不要急着发布到 GitHub Pages。

### 2. 配置正确的 `url` 和 `root`

如果是项目仓库，例如：

```text
https://用户名.github.io/仓库名/
```

那就写成：

```yml
url: https://用户名.github.io/仓库名
root: /仓库名/
```

如果是用户主页仓库，也就是：

```text
https://用户名.github.io/
```

那通常写成：

```yml
url: https://用户名.github.io
root: /
```

### 3. 给仓库加 GitHub Actions 部署工作流

核心思想不是把源码直接给 GitHub，而是让 GitHub 帮我们把 Hexo 工程构建成静态站点，再发布到 Pages。

### 4. 推送代码后检查 Actions

推送以后不要直接去刷新站点地址，应该先看：

- `Actions` 页面里工作流有没有开始执行
- 构建有没有报错
- Pages 有没有显示发布成功

如果这里没有成功，页面地址通常不是 `404`，就是资源不完整。

## 这次最大的经验

这次最值得记住的一点是：**GitHub Pages 的站点能不能访问，核心不在“仓库有没有上传”，而在“静态页面有没有被真正发布”。**

所以以后只要再遇到类似问题，我会优先检查这几个点：

- 仓库的 Pages 来源到底是什么
- 有没有真正执行构建和发布
- `url` 和 `root` 是否和仓库路径一致
- GitHub Actions 有没有成功跑完

把这几个地方理顺之后，Hexo 部署到 GitHub Pages 其实就很稳定了。后面更新博客时，只需要继续写文章、提交代码、推送仓库，剩下的交给自动化流程处理就行。
