---
title: "让 Spark 写入提速 10 倍：一个小文件问题的调优"
description: "生产环境一次 Spark 写 Iceberg 任务从 45 分钟压到 4 分钟的过程 —— 从定位小文件问题到最终参数组合。"
pubDate: "Jul 11 2026"
heroImage: "/post_img.webp"
tags: ["Spark", "Iceberg", "调优"]
badge: "TUNING"
---

上周处理了一个线上任务：**每天凌晨 2 点跑，写入 Iceberg，稳定运行 45 分钟**。业务方反馈下游报表延迟太久，要求压到 10 分钟以内。最后压到了 4 分钟。

复盘一下这个过程，重点不是"知道多少参数"，而是**先量化瓶颈再动手**。

## 现象

任务本身逻辑简单：

```sql
INSERT INTO dwd.user_events_iceberg
SELECT * FROM ods.raw_events
WHERE dt = '${bizdate}'
```

- 数据量：单日 3TB / 15 亿行
- Executor：50 个 × 8 核 × 32G
- 运行时长：**45 分钟**
- Spark UI 上看：**Write 阶段占了 32 分钟**

一句 SQL 卡 32 分钟在写入，肯定不对。

## 第一步：确认瓶颈是写入而不是 shuffle

先看 Spark UI 的 Stage 时长分布：

| Stage | 描述 | 耗时 |
|-------|------|------|
| 0 | Scan ods.raw_events | 6 分钟 |
| 1 | Shuffle 排序 | 4 分钟 |
| 2 | **Write Iceberg** | **32 分钟** |
| 3 | Commit | 3 分钟 |

Stage 2 里有 **2000 个 task**，每个 task 平均 30~40 秒 —— 但每个 task 写出的**平均文件大小只有 8MB**。

问题定位：**小文件问题**。2000 个 task 各自打开一个 Parquet writer 写 8MB，绝大部分时间花在了**文件打开/关闭和 metadata commit 上**。

## 第二步：为什么会产生小文件

看下 Spark 的默认行为：

- `spark.sql.shuffle.partitions = 2000`（团队默认设置）
- 数据总量 3TB → 3TB / 2000 = **1.5GB per partition**（听起来合理）
- 但按 `dt`（分区键）+ `event_type`（10 种）分组后，实际每个 task 只处理 **约 15GB / 2000 ≈ 8MB** 的目标输出

**根因**：Spark 的默认 shuffle partition 数在**存在预分区键的写入场景**下会导致严重稀疏。

## 第三步：三个调整

### 调整 1：显式 repartition

```sql
INSERT INTO dwd.user_events_iceberg
SELECT /*+ REPARTITION(200, dt, event_type) */ *
FROM ods.raw_events
WHERE dt = '${bizdate}'
```

关键点：
- 从 2000 partition 减到 **200**
- 按 `dt + event_type` 做 hash 分区，让相同 key 的数据落到同一个 task
- 每个 task 写入量提升到 ~150MB，接近 Iceberg 官方推荐的 target file size

**效果**：Write 阶段 32 分钟 → **8 分钟**。

### 调整 2：开启 AQE 合并小分区

```
set spark.sql.adaptive.enabled = true;
set spark.sql.adaptive.coalescePartitions.enabled = true;
set spark.sql.adaptive.advisoryPartitionSizeInBytes = 256MB;
```

AQE 会在运行时**合并空 / 小 partition**，避免手动 repartition 也能得到不错的结果。这里我保留了显式 repartition，因为线上任务显式配置更可控。

**效果**：8 分钟 → **6 分钟**。

### 调整 3：Iceberg 的 fanout writer

```
set spark.sql.iceberg.handle-timestamp-without-timezone = true;
set spark.sql.iceberg.write.fanout.enabled = true;
```

Iceberg 默认写入是 `sorted writer`，要求数据按分区键排序。对于**分区键取值很多**的场景，`fanout writer` 反而更快 —— 它允许 writer 同时打开多个文件句柄。

**效果**：6 分钟 → **4 分钟**。

## 最终对比

| 阶段 | 参数 | Write 耗时 | 总耗时 |
|------|------|-----------|--------|
| 原始 | 默认 shuffle=2000 | 32 min | 45 min |
| + REPARTITION | 200 分区 | 8 min | 21 min |
| + AQE | coalesce enabled | 6 min | 15 min |
| + Iceberg fanout | fanout writer | **4 min** | **4 min** ⚡ |

## 复盘

回头看，这个问题的解决路径其实是：

1. **量化瓶颈**（Spark UI 每个 Stage 耗时 + 输出文件大小）
2. **理解框架默认行为**（为什么 2000 partition 会稀疏）
3. **对症下药**（repartition → AQE → 引擎特性）

调优这件事的隐藏难度**不在参数上，而在于能不能准确描述"慢在哪儿"**。参数是常识，能查文档；瓶颈定位是经验，只能靠自己踩。

一个可复用的 checklist：

- Task 数量 vs 数据量：单 task 处理数据太少 → 减少 partition
- Task 数量 vs 输出文件：单 task 输出文件太小 → 加 repartition + AQE
- Task 数量 vs Executor：task 远超 executor 核数 → 排队严重
- Skew：某个 task 耗时是均值的 5 倍以上 → 数据倾斜

后面遇到写入慢的任务，我基本都是按这个 checklist 走一遍，八成能找到问题。

## 参考

- [Iceberg Spark Writes 官方文档](https://iceberg.apache.org/docs/latest/spark-writes/)
- [Spark AQE 官方文档](https://spark.apache.org/docs/latest/sql-performance-tuning.html#adaptive-query-execution)
