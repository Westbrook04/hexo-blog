---
title: JSON 语法入门：对象、数组、与 Java 的对应关系
date: 2026-06-05 23:00:00
updated: 2026-06-05 23:00:00
categories: 学习笔记
tags:
  - JSON
  - Java
  - Spring Boot
  - 前端基础
---

今晚在写 Spring Boot 学生管理系统的时候，卡在一个特别基础的问题上——JSON 的 `{}` 和 `[]` 到底什么区别？

之前一直在"照葫芦画瓢"地写 JSON，知道大概格式但不清楚背后的规则。今晚顺手用 Postman 测后端接口的时候，对着一个实际的工作 JSON 仔细看了一遍，把这块搞通了。

## {} 和 [] 最直观的区别

`{}` 表示**一个对象**，`[]` 表示**一组对象**。

```
{} → 一个东西，它有各种属性
[] → 一堆东西，每个都是同类型的
```

从 Java 的角度理解就是：

| JSON 写法 | 含义 | 对应 Java |
|-----------|------|-----------|
| `{ }` | 一个对象 | 一个实体类实例 |
| `[ ]` | 一组对象 | List/数组 |
| `"key": value` | 对象的属性 | 字段名 = 值 |

## 从实际例子理解

我写的学生 POST 请求长这样：

```json
{
    "studentName": "张三",
    "studentClass": {
        "classId": "C01"
    }
}
```

整个请求体被 `{}` 包住，表示"一个学生对象"。
里面是 `"字段名": 值` 的键值对，`studentClass` 的值本身又是一个 `{}`（班级对象）。

如果返回的是多个学生，响应体就是 `[]`：

```json
[
    { "studentId": "S001", "studentName": "张三" },
    { "studentId": "S002", "studentName": "李四" }
]
```

## 分析一个真实的接口 JSON

这算是一个比较典型的 JSON 结构：

```json
{
    "incompleteName": false,
    "dispensable": false,
    "intendedVehicle": "Vehicle-04",
    "type": "Park",
    "destinations": [
        {
            "locationName": "Storage 01",
            "operation": "Load cargo",
            "properties": [
                { "key": "key1", "value": "value1" }
            ]
        }
    ],
    "properties": [
        { "key": "key1", "value": "value1" }
    ],
    "dependencies": []
}
```

一层层拆开看：

- 外层 `{}` → 一个任务对象
- `incompleteName: false` → 布尔值字段（Java 里对应 boolean）
- `intendedVehicle: "Vehicle-04"` → 字符串字段（Java 对应 String）
- `destinations: [...]` → 目的地列表（Java 对应 List），里面每个元素是 `{}`（目的地对象）
- `dependencies: []` → 空数组，表示目前没有依赖

这就是 JSON 的核心结构——`{}` 包一个，`[]` 包多个，可以任意嵌套。

## 几个容易踩的坑

**1. 字段名必须双引号**

```json
// ❌ 错（JavaScript 对象可以不加引号，但 JSON 不行）
{ name: "张三" }

// ✅ 对
{ "name": "张三" }
```

**2. JSON 里没有注释**

```json
// ❌ 不能写注释
{
    "name": "张三"   // 这是姓名
}
```

这是 JSON 和 yml/properties 配置文件的区别。

**3. 最后一个字段后面不能有逗号**

```json
// ❌ 错
{
    "name": "张三",
    "age": 18,      ← 多了一个逗号
}

// ✅ 对
{
    "name": "张三",
    "age": 18
}
```

## 对学习新技术的反思

今天这个 JSON 问题，说大不大，但让我意识到一个问题——**我在用一个技术之前，往往没把它的基本功搞清楚，就开始"用"了。** JSON 看起来简单，但 `{}` 和 `[]` 的区分、字段名为什么要加双引号、值和类型的对应关系——这些都是应该在手写第一个 JSON 之前就搞明白的。

这也让我反思 Spring Boot 的学习：项目能跑起来了，CRUD 接口也能调通了，但底层的注解原理、JSON 序列化机制、HTTP 协议的状态码含义——这些基础迟早要补，不然遇到问题就是一脸懵。

**下一步：** JSON 基本语法过关了，接下来搞清楚 HTTP 状态码（200、201、404、500）和 RESTful API 的设计规范。这些东西和 JSON 一样，是后端开发每天都要面对的基础，早搞通早省心。
