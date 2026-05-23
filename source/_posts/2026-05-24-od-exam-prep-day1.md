---
title: 华为OD机试备考 Day1 —— 从C语法打架到跑通牛客环境
date: 2026-05-24 20:30:00
updated: 2026-05-24 20:30:00
categories: 学习笔记
tags:
  - OD
  - Java
  - 牛客
  - 刷题
  - 华为
---

今天正式启动华为 OD 的机试备考。开始日期是 5 月 24 日，四周围期，Day 1 的任务是熟悉牛客网的编译环境，以及对输入输出做一个快速热身。

本来以为 Day 1 应该就是配个环境、跑通一个 Hello World 级别的题，结果真上手了才发现，Java 写法和 C 的语法习惯打了一晚上的架。

## 第一天都在跟什么较劲

### 1. 数组定义，以为是 C

刚开始习惯性写出 `long visited[3] = {0};` —— 然后反应过来 Java 数组不是这么写的。

在 Java 里，如果编译期已知元素就用 `int[] arr = {1, 2, 3}`。如果大小取决于运行时，比如从 Scanner 读到的 n 决定数组长度，就要用 `int[] arr = new int[n]`。也知道了 `Set` 是无序不重复的集合，不支持下标访问，不是存连续结果集应该用的结构。

### 2. 动态扩容用 ArrayList

因为不确定结果的数量，最开始想用数组但是没法提前确定 size。看完之后改成 `List<Long> visited = new ArrayList<>()`，用 `add()` 往里加，用 `get(i)` 索引读取，这和 C 的 `visited[i]` 写法差异还挺大。

### 3. int 和 long 的选取踩了越界的坑

有个场景是多组数据求和，两层循环累加。一开始用的 `int sum = 0`，答案越界。换成 `long sum = 0` 解决。

int 是 32 位，最大 ±21 亿；long 是 64 位，最大 ±922 亿亿。判断标准很简单：两个 int 相乘或者累加如果可能超过 21 亿，就用 long。Oj 里 99% 的场景 long 够用，`BigInteger` 目前暂时不需要碰。

### 4. 曾想用 BigInteger 但发现拼错了

还写了一句 `import java.math.BigInteger` 想用大整数类，但 Java 里只有 `BigInteger`，没有 `BigInteger`。而且 `BigInteger` 不能用运算符，必须用 `add()` 方法。当然这个问题因为 `long` 已经解决了，实际上也没用上。

### 5. hasNext 和 hasNextLine 的区别

`hasNext()` 判断还有没有下一个 token（以空白分隔），`hasNextLine()` 判断还有没有下一行（以换行分隔）。逐数字读取用 `hasNext()` 就够了，`hasNextLine()` 一般配 `nextLine()` 用在字符串逐行处理的场景。

### 6. 输出格式不加多余空格

输出 "3 2 1" 这种格式，最干净的做法是用 `StringJoiner`：

```java
StringJoiner sj = new StringJoiner(" ");
for (int num : arr) sj.add(String.valueOf(num));
System.out.println(sj);
```

不需要在循环里手动判断 `i != n - 1` 加空格。

## 关于跑通环境这件事

今天的原定目标是"跑通牛客环境"。第一天的感觉是：环境本身不难，但如果你还在跟 Java 语法打架，就很容易花一晚上在纠结语言怎么写、而不是在练题。真正意义的"跑通"就是打开牛客选一道题，写完代码提交看到绿色的"通过"。

现在还差这一步没做，明天补上。

## 今天的收获

- Java 数组、ArrayList、Set 的基本区别搞清楚了
- int 和 long 的取值范围做了硬性记忆
- Scanner 的 `nextInt()` 自动跳过所有空白字符（包括换行），不需要自己处理
- `StringJoiner` 处理输出格式很顺手

## 后续注意

Day 2 任务是数组和字符串相关题目，建议先花 15 分钟过一遍 Java 集合类的基本用法再上手写题，否则又会在语法上浪费时间。另外备考期间有一条很明确的规则——禁用 AI 写代码，遇到问题先想 30 分钟再看题解，这样才能真的练到东西。
