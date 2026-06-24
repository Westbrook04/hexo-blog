---
title: Java 集合框架面试全攻略：从底层原理到项目实战
date: 2026-06-24 21:30:00
updated: 2026-06-24 21:30:00
categories: 学习笔记
tags:
- Java
- 集合框架
- 面试
- HashMap
- 源码分析
---

今天来系统梳理一下 Java 集合框架。这东西面试几乎必考，而且不是"背八股"就能糊弄过去的——面试官问到底层原理、线程安全、扩容机制这些的时候，光靠记忆很容易露馅。更重要的是，集合框架是日常项目中使用最频繁的基础设施之一，理解透了写代码的质量完全不同。

## 一、先搭框架

对集合框架的理解，第一件事就是搞清楚接口继承体系。很多面试的第一个问题就是："给我说说 Java 集合框架的层次结构。"

最简单的记忆方式：**两个根接口 + 三个实现分支**。

两个根接口是 `Collection` 和 `Map`，它们彼此独立。Collection 下面又分 `List`（有序可重复）、`Set`（无序不可重复）、`Queue`（队列）三个子接口。

```
Collection
├── List
│   ├── ArrayList
│   ├── LinkedList
│   └── Vector（已过时）
├── Set
│   ├── HashSet (依赖 HashMap)
│   ├── LinkedHashSet
│   └── TreeSet (依赖 TreeMap)
└── Queue
    ├── LinkedList
    ├── ArrayDeque
    └── PriorityQueue

Map
├── HashMap
├── LinkedHashMap
├── TreeMap
├── ConcurrentHashMap
└── Hashtable（已过时）
```

记住一点：**Set 底层实际上是 Map，只是 value 固定为一个常量占位**。比如 `HashSet` 底层就是一个 `HashMap`。理解了这条，很多问题就豁然开朗了。

## 二、ArrayList vs LinkedList：面试高频第一题

### 底层存储

**ArrayList** 底层是 **Object[] 数组**。连续内存空间，支持随机访问。

**LinkedList** 底层是 **双向链表**（Node 节点串联），不连续内存。

### 增删改查效率分析

纯理论我们都知道：ArrayList 随机访问 O(1)、插入删除 O(n)；LinkedList 随机访问 O(n)、插入删除 O(1)。

但面试官会追问：**"真的吗？LinkedList 的插入删除一定比 ArrayList 快？"**

答案是：**不一定**。

- **尾部插入**：ArrayList 如果不需要扩容，就是 O(1)；LinkedList 也是 O(1)（有尾指针）。这个场景 ArrayList 甚至更快，因为数组操作比 new Node() + 维护前后指针要轻量。
- **头部插入**：ArrayList O(n)，LinkedList O(1)。LinkedList 优势明显。
- **中间插入**：插入本身 LinkedList 是 O(1)，但 **找到插入位置** 是 O(n) 的遍历，所以整体还是 O(n)。ArrayList 也是 O(n)。区别在于 ArrayList 的 O(n) 是内存拷贝（`System.arraycopy`），LinkedList 的 O(n) 是遍历 + new Node。**实际测试中 ArrayList 在大数据量下往往更快**，因为 `System.arraycopy` 是 JVM 级优化过的本地方法。

### 项目中的选择经验

```
业务场景             推荐        原因
────────────────────────────────────────────────
根据下标频繁随机访问    ArrayList   O(1) 随机访问
尾部追加数据           ArrayList   O(1) + CPU 缓存友好
频繁头插/头删         LinkedList  O(1) 头尾操作
实现队列/FIFO          ArrayDeque  比 LinkedList 更轻量
数据量极小（<10）      ArrayList   简单可控
```

**实战教训**：不要迷信"LinkedList 插入快"这句话。如果你在一个 10 万数据的列表中随机位置插入，LinkedList 每次都要从头遍历到那个位置，总开销远大于 ArrayList 的批量内存移动。我当年在项目中写过一段代码，用 LinkedList 做按 key 索引的缓存，结果性能拉跨，换成 `HashMap + ArrayList` 结构直接提升了 3 倍。

### 扩容机制

ArrayList 的扩容是面试常考细节：

```java
// JDK 8 源码
private void grow(int minCapacity) {
    int oldCapacity = elementData.length;
    int newCapacity = oldCapacity + (oldCapacity >> 1); // 1.5 倍
    if (newCapacity - minCapacity < 0)
        newCapacity = minCapacity;
    if (newCapacity - MAX_ARRAY_SIZE > 0)
        newCapacity = hugeCapacity(minCapacity);
    elementData = Arrays.copyOf(elementData, newCapacity);
}
```

**扩容倍数：1.5 倍**（右移一位相当于除以 2）。为什么是 1.5 倍？太少会导致频繁扩容影响性能，太多会浪费内存空间。1.5 倍是个折中。

