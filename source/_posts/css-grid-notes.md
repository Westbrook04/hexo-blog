---
title: CSS Grid 布局学习笔记
date: 2026-05-18
tags:
- CSS
- Grid
categories: 学习笔记
---

最近深入学习 CSS Grid 布局，发现它比 Flexbox 更适合做二维布局。这里总结一些核心概念和实用技巧。

## 基本概念

Grid 布局将容器划分为行和列，可以精确控制元素的位置。

```css
.container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}
```

## 常见用法

- `grid-template-columns`：定义列宽
- `grid-template-rows`：定义行高
- `gap`：间距
- `grid-area`：元素定位

Grid 布局在处理复杂的页面布局时非常强大。
