---
title: "调度平台迁移"
description: "从 Airflow 平滑迁移至 DolphinScheduler，任务规模 5000+，零业务中断。"
emoji: "📦"
gradient: "from-accent/30 to-secondary/30"
year: "2022"
status: "completed"
tags: ["Airflow", "DolphinScheduler"]
order: 60
---

## 背景

Airflow 单机 Scheduler 已到达瓶颈，5000+ 任务时调度延迟严重。选型评估后决定迁移到 DolphinScheduler：

- 原生支持分布式 Master
- 可视化 DAG 编辑，业务方友好
- 国内社区活跃度更高

## 挑战

- 5000+ 任务不能有**任何业务中断**
- Airflow 的 Python DAG 与 DolphinScheduler 的 JSON DAG **完全不兼容**
- 需要**双跑一段时间**验证一致性

## 方案

1. 写了 Airflow → DolphinScheduler 的**转换脚本**，覆盖 90% 的常见任务
2. 剩余 10% 复杂 DAG 手工重写
3. **双跑 2 周**，对比两侧结果一致性
4. 灰度切流：按业务模块分批切换

## 结果

- 迁移周期 **6 周**
- 零业务中断
- 调度延迟从平均 3 分钟降到 20 秒