**性能优化**：如果知道数据量，构造函数传初始容量 `new ArrayList<>(1000)`，避免扩容带来的数组拷贝开销。

## 三、HashMap：面试必杀技

HashMap 是面试中的重灾区。从底层结构到树化逻辑，再到扩容和连环问，几乎每个细节都能问。

### 底层结构（JDK 8）

**数组 + 链表 + 红黑树**。当链表长度 ≥ 8 且数组长度 ≥ 64 时，链表转为红黑树。

为什么是 8？源码注释给了明确的理由——基于泊松分布的概率计算，在理想哈希函数下，链表长度达到 8 的概率约为 0.00000006，非常低。到了 8 说明哈希冲突已经严重到需要用红黑树来优化了。

### put 流程

```java
// 简化版流程
1. 计算 key.hashCode()，高位扰动（异或右移 16 位）
2. (n - 1) & hash 计算桶位置
3. 如果桶为空 → 直接放入
4. 如果桶有元素 → 比较 hash 和 equals
   - 相同 → 替换 value
   - 不同 → 链表/红黑树插入
5. 插入后判断是否超过阈值 → 需要则扩容
```

**高位扰动** 是 JDK 8 的优化：

```java
static final int hash(Object key) {
    int h;
    return (key == null) ? 0 : (h = key.hashCode()) ^ (h >>> 16);
}
```

为什么这样做？因为计算桶下标时用的是 `(n - 1) & hash`，n 通常是 16（即二进制 1111），高位根本没参与运算。如果不做扰动，高位不同但低位相同的 key 全都会碰撞到同一个桶里。异或高 16 位相当于把高位的特征也混入低位，减少碰撞。

### 扩容机制

```java
// 链表扩容：要么在原位置，要么在原位置 + oldCap
if ((e.hash & oldCap) == 0) {
    // 留在原位
} else {
    // 移动 oldCap 距离
}
```

这个设计很巧妙。扩容为原来的 2 倍后，`n - 1` 比之前多了 1 个 bit。判断新 bit 位是 0 还是 1，只需要 `hash & oldCap` 即可——因为 oldCap 是 2 的幂，二进制只有一个 1，那个 1 正好是新 bit 位的位置。

**结果**：扩容后链表上的节点不会整体重排，而是拆成高低两条链表，低链表留在原位，高链表移到 `index + oldCap` 位置。这样做避免了 JDK 7 中扩容死循环的 bug。

### JDK 7 vs JDK 8 对比

| 维度 | JDK 7 | JDK 8 |
|------|-------|-------|
| 数据结构 | 数组 + 链表 | 数组 + 链表 + 红黑树 |
| 插入方式 | 头插法 | 尾插法 |
| 扩容后 | rehash 重算 | 拆高低链表 |
| 扰动函数 | 4 次位运算 | 1 次异或 |
| 线程安全 | 不安全（死循环） | 不安全（数据覆盖） |

### 项目中的具体场景

**场景 1：数据聚合缓存**

我有一个项目需要将多条数据库记录按类型分组：

```java
// 订单按状态分组
Map<String, List<Order>> ordersByStatus = new HashMap<>();
for (Order order : orderList) {
    // computeIfAbsent 是 JDK 8 引入的，一行搞定
    ordersByStatus.computeIfAbsent(order.getStatus(), k -> new ArrayList<>())
                  .add(order);
}
```

`computeIfAbsent` 和 `computeIfPresent` 是项目中最实用的 HashMap 方法，能省不少样板代码。

**场景 2：配置缓存**

```java
@Component
public class ConfigCache {
    private final Map<String, String> cache = new HashMap<>();

    public String getConfig(String key) {
        return cache.get(key);
    }

    @Scheduled(fixedRate = 60000)
    public void refresh() {
        // 全量刷新，直接用引用替换，不影响读
        Map<String, String> newCache = new HashMap<>();
        // ... 从数据库/配置中心加载
        this.cache = newCache; // 原子操作
    }
}
```

这里的技巧是：用局部变量构建新 Map，构建完成后整引用替换。`this.cache = newCache` 是引用赋值，在 JVM 中是原子的。

### HashMap 的容量为什么是 2 的幂

因为 `(n - 1) & hash` 等价于 `hash % n` 但位运算更快。如果 n 是 2 的幂，n - 1 的二进制全是 1，这样与运算的结果就是 hash 的低位，分布均匀。如果 n 不是 2 的幂，n - 1 的二进制中有 0，某些桶永远不会有数据，造成浪费。

构造函数传 10 会怎么样？HashMap 会找到 >= 10 的最小 2 的幂，即 16。

```java
static final int tableSizeFor(int cap) {
    int n = -1 >>> Integer.numberOfLeadingZeros(cap - 1);
    return (n < 0) ? 1 : (n >= MAXIMUM_CAPACITY) ? MAXIMUM_CAPACITY : n + 1;
}
```

