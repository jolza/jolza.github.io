---
title: "Flink SQL vs Spark SQL：实时场景下如何选择"
description: "从状态管理、延迟、SQL 兼容性和运维成本四个维度，对比两个引擎在实时数据处理场景下的取舍。"
pubDate: "Jul 11 2026"
heroImage: "/post_img.webp"
tags: ["Flink", "Spark", "实时计算"]
badge: "NEW"
---

做实时数仓的同学几乎都会遇到一个选择：**用 Flink SQL 还是 Spark Structured Streaming SQL**。

网上 benchmark 一大把，但真到项目上，选型往往不取决于"哪个吞吐高"，而是**团队现状 + 业务延迟要求 + 状态复杂度**。这篇记录一下我的判断框架。

## 一句话结论

- 端到端**延迟 < 1s、有复杂状态**：Flink
- 已有 Spark 批处理体系、**延迟能接受分钟级**：Spark Structured Streaming
- 团队没有流处理经验、**想快速上一个准实时链路**：Spark 更平滑

## 四个维度对比

### 1. 状态管理

Flink 的 **RocksDB StateBackend** 是原生流处理的一等公民：

- 状态可增量 checkpoint，TB 级状态也能承载
- 状态可用 `keyed state` / `operator state` 精细控制
- Exactly-once 语义由框架统一保证

Spark 的状态则寄生在**微批**上：

- State store 每个 batch 落盘一次，状态越大 batch 越慢
- 状态过大时，checkpoint 目录膨胀是常见问题
- Structured Streaming 3.x 后有改善，但整体仍不如 Flink 精细

**判断**：如果业务需要"跨 24 小时的用户行为聚合"这种大状态，闭眼选 Flink。

### 2. 延迟

| 场景 | Flink | Spark |
|------|-------|-------|
| 端到端延迟目标 | 亚秒级 | 秒~分钟级 |
| 处理模型 | 真流处理 | 微批（默认 100ms~） |
| 反压机制 | 内建、精细 | 依赖 batch interval 调节 |

Spark 在 `continuous mode`（试验特性）下能做到毫秒级，但生产环境**基本没人真用**。默认微批下，端到端稳定在 5~30 秒。

### 3. SQL 兼容与生态

这里 Spark 略胜：

- Spark SQL 与 Hive 兼容度更高，很多离线 SQL 可以直接迁到流上跑
- Spark 生态更成熟，`spark-connect`、`spark-catalog` 已经稳定
- Flink SQL 近年追得很快，`SESSION WINDOW`、`OVER` 窗口、`Lookup Join` 都补齐了

但 Flink 有一个**杀手锏**：`CDC Connector` 生态（Flink CDC 3.x），MySQL → Iceberg / Doris / Paimon 的实时同步链路目前 Flink 是唯一开箱即用的。

### 4. 运维成本

这是常被低估的因素：

- **Spark**：可以复用 Yarn/K8s 上的批处理运维经验，故障排查工具链更成熟
- **Flink**：JobManager/TaskManager 生命周期独立，运维需要一套新的 SOP
- Checkpoint 卡住、反压定位、RocksDB 调参——Flink 有陡峭的学习曲线

**判断**：如果团队里没有一个能**独立读 Flink 源码**的人，长期运维会痛苦。

## 我的选型清单

在自己团队推流处理时，我会问自己这几个问题：

1. 延迟 SLA 是 5 秒还是 5 分钟？
2. 状态规模会不会超过单节点内存？
3. 上游 CDC 场景是否是核心链路？
4. 团队里有几个人真懂流处理？

答案清晰后，选型自然出来。**技术选型不是选"更强的"，是选"更匹配的"**——大数据栈尤其如此。

## 参考

- [Apache Flink SQL 官方文档](https://flink.apache.org/)
- [Spark Structured Streaming 官方文档](https://spark.apache.org/docs/latest/structured-streaming-programming-guide.html)
- 阿里云实时计算团队的分享（B 站可搜）

---

*这是本站第一篇技术笔记。之后不定期记录一些工作中的思考，不追求完美，先写下来。*
