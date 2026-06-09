---
title: PowerShell 常见问题排查：脚本执行策略与 Conda 环境配置
date: 2026-06-03 16:20:00
updated: 2026-06-03 16:45:00
categories: 技术
tags:
  - PowerShell
  - Windows
  - Conda
  - Python
  - 环境配置
---

踩过两次 PowerShell 的坑，记录一下解决方案，下次遇到直接翻这篇。

## 问题一：无法加载文件，因为在此系统上禁止运行脚本

运行 `.ps1` 脚本时弹出这个报错：

```
无法加载文件 xxx.ps1，因为在此系统上禁止运行脚本。
```

**原因**：PowerShell 的默认执行策略是 `Restricted`，禁止运行任何脚本文件，这是 Windows 的安全机制。

**解决方法**：以管理员身份打开 PowerShell，修改执行策略即可。

```powershell
# 查看当前策略
Get-ExecutionPolicy

# 设置为 RemoteSigned（推荐）：本地脚本直接运行，远程脚本需签名
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Force

# 或者只对当前用户生效
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
```

![](/images/powershell/image1.png)

各策略区别：

| 策略 | 说明 | 安全性 |
|------|------|--------|
| `Restricted` | 默认，禁止所有脚本 | 最高 |
| `RemoteSigned` | **推荐**，本地脚本放行，远程脚本需签名 | 中等 |
| `AllSigned` | 所有脚本需签名 | 较高 |
| `Bypass` | 不限制，完全放行 | 最低 |

> 详细参考：[Windows 中打开 PowerShell 后出现报错的解决方案 - AlphaGeek](https://www.cnblogs.com/geekbruce/articles/18905587)

---

## 问题二：PowerShell 中使用 Conda 报错

在 PowerShell 中使用 `conda activate` 时遇到：

```
Invoke-Expression : Cannot bind argument to parameter 'Command' because it is an empty string.
```

**原因**：`Conda.psm1` 模块中的 `$activateCommand` 变量为空，导致 `Invoke-Expression` 参数绑定异常。

**解决方法（二选一）：**

**方法 A**：修改 `Conda.psm1` 文件

找到 `Conda.psm1`（通常在 `%USERPROFILE%\anaconda3\shell\condabin\Conda.psm1`），把第 76 行附近的

```powershell
Invoke-Expression -Command $activateCommand;
```

改为：

```powershell
If(-not [String]::IsNullOrEmpty($activateCommand)) {
    Invoke-Expression -Command $activateCommand;
}
```

**方法 B**：重新初始化

```powershell
conda init powershell
```

这会重新生成 PowerShell 配置文件。

![](/images/powershell/image2.png)

> 详细参考：[Conda 在 PowerShell 中报错的处理 - CSDN](https://blog.csdn.net/m0_52182894/article/details/147025451)

---

PowerShell 这俩问题碰到频率挺高的，记下来下次可以直接翻。如果还有类似的坑，继续往这篇里加。