这串位运算把 cap - 1 的最高位 1 后面的所有 bit 全变成 1，再加 1 变成 2 的幂。

## 四、ConcurrentHashMap：线程安全的正确姿势

面试必问的进阶题：**"HashMap 线程不安全，那怎么用线程安全的 Map？"**

### 三种方案的演进

```java
// ❌ 错误：直接把 HashMap 用 synchronized 包裹
Map<String, Object> map = Collections.synchronizedMap(new HashMap<>());
// 早期，性能极差

// ✅ JDK 5: ConcurrentHashMap（分段锁）
// 将整个 Map 分成 16 个 Segment，每个 Segment 独立锁

// ✅ JDK 8: ConcurrentHashMap（CAS + synchronized）
// 取消了分段锁，改用 CAS + synchronized 锁单个桶
```

### JDK 8 的并发控制

```java
// put 流程
1. 如果桶为空 → CAS 写入（无锁）
2. 如果桶不为空 → synchronized 锁桶头节点
3. 如果链表超过阈值 → 转为红黑树
```

关键点：**只锁当前桶的头节点**，不同桶之间的操作完全并行。比 JDK 7 的 Segment 粒度更细。

### size 的计算

```java
// 用 CounterCell 数组来分散计数
// 类似 LongAdder 思想，每个线程在自己的槽位上累加
// 求和时把所有槽位的值加起来
```

这实际上是 Striped Counting 模式，也是 LongAdder 的实现思路——避免多线程竞争同一个 count 变量。

### 项目中用 ConcurrentHashMap 的真实例子

```java
// 内存中的在线用户统计
@Component
public class OnlineUserTracker {
    private final ConcurrentHashMap<Long, UserSession> onlineUsers = new ConcurrentHashMap<>();

    public void userLogin(Long userId, String sessionId) {
        onlineUsers.put(userId, new UserSession(userId, sessionId));
    }

    public void userLogout(Long userId) {
        onlineUsers.remove(userId);
    }

    public long getOnlineCount() {
        return onlineUsers.mappingCount(); // 不要用 size()，mappingCount 更准确
    }

    // 遍历所有在线用户（注意：遍历时可能数据变化）
    public void broadcastMessage(String message) {
        onlineUsers.forEach((userId, session) -> {
            // 每条连接发送消息
        });
    }
}
```

**注意**：`ConcurrentHashMap` 的 `size()` 方法由于历史原因返回 `int`，数据量大时可能溢出，官方推荐用 `mappingCount()` 返回 `long`。

## 五、TreeMap 与排序

### 底层原理

**红黑树**。插入 O(log n)，查找 O(log n)。

两种排序方式：

```java
// 方式一：Key 实现 Comparable
public class Student implements Comparable<Student> {
    @Override
    public int compareTo(Student o) {
        return this.score - o.score; // 升序
    }
}

// 方式二：构造函数传入 Comparator
TreeMap<String, Object> map = new TreeMap<>(Comparator.reverseOrder());
```

### 面试高频题：TreeMap 和 HashMap 怎么选

| 需求场景 | 选哪个 |
|----------|--------|
| 只需要快速存取，不需要有序 | HashMap |
| 需要按 key 自然顺序遍历 | TreeMap |
| 需要自定义排序规则 | TreeMap + Comparator |
| 需要保持插入顺序 | LinkedHashMap |
| 需要最近最少使用淘汰 | LinkedHashMap（accessOrder=true） |

### 项目场景：排行榜

```java
// 按分数从高到低排，同分按时间先后
Map<Player, Long> ranking = new TreeMap<>((a, b) -> {
    int scoreCmp = Long.compare(b.getScore(), a.getScore());
    if (scoreCmp != 0) return scoreCmp;
    return Long.compare(a.getCreateTime(), b.getCreateTime());
});
```

**注意**：用 `Long.compare` 而不是 `a - b`，因为 `a - b` 可能溢出，而且不符合 `compareTo` 的规范。

## 六、LinkedHashMap：被低估的实用类

### 两种遍历顺序

```java
// 保持插入顺序
LinkedHashMap<String, String> map = new LinkedHashMap<>();

// 按访问顺序（适合做 LRU 缓存）
LinkedHashMap<String, String> lru = new LinkedHashMap<>(16, 0.75f, true);
```

accessOrder 为 true 时，每次 `get` 或 `put`（更新已有 key）会把该节点移到链表末尾。结合 `removeEldestEntry`，一个 LRU 缓存就出来了：

```java
// 固定大小 100 的 LRU 缓存
class LRUCache<K, V> extends LinkedHashMap<K, V> {
    private final int maxCapacity;

    public LRUCache(int maxCapacity) {
        super(16, 0.75f, true);
        this.maxCapacity = maxCapacity;
    }

    @Override
    protected boolean removeEldestEntry(Map.Entry<K, V> eldest) {
        return size() > maxCapacity;
    }
}
```

