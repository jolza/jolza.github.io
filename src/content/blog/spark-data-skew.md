---
title: "Spark 数据倾斜的三种解法"
description: "从 salting 到 AQE 再到手工 broadcast，聊聊线上处理倾斜的实战经验。"
pubDate: "Jul 12 2026"
heroImage: "/post_img.webp"
tags: ["Spark", "调优", "数据倾斜"]
badge: "TUNING"
series: "Spark 生产调优笔记"
seriesOrder: 2
---

数据倾斜是 Spark 老生常谈的问题。这几年遇到过的场景里，我把处理套路分成三种：**能改数据的、能改配置的、能改 SQL 的**。

## 场景

线上有个双流 Join 任务，事件流 join 用户维度表。跑起来卡在最后一个 stage，200 个 task 里 **199 个 30 秒完成，1 个跑了 40 分钟**。

打开 Spark UI 看 task 详情，那个慢 task 处理了 **80% 的数据**——典型的数据倾斜。原因是有 3% 的头部用户产生了 60% 的事件量。

## 解法 1：Salting（能改 SQL 的）

给热点 key 加随机前缀打散：

```sql
SELECT
  ...
FROM events e
JOIN (
  -- 维度表每行扩展成 N 份，key 加不同的 salt
  SELECT
    user_id,
    concat(user_id, '_', cast(id as string)) as salted_key,
    ...
  FROM user_dim
  LATERAL VIEW explode(array(0,1,2,3,4,5,6,7,8,9)) t as id
) u
ON concat(e.user_id, '_', cast(rand() * 10 as int)) = u.salted_key
```

- **优点**：彻底解决倾斜
- **缺点**：维度表膨胀 10 倍（要看能不能承受）

**适用**：维度表小、热点 key 集中。

## 解法 2：AQE Skew Join（能改配置的）

Spark 3.0+ 的自适应查询有个 skew join 优化：

```
set spark.sql.adaptive.enabled = true;
set spark.sql.adaptive.skewJoin.enabled = true;
set spark.sql.adaptive.skewJoin.skewedPartitionFactor = 5;
set spark.sql.adaptive.skewJoin.skewedPartitionThresholdInBytes = 256MB;
```

含义：如果某个 partition 比中位数大 5 倍且超过 256MB，Spark 会**自动把它拆成多个子 partition**，让并发生效。

- **优点**：零 SQL 改动
- **缺点**：只对 sort merge join 生效，且倾斜必须"检测得出来"（AQE 依赖 shuffle 后的统计信息）

**适用**：日常线上任务，AQE 应该常开着。

## 解法 3：Broadcast Join（能改数据的）

如果维度表 < 200MB，直接 broadcast 掉：

```sql
SELECT /*+ BROADCAST(u) */ *
FROM events e
JOIN user_dim u ON e.user_id = u.user_id
```

Broadcast 是**根本避免 shuffle**——每个 executor 都拿一份维度表副本，事件流按 partition 本地 join，倾斜不再是问题。

- **优点**：最快，无 shuffle
- **缺点**：维度表大了会 OOM

**适用**：维度表小（< 500MB 是我的经验值）、事件流大。

## 我的判断顺序

真到线上排查时，我会按这个顺序试：

1. **先加 broadcast hint**（如果维度表不大）——最省事
2. **确认 AQE 开着**——正常情况下应该已经在跑
3. **上 salting**——前两个都不适用的场景

避免一上来就写 salting 这种"重口味"方案。**调优的美感在于用最小的代价解决问题**。

## 一个反例

之前有个同事看到倾斜就无脑上 salting，结果维度表被扩展到 500GB，任务反而慢了。**因为倾斜的 partition 从 1 个 40 分钟变成 10 个 8 分钟，但同时非倾斜 partition 也变慢了 10 倍**——整体没赢，甚至输了。

调优前先看数据分布。别拿大锤敲图钉。

## 参考

- [Spark AQE Skew Join 官方文档](https://spark.apache.org/docs/latest/sql-performance-tuning.html#optimizing-skew-join)
- 上一篇：[让 Spark 写入提速 10 倍：一个小文件问题的调优](/blog/rang-spark-xie-ru-ti-su-10-bei-yi-ge-xiao-wen-jian-wen-ti-de-tiao-you/)
