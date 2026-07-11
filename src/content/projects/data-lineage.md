---
title: "数据血缘系统"
description: "端到端字段级血缘追踪，覆盖离线/实时全链路，帮助合规与影响分析场景。"
emoji: "🕸️"
gradient: "from-accent/30 to-primary/30"
year: "2023"
status: "completed"
tags: ["Atlas", "Neo4j"]
badge: "FOSS"
order: 80
---

## 背景

数据团队规模到达一定量级后，会遇到几个高频问题：

- 上游某张表要下线，**影响哪些下游？**
- 某个报表数值异常，**该指标是怎么来的？**
- 合规审计要求某类字段的**流转链路**

以前靠人肉排查+文档，效率极低。

## 技术方案

- **采集层**：从 Hive/Spark/Flink SQL 中提取血缘（AST 解析）
- **存储层**：Neo4j 图数据库存储表级 + 字段级血缘
- **查询层**：REST API + 前端可视化
- **兼容层**：与 Apache Atlas 双向同步

## 亮点

- **字段级**血缘（不只是表级）
- 覆盖离线（Hive/Spark） + 实时（Flink SQL）
- 支持**正向影响分析** + **反向溯源**
- 内部使用后开源了核心库
