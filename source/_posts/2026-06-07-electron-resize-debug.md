---
title: 一个 resize 不生效的 Bug，AI 是怎么一步步帮我找到根的
date: 2026-06-07 20:00:00
updated: 2026-06-07 20:00:00
categories: 技术
tags:
- Electron
- Debug
- 编程经验
- AI辅助开发
---

这次排查一个 Electron 窗口大小问题的经历，我觉得挺能体现"AI 辅助调试"的价值的。不是说 AI 一下子就知道答案，而是它带着你一层层剥开问题，最终找到根因。

## 背景

项目是个 Electron + React 的学生管理系统。登录页窗口是 465x425，主页面是 1200x800。退出登录时，应该把窗口从 1200x800 调回 465x425，回到登录页。

代码逻辑很直接：

```typescript
// 退出登录
clearAuth()
window.electronAPI.resizeWindow(465, 425)
navigate('/login')
```

```typescript
// 登录页加载
useEffect(() => {
  window.electronAPI.resizeWindow(465, 425)
}, [])
```

但实际效果是：退出后窗口还是 1200x800，没变小。

## 第 1 步：确认代码有没有被执行

我问 AI："窗口没变小怎么办"。它没直接说"你改这里"，而是说：**先确认 resize 函数有没有被调起来**。

它在三个地方加了 `console.log`：

- 退出登录的处理函数里
- LoginPage 的 useEffect 里
- Electron 主进程的 ipcMain 监听器里

重启、操作、看 Console：

```
退出登录: 开始清 auth 并 resize
退出登录: resize 已发送，准备跳转
LoginPage: 准备 resize 到 465x425
```

前端正常，都调了。前端没毛病。

## 第 2 步：确认 IPC 有没有传到主进程

"前端调了"不等于"Electron 执行了"。中间隔了一层 IPC（进程间通信）。于是看 Electron 启动终端的输出：

```
[主进程] resize-window 收到: 465x425
[主进程] setSize 执行完毕
```

两端都有日志，IPC 通了，`setSize` 也执行了。但窗口没变。

## 第 3 步：查 Electron 的 setSize 为什么没生效

这就到了有意思的地方。AI 问我 Electron 窗口是怎么创建的。我给了 `main.ts` 的代码，它一眼看到这行：

```javascript
mainWindow = new BrowserWindow({
    width: 465,
    height: 425,
    resizable: false,   // ← 是它在搞鬼
})
```

`resizable: false` 禁用了窗口手动缩放，但没想到 **连 `setSize()` 也一起禁了**。Electron 的行为是：`resizable: false` 时，`setSize()` 不报错、不警告，就静静地什么也不做。

修复就一行：

```javascript
mainWindow.setResizable(true)
mainWindow.setSize(width, height)
mainWindow.center()
mainWindow.setResizable(false)
```

先解锁，再调大小，再锁上。

## 这次调试的流程

```
问题 → 窗口没变小
  │
  ├─ ① 检查前端代码 → 调用了，没问题
  │
  ├─ ② 检查 IPC → 传到了，没问题
  │
  ├─ ③ 检查主进程 → setSize 执行了，但没效果
  │
  └─ ④ 查 Electron 文档 → resizable: false 禁止了 setSize
       │
       └─ 加 setResizable(true) 解决 ✅
```

每个步骤都是先确认"这层没问题"，再往下走。没有跳过、没有猜、没有"试试别的"。

## 和 AI 配合调试的体会

这次最值的不是"AI 知道 `resizable: false` 会影响 `setSize`"（其实查一下文档也能知道），而是它**逼着我一步步验证**。每次我说一个现象，它就建议加一行日志确认，从不跳过推理步骤。

如果是我自己修，我可能会：
1. 先搜一圈
2. 试几个网上说的方案
3. 不行就摆烂

但 AI 的方法是：**数据驱动，逐层排查，找到根因再动手修**。这个流程比修好这个 bug 本身更有用。

## 总结

- `Electron` 的 `resizable: false` 会静默阻止 `setSize()`，不报错
- 跨进程调试时，每层都加日志，确认问题出在哪一层
- AI 调试的价值不是"直接给答案"，而是引导你走完排查流程
