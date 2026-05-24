---
title: 博客图片优化：从2.1MB到269KB
date: 2026-05-23 15:00:00
updated: 2026-05-23 15:00:00
categories: 技术实践
tags:
- Hexo
- 性能优化
- 博客
- 图片压缩
---

## 一、问题

博客用 Hexo + Fluid 主题跑在 GitHub Pages 上，一直觉得加载有点慢，尤其是翻到某篇文章时图片加载明显卡顿。

排查后发现根因很简单：`source/images/backend/backend-developer.png` 这张图 **2.1MB**。

一张 1536×1024 的 PNG，尺寸不算夸张，但体积大到离谱。GitHub Pages 的 CDN 节点主要在海外，国内访问本就绕路，再拖个 2MB 的图，慢是必然的。

## 二、三条优化路径

### 方案 A：手动压缩（立即见效）

Python 的 Pillow 库可以直接处理：

```python
from PIL import Image

img = Image.open('backend-developer.png')
img = img.resize((900, 600), Image.LANCZOS)
img = img.quantize(colors=256, method=Image.MEDIANCUT)
img.save('backend-developer.png', optimize=True)
```

三步操作：
- 宽度从 1536 缩到 900（博客配图不需要那么宽）
- 转为 256 色调色板模式（PNG-8，非照片类图完全够用）
- 开启 optimize 标志

结果：**2.1MB → 272KB**，减少了 87%，肉眼几乎看不出差异。

### 方案 B：自动化压缩（长期方案）

手动压缩只能管一次，以后加新图还得记着。更好的方式是在构建流程中自动做。

`hexo-all-minifier` 这个插件能在 `hexo generate` 时自动压缩图片、HTML、CSS、JS：

```bash
npm install hexo-all-minifier
```

然后在 `_config.yml` 中开启：

```yaml
image_minifier:
  enable: true
  pngquant: false
```

这样每次构建都会自动压缩 `source/` 下的图片，新文章配图不会再出现 2MB 这种体积。

### 方案 C：换格式（终极方案）

如果愿意折腾，可以把博客配图统一转成 WebP 格式——同等质量下体积通常是 JPEG/PNG 的 60%-70%。但需要 Hexo 插件支持，并且要考虑浏览器兼容性。

## 三、为什么不用第三方图床

很多人会把博客图片传到 sm.ms、upyun 等图床来加速。但我不用的原因是：

- **迁移成本**：图床挂了图就没了，markdown 里的链接全部失效
- **额外的网络请求**：多一个域名意味着多一次 DNS 查询和 TLS 握手
- **Git 追踪**：图片放仓库里，哪张图什么时候改过一目了然

对于个人博客的图片量级，自包含在仓库里是更省心的选择。

## 四、效果

压缩后的图部署到 GitHub Pages，加载时间明显缩短。配合 `hexo-all-minifier`，后续所有图片自动压缩，不需要再手动操心。

如果你的 Hexo 博客也有加载慢的问题，可以先去看一下 `public/images/` 目录下有没有超过 500KB 的图片——大概率就是它拖慢了整个页面。
