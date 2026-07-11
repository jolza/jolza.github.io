---
title: "实时数仓平台"
description: "基于流批一体架构搭建的实时数据仓库，日处理事件 10 亿+ 条，端到端延迟 < 3s。"
emoji: "📊"
gradient: "from-primary/30 to-secondary/30"
year: "2024"
status: "in-progress"
tags: ["Flink", "Kafka", "Iceberg"]
badge: "NEW"
order: 100
---

## 背景

业务方对实时看板的需求越来越多，之前基于 Hive T+1 的方案已经无法满足。业务侧希望：

- **秒级延迟**看到关键指标（GMV、订单量、活跃用户）
- 覆盖**离线 + 实时**两条链路的数据统一
- 迁移成本**尽量低**，不能全部重写

## 架构选型

- 存储层：Iceberg（同时服务实时写入与批量查询）
- 流处理：Flink SQL（复用离线 SQL 经验）
- 消息队列：Kafka（业务系统已在用）
- 查询层：Trino（联邦查询 Iceberg + 其他数据源）

技术选型的详细思考见博客：[Flink SQL vs Spark SQL：实时场景下如何选择](/blog/flink-sql-vs-spark-sql-shi-shi-chang-jing-xia-ru-he-xuan-ze/)

## 亮点

- **端到端延迟稳定 < 3s**，P99 < 8s
- 日处理事件 **10 亿+ 条**
- 复用 Hive 已有的分区规范，业务方无需重写 SQL
- 通过 Flink CDC 实现 MySQL 业务库到 Iceberg 的实时同步

## 后续

正在做的方向：

- 引入 Paimon 替换部分 Iceberg，评估更细粒度更新的性能
- 打通实时/离线的血缘链路
