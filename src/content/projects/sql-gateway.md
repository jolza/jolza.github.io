---
title: "SQL 查询网关"
description: "统一查询入口，支持跨数据源联邦查询与权限治理。"
emoji: "🔍"
gradient: "from-secondary/30 to-primary/30"
year: "2023"
status: "completed"
tags: ["Presto", "Trino"]
order: 70
---

## 背景

历史上业务方要查数据得连不同引擎：Hive、ClickHouse、MySQL、Doris 各连各的，用户体验碎片化。

## 方案

- **前置**：Trino 作为统一查询入口
- **权限治理**：Apache Ranger 集成，字段级 ACL
- **审计**：所有查询记录到 Kafka，供审计与优化分析
- **缓存**：热点查询结果缓存到 Redis

## 亮点

- **一个连接串**查所有数据源
- 平均查询延迟下降 **40%**（Trino 优化器 + 缓存）
- 集成了字段级权限，敏感字段自动脱敏