这是我项目中用的模式，比 Caffeine 轻量，适合简单缓存场景。

## 七、Set 的具体实现与面试要点

| 实现 | 底层 | 有序性 | 适用范围 |
|------|------|--------|----------|
| HashSet | HashMap | 无序 | 通用去重 |
| LinkedHashSet | LinkedHashMap | 插入顺序 | 需要有序去重 |
| TreeSet | TreeMap + NavigableMap | 自然/自定义排序 | 排序去重 |

**面试题"HashSet 的 add 原理"**：底层调用 HashMap 的 put，key 是你要 add 的元素，value 是固定的 PRESENT 常量。HashMap 的 key 不重复，所以 Set 自然不重复。

**去重的正确姿势**：一定要重写 `equals()` + `hashCode()`，且保证 equals 相等时 hashCode 一定相等。

## 八、Iterator：遍历的通用方式

### fail-fast 机制

```java
List<String> list = new ArrayList<>(Arrays.asList("A", "B", "C"));
for (String s : list) { // 等价于 iterator 遍历
    if ("B".equals(s)) {
        list.remove(s); // ❌ ConcurrentModificationException
    }
}
```

原理：Iterator 内部维护一个 `modCount`，遍历时会检查集合的 `modCount` 是否被其他线程/代码修改过。如果修改计数不一致，直接抛异常。

**正确删除方式**：

```java
// 方式一：使用 Iterator 的 remove
Iterator<String> it = list.iterator();
while (it.hasNext()) {
    if ("B".equals(it.next())) {
        it.remove(); // ✅ 不会抛异常
    }
}

// 方式二：JDK 8 的 removeIf
list.removeIf("B"::equals); // ✅ 一行搞定
```

### fail-safe 机制

`ConcurrentHashMap`、`CopyOnWriteArrayList` 的迭代器是 fail-safe 的——遍历时修改集合不会抛异常，因为你遍历的是原始数据的快照，但这也意味着**遍历结果可能不是最新的**。

## 九、Collection 工具类

### Collections 常用方法

```java
// 排序
Collections.sort(list);
Collections.reverse(list);
Collections.shuffle(list); // 打乱

// 不可变集合
List<String> unmodifiableList = Collections.unmodifiableList(list);
// 注意：只是视图不可变，原 list 变了它也跟着变

// 单元素集合
List<String> singleton = Collections.singletonList("A");
Set<String> singletonSet = Collections.singleton("A");
// 比 Arrays.asList 更节约内存，内部只存一个元素
```

### Arrays.asList 的坑

```java
String[] arr = {"A", "B", "C"};
List<String> list = Arrays.asList(arr);
list.add("D"); // ❌ UnsupportedOperationException
```

`Arrays.asList` 返回的是 Arrays 的内部类 ArrayList（不是 java.util.ArrayList），底层还是那个数组，不支持 add/remove 操作。

正确做法：

```java
List<String> list = new ArrayList<>(Arrays.asList(arr)); // ✅
```

## 十、面试连环追问（自测题）

1. ArrayList 插入一个元素，时间复杂度是多少？——分情况：尾部 O(1) 扩容 O(n)，中间 O(n)
2. HashMap 1.7 的死循环怎么产生的？——扩容时头插法导致环形链表
3. ConcurrentHashMap 1.7 和 1.8 的区别？——分段锁 → CAS+synchronized
4. HashMap 的树化阈值为什么是 8？——泊松分布，概率极低
5. TreeMap 的 key 需要满足什么条件？——实现 Comparable 或传 Comparator
6. Collections.synchronizedMap 和 ConcurrentHashMap 选哪个？——后者，并发度高得多
7. LinkedHashMap 实现 LRU 的原理？——accessOrder=true + removeEldestEntry
8. 为什么 ConcurrentHashMap 的 key 和 value 都不能为 null？——因为无法区分"key 不存在"和"value 为 null"

## 总结

集合框架的核心思想其实就几个：**接口分离（List/Set/Map）、哈希表（数组+链表+红黑树）、树结构（红黑树）、线程安全（CAS+synchronized）**。

面试时建议顺着一条线往下深挖，不要浮在表面说"ArrayList 基于数组，LinkedList 基于链表"这种话——面试官听到的基本功比你想象的要深。能把 HashMap 的高位扰动、扩容高低链表拆分、红黑树化条件讲清楚，就已经秒杀大部分候选人了。

项目实践中把握一个原则：**选对数据结构比优化算法更重要**。一个 HashMap 解决的问题，别非搞成 ArrayList 遍历查找。代码写之前花 10 秒钟想想用哪个 Collection，比出 bug 后花一天改要划算得多。
