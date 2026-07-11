---
title: "指标计算引擎"
description: "支持万级指标定义与调度的自助分析平台，业务方零代码即可上线新指标。"
emoji: "🧪"
gradient: "from-secondary/30 to-accent/30"
year: "2024"
status: "in-progress"
tags: ["Spark", "ClickHouse"]
order: 90
---

## 背景

数据团队每周都在收到"能不能加个指标"的 issue，一个简单的 count 需求也要走：**建表 → 写 SQL → 调度 → 报表**流程，2-3 天才能上线。

## 方案

- **元数据驱动**：指标定义存 MySQL，包含 SQL 模板、维度、计算周期
- **调度层**：DolphinScheduler，按周期扫描待执行指标
- **执行层**：Spark 引擎渲染 SQL 模板并执行
- **存储层**：ClickHouse 存储指标结果，秒级查询
- **前端**：业务方在页面上填指标定义，一键上线

## 亮点

- 业务方**零代码**新增指标
- 平均上线时间从 **2-3 天缩到 5 分钟**
- 已支持 **1 万+ 指标**在线
- 相关技术调优记录：[让 Spark 写入提速 10 倍](/blog/rang-spark-xie-ru-ti-su-10-bei-yi-ge-xiao-wen-jian-wen-ti-de-tiao-you/)
