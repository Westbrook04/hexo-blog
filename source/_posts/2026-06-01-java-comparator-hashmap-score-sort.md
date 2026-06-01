---
title: 啃懂一段成绩排序代码：Arrays.sort 比较器与 HashMap 旁路存储
date: 2026-06-01 10:10:00
updated: 2026-06-01 10:10:00
categories: 学习笔记
tags:
- Java
- 算法
- 华为OD
- Comparator
- HashMap
---

今天刷华为机试 HJ68 成绩排序，看到一份 Java 题解卡住了，逻辑绕得没看懂。拆开之后发现难点其实就三块：二维数组存编号、Lambda 比较器、HashMap 旁路存姓名。把这段语法彻底搞明白，顺便记下来。

先贴完整代码：

```java
import java.util.*;

public class Main {
    public static void main(String[] args){
        Scanner sc = new Scanner(System.in);
        HashMap<Integer,String> map = new HashMap<>();
        while(sc.hasNextLine()){
            int n = Integer.parseInt(sc.nextLine());
            int flag = Integer.parseInt(sc.nextLine()); // 1升序，0降序
            int[][] score = new int[n][2];              // 列：编号、成绩
            for(int i=0;i<n;i++){
                String[] nameAndScore = sc.nextLine().split("\\s+");
                score[i][0] = i;
                score[i][1] = Integer.parseInt(nameAndScore[1]);
                map.put(i, nameAndScore[0]);
            }
            Arrays.sort(score,(o1,o2) ->{
                if(flag==0){
                    return o2[1] - o1[1]; // 降序
                }else{
                    return o1[1] - o2[1]; // 升序
                }
            });
            for(int i=0;i<n;i++){
                System.out.println(map.get(score[i][0]) + " " + score[i][1]);
            }
        }
    }
}
```

## 卡点一：为什么要用二维数组 + HashMap 这么绕

这道题每个人有「姓名 + 成绩」两个字段，按成绩排序。正常思路是定义一个类或结构体把姓名和成绩绑一起排。但这份题解换了个取巧的法子。

关键在于 `int[][]` 是整型数组，装不下字符串。所以作者把姓名甩出去，数组里只放两列纯数字：

```java
int[][] score = new int[n][2]; // [i][0]=编号, [i][1]=成绩
```

姓名单独存进一个 HashMap，用编号当 key：

```java
map.put(i, nameAndScore[0]); // 编号 i → 姓名
```

这里最妙的一笔是 `score[i][0] = i`——**编号直接等于输入顺序的下标**。排序时数组里的行会被打乱，但每一行都带着自己的原始编号，排完之后凭编号去 map 里把姓名捞回来：

```java
System.out.println(map.get(score[i][0]) + " " + score[i][1]);
```

一句话概括这个套路：**只让数字参与排序，字符串旁路寄存在 HashMap 里，靠编号把两边重新对上。**

## 卡点二：split("\\s+") 那两个反斜杠

读每行用了正则切分：

```java
String[] nameAndScore = sc.nextLine().split("\\s+");
```

`\\s` 在 Java 字符串里其实代表正则的 `\s`（任意空白），因为 Java 字符串本身要对反斜杠转义，所以源码里得写两个反斜杠。`+` 表示一个或多个，连一起就是「按一段空白切开」。结果是个 `String[]`，`[0]` 是姓名，`[1]` 是成绩字符串，再用 `Integer.parseInt` 转成 int。

## 卡点三：Lambda 比较器和返回值规则

这是整段最难的地方：

```java
Arrays.sort(score, (o1, o2) -> {
    if(flag==0){
        return o2[1] - o1[1]; // 降序
    }else{
        return o1[1] - o2[1]; // 升序
    }
});
```

`Arrays.sort(数组, 比较器)` 的第二个参数 `(o1,o2)->{...}` 是一个 Lambda，等价于一个比较函数。`o1`、`o2` 是数组里被两两拿出来比较的元素，这题里各是一个 `int[2]`（一行：编号+成绩）。

比较器的返回值规则必须背死：

- 返回**负数** → o1 排前面
- 返回**正数** → o2 排前面
- 返回**0** → 不交换，保持原序

代入看：

- `o1[1] - o2[1]`：o1 成绩小就得负数，小的排前 → 升序
- `o2[1] - o1[1]`：反过来 → 降序

我以前总记不住方向，现在记一个口诀：**`o1 - o2` 是升序**，按从小到大「自然顺序」记，反过来就是降序。

## 一个藏起来的稳定性细节

这题成绩相同的人要保持输入顺序。比较器里成绩相等时返回 0，但「返回 0 能不能保住顺序」其实取决于排序算法稳不稳定。

刚好 `Arrays.sort` 对**对象数组**（`int[][]` 是对象数组）用的是 TimSort，本身就是稳定排序，所以这题侥幸能过。但如果是 `Arrays.sort` 对**基本类型数组**（比如 `int[]`），底层是双轴快排，不稳定——只是基本类型也没有「相等还要保序」的需求，所以无所谓。这个区别值得记一笔。

另外 `o2[1] - o1[1]` 这种**减法比较**有个坑：如果数值可能是负数或接近 int 边界，相减会溢出，比较结果就错了。本题成绩都是正常分数，安全。但更稳妥的写法是 `Integer.compare(a, b)`，它内部用比较而不是减法，不会溢出。

## 总结

这段代码看着绕，本质就三件事：数字进数组排序、字符串进 HashMap 寄存、靠编号对应。真正值钱的语法点是 Lambda 比较器那套返回值规则，以及 `Arrays.sort` 对对象数组稳定、对基本类型数组不稳定的区别。

说实话这份题解为了塞进 `int[][]` 绕了一圈，远不如直接定义一个类来排清爽。但拆解的过程反而把比较器、HashMap、正则切分这几个语法点都过了一遍，比直接抄一份干净答案学到的多。卡点已经记进薄弱点池，下次自己默写一遍 `Arrays.sort` + Lambda 才算真会。
